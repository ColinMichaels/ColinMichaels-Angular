# Editor.js Blog Polls

## Purpose and Scope

Published blog posts can include a native Editor.js `poll` block. Editors define a question, optional supporting copy, two to eight stable answers, and one of three result-visibility policies. Signed-in readers may cast one vote per poll and change that vote later. When results are visible, the public article renders a responsive horizontal comparison graph with direct percentage, vote-count, and response-count labels.

This first slice is deliberately blog/CMS-focused. It does not add social delivery, OpenAI, weather, external polling providers, quiz scoring, anonymous voting, or a generic mini-app framework.

## Stored Post Contract

Poll definitions remain part of the existing typed `BlogPost.blocks` array:

```json
{
  "id": "stable-editorjs-block-id",
  "type": "poll",
  "data": {
    "question": "Which topic should I break down next?",
    "description": "Choose one answer. You can change your vote later.",
    "pollOptions": [
      {"id": "stable-option-id-1", "label": "Angular performance"},
      {"id": "stable-option-id-2", "label": "Firebase architecture"}
    ],
    "pollResultsVisibility": "afterVote"
  }
}
```

`pollResultsVisibility` accepts:

- `afterVote`: only an authenticated reader with a current valid vote receives aggregate results.
- `always`: all readers may request aggregate results; authentication is still required to vote.
- `hidden`: readers receive vote confirmation and their selected option, but never aggregate counts.

Option IDs are created when an answer row is added and survive label edits. Editors should use label edits only for typo corrections after voting begins; removing and adding an answer creates a distinct choice. Duplicate labels are rejected case-insensitively. The Editor.js adapter preserves the poll definition without converting it to presentation HTML, and reading-time, assistant-source, and server-rendered fallback projections include the question and answer labels.

## Runtime Flow

The public `BlogPollComponent` receives the post ID, slug, and typed poll block from `BlogBlockRendererComponent`. It renders an accessible radio group and uses the existing login-return flow for signed-out readers. Results use semantic text and CSS bars rather than canvas or a chart dependency, so percentages and counts remain available to assistive technology and responsive at narrow widths.

After the callable accepts a vote, the component emits a privacy-filtered `poll_vote` GA4 event containing only public post/poll/option identifiers, whether an existing vote changed, and whether results were returned. It does not send the question, answer labels, account ID, or aggregate counts. The callable result remains authoritative; failed, read-only preview, and signed-out attempts do not emit the event.

The browser never reads or writes vote documents directly. It calls:

- `getPostPollResults` to load the caller-authorized result shape.
- `submitPostPollVote` to create or change the authenticated caller's vote.

Both callable Functions reload the current published post and require an exact post ID, slug, poll block ID, and active option ID. A transaction reads the aggregate and caller vote before decrementing the previous active answer and incrementing the new answer. Repeating the same vote is idempotent.

## Backend-Only Data

Derived vote data is stored separately from editorial post content:

```text
postPolls/{postId}/polls/{pollId}
  counts: { [optionId]: number }
  optionIds: string[]
  question: string
  postId/postSlug/pollId: string
  updatedAt/updatedAtTimestamp

postPolls/{postId}/polls/{pollId}/votes/{uid}
  uid: string
  optionId: string
  createdAt/updatedAt/updatedAtTimestamp
```

Firestore rules deny all client reads and writes under `postPolls`, including the legacy recursive administrator fallback. The Admin SDK callables are the only supported access path. Result visibility is enforced when the response is built, not by hiding data in Angular. Removed options are excluded from active totals, and a stale vote does not satisfy `afterVote` visibility.

## Privacy and Abuse Boundary

Voting requires an existing Firebase-authenticated account, which establishes one vote document per UID and prevents casual duplicate browser votes. Votes are not anonymous: the backend associates the selected option with the authenticated UID so the user can update it. The public response never includes voter identities.

This is a lightweight editorial poll rather than an election, survey-research, or high-assurance ballot system. Account creation controls, callable monitoring, App Check enforcement, deletion/export workflows, and dedicated rate limits should be reviewed before using it for sensitive questions or large campaigns.

## Deployment, Migration, and Rollback

Deployment order:

1. Deploy Firestore rules so `postPolls` remains backend-only.
2. Deploy Functions containing `getPostPollResults` and `submitPostPollVote`.
3. Deploy Hosting with the Editor.js tool and public renderer.
4. Publish or update a post containing a poll and verify signed-out, signed-in, changed-vote, and selected visibility behavior.

No backfill or external secret is required. Aggregate documents are created lazily on the first vote. Existing post documents remain valid because `poll` is additive.

Rollback should first remove poll blocks from published posts or republish without them, then revert Hosting and Functions. Backend-only aggregate/vote documents may remain inert for audit or be removed later through an explicitly reviewed administrative cleanup; do not delete them as part of a normal UI rollback.

## Validation and Deferred Work

The feature is covered by Editor.js tool, adapter, reading-stat, Angular component, and pure Functions tests. Production Angular and Functions builds and repository lint remain required. Rendered verification should cover desktop/mobile widths, light/dark themes, keyboard operation, sign-in return behavior, direct result labels, vote changes, and each result-visibility policy.

Deferred work includes quiz scoring, multiple-answer polls, scheduled open/close windows, CMS aggregate reporting across posts, exports, moderation controls, and other interactive article mini-apps.


## Private reader reflections

