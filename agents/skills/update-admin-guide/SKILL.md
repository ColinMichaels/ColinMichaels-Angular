---
name: update-admin-guide
description: Keep the ColinMichaels.com role-aware Admin Guide synchronized with blog and admin features. Use after adding, changing, renaming, rerouting, or removing an admin/CMS workflow, permission, navigation destination, control label, publishing state, or operational limitation; also use when auditing whether `/admin/guide` accurately documents the current application.
---

# Update Admin Guide

Maintain the searchable in-app guide as part of the feature change. Document only behavior verified in the current source and expose each entry to exactly the roles that can use its destination.

## Workflow

1. Read the repository `AGENTS.md` and `docs/README/CHANGE_DOCUMENTATION_STANDARD.md` completely.
2. Read [references/project-map.md](references/project-map.md) for the guide contract, role matrix, and file locations.
3. Inspect the feature diff and its surrounding implementation. Identify:
  - route and navigation label;
  - route-role constant and backend/security enforcement;
  - visible control labels and supported states;
  - prerequisites, destructive boundaries, limitations, and deferred behavior;
  - links that should take an operator directly to the relevant tool.
4. Search the existing guide before adding content. Update the current entry when the workflow is an extension; add a new entry only when an operator would search for a distinct task.
5. Edit `src/app/admin/guide/admin-guide.content.ts`:
  - use a stable, descriptive fragment ID;
  - reuse the same exported role constant as the protected route;
  - write a task-oriented title, concise summary, search synonyms, ordered steps, and real Angular routes;
  - describe current behavior, not planned behavior;
  - state safety or delivery limitations where an operator could otherwise make a wrong assumption;
  - mark `featured` only for a high-frequency task that belongs in Common tasks.
6. Update navigation, page-title, route, or model code only when the feature itself changed those contracts. Do not create a documentation-only route alias.
7. Extend focused tests:
  - prove allowed roles can find the entry;
  - prove at least one unauthorized role cannot receive it, even through search;
  - cover new search terms, route titles, or shell navigation when they changed.
8. Update `src/app/admin/README.md`, the relevant `docs/ARCHITECTURE` document, `docs/README/INDEX.md` when adding a document, and `docs/CHANGELOG.md` in the same change.
9. Validate with the smallest focused test command first, then run the repository-required `npm run build` and `npm run lint`. For visible guide changes, verify `/admin/guide` on desktop and mobile, exercise search and fragment/copy links, check at least two materially different roles, and inspect the console.
10. Report the documented feature, roles, entry ID, direct routes, validation results, and any intentionally undocumented or deferred behavior.

## Content Rules

- Treat role filtering as an access boundary. Restricted entries, common-task links, table-of-contents links, search matches, and result counts must all be absent for unauthorized roles.
- Reuse `ADMIN_CONSOLE_ROLES`, `CMS_ACCESS_ROLES`, `MEDIA_LIBRARY_ACCESS_ROLES`, or `USER_MANAGEMENT_ACCESS_ROLES`. Add a narrower shared role constant only when the route and enforcement also use it.
- Never infer permission from a sidebar label alone. Confirm route data and the write boundary in Firebase Functions or Security Rules when the guide describes a mutation.
- Keep all searchable operator copy in the typed content source. Do not duplicate a second Markdown help corpus.
- Use exact UI labels and valid routes. Prefer direct destinations such as `/admin/cms/calendar` over generic instructions to “find the calendar.”
- Preserve fragment IDs after publication. If a rename is unavoidable, retain compatibility or document the migration.
- Keep steps short, sequential, and operational. Explain why only when it prevents a mistake.
- Do not advertise connector delivery, apply/publish actions, migrations, or destructive recovery that the implementation does not support.

## Completion Gate

Finish only when the guide content, role tests, direct links, project documentation, build, lint, and rendered interactions agree with the current feature. Quantify any pre-existing validation failure instead of reporting a failing command as passing.
