# Import-first blog editor

Status: locally implemented and tested; owner selected the Import desk direction, requested a feature-preservation and rollback record, and authorized publishing a draft pull request against `dev`. Production deployment remains a separate release action.

Baseline: `dbf659d6278672bd3d7d08126c453c3fc3381716` (verified `origin/dev` when this work began). Work branch: `codex/admin-import-workspace`.

## Behavior

New posts open at **Import / start** with package-folder import, JSON import, and blank writing choices. Successful imports show their source, document identity, status, and unsaved state, then open Edit. Package progress, errors, finalized-media warnings, duplicate-slug protection, and import operation locks keep their existing contracts. Existing posts open in Edit, and JSON replacement requires confirmation before changing the working document.

Edit keeps title, excerpt, and the existing Editor.js document together. The settings inspector has six named destinations rather than one long accordion column. Focus writing hides the inspector without destroying form controls or Editor.js. Smaller screens stack the inspector with direct Post settings and Back to article shortcuts, focus transfer, and no nested inspector scrollbar.

Review & publish captures and validates the current unsaved document. The public renderer and Discovery & Trust checklist receive those same blocks. Invalid JSON leaves the current editor available for correction. Local review does not save a canonical post or issue a public preview token. The saved-draft preview panel retains its separate issue/revoke operation. Existing `tab=post`, `tab=social`, and `tab=preview` links remain valid; `tab=import` applies only to new posts.

The action bar retains Draft, Scheduled, Published, and Archived with status-specific save labels. This is a freely navigable workspace, not a required-step wizard. Server validation remains authoritative.

## Preserved feature inventory

| Location | Features retained |
| --- | --- |
| Import / start | Package selection, JSON selection, blank start, media progress, import announcements and locks |
| Article | Title, excerpt, WYSIWYG, JSON, embedded Production Preview, images, every existing block tool, compatibility envelopes, reset, dirty tracking |
| Details | Author selection and inline author creation, slug, categories, tags, featured, Cat Corner and discovery flags |
| Media | Cover, background media, uploads, library selection, URL entry and image metadata |
| Evidence | Evidence basis, summary, source date, relationship/AI/synthetic-media disclosures, protected evidence-only save |
| Search | SEO title, description, keywords, canonical URL and social share image |
| Publish | All four statuses, publication time, timezone, announcement and early-reader controls, calendar access |
| Tools & recovery | JSON import/export, post state, distribution, recovery/compare/restore/discard, revision conflicts, first-save reconciliation, save-as-copy, AI suggestions, last-saved details |
| Social shares | Existing native platform composer, media and link settings, saved promotion plans |
| Review & publish | Current unsaved public rendering, theme/viewport/reader-text controls, checklist, field shortcuts, separate temporary draft preview |
| Action bar | Status, explicit save action, unsaved indicator, existing view/preview/delete operations |

### Finding a control that moved

| Previously found under | Current path | Visibility and state contract |
| --- | --- | --- |
| Header import buttons | New Post → Import / start; JSON replacement also in Tools & recovery | Package import remains new-post-only. JSON replacement on an existing post asks before replacing the working document. |
| Header JSON export | Tools & recovery → Export JSON | Same export handler; no canonical save required. |
| Post Details | Edit → title/excerpt on article; Post settings → Details for author/taxonomy | One original FormGroup; changing panels does not discard edits. |
| Cover Image / Post Images | Post settings → Media | Both cover and optional editorial/background media remain. |
| Evidence & Disclosures | Post settings → Evidence | Save evidence only remains separate from full article saving. |
| Search & Sharing | Post settings → Search | Existing SEO/share-card component and controls remain. |
| Publishing | Post settings → Publish; status also in bottom action bar | Draft, Scheduled, Published, Archived, announcement, and early-access controls remain. |
| Preview & SEO | Review & publish | Adds current unsaved rendering; temporary public preview still requires the existing saved-draft operation. |
| AI suggestions, Recovery & Conflicts, Last Saved, Distribution | Tools & recovery | Existing modules can still expand inside this panel. Conflict/error notices provide a direct recovery shortcut. |
| Social composer | Social shares workspace | Existing composer and its save/calendar actions remain. |
| View Post / View Preview / Delete Post | Bottom bar on desktop; More on mobile | Existing status/new-post/preview eligibility conditions still apply. |

