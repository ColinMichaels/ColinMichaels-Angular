import {applicationDefault, initializeApp} from 'firebase-admin/app';
import {getAuth} from 'firebase-admin/auth';
import {getFirestore} from 'firebase-admin/firestore';
import {randomUUID} from 'node:crypto';
import {existsSync, readFileSync} from 'node:fs';
import {resolve} from 'node:path';

const BASE_USER_ROLE = 'user';
const USERS_COLLECTION = 'users';
// Keep this lease protocol aligned with `functions/src/index.ts`; this script runs
// without a TypeScript build, so it cannot safely import the ignored `lib` output.
const USER_ROLE_MUTATION_LOCKS_COLLECTION = 'userRoleMutationLocks';
const USER_ROLE_MUTATION_LEASE_MS = 60 * 1000;
const USER_ROLE_MUTATION_MAX_ATTEMPTS = 8;
const USER_ROLE_MUTATION_RETRY_BASE_MS = 50;
const USER_ROLE_MUTATION_RETRY_MAX_MS = 400;
const ROLE_NAME_PATTERN = /^[A-Za-z][A-Za-z0-9_-]{0,63}$/;

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

function canAcquireUserRoleMutationLease(value, ownerId, nowMillis) {
  if (!isRecord(value)) {
    return true;
  }

  const existingOwnerId = typeof value.ownerId === 'string' ? value.ownerId : '';
  const expiresAtMillis = typeof value.expiresAtMillis === 'number' ? value.expiresAtMillis : 0;

  return existingOwnerId === ownerId || expiresAtMillis <= nowMillis;
}

async function acquireUserRoleMutationLease(firestore, uid, ownerId) {
  const leaseRef = firestore.collection(USER_ROLE_MUTATION_LOCKS_COLLECTION).doc(uid);

  for (let attempt = 0; attempt < USER_ROLE_MUTATION_MAX_ATTEMPTS; attempt += 1) {
    const acquired = await firestore.runTransaction(async transaction => {
      const snapshot = await transaction.get(leaseRef);
      const nowMillis = Date.now();

      if (!canAcquireUserRoleMutationLease(snapshot.data(), ownerId, nowMillis)) {
        return false;
      }

      transaction.set(leaseRef, {
        ownerId,
        acquiredAt: new Date(nowMillis).toISOString(),
        expiresAtMillis: nowMillis + USER_ROLE_MUTATION_LEASE_MS,
      }, {merge: false});
      return true;
    });

    if (acquired) {
      return;
    }

    const retryDelay = Math.min(
      USER_ROLE_MUTATION_RETRY_BASE_MS * (2 ** attempt),
      USER_ROLE_MUTATION_RETRY_MAX_MS
    );
    await new Promise(resolveDelay => setTimeout(resolveDelay, retryDelay));
  }

  throw new Error('Another role update is in progress. Please try again.');
}

