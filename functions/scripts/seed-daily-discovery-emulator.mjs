import { getApps, initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';

const authEmulatorHost = process.env.FIREBASE_AUTH_EMULATOR_HOST?.trim() ?? '';
const emulatorHost = process.env.FIRESTORE_EMULATOR_HOST?.trim() ?? '';
const projectId = process.env.GCLOUD_PROJECT?.trim() ?? '';

if (!/^(127\.0\.0\.1|localhost):\d+$/.test(authEmulatorHost)) {
  throw new Error(
    'Refusing to seed without a loopback FIREBASE_AUTH_EMULATOR_HOST. Start the local Auth emulator first.',
  );
}

if (!/^(127\.0\.0\.1|localhost):\d+$/.test(emulatorHost)) {
  throw new Error(
    'Refusing to seed without a loopback FIRESTORE_EMULATOR_HOST. Start the local Firestore emulator first.',
  );
}

if (projectId !== 'colinmichaels') {
  throw new Error('Refusing to seed an unexpected Firebase project id.');
}

const easternDate = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'America/New_York',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
}).format(new Date());

const titles = [
  'Practical Guide to Building a Personal Health Record',
  'How Voice Notes Become a Finished Blog Draft',
  'Safer Family Rules for AI Voice Scams',
  'Comparing Flights and Hotels With Better Questions',
  'A Simple Summer Heat Safety Plan',
  'What Waterproof Drones Need Before Saltwater Flights',
  'Organizing Passwords After a Major Data Breach',
  'Designing Accessible Search for a Personal Website',
  'Planning Recovery Questions Before an Appointment',
  'Learning Creative Technology Through Small Experiments',
  'Building a Reliable Angular and Firebase Publishing Workflow',
  'Choosing Practical Tools for Outdoor Adventures',
];

const slugify = (value) =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');

const apps = getApps();
const app = apps[0] ?? initializeApp({ projectId });
const auth = getAuth(app);
const firestore = getFirestore(app);
const now = new Date();
const nowIso = now.toISOString();
const batch = firestore.batch();

titles.forEach((title, index) => {
  const position = String(index + 1).padStart(2, '0');
  const publishedAt = new Date(now.getTime() - index * 86_400_000).toISOString();

  batch.set(firestore.collection('posts').doc(`local-daily-discovery-${position}`), {
    id: `local-daily-discovery-${position}`,
    revision: 1,
    slug: `local-${slugify(title)}`,
    title,
    excerpt: 'Local emulator content for testing the Daily Discovery question flow.',
    coverImage: '/assets/social/colin-michaels-og.jpg',
    authorId: 'local-colin-michaels',
    author: {
      name: 'Colin Michaels',
      slug: 'colin-michaels',
    },
    categories: ['Local Testing'],
    subcategories: [],
    tags: ['daily discovery', 'local emulator'],
    status: 'published',
    featured: false,
    readTime: 3,
    contentFormat: 'editorjs',
    blocks: [
      {
        id: `local-paragraph-${position}`,
        type: 'paragraph',
        data: {
          text: 'This local-only post exists so the full Daily Discovery interaction can be tested without production data.',
        },
      },
    ],
    seo: {
      title,
      description: 'Local-only Daily Discovery test content.',
      keywords: ['daily discovery', 'local testing'],
    },
    createdAt: publishedAt,
    publishedAt,
    updatedAt: nowIso,
  });
});

// Force the next local request to exercise generation from the seeded catalog.
batch.delete(firestore.collection('dailyDiscoveryQuestionSets').doc(easternDate));

await batch.commit();

// These credentials belong only to the ephemeral Auth emulator and are
// intentionally fixed so signed-in points and streak QA is repeatable.
const localReader = {
  uid: 'local-daily-discovery-reader',
  email: 'daily-discovery@example.test',
  password: 'daily-discovery-local-only',
  displayName: 'Daily Discovery Local Reader',
};

try {
  await auth.getUser(localReader.uid);
  await auth.updateUser(localReader.uid, {
    email: localReader.email,
    password: localReader.password,
    displayName: localReader.displayName,
    emailVerified: true,
  });
} catch (error) {
  if (error?.code !== 'auth/user-not-found') {
    throw error;
  }

  await auth.createUser({...localReader, emailVerified: true});
}

console.log(`Seeded ${titles.length} local posts and reset the ${easternDate} Daily Discovery question set.`);
console.log(`Local reader: ${localReader.email} / ${localReader.password}`);
