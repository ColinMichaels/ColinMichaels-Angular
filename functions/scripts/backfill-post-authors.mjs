import {applicationDefault, cert, getApps, initializeApp} from 'firebase-admin/app';
import {getFirestore} from 'firebase-admin/firestore';
import {readFile} from 'node:fs/promises';

const DEFAULT_AUTHOR_ID = 'colin-michaels';
const applyChanges = process.argv.includes('--apply');
const credentialPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;
const credential = credentialPath
  ? cert(JSON.parse(await readFile(credentialPath, 'utf8')))
  : applicationDefault();

if (getApps().length === 0) {
  initializeApp({credential});
}

const firestore = getFirestore();
const now = new Date().toISOString();
const defaultAuthorRef = firestore.collection('authors').doc(DEFAULT_AUTHOR_ID);
const defaultAuthorSnapshot = await defaultAuthorRef.get();
const snapshot = await firestore.collection('posts').get();
const legacyPosts = snapshot.docs.filter(document => !document.data().authorId);

console.log(`${applyChanges ? 'Applying' : 'Dry run:'} ${legacyPosts.length} of ${snapshot.size} posts require an authorId; Colin profile ${defaultAuthorSnapshot.exists ? 'exists' : 'must be created'}.`);

if (!applyChanges) {
  if (legacyPosts.length > 0 || !defaultAuthorSnapshot.exists) {
    console.log('Re-run with --apply after confirming the target Firebase project.');
  }
  process.exit(0);
}

if (!defaultAuthorSnapshot.exists) {
  await defaultAuthorRef.set({
    id: DEFAULT_AUTHOR_ID,
    slug: DEFAULT_AUTHOR_ID,
    name: 'Colin Michaels',
    title: 'Application developer, creative problem solver, FPV drone pilot, and photographer',
    shortBio: 'Colin Michaels is an application developer, creative problem solver, FPV drone pilot, photographer, and builder sharing software, creative projects, and personal lessons.',
    bio: 'Colin Michaels is an application developer, creative problem solver, FPV drone pilot, photographer, and someone who is always building something.',
    avatarUrl: 'https://firebasestorage.googleapis.com/v0/b/colinmichaels.firebasestorage.app/o/cms%2Fblog-media%2Fmedia-library%2Flibrary%2F1781710307542-26de032d-9418-4c44-8953-d5f4efdadeec.webp?alt=media&token=03c80fbe-8339-48cb-a150-0dbcf9cadff6',
    imageAlt: 'Colin Michaels portrait',
    location: 'Florida',
    externalProfiles: [
      {label: 'GitHub', url: 'https://github.com/ColinMichaels'},
      {label: 'LinkedIn', url: 'https://www.linkedin.com/in/colinmichaels'},
    ],
    healthDisclaimer: 'Anything health-related on this site is personal experience only and should not be taken as medical advice.',
    status: 'published',
    createdAt: now,
    updatedAt: now,
  });
}

if (legacyPosts.length === 0) {
  console.log('No legacy posts required backfill.');
  process.exit(0);
}

// Stay below Firestore's 500-write batch limit so the migration can scale safely.
for (let index = 0; index < legacyPosts.length; index += 450) {
  const batch = firestore.batch();
  for (const document of legacyPosts.slice(index, index + 450)) {
    const data = document.data();
    batch.set(document.ref, {
      authorId: DEFAULT_AUTHOR_ID,
      author: {
        ...(typeof data.author === 'object' && data.author ? data.author : {}),
        name: data.author?.name || 'Colin Michaels',
        title: data.author?.title || 'Applications Developer',
        slug: 'colin-michaels',
        profileUrl: '/authors/colin-michaels',
      },
    }, {merge: true});
  }
  await batch.commit();
}

console.log(`Backfilled ${legacyPosts.length} posts with ${DEFAULT_AUTHOR_ID}.`);
