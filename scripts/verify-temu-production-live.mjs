import {createHash} from 'node:crypto';
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
const LOCAL_ENVIRONMENT_PATH = path.join(REPOSITORY_ROOT, 'src', 'environments', 'environment.local.ts');
const PROJECT_ID = 'colinmichaels';
const POST_ID = 'post-041c74e0-31f7-460a-8e85-4be3d62d9622';
const REPORT_ONLY = process.argv.includes('--report');

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function decodeFirestoreValue(value) {
  if (!value || typeof value !== 'object') {
    return null;
  }
  if ('nullValue' in value) return null;
  if ('stringValue' in value) return value.stringValue;
  if ('integerValue' in value) return Number(value.integerValue);
  if ('doubleValue' in value) return Number(value.doubleValue);
  if ('booleanValue' in value) return value.booleanValue;
  if ('timestampValue' in value) return value.timestampValue;
  if ('bytesValue' in value) return value.bytesValue;
  if ('referenceValue' in value) return value.referenceValue;
  if ('geoPointValue' in value) return value.geoPointValue;
  if ('arrayValue' in value) {
    return (value.arrayValue?.values ?? []).map(decodeFirestoreValue);
  }
  if ('mapValue' in value) {
    return decodeFirestoreFields(value.mapValue?.fields ?? {});
  }
  throw new Error('Unsupported Firestore value in public blog record.');
}

function decodeFirestoreFields(fields) {
  return Object.fromEntries(
    Object.entries(fields).map(([key, value]) => [key, decodeFirestoreValue(value)]),
  );
}

function stableValue(value) {
  if (Array.isArray(value)) {
    return value.map(stableValue);
  }
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.keys(value).sort().map(key => [key, stableValue(value[key])]),
    );
  }
  return value;
}

function fingerprint(value) {
  return createHash('sha256').update(JSON.stringify(stableValue(value))).digest('hex');
}

function storageObject(value) {
  assert(typeof value === 'string' && value.length > 0, 'Expected a Firebase Storage URL.');
  const url = new URL(value);
  const encodedObject = url.pathname.split('/o/')[1];
  assert(encodedObject, 'Firebase Storage URL must include an /o/ object path.');
  return decodeURIComponent(encodedObject);
}

async function getClientApiKey() {
  if (process.env['FIREBASE_WEB_API_KEY']) {
    return process.env['FIREBASE_WEB_API_KEY'];
  }

  const source = await readFile(LOCAL_ENVIRONMENT_PATH, 'utf8');
  const match = source.match(/apiKey:\s*['"]([^'"]+)['"]/u);
  assert(match?.[1], 'Firebase client API key was not found in environment.local.ts.');
  return match[1];
}

async function loadProductionPost() {
  const apiKey = await getClientApiKey();
  const url = new URL(
    `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents/posts/${POST_ID}`,
  );
  url.searchParams.set('key', apiKey);

  const response = await fetch(url, {
    headers: {'Accept': 'application/json'},
    signal: AbortSignal.timeout(15_000),
  });
  const document = await response.json();
  assert(response.ok, `Public Firestore read failed with HTTP ${response.status}.`);
  assert(typeof document.name === 'string', 'Public Firestore response is missing its document name.');
  assert(document.fields && typeof document.fields === 'object', 'Public Firestore response is missing fields.');

  return {
    id: document.name.split('/').at(-1),
    revisionFieldPresent: Object.hasOwn(document.fields, 'revision'),
    post: decodeFirestoreFields(document.fields),
  };
}

const baseline = JSON.parse(await readFile(BASELINE_PATH, 'utf8'));
const importDocument = JSON.parse(await readFile(IMPORT_PATH, 'utf8'));
const packagePost = importDocument.posts?.[0];
const production = await loadProductionPost();
const productionPost = production.post;
const effectiveRevision = Number.isInteger(productionPost.revision) && productionPost.revision >= 0
  ? productionPost.revision
  : 0;
const productionFingerprint = fingerprint(productionPost);
const productionBlocks = Array.isArray(productionPost.blocks) ? productionPost.blocks : [];
const packageBlocks = Array.isArray(packagePost.blocks) ? packagePost.blocks : [];
const productionBlocksById = new Map(productionBlocks.map(block => [block.id, block]));
const packageBlocksById = new Map(packageBlocks.map(block => [block.id, block]));
const commonBlockIds = [...productionBlocksById.keys()].filter(id => packageBlocksById.has(id));
const addedBlockIds = [...packageBlocksById.keys()].filter(id => !productionBlocksById.has(id));
const removedBlockIds = [...productionBlocksById.keys()].filter(id => !packageBlocksById.has(id));
const changedCommonBlockIds = commonBlockIds.filter(id => (
  fingerprint(productionBlocksById.get(id)) !== fingerprint(packageBlocksById.get(id))
));

