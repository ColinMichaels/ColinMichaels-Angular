#!/usr/bin/env bash
set -euo pipefail

event_name="${GITHUB_EVENT_NAME:-}"
force_functions=false

to_bool() {
  case "${1:-false}" in
    true|True|TRUE|1|yes|Yes|YES)
      printf 'true'
      ;;
    *)
      printf 'false'
      ;;
  esac
}

if [ "$event_name" = "workflow_dispatch" ]; then
  deploy_hosting="$(to_bool "${INPUT_DEPLOY_SITE:-false}")"
  deploy_functions="$(to_bool "${INPUT_DEPLOY_FUNCTIONS:-false}")"
  force_functions="$(to_bool "${INPUT_FORCE_FUNCTIONS:-false}")"
  deploy_rules="$(to_bool "${INPUT_DEPLOY_RULES:-false}")"

  if [ "$deploy_hosting" = true ]; then
    deploy_functions=true
  fi

  changed_files="manual production deploy"
else
  if [[ "${BASE_SHA:-}" =~ ^0+$ ]]; then
    unset BASE_SHA
  fi

  # shellcheck source=.github/scripts/detect-firebase-deploy-scope.sh
  source .github/scripts/detect-firebase-deploy-scope.sh

  deploy_hosting="$hosting_changed"
  deploy_functions="$functions_deploy_needed"
  deploy_rules="$rules_changed"
fi

if [ "$deploy_functions" = true ]; then
  # Deep links are served by renderSeoHtml, whose generated index shell points
  # at hashed Hosting assets. Keep the Function bundle and Hosting release in sync.
  deploy_hosting=true
fi

if [ "$force_functions" = true ] && [ "$deploy_functions" != true ]; then
  echo "force_functions requires a Functions deployment." >&2
  exit 1
fi

deploy_site_build=false
if [ "$deploy_hosting" = true ] || [ "$deploy_functions" = true ]; then
  deploy_site_build=true
fi

{
  echo "deploy_hosting=$deploy_hosting"
  echo "deploy_functions=$deploy_functions"
  echo "force_functions=$force_functions"
  echo "deploy_rules=$deploy_rules"
  echo "deploy_site_build=$deploy_site_build"
} >> "$GITHUB_OUTPUT"

{
  echo "### Firebase production deploy plan"
  echo ""
  echo "- Deploy Hosting: \`$deploy_hosting\`"
  echo "- Deploy Functions: \`$deploy_functions\`"
  echo "- Force-confirm Functions policy change: \`$force_functions\`"
  echo "- Deploy security rules: \`$deploy_rules\`"
  echo "- Build site assets: \`$deploy_site_build\`"
  echo ""
  echo "<details><summary>Scope source</summary>"
  echo ""
  echo '```'
  printf '%s\n' "${changed_files:-}"
  echo '```'
  echo ""
  echo "</details>"
} >> "$GITHUB_STEP_SUMMARY"
