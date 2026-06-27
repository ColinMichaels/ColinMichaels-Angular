# Environment and Secrets Setup (GitHub Actions)

This project builds Angular environment files during CI from GitHub Actions settings, not from committed local secrets.

## Required GitHub Variables

Add these under `Settings -> Secrets and variables -> Actions -> Variables` for repository-wide access, or add them to each GitHub Environment used by the workflows.

| Name | Description | Example Value |
| --- | --- | --- |
| `APP_TITLE` | App title shown in the UI. | `Colin Michaels - Production` |
| `APP_API_URL` | Backend API base URL used by the frontend. | `https://api.example.com` |
| `FIREBASE_API_KEY` | Firebase Web API key from Firebase project settings. | `example_firebase_web_api_key` |
| `FIREBASE_AUTH_DOMAIN` | Firebase Auth domain for the project. | `your-project.firebaseapp.com` |
| `FIREBASE_DATABASE_URL` | Firebase Realtime Database URL. | `https://your-project-default-rtdb.firebaseio.com/` |
| `FIREBASE_PROJECT_ID` | Firebase project id used by SDK and deploy. | `your-project` |
| `FIREBASE_STORAGE_BUCKET` | Firebase storage bucket host. | `your-project.firebasestorage.app` |
| `FIREBASE_MESSAGING_SENDER_ID` | Firebase messaging sender id. | `123456789012` |
| `FIREBASE_APP_ID` | Firebase web app id. | `1:123456789012:web:abcdef1234567890` |
| `FIREBASE_MEASUREMENT_ID` | GA4 measurement id for Firebase Analytics. | `G-ABCDEFGH12` |

## Required GitHub Secrets

Add these under `Settings -> Secrets and variables -> Actions -> Secrets` for repository-wide access, or add them to each GitHub Environment used by the workflows.

| Name                                     | Description                                                                                                                                                       | Example Value                                                |
|------------------------------------------|-------------------------------------------------------------------------------------------------------------------------------------------------------------------|--------------------------------------------------------------|
| `OPENAI_API_KEY`                         | API key used by the legacy browser AI chat service. CMS AI uses a Firebase Functions secret with the same name instead of this browser environment value.         | `example_openai_api_key_value`                               |
| `OPEN_WEATHER_MAP_API_KEY`               | API key used by weather data calls.                                                                                                                               | `xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx`                           |
| `FIREBASE_SERVICE_ACCOUNT_COLINMICHAELS` | Raw Firebase service account JSON used by GitHub Actions deploy jobs. The workflows validate this JSON and write it to a temporary ADC file for the Firebase CLI. | `{"type":"service_account","project_id":"your-project",...}` |

## Optional Compatibility Keys

Workflows support fallbacks for legacy names:

- `API_URL` (legacy fallback for `APP_API_URL`)
- `APP_TITLE`/`APP_API_URL` can be provided as either Variables or Secrets
- `FIREBASE_SERVICE_ACCOUNT` can be used as fallback for Firebase Hosting deploy workflows

## Firebase Hosting Workflows

Hosting deploys are intentionally split by branch target:

- Pull requests targeting `dev` run `.github/workflows/firebase-hosting-pull-request.yml` and deploy only to a preview channel named `pr-<number>`.
- Merged pull requests targeting `master` run `.github/workflows/firebase-hosting-merge.yml`, deploy Firebase Functions, then deploy Firebase Hosting production with `channelId: live`.
- `.github/workflows/firebase_deployment_workflow.yml` remains a manual production deploy override for Firebase Functions and Hosting.

The dev PR workflow uses the GitHub Environment named `preview`. If CI reports every generated environment variable as missing, the values are probably stored only under the `production` GitHub Environment. Copy the required variables and secrets into `preview`, or move non-sensitive build values to repository-level Actions variables/secrets.

All hosting workflows install with `npm ci`, generate Angular environment files with `npm run generate:env`, build with `npm run build`, and use Node `22.22.3` to match the repository engine requirement.

