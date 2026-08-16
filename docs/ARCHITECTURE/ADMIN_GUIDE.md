# Role-Aware Admin Guide

## Outcome

`/admin/guide` is the searchable operating manual for the protected site administration experience. It gives each signed-in operator direct links and task instructions without exposing the names, search matches, result counts, or destinations of workflows their Firebase role cannot access.

The guide documents current application behavior. It does not replace route guards, Firebase custom claims, Functions authorization, or Security Rules.

## Runtime Shape

`AdminGuidePageComponent` is a lazy-loaded standalone Angular surface inside `AdminShellComponent`. The route accepts `ADMIN_CONSOLE_ROLES`, while the component obtains the current token-backed profile from `AuthService.getCurrentUserProfile()`.

The typed content source is `admin-guide.content.ts`:

- `ADMIN_GUIDE_ENTRIES` stores task title, summary, keywords, ordered steps, direct routes, feature category, and allowed role group.
- `ADMIN_GUIDE_CATEGORIES` controls the in-page information architecture.
- `searchAdminGuideEntries()` applies role filtering before matching any user query.
- `AdminGuideEntry` and related interfaces keep links, steps, roles, and stable URL fragments explicit.

No second Markdown corpus is loaded at runtime. The operator copy stays close to the route and role contracts it explains, while the reusable maintenance skill tells future contributors how to keep it current.

The visual specification is preserved at `docs/design/admin-guide-concept.png`. The implementation follows its zinc-black surfaces, cyan action color, square borders, compact in-guide rail, long-form reading pane, and restrained control density while reusing the actual shell rather than duplicating concept chrome.

## Role Filtering

Entries reuse the shared access arrays from `user-account.model.ts`:

| Access group                   | Visible guide scope                                                                                                                                        |
|--------------------------------|------------------------------------------------------------------------------------------------------------------------------------------------------------|
| `ADMIN_CONSOLE_ROLES`          | Shared shell, environment awareness, and Overview                                                                                                          |
| `CMS_ACCESS_ROLES`             | Posts, evidence/discovery/trust review, Bulk Editor, Calendar, Social Connections, Authors, Submissions, Comments, Homepage, Topics, and Recommended Links |
| `MEDIA_LIBRARY_ACCESS_ROLES`   | Media Library workflows                                                                                                                                    |
| `USER_MANAGEMENT_ACCESS_ROLES` | Firebase Auth access, user preview, and custom-role administration                                                                                         |

Filtering occurs before search, category grouping, Common tasks, table-of-contents rendering, and result counts. A restricted entry therefore cannot be discovered by guessing its title or keywords. `admin` appears in every privileged access constant and receives the complete guide; `viewer` receives only the shared getting-started instructions.

This presentation boundary mirrors existing permissions but is not their enforcement source. New mutating workflows still require corresponding route, backend, and Firebase rule authorization.

## Search, Links, And Interaction

Search normalizes case and punctuation, tokenizes the query, and requires every query token to appear somewhere in the entry's title, summary, keywords, steps, step-link labels, or related-link labels.

Each entry has a stable fragment such as `#schedule-a-release`. Desktop users receive a sticky categorized contents rail, while smaller screens receive a grouped jump menu. Fragment links use Angular Router anchor scrolling and remain shareable. Copy-link controls place the absolute fragment URL on the clipboard and announce success visually. Direct action links route to the actual protected feature rather than a generic admin landing page.

Pressing `/` outside a text-editing control focuses guide search. Search has a labeled clear action, live result summary, and an accessible empty state.

## Component And Content Inventory

- `AdminGuidePageComponent` owns role projection, search state, fragment selection, clipboard feedback, desktop contents, mobile jump navigation, and rendered instructions.
- `admin-guide.content.ts` owns all searchable operator instructions and pure role/search functions, including the CMS post editor's synchronized WYSIWYG/Production Preview/JSON workflow, heading hierarchy and table-of-contents warnings, preview accessibility controls, the advisory Discovery & Trust review for usable references/contextual next reads/supporting evidence, bounded list nesting and Standard/Step sequence presentation, optional bounded image sizing, two-to-twenty-image Slideshow/Grid/Mosaic galleries, one exact YouTube companion-video selection, keyboard lightbox review, list/unsupported-block preservation, owner-scoped recovery, route-leave warning, stale-revision/duplicate-slug recovery, trusted publishing retries, atomic Draft Preview behavior, and signature-validated responsive image finalization under the stable `#create-and-publish-a-post` entry. The separate `#review-article-evidence` entry documents both read-only Posts queues, published-first triage, required
  evidence/source work, advisory contextual/artifact opportunities, and individual evidence/disclosure review. These post-authoring instructions remain limited to `CMS_ACCESS_ROLES`; role-filtered search tests prove `contentEditor` access and `viewer`/`mediaManager` exclusion. `#manage-daily-discovery-question-sets` documents future-draft reader preview and its no-live-write/no-points
  boundary alongside upload, validation, and guarded save behavior. `#review-public-submissions` documents the protected inbox, trusted status mutations, retained archive/reject states, SMTP-backed responses, and the distinction between a failed alert and an accepted form. `#manage-user-roles` covers disable/restore, typed Auth deletion, user-view limits, and least-privilege claims. The
  existing `#upload-and-reuse-media` entry also distinguishes reversible Media Library status deletion from the role-restricted, reference-first canonical object-deletion backend boundary.
- `admin-guide.models.ts` owns the typed content contract.
- `admin-guide.content.spec.ts` covers role projections, full-text matching, and unauthorized-search exclusion.
- `admin-guide-page.component.spec.ts` covers rendered role filtering and interactive search.
- `admin-navigation.config.ts` exposes Admin Guide under Workspace and supplies the shell/browser page title.

## Maintenance Skill

The checked-in skill source is `agents/skills/update-admin-guide` and the working installation is `$CODEX_HOME/skills/update-admin-guide`. Invoke `$update-admin-guide` after a blog or admin feature changes routes, permissions, labels, states, workflow steps, limitations, or operator-facing controls.

The skill requires source inspection, role/backend reconciliation, focused negative permission tests, project documentation, build/lint, and rendered desktop/mobile verification. It prohibits documenting planned behavior as available.

## Migration And Rollback

This feature adds one protected route and static client content. It does not change Firebase data, indexes, Functions, Rules, Storage, secrets, or existing admin URLs.

Deployment requires only the Angular Hosting artifact. Rollback can remove the Guide navigation item and route, then remove the feature folder and checked-in skill. Existing feature routes and data remain unaffected. Previously shared `/admin/guide#...` URLs will stop resolving after rollback; no redirect is required because the guide is authenticated operational documentation rather than a public canonical route.
