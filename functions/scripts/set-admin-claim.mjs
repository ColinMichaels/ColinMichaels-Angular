import {applicationDefault, initializeApp} from 'firebase-admin/app';
import {getAuth} from 'firebase-admin/auth';

function getArg(name) {
  const prefix = `--${name}=`;
  const directValue = process.argv.find(arg => arg.startsWith(prefix));

  if (directValue) {
    return directValue.slice(prefix.length).trim();
  }

  const index = process.argv.indexOf(`--${name}`);
  return index >= 0 ? process.argv[index + 1]?.trim() : undefined;
}

function hasFlag(name) {
  return process.argv.includes(`--${name}`);
}

const uid = getArg('uid');
const email = getArg('email');
const shouldRevoke = hasFlag('revoke');

if (!uid && !email) {
  console.error('Usage: npm --prefix functions run set-admin -- --email user@example.com');
  console.error('   or: npm --prefix functions run set-admin -- --uid firebaseUserUid');
  console.error('Revoke: npm --prefix functions run set-admin -- --email user@example.com --revoke');
  process.exit(1);
}

initializeApp({
  credential: applicationDefault(),
  projectId: process.env.FIREBASE_PROJECT_ID || process.env.GCLOUD_PROJECT,
});

const auth = getAuth();
const user = uid ? await auth.getUser(uid) : await auth.getUserByEmail(email);
const existingClaims = user.customClaims ?? {};
const nextClaims = {
  ...existingClaims,
  admin: !shouldRevoke,
};

if (shouldRevoke) {
  delete nextClaims.admin;
}

await auth.setCustomUserClaims(user.uid, nextClaims);

console.log(`${shouldRevoke ? 'Revoked' : 'Granted'} admin claim for ${user.email ?? user.uid}.`);
console.log('The user must refresh their ID token by signing out and signing back in.');
