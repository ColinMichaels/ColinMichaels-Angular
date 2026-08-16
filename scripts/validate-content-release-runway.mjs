import {access, readFile, readdir} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const REPOSITORY_ROOT = path.resolve(fileURLToPath(new URL('..', import.meta.url)));
const CONTENT_PACKAGES_ROOT = path.join(REPOSITORY_ROOT, 'docs', 'CONTENT_PACKAGES');
const RUNWAY_PATH = path.join(CONTENT_PACKAGES_ROOT, 'release-runway.json');
const EXPECTED_SCORE_KEYS = [
  'provenAudienceDemand',
  'firstPartyEvidence',
  'currentPromiseFit',
  'packageReadiness',
  'crossChannelContinuation',
  'saveShareUtility',
  'riskControl',
];

function isRecord(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function sameMembers(actual, expected) {
  return actual.length === expected.length
    && [...actual].sort().every((value, index) => value === [...expected].sort()[index]);
}

function assertHttpsUrl(value, label) {
  assert(typeof value === 'string' && value.length > 0, `${label} is required.`);
  const url = new URL(value);
  assert(url.protocol === 'https:', `${label} must use HTTPS.`);
  assert(url.username === '' && url.password === '', `${label} must not contain credentials.`);
}

function resolveRepositoryPath(relativePath, label) {
  assert(typeof relativePath === 'string' && relativePath.length > 0, `${label} is required.`);
  assert(!path.isAbsolute(relativePath), `${label} must be repository-relative.`);
  const resolved = path.resolve(REPOSITORY_ROOT, relativePath);
  const rootPrefix = `${REPOSITORY_ROOT}${path.sep}`;
  assert(resolved.startsWith(rootPrefix), `${label} must stay inside the repository.`);
  return resolved;
}

async function assertFileExists(relativePath, label) {
  const resolved = resolveRepositoryPath(relativePath, label);
  await access(resolved);
  return resolved;
}

async function findImportFiles(directory) {
  const entries = await readdir(directory, {withFileTypes: true});
  const files = [];

  for (const entry of entries) {
    const entryPath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      files.push(...await findImportFiles(entryPath));
    } else if (entry.isFile() && entry.name.endsWith('-import.json')) {
      files.push(entryPath);
    }
  }

  return files.sort();
}

const runway = JSON.parse(await readFile(RUNWAY_PATH, 'utf8'));
assert(runway.schemaVersion === 1, 'release runway schemaVersion must be 1.');
assert(runway.status === 'local-review-only', 'release runway must remain local-review-only.');
assert(
  typeof runway.capturedAt === 'string' && Number.isFinite(Date.parse(runway.capturedAt)),
  'release runway capturedAt must be a valid ISO timestamp.',
);
assert(
  typeof runway.decisionRule === 'string' && runway.decisionRule.length >= 120,
  'release runway needs a substantive decision rule.',
);

assert(isRecord(runway.weights), 'weights must be an object.');
assert(
  sameMembers(Object.keys(runway.weights), EXPECTED_SCORE_KEYS),
  'weights must contain the seven supported release factors.',
);
for (const [key, weight] of Object.entries(runway.weights)) {
  assert(Number.isInteger(weight) && weight > 0, `weight ${key} must be a positive integer.`);
}
const maximumWeightedTotal = Object.values(runway.weights).reduce((sum, weight) => sum + weight, 0) * 5;
assert(
  runway.scale?.maximumWeightedTotal === maximumWeightedTotal,
  `maximumWeightedTotal must be ${maximumWeightedTotal}.`,
);
assert(runway.scale?.minimum === 0 && runway.scale?.maximum === 5, 'score scale must be 0-5.');

assert(Array.isArray(runway.candidates) && runway.candidates.length > 0, 'candidates must be non-empty.');
const candidateIds = new Set();
const importPaths = new Set();
let previousTotal = Number.POSITIVE_INFINITY;

