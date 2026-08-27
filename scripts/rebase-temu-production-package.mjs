import {createHash} from 'node:crypto';
import {readFile, writeFile} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const REPOSITORY_ROOT = path.resolve(fileURLToPath(new URL('..', import.meta.url)));
const PACKAGE_ROOT = path.join(REPOSITORY_ROOT, 'docs', 'CONTENT_PACKAGES', 'temu-mega-drone-seo-refresh');
const BASELINE_PATH = path.join(PACKAGE_ROOT, 'PRODUCTION_BASELINE_2026-08-15.json');
const IMPORT_PATH = path.join(PACKAGE_ROOT, 'temu-mega-drone-seo-refresh-import.json');
const LOCAL_ENVIRONMENT_PATH = path.join(REPOSITORY_ROOT, 'src', 'environments', 'environment.local.ts');
const PROJECT_ID = 'colinmichaels';
const POST_ID = 'post-041c74e0-31f7-460a-8e85-4be3d62d9622';
const APPLY = process.argv.includes('--apply');

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function decodeFirestoreValue(value) {
  if (!value || typeof value !== 'object') return null;
  if ('nullValue' in value) return null;
  if ('stringValue' in value) return value.stringValue;
  if ('integerValue' in value) return Number(value.integerValue);
  if ('doubleValue' in value) return value.doubleValue;
  if ('booleanValue' in value) return value.booleanValue;
  if ('timestampValue' in value) return value.timestampValue;
  if ('bytesValue' in value) return value.bytesValue;
  if ('referenceValue' in value) return value.referenceValue;
  if ('geoPointValue' in value) return value.geoPointValue;
  if ('arrayValue' in value) return (value.arrayValue?.values ?? []).map(decodeFirestoreValue);
  if ('mapValue' in value) return decodeFirestoreFields(value.mapValue?.fields ?? {});
  throw new Error('Unsupported Firestore value in the Temu production record.');
}

function decodeFirestoreFields(fields) {
  return Object.fromEntries(
    Object.entries(fields).map(([key, value]) => [key, decodeFirestoreValue(value)]),
  );
}

function stableValue(value) {
  if (Array.isArray(value)) return value.map(stableValue);
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.keys(value).sort().map(key => [key, stableValue(value[key])]));
  }
  return value;
}

function fingerprint(value) {
  return createHash('sha256').update(JSON.stringify(stableValue(value))).digest('hex');
}

function storageObject(value) {
  assert(typeof value === 'string' && value.length > 0, 'Expected a Firebase Storage URL.');
  const encodedObject = new URL(value).pathname.split('/o/')[1];
  assert(encodedObject, 'Firebase Storage URL must include an /o/ object path.');
  return decodeURIComponent(encodedObject);
}

function uniqueBlockIds(blocks, label) {
  const ids = blocks.map(block => block?.id);
  assert(ids.every(id => typeof id === 'string' && id.length > 0), `${label} contains a block without an id.`);
  assert(new Set(ids).size === ids.length, `${label} contains duplicate block ids.`);
  return ids;
}

function createCanonicalPostSnapshot(value) {
  const optionalFields = [
    'revision',
    'backgroundImage',
    'thumbnailImage',
    'featured',
    'authorId',
    'subcategories',
    'og',
    'editorial',
    'socialPromotion',
    'catCorner',
  ];
  const snapshot = {
    id: value.id,
    slug: value.slug,
    title: value.title,
    excerpt: value.excerpt,
    coverImage: value.coverImage,
    author: value.author,
    categories: value.categories,
    tags: value.tags,
    status: value.status,
    seo: value.seo,
    contentFormat: value.contentFormat,
    blocks: value.blocks,
    createdAt: value.createdAt,
    updatedAt: value.updatedAt,
    publishedAt: value.publishedAt,
  };

  for (const field of optionalFields) {
    if (value[field] !== undefined) snapshot[field] = value[field];
  }

  return snapshot;
}

async function getClientApiKey() {
  if (process.env['FIREBASE_WEB_API_KEY']) return process.env['FIREBASE_WEB_API_KEY'];
  const source = await readFile(LOCAL_ENVIRONMENT_PATH, 'utf8');
  const apiKey = source.match(/apiKey:\s*['"]([^'"]+)['"]/u)?.[1];
  assert(apiKey, 'Firebase client API key was not found in environment.local.ts.');
  return apiKey;
}