async function releaseUserRoleMutationLease(firestore, uid, ownerId) {
  const leaseRef = firestore.collection(USER_ROLE_MUTATION_LOCKS_COLLECTION).doc(uid);

  try {
    await firestore.runTransaction(async transaction => {
      const snapshot = await transaction.get(leaseRef);
      const lease = snapshot.data();

      if (isRecord(lease) && lease.ownerId === ownerId) {
        transaction.delete(leaseRef);
      }
    });
  } catch (error) {
    // Match the Functions behavior: the bounded lease expires even when cleanup fails.
    console.warn(`Unable to release the user role mutation lease: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

function getUserAccountRoles(claims) {
  const roles = new Set([BASE_USER_ROLE]);

  if (isRecord(claims.roles)) {
    for (const [role, enabled] of Object.entries(claims.roles)) {
      if (enabled === true && ROLE_NAME_PATTERN.test(role)) {
        roles.add(role);
      }
    }
  }

  for (const mirroredRole of ['admin', 'cmsAdmin']) {
    if (claims[mirroredRole] === true) {
      roles.add(mirroredRole);
    }
  }

  return [...roles].sort((left, right) => left.localeCompare(right));
}

function getRequestedRoles() {
  const roles = getArgs('role')
    .flatMap(value => value.split(','))
    .map(value => value.trim())
    .filter(Boolean);

  return roles.length > 0 ? roles : ['admin'];
}

function assertValidRoles(roles) {
  const invalidRole = roles.find(role => !ROLE_NAME_PATTERN.test(role));

  if (invalidRole) {
    console.error(`Invalid role "${invalidRole}". Use letters, numbers, underscores, or hyphens, starting with a letter.`);
    process.exit(1);
  }
}

function readJsonFile(path) {
  if (!existsSync(path)) {
    return null;
  }

  try {
    return JSON.parse(readFileSync(path, 'utf8'));
  } catch (error) {
    console.warn(`Unable to parse ${path}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    return null;
  }
}

function getFirebaseRcProject() {
  const candidates = [
    resolve(process.cwd(), '.firebaserc'),
    resolve(process.cwd(), '..', '.firebaserc'),
  ];

  for (const path of candidates) {
    const config = readJsonFile(path);

    if (!isRecord(config) || !isRecord(config.projects)) {
      continue;
    }

    const requestedAlias = getArg('projectAlias') || 'default';
    const project = config.projects[requestedAlias] || config.projects.default;

    if (typeof project === 'string' && project.trim()) {
      return project.trim();
    }
  }

  return '';
}

function getProjectId() {
  return getArg('project')
    || process.env.FIREBASE_PROJECT_ID
    || process.env.GCLOUD_PROJECT
    || process.env.GOOGLE_CLOUD_PROJECT
    || getFirebaseRcProject();
}

const uid = getArg('uid');
const email = getArg('email');
const shouldRevoke = hasFlag('revoke');
const requestedRoles = getRequestedRoles();
const projectId = getProjectId();

assertValidRoles(requestedRoles);

if (!uid && !email) {
  console.error('Usage: npm --prefix functions run set-admin -- --email user@example.com');
  console.error('   or: npm --prefix functions run set-admin -- --uid firebaseUserUid');
  console.error('Optional project: npm --prefix functions run set-admin -- --project colinmichaels --email user@example.com');
  console.error('Grant role: npm --prefix functions run set-admin -- --email user@example.com --role contentEditor');
  console.error('Grant multiple roles: npm --prefix functions run set-admin -- --email user@example.com --role contentEditor,adsEditor');
  console.error('Revoke: npm --prefix functions run set-admin -- --email user@example.com --role contentEditor --revoke');
  process.exit(1);
}

if (!projectId) {
  console.error('Unable to detect a Firebase project id.');
  console.error('Pass --project your-project-id, set FIREBASE_PROJECT_ID, or add a default project to .firebaserc.');
  process.exit(1);
}

initializeApp({
  credential: applicationDefault(),
  projectId,
});

const auth = getAuth();
const firestore = getFirestore();
const requestedUser = uid ? await auth.getUser(uid) : await auth.getUserByEmail(email);
const leaseOwnerId = randomUUID();

await acquireUserRoleMutationLease(firestore, requestedUser.uid, leaseOwnerId);

try {
  // Re-read Auth only after acquiring the shared lease so no callable mutation can be overwritten.
  const user = await auth.getUser(requestedUser.uid);
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

  const updatedAt = new Date().toISOString();
  await firestore.collection(USERS_COLLECTION).doc(user.uid).set({
    uid: user.uid,
    roles: getUserAccountRoles(nextClaims),
    updatedAt,
  }, {merge: true});
} finally {
  await releaseUserRoleMutationLease(firestore, requestedUser.uid, leaseOwnerId);
}

console.log(`${shouldRevoke ? 'Revoked' : 'Granted'} role(s) ${requestedRoles.join(', ')} for ${requestedUser.email ?? requestedUser.uid}.`);
console.log('The user must refresh their ID token by signing out and signing back in.');
