import {randomUUID} from 'node:crypto';
import {existsSync, readFileSync} from 'node:fs';
import {resolve} from 'node:path';

import {getAuth, UserRecord} from 'firebase-admin/auth';
import {initializeApp} from 'firebase-admin/app';
import {FieldValue, getFirestore, Timestamp} from 'firebase-admin/firestore';
import {getStorage} from 'firebase-admin/storage';
import {logger} from 'firebase-functions';
import {defineSecret, defineString} from 'firebase-functions/params';
import {onDocumentWritten} from 'firebase-functions/v2/firestore';
import {HttpsError, onCall, onRequest} from 'firebase-functions/v2/https';
import {onSchedule} from 'firebase-functions/v2/scheduler';
import webPush = require('web-push');

import {
  BACKGROUND_LAB_DESCRIPTION,
  BLOG_FEED_DESCRIPTION,
  BLOG_SEARCH_DESCRIPTION,
  DEFAULT_LOCALE,
  HOMEPAGE_ANSWER_SUMMARY,
  HOMEPAGE_DESCRIPTION,
  HOMEPAGE_OG_IMAGE,
  HOMEPAGE_TITLE,
  LABS_DESCRIPTION,
  PERSON_JOB_TITLE,
  PERSON_KNOWS_ABOUT,
  PERSON_NAME,
  PERSON_PROFILE_DESCRIPTION,
  PERSON_SAME_AS,
  SEO_ENTITY_IDS,
  SITE_ALTERNATE_NAMES,
  SITE_NAME,
  SITE_SEARCH_DESCRIPTION,
  SITE_URL,
  createPreviewImageAlt,
  createSiteTitle,
} from './seo-site';
import {
  COMMENT_BODY_MAX_LENGTH,
  COMMENT_BODY_UNSAFE_CONTENT_MESSAGE,
  validatePlainTextCommentBody,
} from './comment-safety';
import {
  createPublishedPostPushPayload,
  createPushSubscriptionId,
  getPushDeliveryStatusCode,
  isNewlyPublishedPost,
  parsePushEndpoint,
  parseStoredPushSubscription,
  toWebPushSubscription,
} from './push-notifications';
import {
  CAT_CORNER_ADDICT_ROLE,
  CAT_CORNER_SOCIAL_CANCELLATION_REASON,
  addCatCornerAccessClaim,
  cancelQueuedCatCornerSocialAnnouncements,
  hasCatCornerAccessClaim,
  isHiddenCatCornerPost,
  shouldCancelPendingCatCornerSocialDeliveries,
} from './cat-corner';
import {
  canAcquireUserRoleMutationLease,
  ownsUserRoleMutationLease,
  replaceManagedUserRoleClaims,
} from './user-role-mutation';

initializeApp();

const FUNCTION_REGION = 'us-east1';
const MAX_PROMPT_LENGTH = 3000;
const MAX_TEXT_LENGTH = 12000;
const OPENAI_API_URL = 'https://api.openai.com/v1';
const YOUTUBE_API_URL = 'https://www.googleapis.com/youtube/v3';
const YOUTUBE_DEFAULT_MAX_RESULTS = 3;
const YOUTUBE_MAX_RESULTS = 6;
const YOUTUBE_FEED_CACHE_MS = 10 * 60 * 1000;
const USER_MANAGEMENT_DEFAULT_PAGE_SIZE = 50;
const USER_MANAGEMENT_MAX_PAGE_SIZE = 100;
const MAX_USER_MANAGEMENT_ROLES = 32;
const FIRESTORE_WRITE_BATCH_LIMIT = 450;
const ROLE_NAME_PATTERN = /^[A-Za-z][A-Za-z0-9_-]{0,63}$/;
const BASE_USER_ROLE = 'user';
const CMS_ACCESS_ROLES = ['admin', 'cmsAdmin', 'contentEditor'] as const;
const USER_MANAGEMENT_ACCESS_ROLES = ['admin'] as const;
const TRUSTED_COMMENT_ROLES = ['admin', 'cmsAdmin', 'contentEditor', 'trustedCommenter'] as const;
const BLOG_POSTS_COLLECTION = 'posts';
const AUTHORS_COLLECTION = 'authors';
const SOCIAL_OUTBOX_COLLECTION = 'socialOutbox';
const USERS_COLLECTION = 'users';
const USER_ROLE_MUTATION_LOCKS_COLLECTION = 'userRoleMutationLocks';
const POST_COMMENTS_COLLECTION = 'postComments';
const USER_POINT_EVENTS_COLLECTION = 'userPointEvents';
const SHARE_LINKS_COLLECTION = 'shareLinks';
const SHARE_LANDING_EVENTS_COLLECTION = 'shareLandingEvents';
const PUSH_SUBSCRIPTIONS_COLLECTION = 'pushSubscriptions';
const HOMEPAGE_SETTINGS_COLLECTION = 'homepageSettings';
const HOMEPAGE_SETTINGS_ID = 'home';
const SHARE_ID_PATTERN = /^[A-Za-z0-9_-]{20,80}$/;
const SHARE_LINK_TTL_MS = 180 * 24 * 60 * 60 * 1000;
const MAX_SHARE_LANDINGS_PER_LINK = 10000;
const HOMEPAGE_SOCIAL_IMAGE_TEMPLATE_VERSION = 'home-social-v1';
const POST_READ_POINTS = 5;
const POST_SHARE_POINTS = 10;
const COMMENT_APPROVED_POINTS = 15;
const MAX_COMMENT_THREAD_DEPTH = 12;
const MAX_PUSH_SUBSCRIPTIONS_PER_DELIVERY = 5000;
const PUSH_DELIVERY_CONCURRENCY = 100;
const USER_ROLE_MUTATION_LEASE_MS = 60 * 1000;
const USER_ROLE_MUTATION_MAX_ATTEMPTS = 8;
const USER_ROLE_MUTATION_RETRY_BASE_MS = 50;
const USER_ROLE_MUTATION_RETRY_MAX_MS = 400;
const DEFAULT_OG_IMAGE_WIDTH = 1200;
const DEFAULT_OG_IMAGE_HEIGHT = 630;
const SEO_INDEX_TEMPLATE_PATH = resolve(__dirname, '../seo-index.html');
const SITEMAP_CACHE_CONTROL = 'public, max-age=300, s-maxage=3600';
const FEED_CACHE_CONTROL = 'public, max-age=300, s-maxage=1800';
const STATIC_ASSET_PATH_PATTERN = /\.(?:avif|css|eot|gif|ico|jpe?g|js|json|map|mjs|mp3|ogg|otf|png|svg|ttf|txt|wav|webmanifest|webp|woff2?)$/i;
const TAXONOMY_SITEMAP_MIN_POSTS = 2;
const TAG_SITEMAP_MIN_POSTS = 3;
const SITEMAP_REVIEW_URL_LIMIT = 180;
const DEFAULT_AUTHOR_ID = 'colin-michaels';
const DEFAULT_AUTHOR_SLUG = 'colin-michaels';
const OS_ROUTE_PREFIXES = ['/os', '/external'] as const;
const OS_ROUTES = ['/login', '/boot', '/sleep'] as const;
const ADMIN_ROUTE_PREFIXES = ['/admin'] as const;
const TOPIC_HUBS = [
  {
    slug: 'ai-setup',
    title: createSiteTitle('AI Setup Guides'),
    heading: 'AI Setup Guides',
    description: 'Practical setup guides for ChatGPT, Claude, Copilot, Gemini, prompting, projects, and AI-assisted workflows.',
    image: '/assets/images/topics/ai-setup.webp',
    imageAlt: 'A modular AI workspace connected by a precise cyan workflow path.',
    terms: ['ai', 'chatgpt', 'claude', 'copilot', 'gemini', 'prompting', 'ai tools', 'ai workflow', 'productivity'],
    assetTitle: 'AI Setup Checklist',
    assetIntro: 'A practical starting checklist for setting up AI tools so they support real work instead of becoming another tab to babysit.',
    assetItems: [
      'Pick the job before the tool: drafting, research, code review, planning, editing, image ideation, or task triage.',
      'Create reusable project instructions with the goal, audience, tone, constraints, examples, and review standards.',
      'Keep source material close so notes, documents, transcripts, or code snippets govern the answer.',
      'Ask for verification steps such as assumptions, source checks, tests, or human review points.',
      'Set privacy boundaries for credentials, private client data, health details, and financial identifiers.',
    ],
  },
  {
    slug: 'recovery-planning',
    title: createSiteTitle('Recovery & Medical Planning Resources'),
    heading: 'Recovery & Medical Planning Resources',
    description: 'Personal recovery notes, emergency planning resources, and practical lessons from open-heart surgery recovery.',
    image: '/assets/images/topics/recovery-planning.webp',
    imageAlt: 'A calm recovery-planning journal beside a gentle teal route line.',
    terms: ['recovery', 'health', 'medical', 'heart surgery', 'open heart surgery', 'cardiac', 'insurance', 'planning'],
    assetTitle: 'Recovery And Emergency Planning Checklist',
    assetIntro: 'A patient-perspective organizer for practical details that become hard to find when appointments, recovery limits, and paperwork all collide.',
    assetItems: [
      'Centralize emergency contacts, pharmacy details, insurance contacts, and backup contacts.',
      'Maintain medication, allergy, discharge instruction, restriction, and follow-up question notes.',
      'Prepare appointment questions and bring someone who can help listen and take notes.',
      'Track symptoms, activity limits, sleep, milestones, and care-team watch points.',
      'Confirm medical, legal, insurance, and medication choices with qualified professionals.',
    ],
  },
  {
    slug: 'angular-firebase-architecture',
    title: createSiteTitle('Angular & Firebase Architecture Notes'),
    heading: 'Angular & Firebase Architecture Notes',
    description: 'Implementation notes on Angular, Firebase, CMS workflows, route SEO, and reusable frontend architecture.',
    image: '/assets/images/topics/angular-firebase-architecture.webp',
    imageAlt: 'Layered blue architecture plans connecting routes, interfaces, and data nodes.',
    terms: ['angular', 'firebase', 'architecture', 'cms', 'editor.js', 'typescript', 'web development'],
    assetTitle: 'Angular And Firebase Architecture Note',
    assetIntro: 'A compact architecture reference for keeping a public Angular/Firebase site crawlable, maintainable, and safe to evolve.',
    assetItems: [
      'Separate public, admin, labs, and OS routes into clear route and folder boundaries.',
      'Render crawler metadata through Firebase Functions with route classification, real 404s, and fallback content.',
      'Keep sitemap policy explicit so low-count tags and categories do not flood the sitemap.',
      'Preserve CMS contracts for Editor.js blocks, SEO fields, statuses, media attachments, and previews.',
      'Validate with app build, Functions build, route checks, metadata checks, and post-deploy curl checks.',
    ],
  },
  {
    slug: 'labs-projects',
    title: createSiteTitle('Labs & Project Demos'),
    heading: 'Labs & Project Demos',
    description: `Interactive demos, browser experiments, UI systems, and public notes from ${PERSON_NAME} project labs.`,
    image: '/assets/images/topics/labs-projects.webp',
    imageAlt: 'A violet-lit prototype workbench filled with modular browser experiments.',
    terms: ['labs', 'projects', 'game development', 'browser game', 'creative coding', 'music tools', 'web app'],
    assetTitle: 'Labs And Demo Showcase Checklist',
    assetIntro: 'A simple publishing checklist for turning experiments into useful public demos without blurring them into production page logic.',
    assetItems: [
      'State what the demo tests, what is finished, what is rough, and what someone should try first.',
      'Keep experimental code isolated in labs, playground, or archive boundaries.',
      'Link demos to a writeup, changelog note, screenshot, or project post when context helps.',
      'Lazy-load heavier demos and keep keyboard, mobile, and performance basics intact.',
      'Promote only durable work while keeping unfinished or risky ideas clearly labeled.',
    ],
  },
  {
    slug: 'gadgets-toys',
    title: createSiteTitle('Gadgets & Toys'),
    heading: 'Gadgets & Toys',
    description: 'Hands-on reviews, wish-list notes, and interesting gadgets, toys, and technology found online.',
    image: '/assets/images/topics/gadgets-toys.webp',
    imageAlt: 'A curated amber-lit workbench with a handheld game device, desk robot, toy drone, puzzle, and pocket gadget.',
    terms: [
      'gadget',
      'gadgets',
      'toy',
      'toys',
      'tech gear',
      'cool tech',
      'consumer tech',
      'product review',
      'product reviews',
      'electronics',
      'smart home',
      'wearables',
      'gaming hardware',
    ],
    assetTitle: 'Gadget Review Field Notes',
    assetIntro: 'A simple way to separate what I own, what I want to try, and what merely caught my eye while keeping each recommendation useful and honest.',
    assetItems: [
      'State whether I own it, borrowed it, tried it briefly, want it, or simply found it interesting online.',
      'Explain the problem it solves, the playful idea behind it, or the design detail that makes it stand out.',
      'Share setup, build quality, daily use, limitations, and surprises when hands-on experience is available.',
      'Treat prices, stock, crowdfunding promises, and release dates as time-sensitive details.',
      'Disclose gifts, review units, sponsorships, and affiliate links while separating enthusiasm from the verdict.',
    ],
  },
] as const;
const openAiApiKey = defineSecret('OPENAI_API_KEY');
const youtubeApiKey = defineSecret('YOUTUBE_API_KEY');
const openAiTextModel = defineString('OPENAI_TEXT_MODEL', {default: 'gpt-5.5'});
const openAiImageModel = defineString('OPENAI_IMAGE_MODEL', {default: 'gpt-image-2'});
const youtubeChannelId = defineString('YOUTUBE_CHANNEL_ID', {default: ''});
const webPushPublicKey = defineString('WEB_PUSH_PUBLIC_KEY', {default: ''});
const webPushSubject = defineString('WEB_PUSH_SUBJECT', {default: 'mailto:hello@colinmichaels.com'});
const webPushPrivateKey = defineSecret('WEB_PUSH_PRIVATE_KEY');
const SITE_CALLABLE_CORS_ORIGINS = [
  'http://localhost:4200',
  'http://127.0.0.1:4200',
  'https://colinmichaels.com',
  'https://www.colinmichaels.com',
  'https://colinmichaels.firebaseapp.com',
  'https://colinmichaels.web.app',
  /^http:\/\/localhost:\d+$/,
  /^http:\/\/127\.0\.0\.1:\d+$/,
];

let youtubeFeedCache: YoutubeFeedCacheEntry | null = null;

type SocialDeliveryChannel = 'notify' | 'youtube' | 'facebook' | 'instagram' | 'linkedin';

interface SocialAnnouncementDocument {
  id: string;
  channel: SocialDeliveryChannel;
  message: string;
  scheduledAt: string;
  status: 'scheduled';
  createdAt: string;
  updatedAt: string;
  linkUrl?: string;
}

const SOCIAL_DELIVERY_CHANNELS = new Set<SocialDeliveryChannel>([
  'notify',
  'youtube',
  'facebook',
  'instagram',
  'linkedin',
]);

function getScheduledSocialAnnouncements(value: unknown, now: Date): readonly SocialAnnouncementDocument[] {
  if (!isRecord(value) || !Array.isArray(value['announcements'])) {
    return [];
  }

  return value['announcements'].filter((announcement): announcement is SocialAnnouncementDocument => {
    if (!isRecord(announcement)) {
      return false;
    }

    const scheduledAt = typeof announcement['scheduledAt'] === 'string' ? announcement['scheduledAt'] : '';
    const scheduledTime = new Date(scheduledAt).getTime();
    const channel = announcement['channel'];

    return typeof announcement['id'] === 'string'
      && typeof channel === 'string'
      && SOCIAL_DELIVERY_CHANNELS.has(channel as SocialDeliveryChannel)
      && typeof announcement['message'] === 'string'
      && announcement['message'].trim().length > 0
      && announcement['status'] === 'scheduled'
      && Number.isFinite(scheduledTime)
      && scheduledTime <= now.getTime()
      && typeof announcement['createdAt'] === 'string'
      && typeof announcement['updatedAt'] === 'string'
      && (announcement['linkUrl'] === undefined || typeof announcement['linkUrl'] === 'string');
  });
}

async function queueDueSocialAnnouncements(now: Date): Promise<number> {
  const firestore = getFirestore();
  const nowIso = now.toISOString();
  const publishedPostsSnapshot = await firestore
    .collection(BLOG_POSTS_COLLECTION)
    .where('status', '==', 'published')
    .get();
  let queuedCount = 0;

  for (const postSnapshot of publishedPostsSnapshot.docs) {
    if (isHiddenCatCornerPost(postSnapshot.data())) {
      const announcements = postSnapshot.get('socialPromotion')?.['announcements'];

      if (
        Array.isArray(announcements)
        && announcements.some(announcement => isRecord(announcement) && announcement['status'] === 'queued')
      ) {
        await cancelPendingSocialDeliveriesForHiddenCatCornerPost(postSnapshot.id);
      }
      continue;
    }

    if (getScheduledSocialAnnouncements(postSnapshot.get('socialPromotion'), now).length === 0) {
      continue;
    }

    const queuedForPost = await firestore.runTransaction(async transaction => {
      const currentSnapshot = await transaction.get(postSnapshot.ref);
      const currentPost = currentSnapshot.data();

      if (
        !currentPost
        || currentPost['status'] !== 'published'
        || isHiddenCatCornerPost(currentPost)
      ) {
        return 0;
      }

      const socialPromotion = currentPost['socialPromotion'];
      const dueAnnouncements = getScheduledSocialAnnouncements(socialPromotion, now);

      if (dueAnnouncements.length === 0 || !isRecord(socialPromotion) || !Array.isArray(socialPromotion['announcements'])) {
        return 0;
      }

      if (dueAnnouncements.length >= FIRESTORE_WRITE_BATCH_LIMIT) {
        logger.error('Too many social announcements are due on one post.', {
          postId: currentSnapshot.id,
          dueCount: dueAnnouncements.length,
        });
        return 0;
      }

      const dueAnnouncementIds = new Set(dueAnnouncements.map(announcement => announcement.id));
      const slug = typeof currentPost['slug'] === 'string' ? currentPost['slug'] : '';
      const postTitle = typeof currentPost['title'] === 'string' ? currentPost['title'] : 'Untitled Post';
      const defaultLinkUrl = slug ? `${SITE_URL}/blog/${slug}` : SITE_URL;
      const announcements = socialPromotion['announcements'].map(announcement => {
        if (!isRecord(announcement) || typeof announcement['id'] !== 'string' || !dueAnnouncementIds.has(announcement['id'])) {
          return announcement;
        }

        return {
          ...announcement,
          status: 'queued',
          updatedAt: nowIso,
        };
      });

      for (const announcement of dueAnnouncements) {
        const deliveryId = `${currentSnapshot.id}__${announcement.id}`;
        const deliveryRef = firestore.collection(SOCIAL_OUTBOX_COLLECTION).doc(deliveryId);

        transaction.set(deliveryRef, {
          id: deliveryId,
          postId: currentSnapshot.id,
          postSlug: slug,
          postTitle,
          announcementId: announcement.id,
          channel: announcement.channel,
          message: announcement.message.trim(),
          linkUrl: announcement.linkUrl?.trim() || defaultLinkUrl,
          scheduledAt: announcement.scheduledAt,
          status: 'pending',
          attemptCount: 0,
          createdAt: nowIso,
          updatedAt: nowIso,
        }, {merge: false});
      }

      transaction.update(postSnapshot.ref, {
        socialPromotion: {announcements},
        updatedAt: nowIso,
        syncedAt: FieldValue.serverTimestamp(),
      });
      return dueAnnouncements.length;
    });
    queuedCount += queuedForPost;
  }

  return queuedCount;
}

