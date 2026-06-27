const rawCredential = process.env.FIREBASE_SERVICE_ACCOUNT_JSON?.trim();
const expectedProjectId = process.env.FIREBASE_PROJECT_ID?.trim();

if (!rawCredential) {
  console.error('Missing Firebase service account secret.');
  console.error('Add the raw service account JSON as FIREBASE_SERVICE_ACCOUNT_COLINMICHAELS or FIREBASE_SERVICE_ACCOUNT.');
  process.exit(1);
}

let credential;
try {
  credential = JSON.parse(rawCredential);
} catch {
  console.error('Firebase service account secret is not valid JSON.');
  console.error('Paste the full raw JSON file contents into the GitHub secret, not the filename or file path.');
  process.exit(1);
}

const requiredFields = ['type', 'project_id', 'private_key', 'client_email'];
const missingFields = requiredFields.filter(field => typeof credential[field] !== 'string' || credential[field].trim() === '');

if (missingFields.length > 0) {
  console.error(`Firebase service account JSON is missing required field(s): ${missingFields.join(', ')}`);
  process.exit(1);
}

if (credential.type !== 'service_account') {
  console.error(`Firebase credential JSON has type "${credential.type}", but expected "service_account".`);
  process.exit(1);
}

if (!credential.private_key.includes('BEGIN PRIVATE KEY')) {
  console.error('Firebase service account JSON private_key does not look like a private key.');
  process.exit(1);
}

if (expectedProjectId && credential.project_id !== expectedProjectId) {
  console.error(`Firebase service account project_id "${credential.project_id}" does not match FIREBASE_PROJECT_ID "${expectedProjectId}".`);
  process.exit(1);
}

console.log(`Firebase service account JSON is valid for project "${credential.project_id}".`);
