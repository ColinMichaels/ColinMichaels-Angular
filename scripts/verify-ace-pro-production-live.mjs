import {readFile} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {
  getFirebaseClientApiKey,
  inspectDirectPostDocument,
  inspectPublishedPostSlug,
  inspectPublicHtmlRoute,
  inspectSitemapCandidate,
  inspectYouTubeOembed,
} from './lib/public-content-preflight.mjs';

const REPOSITORY_ROOT = path.resolve(fileURLToPath(new URL('..', import.meta.url)));
const PACKAGE_ROOT = path.join(
  REPOSITORY_ROOT,
  'docs',
  'CONTENT_PACKAGES',
  'insta360-ace-pro-fpv-sunset-test',
);
const PREFLIGHT_PATH = path.join(PACKAGE_ROOT, 'PRODUCTION_PREFLIGHT_2026-08-15.json');
const IMPORT_PATH = path.join(PACKAGE_ROOT, 'insta360-ace-pro-fpv-sunset-test-import.json');
const PROJECT_ID = 'colinmichaels';
const VIDEO_ID = 'OFeCTH2LP9s';
const REPORT_ONLY = process.argv.includes('--report');

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

const importDocument = JSON.parse(await readFile(IMPORT_PATH, 'utf8'));
const post = importDocument.posts?.[0];
assert(post, 'Ace Pro import must contain one post.');

const apiKey = await getFirebaseClientApiKey(REPOSITORY_ROOT);
const report = {
  capturedAt: new Date().toISOString(),
  candidate: {
    id: post.id,
    slug: post.slug,
    canonical: post.seo?.canonical,
    status: post.status,
    publishedAt: post.publishedAt,
  },
  directDocument: await inspectDirectPostDocument({apiKey, projectId: PROJECT_ID, documentId: post.id}),
  publishedSlugQuery: await inspectPublishedPostSlug({apiKey, projectId: PROJECT_ID, slug: post.slug}),
  publicRoute: await inspectPublicHtmlRoute(post.seo?.canonical),
  sitemap: await inspectSitemapCandidate(post.seo?.canonical),
  youtube: await inspectYouTubeOembed(VIDEO_ID),
};

if (REPORT_ONLY) {
  console.log(JSON.stringify(report, null, 2));
  process.exit(0);
}

const preflight = JSON.parse(await readFile(PREFLIGHT_PATH, 'utf8'));
assert(preflight.schemaVersion === 1, 'Ace Pro production preflight schemaVersion must be 1.');
assert(
  preflight.status === 'public-collision-and-video-identity-verified',
  'Ace Pro production preflight must retain its verified boundary.',
);
assert(post.id === preflight.candidate?.id, 'Ace Pro package ID drifted.');
assert(post.slug === preflight.candidate?.slug, 'Ace Pro package slug drifted.');
assert(post.seo?.canonical === preflight.candidate?.canonical, 'Ace Pro package canonical drifted.');
assert(post.status === 'draft' && post.publishedAt === null, 'Ace Pro package must remain an unpublished draft.');
assert(report.directDocument.httpStatus === 403, 'Ace Pro anonymous document-visibility boundary drifted.');
assert(report.directDocument.documentResolvedAnonymously === false, 'Ace Pro document ID now resolves anonymously.');
assert(report.publishedSlugQuery.httpStatus === 200, 'Ace Pro published-slug query failed.');
assert(report.publishedSlugQuery.matchCount === 0, 'Ace Pro slug now collides with a published post.');
assert(report.publicRoute.httpStatus === 404, 'Ace Pro candidate route is no longer an unpublished 404.');
assert(
  report.publicRoute.robots === preflight.publicBoundary?.robots,
  'Ace Pro candidate route robots directive drifted.',
);
assert(
  report.publicRoute.canonical === preflight.publicBoundary?.canonical,
  'Ace Pro unpublished route canonical drifted.',
);
assert(report.sitemap.httpStatus === 200, 'Public sitemap request failed.');
assert(report.sitemap.containsCandidateRoute === false, 'Ace Pro candidate route now appears in the sitemap.');
assert(report.youtube.httpStatus === 200, 'Ace Pro companion video no longer resolves through YouTube oEmbed.');
assert(report.youtube.videoId === preflight.youtube?.videoId, 'Ace Pro companion video ID drifted.');
assert(report.youtube.watchUrl === preflight.youtube?.watchUrl, 'Ace Pro companion watch URL drifted.');
assert(report.youtube.title === preflight.youtube?.title, 'Ace Pro companion video title drifted.');
assert(report.youtube.authorName === preflight.youtube?.authorName, 'Ace Pro companion channel identity drifted.');

console.log(
  `Verified Ace Pro candidate ${post.slug}: public route and published slug remain absent; `
    + `YouTube video ${VIDEO_ID} resolves as ${JSON.stringify(report.youtube.title)}; no write performed.`,
);
