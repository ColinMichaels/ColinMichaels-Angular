import {BlogContentBlock} from '../models/blog-post.model';

export interface BlogPostLayoutBlocks {
  content: readonly BlogContentBlock[];
  rail: readonly BlogContentBlock[];
}

/**
 * Keeps the article stream and optional reading rail mutually exclusive.
 * Legacy polls default to the rail; authors can explicitly keep one inline.
 */
export function createBlogPostLayoutBlocks(
  blocks: readonly BlogContentBlock[]
): BlogPostLayoutBlocks {
  const content: BlogContentBlock[] = [];
  const rail: BlogContentBlock[] = [];

  for (const block of blocks) {
    const belongsInRail = block.data.placement === 'rail'
      || (block.type === 'poll' && block.data.placement !== 'content');

    (belongsInRail ? rail : content).push(block);
  }

  return {content, rail};
}
