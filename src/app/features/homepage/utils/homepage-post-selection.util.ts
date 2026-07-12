import {BlogPost} from '../../blog/models/blog-post.model';
import {HomepageHeroSettings} from '../models/homepage-hero.model';

function getSortablePostDate(post: BlogPost): string {
  return post.publishedAt ?? post.updatedAt;
}

export function selectHomepageHeroPost(
  posts: readonly BlogPost[],
  settings: HomepageHeroSettings
): BlogPost | null {
  return selectHomepageHeroPosts(posts, settings)[0] ?? null;
}

export function selectHomepageHeroPosts(
  posts: readonly BlogPost[],
  settings: HomepageHeroSettings
): readonly BlogPost[] {
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

  let leadPost: BlogPost | undefined;

  if (settings.featuredPostMode === 'selected' && settings.featuredPostId) {
    leadPost = newestPosts.find(post => post.id === settings.featuredPostId);
  }

  // Feature flags intentionally accumulate; recency decides which flagged post owns the hero.
  leadPost ??= newestPosts.find(post => post.featured) ?? newestPosts[0];

  return leadPost
    ? [leadPost, ...newestPosts.filter(post => post.id !== leadPost.id)]
    : [];
}
