import {access, readFile} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const REPOSITORY_ROOT = path.resolve(fileURLToPath(new URL('..', import.meta.url)));
const MANIFEST_PATH = path.join(
  REPOSITORY_ROOT,
  'docs',
  'SEO',
  'AUDITS',
  '2026-08-15',
  'FOUNDATION-RELEASE.json',
);

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function repositoryPath(relativePath) {
  assert(typeof relativePath === 'string' && relativePath.length > 0, 'Repository path is required.');
  assert(!path.isAbsolute(relativePath), `${relativePath} must be repository-relative.`);
  const resolved = path.resolve(REPOSITORY_ROOT, relativePath);
  assert(resolved.startsWith(`${REPOSITORY_ROOT}${path.sep}`), `${relativePath} must stay in the repository.`);
  return resolved;
}

async function readRepositoryFile(relativePath) {
  const resolved = repositoryPath(relativePath);
  await access(resolved);
  return readFile(resolved, 'utf8');
}

const manifest = JSON.parse(await readFile(MANIFEST_PATH, 'utf8'));
assert(manifest.schemaVersion === 1, 'Foundation release schemaVersion must be 1.');
assert(manifest.status === 'local-release-candidate', 'Foundation release must remain a local candidate before deployment.');
assert(manifest.baseline?.directionalSeoHealthScore === 68, 'Foundation release must retain the same-day directional baseline.');
assert(manifest.baseline?.liveCriticalFindingCount === 3, 'Foundation release must cover all three critical findings.');
assert(manifest.sourceState?.releaseCommit === null, 'Do not claim an exact release commit before one exists.');
assert(manifest.sourceState?.dirtyWorktree === true, 'Dirty-worktree state must remain explicit until release preparation.');
assert(manifest.sourceState?.exactReleaseTreeVerified === false, 'Exact release tree must not be claimed from a dirty worktree.');

const expectedFixIds = [
  'anonymous-reader-friction',
  'public-topic-identity',
  'meaningful-initial-html',
];
assert(
  JSON.stringify(manifest.criticalFixes?.map(fix => fix.id)) === JSON.stringify(expectedFixIds),
  'Foundation release must cover the three critical fixes in priority order.',
);

for (const fix of manifest.criticalFixes) {
  assert(typeof fix.liveFinding === 'string' && fix.liveFinding.length >= 100, `${fix.id} needs a substantive live finding.`);
  assert(typeof fix.localOutcome === 'string' && fix.localOutcome.length >= 100, `${fix.id} needs a substantive local outcome.`);
  assert(Array.isArray(fix.implementationFiles) && fix.implementationFiles.length >= 3, `${fix.id} needs implementation files.`);
  assert(Array.isArray(fix.testFiles) && fix.testFiles.length >= 2, `${fix.id} needs regression files.`);
  assert(Array.isArray(fix.publicRoutes) && fix.publicRoutes.length >= 1, `${fix.id} needs public proof routes.`);
  assert(Array.isArray(fix.invariants) && fix.invariants.length >= 4, `${fix.id} needs release invariants.`);
  for (const relativePath of [...fix.implementationFiles, ...fix.testFiles]) {
    await access(repositoryPath(relativePath));
  }
}

const membershipSource = await readRepositoryFile(
  'src/app/features/blog/components/signup-campaign/blog-membership-campaign.component.ts',
);
assert(!membershipSource.includes('promptTimer'), 'Anonymous wall-clock membership timer returned.');
assert(!membershipSource.includes('promptScheduled'), 'Anonymous membership scheduling state returned.');
assert(!membershipSource.includes('shouldPromptAnonymousReader()'), 'App-level component must not open an anonymous offer.');

const topicSource = await readRepositoryFile('src/app/features/topics/topic-hubs.data.ts');
assert(topicSource.includes('status: defaultTopicHub.status'), 'Code-defined topics must retain public publication state.');
assert(topicSource.includes('slug: defaultTopicHub.slug'), 'Code-defined topics must retain the canonical slug.');
assert(topicSource.includes('title: defaultTopicHub.title'), 'Code-defined topics must retain the public title.');
assert(topicSource.includes('terms: defaultTopicHub.terms'), 'Code-defined topics must retain matching intent.');
assert(
  /const exactTopic = topics\.find\(topicHub => topicHub\.slug === slug\);\s+return exactTopic;/u.test(topicSource),
  'Topic lookup must reject undeclared alias fallback.',
);

const functionsTopicSource = await readRepositoryFile('functions/src/topic-hub-public-identity.ts');
const expectedTopicSlugs = [
  'ai-setup',
  'recovery-planning',
  'angular-firebase-architecture',
  'labs-projects',
  'gadgets-toys',
  'drones-fpv',
];
const topicFix = manifest.criticalFixes.find(fix => fix.id === 'public-topic-identity');
assert(
  JSON.stringify(topicFix.publicRoutes) === JSON.stringify(expectedTopicSlugs.map(slug => `/topics/${slug}`)),
  'Manifest topic routes must match the public identity contract.',
);
for (const slug of expectedTopicSlugs) {
  assert(functionsTopicSource.includes(`slug: '${slug}'`), `Functions topic identity is missing ${slug}.`);
  assert(topicSource.includes(`slug: '${slug}'`), `Angular topic identity is missing ${slug}.`);
}
assert(!functionsTopicSource.includes("slug: 'weekly-updates'"), 'Functions must not publish the stale weekly-updates alias.');
assert(topicFix.rejectedAliases?.includes('/topics/weekly-updates'), 'Manifest must retain the stale-alias 404 proof gate.');

const indexHtml = await readRepositoryFile('src/index.html');
assert(indexHtml.includes('<main'), 'Physical homepage fallback needs semantic main content.');
assert(indexHtml.includes('<h1'), 'Physical homepage fallback needs a stable H1.');
assert(indexHtml.includes('application/ld+json'), 'Physical homepage fallback needs JSON-LD.');

const firebaseConfig = JSON.parse(await readRepositoryFile('firebase.json'));
const rewriteFunctions = new Set(
  firebaseConfig.hosting?.rewrites
    ?.map(rewrite => rewrite.function?.functionId)
    .filter(Boolean),
);
for (const functionId of manifest.deploymentScope?.functionsRequired ?? []) {
  assert(rewriteFunctions.has(functionId), `Firebase Hosting is missing the ${functionId} rewrite.`);
}
assert(manifest.deploymentScope?.hostingRequired === true, 'Foundation release must include Hosting.');
assert(manifest.deploymentScope?.deployTogether === true, 'Hosting and crawler Functions must deploy together.');
assert(manifest.deploymentScope?.firestoreMigrationRequired === false, 'Topic identity lock must not require destructive Firestore migration.');

assert(Array.isArray(manifest.preDeployGates) && manifest.preDeployGates.length >= 5, 'Foundation release needs complete pre-deploy gates.');
assert(Array.isArray(manifest.postDeployProof) && manifest.postDeployProof.length >= 6, 'Foundation release needs complete post-deploy proof.');
assert(manifest.readiness?.safeToDeploy === false, 'Dirty local candidate must fail closed before public deployment.');
assert(
  manifest.readiness?.state === 'blocked_exact_release_commit_and_public_approval',
  'Foundation release must name the exact remaining gate.',
);
for (const [action, completed] of Object.entries(manifest.externalActions ?? {})) {
  assert(completed === false, `External action ${action} must remain false until explicitly authorized and verified.`);
}

console.log(
  'Validated the three-finding SEO foundation release contract; '
    + '6 public topic identities locked; exact release commit and public approval still required; 0 external actions.',
);
