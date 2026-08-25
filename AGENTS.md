# AGENTS.md

# ColinMichaels.com AI Agent Rules

This repository uses AI-assisted development with strict architectural and validation requirements.

## Primary Goals

- Preserve existing functionality
- Refactor instead of rewrite
- Modularize reusable systems
- Improve maintainability
- Maintain a professional public-facing UI
- Separate experimental systems from production systems

---

# Core Architecture

## Public Website

Purpose:

- portfolio
- blog
- media
- SEO
- personal brand

Must remain:

- fast
- responsive
- minimal
- professional

---

## Core OS Framework

The OS-style systems are considered reusable framework infrastructure.

These systems MUST be preserved and modularized when possible.

Examples:

- dock
- window manager
- terminal systems
- tooltip systems
- context menus
- desktop UI
- command systems

These belong under:

/src/app/core-os

NOT inside public website page logic.

---

## Labs / Experimental Systems

Experimental projects should be isolated into:
/labs
/archive
/playground

Do not remove experimental systems unless explicitly instructed.

---

# Development Rules

## Branch And PR Workflow

- Create a new dedicated `codex/<descriptive-work-slug>` branch from the latest verified `origin/dev` before starting each feature, fix, or release batch.
- Never implement directly on `dev` or continue unrelated work on a reused feature branch.
- If relevant uncommitted work already exists while `HEAD` still matches `origin/dev`, preserve it by creating the dedicated branch immediately; never reset or discard it to change branches.
- Keep each branch scoped to one coherent change, then open its pull request against `dev` as a draft unless the maintainer requests another target.
- Treat commit, push, pull-request creation, and deployment as separate actions. Do not infer permission for one from permission for another.

---

## Refactor Priority

Prefer:

- extraction
- modularization
- cleanup
- simplification

Avoid:

- large rewrites
- destructive restructuring
- deleting legacy systems

---

## Component Rules

Shared reusable UI belongs in:
/shared

Feature-specific UI belongs in:
/features

OS framework UI belongs in:
/core-os

---

## Styling Rules

- TailwindCSS is primary styling system
- Angular standalone components preferred
- Avoid duplicated utility classes
- Use shared design tokens
- Preserve dark mode support

---

## Blog System Requirements

The blog system should support:

- Editor.js
- categories
- tags
- media embeds
- SEO metadata
- draft/publish states
- rich content blocks

---

## Validation Requirements

Before completing changes ALWAYS run:

- npm run build
- npm run lint

When possible:

- route verification
- responsive verification
- console error inspection

---

## Safety Rules

NEVER:

- delete routes without redirects
- delete components without archive review
- overwrite Firebase configs
- remove existing content without migration
- introduce breaking architecture changes without documentation

---

## Documentation Requirements

Major changes require updates to:

- architecture docs
- component inventory
- migration notes
- changelog

All commits and pull requests MUST follow:

- `/docs/README/CHANGE_DOCUMENTATION_STANDARD.md`
- `/.github/pull_request_template.md`

Required publishing behavior:

- Use concise, imperative commit subjects that describe the outcome.
- Keep behavior, architecture documentation, migration notes, and changelog updates in the same commit.
- PR descriptions must document what changed, why, user/developer impact, validation, known baselines, deployment/rollback requirements, and deferred follow-up work.
- Quantify pre-existing validation failures; never present a failing repository-wide command as passing.
- Feature PRs normally target `dev` as drafts, allow maintainer edits, and are assigned to `ColinMichaels` so the Firebase dev preview workflow can run.

---

## Agent Coordination

Specialized agents exist under:
/agents

Agents should follow their own scoped instructions while respecting this root document.

- Ensure consistent naming conventions across agents
- Regularly review and update agent instructions
- Collaborate on complex tasks to maintain coherence
- Maintain clear communication channels
- Adhere to project timelines and deadlines
