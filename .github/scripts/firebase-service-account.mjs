import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

export function readFirebaseServiceAccountFromEnv() {
  const rawCredential = process.env.FIREBASE_SERVICE_ACCOUNT_JSON?.trim();
  const expectedProjectId = process.env.FIREBASE_PROJECT_ID?.trim();

  if (!rawCredential) {
    throw new Error(
      'Missing Firebase service account secret.\n' +
        'Add the raw service account JSON as FIREBASE_SERVICE_ACCOUNT_COLINMICHAELS or FIREBASE_SERVICE_ACCOUNT.',
    );
  }

  let credential;
  try {
    credential = JSON.parse(rawCredential);
  } catch {
    throw new Error(
      'Firebase service account secret is not valid JSON.\n' +
        'Paste the full raw JSON file contents into the GitHub secret, not the filename or file path.',
    );
  }

  const requiredFields = ['type', 'project_id', 'private_key', 'client_email'];
  const missingFields = requiredFields.filter(
    field => typeof credential[field] !== 'string' || credential[field].trim() === '',
  );

  if (missingFields.length > 0) {
    throw new Error(`Firebase service account JSON is missing required field(s): ${missingFields.join(', ')}`);
  }

  if (credential.type !== 'service_account') {
    throw new Error('Firebase credential JSON has an invalid "type" field; expected "service_account".');
  }

  credential.private_key = normalizePrivateKey(credential.private_key);

  if (!credential.private_key.includes('BEGIN PRIVATE KEY') || !credential.private_key.includes('END PRIVATE KEY')) {
    throw new Error('Firebase service account JSON private_key does not look like a private key.');
  }

  if (expectedProjectId && credential.project_id !== expectedProjectId) {
    throw new Error('Firebase service account project_id does not match FIREBASE_PROJECT_ID.');
  }

  return credential;
}

export function writeFirebaseServiceAccountCredentialsFile(credential) {
  const outputPath = path.join(process.env.RUNNER_TEMP || os.tmpdir(), 'firebase-service-account.json');

  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, `${JSON.stringify(credential, null, 2)}\n`, { mode: 0o600 });
  fs.chmodSync(outputPath, 0o600);

  return outputPath;
}

export function appendGitHubOutput(name, value) {
  if (!process.env.GITHUB_OUTPUT) {
    return;
  }

  fs.appendFileSync(process.env.GITHUB_OUTPUT, `${name}=${value}\n`);
}

function normalizePrivateKey(privateKey) {
  if (!privateKey.includes('\n') && privateKey.includes('\\n')) {
    return privateKey.replaceAll('\\n', '\n');
  }

  return privateKey;
}