Focus writing intentionally hides the inspector only while that mode is active. **Show settings** restores it; **Tools & recovery** or a review field shortcut also exits focus mode. At narrow widths, **Post settings** moves focus to the inspector and **Back to article** returns to the writing area. Hidden panels remain mounted. Permission restrictions and operation locks still apply: a control unavailable during import or for the current role is not a removed feature.

Source parity against the baseline confirms all **25 original `formControlName` names**, **11 original child component types**, and **23 distinct original click-handler expressions** remain in the extracted template. Status adds a form-bound radio representation alongside its existing select. These checks establish source retention; they do not prove every external integration or every data-dependent state works in production.

## Component inventory and boundaries

- `PostEditorComponent` remains the feature orchestrator and owner of the original form, mounted Editor.js instance, canonical save/delete services, recovery, and import lifecycle. Its template is extracted to `post-editor.component.html`; layout styles live in `post-editor.component.scss`.
- `CmsProductionPreviewComponent` is reused for the review workspace. Capturing blocks is read-only and serialized with the existing preview/import operation guards.
- Existing media, evidence, SEO, social, draft-preview, checklist, recovery, and control-module components remain in use. No route or block tool is removed.
- `AdminShellComponent` adds the `admin-controls` scope. `_admin-controls.scss` supplies shared dark native-control tokens and a separate light palette for Editor.js paper, block dropdowns, and nested menus. Native selects retain keyboard and operating-system behavior.
- Metadata dropdown keys are isolated before Editor.js document-capture handlers, without cancelling native option selection or Tab/Escape. This prevents stale article caret movement while changing a dropdown. Editor notifications sit above the fixed action bar.
- Queued Firestore hydration explicitly marks the OnPush view for checking, so a cold edit URL renders the loaded post without needing an extra user interaction.
- The role-aware guide keeps `create-and-publish-a-post` and CMS access-role constants. Search includes import-first, focus writing, and review terminology; unauthorized roles do not receive these entries.

## Migration, rollout, and rollback

No Firestore, Storage, author, block, recovery, preview-token, or publishing schema changes are required. Existing canonical content and unknown compatibility-protected blocks retain their current serialization paths. No Firebase configuration, security rule, backend function, role, or public rendering contract changes are part of this work.

A future approved release changes the frontend Hosting bundle; no backend function source or rules changes are introduced. The repository's deployment detector also marks `src/**` changes as potentially changing the generated SEO HTML shell. The dev PR workflow builds the matching Functions artifact for validation and deploys only a Hosting preview channel; the production release pipeline may deploy the matching Functions artifact. Preserve that pipeline contract rather than assuming every release is Hosting-only. Build/lint and local browser verification do not constitute publication. Roll back the template, component logic, scoped styles, shell class, and guide together; no data rollback is required because the persistence contract is unchanged. Package uploads remain real media writes when used against a live environment; importing a package still does not itself save/publish an article.

### Exact rollback scope

Restore these existing files from the baseline **only after checking for later changes in each file**:

```text
src/app/admin/cms/pages/post-editor/post-editor.component.ts
src/app/admin/cms/pages/post-editor/post-editor.component.spec.ts
src/app/admin/admin-shell.component.ts
src/styles.scss
src/app/admin/guide/admin-guide.content.ts
src/app/admin/guide/admin-guide.content.spec.ts
src/app/admin/README.md
docs/ARCHITECTURE/ADMIN_CONSOLE_REORGANIZATION_PLAN.md
docs/README/INDEX.md
docs/CHANGELOG.md
```

These four files were introduced by this change:

```text
src/app/admin/cms/pages/post-editor/post-editor.component.html
src/app/admin/cms/pages/post-editor/post-editor.component.scss
src/styles/_admin-controls.scss
docs/ARCHITECTURE/ADMIN_IMPORT_FIRST_EDITOR.md
```

The original template lives inline in the baseline TypeScript component. Restore that component and the styles import/shell scope together before removing the new template or stylesheet. Keep an archived copy of this rollback record and review the new files for later reuse before deleting them. Do not remove the existing editor, preview, media, recovery, social, or block-tool components.

### Rollback procedure

