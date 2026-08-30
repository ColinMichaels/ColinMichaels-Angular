import {readFile} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const REPOSITORY_ROOT = path.resolve(fileURLToPath(new URL('..', import.meta.url)));
const PACKAGE_ROOT = path.join(
  REPOSITORY_ROOT,
  'docs',
  'CONTENT_PACKAGES',
  'temu-mega-drone-seo-refresh',
);
const BASELINE_PATH = path.join(PACKAGE_ROOT, 'PRODUCTION_BASELINE_2026-08-15.json');
const IMPORT_PATH = path.join(PACKAGE_ROOT, 'temu-mega-drone-seo-refresh-import.json');

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function storageObject(value) {
  const url = new URL(value);
  const encodedObject = url.pathname.split('/o/')[1];
  assert(encodedObject, 'Firebase Storage URL must include an /o/ object path.');
  return decodeURIComponent(encodedObject);
}

function textFromBlock(block) {
  return JSON.stringify(block?.data ?? {});
}

const baseline = JSON.parse(await readFile(BASELINE_PATH, 'utf8'));
const importDocument = JSON.parse(await readFile(IMPORT_PATH, 'utf8'));
const post = importDocument.posts?.[0];

assert(baseline.schemaVersion === 1, 'Temu production baseline schemaVersion must be 1.');
assert(
  baseline.status === 'production-record-verified-editorial-gates-open',
  'Temu production baseline must record the verified live document boundary.',
);
assert(baseline.route === baseline.publicIdentity?.canonical, 'Public route and canonical must match.');
assert(baseline.publicIdentity?.robots === 'index,follow', 'Public Temu route must remain indexable.');
assert(baseline.hydratedDesktop?.canonicalMatchesRoute === true, 'Desktop canonical check must pass.');
assert(baseline.hydratedMobile?.canonicalMatchesRoute === true, 'Mobile canonical check must pass.');
assert(baseline.hydratedDesktop?.dialogCount === 0, 'Desktop preflight must not contain a dialog.');
assert(baseline.hydratedMobile?.dialogCount === 0, 'Mobile preflight must not contain a dialog.');
assert(baseline.hydratedMobile?.bodyScrollLocked === false, 'Mobile body must remain scrollable.');
assert(baseline.hydratedMobile?.horizontalOverflow === false, 'Mobile route must not overflow horizontally.');
assert(baseline.hydratedMobile?.contentsToggleExpanded === true, 'Mobile contents interaction must pass.');

assert(importDocument.source === 'colinmichaels-cms', 'Temu import must use the CMS source.');
assert(importDocument.collection === 'posts', 'Temu import must target posts.');
assert(Array.isArray(importDocument.posts) && importDocument.posts.length === 1, 'Temu import must contain one post.');
assert(post.id === 'post-041c74e0-31f7-460a-8e85-4be3d62d9622', 'Temu package must retain its expected stable ID.');
assert(post.slug === baseline.publicIdentity.slug, 'Temu package must preserve the public slug.');
assert(post.seo?.canonical === baseline.route, 'Temu package must preserve the public canonical.');
assert(post.status === 'published', 'Temu package must remain an update to the published record.');
assert(post.revision === baseline.productionRecord?.revision, 'Temu package must target the verified effective production revision.');
assert(post.createdAt === baseline.productionRecord?.createdAt, 'Temu package must preserve createdAt.');
assert(post.publishedAt === baseline.publicIdentity.publishedAt, 'Temu package must preserve publishedAt.');
assert(post.featured === true && baseline.productionRecord?.featured === false, 'Temu featured-state change must remain explicit.');
assert(
  (post.thumbnail ?? post.thumbnailImage ?? null) === baseline.productionRecord?.thumbnail,
  'Temu package must preserve the thumbnail state.',
);
assert(
  JSON.stringify(post.categories) === JSON.stringify(baseline.publicIdentity.categories),
  'Temu package must preserve the ordered public categories.',
);
assert(
  storageObject(post.coverImage) === baseline.publicIdentity.coverStorageObject,
  'Temu package must preserve the production cover object.',
);
assert(
  storageObject(post.seo?.openGraphImage) === baseline.publicIdentity.openGraphStorageObject,
  'Temu package must preserve the production Open Graph object.',
);

assert(post.title !== baseline.publicIdentity.articleHeading, 'Temu refresh must record its planned title change.');
assert(post.seo?.title !== baseline.publicIdentity.documentTitle, 'Temu refresh must record its planned search-title change.');
assert(post.excerpt !== baseline.publicIdentity.description, 'Temu refresh must record its planned excerpt change.');
assert(post.editorial?.evidenceBasis === 'researched', 'Temu refresh must retain researched evidence metadata.');
assert(post.editorial?.sourceReviewedAt === '2026-08-14', 'Temu refresh source review date changed unexpectedly.');
assert(typeof post.editorial?.updateNote === 'string' && post.editorial.updateNote.length >= 80, 'Temu refresh needs a substantive update note.');

