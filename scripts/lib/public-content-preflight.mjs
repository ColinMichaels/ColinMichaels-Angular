import {readFile} from 'node:fs/promises';
import path from 'node:path';

function requireValue(value, message) {
  if (!value) {
    throw new Error(message);
  }
  return value;
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/gu, '\\$&');
}

function htmlAttribute(html, element, attribute, value, contentAttribute = 'content') {
  const valuePattern = escapeRegExp(value);
  const firstOrder = new RegExp(
    `<${element}[^>]*${attribute}=["']${valuePattern}["'][^>]*${contentAttribute}=["']([^"']*)["'][^>]*>`,
    'iu',
  );
  const secondOrder = new RegExp(
    `<${element}[^>]*${contentAttribute}=["']([^"']*)["'][^>]*${attribute}=["']${valuePattern}["'][^>]*>`,
    'iu',
  );
  return html.match(firstOrder)?.[1] ?? html.match(secondOrder)?.[1] ?? null;
}

export async function getFirebaseClientApiKey(repositoryRoot) {
  if (process.env['FIREBASE_WEB_API_KEY']) {
    return process.env['FIREBASE_WEB_API_KEY'];
  }

  const source = await readFile(
    path.join(repositoryRoot, 'src', 'environments', 'environment.local.ts'),
    'utf8',
  );
  const match = source.match(/apiKey:\s*['"]([^'"]+)['"]/u);
  return requireValue(match?.[1], 'Firebase client API key was not found in environment.local.ts.');
}

export async function inspectDirectPostDocument({apiKey, projectId, documentId}) {
  const url = new URL(
    `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/posts/${documentId}`,
  );
  url.searchParams.set('key', apiKey);
  const response = await fetch(url, {
    headers: {'Accept': 'application/json'},
    signal: AbortSignal.timeout(15_000),
  });
  return {httpStatus: response.status, documentResolvedAnonymously: response.ok};
}

export async function inspectPublishedPostSlug({apiKey, projectId, slug}) {
  const url = new URL(
    `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents:runQuery`,
  );
  url.searchParams.set('key', apiKey);
  const response = await fetch(url, {
    method: 'POST',
    headers: {'Accept': 'application/json', 'Content-Type': 'application/json'},
    body: JSON.stringify({
      structuredQuery: {
        from: [{collectionId: 'posts'}],
        where: {
          compositeFilter: {
            op: 'AND',
            filters: [
              {
                fieldFilter: {
                  field: {fieldPath: 'slug'},
                  op: 'EQUAL',
                  value: {stringValue: slug},
                },
              },
              {
                fieldFilter: {
                  field: {fieldPath: 'status'},
                  op: 'EQUAL',
                  value: {stringValue: 'published'},
                },
              },
            ],
          },
        },
        limit: 5,
      },
    }),
    signal: AbortSignal.timeout(15_000),
  });
  const payload = await response.json();
  const matches = response.ok && Array.isArray(payload)
    ? payload.filter(result => result?.document)
    : [];
  return {httpStatus: response.status, matchCount: matches.length};
}

export async function inspectPublicHtmlRoute(route) {
  const response = await fetch(route, {
    headers: {'Accept': 'text/html'},
    signal: AbortSignal.timeout(15_000),
  });
  const html = await response.text();
  const title = html.match(/<title[^>]*>([^<]*)<\/title>/iu)?.[1]?.trim() ?? null;
  return {
    httpStatus: response.status,
    robots: htmlAttribute(html, 'meta', 'name', 'robots'),
    canonical: htmlAttribute(html, 'link', 'rel', 'canonical', 'href'),
    title,
  };
}

export async function inspectSitemapCandidate(route) {
  const response = await fetch('https://colinmichaels.com/sitemap.xml', {
    headers: {'Accept': 'application/xml,text/xml'},
    signal: AbortSignal.timeout(15_000),
  });
  const xml = await response.text();
  return {httpStatus: response.status, containsCandidateRoute: xml.includes(route)};
}

export async function inspectYouTubeOembed(videoId) {
  const watchUrl = `https://www.youtube.com/watch?v=${videoId}`;
  const url = new URL('https://www.youtube.com/oembed');
  url.searchParams.set('url', watchUrl);
  url.searchParams.set('format', 'json');
  const response = await fetch(url, {
    headers: {'Accept': 'application/json'},
    signal: AbortSignal.timeout(15_000),
  });
  const payload = response.ok ? await response.json() : {};
  return {
    httpStatus: response.status,
    videoId,
    watchUrl,
    title: payload.title ?? null,
    authorName: payload.author_name ?? null,
    authorUrl: payload.author_url ?? null,
  };
}
