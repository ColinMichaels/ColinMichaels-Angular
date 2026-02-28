# Environment and Secrets Setup (GitHub Actions)

This project builds Angular environment files during CI from GitHub Actions settings, not from committed local secrets.

## Required GitHub Variables

Add these under: `Settings -> Secrets and variables -> Actions -> Variables`

| Name                           | Description                                                                          | Example Value                                          |
|--------------------------------|--------------------------------------------------------------------------------------|--------------------------------------------------------|
| `APP_TITLE`                    | App title shown in the UI.                                                           | `Colin Michaels - Production`                          |
| `APP_API_URL`                  | Backend proxy base URL used by the frontend (OpenAI/Weather now go through backend). | `https://us-east1-your-project.cloudfunctions.net/api` |
| `FIREBASE_API_KEY`             | Firebase Web API key from Firebase project settings.                                 | `example_firebase_web_api_key`                         |
| `FIREBASE_AUTH_DOMAIN`         | Firebase Auth domain for the project.                                                | `your-project.firebaseapp.com`                         |
| `FIREBASE_DATABASE_URL`        | Firebase Realtime Database URL.                                                      | `https://your-project-default-rtdb.firebaseio.com/`    |
| `FIREBASE_PROJECT_ID`          | Firebase project id used by SDK and deploy.                                          | `your-project`                                         |
| `FIREBASE_STORAGE_BUCKET`      | Firebase storage bucket host.                                                        | `your-project.firebasestorage.app`                     |
| `FIREBASE_MESSAGING_SENDER_ID` | Firebase messaging sender id.                                                        | `123456789012`                                         |
| `FIREBASE_APP_ID`              | Firebase web app id.                                                                 | `1:123456789012:web:abcdef1234567890`                  |
| `FIREBASE_MEASUREMENT_ID`      | GA4 measurement id for Firebase Analytics.                                           | `G-ABCDEFGH12`                                         |

## Required GitHub Secrets

Add these under: `Settings -> Secrets and variables -> Actions -> Secrets`

| Name | Description | Example Value |
| --- | --- | --- |
| `FIREBASE_SERVICE_ACCOUNT_COLINMICHAELS` | Firebase service account JSON used by GitHub Action deploy. | `{"type":"service_account","project_id":"your-project",...}` |

## Backend Function Secrets (Set In Firebase, Not Frontend CI)

Set these in Firebase Secret Manager for Cloud Functions:

- `OPENAI_API_KEY`
- `OPEN_WEATHER_MAP_API_KEY`

Example commands:

```bash
firebase functions:secrets:set OPENAI_API_KEY
firebase functions:secrets:set OPEN_WEATHER_MAP_API_KEY
firebase deploy --only functions
```

## Optional Compatibility Keys

Workflows support fallbacks for legacy names:

- `API_URL` (legacy fallback for `APP_API_URL`)
- `APP_TITLE`/`APP_API_URL` can be provided as either Variables or Secrets
- `FIREBASE_SERVICE_ACCOUNT` can be used as fallback for manual deploy workflow

## Local Development Files

- Keep local-only values in ignored files:
  - `src/environments/environment.local.ts`
  - `src/environments/.env.local`
- Do not commit those files.
- Use `src/environments/.env.example` as the safe template.

## CI Environment Generation

CI runs:

```bash
npm run generate:env
```

This script writes:

- `src/environments/environment.ts`
- `src/environments/environment.prod.ts`

Both are generated from CI environment values before `npm run build`.
No vendor API keys are written into frontend environment files.