const report = {
  recordId: production.id,
  revisionFieldPresent: production.revisionFieldPresent,
  effectiveRevision,
  slug: productionPost.slug ?? null,
  status: productionPost.status ?? null,
  createdAt: productionPost.createdAt ?? null,
  updatedAt: productionPost.updatedAt ?? null,
  publishedAt: productionPost.publishedAt ?? null,
  featured: productionPost.featured ?? false,
  thumbnail: productionPost.thumbnail ?? productionPost.thumbnailImage ?? null,
  blockCount: productionBlocks.length,
  blockComparison: {
    packageBlockCount: packageBlocks.length,
    commonBlockCount: commonBlockIds.length,
    changedCommonBlockCount: changedCommonBlockIds.length,
    changedCommonBlockIds,
    addedBlockIds,
    removedBlockIds,
  },
  categoriesMatchPackage: JSON.stringify(productionPost.categories) === JSON.stringify(packagePost.categories),
  tagsMatchPackage: JSON.stringify(productionPost.tags) === JSON.stringify(packagePost.tags),
  canonicalMatchesPackage: productionPost.seo?.canonical === packagePost.seo?.canonical,
  fingerprintSha256: productionFingerprint,
};

if (REPORT_ONLY) {
  console.log(JSON.stringify(report, null, 2));
  process.exit(0);
}

assert(production.id === baseline.productionRecord?.id, 'Production Temu record ID drifted.');
assert(production.revisionFieldPresent === baseline.productionRecord?.revisionFieldPresent, 'Production revision-field state drifted.');
assert(effectiveRevision === baseline.productionRecord?.revision, 'Production effective revision drifted.');
assert(productionFingerprint === baseline.productionRecord?.fingerprintSha256, 'Production Temu record changed after the recorded preflight.');
assert(productionPost.slug === baseline.publicIdentity?.slug, 'Production Temu slug drifted.');
assert(productionPost.status === 'published', 'Production Temu record is no longer published.');
assert(productionPost.createdAt === baseline.productionRecord?.createdAt, 'Production Temu createdAt drifted.');
assert(productionPost.updatedAt === baseline.productionRecord?.updatedAt, 'Production Temu updatedAt drifted.');
assert(productionPost.publishedAt === baseline.publicIdentity?.publishedAt, 'Production Temu publishedAt drifted.');
assert((productionPost.featured ?? false) === baseline.productionRecord?.featured, 'Production Temu featured state drifted.');
assert((productionPost.thumbnail ?? productionPost.thumbnailImage ?? null) === baseline.productionRecord?.thumbnail, 'Production Temu thumbnail state drifted.');
assert(productionPost.blocks?.length === baseline.productionRecord?.blockCount, 'Production Temu block count drifted.');
assert(storageObject(productionPost.coverImage) === baseline.publicIdentity?.coverStorageObject, 'Production Temu cover object drifted.');
assert(
  storageObject(productionPost.seo?.openGraphImage) === baseline.publicIdentity?.openGraphStorageObject,
  'Production Temu Open Graph object drifted.',
);
assert(packagePost.id === production.id, 'Package ID does not match the live Temu record.');
assert(packagePost.revision === effectiveRevision, 'Package revision does not match the live effective revision.');
assert(packagePost.slug === productionPost.slug, 'Package slug does not match the live Temu record.');
assert(packagePost.createdAt === productionPost.createdAt, 'Package must preserve live createdAt.');
assert(packagePost.publishedAt === productionPost.publishedAt, 'Package must preserve live publishedAt.');
assert(JSON.stringify(packagePost.categories) === JSON.stringify(productionPost.categories), 'Package must preserve live categories.');
assert(JSON.stringify(packagePost.tags) === JSON.stringify(productionPost.tags), 'Package must preserve live tags.');
assert(storageObject(packagePost.coverImage) === storageObject(productionPost.coverImage), 'Package must preserve the live cover object.');
assert(
  storageObject(packagePost.seo?.openGraphImage) === storageObject(productionPost.seo?.openGraphImage),
  'Package must preserve the live Open Graph object.',
);

console.log(
  `Verified live Temu record ${production.id} at effective revision ${effectiveRevision}; `
    + `${report.blockCount} production blocks; fingerprint unchanged; no write performed.`,
);
