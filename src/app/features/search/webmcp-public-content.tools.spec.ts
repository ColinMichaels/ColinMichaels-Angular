import {TestBed} from '@angular/core/testing';

import {PublicAgentContentService, PublicAgentContentResponse} from './services/public-agent-content.service';
import {createPublicContentWebMcpTools} from './webmcp-public-content.tools';

describe('createPublicContentWebMcpTools', () => {
  let publicContent: jasmine.SpyObj<PublicAgentContentService>;

  beforeEach(() => {
    publicContent = jasmine.createSpyObj<PublicAgentContentService>('PublicAgentContentService', [
      'search',
      'getArticle',
      'getTopic',
    ]);
    TestBed.configureTestingModule({
      providers: [{provide: PublicAgentContentService, useValue: publicContent}],
    });
  });

  it('declares only the bounded public read-only contracts', () => {
    const tools = createPublicContentWebMcpTools(publicContent);

    expect(tools.map(tool => tool.name)).toEqual([
      'search_public_content',
      'get_public_article',
      'get_public_topic_guide',
    ]);
    expect(tools.every(tool => tool.description.includes('Read-only'))).toBeTrue();
    expect(tools.every(tool => tool.inputSchema.additionalProperties === false)).toBeTrue();
    expect(tools.every(tool => tool.annotations.readOnlyHint)).toBeTrue();
    expect(tools.every(tool => tool.annotations.untrustedContentHint)).toBeTrue();
    expect(tools[0].inputSchema.properties['query'].type).toBe('string');
    expect(tools[1].inputSchema.properties['canonicalUrl'].type).toBe('string');
    expect(tools[2].inputSchema.properties['topicSlug'].enum).toEqual([
      'ai-setup',
      'recovery-planning',
      'angular-firebase-architecture',
      'labs-projects',
      'gadgets-toys',
      'drones-fpv',
    ]);
  });

  it('delegates each descriptor to the server-owned public-content boundary', async () => {
    const response: PublicAgentContentResponse = {
      operation: 'getTopic',
      items: [],
      policy: {
        contentLicense: 'not-granted',
        readOnly: true,
        rateLimit: '20 requests per minute',
      },
    };
    publicContent.search.and.resolveTo({...response, operation: 'search'});
    publicContent.getArticle.and.resolveTo({...response, operation: 'getArticle'});
    publicContent.getTopic.and.resolveTo(response);

    const [search, article, topic] = createPublicContentWebMcpTools(publicContent);
    const [searchResult, articleResult, topicResult] = await TestBed.runInInjectionContext(async () => [
      await search.execute({query: 'drones'}, {} as never),
      await article.execute({canonicalUrl: 'https://colinmichaels.com/blog/agent-ready-content'}, {} as never),
      await topic.execute({topicSlug: 'drones-fpv'}, {} as never),
    ]);

    expect(publicContent.search).toHaveBeenCalledWith('drones', undefined);
    expect(publicContent.getArticle).toHaveBeenCalledWith('https://colinmichaels.com/blog/agent-ready-content', undefined);
    expect(publicContent.getTopic).toHaveBeenCalledWith('drones-fpv', undefined);
    expect(searchResult).toBe(JSON.stringify({...response, operation: 'search'}));
    expect(articleResult).toBe(JSON.stringify({...response, operation: 'getArticle'}));
    expect(topicResult).toBe(JSON.stringify(response));
  });

  it('rejects non-string arguments before calling the service', async () => {
    const search = createPublicContentWebMcpTools(publicContent)[0];

    await expectAsync(TestBed.runInInjectionContext(() =>
      search.execute({query: 42 as unknown as string}, {} as never),
    )).toBeRejectedWithError(/requires a string query/i);
    expect(publicContent.search).not.toHaveBeenCalled();
  });
});
