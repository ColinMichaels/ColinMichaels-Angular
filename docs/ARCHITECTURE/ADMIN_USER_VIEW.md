# Admin User Management And View

## Purpose

The admin-only User Management surface preserves account management as its primary, default workflow and offers the points leaderboard as a separate alternate view of the same user population. Administrators can inspect Firebase Auth accounts, disable or restore sign-in, delete an Auth record, edit custom roles, preview the application with another account's profile and role projection, and separately review or adjust reader point balances. It supports audited account corrections, suspicious-signup response, least-privilege administration, role-matrix checks, and diagnosing reports about missing or unexpectedly visible UI.

The workflow is deliberately a preview, not account takeover. The administrator's Firebase Auth session remains active for recovery and is never exchanged for a target-user token.

## Entry And Access Boundary

- Entry route: `/admin/users`
- View controls: **User management** (default) and **Points leaderboard** (alternate)
- Account controls: **Manage Roles**, **View as User**, **Disable/Restore Sign-In**, and **Delete Auth User**
- Points control: **Manage Points**
- Required role: `USER_MANAGEMENT_ACCESS_ROLES` (`admin` only)
- Server boundary: `listAdminUsers`, `adjustAdminUserPoints`, `updateAdminUserRoles`, `setAdminUserDisabled`, and `deleteAdminUser` are protected by `requireUserManagementAdmin`
- Client defense: `AuthService.startViewingAsUser` force-refreshes the real Firebase token and verifies the `admin` claim before accepting a target

`cmsAdmin`, `contentEditor`, `mediaManager`, `viewer`, `trustedCommenter`, and `catCornerAddict` cannot enter User Management or invoke its callables.

## Point Balance Administration

The default **User management** view keeps the original paginated Firebase Auth table and its account actions. Selecting **Points leaderboard** triggers a separate complete-list load; account access, role, deletion, and preview controls are intentionally not duplicated there.

`listAdminUsers` joins each Firebase Auth page with the corresponding `/users/{uid}.points` record and normalizes missing counters to zero. `UserManagementService` also normalizes missing or partial point projections from an older deployed callable, so a staggered rollout renders zero-value counters instead of crashing; authoritative balances appear after the updated Function is deployed and the list is refreshed. `listAllUsers` follows the protected Firebase Auth page tokens and de-duplicates UIDs only for the alternate points view, so its leaderboard covers the complete account list without changing the primary account list. It ranks current totals from highest to lowest by default and supports bidirectional sorting by user, total, post-reading, share, approved-comment, Daily Discovery, and net `manualAdjustments` points. Rank always reflects the active sort. `UserPointsEditorComponent` exposes the same full breakdown before an administrator changes a balance.

`adjustAdminUserPoints` accepts one Add, Remove, or Set total operation, a bounded whole-number amount, and a required 3–240 character reason. The callable checks the admin claim again, verifies that the target still exists in Firebase Auth, and uses one Firestore transaction to:

- reject a negative resulting balance or a change that leaves the total untouched;
- preserve every earned-category counter;
- update `points.total` and apply the signed delta to `points.manualAdjustments`;
- create a `userPointEvents/{eventId}` record with type `admin_adjustment`, operation, signed delta, previous/new totals, reason, actor UID, target UID, and server timestamp.

The adjustment becomes visible in the reader's Profile activity and the callable emits a structured Functions log without copying the target email. A code rollback does not reverse a saved point adjustment; use a new reasoned adjustment when an operational correction is required.

## Account Access Lifecycle

`setAdminUserDisabled` accepts a UID and explicit boolean state. It rejects self-account changes, serializes against role and deletion mutations for the same UID, updates the Firebase Auth `disabled` property, and explicitly revokes refresh tokens when disabling. Restoring sign-in leaves the account's providers and custom claims intact.

`deleteAdminUser` requires the exact target email or UID as a server-validated confirmation. It rejects self-deletion, uses the same per-user mutation lease, revokes refresh tokens, and deletes one Auth record through the Admin SDK. Structured Functions logs record the actor UID, target UID, outcome state, and timestamp without recording the target email.

These actions have deliberately different outcomes:

- **Disable Sign-In** is the denial control for suspicious or fake accounts. The Auth record remains, so the same email stays occupied. Firebase refresh tokens expire when a user is disabled, but already-issued stateless ID tokens can remain usable until their short lifetime ends unless each protected backend or Rules path also performs revocation-time checks.
- **Restore Sign-In** re-enables the existing account with its providers and claims unchanged.
- **Delete Auth User** removes only the Firebase Auth identity. It does not create a denylist, so the same email may register again. Existing `/users/{uid}` data, comments, points, authored content, and other records are preserved rather than cascading through unrelated data.

## State And Application Flow

