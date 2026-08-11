import {PATH_NAMES} from '../../app-route-paths';
import {
  ADMIN_CONSOLE_ROLES,
  CMS_ACCESS_ROLES,
  MEDIA_LIBRARY_ACCESS_ROLES,
  USER_MANAGEMENT_ACCESS_ROLES,
} from '../../shared/user-account/user-account.model';
import {AdminGuideCategory, AdminGuideEntry} from './admin-guide.models';

const adminRoute = `/${PATH_NAMES.ADMIN}`;
const cmsRoute = `${adminRoute}/${PATH_NAMES.ADMIN_CMS}`;

export const ADMIN_GUIDE_CATEGORIES: readonly AdminGuideCategory[] = [
  {id: 'getting-started', label: 'Getting started'},
  {id: 'publishing', label: 'Publishing'},
  {id: 'site-content', label: 'Site content'},
  {id: 'media', label: 'Media'},
  {id: 'community', label: 'Community'},
  {id: 'administration', label: 'Administration'},
] as const;

export const ADMIN_GUIDE_ENTRIES: readonly AdminGuideEntry[] = [
  {
    category: 'getting-started',
    featured: true,
    id: 'find-your-way-around',
    keywords: ['overview', 'navigation', 'sidebar', 'environment', 'firebase', 'account', 'roles'],
    links: [{label: 'Open Overview', route: adminRoute}],
    roles: ADMIN_CONSOLE_ROLES,
    steps: [
      {text: 'Use the grouped sidebar to move between the tools your role can access.'},
      {text: 'Check the Firebase badge in the sidebar footer before changing data. It identifies emulator, live, or mixed services.'},
      {
        text: 'Return to the operational dashboard to review the work available to your role.',
        link: {label: 'Open Overview', route: adminRoute}
      },
      {text: 'Use Account to inspect your current role claims, or Sign out when you finish.'},
    ],
    summary: 'Understand the shared shell, confirm the active Firebase environment, and find the tools available to your role.',
    title: 'Find your way around the admin',
  },
  {
    category: 'publishing',
    featured: true,
    id: 'create-and-publish-a-post',
    keywords: [
      'post',
      'draft',
      'editor',
      'editorjs',
      'wysiwyg',
      'raw json',
      'source',
      'diagnose',
      'nested list',
      'checklist',
      'ordered list',
      'standard list',
      'step sequence',
      'tab',
      'shift tab',
      'unsupported block',
      'compatibility protection',
      'view preserved json',
      'recovery',
      'autosave',
      'conflict',
      'revision',
      'trusted publishing',
      'server validation',
      'idempotent retry',
      'duplicate slug',
      'reload remote',
      'save as new draft',
      'seo',
      'preview',
      'production preview',
      'unsaved preview',
      'light theme',
      'dark theme',
      'viewport',
      'reader text',
      'reduced motion',
      'heading hierarchy',
      'repeated title',
      'markdown heading',
      'table of contents',
      'publish',
      'cover image',
      'image layout',
      'image size',
      'small image',
      'medium image',
      'large image',
      'wide image',
      'inline image',
      'lightbox',
      'alt text',
      'image signature',
      'responsive variants',
      'avif',
      'webp',
    ],
    links: [
      {label: 'Open Posts', route: cmsRoute},
      {label: 'Create a new post', route: `${cmsRoute}/new`},
    ],
    roles: CMS_ACCESS_ROLES,
    steps: [
      {
        text: 'Start from the post list to check for an existing draft or duplicate topic.',
        link: {label: 'Open Posts', route: cmsRoute}
      },
      {
        text: 'Choose New Post, then add the title, excerpt, author, categories, tags, and article blocks.',
        link: {label: 'Create a new post', route: `${cmsRoute}/new`}
      },
      {text: 'Use the three Article Content modes as one synchronized document: WYSIWYG for authoring, Production Preview for the current unsaved content, and JSON for controlled source diagnostics. Invalid JSON and malformed known blocks stay in source mode and cannot preview, render, or save until corrected.'},
      {text: 'Keep the post title as the page’s only H1. Use Heading blocks at level 2 for major sections and level 3 for subsections. If the editor warns that the first heading repeats the post title, remove or rename that heading.'},
      {text: 'Markdown headings render visually but do not enter the generated table of contents. Use a Heading block for every section readers should navigate; keep Markdown headings only when that omission is intentional.'},
      {text: 'In Production Preview, review the public renderer in light and dark themes, Mobile/Tablet/Desktop canvas widths, 100/150/200 percent Reader text, and reduced motion. Polls are deliberately read-only. Canvas widths are review aids, so complete final responsive approval in real browser viewports.'},
      {text: 'Use the existing List block settings to choose unordered, ordered, or checklist meaning. Press Tab and Shift+Tab while editing a list item to nest or outdent it, up to three levels. For an ordered list, choose Step sequence when the content is a real procedure; choose Standard list to remove that presentation. Changing the block away from ordered automatically drops Step sequence.'},
      {text: 'Existing flat lists, nested lists, checklist state, and ordered-list counters are preserved when a post is saved. Review long links and nested lists in Production Preview at Mobile width and 200 percent Reader text. If an unsupported block opens as Compatibility protection, use View preserved JSON for diagnosis and leave the block intact unless you intend to remove or separately migrate its original content.'},
      {text: 'For an Image block, choose Full width, Contained, Inline left, or Inline right, then optionally choose Small, Medium, Large, or Wide. Automatic preserves an existing image’s behavior without writing a new size. Inline images stack when the viewport or Reader text scale cannot leave readable copy beside them; Large and Wide images always stay in the article flow. Arbitrary pixel widths, crop ratios, focal points, and custom CSS are not supported.'},
      {text: 'Add image-specific Alt text and an optional Caption, and retain intrinsic dimensions when the Media Library provides them. In Production Preview, check portrait, landscape, and unusually wide images at Mobile and Desktop widths plus 200 percent Reader text. Open the full-screen image with the keyboard, move through multi-image galleries with the arrow keys, close with Escape, and confirm focus returns to the image trigger.'},
      {text: 'New image uploads first enter a private staging path. Trusted media processing verifies the file signature and dimensions, then creates bounded AVIF, WebP, and JPEG variants and returns the canonical asset. A rejected or interrupted upload is not attached to the post; correct the source file and retry rather than pasting a staging URL.'},
      {text: 'Watch Recovery & Conflicts while editing. A private recovery copy is saved after a short pause and retained for up to 30 days, but it never publishes or replaces the canonical post. Restore still requires you to review and choose Save Post explicitly.'},
      {text: 'Save, schedule, Draft Preview issue/revoke, and delete now pass through the trusted publishing service. It validates the complete post, reserves the slug, advances one revision, records an audit event, and safely replays the same request after an uncertain network response.'},
      {text: 'If another editor or backend process changes the post, do not repeatedly retry the stale save. Compare the recovery, reload the latest remote revision when available, or choose Save as new draft to preserve your local version under a new post ID. If the slug is already reserved, choose a different slug; the service will not overwrite the other post.'},
      {text: 'A refresh or route change warns when metadata, Social Shares, WYSIWYG content, or JSON source is dirty. Cancel navigation if the Recovery panel is still saving or the latest keystrokes have not yet been captured.'},
      {text: 'Add a cover image and review Search & Sharing so the SEO title, description, and social preview are intentional.'},
      {text: 'Production Preview is local and can show unsaved content. Save a draft before generating a separate temporary public preview link or sharing the draft for review. Preview issue and revoke are atomic with the canonical post revision, so an expired or revoked token cannot silently remain active.'},
      {text: 'Set the status to Published and save only when the article and public preview are ready.'},
    ],
    summary: 'Create an Editor.js-backed article, complete its metadata, preview it, and move it safely from draft to published.',
    title: 'Create and publish a post',
  },
  {
    category: 'publishing',
    featured: true,
    id: 'schedule-a-release',
    keywords: ['calendar', 'schedule', 'published at', 'release', 'reschedule', 'social plan', 'announcement'],
    links: [
      {label: 'Open Calendar', route: `${cmsRoute}/${PATH_NAMES.ADMIN_CMS_CALENDAR}`},
      {label: 'Open Posts', route: cmsRoute},
    ],
    roles: CMS_ACCESS_ROLES,
    steps: [
      {
        text: 'Open a draft and choose a future publish date and time in the Publishing controls.',
        link: {label: 'Open Posts', route: cmsRoute}
      },
      {text: 'Set the post status to Scheduled and save the post.'},
      {
        text: 'Confirm the article appears on the correct day and time.',
        link: {label: 'Open Calendar', route: `${cmsRoute}/${PATH_NAMES.ADMIN_CMS_CALENDAR}`}
      },
      {text: 'Attach or review channel-specific social plans. Launch-following plans move with the article; fixed-time plans do not.'},
      {text: 'Recheck the Calendar after rescheduling so timing and media requirements remain correct.'},
    ],
    summary: 'Set a future publication time, verify it on the Calendar, and keep social announcements aligned with the release.',
    title: 'Schedule a release',
  },
  {
    category: 'publishing',
    id: 'review-posts-in-bulk',
    keywords: ['bulk editor', 'manifest', 'seo', 'taxonomy', 'dry run', 'candidate', 'audit'],
    links: [{label: 'Open Bulk Editor', route: `${cmsRoute}/${PATH_NAMES.ADMIN_CMS_CONTENT_OPERATIONS}`}],
    roles: CMS_ACCESS_ROLES,
    steps: [
      {
        text: 'Open the Bulk Editor and filter the post audit to the issues you want to review.',
        link: {label: 'Open Bulk Editor', route: `${cmsRoute}/${PATH_NAMES.ADMIN_CMS_CONTENT_OPERATIONS}`}
      },
      {text: 'Import a supported optimization manifest only when you need to compare proposed metadata or taxonomy changes.'},
      {text: 'Review candidate diffs for SEO title, meta description, categories, and tags.'},
      {text: 'Treat the page as a dry run: apply and publish remain locked, and canonical posts are not changed.'},
    ],
    summary: 'Audit metadata and taxonomy candidates across posts without writing changes to canonical content.',
    title: 'Review posts in bulk',
  },
  {
    category: 'publishing',
    id: 'manage-social-connections',
    keywords: ['social', 'facebook', 'instagram', 'threads', 'oauth', 'connect', 'disconnect', 'page'],
    links: [{label: 'Open Social Connections', route: `${cmsRoute}/${PATH_NAMES.ADMIN_CMS_SOCIAL_CONNECTIONS}`}],
    roles: CMS_ACCESS_ROLES,
    steps: [
      {
        text: 'Open Social Connections to review provider authorization health.',
        link: {label: 'Open Social Connections', route: `${cmsRoute}/${PATH_NAMES.ADMIN_CMS_SOCIAL_CONNECTIONS}`}
      },
      {text: 'Connect or reconnect the required provider and choose the intended Facebook Page when prompted.'},
      {text: 'Use disconnect when an account should no longer be available to the admin.'},
      {text: 'Remember that connection health and saved plans do not imply external delivery is enabled; verify the release notes before relying on automation.'},
    ],
    summary: 'Review and maintain Facebook, Instagram, and Threads connection state used by publishing workflows.',
    title: 'Manage social connections',
  },
  {
    category: 'publishing',
    id: 'manage-authors',
    keywords: ['author', 'byline', 'profile', 'bio', 'published', 'canonical author'],
    links: [{label: 'Open Authors', route: `${cmsRoute}/${PATH_NAMES.ADMIN_CMS_AUTHORS}`}],
    roles: CMS_ACCESS_ROLES,
    steps: [
      {
        text: 'Open Authors and search for the profile before creating a duplicate.',
        link: {label: 'Open Authors', route: `${cmsRoute}/${PATH_NAMES.ADMIN_CMS_AUTHORS}`}
      },
      {text: 'Add or edit the display name, slug, title, biography, image, and social links.'},
      {text: 'Publish the canonical author profile before assigning it to a published post.'},
      {text: 'Review reference warnings before changing or removing an author used by existing posts.'},
    ],
    summary: 'Maintain canonical byline profiles and make published authors available to article editors.',
    title: 'Manage authors and bylines',
  },
  {
    category: 'site-content',
    id: 'update-the-homepage-hero',
    keywords: ['homepage', 'hero', 'featured post', 'slideshow', 'headline', 'background'],
    links: [{label: 'Open Homepage', route: `${cmsRoute}/${PATH_NAMES.ADMIN_CMS_HOMEPAGE}`}],
    roles: CMS_ACCESS_ROLES,
    steps: [
      {
        text: 'Open Homepage and review the current hero copy, slideshow, and featured-article mode.',
        link: {label: 'Open Homepage', route: `${cmsRoute}/${PATH_NAMES.ADMIN_CMS_HOMEPAGE}`}
      },
      {text: 'Choose automatic featured-post selection or an explicit selected post.'},
      {text: 'Adjust headline, summary, slides, and timing while keeping the public first viewport readable.'},
      {text: 'Enable the featured post background only when that post has a suitable full-screen background asset.'},
      {text: 'Save, then open the public homepage to verify desktop and mobile presentation.'},
    ],
    summary: 'Control hero copy, slideshow behavior, article selection, and optional post backgrounds on the public homepage.',
    title: 'Update the homepage hero',
  },
  {
    category: 'site-content',
    id: 'manage-daily-discovery-question-sets',
    keywords: [
      'daily discovery',
      'quiz',
      'question set',
      'json upload',
      'replace',
      'revision',
      'live date',
      'importer',
      'manual review',
    ],
    links: [{label: 'Open Daily Discovery', route: `${cmsRoute}/${PATH_NAMES.ADMIN_CMS_DAILY_DISCOVERY}`}],
    roles: CMS_ACCESS_ROLES,
    steps: [
      {text: 'Generate and review a dated daily-discovery-YYYY-MM-DD.json file outside the website repository. Never copy an answer-bearing file into Angular assets or source control.'},
      {
        text: 'Open Daily Discovery, choose the Eastern date, then use Upload dated JSON or Paste JSON to load the complete generated file.',
        link: {label: 'Open Daily Discovery', route: `${cmsRoute}/${PATH_NAMES.ADMIN_CMS_DAILY_DISCOVERY}`}
      },
      {text: 'Review every prompt, hint, type, difficulty, estimated time, choice, correct answer, explanation, source slug, and evidence field. Imported multiple-choice sets can use Load existing into editor; automatic title-gap sets require a replacement JSON file.'},
      {text: 'Choose Validate draft after every edit. The server verifies the complete schema and every source against currently published posts; saving remains locked until the current draft passes.'},
      {text: 'Approve draft or manual-review input when prompted. Replacing today’s live set also requires explicit confirmation and the same ordered question IDs so reader progress and awards remain stable.'},
      {text: 'Choose Create set or Replace revision only after validation. A stale revision is rejected instead of overwriting another change; successful saves create an audit event and idempotent retry receipt.'},
      {text: 'Use Download edited JSON when the reviewed draft should also be retained outside the site, then open the public homepage to verify the saved interaction.'},
    ],
    summary: 'Upload, edit, validate, create, inspect, or safely replace private Daily Discovery question sets.',
    title: 'Manage Daily Discovery question sets',
  },
  {
    category: 'site-content',
    id: 'manage-topic-hubs',
    keywords: ['topics', 'topic hub', 'slug', 'search', 'homepage', 'seed defaults', 'publish'],
    links: [{label: 'Open Topics', route: `${cmsRoute}/${PATH_NAMES.ADMIN_CMS_TOPICS}`}],
    roles: CMS_ACCESS_ROLES,
    steps: [
      {
        text: 'Open Topics and search for the hub before adding a new one.',
        link: {label: 'Open Topics', route: `${cmsRoute}/${PATH_NAMES.ADMIN_CMS_TOPICS}`}
      },
      {text: 'Create or edit its name, stable slug, description, image, guide content, order, and publication state.'},
      {text: 'Use default seeding only when Firestore does not already contain the intended managed topics.'},
      {text: 'Publish the topic when it is ready for the homepage, public topic route, and site search.'},
      {text: 'Avoid changing established slugs without a redirect and migration plan.'},
    ],
    summary: 'Create and order the topic hubs that drive homepage discovery, topic pages, and search entries.',
    title: 'Manage topic hubs',
  },
  {
    category: 'site-content',
    id: 'curate-recommended-links',
    keywords: ['recommended links', 'homepage links', 'featured slot', 'external link', 'seed defaults'],
    links: [{label: 'Open Recommended Links', route: `${cmsRoute}/${PATH_NAMES.ADMIN_CMS_RECOMMENDED_LINKS}`}],
    roles: CMS_ACCESS_ROLES,
    steps: [
      {
        text: 'Open Recommended Links and search for the destination before creating a duplicate.',
        link: {label: 'Open Recommended Links', route: `${cmsRoute}/${PATH_NAMES.ADMIN_CMS_RECOMMENDED_LINKS}`}
      },
      {text: 'Add or edit the label, URL, description, image, publication state, and display order.'},
      {text: 'Assign featured slots deliberately. Saving into an occupied slot removes that slot from the previous link.'},
      {text: 'Keep only the three intended homepage recommendations featured and verify every external URL.'},
    ],
    summary: 'Maintain the published link collection and the three featured recommendations shown on the homepage.',
    title: 'Curate recommended links',
  },
  {
    category: 'media',
    featured: true,
    id: 'upload-and-reuse-media',
    keywords: [
      'media library',
      'upload',
      'image',
      'video',
      'folder',
      'tag',
      'alt text',
      'favorite',
      'resize',
      'canonical media deletion',
      'reference check',
      'deleting lease',
    ],
    links: [{label: 'Open Media Library', route: `${cmsRoute}/${PATH_NAMES.ADMIN_MEDIA_LIBRARY}`}],
    roles: MEDIA_LIBRARY_ACCESS_ROLES,
    steps: [
      {
        text: 'Open the Media Library and search by name, tag, folder, type, or status before uploading a duplicate.',
        link: {label: 'Open Media Library', route: `${cmsRoute}/${PATH_NAMES.ADMIN_MEDIA_LIBRARY}`}
      },
      {text: 'Upload the file, then review its display name, alt text, description, folder, tags, favorite state, and rating.'},
      {text: 'Use selection mode for batch rename, resize, tag, favorite, archive, or delete operations.'},
      {text: 'Reuse an existing asset from the post editor or social composer instead of uploading a second copy.'},
      {text: 'The Media Library Delete action changes the library record’s status and remains restorable. It does not physically remove canonical blog image objects.'},
      {text: 'Physical canonical deletion is a separate backend operation for admin, CMS admin, and media-manager roles. It requires a reference inspection and explicit confirmation, rejects referenced assets, and establishes a short deleting lease before object removal; this operation is not exposed as a Media Library screen control.'},
    ],
    summary: 'Find existing assets, upload new files, improve their metadata, and reuse them across publishing workflows.',
    title: 'Upload and reuse media',
  },
  {
    category: 'community',
    featured: true,
    id: 'review-public-submissions',
    keywords: [
      'submissions',
      'inbox',
      'contact message',
      'author pitch',
      'prospective author',
      'email alert',
      'smtp',
      'respond',
      'archive',
      'reject',
      'restore',
      'in review',
    ],
    links: [{label: 'Open Submissions', route: `${adminRoute}/${PATH_NAMES.ADMIN_SUBMISSIONS}`}],
    roles: CMS_ACCESS_ROLES,
    steps: [
      {
        text: 'Open Submissions and use New, In review, Responded, Archived, or Rejected to choose the queue you need.',
        link: {label: 'Open Submissions', route: `${adminRoute}/${PATH_NAMES.ADMIN_SUBMISSIONS}`}
      },
      {text: 'Select a record to review its private contact message or prospective-author profile and article proposal. Search checks names, email addresses, subjects, titles, and submitted text.'},
      {text: 'Choose Start review when you begin evaluating a new record. Status changes are written by a CMS-role-gated Function; the browser cannot edit submission records directly.'},
      {text: 'Write a subject and complete message under Respond, then choose Send response. A successful server-side delivery records the response and moves the submission to Responded. A failed delivery keeps the previous status so it cannot be mistaken for a completed reply.'},
      {text: 'Use Archive for a retained record that needs no further action or Reject for an editorial decline. Neither action deletes the submitted information; use Restore to review to continue the workflow.'},
      {text: 'Check the Alert field when a new record appears. Owner alerts contain only a summary and protected inbox link; the full submission remains in Firestore. A failed alert does not discard the accepted form, but it requires the Functions logs and SMTP configuration to be checked.'},
      {text: 'Email alerts and responses require the server-only SMTP secrets and authenticated sender DNS described in the environment documentation. Never place mail credentials in Angular environments or Firestore.'},
    ],
    summary: 'Review private contact and author submissions, send recorded email replies, and manage each retained workflow status.',
    title: 'Review and respond to submissions',
  },
  {
    category: 'community',
    featured: true,
    id: 'moderate-comments',
    keywords: ['comments', 'moderation', 'approve', 'hide', 'restore', 'delete', 'trusted commenter'],
    links: [{label: 'Open Comments', route: `${adminRoute}/${PATH_NAMES.ADMIN_COMMENTS}`}],
    roles: CMS_ACCESS_ROLES,
    steps: [
      {
        text: 'Open Comments and filter the queue by moderation status.',
        link: {label: 'Open Comments', route: `${adminRoute}/${PATH_NAMES.ADMIN_COMMENTS}`}
      },
      {text: 'Open the linked post when you need the article and discussion context.'},
      {text: 'Approve a valid pending comment, hide content that should leave the public thread, or restore a hidden comment.'},
      {text: 'Use Delete only when permanent removal is appropriate.'},
      {text: 'Remember that approving a first-time commenter can establish trust and awards any configured engagement points server-side.'},
    ],
    summary: 'Review pending discussion with post context, approve valid contributions, and remove unsafe or unwanted content.',
    title: 'Moderate comments',
  },
  {
    category: 'administration',
    id: 'manage-user-roles',
    keywords: ['users', 'roles', 'permissions', 'claims', 'admin', 'cms admin', 'content editor', 'media manager', 'viewer', 'view as user', 'impersonation', 'troubleshoot', 'diagnose access', 'disable sign in', 'restore sign in', 'delete auth user', 'fake email', 'suspicious signup', 'previous page', 'next page'],
    links: [{label: 'Open Users', route: `${adminRoute}/${PATH_NAMES.ADMIN_USERS}`}],
    roles: USER_MANAGEMENT_ACCESS_ROLES,
    steps: [
      {
        text: 'Open Users. User management is the default view and keeps the paginated Firebase Auth account list separate from the points leaderboard.',
        link: {label: 'Open Users', route: `${adminRoute}/${PATH_NAMES.ADMIN_USERS}`}
      },
      {text: 'Search the current page by email, display name, UID, or role. Use Previous and Next to move through Firebase Auth pages without replacing the account-management workflow.'},
      {text: 'Choose View as User, review the selected identity and roles, then choose Start View to test role-aware navigation, profile details, badges, and route access.'},
      {text: 'Keep the amber preview banner visible and choose Exit View when testing is complete. The preview does not replace Firebase authentication, so backend requests still use your admin account and must not be treated as permission-denial tests.'},
      {text: 'For a suspicious or fake signup, choose Disable Sign-In to deny future authentication while keeping the email registered. Existing short-lived ID tokens can remain usable until they expire.'},
      {text: 'Use Restore Sign-In only after confirming the account should regain access. Its providers and role claims remain attached while disabled.'},
      {text: 'Use Delete Auth User only when removing the Firebase Auth record is the intended outcome. Type the exact email or UID to confirm; site profile data and authored activity remain, and the email can register again.'},
      {text: 'Open the intended account and review all current role claims before changing access.'},
      {text: 'Grant the smallest role that covers the person’s responsibilities; reserve Admin for user and role management.'},
      {text: 'Save the role update, then ask the user to refresh their token—usually by signing out and back in.'},
      {text: 'Use a fresh View as session to verify the resulting sidebar and route access, then ask the real user to confirm backend behavior after their token refresh.'},
    ],
    summary: 'Review Firebase Auth accounts, control sign-in access, preview role-aware application views, and assign least-privilege custom claims.',
    title: 'Manage users and roles',
  },
  {
    category: 'administration',
    id: 'manage-user-points',
    keywords: ['users', 'points', 'point balance', 'points leaderboard', 'rank readers', 'sort points', 'reading points', 'share points', 'comment points', 'interaction points', 'add points', 'remove points', 'set total', 'reader rewards', 'manual adjustment', 'audit reason'],
    links: [{label: 'Open Users', route: `${adminRoute}/${PATH_NAMES.ADMIN_USERS}`}],
    roles: USER_MANAGEMENT_ACCESS_ROLES,
    steps: [
      {
        text: 'Open Users, then select Points leaderboard. This alternate section loads the complete user set for ranking without replacing the default account-management list.',
        link: {label: 'Open Users', route: `${adminRoute}/${PATH_NAMES.ADMIN_USERS}`}
      },
      {text: 'Inspect the leaderboard, ranked by current total by default. Choose User, Total, Reading, Shares, Comments, Daily, or Manual to sort the complete list in either direction; rank follows the active sort.'},
      {text: 'Use the visible point columns to compare each account’s current total with points earned from post reading, shares, approved comments, Daily Discovery, and the net manual adjustment. Choose Manage Points for the selected account’s full breakdown.'},
      {text: 'Choose Add, Remove, or Set total; enter a whole-number amount and a specific reason; inspect the balance summary; then choose Save Point Change. A removal cannot make the balance negative, and earned-category counters are not rewritten.'},
      {text: 'Every saved point change is user-visible account state. The server writes it atomically, records the signed adjustment and reason in point activity, and logs the acting and target UIDs.'},
      {text: 'Return to User management for roles, sign-in access, deletion, or account simulation; those controls are intentionally not duplicated in the points section.'},
    ],
    summary: 'Use the separate leaderboard section to compare reader balances and make reasoned, audited point adjustments.',
    title: 'Manage and adjust user points',
  },
] as const;

function normalizeSearchValue(value: string): string {
  return value.toLocaleLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}

export function canViewAdminGuideEntry(entry: AdminGuideEntry, roles: readonly string[]): boolean {
  return entry.roles.some(role => roles.includes(role));
}

export function searchAdminGuideEntries(
  entries: readonly AdminGuideEntry[],
  roles: readonly string[],
  query: string
): AdminGuideEntry[] {
  const allowedEntries = entries.filter(entry => canViewAdminGuideEntry(entry, roles));
  const normalizedQuery = normalizeSearchValue(query);

  if (!normalizedQuery) {
    return allowedEntries;
  }

  const queryTokens = normalizedQuery.split(' ');

  return allowedEntries.filter(entry => {
    const searchText = normalizeSearchValue([
      entry.title,
      entry.summary,
      ...entry.keywords,
      ...entry.steps.map(step => `${step.text} ${step.link?.label ?? ''}`),
      ...entry.links.map(link => link.label),
    ].join(' '));

    return queryTokens.every(token => searchText.includes(token));
  });
}
