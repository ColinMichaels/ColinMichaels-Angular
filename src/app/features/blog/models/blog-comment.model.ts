export type BlogCommentStatus = 'pending' | 'approved' | 'hidden' | 'deleted';

export interface BlogCommentAuthor {
  uid: string;
  displayName: string | null;
  photoURL: string | null;
}

export interface BlogComment {
  id: string;
  postId: string;
  postSlug: string;
  parentCommentId?: string | null;
  parentAuthorDisplayName?: string | null;
  threadRootId?: string | null;
  threadDepth?: number | null;
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

export interface SubmitBlogCommentResult {
  comment: BlogComment;
  trusted: boolean;
}

export interface BlogCommentListResult {
  comments: readonly BlogComment[];
  hasMore: boolean;
}