async function cancelPendingSocialDeliveriesForHiddenCatCornerPost(postId: string): Promise<number> {
  const firestore = getFirestore();
  const pendingSnapshot = await firestore
    .collection(SOCIAL_OUTBOX_COLLECTION)
    .where('postId', '==', postId)
    .get();
  const pendingDeliveries = pendingSnapshot.docs.filter(snapshot => snapshot.get('status') === 'pending');
  const hiddenPostDeliveries = pendingSnapshot.docs.filter(snapshot => (
    snapshot.get('status') === 'pending'
    || (
      snapshot.get('status') === 'cancelled'
      && snapshot.get('cancellationReason') === 'cat_corner_post_hidden'
    )
  ));

  if (hiddenPostDeliveries.length === 0) {
    return 0;
  }

  const updatedAt = new Date().toISOString();

  // `socialOutbox.status` is the delivery boundary in this repository. Marking these
  // entries cancelled keeps connector workers from treating an old pending record as deliverable.
  for (let index = 0; index < pendingDeliveries.length; index += FIRESTORE_WRITE_BATCH_LIMIT) {
    const batch = firestore.batch();
    const chunk = pendingDeliveries.slice(index, index + FIRESTORE_WRITE_BATCH_LIMIT);

    for (const delivery of chunk) {
      batch.update(delivery.ref, {
        status: 'cancelled',
        cancellationReason: 'cat_corner_post_hidden',
        failureReason: CAT_CORNER_SOCIAL_CANCELLATION_REASON,
        cancelledAt: updatedAt,
        updatedAt,
      });
    }

    await batch.commit();
  }

  // Include earlier cancelled entries so an at-least-once retry can finish reconciling
  // post announcement state after a partial multi-batch outbox cancellation.
  const cancelledAnnouncementIds = hiddenPostDeliveries
    .map(delivery => getTrimmedString(delivery.get('announcementId')))
    .filter(Boolean);
  const postRef = firestore.collection(BLOG_POSTS_COLLECTION).doc(postId);

  if (cancelledAnnouncementIds.length > 0) {
    await firestore.runTransaction(async transaction => {
      const postSnapshot = await transaction.get(postRef);

      if (!postSnapshot.exists) {
        return;
      }

      const socialPromotion = postSnapshot.get('socialPromotion');

      if (!isRecord(socialPromotion) || !Array.isArray(socialPromotion['announcements'])) {
        return;
      }

      const announcements = socialPromotion['announcements'];
      const nextAnnouncements = cancelQueuedCatCornerSocialAnnouncements(
        announcements,
        cancelledAnnouncementIds,
        updatedAt
      );

      if (nextAnnouncements.every((announcement, index) => announcement === announcements[index])) {
        return;
      }

      transaction.update(postRef, {
        'socialPromotion.announcements': nextAnnouncements,
        updatedAt,
        syncedAt: FieldValue.serverTimestamp(),
      });
    });
  }

  if (pendingDeliveries.length > 0) {
    logger.info('Cancelled pending social deliveries for a hidden Cat Corner post.', {
      event: 'cat_corner_hidden_post_social_cancelled',
      postId,
      cancelledCount: pendingDeliveries.length,
      updatedAt,
    });
  }

  return pendingDeliveries.length;
}

export const publishScheduledPosts = onSchedule(
  {
    region: FUNCTION_REGION,
    schedule: 'every 5 minutes',
    timeZone: 'America/New_York',
  },
  async () => {
    const firestore = getFirestore();
    const now = new Date();
    const nowIso = now.toISOString();
    const scheduledPostsSnapshot = await firestore
      .collection(BLOG_POSTS_COLLECTION)
      .where('status', '==', 'scheduled')
      .get();
    const duePosts = scheduledPostsSnapshot.docs.filter(postSnapshot => {
      const publishedAt = postSnapshot.get('publishedAt');

      if (typeof publishedAt !== 'string') {
        return false;
      }

      const publishTime = new Date(publishedAt).getTime();
      return Number.isFinite(publishTime) && publishTime <= now.getTime();
    });

    if (duePosts.length === 0) {
      logger.info('No scheduled posts are ready to publish.', {
        scheduledCount: scheduledPostsSnapshot.size,
      });
    } else {
      for (let index = 0; index < duePosts.length; index += FIRESTORE_WRITE_BATCH_LIMIT) {
        const batch = firestore.batch();
        const chunk = duePosts.slice(index, index + FIRESTORE_WRITE_BATCH_LIMIT);

        for (const postSnapshot of chunk) {
          batch.update(postSnapshot.ref, {
            status: 'published',
            updatedAt: nowIso,
            syncedAt: FieldValue.serverTimestamp(),
          });
        }

        await batch.commit();
      }

      logger.info('Published scheduled blog posts.', {
        publishedCount: duePosts.length,
        postIds: duePosts.map(postSnapshot => postSnapshot.id),
      });
    }

    const queuedSocialAnnouncementCount = await queueDueSocialAnnouncements(now);
    logger.info('Processed due social announcements.', {
      queuedCount: queuedSocialAnnouncementCount,
    });
  }
);

export const notifyPublishedPost = onDocumentWritten(
  {
    document: `${BLOG_POSTS_COLLECTION}/{postId}`,
    region: FUNCTION_REGION,
    timeoutSeconds: 300,
    memory: '512MiB',
    secrets: [webPushPrivateKey],
  },
  async event => {
    const before = event.data?.before.exists ? event.data.before.data() : undefined;
    const after = event.data?.after.exists ? event.data.after.data() : undefined;

    if (shouldCancelPendingCatCornerSocialDeliveries(before, after)) {
      await cancelPendingSocialDeliveriesForHiddenCatCornerPost(event.params.postId);
    }

    if (!isNewlyPublishedPost(before, after) || !after) {
      return;
    }

    if (isHiddenCatCornerPost(after)) {
      logger.info('Skipped new-post push delivery for a hidden Cat Corner post.', {
        event: 'cat_corner_hidden_post_push_skipped',
        postId: event.params.postId,
      });
      return;
    }

    const publicKey = webPushPublicKey.value().trim();
    const privateKey = webPushPrivateKey.value().trim();
    const subject = webPushSubject.value().trim();
    const postId = event.params.postId;
    const slug = getTrimmedString(after['slug']);
    const title = getTrimmedString(after['title']);
    const excerpt = getTrimmedString(after['excerpt']);
    const publishedAt = getTrimmedString(after['publishedAt']) || null;

    if (!publicKey || !privateKey || !subject) {
      logger.warn('Skipped new-post push delivery because VAPID configuration is incomplete.', {postId});
      return;
    }

    if (!slug || !title) {
      logger.warn('Skipped new-post push delivery because public post metadata is incomplete.', {postId});
      return;
    }

    const firestore = getFirestore();
    const subscriptionsSnapshot = await firestore
      .collection(PUSH_SUBSCRIPTIONS_COLLECTION)
      .limit(MAX_PUSH_SUBSCRIPTIONS_PER_DELIVERY)
      .get();

    if (subscriptionsSnapshot.empty) {
      logger.info('No push subscribers are registered for the newly published post.', {postId, slug});
      return;
    }

    webPush.setVapidDetails(subject, publicKey, privateKey);
    const payload = createPublishedPostPushPayload({id: postId, slug, title, excerpt, publishedAt});
    let deliveredCount = 0;
    let removedCount = 0;
    let failedCount = 0;

    // Bound each parallel batch so a large subscriber list cannot exhaust one function instance.
    for (let index = 0; index < subscriptionsSnapshot.docs.length; index += PUSH_DELIVERY_CONCURRENCY) {
      const chunk = subscriptionsSnapshot.docs.slice(index, index + PUSH_DELIVERY_CONCURRENCY);

      await Promise.all(chunk.map(async subscriptionSnapshot => {
        const subscription = parseStoredPushSubscription(subscriptionSnapshot.get('subscription'));

        if (!subscription) {
          await subscriptionSnapshot.ref.delete();
          removedCount += 1;
          return;
        }

        try {
          await webPush.sendNotification(toWebPushSubscription(subscription), payload, {
            TTL: 24 * 60 * 60,
            urgency: 'normal',
          });
          deliveredCount += 1;
        } catch (error) {
          const statusCode = getPushDeliveryStatusCode(error);

          if (statusCode === 404 || statusCode === 410) {
            await subscriptionSnapshot.ref.delete();
            removedCount += 1;
            return;
          }

          failedCount += 1;
          logger.warn('Push delivery failed for one subscription.', {
            postId,
            subscriptionId: subscriptionSnapshot.id,
            statusCode,
          });
        }
      }));
    }

    logger.info('Processed new-post push delivery.', {
      postId,
      slug,
      subscriberCount: subscriptionsSnapshot.size,
      deliveredCount,
      removedCount,
      failedCount,
      truncated: subscriptionsSnapshot.size === MAX_PUSH_SUBSCRIPTIONS_PER_DELIVERY,
    });
  }
);

interface SeoArticleMetadata {
  publishedAt?: string;
  modifiedAt?: string;
  author?: string;
  section?: string;
  tags?: readonly string[];
}

interface SeoMetadata {
  title: string;
  description: string;
  path: string;
  image: string;
  imageAlt: string;
  imageWidth?: number;
  imageHeight?: number;
  type: 'website' | 'article';
  robots?: string;
  article?: SeoArticleMetadata;
  structuredData?: unknown;
  statusCode?: number;
  cacheControl?: string;
  fallbackHtml?: string;
}

interface SeoBlogPostDocument {
  id: string;
  featured: boolean;
  catCornerHidden: boolean;
  slug: string;
  title: string;
  excerpt: string;
  coverImage: string;
  thumbnailImage: string;
  authorName: string;
  authorId: string;
  authorSlug: string;
  authorUrl: string;
  categories: readonly string[];
  tags: readonly string[];
  seoTitle: string;
  seoDescription: string;
  seoCanonical: string;
  seoOpenGraphImage: string;
  seoOpenGraphImageWidth: number | null;
  seoOpenGraphImageHeight: number | null;
  ogTitle: string;
  ogDescription: string;
  ogImage: string;
  ogImageAlt: string;
  ogImageWidth: number | null;
  ogImageHeight: number | null;
  updatedAt: string;
  publishedAt: string | null;
  imageAlt: string;
  blocks: readonly BlogContentBlock[];
}

type HomepageFeaturedPostMode = 'featured' | 'selected';

interface HomepageSocialSettings {
  status: 'draft' | 'published';
  featuredPostMode: HomepageFeaturedPostMode;
  featuredPostId: string | null;
}

interface SitemapUrl {
  path: string;
  lastmod?: string;
}

interface SitemapBlogPostDocument {
  slug: string;
  authorId: string;
  authorSlug: string;
  categories: readonly string[];
  subcategories: readonly string[];
  tags: readonly string[];
  updatedAt: string;
  publishedAt: string | null;
}

interface SeoAuthorDocument {
  id: string;
  slug: string;
  name: string;
  title: string;
  shortBio: string;
  bio: string;
  imageUrl: string;
  imageAlt: string;
  location: string;
  externalProfiles: readonly string[];
  updatedAt: string;
}

interface BlogBlockData {
  text?: string;
  level?: 2 | 3;
  url?: string;
  alt?: string;
  caption?: string;
  provider?: string;
  embedUrl?: string;
  items?: readonly string[];
  ordered?: boolean;
  language?: string;
  code?: string;
  variant?: string;
  attribution?: string;
}

interface BlogContentBlock {
  id: string;
  type: string;
  data: BlogBlockData;
}

interface BlogAssistantContext {
  title: string;
  excerpt: string;
  seoTitle: string;
  seoDescription: string;
  categories: readonly string[];
  tags: readonly string[];
  blocks: readonly BlogContentBlock[];
}

interface BlogMetadataSuggestion {
  id: string;
  title: string;
  description: string;
  seoTitle: string;
  seoDescription: string;
  categories: readonly string[];
  tags: readonly string[];
  rationale: string;
}

interface BlogThumbnailSuggestion {
  id: string;
  prompt: string;
  altText: string;
  style: string;
}

interface BlogAssistantResult {
  generatedAt: string;
  source: 'backend';
  suggestions: readonly BlogMetadataSuggestion[];
  thumbnailSuggestions: readonly BlogThumbnailSuggestion[];
}

interface BlogThumbnailGenerationRequest {
  prompt: string;
  altText: string;
  style: string;
  postId: string;
  slug: string;
}

interface BlogStoredThumbnail {
  generatedAt: string;
  source: 'backend';
  prompt: string;
  altText: string;
  style: string;
  contentType: string;
  storagePath: string;
  downloadUrl: string;
  model: string;
}

interface YoutubeVideo {
  id: string;
  title: string;
  description: string;
  publishedAt: string;
  thumbnailUrl: string;
  thumbnailAlt: string;
  videoUrl: string;
}

interface YoutubeFeedResponse {
  fetchedAt: string;
  source: 'youtube-api';
  channelId: string;
  channelTitle: string;
  channelUrl: string;
  videos: readonly YoutubeVideo[];
}

interface YoutubeFeedCacheEntry {
  key: string;
  expiresAt: number;
  response: YoutubeFeedResponse;
}

interface YoutubeChannelDetails {
  channelId: string;
  channelTitle: string;
  uploadsPlaylistId: string;
}

interface YoutubeChannelsResponse {
  items?: Array<{
    id?: string;
    snippet?: {
      title?: string;
    };
    contentDetails?: {
      relatedPlaylists?: {
        uploads?: string;
      };
    };
  }>;
}

interface YoutubePlaylistItemsResponse {
  items?: YoutubePlaylistItem[];
}

interface YoutubePlaylistItem {
  snippet?: {
    title?: string;
    description?: string;
    publishedAt?: string;
    thumbnails?: YoutubeThumbnails;
    resourceId?: {
      videoId?: string;
    };
  };
  contentDetails?: {
    videoId?: string;
    videoPublishedAt?: string;
  };
}

interface YoutubeThumbnails {
  default?: YoutubeThumbnail;
  medium?: YoutubeThumbnail;
  high?: YoutubeThumbnail;
  standard?: YoutubeThumbnail;
  maxres?: YoutubeThumbnail;
}

interface YoutubeThumbnail {
  url?: string;
}

interface YoutubeErrorResponse {
  error?: {
    code?: number;
    message?: string;
    status?: string;
  };
}

interface OpenAiErrorResponse {
  error?: {
    message?: string;
    type?: string;
  };
}

interface OpenAiResponsePayload {
  output_text?: string;
  output?: Array<{
    content?: Array<{
      text?: string;
      type?: string;
    }>;
  }>;
}

interface OpenAiImagePayload {
  data?: Array<{
    b64_json?: string;
  }>;
}

interface AdminCallableAuth {
  uid: string;
  token: Record<string, unknown>;
}

interface AdminManagedUser {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
  disabled: boolean;
  emailVerified: boolean;
  createdAt: string | null;
  lastSignInAt: string | null;
  roles: readonly string[];
  customClaims: Record<string, unknown>;
}

type UserCommentTrustStatus = 'new' | 'trusted' | 'blocked';
type BlogCommentStatus = 'pending' | 'approved' | 'hidden' | 'deleted';
type PointEventType = 'post_read' | 'post_share' | 'site_share' | 'comment_approved';
type CommentModerationAction = 'approve' | 'hide' | 'restore' | 'delete';

interface UserAccountPoints {
  total: number;
  postReads: number;
  shares: number;
  approvedComments: number;
}

interface UserAccountDocument {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
  providerIds: readonly string[];
  emailVerified: boolean;
  roles: readonly string[];
  commentTrustStatus: UserCommentTrustStatus;
  points: UserAccountPoints;
  createdAt: string;
  updatedAt: string;
  lastSeenAt: string;
}

interface BlogCommentDocument {
  id: string;
  postId: string;
  postSlug: string;
  parentCommentId?: string | null;
  parentAuthorDisplayName?: string | null;
  threadRootId: string;
  threadDepth: number;
  authorUid: string;
  authorDisplayName: string | null;
  authorPhotoURL: string | null;
  body: string;
  status: BlogCommentStatus;
  createdAt: string;
  updatedAt: string;
  moderatedAt?: string | null;
  moderatedBy?: string | null;
}

interface PointAwardResult {
  awarded: boolean;
  points: number;
  total: number;
}

interface AdminUsersResponse {
  users: readonly AdminManagedUser[];
  nextPageToken: string | null;
  fetchedAt: string;
}

interface UpdateAdminUserRolesResponse {
  user: AdminManagedUser;
  updatedAt: string;
}

interface CatCornerAccessClaimResponse {
  role: typeof CAT_CORNER_ADDICT_ROLE;
  alreadyMember: boolean;
  updatedAt: string;
}

const metadataSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['suggestions', 'thumbnailSuggestions'],
  properties: {
    suggestions: {
      type: 'array',
      minItems: 1,
      maxItems: 3,
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['id', 'title', 'description', 'seoTitle', 'seoDescription', 'categories', 'tags', 'rationale'],
        properties: {
          id: {type: 'string'},
          title: {type: 'string'},
          description: {type: 'string'},
          seoTitle: {type: 'string'},
          seoDescription: {type: 'string'},
          categories: {
            type: 'array',
            items: {type: 'string'},
          },
          tags: {
            type: 'array',
            items: {type: 'string'},
          },
          rationale: {type: 'string'},
        },
      },
    },
    thumbnailSuggestions: {
      type: 'array',
      minItems: 1,
      maxItems: 2,
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['id', 'prompt', 'altText', 'style'],
        properties: {
          id: {type: 'string'},
          prompt: {type: 'string'},
          altText: {type: 'string'},
          style: {type: 'string'},
        },
      },
    },
  },
};

export const renderSeoHtml = onRequest(
  {
    region: FUNCTION_REGION,
    timeoutSeconds: 15,
    memory: '256MiB',
    invoker: 'public',
  },
  async (request, response) => {
    if (request.method !== 'GET' && request.method !== 'HEAD') {
      response.status(405).send('Method Not Allowed');
      return;
    }

    const requestPath = getRequestPath(request);

    if (isStaticAssetRequest(requestPath)) {
      response
        .status(404)
        .set('Cache-Control', 'public, max-age=60')
        .set('Content-Type', 'text/plain; charset=utf-8')
        .send(request.method === 'HEAD' ? '' : 'Not Found');
      return;
    }

    try {
      const metadata = await createSeoMetadataForPath(requestPath);
      const html = injectSeoMetadata(readSeoIndexTemplate(), metadata);

      response
        .status(metadata.statusCode ?? 200)
        .set('Cache-Control', metadata.cacheControl ?? 'public, max-age=300, s-maxage=600')
        .set('Content-Type', 'text/html; charset=utf-8')
        .send(request.method === 'HEAD' ? '' : html);
    } catch (error) {
      logger.error('Unable to render SEO HTML shell.', {error});
      const fallbackMetadata = createStaticHomeSeoMetadata();
      const html = injectSeoMetadata(readSeoIndexTemplate(), fallbackMetadata);

      response
        .status(200)
        .set('Cache-Control', 'public, max-age=60, s-maxage=60')
        .set('Content-Type', 'text/html; charset=utf-8')
        .send(request.method === 'HEAD' ? '' : html);
    }
  }
);

export const sitemapXml = onRequest(
  {
    region: FUNCTION_REGION,
    timeoutSeconds: 15,
    memory: '256MiB',
    invoker: 'public',
  },
  async (request, response) => {
    if (request.method !== 'GET' && request.method !== 'HEAD') {
      response.status(405).send('Method Not Allowed');
      return;
    }

    try {
      const xml = await createSitemapXml();

      response
        .status(200)
        .set('Cache-Control', SITEMAP_CACHE_CONTROL)
        .set('Content-Type', 'application/xml; charset=utf-8')
        .send(request.method === 'HEAD' ? '' : xml);
    } catch (error) {
      logger.error('Unable to render sitemap.xml.', {error});
      const fallbackXml = renderSitemapXml(createStaticSitemapUrls());

      response
        .status(200)
        .set('Cache-Control', 'public, max-age=60, s-maxage=60')
        .set('Content-Type', 'application/xml; charset=utf-8')
        .send(request.method === 'HEAD' ? '' : fallbackXml);
    }
  }
);

export const rssFeed = onRequest(
  {
    region: FUNCTION_REGION,
    timeoutSeconds: 15,
    memory: '256MiB',
    invoker: 'public',
  },
  async (request, response) => {
    if (request.method !== 'GET' && request.method !== 'HEAD') {
      response.status(405).send('Method Not Allowed');
      return;
    }

    try {
      const posts = await fetchPublishedFeedBlogPosts();
      const xml = renderRssFeed(posts);

      response
        .status(200)
        .set('Cache-Control', FEED_CACHE_CONTROL)
        .set('Content-Type', 'application/rss+xml; charset=utf-8')
        .send(request.method === 'HEAD' ? '' : xml);
    } catch (error) {
      logger.error('Unable to render RSS feed.', {error});

      response
        .status(503)
        .set('Cache-Control', 'public, max-age=60, s-maxage=60')
        .set('Content-Type', 'text/plain; charset=utf-8')
        .send(request.method === 'HEAD' ? '' : 'Unable to render RSS feed.');
    }
  }
);

export const jsonFeed = onRequest(
  {
    region: FUNCTION_REGION,
    timeoutSeconds: 15,
    memory: '256MiB',
    invoker: 'public',
  },
  async (request, response) => {
    if (request.method !== 'GET' && request.method !== 'HEAD') {
      response.status(405).send('Method Not Allowed');
      return;
    }

    try {
      const posts = await fetchPublishedFeedBlogPosts();
      const feed = renderJsonFeed(posts);

      response
        .status(200)
        .set('Cache-Control', FEED_CACHE_CONTROL)
        .set('Content-Type', 'application/feed+json; charset=utf-8')
        .send(request.method === 'HEAD' ? '' : feed);
    } catch (error) {
      logger.error('Unable to render JSON feed.', {error});

      response
        .status(503)
        .set('Cache-Control', 'public, max-age=60, s-maxage=60')
        .set('Content-Type', 'text/plain; charset=utf-8')
        .send(request.method === 'HEAD' ? '' : 'Unable to render JSON feed.');
    }
  }
);

