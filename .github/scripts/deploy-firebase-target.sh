#!/usr/bin/env bash
set -euo pipefail

target="${1:-}"
only="${2:-}"

if [ -z "$target" ] || [ -z "$only" ]; then
  echo "Usage: deploy-firebase-target.sh <functions|hosting|rules> <firebase-only-targets>" >&2
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

export CLOUDSDK_CORE_PROJECT="$FIREBASE_PROJECT_ID"
export GOOGLE_CLOUD_PROJECT="$FIREBASE_PROJECT_ID"
export GCLOUD_PROJECT="$FIREBASE_PROJECT_ID"
export GCP_PROJECT="$FIREBASE_PROJECT_ID"
export CLOUDSDK_CONFIG="${RUNNER_TEMP:-/tmp}/gcloud"

mkdir -p "$CLOUDSDK_CONFIG"

gcloud auth activate-service-account \
  --key-file="$GOOGLE_APPLICATION_CREDENTIALS" \
  --project="$FIREBASE_PROJECT_ID"
gcloud config set project "$FIREBASE_PROJECT_ID"

active_account="$(gcloud auth list --filter=status:ACTIVE --format='value(account)')"
if [ -z "$active_account" ]; then
  echo "gcloud did not activate a service account." >&2
  exit 1
fi

echo "gcloud active account: $active_account"
gcloud auth print-access-token >/dev/null

config_path="${RUNNER_TEMP:-/tmp}/firebase-${target}.ci.json"
node .github/scripts/create-firebase-deploy-config.mjs "$target" "$config_path"

env -u FIREBASE_TOKEN npx --yes firebase-tools@14 deploy \
  --only "$only" \
  --config "$config_path" \
  --project "$FIREBASE_PROJECT_ID" \
  --non-interactive
