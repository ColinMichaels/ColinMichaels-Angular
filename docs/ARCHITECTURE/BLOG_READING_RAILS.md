# Blog Reading Rails

## Purpose

The public blog-detail route uses a content-aware editorial reading shell at the `xl` breakpoint:

- the table of contents owns the left reading rail;
- the article header, sticky toolbar, body, and footer remain in the center column;
- post-specific interactive blocks and compact suggested-post links share the right reading rail.

Below `xl`, the same semantic order becomes a single column: post header, toolbar, collapsed contents disclosure, article body, right-rail content, and article footer. No content is duplicated solely to create the desktop layout.

At `xl` and above, the desktop grid uses the proportional `18% / 2% / 54% / 2% / 24%` contract only when both rails exist. Contents/article uses `22% / 3% / 75%`; article/related uses `72% / 3% / 25%`; an article without either rail receives one centered track. The background content surface drops its duplicate desktop inline padding so present rails align directly with the normal page gutter; absent rails no longer reserve empty columns. Smaller single-column layouts retain their existing responsive padding.

## Block Placement Contract

`BlogBlockData.placement` is an optional `content | rail` field. `createBlogPostLayoutBlocks()` is the single public-layout boundary that separates the two streams.

- Polls without a placement are treated as `rail` so existing poll posts adopt the new layout without a migration.
- Authors can choose `Inside the article` in the Poll Editor.js tool to retain an inline poll.
- New polls default to `Right reading rail` and persist that explicit choice through the Editor.js adapter.
- Future custom blocks may opt into the same rail with `placement: 'rail'`; the article renderer remains the shared rendering surface in both locations.

Only center-column blocks contribute table-of-contents headings. Reading-time and search calculations continue using the complete stored post, including rail content.

## Right-Rail Presentation

`BlogPostRailComponent` composes two existing content families instead of creating a separate recommendation query or poll implementation:

- `BlogBlockRendererComponent` renders rail blocks with its `rail` display mode. Polls receive a compact visual treatment but retain the same authentication, vote, result, and accessibility behavior.
- The existing taxonomy-ranked `suggestedPosts` result is rendered as a compact `More posts` list with the same post routes, thumbnail resolver, dates, and dark-mode tokens used elsewhere.

Both desktop rails stick below the shared site header and use bounded internal scrolling when their content exceeds the viewport. The right grid aside owns that sticky boundary so its interactive and suggested-post sections move as one rail. The article column remains the only reading-progress measurement surface.

## Data, Deployment, And Rollback

The optional placement field is migration-safe. Existing non-poll blocks remain inline; existing polls move to the rail unless an editor explicitly saves `content`. No Firestore rules, Functions, indexes, secrets, or external APIs are added.

Deployment requires only the normal Angular/Firebase Hosting artifact. Rollback can restore the fixed three-track template and always-open narrow contents rail. Stored placement values are optional and harmless to the earlier renderer, so rollback does not require document rewrites.

## Validation

Regression coverage includes:

- `blog-block-placement.util.spec.ts` for legacy poll defaults, explicit inline polls, and future rail blocks;
- `poll-block.tool.spec.ts` and `blog-editorjs-adapter.spec.ts` for placement authoring and round trips;
- `blog-post-rail.component.spec.ts` for compact interactive and suggested-post presentation;
- `blog-poll.component.spec.ts` for compact rail styling without changing vote behavior;
- `blog-reading.util.spec.ts` for all four present-rail track selections;
- `blog-table-of-contents.component.spec.ts` for collapsed narrow disclosure semantics and backward heading navigation;
- desktop and mobile Browser checks for column ownership, sticky bounds, stacked order, link interaction, overflow, and console health.