export const getLatestYouTubeVideos = onCall(
  {
    region: FUNCTION_REGION,
    secrets: [youtubeApiKey],
    timeoutSeconds: 30,
    memory: '256MiB',
    cors: SITE_CALLABLE_CORS_ORIGINS,
    invoker: 'public',
  },
  async request => {
    const maxResults = parseYoutubeMaxResults(request.data);

    return await loadLatestYoutubeVideos(maxResults);
  }
);

export const getLatestYouTubeVideosHttp = onRequest(
  {
    region: FUNCTION_REGION,
    secrets: [youtubeApiKey],
    timeoutSeconds: 30,
    memory: '256MiB',
    cors: SITE_CALLABLE_CORS_ORIGINS,
    invoker: 'public',
  },
  async (request, response) => {
    if (request.method !== 'GET') {
      response.status(405).json({error: 'Use GET for this browser-test endpoint.'});
      return;
    }

    try {
      const feed = await loadLatestYoutubeVideos(parseYoutubeMaxResults(request.query['maxResults']));
      response.status(200).json(feed);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to load latest YouTube videos.';
      logger.error('Unable to load latest YouTube videos over HTTP.', {error});
      response.status(getHttpStatusCode(error)).json({error: message});
    }
  }
);

export const generateBlogMetadata = onCall(
  {
    region: FUNCTION_REGION,
    secrets: [openAiApiKey],
    timeoutSeconds: 60,
    memory: '512MiB',
    cors: SITE_CALLABLE_CORS_ORIGINS,
    invoker: 'public',
  },
  async request => {
    requireCmsAccess(request.auth);
    const context = parseAssistantContext(request.data);
    const response = await callOpenAiResponses(context);
    const parsed = parseAssistantResult(response);

    return {
      generatedAt: new Date().toISOString(),
      source: 'backend',
      suggestions: parsed.suggestions,
      thumbnailSuggestions: parsed.thumbnailSuggestions,
    } satisfies BlogAssistantResult;
  }
);

export const generateAndStoreBlogThumbnail = onCall(
  {
    region: FUNCTION_REGION,
    secrets: [openAiApiKey],
    timeoutSeconds: 300,
    memory: '1GiB',
    cors: SITE_CALLABLE_CORS_ORIGINS,
    invoker: 'public',
  },
  async request => {
    requireCmsAccess(request.auth);
    const data = parseThumbnailRequest(request.data);
    const model = openAiImageModel.value();
    const image = await generateImage(data.prompt, model);
    return await storeThumbnailImage(data, image, model);
  }
);

export const listAdminUsers = onCall(
  {
    region: FUNCTION_REGION,
    timeoutSeconds: 30,
    memory: '256MiB',
    cors: SITE_CALLABLE_CORS_ORIGINS,
    invoker: 'public',
  },
  async request => {
    requireUserManagementAdmin(request.auth);

    const {pageSize, pageToken} = parseListUsersRequest(request.data);
    const auth = getAuth();
    const result = await auth.listUsers(pageSize, pageToken ?? undefined);

    return {
      users: result.users.map(toAdminManagedUser),
      nextPageToken: result.pageToken ?? null,
      fetchedAt: new Date().toISOString(),
    } satisfies AdminUsersResponse;
  }
);

export const updateAdminUserRoles = onCall(
  {
    region: FUNCTION_REGION,
    timeoutSeconds: 30,
    memory: '256MiB',
    cors: SITE_CALLABLE_CORS_ORIGINS,
    invoker: 'public',
  },
  async request => {
    const actorUid = requireUserManagementAdmin(request.auth);
    const {uid, roles} = parseUpdateUserRolesRequest(request.data);

    if (actorUid === uid && !roles.includes('admin')) {
      throw new HttpsError('failed-precondition', 'You cannot remove your own admin role from User Management.');
    }

    return await withUserRoleMutationLease(uid, async () => {
      const auth = getAuth();
      const user = await auth.getUser(uid);
      const nextClaims = replaceManagedUserRoleClaims(user.customClaims ?? {}, roles);

      await auth.setCustomUserClaims(uid, nextClaims);

      const updatedAt = new Date().toISOString();
      await syncUserAccountRoleProjection(uid, nextClaims, updatedAt);
      const updatedUser = await auth.getUser(uid);
      logger.info('Updated managed user roles.', {
        actorUid,
        targetUid: uid,
        roles,
        updatedAt,
      });

      return {
        user: toAdminManagedUser(updatedUser),
        updatedAt,
      } satisfies UpdateAdminUserRolesResponse;
    });
  }
);

export const bootstrapUserProfile = onCall(
  {
    region: FUNCTION_REGION,
    timeoutSeconds: 30,
    memory: '256MiB',
    cors: SITE_CALLABLE_CORS_ORIGINS,
    invoker: 'public',
  },
  async request => {
    const auth = requireSignedIn(request.auth, 'You must be signed in to bootstrap a user profile.');
    const profile = parseBootstrapUserProfileRequest(request.data);

    return await withUserRoleMutationLease(auth.uid, async () => {
      const authUser = await getAuth().getUser(auth.uid);

      return await upsertUserAccount({
        uid: auth.uid,
        token: authUser.customClaims ?? {},
      }, profile);
    });
  }
);

export const claimCatCornerAccess = onCall(
  {
    region: FUNCTION_REGION,
    timeoutSeconds: 30,
    memory: '256MiB',
    cors: SITE_CALLABLE_CORS_ORIGINS,
    invoker: 'public',
  },
  async request => {
    const caller = requireSignedIn(request.auth, 'You must be signed in to join Cat Corner.');

    return await withUserRoleMutationLease(caller.uid, async () => {
      const auth = getAuth();
      const user = await auth.getUser(caller.uid);
      const existingClaims = user.customClaims ?? {};
      const alreadyMember = hasCatCornerAccessClaim(existingClaims);
      const nextClaims = addCatCornerAccessClaim(existingClaims);

      if (!alreadyMember) {
        await auth.setCustomUserClaims(caller.uid, nextClaims);
      }

      const updatedAt = new Date().toISOString();
      await syncUserAccountRoleProjection(caller.uid, nextClaims, updatedAt);

      logger.info(alreadyMember ? 'Repeated Cat Corner access claim.' : 'Granted Cat Corner access.', {
        event: alreadyMember
          ? 'cat_corner_access_claim_repeated'
          : 'cat_corner_access_granted',
        uid: caller.uid,
        role: CAT_CORNER_ADDICT_ROLE,
        alreadyMember,
        updatedAt,
      });

      return {
        role: CAT_CORNER_ADDICT_ROLE,
        alreadyMember,
        updatedAt,
      } satisfies CatCornerAccessClaimResponse;
    });
  }
);

export const registerPushSubscription = onCall(
  {
    region: FUNCTION_REGION,
    timeoutSeconds: 30,
    memory: '256MiB',
    cors: SITE_CALLABLE_CORS_ORIGINS,
    invoker: 'public',
  },
  async request => {
    const auth = requireSignedIn(request.auth, 'You must be signed in to enable push notifications.');
    const data = requireRecord(request.data, 'Push registration must be an object.');
    const subscription = parseStoredPushSubscription(data['subscription']);
    const locale = getTrimmedString(data['locale']).slice(0, 35) || DEFAULT_LOCALE;

    if (!subscription) {
      throw new HttpsError('invalid-argument', 'The push subscription is incomplete or invalid.');
    }

    const firestore = getFirestore();
    const subscriptionRef = firestore
      .collection(PUSH_SUBSCRIPTIONS_COLLECTION)
      .doc(createPushSubscriptionId(subscription.endpoint));
    const now = new Date().toISOString();

    await firestore.runTransaction(async transaction => {
      const existingSnapshot = await transaction.get(subscriptionRef);
      const existingCreatedAt = getTrimmedString(existingSnapshot.data()?.['createdAt']);

      transaction.set(subscriptionRef, {
        uid: auth.uid,
        subscription,
        locale,
        createdAt: existingCreatedAt || now,
        updatedAt: now,
      }, {merge: false});
    });

    return {registered: true, updatedAt: now};
  }
);

export const unregisterPushSubscription = onCall(
  {
    region: FUNCTION_REGION,
    timeoutSeconds: 30,
    memory: '256MiB',
    cors: SITE_CALLABLE_CORS_ORIGINS,
    invoker: 'public',
  },
  async request => {
    const auth = requireSignedIn(request.auth, 'You must be signed in to disable push notifications.');
    const data = requireRecord(request.data, 'Push removal must be an object.');
    const endpoint = parsePushEndpoint(data['endpoint']);

    if (!endpoint) {
      throw new HttpsError('invalid-argument', 'A valid push endpoint is required.');
    }

    const subscriptionRef = getFirestore()
      .collection(PUSH_SUBSCRIPTIONS_COLLECTION)
      .doc(createPushSubscriptionId(endpoint));
    const snapshot = await subscriptionRef.get();

    if (!snapshot.exists) {
      return {removed: false};
    }

    if (snapshot.get('uid') !== auth.uid) {
      throw new HttpsError('permission-denied', 'This push subscription belongs to another account.');
    }

    await subscriptionRef.delete();
    return {removed: true};
  }
);

export const submitPostComment = onCall(
  {
    region: FUNCTION_REGION,
    timeoutSeconds: 30,
    memory: '256MiB',
    cors: SITE_CALLABLE_CORS_ORIGINS,
    invoker: 'public',
  },
  async request => {
    const auth = requireSignedIn(request.auth, 'You must be signed in to comment.');
    const data = parseSubmitPostCommentRequest(request.data);
    const firestore = getFirestore();
    await requirePublishedPostTarget(data.postId, data.postSlug);
    const parentComment = data.parentCommentId
      ? await requireApprovedCommentReplyTarget(data.parentCommentId, data.postId, data.postSlug)
      : null;
    const account = await ensureUserAccountForAuth(auth);

    if (account.commentTrustStatus === 'blocked') {
      throw new HttpsError('permission-denied', 'This account cannot submit comments.');
    }

    const isTrusted = account.commentTrustStatus === 'trusted' || hasAnyRoleClaim(auth.token, TRUSTED_COMMENT_ROLES);
    const status: BlogCommentStatus = isTrusted ? 'approved' : 'pending';
    const now = new Date().toISOString();
    const commentRef = firestore.collection(POST_COMMENTS_COLLECTION).doc();
    const parentThreadDepth = parentComment ? getCommentThreadDepth(parentComment) : -1;
    const comment: BlogCommentDocument = {
      id: commentRef.id,
      postId: data.postId,
      postSlug: data.postSlug,
      parentCommentId: parentComment?.id ?? null,
      parentAuthorDisplayName: parentComment?.authorDisplayName ?? null,
      threadRootId: parentComment ? (parentComment.threadRootId || parentComment.id) : commentRef.id,
      threadDepth: parentComment ? Math.min(parentThreadDepth + 1, MAX_COMMENT_THREAD_DEPTH) : 0,
      authorUid: auth.uid,
      authorDisplayName: account.displayName,
      authorPhotoURL: account.photoURL,
      body: data.body,
      status,
      createdAt: now,
      updatedAt: now,
      moderatedAt: status === 'approved' ? now : null,
      moderatedBy: status === 'approved' ? auth.uid : null,
    };

    await commentRef.set({
      ...comment,
      createdAtTimestamp: FieldValue.serverTimestamp(),
      updatedAtTimestamp: FieldValue.serverTimestamp(),
    });

    if (status === 'approved') {
      await awardPointEvent({
        uid: auth.uid,
        eventId: createPointEventId('comment_approved', comment.id),
        type: 'comment_approved',
        points: COMMENT_APPROVED_POINTS,
        counterField: 'approvedComments',
        postId: comment.postId,
        postSlug: comment.postSlug,
        commentId: comment.id,
      });
    }

    return {
      comment,
      trusted: isTrusted,
    };
  }
);

export const moderatePostComment = onCall(
  {
    region: FUNCTION_REGION,
    timeoutSeconds: 30,
    memory: '256MiB',
    cors: SITE_CALLABLE_CORS_ORIGINS,
    invoker: 'public',
  },
  async request => {
    const actorUid = requireCmsAccess(request.auth);
    const {commentId, action} = parseModeratePostCommentRequest(request.data);
    const firestore = getFirestore();
    const commentRef = firestore.collection(POST_COMMENTS_COLLECTION).doc(commentId);
    const snapshot = await commentRef.get();

    if (!snapshot.exists) {
      throw new HttpsError('not-found', 'Comment not found.');
    }

    const currentComment = {id: snapshot.id, ...snapshot.data()} as BlogCommentDocument;
    const now = new Date().toISOString();
    const nextStatus = getNextCommentStatus(action);

    const nextComment: BlogCommentDocument = {
      ...currentComment,
      status: nextStatus,
      updatedAt: now,
      moderatedAt: now,
      moderatedBy: actorUid,
    };

    await commentRef.set({
      status: nextStatus,
      updatedAt: now,
      moderatedAt: now,
      moderatedBy: actorUid,
      updatedAtTimestamp: FieldValue.serverTimestamp(),
    }, {merge: true});

    let trustedAuthor = false;
    let awardedPoints = false;

    if (nextStatus === 'approved') {
      const userRef = firestore.collection(USERS_COLLECTION).doc(currentComment.authorUid);
      await userRef.set({
        commentTrustStatus: 'trusted',
        updatedAt: now,
      }, {merge: true});
      trustedAuthor = true;

      const award = await awardPointEvent({
        uid: currentComment.authorUid,
        eventId: createPointEventId('comment_approved', currentComment.id),
        type: 'comment_approved',
        points: COMMENT_APPROVED_POINTS,
        counterField: 'approvedComments',
        postId: currentComment.postId,
        postSlug: currentComment.postSlug,
        commentId: currentComment.id,
      });
      awardedPoints = award.awarded;
    }

    return {
      comment: nextComment,
      trustedAuthor,
      awardedPoints,
    };
  }
);

export const recordPostRead = onCall(
  {
    region: FUNCTION_REGION,
    timeoutSeconds: 30,
    memory: '256MiB',
    cors: SITE_CALLABLE_CORS_ORIGINS,
    invoker: 'public',
  },
  async request => {
    const auth = requireSignedIn(request.auth, 'You must be signed in to record post reads.');
    const data = parsePostEngagementRequest(request.data);

    await requirePublishedPostTarget(data.postId, data.postSlug);
    await ensureUserAccountForAuth(auth);

    return await awardPointEvent({
      uid: auth.uid,
      eventId: createPointEventId('post_read', auth.uid, data.postId),
      type: 'post_read',
      points: POST_READ_POINTS,
      counterField: 'postReads',
      postId: data.postId,
      postSlug: data.postSlug,
    });
  }
);

export const recordPostShare = onCall(
  {
    region: FUNCTION_REGION,
    timeoutSeconds: 30,
    memory: '256MiB',
    cors: SITE_CALLABLE_CORS_ORIGINS,
    invoker: 'public',
  },
  async request => {
    const auth = requireSignedIn(request.auth, 'You must be signed in to record post shares.');
    const data = parsePostShareRequest(request.data);

    await requirePublishedPostTarget(data.postId, data.postSlug);
    await ensureUserAccountForAuth(auth);
    await registerTrackedShare({
      shareId: data.shareId,
      ownerUid: auth.uid,
      provider: data.provider,
      targetType: 'post',
      targetId: data.postId,
      targetPath: `/blog/${data.postSlug}`,
    });

    return await awardPointEvent({
      uid: auth.uid,
      eventId: createPointEventId('post_share', auth.uid, data.postId, data.provider),
      type: 'post_share',
      points: POST_SHARE_POINTS,
      counterField: 'shares',
      postId: data.postId,
      postSlug: data.postSlug,
      provider: data.provider,
      shareId: data.shareId,
    });
  }
);

export const recordSiteShare = onCall(
  {
    region: FUNCTION_REGION,
    timeoutSeconds: 30,
    memory: '256MiB',
    cors: SITE_CALLABLE_CORS_ORIGINS,
    invoker: 'public',
  },
  async request => {
    const auth = requireSignedIn(request.auth, 'You must be signed in to record site shares.');
    const data = parseSiteShareRequest(request.data);

    await ensureUserAccountForAuth(auth);
    await registerTrackedShare({
      shareId: data.shareId,
      ownerUid: auth.uid,
      provider: data.provider,
      targetType: 'site',
      targetId: HOMEPAGE_SETTINGS_ID,
      targetPath: '/',
    });

    return await awardPointEvent({
      uid: auth.uid,
      eventId: createPointEventId('site_share', auth.uid, data.provider),
      type: 'site_share',
      points: POST_SHARE_POINTS,
      counterField: 'shares',
      provider: data.provider,
      shareId: data.shareId,
      targetPath: '/',
    });
  }
);

export const recordShareLanding = onCall(
  {
    region: FUNCTION_REGION,
    timeoutSeconds: 30,
    memory: '256MiB',
    cors: SITE_CALLABLE_CORS_ORIGINS,
    invoker: 'public',
  },
  async request => {
    const data = parseShareLandingRequest(request.data);
    const firestore = getFirestore();
    const shareRef = firestore.collection(SHARE_LINKS_COLLECTION).doc(data.shareId);
    const landingRef = firestore.collection(SHARE_LANDING_EVENTS_COLLECTION).doc(
      createPointEventId(data.shareId, data.visitId)
    );
    const now = new Date();

    return await firestore.runTransaction(async transaction => {
      const [shareSnapshot, landingSnapshot] = await Promise.all([
        transaction.get(shareRef),
        transaction.get(landingRef),
      ]);
      const share = shareSnapshot.data() ?? {};
      const expiresAtMillis = getNumberValue(share['expiresAtMillis']);
      const landingCount = getNumberValue(share['landingCount']);

      if (
        !shareSnapshot.exists
        || expiresAtMillis <= now.getTime()
        || landingSnapshot.exists
        || landingCount >= MAX_SHARE_LANDINGS_PER_LINK
      ) {
        return {recorded: false};
      }

      transaction.set(landingRef, {
        id: landingRef.id,
        shareId: data.shareId,
        visitId: data.visitId,
        targetType: getTrimmedString(share['targetType']),
        targetId: getTrimmedString(share['targetId']),
        createdAt: now.toISOString(),
        createdAtTimestamp: FieldValue.serverTimestamp(),
        expiresAt: getTrimmedString(share['expiresAt']),
        expiresAtMillis,
        expiresAtTimestamp: Timestamp.fromMillis(expiresAtMillis),
      });
      transaction.update(shareRef, {
        landingCount: FieldValue.increment(1),
        lastLandedAt: now.toISOString(),
        lastLandedAtTimestamp: FieldValue.serverTimestamp(),
      });

      return {recorded: true};
    });
  }
);

function parseYoutubeMaxResults(value: unknown): number {
  const maxResults = isRecord(value) ? value['maxResults'] : value;
  const parsedMaxResults = typeof maxResults === 'string' ? Number(maxResults) : maxResults;

  if (typeof parsedMaxResults !== 'number' || !Number.isFinite(parsedMaxResults)) {
    return YOUTUBE_DEFAULT_MAX_RESULTS;
  }

  return Math.min(YOUTUBE_MAX_RESULTS, Math.max(1, Math.trunc(parsedMaxResults)));
}

async function loadLatestYoutubeVideos(maxResults: number): Promise<YoutubeFeedResponse> {
  const channelId = youtubeChannelId.value().trim();

  if (!channelId) {
    throw new HttpsError('failed-precondition', 'YOUTUBE_CHANNEL_ID is not configured for the YouTube feed.');
  }

  const cacheKey = `${channelId}:${maxResults}`;
  const now = Date.now();

  if (youtubeFeedCache?.key === cacheKey && youtubeFeedCache.expiresAt > now) {
    return youtubeFeedCache.response;
  }

  const channel = await fetchYoutubeChannelDetails(channelId);
  const videos = await fetchYoutubeUploads(channel.uploadsPlaylistId, maxResults);
  const response = {
    fetchedAt: new Date().toISOString(),
    source: 'youtube-api',
    channelId: channel.channelId,
    channelTitle: channel.channelTitle,
    channelUrl: `https://www.youtube.com/channel/${channel.channelId}`,
    videos,
  } satisfies YoutubeFeedResponse;

  youtubeFeedCache = {
    key: cacheKey,
    expiresAt: now + YOUTUBE_FEED_CACHE_MS,
    response,
  };

  return response;
}

function getHttpStatusCode(error: unknown): number {
  if (error instanceof HttpsError) {
    if (error.code === 'failed-precondition') {
      return 412;
    }

    if (error.code === 'invalid-argument') {
      return 400;
    }
  }

  return 500;
}

