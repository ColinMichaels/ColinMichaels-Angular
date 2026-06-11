import {mkdirSync, writeFileSync} from 'node:fs';
import {dirname, resolve} from 'node:path';

const readEnv = (name) => (process.env[name] ?? '').trim();

const appTitle = readEnv('APP_TITLE');
const apiUrl = readEnv('APP_API_URL') || readEnv('API_URL');
const firebaseApiKey = readEnv('FIREBASE_API_KEY');
const firebaseAuthDomain = readEnv('FIREBASE_AUTH_DOMAIN');
const firebaseDatabaseUrl = readEnv('FIREBASE_DATABASE_URL');
const firebaseProjectId = readEnv('FIREBASE_PROJECT_ID');
const firebaseStorageBucket = readEnv('FIREBASE_STORAGE_BUCKET');
const firebaseMessagingSenderId = readEnv('FIREBASE_MESSAGING_SENDER_ID');
const firebaseAppId = readEnv('FIREBASE_APP_ID');
const firebaseMeasurementId = readEnv('FIREBASE_MEASUREMENT_ID');

const missing = [];
if (!appTitle) missing.push('APP_TITLE');
if (!apiUrl) missing.push('APP_API_URL (or API_URL)');
if (!firebaseApiKey) missing.push('FIREBASE_API_KEY');
if (!firebaseAuthDomain) missing.push('FIREBASE_AUTH_DOMAIN');
if (!firebaseDatabaseUrl) missing.push('FIREBASE_DATABASE_URL');
if (!firebaseProjectId) missing.push('FIREBASE_PROJECT_ID');
if (!firebaseStorageBucket) missing.push('FIREBASE_STORAGE_BUCKET');
if (!firebaseMessagingSenderId) missing.push('FIREBASE_MESSAGING_SENDER_ID');
if (!firebaseAppId) missing.push('FIREBASE_APP_ID');
if (!firebaseMeasurementId) missing.push('FIREBASE_MEASUREMENT_ID');

if (missing.length > 0) {
  console.error('Missing required environment variables:');
  missing.forEach((name) => console.error(`- ${name}`));
  process.exit(1);
}

const environmentConfig = {
  production: true,
  title: appTitle,
  apiUrl,
  firebaseConfig: {
    apiKey: firebaseApiKey,
    authDomain: firebaseAuthDomain,
    databaseURL: firebaseDatabaseUrl,
    projectId: firebaseProjectId,
    storageBucket: firebaseStorageBucket,
    messagingSenderId: firebaseMessagingSenderId,
    appId: firebaseAppId,
    measurementId: firebaseMeasurementId
  }
};

const serializedEnvironmentConfig = JSON.stringify(environmentConfig, null, 2).replace(
  /\n}$/,
  ',\n  "firebaseEmulators": undefined\n}'
);
const fileContent = `export const environment = ${serializedEnvironmentConfig};\n`;
const outputFiles = [
  resolve('src/environments/environment.ts'),
  resolve('src/environments/environment.prod.ts')
];

for (const filePath of outputFiles) {
  mkdirSync(dirname(filePath), {recursive: true});
  writeFileSync(filePath, fileContent, 'utf8');
}

console.log(`Generated ${outputFiles.length} environment file(s).`);