Firebase CLI deploy jobs write the raw `FIREBASE_SERVICE_ACCOUNT_COLINMICHAELS` or `FIREBASE_SERVICE_ACCOUNT` JSON secret to a temporary credentials file under `$RUNNER_TEMP`. The deploy helper activates that key with `gcloud auth activate-service-account`, prints the active account for diagnostics, verifies that gcloud can mint an access token, clears any inherited `FIREBASE_TOKEN`, and then lets `firebase-tools@14` authenticate through `GOOGLE_APPLICATION_CREDENTIALS`. Keep the secret value as the full raw JSON content, not a path, filename, or base64 wrapper.

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

## Firebase Functions Secrets

CMS AI metadata and thumbnail generation runs server-side in Firebase Functions. Set the OpenAI key as a Functions secret before deploying:

```bash
firebase functions:secrets:set OPENAI_API_KEY
firebase deploy --only functions,firestore,database,storage
```

The public homepage YouTube feed also runs through Firebase Functions so the YouTube Data API key is not bundled into Angular:

```bash
firebase functions:secrets:set YOUTUBE_API_KEY
```

Use a server-side YouTube Data API key for `YOUTUBE_API_KEY`:

- Enable API restriction for `YouTube Data API v3`.
- Do not use HTTP referrer application restrictions for this key. Firebase Functions calls YouTube server-to-server, so Google receives an empty referer and returns `Requests from referer <empty> are blocked.`
- For local emulator testing, use an unrestricted application key limited by API restriction only.
- For deployed production, IP address restrictions only work if Functions egress is routed through a static IP, for example through VPC connector plus Cloud NAT. Otherwise keep application restrictions unset and rely on API restriction plus Secret Manager.

For local Functions emulator runs, add the same key name to ignored local secrets:

```bash
printf '\nYOUTUBE_API_KEY=your_youtube_data_api_key\n' >> functions/.secret.local
npm run serve:functions
```

`npm start` uses `src/environments/environment.local.ts`, which points callable Functions to `127.0.0.1:5001`. Keep the Functions emulator running beside Angular during local development. If Angular calls `https://us-east1-colinmichaels.cloudfunctions.net/...` from `http://localhost:4200`, it is using deployed production Functions instead of the local emulator.

For local YouTube feed testing, do not run bare `firebase emulators:start`. That starts the Hosting emulator too, which triggers Firebase Hosting's Angular framework preview path. This app is on Angular 22, while that preview path currently reports support for Angular 16-19 and may shut down with only `Error: An unexpected error has occurred.` in `firebase-debug.log`.

Use one of these instead:

```bash
npm run serve:functions
npm run serve:emulators
```

`getLatestYouTubeVideos` is a Firebase callable Function, so loading it directly in a browser sends `GET` and will log `Request has invalid method. GET`. Use the Angular app or the browser-test HTTP wrapper instead:

```text
http://127.0.0.1:5001/colinmichaels/us-east1/getLatestYouTubeVideosHttp
http://127.0.0.1:5001/colinmichaels/us-east1/getLatestYouTubeVideosHttp?maxResults=3
```

Optional runtime params:

- `OPENAI_TEXT_MODEL`, default `gpt-5.5`
- `OPENAI_IMAGE_MODEL`, default `gpt-image-2`
- `YOUTUBE_CHANNEL_ID`, required for the homepage latest videos feed

## First Gen 2 Functions Deploy

Cloud Run Functions require Cloud Build, Artifact Registry, Cloud Run, Secret Manager, and Compute Engine project setup. If every Function fails during creation with `Could not build the function due to a missing permission on the build service account`, enable the required APIs and grant the default Compute Engine service account the Cloud Build builder role.

The Firebase CLI also checks Firebase Extensions during deploy. If deploy fails with `firebaseextensions.googleapis.com ... instances ... HTTP Error: 403, The caller does not have permission`, grant the deploy service account the Firebase Extensions Viewer role so it can list extension instances.

Cloud Functions deploys also require the deploy caller to act as the runtime service account. If deploy fails with `Caller is missing permission 'iam.serviceaccounts.actAs' on service account ...-compute@developer.gserviceaccount.com`, grant the deploy service account `roles/iam.serviceAccountUser` on the default Compute Engine service account.