for (const [index, candidate] of runway.candidates.entries()) {
  const label = `candidates[${index}]`;
  assert(typeof candidate.id === 'string' && /^[a-z0-9]+(?:-[a-z0-9]+)*$/u.test(candidate.id), `${label}.id is invalid.`);
  assert(!candidateIds.has(candidate.id), `duplicate candidate id: ${candidate.id}`);
  candidateIds.add(candidate.id);

  assert(candidate.scoreRank === index + 1, `${candidate.id} scoreRank must match the descending score position.`);
  assert(typeof candidate.title === 'string' && candidate.title.trim().length >= 20, `${candidate.id} needs a title.`);
  assert(typeof candidate.series === 'string' && candidate.series.trim().length >= 5, `${candidate.id} needs a series.`);
  assert(
    candidate.recordMode === 'create_draft'
      || candidate.recordMode === 'update_existing_published_record'
      || candidate.recordMode === 'resolve_existing_live_topic_conflict',
    `${candidate.id} has an unsupported recordMode.`,
  );
  assertHttpsUrl(candidate.canonicalUrl, `${candidate.id}.canonicalUrl`);

  assert(isRecord(candidate.artifactPaths), `${candidate.id}.artifactPaths is required.`);
  const importPath = candidate.artifactPaths.importFile;
  assert(!importPaths.has(importPath), `duplicate import file in runway: ${importPath}`);
  importPaths.add(importPath);
  const resolvedImportPath = await assertFileExists(importPath, `${candidate.id}.artifactPaths.importFile`);
  await assertFileExists(candidate.artifactPaths.packageBrief, `${candidate.id}.artifactPaths.packageBrief`);
  assert(Array.isArray(candidate.artifactPaths.crossChannelDocs), `${candidate.id}.crossChannelDocs must be an array.`);
  for (const [documentIndex, documentPath] of candidate.artifactPaths.crossChannelDocs.entries()) {
    await assertFileExists(documentPath, `${candidate.id}.crossChannelDocs[${documentIndex}]`);
  }

  const importDocument = JSON.parse(await readFile(resolvedImportPath, 'utf8'));
  assert(importDocument.source === 'colinmichaels-cms', `${candidate.id} import must use the CMS source.`);
  assert(importDocument.collection === 'posts', `${candidate.id} import must target posts.`);
  assert(Array.isArray(importDocument.posts) && importDocument.posts.length === 1, `${candidate.id} import must contain exactly one post.`);
  const post = importDocument.posts[0];
  assert(post.id === candidate.id || post.slug === candidate.id, `${candidate.id} must match the import post id or slug.`);
  assert(post.title === candidate.title, `${candidate.id} title does not match the import.`);
  assert(post.seo?.canonical === candidate.canonicalUrl, `${candidate.id} canonical does not match the import.`);
  assert(isRecord(post.editorial), `${candidate.id} import needs editorial evidence metadata.`);
  assert(Array.isArray(post.blocks), `${candidate.id} import needs blocks.`);
  const inlineImages = post.blocks.filter(block => block?.type === 'image');
  assert(inlineImages.length >= 2, `${candidate.id} needs at least two inline images.`);
  assert(post.blocks.some(block => block?.type === 'poll'), `${candidate.id} needs its planned reader interaction.`);
  if (candidate.recordMode === 'create_draft') {
    assert(post.status === 'draft' && post.publishedAt === null, `${candidate.id} must remain an unpublished draft.`);
    if (candidate.artifactPaths.productionPreflight || candidate.artifactPaths.liveVerifier) {
      assert(
        candidate.artifactPaths.productionPreflight && candidate.artifactPaths.liveVerifier,
        `${candidate.id} must provide both productionPreflight and liveVerifier when either is present.`,
      );
      await assertFileExists(candidate.artifactPaths.productionPreflight, `${candidate.id}.artifactPaths.productionPreflight`);
      await assertFileExists(candidate.artifactPaths.liveVerifier, `${candidate.id}.artifactPaths.liveVerifier`);
    }
  } else if (candidate.recordMode === 'update_existing_published_record') {
    assert(post.status === 'published' && typeof post.publishedAt === 'string', `${candidate.id} must preserve its published-record identity.`);
    await assertFileExists(candidate.artifactPaths.productionPreflight, `${candidate.id}.artifactPaths.productionPreflight`);
    await assertFileExists(candidate.artifactPaths.liveVerifier, `${candidate.id}.artifactPaths.liveVerifier`);
  } else {
    const conflict = candidate.liveTopicConflict;
    assert(post.status === 'draft' && post.publishedAt === null, `${candidate.id} conflicting package must remain an unpublished draft.`);
    assert(isRecord(conflict) && conflict.status === 'confirmed', `${candidate.id} needs a confirmed live-topic conflict.`);
    assertHttpsUrl(conflict.liveCanonical, `${candidate.id}.liveTopicConflict.liveCanonical`);
    assert(conflict.liveCanonical !== candidate.canonicalUrl, `${candidate.id} conflict must identify a different live canonical.`);
    assert(conflict.safeToPublishStagedDraftAsNewUrl === false, `${candidate.id} must forbid publishing the staged duplicate URL.`);
    assert(
      typeof conflict.requiredResolution === 'string' && conflict.requiredResolution.length >= 120,
      `${candidate.id} needs a substantive consolidation resolution.`,
    );
    assert(
      typeof conflict.liveContentEvidence === 'string' && conflict.liveContentEvidence.length >= 120,
      `${candidate.id} needs substantive live-content evidence.`,
    );
  }

  assert(isRecord(candidate.audienceSignal), `${candidate.id}.audienceSignal is required.`);
  assert(typeof candidate.audienceSignal.kind === 'string', `${candidate.id}.audienceSignal.kind is required.`);
  assert(/^\d{4}-\d{2}-\d{2}$/u.test(candidate.audienceSignal.capturedAt), `${candidate.id}.audienceSignal.capturedAt must be a date.`);
  assert(
    typeof candidate.audienceSignal.qualitativeSignal === 'string'
      && candidate.audienceSignal.qualitativeSignal.length >= 60,
    `${candidate.id} needs a bounded audience-signal explanation.`,
  );

  assert(isRecord(candidate.scores), `${candidate.id}.scores is required.`);
  assert(
    sameMembers(Object.keys(candidate.scores), EXPECTED_SCORE_KEYS),
    `${candidate.id}.scores must contain the seven supported factors.`,
  );
  assert(isRecord(candidate.scoreReasons), `${candidate.id}.scoreReasons is required.`);
  assert(
    sameMembers(Object.keys(candidate.scoreReasons), EXPECTED_SCORE_KEYS),
    `${candidate.id}.scoreReasons must explain all seven supported factors.`,
  );

  let weightedTotal = 0;
  for (const scoreKey of EXPECTED_SCORE_KEYS) {
    const score = candidate.scores[scoreKey];
    assert(Number.isInteger(score) && score >= 0 && score <= 5, `${candidate.id} score ${scoreKey} must be an integer from 0 to 5.`);
    assert(
      typeof candidate.scoreReasons[scoreKey] === 'string'
        && candidate.scoreReasons[scoreKey].trim().length >= 60,
      `${candidate.id} needs a substantive reason for ${scoreKey}.`,
    );
    weightedTotal += score * runway.weights[scoreKey];
  }
  assert(candidate.weightedTotal === weightedTotal, `${candidate.id} weightedTotal must be ${weightedTotal}.`);
  assert(candidate.weightedTotal <= previousTotal, 'candidates must be ordered by descending weightedTotal.');
  previousTotal = candidate.weightedTotal;
}

