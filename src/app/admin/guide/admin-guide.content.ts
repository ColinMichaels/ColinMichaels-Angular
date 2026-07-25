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
    keywords: ['post', 'draft', 'editor', 'editorjs', 'seo', 'preview', 'publish', 'cover image'],
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
      {text: 'Add a cover image and review Search & Sharing so the SEO title, description, and social preview are intentional.'},
      {text: 'Save a draft before generating a temporary preview link or sharing the draft for review.'},
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
    keywords: ['media library', 'upload', 'image', 'video', 'folder', 'tag', 'alt text', 'favorite', 'resize'],
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
      {text: 'Treat delete as destructive; confirm the asset is no longer referenced before removing it.'},
    ],
    summary: 'Find existing assets, upload new files, improve their metadata, and reuse them across publishing workflows.',
    title: 'Upload and reuse media',
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
    keywords: ['users', 'roles', 'permissions', 'claims', 'admin', 'cms admin', 'content editor', 'media manager', 'viewer', 'view as user', 'impersonation', 'troubleshoot', 'diagnose access'],
    links: [{label: 'Open Users', route: `${adminRoute}/${PATH_NAMES.ADMIN_USERS}`}],
    roles: USER_MANAGEMENT_ACCESS_ROLES,
    steps: [
      {
        text: 'Open Users and search by email, display name, UID, or role.',
        link: {label: 'Open Users', route: `${adminRoute}/${PATH_NAMES.ADMIN_USERS}`}
      },
      {text: 'Choose View as User, review the selected identity and roles, then choose Start View to test role-aware navigation, profile details, badges, and route access.'},
      {text: 'Keep the amber preview banner visible and choose Exit View when testing is complete. The preview does not replace Firebase authentication, so backend requests still use your admin account and must not be treated as permission-denial tests.'},
      {text: 'Open the intended account and review all current role claims before changing access.'},
      {text: 'Grant the smallest role that covers the person’s responsibilities; reserve Admin for user and role management.'},
      {text: 'Save the role update, then ask the user to refresh their token—usually by signing out and back in.'},
      {text: 'Use a fresh View as session to verify the resulting sidebar and route access, then ask the real user to confirm backend behavior after their token refresh.'},
    ],
    summary: 'Preview another user’s role-aware application view, assign least-privilege custom claims, and verify account access safely.',
    title: 'Manage user roles',
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