async function createSeoMetadataForPath(path: string): Promise<SeoMetadata> {
  const normalizedPath = normalizeSeoPath(path);

  if (normalizedPath === '/') {
    return await createHomeSeoMetadata();
  }

  if (normalizedPath === '/blog') {
    const posts = await fetchPublishedFeedBlogPosts();

    return createBlogIndexSeoMetadata(posts);
  }

  if (normalizedPath === '/blog/search') {
    return createBlogSearchSeoMetadata();
  }

  if (normalizedPath === '/search') {
    return createSiteSearchSeoMetadata();
  }

  if (normalizedPath === '/cat-corner') {
    return createNoindexRouteSeoMetadata({
      title: createSiteTitle('Cat Corner'),
      description: 'Dispatches, photographs, and household intelligence from Gretchen, Cat Corner Editor-in-Chief.',
      path: '/cat-corner',
      image: '/assets/images/cat-corner/gretchen-easter-egg.png',
      imageAlt: 'Gretchen, Cat Corner Editor-in-Chief',
      imageWidth: 1086,
      imageHeight: 1448,
    });
  }

  if (normalizedPath === '/cat-corner/unlock') {
    return createNoindexRouteSeoMetadata({
      title: createSiteTitle('You found Gretchen'),
      description: 'Unlock the Cat Corner Addict badge and enter Gretchen\'s secret section.',
      path: '/cat-corner/unlock',
      image: '/assets/images/cat-corner/gretchen-easter-egg.png',
      imageAlt: 'Gretchen welcomes a new Cat Corner Addict',
      imageWidth: 1086,
      imageHeight: 1448,
    });
  }

  if (normalizedPath.startsWith('/blog/category/')) {
    const category = decodeSlugSegment(normalizedPath.slice('/blog/category/'.length));
    const posts = await fetchPublishedSitemapBlogPosts();

    return createBlogCategorySeoMetadata(category, getTaxonomyPostCount(posts, category));
  }

  if (normalizedPath.startsWith('/blog/tag/')) {
    const tag = decodeSlugSegment(normalizedPath.slice('/blog/tag/'.length));
    const posts = await fetchPublishedSitemapBlogPosts();

    return createBlogTagSeoMetadata(tag, getTagPostCount(posts, tag));
  }

  if (normalizedPath.startsWith('/topics/')) {
    const slug = decodeSlugSegment(normalizedPath.slice('/topics/'.length));
    const topicHub = getTopicHubBySlug(slug);

    if (topicHub) {
      return createTopicHubSeoMetadata(topicHub);
    }
  }

  if (normalizedPath.startsWith('/authors/')) {
    const slug = decodeSlugSegment(normalizedPath.slice('/authors/'.length));
    const author = await fetchPublishedSeoAuthor(slug);

    if (author) {
      const posts = await fetchPublishedFeedBlogPosts();
      const authorPosts = posts.filter(post => isPostByAuthor(post, author));

      return createAuthorSeoMetadata(author, authorPosts);
    }

    return createMissingAuthorSeoMetadata(slug);
  }

  if (normalizedPath.startsWith('/blog/preview/')) {
    const previewToken = decodeSlugSegment(normalizedPath.slice('/blog/preview/'.length));
    const post = await fetchPreviewSeoBlogPost(previewToken);

    if (post) {
      return createBlogPreviewSeoMetadata(post, previewToken);
    }

    return createMissingBlogPostSeoMetadata('preview');
  }

  if (normalizedPath.startsWith('/blog/')) {
    const slug = decodeSlugSegment(normalizedPath.slice('/blog/'.length));
    const post = await fetchPublishedSeoBlogPost(slug);

    if (post) {
      return createBlogPostSeoMetadata(post);
    }

    return createMissingBlogPostSeoMetadata(slug);
  }

  if (normalizedPath === '/labs') {
    return createLabsSeoMetadata();
  }

  if (normalizedPath === '/background') {
    return createStaticSeoMetadata({
      title: createSiteTitle('Full Screen Background Lab'),
      description: BACKGROUND_LAB_DESCRIPTION,
      path: '/background',
      imageAlt: createPreviewImageAlt('visual background lab'),
    });
  }

  if (normalizedPath === '/admin/cms/media-library') {
    return createStaticSeoMetadata({
      title: createSiteTitle('CMS Media Library'),
      description: 'Protected CMS media management for Firebase-backed blog assets.',
      path: '/admin/cms/media-library',
      imageAlt: createPreviewImageAlt('CMS media library'),
      robots: 'noindex,nofollow',
    });
  }

  if (normalizedPath === '/admin/users') {
    return createStaticSeoMetadata({
      title: createSiteTitle('User Management'),
      description: 'Protected admin user role and permission management.',
      path: '/admin/users',
      imageAlt: createPreviewImageAlt('admin user management'),
      robots: 'noindex,nofollow',
    });
  }

  if (normalizedPath === '/admin/comments') {
    return createStaticSeoMetadata({
      title: createSiteTitle('Comment Moderation'),
      description: 'Protected admin blog comment moderation.',
      path: '/admin/comments',
      imageAlt: createPreviewImageAlt('admin comment moderation'),
      robots: 'noindex,nofollow',
    });
  }

  if (normalizedPath === '/logout') {
    return createStaticSeoMetadata({
      title: createSiteTitle('Sign Out'),
      description: `End the current ${SITE_NAME} authenticated session.`,
      path: '/logout',
      imageAlt: createPreviewImageAlt('sign out page'),
      robots: 'noindex,nofollow',
    });
  }

  if (normalizedPath === '/profile') {
    return createStaticSeoMetadata({
      title: createSiteTitle('Profile'),
      description: 'Signed-in user account profile, roles, and permissions.',
      path: '/profile',
      imageAlt: createPreviewImageAlt('profile page'),
      robots: 'noindex,nofollow',
    });
  }

  if (isOsRoute(normalizedPath)) {
    return createNoindexRouteSeoMetadata({
      title: createSiteTitle('Core OS Route'),
      description: `Protected OS-style route for ${SITE_NAME} desktop experiments.`,
      path: normalizedPath,
      imageAlt: createPreviewImageAlt('Core OS route'),
    });
  }

  if (isAdminRoute(normalizedPath)) {
    return createNoindexRouteSeoMetadata({
      title: createSiteTitle('Admin Route'),
      description: `Protected ${SITE_NAME} administration route.`,
      path: normalizedPath,
      imageAlt: createPreviewImageAlt('admin route'),
    });
  }

  return createNotFoundSeoMetadata(normalizedPath);
}

async function createSitemapXml(): Promise<string> {
  const [posts, authors] = await Promise.all([
    fetchPublishedSitemapBlogPosts(),
    fetchPublishedSeoAuthors(),
  ]);
  const latestPostUpdate = getLatestIsoDate(posts.map(post => post.updatedAt || post.publishedAt).filter(isNonEmptyString));
  const urls = [
    ...createStaticSitemapUrls(latestPostUpdate),
    ...createSitemapTaxonomyUrls(posts),
    ...createSitemapTagUrls(posts),
    ...createSitemapAuthorUrls(posts, authors),
    ...TOPIC_HUBS.map(topicHub => ({
      path: `/topics/${topicHub.slug}`,
      lastmod: latestPostUpdate,
    } satisfies SitemapUrl)),
    ...posts.map(post => ({
      path: `/blog/${createSeoSlug(post.slug)}`,
      lastmod: getLatestIsoDate([post.updatedAt, post.publishedAt].filter(isNonEmptyString)),
    } satisfies SitemapUrl)),
  ];

  const uniqueUrls = uniqueSitemapUrls(urls);

  if (uniqueUrls.length > SITEMAP_REVIEW_URL_LIMIT) {
    logger.warn('Sitemap URL count exceeds review threshold.', {
      urlCount: uniqueUrls.length,
      reviewLimit: SITEMAP_REVIEW_URL_LIMIT,
    });
  }

  return renderSitemapXml(uniqueUrls);
}

function createSitemapAuthorUrls(
  posts: readonly SitemapBlogPostDocument[],
  authors: readonly SeoAuthorDocument[]
): readonly SitemapUrl[] {
  const urls: SitemapUrl[] = [];

  for (const author of authors) {
    const authorPosts = posts.filter(post => (
      post.authorId === author.id || post.authorSlug === author.slug
    ));
    const lastmod = getLatestIsoDate([
      author.updatedAt,
      ...authorPosts.flatMap(post => [post.updatedAt, post.publishedAt]).filter(isNonEmptyString),
    ].filter(isNonEmptyString));

    if (authorPosts.length > 0) {
      urls.push({path: `/authors/${author.slug}`, lastmod});
    }
  }

  return urls.sort((left, right) => left.path.localeCompare(right.path));
}

function createStaticSitemapUrls(blogLastmod?: string): readonly SitemapUrl[] {
  return [
    {
      path: '/',
    },
    {
      path: '/blog',
      lastmod: blogLastmod,
    },
    {
      path: '/labs',
    },
    {
      path: '/background',
    },
  ];
}

function createSitemapTaxonomyUrls(posts: readonly SitemapBlogPostDocument[]): readonly SitemapUrl[] {
  const categoryLastmod = new Map<string, string>();
  const categoryCounts = new Map<string, number>();

  for (const post of posts) {
    const lastmod = getLatestIsoDate([post.updatedAt, post.publishedAt].filter(isNonEmptyString));

    for (const category of getSitemapTaxonomyTerms(post)) {
      const slug = createBlogCategorySlug(category);
      const existingLastmod = categoryLastmod.get(slug);
      const latestLastmod = getLatestIsoDate([existingLastmod, lastmod].filter(isNonEmptyString));

      categoryLastmod.set(slug, latestLastmod ?? existingLastmod ?? lastmod ?? '');
      categoryCounts.set(slug, (categoryCounts.get(slug) ?? 0) + 1);
    }
  }

  return Array.from(categoryLastmod.entries())
    .filter(([slug]) => slug.length > 0 && (categoryCounts.get(slug) ?? 0) >= TAXONOMY_SITEMAP_MIN_POSTS)
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([slug, lastmod]) => ({
      path: `/blog/category/${slug}`,
      lastmod: lastmod || undefined,
    }));
}

function createSitemapTagUrls(posts: readonly SitemapBlogPostDocument[]): readonly SitemapUrl[] {
  const tagLastmod = new Map<string, string>();
  const tagCounts = new Map<string, number>();

  for (const post of posts) {
    const lastmod = getLatestIsoDate([post.updatedAt, post.publishedAt].filter(isNonEmptyString));

    for (const tag of post.tags) {
      const slug = createBlogTagSlug(tag);
      const existingLastmod = tagLastmod.get(slug);
      const latestLastmod = getLatestIsoDate([existingLastmod, lastmod].filter(isNonEmptyString));

      tagLastmod.set(slug, latestLastmod ?? existingLastmod ?? lastmod ?? '');
      tagCounts.set(slug, (tagCounts.get(slug) ?? 0) + 1);
    }
  }

  return Array.from(tagLastmod.entries())
    .filter(([slug]) => slug.length > 0 && (tagCounts.get(slug) ?? 0) >= TAG_SITEMAP_MIN_POSTS)
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([slug, lastmod]) => ({
      path: `/blog/tag/${slug}`,
      lastmod: lastmod || undefined,
    }));
}

async function fetchPublishedSitemapBlogPosts(): Promise<readonly SitemapBlogPostDocument[]> {
  const snapshot = await getFirestore()
    .collection('posts')
    .where('status', '==', 'published')
    .get();

  return snapshot.docs
    .filter(document => !isHiddenCatCornerPost(document.data()))
    .map(document => toSitemapBlogPostDocument(document.data()))
    .filter((post): post is SitemapBlogPostDocument => post !== null)
    .sort((left, right) => {
      const rightDate = getLatestIsoDate([right.updatedAt, right.publishedAt].filter(isNonEmptyString)) ?? '';
      const leftDate = getLatestIsoDate([left.updatedAt, left.publishedAt].filter(isNonEmptyString)) ?? '';

      return rightDate.localeCompare(leftDate) || left.slug.localeCompare(right.slug);
    });
}

function toSitemapBlogPostDocument(value: unknown): SitemapBlogPostDocument | null {
  if (!isRecord(value)) {
    return null;
  }

  const slug = getTrimmedString(value['slug']);

  if (!slug) {
    return null;
  }

  return {
    slug,
    authorId: getPostAuthorId(value),
    authorSlug: getPostAuthorSlug(value),
    categories: getStringArrayValue(value['categories']),
    subcategories: getStringArrayValue(value['subcategories']),
    tags: getStringArrayValue(value['tags']),
    updatedAt: getIsoString(value['updatedAt']),
    publishedAt: getIsoString(value['publishedAt']) || null,
  };
}

function getSitemapTaxonomyTerms(post: SitemapBlogPostDocument): readonly string[] {
  return uniqueStrings([...post.categories, ...post.subcategories]);
}

async function fetchPublishedFeedBlogPosts(): Promise<readonly SeoBlogPostDocument[]> {
  const snapshot = await getFirestore()
    .collection('posts')
    .where('status', '==', 'published')
    .get();

  return snapshot.docs
    .filter(document => !isHiddenCatCornerPost(document.data()))
    .map(document => toSeoBlogPostDocument(document.data(), document.id))
    .filter((post): post is SeoBlogPostDocument => post !== null)
    .sort((left, right) => {
      const rightDate = getLatestIsoDate([right.updatedAt, right.publishedAt].filter(isNonEmptyString)) ?? '';
      const leftDate = getLatestIsoDate([left.updatedAt, left.publishedAt].filter(isNonEmptyString)) ?? '';

      return rightDate.localeCompare(leftDate) || left.slug.localeCompare(right.slug);
    });
}

function renderRssFeed(posts: readonly SeoBlogPostDocument[]): string {
  const latestPostUpdate = getLatestIsoDate(posts.map(post => post.updatedAt || post.publishedAt).filter(isNonEmptyString));
  const items = posts
    .map(post => renderRssFeedItem(post))
    .join('\n');

  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom" xmlns:media="http://search.yahoo.com/mrss/">',
    '  <channel>',
    `    <title>${escapeXml(`${SITE_NAME} Blog`)}</title>`,
    `    <link>${escapeXml(createAbsoluteUrl('/blog'))}</link>`,
    `    <description>${escapeXml(BLOG_FEED_DESCRIPTION)}</description>`,
    `    <language>${escapeXml(DEFAULT_LOCALE.replace('_', '-'))}</language>`,
    latestPostUpdate ? `    <lastBuildDate>${escapeXml(toRfc822Date(latestPostUpdate))}</lastBuildDate>` : '',
    `    <atom:link href="${escapeXml(createAbsoluteUrl('/feed.xml'))}" rel="self" type="application/rss+xml"/>`,
    `    <image><url>${escapeXml(createAbsoluteUrl(HOMEPAGE_OG_IMAGE))}</url><title>${escapeXml(`${SITE_NAME} Blog`)}</title><link>${escapeXml(createAbsoluteUrl('/blog'))}</link></image>`,
    items,
    '  </channel>',
    '</rss>',
    '',
  ].filter(line => line.length > 0).join('\n');
}

function renderRssFeedItem(post: SeoBlogPostDocument): string {
  const metadata = createBlogPostFeedMetadata(post);
  const categories = metadata.tags
    .map(tag => `      <category>${escapeXml(tag)}</category>`)
    .join('\n');
  const image = metadata.image
    ? `      <media:content url="${escapeXml(metadata.image)}" medium="image" type="${escapeXml(getImageMimeType(metadata.image))}" width="${metadata.imageWidth}" height="${metadata.imageHeight}"/>`
    : '';

  return [
    '    <item>',
    `      <title>${escapeXml(metadata.title)}</title>`,
    `      <link>${escapeXml(metadata.url)}</link>`,
    `      <guid isPermaLink="true">${escapeXml(metadata.url)}</guid>`,
    `      <description>${escapeXml(metadata.description)}</description>`,
    `      <author>${escapeXml(`noreply@colinmichaels.com (${metadata.author})`)}</author>`,
    `      <pubDate>${escapeXml(toRfc822Date(metadata.publishedAt))}</pubDate>`,
    `      <atom:updated>${escapeXml(metadata.modifiedAt)}</atom:updated>`,
    categories,
    image,
    '    </item>',
  ].filter(line => line.length > 0).join('\n');
}

function renderJsonFeed(posts: readonly SeoBlogPostDocument[]): string {
  const feed = {
    version: 'https://jsonfeed.org/version/1.1',
    title: `${SITE_NAME} Blog`,
    home_page_url: createAbsoluteUrl('/blog'),
    feed_url: createAbsoluteUrl('/feed.json'),
    description: BLOG_FEED_DESCRIPTION,
    language: DEFAULT_LOCALE.replace('_', '-'),
    icon: createAbsoluteUrl(HOMEPAGE_OG_IMAGE),
    favicon: createAbsoluteUrl('/favicon.ico'),
    authors: [
      {
        name: PERSON_NAME,
        url: SITE_URL,
      },
    ],
    items: posts.map(post => {
      const metadata = createBlogPostFeedMetadata(post);

      return {
        id: metadata.url,
        url: metadata.url,
        title: metadata.title,
        summary: metadata.description,
        content_text: metadata.description,
        image: metadata.image,
        date_published: metadata.publishedAt,
        date_modified: metadata.modifiedAt,
        authors: [
          {
            name: metadata.author,
            url: metadata.authorUrl,
          },
        ],
        tags: metadata.tags,
      };
    }),
  };

  return `${JSON.stringify(feed, null, 2)}\n`;
}

function createBlogPostFeedMetadata(post: SeoBlogPostDocument): {
  title: string;
  description: string;
  url: string;
  image: string;
  imageWidth: number;
  imageHeight: number;
  author: string;
  authorUrl: string;
  tags: readonly string[];
  publishedAt: string;
  modifiedAt: string;
} {
  const title = stripHtml(post.ogTitle || post.seoTitle || post.title);
  const description = truncateDescription(stripHtml(post.ogDescription || post.seoDescription || post.excerpt));
  const image = createAbsoluteUrl(toOpenGraphCompatibleImage(post.seoOpenGraphImage || post.ogImage || post.thumbnailImage || post.coverImage || HOMEPAGE_OG_IMAGE));
  const imageWidth = post.seoOpenGraphImageWidth ?? post.ogImageWidth ?? DEFAULT_OG_IMAGE_WIDTH;
  const imageHeight = post.seoOpenGraphImageHeight ?? post.ogImageHeight ?? DEFAULT_OG_IMAGE_HEIGHT;
  const url = post.seoCanonical || createAbsoluteUrl(`/blog/${post.slug}`);
  const publishedAt = post.publishedAt ?? post.updatedAt;

  return {
    title,
    description,
    url,
    image,
    imageWidth,
    imageHeight,
    author: post.authorName,
    authorUrl: post.authorUrl,
    tags: uniqueStrings([...post.categories, ...post.tags]),
    publishedAt,
    modifiedAt: post.updatedAt,
  };
}

function renderSitemapXml(urls: readonly SitemapUrl[]): string {
  const entries = uniqueSitemapUrls(urls)
    .map(url => [
      '  <url>',
      `    <loc>${escapeXml(createAbsoluteUrl(url.path))}</loc>`,
      url.lastmod ? `    <lastmod>${escapeXml(url.lastmod)}</lastmod>` : '',
      '  </url>',
    ].filter(Boolean).join('\n'))
    .join('\n');

  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    entries,
    '</urlset>',
    '',
  ].join('\n');
}

function uniqueSitemapUrls(urls: readonly SitemapUrl[]): readonly SitemapUrl[] {
  const seen = new Set<string>();
  const uniqueUrls: SitemapUrl[] = [];

  for (const url of urls) {
    const path = normalizeSeoPath(url.path);

    if (seen.has(path)) {
      continue;
    }

    seen.add(path);
    uniqueUrls.push({...url, path});
  }

  return uniqueUrls;
}

async function createHomeSeoMetadata(): Promise<SeoMetadata> {
  const [settings, posts] = await Promise.all([
    fetchHomepageSocialSettings(),
    fetchPublishedFeedBlogPosts(),
  ]);
  const post = selectHomepageSocialPost(posts, settings);

  if (!post) {
    return createStaticHomeSeoMetadata();
  }

  const sourceImage = post.seoOpenGraphImage || post.ogImage || post.thumbnailImage || post.coverImage || HOMEPAGE_OG_IMAGE;
  const compatibleImage = toOpenGraphCompatibleImage(sourceImage);
  const versionSeed = [
    HOMEPAGE_SOCIAL_IMAGE_TEMPLATE_VERSION,
    post.id,
    post.updatedAt,
    compatibleImage,
  ].join(':');

  return {
    ...createStaticHomeSeoMetadata(),
    image: appendSocialImageVersion(compatibleImage, versionSeed),
    imageAlt: post.ogImageAlt || post.imageAlt || `${post.title} featured on ${SITE_NAME}`,
    imageWidth: post.seoOpenGraphImageWidth ?? post.ogImageWidth ?? DEFAULT_OG_IMAGE_WIDTH,
    imageHeight: post.seoOpenGraphImageHeight ?? post.ogImageHeight ?? DEFAULT_OG_IMAGE_HEIGHT,
    cacheControl: 'public, max-age=300, s-maxage=300',
  };
}