1. Preserve any unsaved article using the existing JSON export or recovery workflow. A source rollback cannot recover unsaved text in an open browser tab; reload only after preserving it.
2. Identify the exact state being rolled back. The original uncommitted implementation was captured in a local checkpoint outside the repository containing `before/`, `after/`, `change.patch`, and SHA-256 `manifest.json` for the 14 files above. It excludes ignored environment files, credentials, dependencies, generated builds, and emulator data. The checkpoint predates PR preparation and subsequent documentation edits; retain it as an original source record rather than assuming it matches a later commit.
3. Preserve the current diff and any subsequent edits. For the unchanged checkpoint, a maintainer can compare the manifest hashes, run `git apply --reverse --check <checkpoint>/change.patch`, and only after a clean review apply the reverse patch. These are documented recovery instructions, not actions performed by this task. If hashes differ or the check fails, make a selective rollback that preserves later work; do not force the patch or reset the entire checkout.
4. Once committed, prefer a dedicated rollback branch and a scoped revert of this feature's actual commit, identified by its PR. Record any deployed Hosting release ID at release time; the PR itself is not a production release. Do not use the baseline SHA as a broad reset target for a newer branch.
5. A complete rollback also removes the new dropdown-key isolation and cold-route hydration fix. If those fixes should remain, review and retain them explicitly as a separate scoped patch with their tests. Do not assume reverting the layout preserves these fixes automatically.
6. Run `npm run build`, `npm run lint`, the focused editor/guide tests, and the smoke checks below on the rollback result. Restore the guide wording to the UI that will actually ship.
7. If this has been deployed, deploy the approved rollback frontend bundle or restore the known prior Hosting release through the normal release process, keeping the generated Functions SEO shell aligned when the pipeline requires it. Confirm the actual admin URL after deployment. No backend logic/rules rollback, Firestore restore, content deletion, or media deletion is needed for this UI rollback.

Existing saved posts, statuses, schedules, evidence, media, and social plans remain canonical data after a layout rollback. Rolling back the interface does **not** undo a save, publication, scheduled release, preview token, or uploaded image; any such reversal is a separate content operation.

### Release and rollback smoke checklist

- New Post shows the intended start view; an existing post opens directly in Edit and survives reload.
- Package and JSON imports retain title, author, taxonomy, status/date, media, and blocks; export remains reachable.
- WYSIWYG, JSON, local preview, unsupported-block preservation, and focus-mode round trips retain the document.
- Every named settings panel is reachable on desktop and mobile; mobile More still exposes eligible view/preview/delete actions.
- Native dropdown options and Editor.js menus remain readable; keyboard selection does not modify article blocks.
- All four status choices remain; scheduling, announcements, early access, and save labels agree with the selected state.
- Evidence-only save, recovery/conflict handling, social composition, AI suggestions, public preview issue/revoke, and calendar routes remain present with their existing permission/state restrictions.
- Review displays current unsaved content; invalid JSON prevents unsafe review/save; notifications do not cover Save.
- Confirm no hidden capability reports during owner review. If a feature is difficult to find, correct its entry point before release rather than removing the feature.

## Validation

Focused tests cover the new import default, non-destructive settings changes, validated unsaved review, invalid-source handling, native dropdown keyboard isolation, cold-route hydration, and operation locks alongside existing recovery/package tests. The guide tests cover permitted and denied role searches. Browser QA uses loopback Auth/Firestore/Functions emulators and blocks remote network access. Package upload QA additionally proxies the Storage SDK transport to the loopback Storage emulator because the existing local environment does not configure browser Storage emulation. App Check is disabled only in the ignored local QA environment. Desktop and narrow viewports exercise import, settings, focus, review, save/reload, dropdown styling, and guide navigation.

The completed implementation passed build, lint, documentation validation, **87 focused Angular tests**, and **15 final Chromium workflow checks** at desktop 1440×1100 and mobile 390×844. Separate package-image processing and role/menu checks also passed. All mutations used emulator fixtures; the final browser workflow reported no uncaught exceptions. The final workflow used no clipboard permissions or clipboard operations after automatic approval review rejected a clipboard-permission request.

These are focused checks, not a full repository-wide test run or exhaustive live integration test. Production publication, real social delivery, AI provider calls, physical Safari/iPhone native popups, and every recovery/conflict variation were not replayed against live accounts. Existing tests exercise recovery/import protections, and source parity covers the retained controls. Final command logs and screenshots are retained in the task's `admin-implementation-qa` artifact directory.
