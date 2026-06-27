try {
  const { readFirebaseServiceAccountFromEnv } = await import('./firebase-service-account.mjs');
  readFirebaseServiceAccountFromEnv();

  console.log('Firebase service account JSON is valid.');
} catch (error) {
  console.error(error.message);
  process.exit(1);
}
