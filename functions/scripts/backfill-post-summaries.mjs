import {applicationDefault, cert, getApps, initializeApp} from 'firebase-admin/app';
import {FieldPath, getFirestore} from 'firebase-admin/firestore';
import {isDeepStrictEqual} from 'node:util';
import {readFile} from 'node:fs/promises';

import blogPublishing from '../lib/blog-publishing.js';

const {createBlogPostSummaryDocument} = blogPublishing;
const SCAN_PAGE_SIZE = 250;
const RECONCILIATION_CONCURRENCY = 20;
const PROJECT_ID_PATTERN = /^[a-z][a-z0-9-]{4,28}[a-z0-9]$/;
const applyChanges = process.argv.includes('--apply');
const confirmedProjectId = readArgument('--project');

if (!confirmedProjectId || !PROJECT_ID_PATTERN.test(confirmedProjectId)) {
  throw new Error('Refusing to scan or apply without a valid explicit --project <firebase-project-id> confirmation.');
}

const credentialPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;
const credential = credentialPath
  ? cert(JSON.parse(await readFile(credentialPath, 'utf8')))
  : applicationDefault();

if (getApps().length === 0) {
  initializeApp({
    credential,
    ...(confirmedProjectId ? {projectId: confirmedProjectId} : {}),
  });
}

const firestore = getFirestore();
const resolvedProjectId = firestore.projectId;
if (confirmedProjectId && resolvedProjectId !== confirmedProjectId) {
  throw new Error(`Resolved Firebase project ${resolvedProjectId} does not match --project ${confirmedProjectId}.`);
}

console.log(`Target Firebase project: ${resolvedProjectId}.`);
const manifestRef = firestore.collection('postSummaries').doc('__manifest');
const manifestSnapshot = await manifestRef.get();
const manifestComplete = manifestSnapshot.get('kind') === 'post-summary-index'
  && manifestSnapshot.get('schemaVersion') === 1
  && manifestSnapshot.get('complete') === true;

if (applyChanges) {
  await manifestRef.set({
    kind: 'post-summary-index',
    schemaVersion: 1,
    complete: false,
    status: 'published',
    migrationStartedAt: new Date().toISOString(),
  }, {merge: false});
}

let postCount = 0;
let publishedCount = 0;
let stalePostCount = 0;
let orphanSummaryCount = 0;
let updatedCount = 0;
let deletedCount = 0;

for await (const postDocuments of readCollectionPages('posts')) {
  postCount += postDocuments.length;
  publishedCount += postDocuments.filter(document => document.get('status') === 'published').length;

  const summarySnapshots = await firestore.getAll(...postDocuments.map(document => (
    firestore.collection('postSummaries').doc(document.id)
  )));
  const stalePostIds = postDocuments
    .filter((document, index) => {
      const summarySnapshot = summarySnapshots[index];
      return !summarySnapshot.exists
        || !isDeepStrictEqual(
          summarySnapshot.data(),
          createBlogPostSummaryDocument(document.data())
        );
    })
    .map(document => document.id);

  stalePostCount += stalePostIds.length;
  if (applyChanges) {
    const counts = await reconcilePostSummaries(stalePostIds);
    updatedCount += counts.updated;
    deletedCount += counts.deleted;
  }
}

for await (const summaryDocuments of readCollectionPages('postSummaries')) {
  const candidateSummaries = summaryDocuments.filter(document => document.id !== '__manifest');
  if (candidateSummaries.length === 0) {
    continue;
  }

  const postSnapshots = await firestore.getAll(...candidateSummaries.map(document => (
    firestore.collection('posts').doc(document.id)
  )));
  const orphanSummaryIds = candidateSummaries
    .filter((_, index) => !postSnapshots[index].exists)
    .map(document => document.id);

  orphanSummaryCount += orphanSummaryIds.length;
  if (applyChanges) {
    const counts = await reconcilePostSummaries(orphanSummaryIds);
    updatedCount += counts.updated;
    deletedCount += counts.deleted;
  }
}

console.log(
  `${applyChanges ? 'Applying' : 'Dry run:'} ${stalePostCount} of ${postCount} post summaries require an upsert; `
  + `${orphanSummaryCount} orphan summaries require deletion; manifest was ${manifestComplete ? 'complete' : 'missing or incomplete'}.`
);

if (!applyChanges) {
  if (stalePostCount > 0 || orphanSummaryCount > 0 || !manifestComplete) {
    console.log('Re-run with --apply and the explicit --project after deploying compatible Functions.');
  }
  process.exit(0);
}

await manifestRef.set({
  kind: 'post-summary-index',
  schemaVersion: 1,
  complete: true,
  status: 'published',
  postCount,
  publishedCount,
  updatedAt: new Date().toISOString(),
}, {merge: false});

console.log(`Updated ${updatedCount} post summaries and removed ${deletedCount} orphans.`);

async function* readCollectionPages(collectionName) {
  let lastDocument;

  while (true) {
    let pageQuery = firestore.collection(collectionName)
      .orderBy(FieldPath.documentId())
      .limit(SCAN_PAGE_SIZE);
    if (lastDocument) {
      pageQuery = pageQuery.startAfter(lastDocument);
    }

    const snapshot = await pageQuery.get();
    if (snapshot.empty) {
      return;
    }

    yield snapshot.docs;
    lastDocument = snapshot.docs.at(-1);
    if (snapshot.size < SCAN_PAGE_SIZE) {
      return;
    }
  }
}

async function reconcilePostSummaries(postIds) {
  let updated = 0;
  let deleted = 0;

  // Re-read each candidate inside a transaction. Compatible publishing
  // Functions update canonical posts and summaries atomically, while these
  // transactions prevent an in-flight migration from restoring stale data
  // over a newer publish or deleting a concurrently created post's summary.
  for (let index = 0; index < postIds.length; index += RECONCILIATION_CONCURRENCY) {
    const results = await Promise.all(
      postIds.slice(index, index + RECONCILIATION_CONCURRENCY).map(postId => reconcilePostSummary(postId))
    );
    updated += results.filter(result => result === 'updated').length;
    deleted += results.filter(result => result === 'deleted').length;
  }

  return {updated, deleted};
}

async function reconcilePostSummary(postId) {
  const postRef = firestore.collection('posts').doc(postId);
  const summaryRef = firestore.collection('postSummaries').doc(postId);

  return firestore.runTransaction(async transaction => {
    const postSnapshot = await transaction.get(postRef);
    const summarySnapshot = await transaction.get(summaryRef);

    if (!postSnapshot.exists) {
      if (summarySnapshot.exists) {
        transaction.delete(summaryRef);
        return 'deleted';
      }
      return 'unchanged';
    }

    const summary = createBlogPostSummaryDocument(postSnapshot.data());
    if (summarySnapshot.exists && isDeepStrictEqual(summarySnapshot.data(), summary)) {
      return 'unchanged';
    }

    transaction.set(summaryRef, summary, {merge: false});
    return 'updated';
  });
}

function readArgument(name) {
  const inline = process.argv.find(argument => argument.startsWith(`${name}=`));
  if (inline) {
    return inline.slice(name.length + 1).trim();
  }

  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1]?.trim() : undefined;
}
