#!/usr/bin/env bash
set -euo pipefail

: "${FIREBASE_PROJECT_ID:?FIREBASE_PROJECT_ID is required}"
: "${GOOGLE_APPLICATION_CREDENTIALS:?GOOGLE_APPLICATION_CREDENTIALS is required}"

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

firebase_access_token="$(gcloud auth print-access-token)"
if [ -z "$firebase_access_token" ]; then
  echo "gcloud did not return an access token for Firebase deploy." >&2
  exit 1
fi

npx --yes firebase-tools@14 deploy \
  "$@" \
  --project "$FIREBASE_PROJECT_ID" \
  --non-interactive \
  --token "$firebase_access_token"
