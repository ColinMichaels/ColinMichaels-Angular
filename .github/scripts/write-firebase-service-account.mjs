try {
  const {
    appendGitHubOutput,
    readFirebaseServiceAccountFromEnv,
    writeFirebaseServiceAccountCredentialsFile,
  } = await import('./firebase-service-account.mjs');

  const credential = readFirebaseServiceAccountFromEnv();
  const credentialsFilePath = writeFirebaseServiceAccountCredentialsFile(credential);

  appendGitHubOutput('credentials_file_path', credentialsFilePath);

  console.log('Firebase Application Default Credentials file created.');
} catch (error) {
  console.error(error.message);
  process.exit(1);
}
