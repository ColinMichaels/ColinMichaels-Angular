import {expect, test} from '@playwright/test';

interface RegisteredWebMcpTool {
  name: string;
  annotations?: {
    readOnlyHint?: boolean;
    untrustedContentHint?: boolean;
  };

  execute(args: Record<string, unknown>, client: { signal: AbortSignal }): Promise<string>;
}

interface PublicAgentContentResponse {
  operation: 'search' | 'getArticle' | 'getTopic';
  items: Array<{
    kind: 'article' | 'topic';
    canonicalUrl: string;
    title: string;
  }>;
  policy: {
    contentLicense: 'not-granted';
    readOnly: true;
    rateLimit: '20 requests per minute';
  };
}

test.describe('production WebMCP public-content tools', () => {
  test.skip(
    process.env['WEBMCP_PRODUCTION_SMOKE'] !== '1',
    'Run through npm run verify:webmcp-production so the test cannot contact production accidentally.',
  );

  test('registers and executes every bounded read-only tool', async ({page}) => {
    test.setTimeout(60_000);
    const consoleErrors: string[] = [];
    const failedResponses: Array<{ status: number; url: string }> = [];
    const failedRequests: string[] = [];
    page.on('console', message => {
      if (message.type() === 'error') {
        consoleErrors.push(message.text());
      }
    });
    page.on('response', response => {
      if (response.status() >= 400) {
        failedResponses.push({status: response.status(), url: response.url()});
      }
    });
    page.on('requestfailed', request => {
      failedRequests.push(request.url());
    });

    await page.addInitScript(() => {
      const tools: RegisteredWebMcpTool[] = [];
      const modelContext = {
        registerTool(tool: RegisteredWebMcpTool): Promise<void> {
          tools.push(tool);
          return Promise.resolve();
        },
      };
      Object.defineProperty(document, 'modelContext', {configurable: true, value: modelContext});
      Object.defineProperty(navigator, 'modelContext', {configurable: true, value: modelContext});
      Object.defineProperty(window, '__registeredPublicWebMcpTools', {configurable: true, value: tools});
    });

    await page.goto('/');
    await expect(page).toHaveTitle(/Colin Michaels/i);
    await expect(page.getByRole('heading', {
      level: 1,
      name: 'Cool gadgets, useful tech, and internet finds',
    })).toBeVisible({timeout: 20_000});
    await page.waitForFunction(() => (
      (window as typeof window & { __registeredPublicWebMcpTools?: RegisteredWebMcpTool[] })
        .__registeredPublicWebMcpTools?.length === 3
    ));

    const result = await page.evaluate(async () => {
      const tools = (window as typeof window & { __registeredPublicWebMcpTools: RegisteredWebMcpTool[] })
        .__registeredPublicWebMcpTools;
      const byName = new Map(tools.map(tool => [tool.name, tool]));
      const execute = async (name: string, args: Record<string, unknown>): Promise<PublicAgentContentResponse> => {
        const tool = byName.get(name);
        if (!tool) {
          throw new Error(`Missing registered WebMCP tool: ${name}`);
        }
        return JSON.parse(await tool.execute(args, {signal: new AbortController().signal}));
      };

      const search = await execute('search_public_content', {query: 'drones'});
      const article = search.items.find(item => item.kind === 'article');
      if (!article) {
        throw new Error('Production WebMCP search did not return a published article.');
      }

      return {
        names: tools.map(tool => tool.name),
        annotations: tools.map(tool => tool.annotations),
        search,
        article: await execute('get_public_article', {canonicalUrl: article.canonicalUrl}),
        topic: await execute('get_public_topic_guide', {topicSlug: 'drones-fpv'}),
      };
    });

    expect(result.names).toEqual([
      'search_public_content',
      'get_public_article',
      'get_public_topic_guide',
    ]);
    expect(result.annotations).toEqual([
      {readOnlyHint: true, untrustedContentHint: true},
      {readOnlyHint: true, untrustedContentHint: true},
      {readOnlyHint: true, untrustedContentHint: true},
    ]);
    expect(result.search.operation).toBe('search');
    expect(result.search.items.length).toBeGreaterThan(0);
    expect(result.search.items.length).toBeLessThanOrEqual(5);
    expect(result.article.operation).toBe('getArticle');
    expect(result.article.items).toHaveLength(1);
    expect(result.topic.operation).toBe('getTopic');
    expect(result.topic.items).toHaveLength(1);

    for (const response of [result.search, result.article, result.topic]) {
      expect(response.policy).toEqual({
        contentLicense: 'not-granted',
        readOnly: true,
        rateLimit: '20 requests per minute',
      });
      expect(response.items.every(item => item.canonicalUrl.startsWith('https://colinmichaels.com/'))).toBe(true);
      expect(JSON.stringify(response)).not.toContain('blocks');
      expect(JSON.stringify(response)).not.toContain('searchBodyText');
    }
    const appCheckTokenRejected = failedResponses.some(response => (
      response.status === 403
      && response.url.startsWith('https://content-firebaseappcheck.googleapis.com/')
      && response.url.includes(':exchangeRecaptchaEnterpriseToken')
    ));
    const unexpectedConsoleErrors = consoleErrors.filter(message => {
      if (message.includes("Framing 'https://www.google.com/' violates the following report-only Content Security Policy")) {
        return false;
      }
      if (message === 'requestStorageAccess: Permission denied.') {
        return false;
      }
      if (appCheckTokenRejected && message.includes('Failed to load resource: the server responded with a status of 403')) {
        return false;
      }
      return ![
        '[HomepageHeroRepositoryService] Homepage hero settings snapshot error:',
        '[RecommendedLinkStorageService] Published recommended links load error:',
        '[TopicHubStorageService] Published topics load error:',
        '[BlogStorageService] Published post index load error:',
      ].some(prefix => appCheckTokenRejected && message.startsWith(prefix));
    });
    const unexpectedFailedResponses = failedResponses.filter(response => !(
      response.status === 403
      && response.url.startsWith('https://content-firebaseappcheck.googleapis.com/')
      && response.url.includes(':exchangeRecaptchaEnterpriseToken')
    ));
    const unexpectedFailedRequests = failedRequests.filter(url => !(
      url.startsWith('https://analytics.google.com/g/collect')
      || url.startsWith('https://www.google.com/recaptcha/enterprise/clr')
    ));

    expect(unexpectedConsoleErrors).toEqual([]);
    expect(unexpectedFailedResponses).toEqual([]);
    expect(unexpectedFailedRequests).toEqual([]);
  });
});
