import {BlogPostSummary} from '../../blog/models/blog-post.model';
import {HomepageHeroSettings} from '../models/homepage-hero.model';

const HOMEPAGE_HERO_MAX_POSTS = 6;
const CREATOR_PROMISE_PATTERN = /\b(?:angular|architecture|camera|creator|drone|firebase|fpv|gadget|gadgets|gear|internet find|internet finds|lab|labs|photography|project|projects|robot|robots|software|tech|technology|video|web development)\b/iu;

function getSortablePostDate(post: BlogPostSummary): string {
  return post.publishedAt ?? post.updatedAt;
}

function matchesCreatorPromise(post: BlogPostSummary): boolean {
  return CREATOR_PROMISE_PATTERN.test([
    post.title,
    post.excerpt,
    post.slug.replaceAll('-', ' '),
    ...post.categories,
    ...(post.subcategories ?? []),
    ...post.tags,
  ].join(' '));
}

export function selectHomepageHeroPost(
  posts: readonly BlogPostSummary[],
  settings: HomepageHeroSettings
): BlogPostSummary | null {
  return selectHomepageHeroPosts(posts, settings)[0] ?? null;
}

export function selectHomepageHeroPosts(
  posts: readonly BlogPostSummary[],
  settings: HomepageHeroSettings
): readonly BlogPostSummary[] {
  const seenPostIds = new Set<string>();
  const newestPosts = [...posts].sort((left, right) => (
    getSortablePostDate(right).localeCompare(getSortablePostDate(left))
    || right.updatedAt.localeCompare(left.updatedAt)
    || right.id.localeCompare(left.id)
  )).filter(post => {
    if (seenPostIds.has(post.id)) {
      return false;
    }

    seenPostIds.add(post.id);
    return true;
  });

  let leadPost: BlogPostSummary | undefined;
  const promisePosts = newestPosts.filter(matchesCreatorPromise);
  const automaticPool = promisePosts.length > 0 ? promisePosts : newestPosts;

  if (settings.featuredPostMode === 'selected' && settings.featuredPostId) {
    leadPost = newestPosts.find(post => post.id === settings.featuredPostId);
  }

  // Feature flags intentionally accumulate; recency decides among posts that deliver the homepage promise.
  // Editors can still override this focus deliberately with an explicit selected post.
  leadPost ??= automaticPool.find(post => post.featured) ?? automaticPool[0];

  return leadPost
    ? [leadPost, ...automaticPool.filter(post => post.id !== leadPost.id)]
      .slice(0, HOMEPAGE_HERO_MAX_POSTS)
    : [];
}