const discoveredImportFiles = await findImportFiles(CONTENT_PACKAGES_ROOT);
const discoveredRelativeImports = discoveredImportFiles.map(filePath => path.relative(REPOSITORY_ROOT, filePath));
assert(
  sameMembers(discoveredRelativeImports, [...importPaths]),
  'release runway must include every and only the current content-package import file.',
);

assert(
  Array.isArray(runway.recommendedReleaseOrder)
    && runway.recommendedReleaseOrder.length === runway.candidates.length,
  'recommendedReleaseOrder must include every candidate.',
);
const releaseIds = new Set();
for (const [index, release] of runway.recommendedReleaseOrder.entries()) {
  assert(release.priority === index + 1, 'release priorities must be sequential.');
  assert(candidateIds.has(release.candidateId), `unknown release candidate: ${release.candidateId}`);
  assert(!releaseIds.has(release.candidateId), `duplicate release candidate: ${release.candidateId}`);
  releaseIds.add(release.candidateId);
  assert(typeof release.releaseType === 'string' && release.releaseType.length >= 8, `${release.candidateId} needs a releaseType.`);
  assert(typeof release.sequencingReason === 'string' && release.sequencingReason.length >= 100, `${release.candidateId} needs a substantive sequencingReason.`);
  assert(typeof release.activationGate === 'string' && release.activationGate.length >= 100, `${release.candidateId} needs a substantive activationGate.`);
}
assert(sameMembers([...releaseIds], [...candidateIds]), 'release order must contain every candidate exactly once.');

assert(
  Array.isArray(runway.firstThirtyDaySequence) && runway.firstThirtyDaySequence.length >= 5,
  'firstThirtyDaySequence needs the foundation, three releases, and measurement gate.',
);
assert(
  !runway.firstThirtyDaySequence.some(step => /publish the HOVERAir AQUA article/iu.test(step)),
  'The first-30-day sequence must not publish the conflicting HOVERAir AQUA draft.',
);
assert(isRecord(runway.measurementGate), 'measurementGate is required.');
assert(
  Array.isArray(runway.measurementGate.windows)
    && runway.measurementGate.windows.includes('7 days')
    && runway.measurementGate.windows.includes('28 days'),
  'measurementGate must preserve 7-day and 28-day windows.',
);
assert(Array.isArray(runway.measurementGate.siteMetrics) && runway.measurementGate.siteMetrics.length >= 7, 'measurementGate needs site metrics.');
assert(Array.isArray(runway.measurementGate.videoMetrics) && runway.measurementGate.videoMetrics.length >= 6, 'measurementGate needs video metrics.');

assert(isRecord(runway.externalActions), 'externalActions is required.');
for (const [action, completed] of Object.entries(runway.externalActions)) {
  assert(completed === false, `external action ${action} must remain false until explicitly authorized and verified.`);
}

console.log(
  `Validated release runway for ${runway.candidates.length} evidence-ready packages; `
    + `first new flagship: ${runway.candidates[0].id}; first operational action: `
    + `${runway.recommendedReleaseOrder[0].candidateId}; 0 external actions.`,
);
