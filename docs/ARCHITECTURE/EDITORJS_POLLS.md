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