function createStaticHomeSeoMetadata(): SeoMetadata {
  return {
    title: HOMEPAGE_TITLE,
    description: HOMEPAGE_DESCRIPTION,
    path: '/',
    image: HOMEPAGE_OG_IMAGE,
    imageAlt: createPreviewImageAlt('personal site'),
    type: 'website',
    structuredData: createHomeJsonLd(),
    fallbackHtml: renderHomeFallbackHtml(),
    cacheControl: 'public, max-age=300, s-maxage=300',
  };
}

async function fetchHomepageSocialSettings(): Promise<HomepageSocialSettings> {
  const snapshot = await getFirestore()
    .collection(HOMEPAGE_SETTINGS_COLLECTION)
    .doc(HOMEPAGE_SETTINGS_ID)
    .get();
  const value = snapshot.data() ?? {};
  const rawMode = getTrimmedString(value['featuredPostMode']);
  // Mirror the client migration: legacy `latest` and unknown modes use the newest-featured policy.
  const featuredPostMode: HomepageFeaturedPostMode = rawMode === 'selected' ? 'selected' : 'featured';

  return {
    status: getTrimmedString(value['status']) === 'draft' ? 'draft' : 'published',
    featuredPostMode,
    featuredPostId: getTrimmedString(value['featuredPostId']) || null,
  };
}

function selectHomepageSocialPost(
  posts: readonly SeoBlogPostDocument[],
  settings: HomepageSocialSettings
): SeoBlogPostDocument | null {
  const newestPosts = [...posts].sort((left, right) => (
    (right.publishedAt ?? right.updatedAt).localeCompare(left.publishedAt ?? left.updatedAt)
    || right.updatedAt.localeCompare(left.updatedAt)
  ));

  // Draft CMS selections remain private; public metadata follows the default policy until settings publish.
  const publicSettings: HomepageSocialSettings = settings.status === 'published'
    ? settings
    : {status: 'published', featuredPostMode: 'featured', featuredPostId: null};

  if (publicSettings.featuredPostMode === 'selected' && publicSettings.featuredPostId) {
    const selectedPost = newestPosts.find(post => post.id === publicSettings.featuredPostId);
    if (selectedPost) {
      return selectedPost;
    }
  }

  const featuredPost = newestPosts.find(post => post.featured);
  if (featuredPost) {
    return featuredPost;
  }

  return newestPosts[0] ?? null;
}

function createLabsSeoMetadata(): SeoMetadata {
  return {
    ...createStaticSeoMetadata({
      title: createSiteTitle('Projects & Labs'),
      description: LABS_DESCRIPTION,
      path: '/labs',
      imageAlt: createPreviewImageAlt('projects and labs'),
    }),
    fallbackHtml: renderLabsFallbackHtml(),
  };
}

function createBlogIndexSeoMetadata(posts: readonly SeoBlogPostDocument[]): SeoMetadata {
  return {
    ...createStaticSeoMetadata({
      title: createSiteTitle('Blog'),
      description: BLOG_FEED_DESCRIPTION,
      path: '/blog',
      imageAlt: createPreviewImageAlt('blog'),
    }),
    fallbackHtml: renderBlogIndexFallbackHtml(posts),
  };
}

function createBlogSearchSeoMetadata(): SeoMetadata {
  return createStaticSeoMetadata({
    title: createSiteTitle('Search Blog'),
    description: BLOG_SEARCH_DESCRIPTION,
    path: '/blog/search',
    imageAlt: createPreviewImageAlt('blog search'),
    robots: 'noindex,follow',
  });
}

function createSiteSearchSeoMetadata(): SeoMetadata {
  return createStaticSeoMetadata({
    title: createSiteTitle('Search'),
    description: SITE_SEARCH_DESCRIPTION,
    path: '/search',
    imageAlt: createPreviewImageAlt('site search'),
    robots: 'noindex,follow',
  });
}

function createBlogCategorySeoMetadata(category: string, postCount: number): SeoMetadata {
  const categoryTitle = createTitleFromSlug(category || 'blog-category');

  return createStaticSeoMetadata({
    title: createSiteTitle(`${categoryTitle} Posts`),
    description: `Published ${PERSON_NAME} blog posts in the ${categoryTitle} category.`,
    path: `/blog/category/${createSeoSlug(categoryTitle)}`,
    imageAlt: `${categoryTitle} blog category preview card`,
    robots: postCount >= TAXONOMY_SITEMAP_MIN_POSTS ? undefined : 'noindex,follow',
  });
}

function createBlogTagSeoMetadata(tag: string, postCount: number): SeoMetadata {
  const tagTitle = createTitleFromSlug(tag || 'blog-tag');

  return createStaticSeoMetadata({
    title: createSiteTitle(`${tagTitle} Articles`),
    description: `Published ${PERSON_NAME} blog posts tagged ${tagTitle}.`,
    path: `/blog/tag/${createBlogTagSlug(tagTitle)}`,
    imageAlt: `${tagTitle} blog tag preview card`,
    robots: postCount >= TAG_SITEMAP_MIN_POSTS ? undefined : 'noindex,follow',
  });
}

function createMissingBlogPostSeoMetadata(slug: string): SeoMetadata {
  return {
    title: createSiteTitle('Post not found'),
    description: 'This post is unavailable or has not been published.',
    path: `/blog/${createSeoSlug(slug)}`,
    image: HOMEPAGE_OG_IMAGE,
    imageAlt: createPreviewImageAlt('blog'),
    type: 'website',
    robots: 'noindex,nofollow',
    statusCode: 404,
    cacheControl: 'public, max-age=60, s-maxage=60',
  };
}

function createMissingAuthorSeoMetadata(slug: string): SeoMetadata {
  return {
    title: createSiteTitle('Author not found'),
    description: 'This author profile is unavailable or has not been published.',
    path: `/authors/${createSeoSlug(slug)}`,
    image: HOMEPAGE_OG_IMAGE,
    imageAlt: createPreviewImageAlt('author profile'),
    type: 'website',
    robots: 'noindex,nofollow',
    statusCode: 404,
    cacheControl: 'public, max-age=60, s-maxage=60',
  };
}

function createNotFoundSeoMetadata(path: string): SeoMetadata {
  return {
    title: createSiteTitle('Page not found'),
    description: `This page could not be found on ${SITE_NAME}.`,
    path,
    image: HOMEPAGE_OG_IMAGE,
    imageAlt: createPreviewImageAlt('page not found'),
    type: 'website',
    robots: 'noindex,follow',
    statusCode: 404,
    cacheControl: 'public, max-age=60, s-maxage=60',
  };
}

function createNoindexRouteSeoMetadata(options: {
  title: string;
  description: string;
  path: string;
  image?: string;
  imageAlt: string;
  imageWidth?: number;
  imageHeight?: number;
}): SeoMetadata {
  return createStaticSeoMetadata({
    ...options,
    robots: 'noindex,nofollow',
  });
}

function createStaticSeoMetadata(options: {
  title: string;
  description: string;
  path: string;
  image?: string;
  imageAlt: string;
  imageWidth?: number;
  imageHeight?: number;
  robots?: string;
}): SeoMetadata {
  return {
    title: options.title,
    description: options.description,
    path: options.path,
    image: options.image ?? HOMEPAGE_OG_IMAGE,
    imageAlt: options.imageAlt,
    imageWidth: options.imageWidth,
    imageHeight: options.imageHeight,
    type: 'website',
    robots: options.robots,
  };
}

function createTopicHubSeoMetadata(topicHub: typeof TOPIC_HUBS[number]): SeoMetadata {
  return {
    title: topicHub.title,
    description: topicHub.description,
    path: `/topics/${topicHub.slug}`,
    image: topicHub.image,
    imageAlt: topicHub.imageAlt,
    type: 'website',
    structuredData: createTopicHubJsonLd(topicHub),
    fallbackHtml: renderTopicHubFallbackHtml(topicHub),
  };
}

function getTopicHubBySlug(slug: string): typeof TOPIC_HUBS[number] | undefined {
  const normalizedSlug = createSeoSlug(slug);

  return TOPIC_HUBS.find(topicHub => topicHub.slug === normalizedSlug);
}

function isOsRoute(path: string): boolean {
  return OS_ROUTES.includes(path as typeof OS_ROUTES[number])
    || OS_ROUTE_PREFIXES.some(prefix => path === prefix || path.startsWith(`${prefix}/`));
}

function isAdminRoute(path: string): boolean {
  return ADMIN_ROUTE_PREFIXES.some(prefix => path === prefix || path.startsWith(`${prefix}/`));
}

function getTaxonomyPostCount(posts: readonly SitemapBlogPostDocument[], category: string): number {
  const slug = createBlogCategorySlug(category);

  return posts.filter(post => getSitemapTaxonomyTerms(post).some(term => createBlogCategorySlug(term) === slug)).length;
}

function getTagPostCount(posts: readonly SitemapBlogPostDocument[], tag: string): number {
  const slug = createBlogTagSlug(tag);

  return posts.filter(post => post.tags.some(postTag => createBlogTagSlug(postTag) === slug)).length;
}

function createBlogPostSeoMetadata(post: SeoBlogPostDocument): SeoMetadata {
  const title = stripHtml(post.ogTitle || post.seoTitle || post.title);
  const description = truncateDescription(stripHtml(post.ogDescription || post.seoDescription || post.excerpt));
  const image = toOpenGraphCompatibleImage(post.seoOpenGraphImage || post.ogImage || post.thumbnailImage || post.coverImage || HOMEPAGE_OG_IMAGE);
  const imageWidth = post.seoOpenGraphImageWidth ?? post.ogImageWidth ?? DEFAULT_OG_IMAGE_WIDTH;
  const imageHeight = post.seoOpenGraphImageHeight ?? post.ogImageHeight ?? DEFAULT_OG_IMAGE_HEIGHT;
  const url = post.seoCanonical || createAbsoluteUrl(`/blog/${post.slug}`);

  return {
    title,
    description,
    path: `/blog/${post.slug}`,
    image,
    imageAlt: post.ogImageAlt || post.imageAlt || `${title} preview image`,
    imageWidth,
    imageHeight,
    type: 'article',
    robots: post.catCornerHidden ? 'noindex,nofollow' : undefined,
    article: {
      publishedAt: post.publishedAt ?? post.updatedAt,
      modifiedAt: post.updatedAt,
      author: post.authorName,
      section: post.categories[0],
      tags: post.tags,
    },
    structuredData: createBlogPostingJsonLd({
      title,
      description,
      url,
      image: createAbsoluteUrl(image),
      author: post.authorName,
      authorUrl: post.authorUrl,
      publishedAt: post.publishedAt,
      modifiedAt: post.updatedAt,
    }),
    fallbackHtml: renderBlogPostFallbackHtml(post, {title, description, image}),
  };
}

function createAuthorSeoMetadata(
  author: SeoAuthorDocument,
  posts: readonly SeoBlogPostDocument[]
): SeoMetadata {
  const path = `/authors/${author.slug}`;
  const description = truncateDescription(stripHtml(author.shortBio || author.bio || `${author.name} writes for ${SITE_NAME}.`));
  const image = toOpenGraphCompatibleImage(author.imageUrl || HOMEPAGE_OG_IMAGE);

  return {
    title: createSiteTitle(author.name),
    description,
    path,
    image,
    imageAlt: author.imageAlt || `${author.name} author profile`,
    type: 'website',
    structuredData: createAuthorProfileJsonLd(author, posts),
    fallbackHtml: renderAuthorFallbackHtml(author, posts),
  };
}

function createBlogPreviewSeoMetadata(post: SeoBlogPostDocument, previewToken: string): SeoMetadata {
  const title = stripHtml(post.ogTitle || post.seoTitle || post.title);
  const description = truncateDescription(stripHtml(post.ogDescription || post.seoDescription || post.excerpt));
  const image = toOpenGraphCompatibleImage(post.seoOpenGraphImage || post.ogImage || post.thumbnailImage || post.coverImage || HOMEPAGE_OG_IMAGE);
  const imageWidth = post.seoOpenGraphImageWidth ?? post.ogImageWidth ?? DEFAULT_OG_IMAGE_WIDTH;
  const imageHeight = post.seoOpenGraphImageHeight ?? post.ogImageHeight ?? DEFAULT_OG_IMAGE_HEIGHT;

  return {
    title,
    description,
    path: `/blog/preview/${previewToken}`,
    image,
    imageAlt: post.ogImageAlt || post.imageAlt || `${title} preview image`,
    imageWidth,
    imageHeight,
    type: 'article',
    robots: 'noindex,nofollow',
    article: {
      modifiedAt: post.updatedAt,
      author: post.authorName,
      section: post.categories[0],
      tags: post.tags,
    },
  };
}

async function fetchPublishedSeoBlogPost(slug: string): Promise<SeoBlogPostDocument | null> {
  if (!slug) {
    return null;
  }

  const snapshot = await getFirestore()
    .collection('posts')
    .where('slug', '==', slug)
    .where('status', '==', 'published')
    .limit(1)
    .get();
  const document = snapshot.docs[0];

  if (!document) {
    return null;
  }

  return toSeoBlogPostDocument(document.data(), document.id);
}

async function fetchPreviewSeoBlogPost(previewToken: string): Promise<SeoBlogPostDocument | null> {
  if (!previewToken) {
    return null;
  }

  const document = await getFirestore()
    .collection('postPreviews')
    .doc(previewToken)
    .get();
  const value = document.data();

  if (!isRecord(value) || typeof value['expiresAtMillis'] !== 'number' || value['expiresAtMillis'] <= Date.now()) {
    return null;
  }

  const post = isRecord(value['post']) ? value['post'] : null;

  if (!post || getTrimmedString(post['status']) !== 'draft') {
    return null;
  }

  return toSeoBlogPostDocument(post);
}

async function fetchPublishedSeoAuthor(slug: string): Promise<SeoAuthorDocument | null> {
  const normalizedSlug = createSeoSlug(slug);

  if (!normalizedSlug) {
    return null;
  }

  const snapshot = await getFirestore()
    .collection(AUTHORS_COLLECTION)
    .where('slug', '==', normalizedSlug)
    .get();
  const document = snapshot.docs.find(candidate => candidate.get('status') === 'published');

  if (document) {
    return toSeoAuthorDocument(document.data(), document.id);
  }

  return normalizedSlug === DEFAULT_AUTHOR_SLUG ? createDefaultSeoAuthor() : null;
}

async function fetchPublishedSeoAuthors(): Promise<readonly SeoAuthorDocument[]> {
  const snapshot = await getFirestore()
    .collection(AUTHORS_COLLECTION)
    .where('status', '==', 'published')
    .get();

  const authors = snapshot.docs
    .map(document => toSeoAuthorDocument(document.data(), document.id))
    .filter((author): author is SeoAuthorDocument => author !== null);

  return authors.some(author => author.id === DEFAULT_AUTHOR_ID || author.slug === DEFAULT_AUTHOR_SLUG)
    ? authors
    : [createDefaultSeoAuthor(), ...authors];
}

function createDefaultSeoAuthor(): SeoAuthorDocument {
  return {
    id: DEFAULT_AUTHOR_ID,
    slug: DEFAULT_AUTHOR_SLUG,
    name: PERSON_NAME,
    title: PERSON_JOB_TITLE,
    shortBio: PERSON_PROFILE_DESCRIPTION,
    bio: PERSON_PROFILE_DESCRIPTION,
    imageUrl: HOMEPAGE_OG_IMAGE,
    imageAlt: createPreviewImageAlt('author profile'),
    location: '',
    externalProfiles: PERSON_SAME_AS,
    updatedAt: '',
  };
}

function toSeoAuthorDocument(value: unknown, fallbackId: string): SeoAuthorDocument | null {
  if (!isRecord(value)) {
    return null;
  }

  const id = getTrimmedString(value['id']) || fallbackId;
  const name = getTrimmedString(value['name']);
  const slug = createSeoSlug(getTrimmedString(value['slug']) || id);

  if (!id || !name || !slug) {
    return null;
  }

  const rawExternalProfiles = Array.isArray(value['externalProfiles']) ? value['externalProfiles'] : [];

  return {
    id,
    slug,
    name,
    title: getTrimmedString(value['title']),
    shortBio: getTrimmedString(value['shortBio']),
    bio: getTrimmedString(value['bio']),
    imageUrl: getTrimmedString(value['imageUrl']) || getTrimmedString(value['avatarUrl']),
    imageAlt: getTrimmedString(value['imageAlt']),
    location: getTrimmedString(value['location']),
    externalProfiles: rawExternalProfiles
      .map(profile => isRecord(profile)
        ? getTrimmedString(profile['href']) || getTrimmedString(profile['url'])
        : getTrimmedString(profile))
      .filter(isNonEmptyString)
      .filter(isSafeExternalProfileUrl),
    updatedAt: getIsoString(value['updatedAt']),
  };
}

function getPostAuthorId(value: Record<string, unknown>): string {
  const author = isRecord(value['author']) ? value['author'] : {};

  return getTrimmedString(value['authorId']) || getTrimmedString(author['id']) || DEFAULT_AUTHOR_ID;
}

function getPostAuthorSlug(value: Record<string, unknown>): string {
  const author = isRecord(value['author']) ? value['author'] : {};
  const slug = getTrimmedString(value['authorSlug']) || getTrimmedString(author['slug']);

  return createSeoSlug(slug || (getPostAuthorId(value) === DEFAULT_AUTHOR_ID ? DEFAULT_AUTHOR_SLUG : getPostAuthorId(value)));
}

function getPostAuthorUrl(value: Record<string, unknown>): string {
  const author = isRecord(value['author']) ? value['author'] : {};
  const explicitUrl = getTrimmedString(value['authorUrl'])
    || getTrimmedString(author['url'])
    || getTrimmedString(author['profileUrl']);

  return explicitUrl ? createAbsoluteUrl(explicitUrl) : createAbsoluteUrl(`/authors/${getPostAuthorSlug(value)}`);
}

function isPostByAuthor(post: SeoBlogPostDocument, author: SeoAuthorDocument): boolean {
  return post.authorId === author.id || post.authorSlug === author.slug;
}

function toSeoBlogPostDocument(value: unknown, fallbackId = ''): SeoBlogPostDocument | null {
  if (!isRecord(value)) {
    return null;
  }

  const seo = isRecord(value['seo']) ? value['seo'] : {};
  const og = isRecord(value['og']) ? value['og'] : {};
  const rawAuthor = value['author'];
  const author = isRecord(rawAuthor) ? rawAuthor : {};
  const blocks = Array.isArray(value['blocks']) ? value['blocks'] : [];
  const title = getTrimmedString(value['title']);
  const slug = getTrimmedString(value['slug']);

  if (!title || !slug) {
    return null;
  }

  return {
    id: getTrimmedString(value['id']) || fallbackId || slug,
    featured: value['featured'] === true,
    catCornerHidden: isHiddenCatCornerPost(value),
    slug,
    title,
    excerpt: getTrimmedString(value['excerpt']),
    coverImage: getTrimmedString(value['coverImage']),
    thumbnailImage: getTrimmedString(value['thumbnailImage']),
    authorName: getTrimmedString(author['name']) || getTrimmedString(rawAuthor) || PERSON_NAME,
    authorId: getPostAuthorId(value),
    authorSlug: getPostAuthorSlug(value),
    authorUrl: getPostAuthorUrl(value),
    categories: getStringArrayValue(value['categories']),
    tags: getStringArrayValue(value['tags']),
    seoTitle: getTrimmedString(seo['title']) || getTrimmedString(seo['metaTitle']),
    seoDescription: getTrimmedString(seo['description']) || getTrimmedString(seo['metaDescription']),
    seoCanonical: getTrimmedString(seo['canonical']),
    seoOpenGraphImage: getTrimmedString(seo['openGraphImage']),
    seoOpenGraphImageWidth: getPositiveInteger(seo['openGraphImageWidth']),
    seoOpenGraphImageHeight: getPositiveInteger(seo['openGraphImageHeight']),
    ogTitle: getTrimmedString(og['title']),
    ogDescription: getTrimmedString(og['description']),
    ogImage: getTrimmedString(og['image']),
    ogImageAlt: getTrimmedString(og['imageAlt']),
    ogImageWidth: getPositiveInteger(og['imageWidth']) ?? getPositiveInteger(og['width']),
    ogImageHeight: getPositiveInteger(og['imageHeight']) ?? getPositiveInteger(og['height']),
    updatedAt: getIsoString(value['updatedAt']) || new Date(0).toISOString(),
    publishedAt: getIsoString(value['publishedAt']) || null,
    imageAlt: getFirstImageAlt(blocks),
    blocks: blocks
      .filter(isBlogContentBlock)
      .map(block => ({
        id: block.id,
        type: block.type,
        data: block.data,
      })),
  };
}

