import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {dirname, join} from 'node:path';
import {fileURLToPath} from 'node:url';
import test from 'node:test';

const script = fileURLToPath(new URL('../.github/scripts/detect-firebase-deploy-scope.sh', import.meta.url));

for (const [file, hosting, functions, preview = false] of [
  ['.postcssrc.json', true, true],
  ['scripts/generate-tailwind-entry.mjs', true, true],
  ['src/styles/tailwind.css', true, true],
  ['tailwind.config.js', true, true],
  ['package-lock.json', true, true],
  ['functions/package-lock.json', false, true],
  ['docs/CHANGELOG.md', false, false],
  ['.github/workflows/firebase-hosting-pull-request.yml', false, false, true],
  ['.github/scripts/create-firebase-preview-config.mjs', false, false, true],
  ['scripts/verify-firebase-preview.mjs', false, false, true],
]) {
  test(`${file} selects the matching Firebase build scope`, () => {
    const directory = mkdtempSync(join(tmpdir(), 'firebase-scope-'));
    try {
      execFileSync('git', ['init', '--quiet'], {cwd: directory});
      mkdirSync(dirname(join(directory, file)), {recursive: true});
      writeFileSync(join(directory, file), '{}\n');
      execFileSync('git', ['add', '--', file], {cwd: directory});
      const output = join(directory, 'output');
      execFileSync('bash', [script], {
        cwd: directory,
        env: {
          ...process.env,
          BASE_SHA: '', HEAD_SHA: '',
          FORCE_HOSTING: 'false', FORCE_FUNCTIONS: 'false',
          FORCE_RULES: 'false', FORCE_STORAGE_CORS: 'false',
          GITHUB_OUTPUT: output,
          GITHUB_STEP_SUMMARY: join(directory, 'summary'),
        },
      });
      const result = readFileSync(output, 'utf8');
      assert.ok(result.includes(`hosting_changed=${hosting}\n`));
      assert.ok(result.includes(`functions_deploy_needed=${functions}\n`));
      assert.ok(result.includes('rules_changed=false\n'));
      assert.ok(result.includes('storage_cors_changed=false\n'));
      assert.ok(result.includes(`preview_pipeline_changed=${preview}\n`));
    } finally {
      rmSync(directory, {recursive: true, force: true});
    }
  });
}
