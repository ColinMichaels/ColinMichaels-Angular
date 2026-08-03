import {BlogPost} from './blog-post.model';

export class BlogPostRevisionConflictError extends Error {
  constructor(
    readonly postId: string,
    readonly expectedRevision: number,
    readonly actualRevision: number | null,
    readonly remotePost?: BlogPost
  ) {
    super(actualRevision === null
      ? 'This post was deleted after you opened it. Your local work has not been overwritten.'
      : `This post changed after you opened it (expected revision ${expectedRevision}, found ${actualRevision}). Your local work has not been overwritten.`);
    this.name = 'BlogPostRevisionConflictError';
  }
}

export function normalizeBlogPostRevision(value: unknown): number {
  return Number.isInteger(value) && Number(value) >= 0 ? Number(value) : 0;
}