function injectSeoMetadata(template: string, metadata: SeoMetadata): string {
  const tags = renderSeoTags(metadata);
  const cleanedTemplate = template
    .replace(/<title>[\s\S]*?<\/title>\s*/i, '')
    .replace(/<meta\s+(?:name|property)=["'](?:description|robots|twitter:[^"']+|og:[^"']+|article:[^"']+)["'][^>]*>\s*/gi, '')
    .replace(/<link\s+rel=["']canonical["'][^>]*>\s*/gi, '')
    .replace(/<script[^>]*id=["']seo-json-ld["'][\s\S]*?<\/script>\s*/gi, '');

  return injectFallbackHtml(cleanedTemplate.replace(/<\/head>/i, `${tags}\n</head>`), metadata.fallbackHtml);
}

function injectFallbackHtml(template: string, fallbackHtml: string | undefined): string {
  if (!fallbackHtml) {
    return template;
  }

  return template.replace(/<app-root>\s*<\/app-root>/i, `<app-root>\n${fallbackHtml}\n</app-root>`);
}

function renderSeoTags(metadata: SeoMetadata): string {
  const url = createAbsoluteUrl(metadata.path);
  const image = createAbsoluteUrl(metadata.image);
  const robots = metadata.robots ?? 'index,follow';
  const imageWidth = String(metadata.imageWidth ?? DEFAULT_OG_IMAGE_WIDTH);
  const imageHeight = String(metadata.imageHeight ?? DEFAULT_OG_IMAGE_HEIGHT);
  const tags = [
    `<title>${escapeHtml(metadata.title)}</title>`,
    `<meta name="description" content="${escapeHtml(metadata.description)}">`,
    `<meta name="robots" content="${escapeHtml(robots)}">`,
    `<link rel="canonical" href="${escapeHtml(url)}">`,
    `<link rel="alternate" type="application/rss+xml" title="${escapeHtml(`${SITE_NAME} Blog RSS Feed`)}" href="${escapeHtml(createAbsoluteUrl('/feed.xml'))}">`,
    `<link rel="alternate" type="application/feed+json" title="${escapeHtml(`${SITE_NAME} Blog JSON Feed`)}" href="${escapeHtml(createAbsoluteUrl('/feed.json'))}">`,
    `<meta property="og:site_name" content="${escapeHtml(SITE_NAME)}">`,
    `<meta property="og:locale" content="${escapeHtml(DEFAULT_LOCALE)}">`,
    `<meta property="og:type" content="${escapeHtml(metadata.type)}">`,
    `<meta property="og:title" content="${escapeHtml(metadata.title)}">`,
    `<meta property="og:description" content="${escapeHtml(metadata.description)}">`,
    `<meta property="og:url" content="${escapeHtml(url)}">`,
    `<meta property="og:image" content="${escapeHtml(image)}">`,
    `<meta property="og:image:width" content="${escapeHtml(imageWidth)}">`,
    `<meta property="og:image:height" content="${escapeHtml(imageHeight)}">`,
    `<meta property="og:image:url" content="${escapeHtml(image)}">`,
    `<meta property="og:image:secure_url" content="${escapeHtml(image)}">`,
    `<meta property="og:image:type" content="${escapeHtml(getImageMimeType(image))}">`,
    `<meta property="og:image:alt" content="${escapeHtml(metadata.imageAlt)}">`,
    '<meta name="twitter:card" content="summary_large_image">',
    `<meta name="twitter:title" content="${escapeHtml(metadata.title)}">`,
    `<meta name="twitter:description" content="${escapeHtml(metadata.description)}">`,
    `<meta name="twitter:image" content="${escapeHtml(image)}">`,
    `<meta name="twitter:image:alt" content="${escapeHtml(metadata.imageAlt)}">`,
    ...renderArticleTags(metadata.article),
    renderStructuredDataTag(metadata.structuredData),
  ].filter(tag => tag.length > 0);

  return tags.join('\n  ');
}

function renderArticleTags(article: SeoArticleMetadata | undefined): string[] {
  if (!article) {
    return [];
  }

  const tags = [
    renderOptionalPropertyTag('article:published_time', article.publishedAt),
    renderOptionalPropertyTag('article:modified_time', article.modifiedAt),
    renderOptionalPropertyTag('article:author', article.author),
    renderOptionalPropertyTag('article:section', article.section),
    ...(article.tags ?? []).map(tag => renderOptionalPropertyTag('article:tag', tag)),
  ];

  return tags.filter(tag => tag.length > 0);
}

function renderOptionalPropertyTag(property: string, content: string | undefined): string {
  return content ? `<meta property="${escapeHtml(property)}" content="${escapeHtml(content)}">` : '';
}

function renderStructuredDataTag(data: unknown): string {
  if (!data) {
    return '';
  }

  return `<script id="seo-json-ld" type="application/ld+json">${escapeScriptJson(JSON.stringify(data))}</script>`;
}

function readSeoIndexTemplate(): string {
  if (existsSync(SEO_INDEX_TEMPLATE_PATH)) {
    return readFileSync(SEO_INDEX_TEMPLATE_PATH, 'utf8');
  }

  return `<!doctype html><html lang="en"><head></head><body><app-root></app-root></body></html>`;
}

function getRequestPath(request: { originalUrl?: unknown; path?: unknown }): string {
  const originalUrl = getTrimmedString(request.originalUrl);
  const path = getTrimmedString(request.path);

  if (path && path !== '/') {
    return path;
  }

  if (originalUrl) {
    return originalUrl.split('?')[0] || '/';
  }

  return '/';
}

function normalizeSeoPath(path: string): string {
  const pathname = path.split('?')[0].split('#')[0].trim() || '/';
  const normalizedPath = pathname.startsWith('/') ? pathname : `/${pathname}`;
  const withoutIndex = normalizedPath.endsWith('/index.html')
    ? normalizedPath.slice(0, -'/index.html'.length) || '/'
    : normalizedPath;
  const withoutTrailingSlash = withoutIndex.length > 1 ? withoutIndex.replace(/\/+$/, '') : withoutIndex;

  return withoutTrailingSlash || '/';
}

function isStaticAssetRequest(path: string): boolean {
  return STATIC_ASSET_PATH_PATTERN.test(normalizeSeoPath(path));
}

function decodeSlugSegment(value: string): string {
  try {
    return decodeURIComponent(value.split('/')[0] ?? '');
  } catch {
    return value.split('/')[0] ?? '';
  }
}

function createAbsoluteUrl(value: string): string {
  const trimmedValue = value.trim();

  if (!trimmedValue) {
    return SITE_URL;
  }

  try {
    return new URL(trimmedValue, SITE_URL).toString();
  } catch {
    return trimmedValue;
  }
}

function isSafeExternalProfileUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}

function appendSocialImageVersion(imageUrl: string, versionSeed: string): string {
  const trimmedImageUrl = imageUrl.trim();
  if (!trimmedImageUrl) {
    return trimmedImageUrl;
  }

  const fragmentIndex = trimmedImageUrl.indexOf('#');
  const base = fragmentIndex >= 0 ? trimmedImageUrl.slice(0, fragmentIndex) : trimmedImageUrl;
  const fragment = fragmentIndex >= 0 ? trimmedImageUrl.slice(fragmentIndex) : '';
  const separator = base.includes('?') ? '&' : '?';

  return `${base}${separator}ogv=${createStableSocialVersion(versionSeed)}${fragment}`;
}

function createStableSocialVersion(value: string): string {
  let hash = 0x811c9dc5;

  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }

  return (hash >>> 0).toString(36).padStart(7, '0');
}

function toOpenGraphCompatibleImage(value: string): string {
  const image = createAbsoluteUrl(value || HOMEPAGE_OG_IMAGE);

  if (!isWebpImageUrl(image)) {
    return image;
  }

  const jpegAsset = createJpegAssetUrl(image);

  return jpegAsset || HOMEPAGE_OG_IMAGE;
}

function isWebpImageUrl(value: string): boolean {
  return parseUrlPathname(value).endsWith('.webp');
}

function createJpegAssetUrl(value: string): string {
  try {
    const url = new URL(value, SITE_URL);

    return url.origin === SITE_URL && url.pathname.startsWith('/assets/')
      ? `${url.pathname.replace(/\.webp$/i, '.jpg')}${url.search}${url.hash}`
      : '';
  } catch {
    return '';
  }
}

function createHomeJsonLd(): Record<string, unknown> {
  return {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'Person',
        '@id': SEO_ENTITY_IDS.person,
        name: PERSON_NAME,
        url: SITE_URL,
        jobTitle: PERSON_JOB_TITLE,
        image: `${SITE_URL}${HOMEPAGE_OG_IMAGE}`,
        description: PERSON_PROFILE_DESCRIPTION,
        knowsAbout: PERSON_KNOWS_ABOUT,
        sameAs: PERSON_SAME_AS,
      },
      {
        '@type': 'WebSite',
        '@id': SEO_ENTITY_IDS.website,
        url: SITE_URL,
        name: SITE_NAME,
        alternateName: SITE_ALTERNATE_NAMES,
        description: HOMEPAGE_DESCRIPTION,
        publisher: {
          '@id': SEO_ENTITY_IDS.person,
        },
      },
      {
        '@type': ['ProfilePage', 'WebPage'],
        '@id': SEO_ENTITY_IDS.homepage,
        url: SITE_URL,
        name: HOMEPAGE_TITLE,
        description: HOMEPAGE_DESCRIPTION,
        isPartOf: {
          '@id': SEO_ENTITY_IDS.website,
        },
        publisher: {
          '@id': SEO_ENTITY_IDS.person,
        },
        mainEntity: {
          '@id': SEO_ENTITY_IDS.person,
        },
        about: {
          '@id': SEO_ENTITY_IDS.person,
        },
      },
    ],
  };
}

function createBlogPostingJsonLd(options: {
  title: string;
  description: string;
  url: string;
  image: string;
  author: string;
  authorUrl: string;
  publishedAt: string | null;
  modifiedAt: string;
}): Record<string, unknown> {
  return {
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    headline: options.title,
    description: options.description,
    url: options.url,
    image: [options.image],
    datePublished: options.publishedAt ?? options.modifiedAt,
    dateModified: options.modifiedAt,
    author: {
      '@type': 'Person',
      name: options.author,
      url: options.authorUrl,
    },
    publisher: {
      '@type': 'Person',
      name: PERSON_NAME,
      url: SITE_URL,
    },
    mainEntityOfPage: {
      '@type': 'WebPage',
      '@id': options.url,
    },
  };
}

function createAuthorProfileJsonLd(
  author: SeoAuthorDocument,
  posts: readonly SeoBlogPostDocument[]
): Record<string, unknown> {
  const url = createAbsoluteUrl(`/authors/${author.slug}`);
  const personId = `${url}#person`;

  return {
    '@context': 'https://schema.org',
    '@type': 'ProfilePage',
    url,
    name: `${author.name} - Author at ${SITE_NAME}`,
    description: author.shortBio || author.bio,
    isPartOf: {
      '@type': 'WebSite',
      '@id': SEO_ENTITY_IDS.website,
      url: SITE_URL,
      name: SITE_NAME,
    },
    mainEntity: {
      '@type': 'Person',
      '@id': personId,
      name: author.name,
      jobTitle: author.title || undefined,
      description: author.shortBio || author.bio || undefined,
      image: author.imageUrl ? createAbsoluteUrl(author.imageUrl) : undefined,
      url,
      homeLocation: author.location ? { '@type': 'Place', name: author.location } : undefined,
      sameAs: author.externalProfiles.length > 0 ? author.externalProfiles : undefined,
      subjectOf: posts.slice(0, 20).map(post => ({
        '@type': 'BlogPosting',
        headline: post.title,
        url: createAbsoluteUrl(`/blog/${post.slug}`),
      })),
    },
    publisher: {
      '@id': SEO_ENTITY_IDS.person,
      name: PERSON_NAME,
      url: SITE_URL,
    },
  };
}

function createTopicHubJsonLd(topicHub: typeof TOPIC_HUBS[number]): Record<string, unknown> {
  const url = createAbsoluteUrl(`/topics/${topicHub.slug}`);

  return {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: topicHub.heading,
    description: topicHub.description,
    url,
    isPartOf: {
      '@type': 'WebSite',
      name: SITE_NAME,
      url: SITE_URL,
    },
    publisher: {
      '@type': 'Person',
      name: PERSON_NAME,
      url: SITE_URL,
    },
  };
}

function renderHomeFallbackHtml(): string {
  const primaryLinks = [
    {
      href: '/blog',
      label: 'Read the blog',
      description: 'Current essays, implementation notes, recovery updates, and project writeups.'
    },
    {
      href: '/labs',
      label: 'Open labs',
      description: 'Interactive demos and reusable OS-style browser interface experiments.'
    },
    {
      href: '/topics/ai-setup',
      label: 'AI setup guides',
      description: 'Practical notes for using AI tools with clearer context and safer workflows.'
    },
    {
      href: '/topics/angular-firebase-architecture',
      label: 'Angular and Firebase notes',
      description: 'Architecture notes for the public site, CMS, routing, and SEO renderer.'
    },
  ];
  const topicLinks = TOPIC_HUBS.map(topicHub => (
    `<li><a href="${escapeHtml(createAbsoluteUrl(`/topics/${topicHub.slug}`))}">${escapeHtml(topicHub.heading)}</a> - ${escapeHtml(topicHub.description)}</li>`
  )).join('\n');
  const linkItems = primaryLinks.map(link => (
    `<li><a href="${escapeHtml(createAbsoluteUrl(link.href))}">${escapeHtml(link.label)}</a> - ${escapeHtml(link.description)}</li>`
  )).join('\n');

  return renderFallbackShell({
    eyebrow: 'Portfolio / Blog / Labs',
    title: PERSON_NAME,
    description: HOMEPAGE_DESCRIPTION,
    body: [
      '<section class="seo-fallback-article">',
      `  <h2>About ${escapeHtml(PERSON_NAME)}</h2>`,
      `  <p>${escapeHtml(HOMEPAGE_ANSWER_SUMMARY)}</p>`,
      `  <p class="seo-fallback-meta">By ${escapeHtml(PERSON_NAME)} - applications developer, FPV drone pilot, creative technologist, and writer based in Florida.</p>`,
      '  <h2>Start here</h2>',
      '  <ul class="seo-fallback-list">',
      linkItems,
      '  </ul>',
      '  <h2>Topic hubs</h2>',
      '  <ul class="seo-fallback-list">',
      topicLinks,
      '  </ul>',
      '</section>',
    ].join('\n'),
  });
}

function renderLabsFallbackHtml(): string {
  const labItems = [
    {
      title: 'Core OS Framework',
      href: '/os',
      description: 'Reusable dock, window manager, terminal, tooltip, context menu, desktop UI, and command-system experiments.',
    },
    {
      title: 'Full Screen Background Lab',
      href: '/background',
      description: 'Image, video, overlay, and parallax background tests for visual interaction work.',
    },
    {
      title: 'Project and Blog Writeups',
      href: '/blog/category/projects',
      description: 'Public notes that explain which experiments are durable, rough, archived, or still evolving.',
    },
    {
      title: 'Labs Topic Hub',
      href: '/topics/labs-projects',
      description: 'A guide to labs, project demos, browser experiments, UI systems, and creative coding notes.',
    },
  ].map(item => [
    '<article class="seo-fallback-card">',
    `  <h2><a href="${escapeHtml(createAbsoluteUrl(item.href))}">${escapeHtml(item.title)}</a></h2>`,
    `  <p>${escapeHtml(item.description)}</p>`,
    '</article>',
  ].join('\n')).join('\n');

  return renderFallbackShell({
    eyebrow: 'Labs',
    title: 'Projects & Labs',
    description: LABS_DESCRIPTION,
    body: [
      '<section class="seo-fallback-article">',
      '  <h2>Experimental systems stay visible</h2>',
      '  <p>Labs collect visual, browser, music, game, and interaction prototypes without mixing them into production website page logic. Durable OS-style systems belong in Core OS, while unfinished or exploratory work stays isolated in labs, archive, or playground paths.</p>',
      '  <h2>Explore the public lab paths</h2>',
      labItems,
      '</section>',
    ].join('\n'),
  });
}

function renderBlogIndexFallbackHtml(posts: readonly SeoBlogPostDocument[]): string {
  const items = posts.slice(0, 12).map(post => {
    const title = stripHtml(post.ogTitle || post.seoTitle || post.title);
    const description = truncateDescription(stripHtml(post.ogDescription || post.seoDescription || post.excerpt));
    const publishedAt = post.publishedAt ?? post.updatedAt;

    return [
      '<article class="seo-fallback-card">',
      `  <h2><a href="${escapeHtml(createAbsoluteUrl(`/blog/${post.slug}`))}">${escapeHtml(title)}</a></h2>`,
      `  <p class="seo-fallback-meta">${escapeHtml(formatFallbackDate(publishedAt))}</p>`,
      `  <p>${escapeHtml(description)}</p>`,
      '</article>',
    ].join('\n');
  }).join('\n');

  return renderFallbackShell({
    eyebrow: 'Blog',
    title: 'Latest writing',
    description: BLOG_FEED_DESCRIPTION,
    body: items || '<p>No published posts are available yet.</p>',
  });
}

function renderBlogPostFallbackHtml(
  post: SeoBlogPostDocument,
  metadata: {
    title: string;
    description: string;
    image: string;
  }
): string {
  const categoryLinks = post.categories.map(category => (
    `<a href="${escapeHtml(createAbsoluteUrl(`/blog/category/${createBlogCategorySlug(category)}`))}">${escapeHtml(category)}</a>`
  )).join(' ');
  const tagLinks = post.tags.map(tag => (
    `<a href="${escapeHtml(createAbsoluteUrl(`/blog/tag/${createBlogTagSlug(tag)}`))}">${escapeHtml(tag)}</a>`
  )).join(' ');
  const body = post.blocks
    .map(renderBlogContentBlockFallbackHtml)
    .filter(Boolean)
    .join('\n');

  return renderFallbackShell({
    eyebrow: 'Article',
    title: metadata.title,
    description: metadata.description,
    body: [
      '<article class="seo-fallback-article">',
      `  <p class="seo-fallback-meta">By <a href="${escapeHtml(post.authorUrl)}">${escapeHtml(post.authorName)}</a> - ${escapeHtml(formatFallbackDate(post.publishedAt ?? post.updatedAt))}</p>`,
      categoryLinks ? `  <nav aria-label="Article categories" class="seo-fallback-taxonomy">${categoryLinks}</nav>` : '',
      `  <img src="${escapeHtml(createAbsoluteUrl(metadata.image))}" alt="${escapeHtml(post.imageAlt || `${metadata.title} preview image`)}" loading="eager">`,
      body || `  <p>${escapeHtml(metadata.description)}</p>`,
      tagLinks ? `  <nav aria-label="Article tags" class="seo-fallback-taxonomy">${tagLinks}</nav>` : '',
      '</article>',
    ].filter(Boolean).join('\n'),
  });
}

function renderAuthorFallbackHtml(
  author: SeoAuthorDocument,
  posts: readonly SeoBlogPostDocument[]
): string {
  const latestPublishedAt = getLatestIsoDate(posts
    .flatMap(post => [post.publishedAt, post.updatedAt])
    .filter(isNonEmptyString));
  const postItems = posts.slice(0, 20).map(post => [
    '<article class="seo-fallback-card">',
    `  <h2><a href="${escapeHtml(createAbsoluteUrl(`/blog/${post.slug}`))}">${escapeHtml(post.title)}</a></h2>`,
    `  <p class="seo-fallback-meta">${escapeHtml(formatFallbackDate(post.publishedAt ?? post.updatedAt))}</p>`,
    post.excerpt ? `  <p>${escapeHtml(truncateDescription(stripHtml(post.excerpt)))}</p>` : '',
    '</article>',
  ].filter(Boolean).join('\n')).join('\n');

  return renderFallbackShell({
    eyebrow: 'Author',
    title: author.name,
    description: author.shortBio || author.bio || `${author.name} writes for ${SITE_NAME}.`,
    body: [
      '<section class="seo-fallback-article">',
      author.imageUrl
        ? `  <img src="${escapeHtml(createAbsoluteUrl(author.imageUrl))}" alt="${escapeHtml(author.imageAlt || `${author.name} author profile`)}" loading="eager">`
        : '',
      author.title ? `  <p>${escapeHtml(author.title)}</p>` : '',
      author.location ? `  <p>${escapeHtml(author.location)}</p>` : '',
      author.bio && author.bio !== author.shortBio ? `  <p>${escapeHtml(stripHtml(author.bio))}</p>` : '',
      `  <p class="seo-fallback-meta">${posts.length} published ${posts.length === 1 ? 'article' : 'articles'}${latestPublishedAt ? ` - Latest ${escapeHtml(formatFallbackDate(latestPublishedAt))}` : ''}</p>`,
      '  <h2>Published articles</h2>',
      postItems || '  <p>No published posts are available for this author yet.</p>',
      '</section>',
    ].filter(Boolean).join('\n'),
  });
}

function renderTopicHubFallbackHtml(topicHub: typeof TOPIC_HUBS[number]): string {
  const assetItems = [
    '<ol>',
    ...topicHub.assetItems.map(item => `  <li>${escapeHtml(item)}</li>`),
    '</ol>',
  ].join('\n');
  const quickLinks = [
    '<ul class="seo-fallback-list">',
    ...topicHub.terms.slice(0, 8).map(term => (
      `  <li><a href="${escapeHtml(createAbsoluteUrl(`/blog/search?q=${encodeURIComponent(term)}`))}">${escapeHtml(createTitleFromSlug(createSeoSlug(term)))}</a></li>`
    )),
    '</ul>',
  ].join('\n');

  return renderFallbackShell({
    eyebrow: 'Topic Hub',
    title: topicHub.heading,
    description: topicHub.description,
    body: [
      '<section class="seo-fallback-article">',
      '  <h2>Start here</h2>',
      `  <p>${escapeHtml(topicHub.description)}</p>`,
      `  <h2>${escapeHtml(topicHub.assetTitle)}</h2>`,
      `  <p>${escapeHtml(topicHub.assetIntro)}</p>`,
      assetItems,
      '  <h2>Related searches</h2>',
      quickLinks,
      '</section>',
    ].join('\n'),
  });
}

function renderBlogContentBlockFallbackHtml(block: BlogContentBlock): string {
  const data = block.data;

  switch (block.type) {
    case 'header': {
      const text = stripHtml(data.text ?? '');

      if (!text) {
        return '';
      }

      return data.level === 3
        ? `<h3>${escapeHtml(text)}</h3>`
        : `<h2>${escapeHtml(text)}</h2>`;
    }

    case 'paragraph':
    case 'typography': {
      const text = stripHtml(data.text ?? '');

      return text ? `<p>${escapeHtml(text)}</p>` : '';
    }

    case 'list': {
      const items = (data.items ?? [])
        .map(item => stripHtml(item))
        .filter(Boolean)
        .map(item => `  <li>${escapeHtml(item)}</li>`)
        .join('\n');

      if (!items) {
        return '';
      }

      return data.ordered ? `<ol>\n${items}\n</ol>` : `<ul>\n${items}\n</ul>`;
    }

    case 'quote': {
      const text = stripHtml(data.text ?? '');
      const caption = stripHtml(data.caption ?? data.attribution ?? '');

      if (!text) {
        return '';
      }

      return caption
        ? `<blockquote><p>${escapeHtml(text)}</p><cite>${escapeHtml(caption)}</cite></blockquote>`
        : `<blockquote><p>${escapeHtml(text)}</p></blockquote>`;
    }

    case 'code': {
      const code = data.code?.trim() ?? '';

      return code ? `<pre><code>${escapeHtml(code)}</code></pre>` : '';
    }

    case 'image': {
      const url = data.url?.trim() ?? '';
      const alt = stripHtml(data.alt ?? data.caption ?? '');

      return url ? `<img src="${escapeHtml(createAbsoluteUrl(url))}" alt="${escapeHtml(alt)}" loading="lazy">` : '';
    }

    case 'embed': {
      const caption = stripHtml(data.caption ?? data.provider ?? '');
      const url = data.embedUrl?.trim() || data.url?.trim() || '';

      return url
        ? `<p><a href="${escapeHtml(createAbsoluteUrl(url))}">${escapeHtml(caption || url)}</a></p>`
        : '';
    }

    case 'delimiter':
      return '<hr>';

    default: {
      const text = stripHtml(data.text ?? data.caption ?? '');

      return text ? `<p>${escapeHtml(text)}</p>` : '';
    }
  }
}

function renderFallbackShell(options: {
  eyebrow: string;
  title: string;
  description: string;
  body: string;
}): string {
  return [
    '<main class="seo-fallback">',
    `  <p class="seo-fallback-eyebrow">${escapeHtml(options.eyebrow)}</p>`,
    `  <h1>${escapeHtml(options.title)}</h1>`,
    `  <p class="seo-fallback-description">${escapeHtml(options.description)}</p>`,
    options.body,
    '</main>',
  ].join('\n');
}

function isBlogContentBlock(value: unknown): value is BlogContentBlock {
  if (!isRecord(value) || !isRecord(value['data'])) {
    return false;
  }

  return typeof value['id'] === 'string' && typeof value['type'] === 'string';
}

function formatFallbackDate(value: string): string {
  const timestamp = Date.parse(value);

  if (!Number.isFinite(timestamp)) {
    return '';
  }

  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(timestamp));
}

function getFirstImageAlt(blocks: readonly unknown[]): string {
  const imageBlock = blocks.find(block => {
    if (!isRecord(block) || block['type'] !== 'image' || !isRecord(block['data'])) {
      return false;
    }

    return typeof block['data']['alt'] === 'string';
  });

  if (!imageBlock || !isRecord(imageBlock) || !isRecord(imageBlock['data'])) {
    return '';
  }

  return getTrimmedString(imageBlock['data']['alt']);
}

function getStringArrayValue(value: unknown): readonly string[] {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === 'string').map(item => item.trim()).filter(Boolean)
    : [];
}

