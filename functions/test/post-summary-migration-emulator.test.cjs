const assert = require('node:assert/strict');
const {execFile} = require('node:child_process');
const path = require('node:path');
const test = require('node:test');
const {promisify} = require('node:util');

const {deleteApp, initializeApp} = require('firebase-admin/app');
const {getFirestore} = require('firebase-admin/firestore');
const {createBlogPostSummaryDocument} = require('../lib/blog-publishing.js');

const execFileAsync = promisify(execFile);
const repositoryRoot = path.resolve(__dirname, '..', '..');
const migrationScript = path.join(repositoryRoot, 'functions', 'scripts', 'backfill-post-summaries.mjs');

function createPost(overrides = {}) {
  return {
    id: 'migration-post',
    revision: 4,
    slug: 'migration-post',
    title: 'Migration Post',
    excerpt: 'A post used to verify the safe summary migration.',
    coverImage: '/assets/images/migration.webp',
    authorId: 'colin-michaels',
    author: {name: 'Colin Michaels', slug: 'colin-michaels'},
    categories: ['CMS'],
    subcategories: [],
    tags: ['Migration'],
    status: 'published',
    seo: {title: 'Migration Post', description: 'Safe migration verification.'},
    contentFormat: 'editorjs',
    blocks: [{id: 'paragraph', type: 'paragraph', data: {text: 'Current canonical body.'}}],
    createdAt: '2026-08-25T01:00:00.000Z',
    updatedAt: '2026-08-25T02:00:00.000Z',
    publishedAt: '2026-08-25T02:00:00.000Z',
    ...overrides,
  };
}

test('summary migration requires an explicit target project before scanning or applying', async () => {
  await assert.rejects(
    execFileAsync(process.execPath, [migrationScript], {
      cwd: repositoryRoot,
      env: process.env,
    }),
    error => error.code !== 0
      && /valid explicit --project/.test(`${error.stderr ?? ''}${error.stdout ?? ''}`)
  );
});

test('summary migration repairs complete documents, removes orphans, and closes its manifest gate', async () => {
  const projectId = 'post-summary-migration-test';
  const app = initializeApp({projectId}, projectId);
  const firestore = getFirestore(app);

  try {
    const canonicalPost = createPost();
    const writes = [
      ['posts/migration-post', canonicalPost],
      ['postSummaries/migration-post', {
        id: 'migration-post',
        revision: 4,
        updatedAt: '2026-08-25T02:00:00.000Z',
        status: 'published',
        storageVersion: 1,
      }],
      ['postSummaries/orphan-post', {
        id: 'orphan-post',
        status: 'published',
        storageVersion: 1,
      }],
      ['postSummaries/__manifest', {
        kind: 'post-summary-index',
        schemaVersion: 1,
        complete: true,
        status: 'published',
      }],
    ];
    for (let index = 0; index < 250; index += 1) {
      const suffix = String(index).padStart(3, '0');
      const filler = createPost({
        id: `migration-page-${suffix}`,
        slug: `migration-page-${suffix}`,
        title: `Migration Page ${suffix}`,
      });
      writes.push(
        [`posts/${filler.id}`, filler],
        [`postSummaries/${filler.id}`, createBlogPostSummaryDocument(filler)]
      );
    }

    for (let index = 0; index < writes.length; index += 450) {
      const batch = firestore.batch();
      for (const [documentPath, value] of writes.slice(index, index + 450)) {
        batch.set(firestore.doc(documentPath), value);
      }
      await batch.commit();
    }

    const {stdout} = await execFileAsync(
      process.execPath,
      [migrationScript, '--apply', '--project', projectId],
      {
        cwd: repositoryRoot,
        env: {...process.env, GCLOUD_PROJECT: projectId},
      }
    );

    const summary = (await firestore.doc('postSummaries/migration-post').get()).data();
    const orphan = await firestore.doc('postSummaries/orphan-post').get();
    const manifest = (await firestore.doc('postSummaries/__manifest').get()).data();

    assert.match(stdout, new RegExp(`Target Firebase project: ${projectId}`));
    assert.equal(summary.title, 'Migration Post');
    assert.equal(summary.revision, 4);
    assert.equal(summary.storageVersion, 1);
    assert.equal('blocks' in summary, false);
    assert.equal(orphan.exists, false);
    assert.equal(manifest.kind, 'post-summary-index');
    assert.equal(manifest.schemaVersion, 1);
    assert.equal(manifest.complete, true);
    assert.equal(manifest.postCount, 251);
    assert.equal(manifest.publishedCount, 251);
    assert.equal((await firestore.doc('postSummaries/migration-page-249').get()).exists, true);
  } finally {
    await deleteApp(app);
  }
});