async function loadProductionPost() {
  const url = new URL(`https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents/posts/${POST_ID}`);
  url.searchParams.set('key', await getClientApiKey());
  const response = await fetch(url, {headers: {'Accept': 'application/json'}, signal: AbortSignal.timeout(15_000)});
  const document = await response.json();
  assert(response.ok, `Public Firestore read failed with HTTP ${response.status}.`);
  assert(typeof document.name === 'string' && document.fields && typeof document.fields === 'object', 'Production response is incomplete.');
  return {
    id: document.name.split('/').at(-1),
    revisionFieldPresent: Object.hasOwn(document.fields, 'revision'),
    post: decodeFirestoreFields(document.fields),
  };
}

function createRebasedPackage({baseline, packagePost, production}) {
  const productionPost = createCanonicalPostSnapshot(production.post);
  const effectiveRevision = Number.isInteger(productionPost.revision) && productionPost.revision >= 0
    ? productionPost.revision
    : 0;
  const productionBlocks = Array.isArray(productionPost.blocks) ? productionPost.blocks : [];
  const packageBlocks = Array.isArray(packagePost.blocks) ? packagePost.blocks : [];
  const productionIds = uniqueBlockIds(productionBlocks, 'Production post');
  const packageIds = uniqueBlockIds(packageBlocks, 'Staged package');
  const productionById = new Map(productionBlocks.map(block => [block.id, block]));
  const packageById = new Map(packageBlocks.map(block => [block.id, block]));
  const expectedChangedIds = new Set(baseline.packageComparison?.verifiedDiff?.changedCommonBlockIds ?? []);
  const expectedAddedIds = new Set(baseline.packageComparison?.verifiedDiff?.addedBlockIds ?? []);
  const currentChangedIds = productionIds.filter(id => packageById.has(id) && (
    fingerprint(productionById.get(id)) !== fingerprint(packageById.get(id))
  ));
  const currentAddedIds = packageIds.filter(id => !productionById.has(id));
  const currentRemovedIds = productionIds.filter(id => !packageById.has(id));

  assert(production.id === POST_ID && packagePost.id === production.id, 'The package no longer targets the live Temu record.');
  assert(currentRemovedIds.length === 0, `Refusing to rebase because the package removes production block ids: ${currentRemovedIds.join(', ')}`);
  assert(JSON.stringify(currentChangedIds) === JSON.stringify([...expectedChangedIds]), 'The reviewed changed production blocks no longer match the staged package.');
  assert(JSON.stringify(currentAddedIds) === JSON.stringify([...expectedAddedIds]), 'The reviewed package additions no longer match the staged package.');

  const rebasedPost = {
    ...productionPost,
    revision: effectiveRevision,
    title: packagePost.title,
    excerpt: packagePost.excerpt,
    featured: packagePost.featured,
    editorial: packagePost.editorial,
    seo: {...productionPost.seo, ...packagePost.seo},
    og: {...productionPost.og, ...packagePost.og},
    blocks: packageBlocks.map(block => (
      productionById.has(block.id) && !expectedChangedIds.has(block.id)
        ? productionById.get(block.id)
        : block
    )),
  };
  const rebasedBlocksById = new Map(rebasedPost.blocks.map(block => [block.id, block]));
  const rebasedChangedIds = productionIds.filter(id => (
    fingerprint(productionById.get(id)) !== fingerprint(rebasedBlocksById.get(id))
  ));
  const rebasedAddedIds = rebasedPost.blocks.filter(block => !productionById.has(block.id)).map(block => block.id);
  const now = new Date().toISOString();
  const rebasedBaseline = {
    ...baseline,
    capturedAt: now,
    captureScope: 'Read-only public Firestore document request used to rebase the local staged package. No CMS import, Firestore write, deployment, or YouTube mutation was performed.',
    publicIdentity: {
      ...baseline.publicIdentity,
      slug: productionPost.slug,
      documentTitle: productionPost.seo?.title ?? productionPost.title,
      articleHeading: productionPost.title,
      description: productionPost.excerpt,
      canonical: productionPost.seo?.canonical,
      publishedAt: productionPost.publishedAt,
      modifiedAt: productionPost.updatedAt,
      categories: productionPost.categories,
      coverStorageObject: storageObject(productionPost.coverImage),
      openGraphStorageObject: storageObject(productionPost.seo?.openGraphImage),
    },
    productionRecord: {
      ...baseline.productionRecord,
      id: production.id,
      revision: effectiveRevision,
      revisionFieldPresent: production.revisionFieldPresent,
      createdAt: productionPost.createdAt,
      updatedAt: productionPost.updatedAt,
      featured: productionPost.featured ?? false,
      thumbnail: productionPost.thumbnail ?? productionPost.thumbnailImage ?? null,
      blockCount: productionBlocks.length,
      fingerprintSha256: fingerprint(production.post),
      readAt: now,
      verificationSurface: 'public-firestore-rest-read',
      note: `The package was rebased against effective production revision ${effectiveRevision}. Preserve this fingerprinted document as the rollback authority and recheck it immediately before any CMS import.`,
    },
    packageComparison: {
      ...baseline.packageComparison,
      verifiedDiff: {
        productionBlockCount: productionBlocks.length,
        packageBlockCount: rebasedPost.blocks.length,
        commonBlockCount: productionIds.length,
        changedCommonBlockIds: rebasedChangedIds,
        addedBlockIds: rebasedAddedIds,
        removedBlockIds: [],
        categoriesMatch: JSON.stringify(rebasedPost.categories) === JSON.stringify(productionPost.categories),
        tagsMatch: JSON.stringify(rebasedPost.tags) === JSON.stringify(productionPost.tags),
        canonicalMatches: rebasedPost.seo?.canonical === productionPost.seo?.canonical,
        coverObjectMatches: storageObject(rebasedPost.coverImage) === storageObject(productionPost.coverImage),
        openGraphObjectMatches: storageObject(rebasedPost.seo?.openGraphImage) === storageObject(productionPost.seo?.openGraphImage),
      },
      remainingUnverifiedGates: [
        'authenticated Production Preview rendering',
        'CMS role authorization and trusted Function acceptance',
        "Colin's final source, rights, voice, title, featured-state, and editorial approval",
        `immediate pre-import production fingerprint recheck at effective revision ${effectiveRevision}`,
      ],
    },
    readiness: {
      ...baseline.readiness,
      state: 'rebased_pending_editorial_approval_and_authenticated_preview',
      safeToImport: false,
      requiredGates: [
        'Run npm run verify:temu-production immediately before import and stop on any fingerprint drift.',
        'Recheck all volatile sources and third-party media immediately before import.',
        "Obtain Colin's final approval for voice, title, disclosures, rights, new illustrations, poll, and featured-state change.",
        'Load the exact record through the authenticated CMS and inspect Production Preview at desktop and mobile widths.',
        `Confirm the trusted publishing workflow accepts effective revision ${effectiveRevision} and will commit revision ${effectiveRevision + 1}.`,
        'Preserve the fingerprinted production record as the rollback authority.',
        'After approval, re-run all package, live-record, build, lint, and responsive public verification gates.',
      ],
    },
  };

  return {effectiveRevision, rebasedBaseline, rebasedPost, rebasedChangedIds, rebasedAddedIds};
}