If browser calls fail as CORS errors but an `OPTIONS` probe returns `403 Forbidden` from Google Frontend with no `Access-Control-Allow-Origin`, the Gen 2 Function's underlying Cloud Run service is private. The source sets public invokers for browser-facing Functions, but the deployed services may need public Cloud Run invoker bindings after a first deploy or failed IAM update.

For this Firebase project:

```bash
PROJECT_ID=colinmichaels
PROJECT_NUMBER=695739708994
COMPUTE_SERVICE_ACCOUNT="${PROJECT_NUMBER}-compute@developer.gserviceaccount.com"
DEPLOY_SERVICE_ACCOUNT="<client_email-from-service-account-json>"

gcloud services enable \
  artifactregistry.googleapis.com \
  cloudbuild.googleapis.com \
  cloudfunctions.googleapis.com \
  compute.googleapis.com \
  eventarc.googleapis.com \
  run.googleapis.com \
  secretmanager.googleapis.com \
  --project "$PROJECT_ID"

gcloud projects add-iam-policy-binding "$PROJECT_ID" \
  --member "serviceAccount:${COMPUTE_SERVICE_ACCOUNT}" \
  --role "roles/cloudbuild.builds.builder"

gcloud projects add-iam-policy-binding "$PROJECT_ID" \
  --member "serviceAccount:${DEPLOY_SERVICE_ACCOUNT}" \
  --role "roles/firebaseextensions.viewer"

gcloud iam service-accounts add-iam-policy-binding "$COMPUTE_SERVICE_ACCOUNT" \
  --member "serviceAccount:${DEPLOY_SERVICE_ACCOUNT}" \
  --role "roles/iam.serviceAccountUser" \
  --project "$PROJECT_ID"

gcloud projects add-iam-policy-binding "$PROJECT_ID" \
  --member "serviceAccount:${DEPLOY_SERVICE_ACCOUNT}" \
  --role "roles/run.admin"
```

Replace `DEPLOY_SERVICE_ACCOUNT` with the `client_email` from the service account JSON stored in the GitHub secret `FIREBASE_SERVICE_ACCOUNT_COLINMICHAELS` or `FIREBASE_SERVICE_ACCOUNT`. If the service account does not exist yet, create it first:

```bash
PROJECT_ID=colinmichaels

gcloud iam service-accounts create firebase-deploy \
  --display-name "Firebase GitHub deploy" \
  --project "$PROJECT_ID"

DEPLOY_SERVICE_ACCOUNT="firebase-deploy@${PROJECT_ID}.iam.gserviceaccount.com"
```

After creating a new deploy service account, grant the deploy roles it needs and generate a new JSON key for the GitHub secret.

To repair already-deployed browser-facing Gen 2 Functions that are returning unauthenticated `403` responses:

```bash
PROJECT_ID=colinmichaels
REGION=us-east1

for SERVICE in \
  getlatestyoutubevideos \
  getlatestyoutubevideoshttp \
  generateblogmetadata \
  generateandstoreblogthumbnail \
  renderseohtml
do
  gcloud run services add-iam-policy-binding "$SERVICE" \
    --project "$PROJECT_ID" \
    --region "$REGION" \
    --member "allUsers" \
    --role "roles/run.invoker"
done
```

Wait a few minutes after enabling APIs or changing IAM, then rerun the Functions deploy.

## Admin Claims

Admin routes and CMS writes require a Firebase Auth custom claim. Set the initial admin claim from a trusted shell:

```bash
npm --prefix functions run set-admin -- --email user@example.com
```

Grant or revoke named roles for future admin sections:

```bash
npm --prefix functions run set-admin -- --email user@example.com --role contentEditor
npm --prefix functions run set-admin -- --email user@example.com --role contentEditor --revoke
```

Supported admin claims:

- `admin: true`
- `cmsAdmin: true`
- `roles.admin: true`

Google sign-in must be enabled in Firebase Authentication before the login page can use a Gmail account. Add production and local development domains under Firebase Authentication authorized domains.