const imageBlocks = post.blocks.filter((block) => block?.type === 'image');
assert(imageBlocks.length === 2, 'Temu refresh must contain exactly two disclosed editorial illustrations.');
for (const image of imageBlocks) {
  assert(/AI-generated editorial illustration/iu.test(image.data?.caption ?? ''), `${image.id} needs an explicit synthetic-media caption.`);
}
assert(post.blocks.some((block) => block?.type === 'poll'), 'Temu refresh must retain its reader poll.');

const searchableBlocks = post.blocks.map(textFromBlock).join('\n');
assert(searchableBlocks.includes('2026 Reality Check'), 'Temu refresh must retain the 2026 reality-check section.');
assert(searchableBlocks.includes('https://www.ecfr.gov/current/title-14/chapter-I/subchapter-F/part-103'), 'Temu refresh must retain the eCFR Part 103 link.');
assert(searchableBlocks.includes('/topics/drones-fpv'), 'Temu refresh must retain the Drones & FPV continuation.');
assert(searchableBlocks.includes('/resources/personal-aircraft-buyer-verification'), 'Temu refresh must retain the buyer-verification continuation.');
assert(searchableBlocks.includes('https://www.youtube.com/watch?v=bUkvDe0x47A'), 'Temu refresh must retain the Goonzquad evidence video.');

assert(
  baseline.productionRecord?.id === 'post-041c74e0-31f7-460a-8e85-4be3d62d9622',
  'Temu baseline must retain the verified production record ID.',
);
assert(Number.isInteger(baseline.productionRecord?.revision) && baseline.productionRecord.revision >= 0, 'Temu baseline needs a non-negative effective revision.');
assert(typeof baseline.productionRecord?.revisionFieldPresent === 'boolean', 'Temu baseline must record revision-field state.');
assert(
  /^[a-f0-9]{64}$/u.test(baseline.productionRecord?.fingerprintSha256 ?? ''),
  'Temu baseline needs a complete SHA-256 production fingerprint.',
);
assert(baseline.productionRecord?.blockCount === 61, 'Temu baseline production block count drifted.');

const verifiedDiff = baseline.packageComparison?.verifiedDiff;
assert(verifiedDiff?.productionBlockCount === 61, 'Temu verified diff needs the production block count.');
assert(verifiedDiff?.packageBlockCount === post.blocks.length, 'Temu verified diff needs the package block count.');
assert(verifiedDiff?.commonBlockCount === 61, 'Temu package must retain all 61 original block IDs.');
assert(Array.isArray(verifiedDiff?.removedBlockIds) && verifiedDiff.removedBlockIds.length === 0, 'Temu refresh must not remove an original block ID.');
assert(Array.isArray(verifiedDiff?.changedCommonBlockIds) && verifiedDiff.changedCommonBlockIds.length === 4, 'Temu refresh must retain the four reviewed original-block edits.');
assert(Array.isArray(verifiedDiff?.addedBlockIds) && verifiedDiff.addedBlockIds.length === 10, 'Temu refresh must retain the ten reviewed block additions.');
const packageBlockIds = new Set(post.blocks.map(block => block.id));
for (const blockId of [...verifiedDiff.changedCommonBlockIds, ...verifiedDiff.addedBlockIds]) {
  assert(packageBlockIds.has(blockId), `Temu package is missing reviewed block ${blockId}.`);
}

assert(
  baseline.readiness?.state === 'blocked_editorial_approval_and_authenticated_preview'
    || baseline.readiness?.state === 'rebased_pending_editorial_approval_and_authenticated_preview',
  'Temu preflight must remain blocked on editorial approval and authenticated preview.',
);
assert(baseline.readiness?.safeToImport === false, 'Temu package must remain unsafe to import before editorial and preview approval.');
assert(Array.isArray(baseline.readiness?.requiredGates) && baseline.readiness.requiredGates.length >= 7, 'Temu preflight needs complete release gates.');

for (const [action, completed] of Object.entries(baseline.externalActions ?? {})) {
  assert(completed === false, `External action ${action} must remain false until explicitly authorized and verified.`);
}

console.log(
  'Validated Temu public production baseline and stable-ID refresh contract; '
    + `live record verified at effective revision ${baseline.productionRecord.revision}; `
    + 'release remains blocked on editorial approval and authenticated Production Preview; 0 external actions.',
);