function getIsoString(value: unknown): string {
  if (typeof value === 'string') {
    return value;
  }

  if (isRecord(value) && typeof value['seconds'] === 'number') {
    return new Date(value['seconds'] * 1000).toISOString();
  }

  return '';
}

function createTitleFromSlug(value: string): string {
  return value
    .split('-')
    .filter(Boolean)
    .map(segment => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join(' ') || 'Blog Category';
}

function createSeoSlug(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/&/g, 'and')
    .replace(/['"]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'untitled';
}

function createBlogCategorySlug(value: string): string {
  return createSeoSlug(value) || 'uncategorized';
}

function createBlogTagSlug(value: string): string {
  return createSeoSlug(value) || 'untagged';
}

function getImageMimeType(imageUrl: string): string {
  const pathname = parseUrlPathname(imageUrl);

  if (pathname.endsWith('.jpg') || pathname.endsWith('.jpeg')) {
    return 'image/jpeg';
  }

  if (pathname.endsWith('.png')) {
    return 'image/png';
  }

  if (pathname.endsWith('.gif')) {
    return 'image/gif';
  }

  if (pathname.endsWith('.svg')) {
    return 'image/svg+xml';
  }

  if (pathname.endsWith('.avif')) {
    return 'image/avif';
  }

  return 'image/jpeg';
}

function parseUrlPathname(value: string): string {
  try {
    return decodeURIComponent(new URL(value).pathname).toLowerCase();
  } catch {
    return value.split('?')[0].split('#')[0].toLowerCase();
  }
}

function truncateDescription(value: string): string {
  const trimmedValue = value.trim();

  if (trimmedValue.length <= 300) {
    return trimmedValue;
  }

  return `${trimmedValue.slice(0, 297).trimEnd()}...`;
}

function stripHtml(value: string): string {
  return value.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
}

function getLatestIsoDate(values: readonly string[]): string | undefined {
  const dates = values
    .map(value => Date.parse(value))
    .filter(value => Number.isFinite(value));

  if (dates.length === 0) {
    return undefined;
  }

  return new Date(Math.max(...dates)).toISOString();
}

function toRfc822Date(value: string): string {
  const timestamp = Date.parse(value);

  return Number.isFinite(timestamp)
    ? new Date(timestamp).toUTCString()
    : new Date(0).toUTCString();
}

function isNonEmptyString(value: string | null | undefined): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

function uniqueStrings(values: readonly string[]): readonly string[] {
  return [...new Set(values.map(value => value.trim()).filter(Boolean))];
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function escapeXml(value: string): string {
  return escapeHtml(value).replace(/'/g, '&apos;');
}

function escapeScriptJson(value: string): string {
  return value.replace(/</g, '\\u003c');
}

async function fetchYoutubeChannelDetails(channelId: string): Promise<YoutubeChannelDetails> {
  const params = new URLSearchParams({
    part: 'snippet,contentDetails',
    id: channelId,
    key: youtubeApiKey.value(),
    maxResults: '1',
  });
  const payload = await fetchYoutubeApi<YoutubeChannelsResponse>(
    `channels?${params.toString()}`,
    'Unable to load YouTube channel details.'
  );
  const channel = payload.items?.[0];
  const uploadsPlaylistId = getTrimmedString(channel?.contentDetails?.relatedPlaylists?.uploads);

  if (!channel || !uploadsPlaylistId) {
    throw new HttpsError('failed-precondition', 'Configured YouTube channel does not expose an uploads playlist.');
  }

  return {
    channelId: getTrimmedString(channel.id) || channelId,
    channelTitle: getTrimmedString(channel.snippet?.title) || 'YouTube',
    uploadsPlaylistId,
  };
}

async function fetchYoutubeUploads(playlistId: string, maxResults: number): Promise<readonly YoutubeVideo[]> {
  const params = new URLSearchParams({
    part: 'snippet,contentDetails',
    playlistId,
    maxResults: maxResults.toString(),
    key: youtubeApiKey.value(),
  });
  const payload = await fetchYoutubeApi<YoutubePlaylistItemsResponse>(
    `playlistItems?${params.toString()}`,
    'Unable to load YouTube uploads.'
  );

  return (payload.items ?? [])
    .flatMap(item => normalizeYoutubePlaylistItem(item))
    .slice(0, maxResults);
}

async function fetchYoutubeApi<T>(pathWithQuery: string, fallbackMessage: string): Promise<T> {
  const response = await fetch(`${YOUTUBE_API_URL}/${pathWithQuery}`);
  const payload = await response.json().catch(() => ({})) as T & YoutubeErrorResponse;

  if (!response.ok) {
    const youtubeMessage = payload.error?.message ?? '';
    const isEmptyRefererRestriction = response.status === 403
      && youtubeMessage.toLowerCase().includes('referer <empty>');

    throw new HttpsError(
      'internal',
      isEmptyRefererRestriction
        ? 'YouTube API key is restricted to HTTP referrers, but Firebase Functions calls YouTube server-to-server with an empty referer. Use a server-side key with application restrictions set to None, or IP address restrictions only if deployed Functions use static egress, and restrict the key to YouTube Data API v3.'
        : youtubeMessage || fallbackMessage,
      {status: response.status, youtubeStatus: payload.error?.status, youtubeCode: payload.error?.code}
    );
  }

  return payload;
}

function normalizeYoutubePlaylistItem(item: YoutubePlaylistItem): YoutubeVideo[] {
  const videoId = getTrimmedString(item.contentDetails?.videoId) || getTrimmedString(item.snippet?.resourceId?.videoId);

  if (!videoId) {
    return [];
  }

  const title = getTrimmedString(item.snippet?.title) || 'Untitled YouTube video';
  const description = getTrimmedString(item.snippet?.description);
  const publishedAt = getTrimmedString(item.contentDetails?.videoPublishedAt)
    || getTrimmedString(item.snippet?.publishedAt)
    || new Date(0).toISOString();
  const thumbnailUrl = selectYoutubeThumbnail(item.snippet?.thumbnails)
    || `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`;

  return [{
    id: videoId,
    title,
    description,
    publishedAt,
    thumbnailUrl,
    thumbnailAlt: `${title} thumbnail`,
    videoUrl: `https://www.youtube.com/watch?v=${videoId}`,
  }];
}

function selectYoutubeThumbnail(thumbnails: YoutubeThumbnails | undefined): string {
  return getTrimmedString(thumbnails?.maxres?.url)
    || getTrimmedString(thumbnails?.standard?.url)
    || getTrimmedString(thumbnails?.high?.url)
    || getTrimmedString(thumbnails?.medium?.url)
    || getTrimmedString(thumbnails?.default?.url);
}

function getTrimmedString(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function getPositiveInteger(value: unknown): number | null {
  if (typeof value === 'number' && Number.isInteger(value) && value > 0) {
    return value;
  }

  if (typeof value === 'string') {
    const parsedValue = Number(value.trim());
    return Number.isInteger(parsedValue) && parsedValue > 0 ? parsedValue : null;
  }

  return null;
}

function requireCmsAccess(auth: AdminCallableAuth | undefined): string {
  if (!auth?.uid) {
    throw new HttpsError('unauthenticated', 'You must be signed in to use CMS AI functions.');
  }

  if (!hasAnyRoleClaim(auth.token, CMS_ACCESS_ROLES)) {
    throw new HttpsError('permission-denied', 'You must have CMS access to use CMS AI functions.');
  }

  return auth.uid;
}

function requireUserManagementAdmin(auth: AdminCallableAuth | undefined): string {
  if (!auth?.uid) {
    throw new HttpsError('unauthenticated', 'You must be signed in to manage users.');
  }

  if (!hasAnyRoleClaim(auth.token, USER_MANAGEMENT_ACCESS_ROLES)) {
    throw new HttpsError('permission-denied', 'Only admins can manage user roles.');
  }

  return auth.uid;
}

function requireSignedIn(auth: AdminCallableAuth | undefined, message: string): AdminCallableAuth {
  if (!auth?.uid) {
    throw new HttpsError('unauthenticated', message);
  }

  return auth;
}

async function withUserRoleMutationLease<T>(uid: string, operation: () => Promise<T>): Promise<T> {
  const firestore = getFirestore();
  const leaseRef = firestore.collection(USER_ROLE_MUTATION_LOCKS_COLLECTION).doc(uid);
  const ownerId = randomUUID();
  let acquired = false;

  for (let attempt = 0; attempt < USER_ROLE_MUTATION_MAX_ATTEMPTS; attempt += 1) {
    acquired = await firestore.runTransaction(async transaction => {
      const snapshot = await transaction.get(leaseRef);
      const nowMillis = Date.now();

      if (!canAcquireUserRoleMutationLease(snapshot.data(), ownerId, nowMillis)) {
        return false;
      }

      transaction.set(leaseRef, {
        ownerId,
        acquiredAt: new Date(nowMillis).toISOString(),
        expiresAtMillis: nowMillis + USER_ROLE_MUTATION_LEASE_MS,
      }, {merge: false});
      return true;
    });

    if (acquired) {
      break;
    }

    const retryDelay = Math.min(
      USER_ROLE_MUTATION_RETRY_BASE_MS * (2 ** attempt),
      USER_ROLE_MUTATION_RETRY_MAX_MS
    );
    await waitFor(retryDelay);
  }

  if (!acquired) {
    throw new HttpsError('aborted', 'Another role update is in progress. Please try again.');
  }

  try {
    return await operation();
  } finally {
    try {
      await firestore.runTransaction(async transaction => {
        const snapshot = await transaction.get(leaseRef);

        if (ownsUserRoleMutationLease(snapshot.data(), ownerId)) {
          transaction.delete(leaseRef);
        }
      });
    } catch (error) {
      // The bounded lease expires automatically; a failed cleanup must not hide a successful role mutation.
      logger.warn('Unable to release a user role mutation lease.', {uid, ownerId, error});
    }
  }
}

async function syncUserAccountRoleProjection(
  uid: string,
  claims: Record<string, unknown>,
  updatedAt: string
): Promise<void> {
  await getFirestore()
    .collection(USERS_COLLECTION)
    .doc(uid)
    .set({
      uid,
      roles: getUserAccountRoles(claims),
      updatedAt,
    }, {merge: true});
}

async function waitFor(milliseconds: number): Promise<void> {
  await new Promise(resolve => setTimeout(resolve, milliseconds));
}

function hasRoleClaim(claims: Record<string, unknown>, role: string): boolean {
  const roles = claims['roles'];

  return claims[role] === true || (isRecord(roles) && roles[role] === true);
}

function hasAnyRoleClaim(claims: Record<string, unknown>, roles: readonly string[]): boolean {
  return roles.some(role => hasRoleClaim(claims, role));
}

function parseBootstrapUserProfileRequest(value: unknown): {
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
  providerIds: readonly string[];
  emailVerified: boolean;
} {
  const record = isRecord(value) ? value : {};
  const providerIds = Array.isArray(record['providerIds'])
    ? record['providerIds'].map(providerId => getTrimmedString(providerId)).filter(Boolean)
    : [];

  return {
    email: getTrimmedString(record['email']) || null,
    displayName: getTrimmedString(record['displayName']) || null,
    photoURL: getTrimmedString(record['photoURL']) || null,
    providerIds,
    emailVerified: record['emailVerified'] === true,
  };
}

function parseSubmitPostCommentRequest(value: unknown): {
  postId: string;
  postSlug: string;
  body: string;
  parentCommentId: string | null;
} {
  const record = requireRecord(value, 'Comment submission must be an object.');
  const postId = getTrimmedString(record['postId']);
  const postSlug = getTrimmedString(record['postSlug']);
  const parentCommentId = getTrimmedString(record['parentCommentId']) || null;
  const bodyValidation = validatePlainTextCommentBody(record['body']);
  const body = bodyValidation.body;

  if (!postId || !postSlug) {
    throw new HttpsError('invalid-argument', 'Post id and slug are required.');
  }

  if (bodyValidation.reason === 'empty') {
    throw new HttpsError('invalid-argument', 'Comment body is required.');
  }

  if (bodyValidation.reason === 'too_long') {
    throw new HttpsError('invalid-argument', `Comments can be at most ${COMMENT_BODY_MAX_LENGTH} characters.`);
  }

  if (bodyValidation.reason === 'unsafe_content') {
    throw new HttpsError('invalid-argument', COMMENT_BODY_UNSAFE_CONTENT_MESSAGE);
  }

  return {postId, postSlug, body, parentCommentId};
}

function parseModeratePostCommentRequest(value: unknown): { commentId: string; action: CommentModerationAction } {
  const record = requireRecord(value, 'Comment moderation must be an object.');
  const commentId = getTrimmedString(record['commentId']);
  const action = getTrimmedString(record['action']) as CommentModerationAction;

  if (!commentId) {
    throw new HttpsError('invalid-argument', 'Comment id is required.');
  }

  if (!['approve', 'hide', 'restore', 'delete'].includes(action)) {
    throw new HttpsError('invalid-argument', 'Unsupported moderation action.');
  }

  return {commentId, action};
}

function parsePostEngagementRequest(value: unknown): { postId: string; postSlug: string } {
  const record = requireRecord(value, 'Post engagement must be an object.');
  const postId = getTrimmedString(record['postId']);
  const postSlug = getTrimmedString(record['postSlug']);

  if (!postId || !postSlug) {
    throw new HttpsError('invalid-argument', 'Post id and slug are required.');
  }

  return {postId, postSlug};
}

function parsePostShareRequest(value: unknown): { postId: string; postSlug: string; provider: string; shareId?: string } {
  const engagement = parsePostEngagementRequest(value);
  const record = requireRecord(value, 'Post share must be an object.');
  const provider = parseShareProvider(record['provider']);
  const shareId = parseOptionalShareId(record['shareId']);

  return {...engagement, provider, ...(shareId ? {shareId} : {})};
}

function parseSiteShareRequest(value: unknown): { provider: string; shareId?: string } {
  const record = requireRecord(value, 'Site share must be an object.');
  const provider = parseShareProvider(record['provider']);
  const shareId = parseOptionalShareId(record['shareId']);

  return {provider, ...(shareId ? {shareId} : {})};
}

function parseShareLandingRequest(value: unknown): { shareId: string; visitId: string } {
  const record = requireRecord(value, 'Share landing must be an object.');
  const shareId = getTrimmedString(record['shareId']);
  const visitId = getTrimmedString(record['visitId']);

  if (!SHARE_ID_PATTERN.test(shareId) || !SHARE_ID_PATTERN.test(visitId)) {
    throw new HttpsError('invalid-argument', 'Share and visit ids must be opaque identifiers.');
  }

  return {shareId, visitId};
}

function parseShareProvider(value: unknown): string {
  const provider = getTrimmedString(value);

  if (!['x', 'linkedin', 'facebook', 'email', 'copy'].includes(provider)) {
    throw new HttpsError('invalid-argument', 'Unsupported share provider.');
  }

  return provider;
}

function parseOptionalShareId(value: unknown): string | undefined {
  const shareId = getTrimmedString(value);
  if (!shareId) {
    return undefined;
  }

  if (!SHARE_ID_PATTERN.test(shareId)) {
    throw new HttpsError('invalid-argument', 'Share id must be an opaque identifier.');
  }

  return shareId;
}

async function requirePublishedPostTarget(postId: string, postSlug: string): Promise<void> {
  const snapshot = await getFirestore().collection(BLOG_POSTS_COLLECTION).doc(postId).get();
  const data = snapshot.data() ?? {};
  const storedSlug = getTrimmedString(data['slug']);
  const status = getTrimmedString(data['status']);

  if (!snapshot.exists || storedSlug !== postSlug || status !== 'published') {
    throw new HttpsError('failed-precondition', 'Engagement is only available for published posts.');
  }
}

async function requireApprovedCommentReplyTarget(
  parentCommentId: string,
  postId: string,
  postSlug: string
): Promise<BlogCommentDocument> {
  const snapshot = await getFirestore().collection(POST_COMMENTS_COLLECTION).doc(parentCommentId).get();

  if (!snapshot.exists) {
    throw new HttpsError('not-found', 'Parent comment not found.');
  }

  const parentComment = {id: snapshot.id, ...snapshot.data()} as BlogCommentDocument;

  if (parentComment.postId !== postId || parentComment.postSlug !== postSlug) {
    throw new HttpsError('failed-precondition', 'Replies must target a comment on the same post.');
  }

  if (parentComment.status !== 'approved') {
    throw new HttpsError('failed-precondition', 'Replies can only target approved comments.');
  }

  return parentComment;
}

function getCommentThreadDepth(comment: BlogCommentDocument): number {
  return typeof comment.threadDepth === 'number' && Number.isFinite(comment.threadDepth)
    ? Math.max(0, comment.threadDepth)
    : 0;
}

async function ensureUserAccountForAuth(auth: AdminCallableAuth): Promise<UserAccountDocument> {
  const firestore = getFirestore();
  const userRef = firestore.collection(USERS_COLLECTION).doc(auth.uid);
  const snapshot = await userRef.get();

  if (snapshot.exists) {
    return toUserAccountDocument(auth.uid, snapshot.data() ?? {}, auth.token);
  }

  return await withUserRoleMutationLease(auth.uid, async () => {
    const [currentSnapshot, authUser] = await Promise.all([
      userRef.get(),
      getAuth().getUser(auth.uid),
    ]);
    const freshAuth: AdminCallableAuth = {
      uid: auth.uid,
      token: authUser.customClaims ?? {},
    };

    if (currentSnapshot.exists) {
      return toUserAccountDocument(auth.uid, currentSnapshot.data() ?? {}, freshAuth.token);
    }

    return await upsertUserAccount(freshAuth, {
      email: authUser.email ?? null,
      displayName: authUser.displayName ?? null,
      photoURL: authUser.photoURL ?? null,
      providerIds: authUser.providerData.map(provider => provider.providerId),
      emailVerified: authUser.emailVerified,
    });
  });
}

async function upsertUserAccount(
  auth: AdminCallableAuth,
  profile: {
    email: string | null;
    displayName: string | null;
    photoURL: string | null;
    providerIds: readonly string[];
    emailVerified: boolean;
  }
): Promise<UserAccountDocument> {
  const firestore = getFirestore();
  const userRef = firestore.collection(USERS_COLLECTION).doc(auth.uid);
  const snapshot = await userRef.get();
  const existing = snapshot.data() ?? {};
  const now = new Date().toISOString();
  const existingTrustStatus = getCommentTrustStatus(existing['commentTrustStatus']);
  const roles = getUserAccountRoles(auth.token);
  const hasTrustedRole = hasAnyRoleClaim(auth.token, TRUSTED_COMMENT_ROLES);
  const commentTrustStatus: UserCommentTrustStatus = existingTrustStatus === 'blocked'
    ? 'blocked'
    : hasTrustedRole || existingTrustStatus === 'trusted'
      ? 'trusted'
      : 'new';
  const account: UserAccountDocument = {
    uid: auth.uid,
    email: profile.email,
    displayName: profile.displayName,
    photoURL: profile.photoURL,
    providerIds: profile.providerIds,
    emailVerified: profile.emailVerified,
    roles,
    commentTrustStatus,
    points: getUserAccountPoints(existing['points']),
    createdAt: getTrimmedString(existing['createdAt']) || now,
    updatedAt: now,
    lastSeenAt: now,
  };

  await userRef.set(account, {merge: true});

  return account;
}

async function registerTrackedShare(options: {
  shareId?: string;
  ownerUid: string;
  provider: string;
  targetType: 'site' | 'post';
  targetId: string;
  targetPath: string;
}): Promise<void> {
  if (!options.shareId) {
    return;
  }

  const firestore = getFirestore();
  const shareRef = firestore.collection(SHARE_LINKS_COLLECTION).doc(options.shareId);
  const now = new Date();
  const expiresAtMillis = now.getTime() + SHARE_LINK_TTL_MS;
  const expectedIdentity = [
    options.ownerUid,
    options.provider,
    options.targetType,
    options.targetId,
    options.targetPath,
  ].join(':');

  await firestore.runTransaction(async transaction => {
    const snapshot = await transaction.get(shareRef);
    if (snapshot.exists) {
      const existing = snapshot.data() ?? {};
      const existingIdentity = [
        getTrimmedString(existing['ownerUid']),
        getTrimmedString(existing['provider']),
        getTrimmedString(existing['targetType']),
        getTrimmedString(existing['targetId']),
        getTrimmedString(existing['targetPath']),
      ].join(':');

      if (existingIdentity !== expectedIdentity) {
        throw new HttpsError('already-exists', 'Share id is already registered to another share.');
      }
      return;
    }

    transaction.set(shareRef, {
      id: options.shareId,
      ownerUid: options.ownerUid,
      provider: options.provider,
      targetType: options.targetType,
      targetId: options.targetId,
      targetPath: options.targetPath,
      landingCount: 0,
      createdAt: now.toISOString(),
      createdAtTimestamp: FieldValue.serverTimestamp(),
      expiresAt: new Date(expiresAtMillis).toISOString(),
      expiresAtMillis,
      expiresAtTimestamp: Timestamp.fromMillis(expiresAtMillis),
    });
  });
}

async function awardPointEvent(options: {
  uid: string;
  eventId: string;
  type: PointEventType;
  points: number;
  counterField: keyof Omit<UserAccountPoints, 'total'>;
  postId?: string;
  postSlug?: string;
  provider?: string;
  shareId?: string;
  targetPath?: string;
  commentId?: string;
}): Promise<PointAwardResult> {
  const firestore = getFirestore();
  const userRef = firestore.collection(USERS_COLLECTION).doc(options.uid);
  const eventRef = firestore.collection(USER_POINT_EVENTS_COLLECTION).doc(options.eventId);
  const now = new Date().toISOString();

  return await firestore.runTransaction(async transaction => {
    const [userSnapshot, eventSnapshot] = await Promise.all([
      transaction.get(userRef),
      transaction.get(eventRef),
    ]);
    const points = getUserAccountPoints(userSnapshot.data()?.['points']);

    if (eventSnapshot.exists) {
      return {
        awarded: false,
        points: 0,
        total: points.total,
      };
    }

    const eventData = removeUndefinedValues({
      id: options.eventId,
      uid: options.uid,
      type: options.type,
      points: options.points,
      postId: options.postId,
      postSlug: options.postSlug,
      provider: options.provider,
      shareId: options.shareId,
      targetPath: options.targetPath,
      commentId: options.commentId,
      createdAt: now,
      createdAtTimestamp: FieldValue.serverTimestamp(),
    });

    transaction.set(eventRef, eventData);
    transaction.set(userRef, {
      uid: options.uid,
      points: {
        total: FieldValue.increment(options.points),
        [options.counterField]: FieldValue.increment(options.points),
      },
      updatedAt: now,
    }, {merge: true});

    return {
      awarded: true,
      points: options.points,
      total: points.total + options.points,
    };
  });
}

function createPointEventId(...parts: readonly string[]): string {
  return parts.map(part => part.replace(/[^A-Za-z0-9_-]+/g, '-')).join('_');
}

function getNextCommentStatus(action: CommentModerationAction): BlogCommentStatus {
  switch (action) {
    case 'approve':
    case 'restore':
      return 'approved';
    case 'delete':
      return 'deleted';
    case 'hide':
      return 'hidden';
  }
}

function getCommentTrustStatus(value: unknown): UserCommentTrustStatus {
  return value === 'trusted' || value === 'blocked' ? value : 'new';
}

function getUserAccountPoints(value: unknown): UserAccountPoints {
  const record = isRecord(value) ? value : {};

  return {
    total: getNumberValue(record['total']),
    postReads: getNumberValue(record['postReads']),
    shares: getNumberValue(record['shares']),
    approvedComments: getNumberValue(record['approvedComments']),
  };
}

function getNumberValue(value: unknown): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : 0;
}

function toUserAccountDocument(uid: string, value: Record<string, unknown>, claims: Record<string, unknown>): UserAccountDocument {
  const now = new Date().toISOString();

  return {
    uid,
    email: getTrimmedString(value['email']) || null,
    displayName: getTrimmedString(value['displayName']) || null,
    photoURL: getTrimmedString(value['photoURL']) || null,
    providerIds: Array.isArray(value['providerIds']) ? value['providerIds'].map(provider => getTrimmedString(provider)).filter(Boolean) : [],
    emailVerified: value['emailVerified'] === true,
    roles: getUserAccountRoles(claims),
    commentTrustStatus: getCommentTrustStatus(value['commentTrustStatus']),
    points: getUserAccountPoints(value['points']),
    createdAt: getTrimmedString(value['createdAt']) || now,
    updatedAt: getTrimmedString(value['updatedAt']) || now,
    lastSeenAt: getTrimmedString(value['lastSeenAt']) || now,
  };
}

function removeUndefinedValues(value: Record<string, unknown>): Record<string, unknown> {
  return Object.fromEntries(Object.entries(value).filter(([, entryValue]) => typeof entryValue !== 'undefined'));
}

function parseListUsersRequest(value: unknown): { pageSize: number; pageToken: string | null } {
  const record = isRecord(value) ? value : {};
  const requestedPageSize = getPositiveInteger(record['pageSize']) ?? USER_MANAGEMENT_DEFAULT_PAGE_SIZE;
  const pageToken = getTrimmedString(record['pageToken']);

  return {
    pageSize: Math.min(USER_MANAGEMENT_MAX_PAGE_SIZE, requestedPageSize),
    pageToken: pageToken || null,
  };
}

function parseUpdateUserRolesRequest(value: unknown): { uid: string; roles: string[] } {
  const record = requireRecord(value, 'User role update must be an object.');
  const uid = getTrimmedString(record['uid']);
  const rawRoles = record['roles'];

  if (!uid) {
    throw new HttpsError('invalid-argument', 'User uid is required.');
  }

  if (!Array.isArray(rawRoles)) {
    throw new HttpsError('invalid-argument', 'Roles must be an array.');
  }

  const roles = [...new Set(rawRoles.map(role => getTrimmedString(role)).filter(Boolean))].sort((a, b) => a.localeCompare(b));

  if (roles.length > MAX_USER_MANAGEMENT_ROLES) {
    throw new HttpsError('invalid-argument', `A user can have at most ${MAX_USER_MANAGEMENT_ROLES} roles.`);
  }

  const invalidRole = roles.find(role => !ROLE_NAME_PATTERN.test(role));

  if (invalidRole) {
    throw new HttpsError('invalid-argument', `Invalid role "${invalidRole}". Use letters, numbers, underscores, or hyphens, starting with a letter.`);
  }

  return {uid, roles};
}

function toAdminManagedUser(user: UserRecord): AdminManagedUser {
  const customClaims = user.customClaims ?? {};

  return {
    uid: user.uid,
    email: user.email ?? null,
    displayName: user.displayName ?? null,
    photoURL: user.photoURL ?? null,
    disabled: user.disabled,
    emailVerified: user.emailVerified,
    createdAt: user.metadata.creationTime ? new Date(user.metadata.creationTime).toISOString() : null,
    lastSignInAt: user.metadata.lastSignInTime ? new Date(user.metadata.lastSignInTime).toISOString() : null,
    roles: getClaimRoles(customClaims),
    customClaims,
  };
}

function getClaimRoles(claims: Record<string, unknown>): string[] {
  const roles = claims['roles'];
  const roleNames = new Set<string>();

  if (isRecord(roles)) {
    for (const [role, enabled] of Object.entries(roles)) {
      if (enabled === true && ROLE_NAME_PATTERN.test(role)) {
        roleNames.add(role);
      }
    }
  }

  for (const mirroredRole of ['admin', 'cmsAdmin']) {
    if (claims[mirroredRole] === true) {
      roleNames.add(mirroredRole);
    }
  }

  return [...roleNames].sort((a, b) => a.localeCompare(b));
}

function getUserAccountRoles(claims: Record<string, unknown>): string[] {
  return [BASE_USER_ROLE, ...getClaimRoles(claims).filter(role => role !== BASE_USER_ROLE)];
}

function parseAssistantContext(value: unknown): BlogAssistantContext {
  const record = requireRecord(value, 'Assistant context must be an object.');

  return {
    title: getString(record, 'title').slice(0, 180),
    excerpt: getString(record, 'excerpt').slice(0, 500),
    seoTitle: getString(record, 'seoTitle').slice(0, 180),
    seoDescription: getString(record, 'seoDescription').slice(0, 500),
    categories: getStringArray(record, 'categories').slice(0, 8),
    tags: getStringArray(record, 'tags').slice(0, 20),
    blocks: getBlocks(record['blocks']).slice(0, 80),
  };
}

function parseThumbnailRequest(value: unknown): BlogThumbnailGenerationRequest {
  const record = requireRecord(value, 'Thumbnail request must be an object.');
  const prompt = getString(record, 'prompt').slice(0, MAX_PROMPT_LENGTH).trim();
  const altText = getString(record, 'altText').slice(0, 280).trim();
  const style = getString(record, 'style').slice(0, 120).trim();
  const postId = getString(record, 'postId').slice(0, 120).trim();
  const slug = getString(record, 'slug').slice(0, 160).trim();

  if (!prompt || !postId || !slug) {
    throw new HttpsError('invalid-argument', 'Thumbnail prompt, postId, and slug are required.');
  }

  return {
    prompt,
    altText: altText || `Generated thumbnail for ${slug}.`,
    style: style || 'Editorial technical illustration',
    postId,
    slug,
  };
}

async function callOpenAiResponses(context: BlogAssistantContext): Promise<OpenAiResponsePayload> {
  const apiKey = openAiApiKey.value();
  const sourceText = truncateText(JSON.stringify(context), MAX_TEXT_LENGTH);
  const response = await fetch(`${OPENAI_API_URL}/responses`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: openAiTextModel.value(),
      input: [
        {
          role: 'system',
          content: [
            'You are a CMS writing assistant for a professional engineering portfolio blog.',
            'Suggest practical, non-clickbait metadata.',
            'Keep categories broad and tags specific.',
            'Return only data that matches the schema.',
          ].join(' '),
        },
        {
          role: 'user',
          content: `Create blog metadata suggestions from this draft context: ${sourceText}. Thumbnail prompts should target a 16:9 editorial image that can also work as the post cover.`,
        },
      ],
      max_output_tokens: 1800,
      text: {
        format: {
          type: 'json_schema',
          name: 'blog_metadata_suggestions',
          strict: true,
          schema: metadataSchema,
        },
      },
    }),
  });

  return parseOpenAiResponse<OpenAiResponsePayload>(response, 'Unable to generate blog metadata.');
}

async function generateImage(prompt: string, model: string): Promise<{ base64Data: string; contentType: string }> {
  const response = await fetch(`${OPENAI_API_URL}/images/generations`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${openAiApiKey.value()}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      prompt,
      n: 1,
      size: '1536x864',
      quality: 'medium',
      output_format: 'webp',
    }),
  });
  const payload = await parseOpenAiResponse<OpenAiImagePayload>(response, 'Unable to generate thumbnail image.');
  const base64Data = payload.data?.[0]?.b64_json;

  if (!base64Data) {
    throw new HttpsError('internal', 'OpenAI image response did not include image data.');
  }

  return {
    base64Data,
    contentType: 'image/webp',
  };
}