const [baseline, importDocument, production] = await Promise.all([
  readFile(BASELINE_PATH, 'utf8').then(JSON.parse),
  readFile(IMPORT_PATH, 'utf8').then(JSON.parse),
  loadProductionPost(),
]);
const packagePost = importDocument.posts?.[0];
assert(packagePost && typeof packagePost === 'object', 'Temu package must contain one post.');
const rebase = createRebasedPackage({baseline, packagePost, production});

if (APPLY) {
  await writeFile(IMPORT_PATH, `${JSON.stringify({
    ...importDocument,
    exportedAt: rebase.rebasedBaseline.capturedAt,
    posts: [rebase.rebasedPost],
  }, null, 2)}\n`);
  await writeFile(BASELINE_PATH, `${JSON.stringify(rebase.rebasedBaseline, null, 2)}\n`);
}

console.log(JSON.stringify({
  applied: APPLY,
  recordId: production.id,
  effectiveRevision: rebase.effectiveRevision,
  productionUpdatedAt: production.post.updatedAt,
  preservedProductionBlockCount: production.post.blocks.length,
  reviewedChangedBlockIds: rebase.rebasedChangedIds,
  retainedAddedBlockIds: rebase.rebasedAddedIds,
  importRemainsBlocked: rebase.rebasedBaseline.readiness.safeToImport === false,
}, null, 2));
