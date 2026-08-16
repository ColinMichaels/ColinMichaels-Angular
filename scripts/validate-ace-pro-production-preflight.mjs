import {access, readFile} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const REPOSITORY_ROOT = path.resolve(fileURLToPath(new URL('..', import.meta.url)));
const PACKAGE_ROOT = path.join(
  REPOSITORY_ROOT,
  'docs',
  'CONTENT_PACKAGES',
  'insta360-ace-pro-fpv-sunset-test',
);
const PREFLIGHT_PATH = path.join(PACKAGE_ROOT, 'PRODUCTION_PREFLIGHT_2026-08-15.json');
const IMPORT_PATH = path.join(PACKAGE_ROOT, 'insta360-ace-pro-fpv-sunset-test-import.json');
const VIDEO_ID = 'OFeCTH2LP9s';

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

const preflight = JSON.parse(await readFile(PREFLIGHT_PATH, 'utf8'));
const importDocument = JSON.parse(await readFile(IMPORT_PATH, 'utf8'));
const post = importDocument.posts?.[0];

assert(preflight.schemaVersion === 1, 'Ace Pro production preflight schemaVersion must be 1.');
assert(
  preflight.status === 'public-collision-and-video-identity-verified',
  'Ace Pro production preflight must retain its verified boundary.',
);
assert(importDocument.source === 'colinmichaels-cms', 'Ace Pro import must use the CMS source.');
assert(importDocument.collection === 'posts', 'Ace Pro import must target posts.');
assert(importDocument.posts?.length === 1, 'Ace Pro import must contain exactly one post.');
assert(post.id === preflight.candidate?.id, 'Ace Pro package ID must match the preflight.');
assert(post.revision === 0, 'Ace Pro draft must retain revision 0.');
assert(post.slug === preflight.candidate?.slug, 'Ace Pro package slug must match the preflight.');
assert(post.seo?.canonical === preflight.candidate?.canonical, 'Ace Pro canonical must match the preflight.');
assert(post.status === 'draft' && post.publishedAt === null, 'Ace Pro package must remain an unpublished draft.');
assert(post.editorial?.evidenceBasis === 'mixed', 'Ace Pro package must retain its mixed first-party evidence boundary.');
assert(
  typeof post.editorial?.relationshipDisclosure === 'string'
    && post.editorial.relationshipDisclosure.includes('Colin must confirm'),
  'Ace Pro package must retain relationship approval as an open gate.',
);
assert(
  typeof post.editorial?.syntheticMediaDisclosure === 'string'
    && post.editorial.syntheticMediaDisclosure.includes('no generative editing'),
  'Ace Pro package must retain its documentary-frame boundary.',
);

assert(Array.isArray(post.blocks) && post.blocks.length === 32, 'Ace Pro package must retain all 32 reviewed blocks.');
assert(new Set(post.blocks.map(block => block.id)).size === post.blocks.length, 'Ace Pro block IDs must remain unique.');
const images = post.blocks.filter(block => block?.type === 'image');
assert(images.length === 3, 'Ace Pro package must retain three inline documentary frames.');
const embeds = post.blocks.filter(block => block?.type === 'embed');
assert(embeds.length === 1, 'Ace Pro package must retain one exact companion embed.');
assert(embeds[0].data?.isCompanionVideo === true, 'Ace Pro YouTube embed must remain the exact companion.');
assert(embeds[0].data?.url === preflight.youtube?.watchUrl, 'Ace Pro companion watch URL drifted.');
assert(embeds[0].data?.videoTitle === preflight.youtube?.title, 'Ace Pro companion title drifted.');
assert(post.blocks.filter(block => block?.type === 'poll').length === 1, 'Ace Pro package must retain one reader poll.');

const assetPaths = [
  post.coverImage,
  post.thumbnailImage,
  post.seo?.openGraphImage,
  ...images.map(image => image.data?.url),
];
assert(new Set(assetPaths).size === 6, 'Ace Pro package must retain six distinct media assets.');
for (const assetPath of assetPaths) {
  assert(assetPath?.startsWith('/assets/'), `Ace Pro asset path is invalid: ${assetPath}`);
  await access(path.join(REPOSITORY_ROOT, 'src', assetPath));
}

const searchableBlocks = JSON.stringify(post.blocks);
assert(searchableBlocks.includes('https://onlinemanual.insta360.com/ace/en-us/specs/hardware/photo-video'), 'Ace Pro package must retain the official Insta360 specifications.');
assert(searchableBlocks.includes('https://www.faa.gov/uas/recreational_flyers'), 'Ace Pro package must retain current FAA recreational guidance.');
assert(searchableBlocks.includes('/resources/gadget-usefulness-scorecard'), 'Ace Pro package must retain the gadget scorecard continuation.');
assert(searchableBlocks.includes('/topics/drones-fpv'), 'Ace Pro package must retain the Drones & FPV continuation.');

assert(preflight.publicBoundary?.routeHttpStatus === 404, 'Ace Pro candidate route must be recorded as unpublished 404.');
assert(preflight.publicBoundary?.robots === 'noindex,nofollow', 'Ace Pro unpublished route must remain noindex,nofollow.');
assert(preflight.publicBoundary?.canonical === post.seo?.canonical, 'Ace Pro 404 canonical must match the candidate route.');
assert(preflight.publicBoundary?.publishedSlugQueryHttpStatus === 200, 'Ace Pro public published-slug query must have succeeded.');
assert(preflight.publicBoundary?.publishedSlugMatchCount === 0, 'Ace Pro candidate must have zero published slug matches.');
assert(preflight.publicBoundary?.sitemapHttpStatus === 200, 'Ace Pro sitemap preflight must have succeeded.');
assert(preflight.publicBoundary?.sitemapContainsCandidateRoute === false, 'Ace Pro unpublished route must stay out of the sitemap.');
assert(preflight.firestoreBoundary?.directDocumentHttpStatus === 403, 'Ace Pro direct-document visibility boundary drifted.');
assert(
  preflight.firestoreBoundary?.documentResolvedAnonymously === false,
  'Ace Pro protected document must not resolve anonymously.',
);
assert(
  preflight.firestoreBoundary?.directDocumentVisibility === 'not-observable-anonymously',
  'Ace Pro preflight must not pretend anonymous reads can rule out private drafts.',
);
assert(preflight.youtube?.httpStatus === 200, 'Ace Pro companion oEmbed must have resolved.');
assert(preflight.youtube?.videoId === VIDEO_ID, 'Ace Pro companion video ID drifted.');
assert(preflight.youtube?.authorName === 'Captain Colin', 'Ace Pro companion channel identity drifted.');
assert(
  preflight.readiness?.state === 'blocked_editorial_approval_authenticated_preview_and_trusted_reservation',
  'Ace Pro readiness must retain all protected release gates.',
);
assert(preflight.readiness?.safeToImport === false, 'Ace Pro package must remain unsafe to import before approval and preview.');
assert(preflight.readiness?.requiredGates?.length >= 8, 'Ace Pro preflight needs complete release gates.');
for (const [action, completed] of Object.entries(preflight.externalActions ?? {})) {
  assert(completed === false, `External action ${action} must remain false until explicitly authorized and verified.`);
}

console.log(
  'Validated Ace Pro public collision and exact-video preflight; '
    + 'the package remains a local draft blocked on trusted reservation, editorial approval, and authenticated Production Preview; 0 external actions.',
);