The same Poll tool now offers **Interaction → Private reflection**. Community polls remain the default and preserve their existing authenticated results/voting behavior. A reflection stores `pollMode: 'reflection'` and a nonempty, plain-text `reflectionExplanation` up to 5,000 characters, alongside the existing question and 2–8 stable options. Switching to reflection selects **Inside the article**; a missing placement also defaults inline for reflection blocks.

`BlogReaderReflectionComponent` owns only component-memory state: current choice, first choice at reveal, and whether the authored evidence is visible. It has no authentication, storage, analytics, vote service, points, or aggregate result dependency. Readers can choose and reveal, skip choosing, reconsider, or start again. Revealing moves keyboard focus to the evidence; reset returns it to the choices. A new block resets the state. The reasoning remains available in the article and is never an access gate or an author-hidden answer.

`BlogBlockRendererComponent` selects this component before instantiating the community poll. `parsePostPollDefinition` rejects reflection and unknown modes, so a forged request cannot create votes or results for a private reflection. Frontend/raw-editor/trusted publishing validation, Editor.js round trips, early-reader field projection, crawler-readable fallback, search, and reading-time projection preserve the definition. Only authored evidence is indexed; reader choices never enter those projections.

The authoring controls are **Interaction**, **Private reflection**, and **Evidence to reveal**. Production Preview may exercise reflections because they make no persistent writes; community voting remains read-only there. The existing Admin Guide post-authoring entry exposes these instructions only to `CMS_ACCESS_ROLES`; viewer, media-manager, and reader-only roles cannot find them through search.

### Editorial recipe and example

Use one consequential choice, source-adjacent evidence, a concrete perspective, and a verdict. Ask what evidence would change a reader's view instead of requesting generic agreement. Do not solicit sensitive health information, add fake totals, promise higher engagement, or put the article's answer behind participation.

The separate [Temu example draft](../CONTENT_PACKAGES/temu-drone-reader-reflection/temu-drone-what-a-flight-proves-post-package.md) combines the original source video, one reflection, two existing disclosed illustrations, and an evidence checklist. It uses a new draft ID/slug and does not replace the live post or its protected SEO refresh. Cinema presentation comes from separate video-first PR #369; ordinary inline video remains compatible.

### Migration, deployment, and rollback

No existing post changes mode implicitly, and no data migration is required. Deploy the trusted publishing/poll/early-reader/SEO Functions first, then the Hosting renderer/editor, and only then save a reflection post. Preserve legacy community poll payloads and votes. No Firebase configuration, rules, accounts, or public content are changed by this source work.

To roll back, first remove or convert any newly saved reflection blocks to static text in an authorized CMS edit. Never roll back to a reader that would render those blocks as community polls. Then revert the feature source. This batch does not save any CMS record, so its source-only rollback needs no document repair.


### Validation record — 2026-10-16

- Node 24.15.0: `npm run build`, `npm run lint`, and Functions TypeScript build passed. The final Angular artifact contains the raw-editor reflection checks.
- Seventy-eight focused ChromeHeadless tests passed across reflection rendering, legacy poll behavior, placement, Poll tool authoring, Editor.js round trips, raw document validation, and guide content/rendered role filtering.
- Ninety-nine Functions SEO tests passed, including module/metadata regressions after the fallback change.
- Forty-nine Functions tests passed for trusted publishing, community poll parsing/results, and private early-reader projection. Tests reject malformed/unknown reflection modes, missing/duplicate choices, missing/oversized evidence, voting against reflections, and leaking undeclared early-reader fields. Authored reflection evidence remains in the search summary.
- The new example passed the blog-import validator with zero warnings and the trusted publishing content validator without performing a mutation. Repository content-package evidence checks passed for nine packages, including this example. Documentation and diff checks passed.
- Installed Playwright Chromium was used because the Browser plugin/skill is unavailable. The local example route used only an in-memory article fixture: no CMS save/import, publication, account grant, or production data write.
- Public flow at 1440 × 1000, touch-mobile 390 × 1000, and touch-mobile 320 × 1000: choose → reveal → reconsider → reset, plus skipping the choice. First take remains visible after reconsideration; new/reset state clears. Focus moves to evidence and returns to choices on reset. Zero page exceptions, horizontal overflow, poll callable requests, or stored choices were observed.
- Light-theme keyboard checks at the same widths verified evidence focus/visibility and zero horizontal overflow with the actual 200% Reader text class. Dark/light native-size screenshots were inspected for text, wrapping, state hierarchy, focus, and controls. Private reflection remains optional and does not gate the article. Final review also clarified the selected radio marker and contained narrow Editor.js answer inputs so Remove no longer overlaps their text.
- `/admin/guide` was rendered at 1440 and 390 pixels using browser-memory `contentEditor` and `viewer` role fixtures. Reflection search/direct CMS links were present only for the editor; clearing search, copy links, and containment passed. This is role-filtering UI evidence, not real account authorization proof.
- `/admin/cms/new` at 1440 and 390 pixels verified the real Poll tool’s Interaction/Private reflection selection, inline placement, Evidence to reveal visibility, hidden community-results control, and local Editor.js serialization. The CMS Save/Publish controls were never used.
- Local Firebase emulator reachability/App Check warnings remain an environment limitation; no clean-backend or clean-console claim is made. Real authenticated CMS save, complete owner source/creative review, physical Safari/device testing, and publication remain separate gates. Screenshots and scripts stay outside the repository.
