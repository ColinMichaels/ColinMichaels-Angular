import type {BlogContentBlock} from '../models/blog-post.model';
import {selectBlogCompanionVideo, type BlogCompanionVideo} from './blog-youtube-journey.util';

export interface BlogLeadVideo extends BlogCompanionVideo {
  blockId: string;
  caption?: string;
}

/** Prefer the editor's companion; otherwise promote the first valid YouTube embed. */
export function selectBlogLeadVideo(blocks: readonly BlogContentBlock[]): BlogLeadVideo | null {
  const candidates = [
    ...blocks.filter(block => block.data.isCompanionVideo === true),
    ...blocks.filter(block => block.data.isCompanionVideo !== true),
  ];

  for (const block of candidates) {
    const video = selectBlogCompanionVideo([{
      ...block,
      data: {...block.data, isCompanionVideo: true},
    }]);
    if (video) return {...video, blockId: block.id, ...(block.data.caption ? {caption: block.data.caption} : {})};
  }
  return null;
}
