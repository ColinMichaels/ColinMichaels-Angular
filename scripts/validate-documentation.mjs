import {execFileSync} from 'node:child_process';
import {existsSync, readFileSync} from 'node:fs';
import {dirname, extname, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';

const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const errors = [];

function readRepositoryFile(path) {
  return readFileSync(resolve(repositoryRoot, path), 'utf8');
}

function trackedMarkdownFiles() {
  const output = execFileSync('git', ['ls-files', '*.md'], {
    cwd: repositoryRoot,
    encoding: 'utf8',
  }).trim();

  return output ? output.split('\n') : [];
}

function localLinkTarget(rawTarget) {
  const target = rawTarget.trim().replace(/^<|>$/g, '');

  if (
    !target
    || target.startsWith('#')
    || /^(?:https?:|mailto:|tel:|data:|app:)/i.test(target)
    || /^(?:URL|ROUTE|PATH)$/i.test(target)
  ) {
    return null;
  }

  const withoutTitle = target.replace(/\s+["'][^"']*["']$/, '');
  const withoutQueryOrFragment = withoutTitle.split('#', 1)[0].split('?', 1)[0];

  try {
    return decodeURIComponent(withoutQueryOrFragment);
  } catch {
    return withoutQueryOrFragment;
  }
}

function validateLocalLinks(files) {
  const markdownLink = /\[[^\]]*\]\(([^)]+)\)/g;

  for (const file of files) {
    const content = readRepositoryFile(file);
    let match;

    while ((match = markdownLink.exec(content)) !== null) {
      const target = localLinkTarget(match[1]);

      if (!target) {
        continue;
      }

      const absoluteTarget = resolve(repositoryRoot, dirname(file), target);

      if (!existsSync(absoluteTarget)) {
        const line = content.slice(0, match.index).split('\n').length;
        errors.push(`${file}:${line} links to missing local target ${match[1]}`);
      }
    }
  }
}

function validateArchitectureIndex(files) {
  const index = readRepositoryFile('docs/README/INDEX.md');
  const architectureFiles = files.filter(file => (
    file.startsWith('docs/ARCHITECTURE/') && extname(file) === '.md'
  ));

  for (const file of architectureFiles) {
    const basename = file.slice('docs/ARCHITECTURE/'.length);

    if (!index.includes(`../ARCHITECTURE/${basename}`)) {
      errors.push(`docs/README/INDEX.md does not list ${file}`);
    }
  }
}

function validateStatusAuthorities() {
  const rootReadme = readRepositoryFile('README.md');
  const rootActionPlan = readRepositoryFile('ACTION-PLAN.md');
  const rootAudit = readRepositoryFile('FULL-AUDIT-REPORT.md');
  const techDebt = readRepositoryFile('docs/TODOS/TECH_DEBT.md');
  const roadmap = readRepositoryFile('docs/FUTURE_FEATURES/ROADMAP.md');

  if (!rootReadme.includes('docs/FUTURE_FEATURES/ROADMAP.md')) {
    errors.push('README.md must link to the active roadmap');
  }

  if (!rootActionPlan.startsWith('# Historical SEO Action Plan')) {
    errors.push('ACTION-PLAN.md must remain explicitly labeled as a historical snapshot');
  }

  if (!rootAudit.includes('> Historical baseline:')) {
    errors.push('FULL-AUDIT-REPORT.md must remain explicitly labeled as a historical baseline');
  }

  if (!techDebt.startsWith('# Tech Debt Completion Log')) {
    errors.push('docs/TODOS/TECH_DEBT.md must not present the completed plan as an active TODO list');
  }

  const updatedMatch = roadmap.match(/^Updated ([A-Z][a-z]+ \d{1,2}, \d{4})\./m);

  if (!updatedMatch) {
    errors.push('The active roadmap must include an "Updated Month D, YYYY." review date');
    return;
  }

  const reviewedAt = new Date(`${updatedMatch[1]} 00:00:00 UTC`);
  const ageDays = (Date.now() - reviewedAt.getTime()) / 86_400_000;
  const maximumAgeDays = Number(process.env['DOCS_MAX_ROADMAP_AGE_DAYS'] ?? 120);

  if (!Number.isFinite(reviewedAt.getTime()) || ageDays > maximumAgeDays) {
    errors.push(`The active roadmap review date is older than ${maximumAgeDays} days`);
  }
}

const markdownFiles = trackedMarkdownFiles();

validateLocalLinks(markdownFiles);
validateArchitectureIndex(markdownFiles);
validateStatusAuthorities();

if (errors.length > 0) {
  console.error(`Documentation validation failed with ${errors.length} issue(s):`);
  for (const error of errors) {
    console.error(`- ${error}`);
  }
  process.exitCode = 1;
} else {
  console.log(`Documentation validation passed for ${markdownFiles.length} tracked Markdown files.`);
}
