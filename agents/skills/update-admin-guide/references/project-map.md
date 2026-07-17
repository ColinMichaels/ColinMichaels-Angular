# Admin Guide Project Map

## Source locations

- Guide route: `src/app/admin/admin.routes.ts`
- Route names: `src/app/app-route-paths.ts`
- Shell navigation and titles: `src/app/admin/admin-navigation.config.ts`
- Guide UI: `src/app/admin/guide/admin-guide-page.component.ts`
- Searchable content: `src/app/admin/guide/admin-guide.content.ts`
- Content types: `src/app/admin/guide/admin-guide.models.ts`
- Role definitions and access groups: `src/app/shared/user-account/user-account.model.ts`
- Frontend role claims: `src/app/services/auth.service.ts`
- Admin operating notes: `src/app/admin/README.md`
- Admin architecture: `docs/ARCHITECTURE/ADMIN_CONSOLE_REORGANIZATION_PLAN.md`
- Required change record: `docs/CHANGELOG.md`

## Role matrix

| Constant                       | Roles                                                          | Typical guide scope                                                                      |
|--------------------------------|----------------------------------------------------------------|------------------------------------------------------------------------------------------|
| `ADMIN_CONSOLE_ROLES`          | `admin`, `cmsAdmin`, `contentEditor`, `mediaManager`, `viewer` | Shared shell, environment, and overview                                                  |
| `CMS_ACCESS_ROLES`             | `admin`, `cmsAdmin`, `contentEditor`                           | Posts, Calendar, social planning, authors, comments, Homepage, Topics, Recommended Links |
| `MEDIA_LIBRARY_ACCESS_ROLES`   | `admin`, `cmsAdmin`, `mediaManager`                            | Media Library and reusable asset workflows                                               |
| `USER_MANAGEMENT_ACCESS_ROLES` | `admin`                                                        | Accounts and custom role claims                                                          |

Reader-only roles such as `trustedCommenter` and `catCornerAddict` do not enter the admin console and must not receive guide content.

## Entry contract

Every `AdminGuideEntry` needs:

- `id`: stable URL fragment in lowercase hyphen form;
- `category`: one existing in-guide navigation group unless the information architecture genuinely changes;
- `roles`: the same shared constant as the destination route;
- `title` and `summary`: operator-facing task and outcome;
- `keywords`: synonyms, feature names, statuses, and control language not already obvious from the prose;
- `steps`: current sequential actions with contextual deep links where useful;
- `links`: primary direct destinations rendered after the steps;
- optional `featured`: include only for common, high-value work.

Search indexes titles, summaries, keywords, step text, step-link labels, and related-link labels after role filtering. A role-restricted entry must never appear through a keyword match.

## Validation targets

Use the focused suite:

```bash
npm test -- --watch=false --include='src/app/admin/guide/*.spec.ts' --include='src/app/admin/admin-navigation.config.spec.ts' --include='src/app/admin/admin-shell.component.spec.ts'
```

Then run:

```bash
npm run build
npm run lint
```

Rendered checks should cover search, clear, desktop table of contents, mobile jump menu, URL fragments, copy link, direct tool links, an allowed role, and a role that must not see the new entry.
