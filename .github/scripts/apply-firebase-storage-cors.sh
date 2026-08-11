#!/usr/bin/env bash
set -euo pipefail

cors_file="${FIREBASE_STORAGE_CORS_FILE:-storage.cors.json}"
bucket_name="${FIREBASE_STORAGE_BUCKET:-}"

if [ -z "$bucket_name" ]; then
  echo "FIREBASE_STORAGE_BUCKET is required." >&2
  exit 1
fi

bucket_name="${bucket_name#gs://}"
if [[ ! "$bucket_name" =~ ^[a-z0-9][a-z0-9._-]*[a-z0-9]$ ]] || [[ "$bucket_name" == */* ]]; then
  echo "FIREBASE_STORAGE_BUCKET must contain one valid bucket name." >&2
  exit 1
fi

if [ ! -f "$cors_file" ]; then
  echo "Firebase Storage CORS file not found: $cors_file" >&2
  exit 1
fi

if [ -z "${FIREBASE_PROJECT_ID:-}" ]; then
  echo "FIREBASE_PROJECT_ID is required." >&2
  exit 1
fi

if [ -z "${GOOGLE_APPLICATION_CREDENTIALS:-}" ]; then
  echo "GOOGLE_APPLICATION_CREDENTIALS is required." >&2
  exit 1
fi

node scripts/validate-firebase-storage-cors.mjs "$cors_file"

export CLOUDSDK_CORE_PROJECT="$FIREBASE_PROJECT_ID"
export GOOGLE_CLOUD_PROJECT="$FIREBASE_PROJECT_ID"
export GCLOUD_PROJECT="$FIREBASE_PROJECT_ID"
export CLOUDSDK_CONFIG="${RUNNER_TEMP:-/tmp}/gcloud-storage-cors"

mkdir -p "$CLOUDSDK_CONFIG"

gcloud auth activate-service-account \
  --key-file="$GOOGLE_APPLICATION_CREDENTIALS" \
  --project="$FIREBASE_PROJECT_ID"
gcloud config set project "$FIREBASE_PROJECT_ID"
gcloud auth print-access-token >/dev/null

bucket_url="gs://$bucket_name"
echo "Applying read-only browser CORS policy to $bucket_url."
gcloud storage buckets update "$bucket_url" --cors-file="$cors_file" --quiet

echo "Active bucket CORS configuration:"
gcloud storage buckets describe "$bucket_url" --format="default(cors_config)"
