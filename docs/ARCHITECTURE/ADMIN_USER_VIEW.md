# Admin User Management And View

## Purpose

The admin-only User Management surface lets an administrator inspect Firebase Auth accounts, disable or restore sign-in, delete an Auth record, edit custom roles, and preview the application with another account's profile and role projection. It supports suspicious-signup response, least-privilege administration, role-matrix checks, and diagnosing reports about missing or unexpectedly visible UI.

The workflow is deliberately a preview, not account takeover. The administrator's Firebase Auth session remains active for recovery and is never exchanged for a target-user token.

## Entry And Access Boundary

- Entry route: `/admin/users`
- Entry controls: **Manage Roles**, **View as User**, **Disable/Restore Sign-In**, and **Delete Auth User**
- Required role: `USER_MANAGEMENT_ACCESS_ROLES` (`admin` only)
- Server boundary: `listAdminUsers`, `updateAdminUserRoles`, `setAdminUserDisabled`, and `deleteAdminUser` are protected by `requireUserManagementAdmin`
- Client defense: `AuthService.startViewingAsUser` force-refreshes the real Firebase token and verifies the `admin` claim before accepting a target

`cmsAdmin`, `contentEditor`, `mediaManager`, `viewer`, `trustedCommenter`, and `catCornerAddict` cannot enter User Management or invoke its callables.

## Account Access Lifecycle

`setAdminUserDisabled` accepts a UID and explicit boolean state. It rejects self-account changes, serializes against role and deletion mutations for the same UID, updates the Firebase Auth `disabled` property, and explicitly revokes refresh tokens when disabling. Restoring sign-in leaves the account's providers and custom claims intact.

`deleteAdminUser` requires the exact target email or UID as a server-validated confirmation. It rejects self-deletion, uses the same per-user mutation lease, revokes refresh tokens, and deletes one Auth record through the Admin SDK. Structured Functions logs record the actor UID, target UID, outcome state, and timestamp without recording the target email.

These actions have deliberately different outcomes:

- **Disable Sign-In** is the denial control for suspicious or fake accounts. The Auth record remains, so the same email stays occupied. Firebase refresh tokens expire when a user is disabled, but already-issued stateless ID tokens can remain usable until their short lifetime ends unless each protected backend or Rules path also performs revocation-time checks.
- **Restore Sign-In** re-enables the existing account with its providers and claims unchanged.
- **Delete Auth User** removes only the Firebase Auth identity. It does not create a denylist, so the same email may register again. Existing `/users/{uid}` data, comments, points, authored content, and other records are preserved rather than cascading through unrelated data.

## State And Application Flow

1. User Management loads a protected `AdminManagedUser` projection, including provider IDs, roles, and custom claims.
2. The administrator chooses **View as User** and confirms the read-oriented security boundary.
3. `AuthService` verifies the real actor's current admin token, binds the preview to that actor UID, and stores the validated preview in `sessionStorage` for the current tab.
4. Role-aware consumers use the target profile and claims:
  - `getRoleAuthorization` drives navigation visibility and protected Angular route checks;
  - `getCurrentUserProfile` drives account identity, role badges, and guide filtering;
  - the Profile page reads the target `/users/{uid}` projection and point events, which the real admin may read under existing Firestore rules;
  - the public account avatar reflects the viewed profile.
5. A persistent amber `UserViewBannerComponent` identifies the viewed account, its roles, disabled status, and the Firebase-authentication limitation.
6. **Exit View** clears memory and tab-scoped storage, restores the real admin projection, and returns to `/admin/users`.

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

No Firestore, Realtime Database, or Storage schema changes are required. No custom token, impersonation credential, audit document, or target-user session is created. Disable/restore changes only Firebase Auth account state. Auth deletion intentionally does not cascade to site data, so no migration or content ownership rewrite occurs.

`AdminManagedUser` adds `providerIds`, derived from Firebase Auth provider data, so the viewed Profile projection can display the same provider summary. Existing callable consumers are additive and require no data migration.

The preview record uses `admin.user-view.session.v1` in `sessionStorage`. It contains the already-admin-visible account projection, is limited to the current browser tab, is schema-checked on restore, and is removed when the preview ends.

## Deployment And Rollback

Deployment requires Angular Hosting and Firebase Functions. Functions must include the new admin-only account lifecycle callables before Hosting exposes their controls. No Security Rules or environment changes are required.

Safe rollout order:

1. Deploy Functions with the protected disable/restore and deletion callables.
2. Deploy Hosting with the account lifecycle controls.

To roll back, deploy the previous Hosting first so the browser stops offering the controls, then roll back Functions. Disabled or deleted Firebase Auth accounts are external state and are not reversed by a code rollback: re-enable a disabled account explicitly, and recreate a deleted identity only with owner-approved recovery details. Existing tab-scoped preview records become inert and can be cleared by closing the tab or removing the session-storage key.

## Validation Contract

- Admin activation succeeds; `cmsAdmin` activation fails.
- Effective authorization, profile identity, and role projection switch to the target without changing `Auth.currentUser`.
- Exit restores the actor and clears tab-scoped state.
- User Management presents the confirmation and safety limitation before activation.
- User Management distinguishes disable from delete, disables all self-account lifecycle controls, and requires the exact email or UID before enabling the delete action.
- Backend callables reject unauthenticated, non-admin, and self-account mutations; deletion independently revalidates the typed confirmation.
- Disable/restore returns the authoritative updated `UserRecord`; deletion removes only the selected row from the loaded Auth page.
- The global banner remains visible on public, Profile, OS, and admin routes.
- Profile provider mutation is unavailable during a preview.
- Admin Guide search returns the updated `manage-user-roles` entry only to `admin`.
- Desktop and mobile checks cover `/admin/users`, `/`, `/profile`, role-gated destinations, and **Exit View**.