1. User Management opens on the paginated account table and preserves its search, Previous/Next navigation, roles, access, deletion, and preview actions.
2. The separate **Points leaderboard** view follows every protected Auth page token and loads the complete normalized point projection only when selected. If the deployed user-list callable predates point projections, the browser fills only the missing projections from the same admin-readable `/users/{uid}` documents used by Profile.
3. From the primary account view, the administrator chooses **View as User** and confirms the read-oriented security boundary.
4. `AuthService` verifies the real actor's current admin token, binds the preview to that actor UID, and stores the validated preview in `sessionStorage` for the current tab.
5. Role-aware consumers use the target profile and claims:
  - `getRoleAuthorization` drives navigation visibility and protected Angular route checks;
  - `getCurrentUserProfile` drives account identity, role badges, and guide filtering;
  - the Profile page reads the target `/users/{uid}` projection and point events, which the real admin may read under existing Firestore rules;
  - the public account avatar reflects the viewed profile.

6. A persistent amber `UserViewBannerComponent` identifies the viewed account, its roles, disabled status, and the Firebase-authentication limitation.
7. **Exit View** clears memory and tab-scoped storage, restores the real admin projection, and returns to `/admin/users`.

The preview is also cleared on sign-out, actor changes, malformed stored state, failed token verification, or loss of the real admin claim. A different signed-in user cannot inherit the stored preview.

## Security And Diagnostic Limits

The preview changes Angular's effective profile and role evaluation only. Firebase Auth, callable Functions, Firestore, Realtime Database, and Storage continue to receive the real administrator's token.

Consequences:

- Navigation, badges, role-aware components, and Angular route guards can be diagnosed from the target role view.
- Backend authorization denial cannot be proven from this mode because requests retain admin authority.
- Any mutation would be attributed to and authorized as the administrator, not the viewed user.
- Provider linking is disabled on Profile while a preview is active.
- The confirmation dialog and persistent banner instruct administrators to keep the workflow read-oriented.
- A disabled account can be previewed to inspect its stored role projection, but the preview does not imply that the disabled account can sign in.
- Account access mutations cannot target the signed-in administrator, and deletion requires a second, typed confirmation validated again by the server.

Use the real account, an emulator test account, or a dedicated end-to-end permission test when authoritative Firebase rule or callable enforcement must be verified.

## Data And Migration

This change adds the optional numeric `points.manualAdjustments` projection and the `admin_adjustment` point-event type. No backfill is required: missing `manualAdjustments` values normalize to zero on the server and in the Profile UI. Firestore create rules accept the new counter only at zero, so readers cannot self-award points; the supported admin UI writes through the protected callable and its audit event. No Realtime Database, Storage, content ownership, or existing point-event migration is required.

`AdminManagedUser` adds `providerIds`, derived from Firebase Auth provider data, so the viewed Profile projection can display the same provider summary. Existing callable consumers are additive and require no data migration.

The preview record uses `admin.user-view.session.v1` in `sessionStorage`. It contains the already-admin-visible account projection, is limited to the current browser tab, is schema-checked on restore, and is removed when the preview ends.

## Deployment And Rollback

Deployment requires Firebase Functions, Firestore Rules, and Angular Hosting. Functions must include the point-adjustment callable before Hosting exposes **Manage Points**. Hosting remains render-compatible with an older `listAdminUsers` response by retrieving omitted point projections from the existing admin-readable user account documents, so Profile and leaderboard balances remain aligned during rollout. No environment or secret changes are required.

Safe rollout order:

1. Deploy Functions with the protected point-adjustment and account-lifecycle callables.
2. Deploy Firestore Rules with the zero-only optional `manualAdjustments` create contract.
3. Deploy Hosting with the point and account controls.

To roll back, deploy the previous Hosting first so the browser stops offering the controls, then roll back Functions and Rules. Saved point adjustments, disabled accounts, and deleted Firebase Auth records are external state and are not reversed by a code rollback: correct points with a new audited adjustment, re-enable a disabled account explicitly, and recreate a deleted identity only with owner-approved recovery details. Existing tab-scoped preview records become inert and can be cleared by closing the tab or removing the session-storage key.

## Validation Contract

- Admin activation succeeds; `cmsAdmin` activation fails.
- Effective authorization, profile identity, and role projection switch to the target without changing `Auth.currentUser`.
- Exit restores the actor and clears tab-scoped state.
- User Management presents the confirmation and safety limitation before activation.
- User Management distinguishes disable from delete, disables all self-account lifecycle controls, and requires the exact email or UID before enabling the delete action.
- User Management opens on the paginated account list; the separate points view loads all Auth pages, ranks current totals by default, sorts every point source in both directions, displays point totals and earned categories, requires a reason, previews Add/Remove/Set total outcomes, and blocks negative balances and no-op changes.
- The point callable rejects unauthenticated and non-admin requests, writes the balance and audit event atomically, and preserves earned-category counters.
- Backend callables reject unauthenticated, non-admin, and self-account mutations; deletion independently revalidates the typed confirmation.
- Disable/restore returns the authoritative updated `UserRecord`; deletion removes only the selected row from the loaded Auth page.
- The global banner remains visible on public, Profile, OS, and admin routes.
- Profile provider mutation is unavailable during a preview.
- Admin Guide search returns the separate `manage-user-roles` and `manage-user-points` entries only to `admin`.
- Desktop and mobile checks cover `/admin/users`, `/`, `/profile`, role-gated destinations, and **Exit View**.
