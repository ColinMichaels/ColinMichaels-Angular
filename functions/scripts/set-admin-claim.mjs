import {applicationDefault, initializeApp} from 'firebase-admin/app';
import {getAuth} from 'firebase-admin/auth';

function getArg(name) {
  return getArgs(name)[0];
}

function getArgs(name) {
  const prefix = `--${name}=`;
  const values = [];

  for (let index = 2; index < process.argv.length; index += 1) {
    const arg = process.argv[index];

    if (arg.startsWith(prefix)) {
      values.push(arg.slice(prefix.length).trim());
      continue;
    }

    if (arg === `--${name}`) {
      const value = process.argv[index + 1];

      if (value && !value.startsWith('--')) {
        values.push(value.trim());
        index += 1;
      }
    }
  }

  return values.filter(Boolean);
}

function hasFlag(name) {
  return process.argv.includes(`--${name}`);
}

function isRecord(value) {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function getRequestedRoles() {
  const roles = getArgs('role')
    .flatMap(value => value.split(','))
    .map(value => value.trim())
    .filter(Boolean);

  return roles.length > 0 ? roles : ['admin'];
}

function assertValidRoles(roles) {
  const invalidRole = roles.find(role => !/^[A-Za-z][A-Za-z0-9_-]{0,63}$/.test(role));

  if (invalidRole) {
    console.error(`Invalid role "${invalidRole}". Use letters, numbers, underscores, or hyphens, starting with a letter.`);
    process.exit(1);
  }
}

const uid = getArg('uid');
const email = getArg('email');
const shouldRevoke = hasFlag('revoke');
const requestedRoles = getRequestedRoles();

assertValidRoles(requestedRoles);

if (!uid && !email) {
  console.error('Usage: npm --prefix functions run set-admin -- --email user@example.com');
  console.error('   or: npm --prefix functions run set-admin -- --uid firebaseUserUid');
  console.error('Grant role: npm --prefix functions run set-admin -- --email user@example.com --role contentEditor');
  console.error('Grant multiple roles: npm --prefix functions run set-admin -- --email user@example.com --role contentEditor,adsEditor');
  console.error('Revoke: npm --prefix functions run set-admin -- --email user@example.com --role contentEditor --revoke');
  process.exit(1);
}

initializeApp({
  credential: applicationDefault(),
  projectId: process.env.FIREBASE_PROJECT_ID || process.env.GCLOUD_PROJECT,
});

const auth = getAuth();
const user = uid ? await auth.getUser(uid) : await auth.getUserByEmail(email);
const existingClaims = user.customClaims ?? {};
const existingRoles = isRecord(existingClaims.roles) ? existingClaims.roles : {};
const nextRoles = {...existingRoles};
const nextClaims = {
  ...existingClaims,
  roles: nextRoles,
};

for (const role of requestedRoles) {
  if (shouldRevoke) {
    delete nextRoles[role];
  } else {
    nextRoles[role] = true;
  }

  if (role === 'admin' || role === 'cmsAdmin') {
    if (shouldRevoke) {
      delete nextClaims[role];
    } else {
      nextClaims[role] = true;
    }
  }
}

if (Object.keys(nextRoles).length === 0) {
  delete nextClaims.roles;
}

await auth.setCustomUserClaims(user.uid, nextClaims);

console.log(`${shouldRevoke ? 'Revoked' : 'Granted'} role(s) ${requestedRoles.join(', ')} for ${user.email ?? user.uid}.`);
console.log('The user must refresh their ID token by signing out and signing back in.');