async function storeThumbnailImage(
  request: BlogThumbnailGenerationRequest,
  image: { base64Data: string; contentType: string },
  model: string
): Promise<BlogStoredThumbnail> {
  const generatedAt = new Date().toISOString();
  const token = randomUUID();
  const safeSlug = toSafePathSegment(request.slug);
  const fileName = `${Date.now()}-${randomUUID()}.webp`;
  const storagePath = `cms/blog-thumbnails/${safeSlug}/${fileName}`;
  const bucket = getStorage().bucket();
  const file = bucket.file(storagePath);

  await file.save(Buffer.from(image.base64Data, 'base64'), {
    resumable: false,
    metadata: {
      cacheControl: 'public, max-age=31536000, immutable',
      contentType: image.contentType,
      metadata: {
        firebaseStorageDownloadTokens: token,
        altText: request.altText,
        prompt: truncateText(request.prompt, 900),
        source: 'openai',
        model,
        postId: request.postId,
      },
    },
  });

  logger.info('Stored generated blog thumbnail.', {
    storagePath,
    postId: request.postId,
    model,
  });

  return {
    generatedAt,
    source: 'backend',
    prompt: request.prompt,
    altText: request.altText,
    style: request.style,
    contentType: image.contentType,
    storagePath,
    downloadUrl: createFirebaseStorageDownloadUrl(bucket.name, storagePath, token),
    model,
  };
}

async function parseOpenAiResponse<T>(response: Response, fallbackMessage: string): Promise<T> {
  const payload = await response.json().catch(() => ({})) as T & OpenAiErrorResponse;

  if (!response.ok) {
    throw new HttpsError(
      'internal',
      payload.error?.message ?? fallbackMessage,
      {type: payload.error?.type, status: response.status}
    );
  }

  return payload;
}

function parseAssistantResult(payload: OpenAiResponsePayload): Pick<BlogAssistantResult, 'suggestions' | 'thumbnailSuggestions'> {
  const text = extractOutputText(payload);

  if (!text) {
    throw new HttpsError('internal', 'OpenAI metadata response did not include text output.');
  }

  const parsed = JSON.parse(text) as Partial<BlogAssistantResult>;
  const suggestions = Array.isArray(parsed.suggestions)
    ? parsed.suggestions.map((suggestion, index) => normalizeMetadataSuggestion(suggestion, index))
    : [];
  const thumbnailSuggestions = Array.isArray(parsed.thumbnailSuggestions)
    ? parsed.thumbnailSuggestions.map((suggestion, index) => normalizeThumbnailSuggestion(suggestion, index))
    : [];

  if (suggestions.length === 0 || thumbnailSuggestions.length === 0) {
    throw new HttpsError('internal', 'OpenAI metadata response did not include complete suggestions.');
  }

  return {
    suggestions,
    thumbnailSuggestions,
  };
}

function normalizeMetadataSuggestion(value: unknown, index: number): BlogMetadataSuggestion {
  const record = requireRecord(value, 'Invalid metadata suggestion.');

  return {
    id: getString(record, 'id') || `metadata-${index + 1}`,
    title: getString(record, 'title').slice(0, 90),
    description: getString(record, 'description').slice(0, 180),
    seoTitle: getString(record, 'seoTitle').slice(0, 70),
    seoDescription: getString(record, 'seoDescription').slice(0, 170),
    categories: getStringArray(record, 'categories').slice(0, 4),
    tags: getStringArray(record, 'tags').slice(0, 10),
    rationale: getString(record, 'rationale').slice(0, 220),
  };
}

function normalizeThumbnailSuggestion(value: unknown, index: number): BlogThumbnailSuggestion {
  const record = requireRecord(value, 'Invalid thumbnail suggestion.');

  return {
    id: getString(record, 'id') || `thumbnail-${index + 1}`,
    prompt: getString(record, 'prompt').slice(0, MAX_PROMPT_LENGTH),
    altText: getString(record, 'altText').slice(0, 280),
    style: getString(record, 'style').slice(0, 120),
  };
}

function extractOutputText(payload: OpenAiResponsePayload): string {
  if (typeof payload.output_text === 'string') {
    return payload.output_text;
  }

  return payload.output
    ?.flatMap(item => item.content ?? [])
    .map(content => content.text ?? '')
    .join('')
    .trim() ?? '';
}

function getBlocks(value: unknown): readonly BlogContentBlock[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.flatMap(item => {
    if (!isRecord(item)) {
      return [];
    }

    return {
      id: getString(item, 'id'),
      type: getString(item, 'type'),
      data: isRecord(item['data']) ? item['data'] as BlogBlockData : {},
    };
  });
}

function requireRecord(value: unknown, message: string): Record<string, unknown> {
  if (!isRecord(value)) {
    throw new HttpsError('invalid-argument', message);
  }

  return value;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function getString(record: Record<string, unknown>, key: string): string {
  const value = record[key];
  return typeof value === 'string' ? value.trim() : '';
}

function getStringArray(record: Record<string, unknown>, key: string): readonly string[] {
  const value = record[key];

  if (!Array.isArray(value)) {
    return [];
  }

  return [...new Set(
    value
      .filter(item => typeof item === 'string')
      .map(item => item.trim())
      .filter(item => item.length > 0)
  )];
}

function toSafePathSegment(value: string): string {
  return value
      .toLowerCase()
      .replace(/[^a-z0-9-]+/g, '-')
      .replace(/^-+|-+$/g, '')
    || 'untitled-post';
}

function truncateText(value: string, maxLength: number): string {
  return value.length > maxLength ? `${value.slice(0, maxLength)}...` : value;
}

function createFirebaseStorageDownloadUrl(bucketName: string, storagePath: string, token: string): string {
  return `https://firebasestorage.googleapis.com/v0/b/${bucketName}/o/${encodeURIComponent(storagePath)}?alt=media&token=${token}`;
}
