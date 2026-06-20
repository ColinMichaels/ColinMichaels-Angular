#!/usr/bin/env bash
set -euo pipefail

base_sha="${BASE_SHA:-${1:-}}"
head_sha="${HEAD_SHA:-${2:-HEAD}}"

if [ -n "$base_sha" ]; then
  changed_files="$(git diff --name-only "$base_sha" "$head_sha")"
else
  changed_files="$(git ls-files)"
fi

hosting_changed=false
functions_changed=false
seo_template_changed=false

while IFS= read -r file; do
  [ -z "$file" ] && continue

  case "$file" in
    firebase.json|.firebaserc)
      hosting_changed=true
      functions_changed=true
      seo_template_changed=true
      ;;
    functions/**|functions/package.json|functions/package-lock.json)
      functions_changed=true
      ;;
    scripts/prepare-functions-seo.mjs)
      functions_changed=true
      seo_template_changed=true
      ;;
    scripts/generate-environment.mjs|angular.json|package.json|package-lock.json|tsconfig*.json|tailwind.config.*|postcss.config.*)
      hosting_changed=true
      seo_template_changed=true
      ;;
    src/assets/**|public/**)
      hosting_changed=true
      ;;
    src/**)
      hosting_changed=true
      seo_template_changed=true
      ;;
  esac
done <<< "$changed_files"

functions_deploy_needed=false
if [ "$functions_changed" = true ] || [ "$seo_template_changed" = true ]; then
  functions_deploy_needed=true
fi

if [ "${FORCE_HOSTING:-false}" = true ]; then
  hosting_changed=true
fi

if [ "${FORCE_FUNCTIONS:-false}" = true ]; then
  functions_changed=true
  functions_deploy_needed=true
fi

{
  echo "hosting_changed=$hosting_changed"
  echo "functions_changed=$functions_changed"
  echo "seo_template_changed=$seo_template_changed"
  echo "functions_deploy_needed=$functions_deploy_needed"
  echo "changed_files<<EOF"
  printf '%s\n' "$changed_files"
  echo "EOF"
} >> "$GITHUB_OUTPUT"

{
  echo "### Firebase deploy scope"
  echo ""
  echo "- Hosting changed: \`$hosting_changed\`"
  echo "- Functions source/config changed: \`$functions_changed\`"
  echo "- SEO HTML template may change: \`$seo_template_changed\`"
  echo "- Functions deploy needed: \`$functions_deploy_needed\`"
  echo ""
  echo "<details><summary>Changed files</summary>"
  echo ""
  echo '```'
  printf '%s\n' "$changed_files"
  echo '```'
  echo ""
  echo "</details>"
} >> "$GITHUB_STEP_SUMMARY"
