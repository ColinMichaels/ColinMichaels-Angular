# Admin User View

## Purpose

The admin-only **View as User** workflow lets an administrator inspect the application with another account's profile and custom-role projection. It supports role-matrix checks, reproducing navigation differences, and diagnosing reports about missing or unexpectedly visible UI.

The workflow is deliberately a preview, not account takeover. The administrator's Firebase Auth session remains active for recovery and is never exchanged for a target-user token.

## Entry And Access Boundary

- Entry route: `/admin/users`
- Entry control: **View as User** on each account other than the signed-in administrator
- Required role: `USER_MANAGEMENT_ACCESS_ROLES` (`admin` only)
- Server boundary: `listAdminUsers` remains protected by `requireUserManagementAdmin`, so the target identity and claim projection originate from the existing admin-only callable
- Client defense: `AuthService.startViewingAsUser` force-refreshes the real Firebase token and verifies the `admin` claim before accepting a target

`cmsAdmin`, `contentEditor`, `mediaManager`, `viewer`, `trustedCommenter`, and `catCornerAddict` cannot start this workflow.

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

Use the real account, an emulator test account, or a dedicated end-to-end permission test when authoritative Firebase rule or callable enforcement must be verified.

## Data And Migration

No Firestore, Realtime Database, or Storage schema changes are required. No custom token, impersonation credential, audit document, or target-user session is created.

`AdminManagedUser` adds `providerIds`, derived from Firebase Auth provider data, so the viewed Profile projection can display the same provider summary. Existing callable consumers are additive and require no data migration.

The preview record uses `admin.user-view.session.v1` in `sessionStorage`. It contains the already-admin-visible account projection, is limited to the current browser tab, is schema-checked on restore, and is removed when the preview ends.

## Deployment And Rollback

Deployment requires Angular Hosting and Firebase Functions because `listAdminUsers` now returns `providerIds`. No Security Rules or environment changes are required.

Safe rollout order:

1. Deploy Functions with the additive response field.
2. Deploy Hosting with the View as UI and effective-profile state.

To roll back, deploy the previous Hosting and Functions versions. Existing tab-scoped preview records become inert and can be cleared by closing the tab or removing the session-storage key.

## Validation Contract

- Admin activation succeeds; `cmsAdmin` activation fails.
- Effective authorization, profile identity, and role projection switch to the target without changing `Auth.currentUser`.
- Exit restores the actor and clears tab-scoped state.
- User Management presents the confirmation and safety limitation before activation.
- The global banner remains visible on public, Profile, OS, and admin routes.
- Profile provider mutation is unavailable during a preview.
- Admin Guide search returns the updated `manage-user-roles` entry only to `admin`.
- Desktop and mobile checks cover `/admin/users`, `/`, `/profile`, role-gated destinations, and **Exit View**.
