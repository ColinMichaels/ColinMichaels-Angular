try {
  const { readFirebaseServiceAccountFromEnv } = await import('./firebase-service-account.mjs');
  const credential = readFirebaseServiceAccountFromEnv();

  console.log(`Firebase service account JSON is valid for project "${credential.project_id}".`);
} catch (error) {
  console.error(error.message);
  process.exit(1);
}
