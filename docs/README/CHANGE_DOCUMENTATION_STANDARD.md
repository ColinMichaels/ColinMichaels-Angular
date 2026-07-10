# Change Documentation and Pull Request Standard

## Purpose

Every repository update should be as reviewable and operationally complete as [PR #194](https://github.com/ColinMichaels/ColinMichaels-Angular/pull/194). A reviewer should understand what changed, why it changed, how it affects users and systems, how it was validated, what must be deployed, and what remains intentionally unfinished without reconstructing that context from the diff.

This document is the durable source of truth for commit format, pull request parameters, documentation depth, and validation reporting. The reusable PR body is stored at `.github/pull_request_template.md`.

## Commit Format

Use one logical commit per coherent change whenever practical.

### Subject

- Write an imperative, lowercase subject that describes the outcome.
- Keep the subject concise, preferably 72 characters or fewer.
- Do not end the subject with a period.
- Avoid vague subjects such as `updates`, `fix stuff`, or `changes`.

Examples:

```text
add publishing calendar and streamline site operations
use header as the single live search input
document commit and pull request standards
```

### Optional body

Add a commit body when the change has non-obvious risk, migration behavior, data implications, or deployment requirements. Use this compact structure:

```text
Why:
- <problem or request>

Changes:
- <important implementation detail>

Validation:
- <command or focused behavior check>

Deployment:
- <required action or "none">
```

Detailed feature inventories belong in architecture documentation and the PR description rather than an oversized commit message.

## Branch and Pull Request Parameters

Normal feature and fix work should use these defaults unless the task explicitly requires another target:

| Parameter | Default | Reason |
| --- | --- | --- |
| Repository | `ColinMichaels/ColinMichaels-Angular` | Canonical GitHub repository |
| Base branch | `dev` | Starts the Firebase dev PR preview workflow |
| Head branch | Current scoped feature branch | Keeps work isolated and reviewable |
| Draft | `true` | Allows preview and review before merge readiness |
| Maintainer edits | `true` | Allows authorized fixes on the PR branch |
| Assignee | `ColinMichaels` | Keeps ownership visible |
| PR title | Concise summary of the full diff | Matches the review scope rather than one file |

Use `master` only for an explicitly authorized production/release PR. Do not silently retarget an active PR.

Pushing another commit to an open PR whose base is `dev` produces a `synchronize` event. The Firebase preview workflow evaluates the entire PR diff and deploys the scopes detected by `.github/scripts/detect-firebase-deploy-scope.sh`.

## Required PR Information

Use `.github/pull_request_template.md` and preserve every applicable section:

1. **Summary** — concrete outcomes, led by user-visible behavior.
2. **Why** — the request, defect, or operational need.
3. **Detailed Changes** — grouped UI, architecture, data, security, and service work.
4. **Impact** — effects on users, administrators, developers, accessibility, performance, and data.
5. **Documentation** — architecture docs, component inventory, migration notes, roadmap, and changelog.
6. **Validation** — exact commands, test counts, routes, viewport sizes, interactions, and console results.
7. **Known Baselines and Limitations** — quantified pre-existing failures and intentionally deferred work.
8. **Deployment and Rollback** — Hosting, Functions, rules, environment, provider, migration, and rollback needs.
9. **Follow-up Work** — work deliberately excluded from the current scope.

Never report a failing command as passing. If a repository-wide check fails for pre-existing reasons, report the exact count, confirm whether changed files are involved, and include the focused checks used for the changed scope.

## Documentation Requirements

Update documentation in the same commit as the behavior it describes.

- User-visible or operational changes: update `docs/CHANGELOG.md`.
- Architectural changes: update or create the relevant file under `docs/ARCHITECTURE`.
- New reusable components: update the applicable component inventory.
- Data, route, or workflow changes: include migration and rollback notes.
- Deferred integrations: record them in the relevant architecture document or roadmap.
- Contributor-process changes: update this standard, `AGENTS.md`, and the documentation index.

## Validation Reporting

The minimum repository checks remain:

```bash
npm run build
npm run lint
```

Add focused tests and rendered checks proportional to risk. PR validation should state:

- the exact commands run and whether each passed or failed;
- focused test file names or test counts;
- routes and interactions exercised;
- desktop and mobile viewport sizes for responsive UI changes;
- browser console status;
- build warnings that remain relevant;
- the quantified legacy baseline for any failing repository-wide check.

## Pre-Push Checklist

Before committing and pushing:

1. Confirm `git status -sb` contains only the intended scope.
2. Review `git diff` and run `git diff --check`.
3. Run required and risk-proportional validation.
4. Update documentation and changelog entries.
5. Stage only intended files.
6. Create a concise, outcome-oriented commit.
7. Push the current feature branch.
8. Create or update a draft PR against `dev` with the full template.
9. Assign `ColinMichaels` and verify the preview workflow starts.

## Reference Example

[PR #194](https://github.com/ColinMichaels/ColinMichaels-Angular/pull/194) established the expected level of detail: feature summary, social publishing boundaries, admin/public UI changes, documentation inventory, exact validation, existing lint baseline, and deployment requirements. Future PRs may be smaller, but they should retain the same completeness for every applicable section.
