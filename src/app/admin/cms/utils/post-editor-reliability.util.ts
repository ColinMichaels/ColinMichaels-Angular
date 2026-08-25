import {BlogPost} from '../../../features/blog/models/blog-post.model';
import {normalizeBlogPostRevision} from '../../../features/blog/models/blog-post-revision.model';

export type RemotePostDisposition = 'wait' | 'hydrate' | 'acknowledge' | 'preserve-local' | 'conflict' | 'deleted';

function isSameCanonicalPostVersion(localPost: BlogPost | undefined, remotePost: BlogPost): boolean {
  return localPost?.id === remotePost.id
    && normalizeBlogPostRevision(localPost.revision) === normalizeBlogPostRevision(remotePost.revision)
    && localPost.updatedAt === remotePost.updatedAt;
}

export function getRemotePostDisposition(input: {
  localPost: BlogPost | undefined;
  remotePost: BlogPost | undefined;
  hasHydrated: boolean;
  hasUnsavedChanges: boolean;
  isLoading: boolean;
}): RemotePostDisposition {
  if (!input.remotePost) {
    return input.hasHydrated && !input.isLoading ? 'deleted' : 'wait';
  }

  if (isSameCanonicalPostVersion(input.localPost, input.remotePost)) {
    return input.hasHydrated ? 'preserve-local' : 'acknowledge';
  }

  if (!input.hasHydrated || !input.hasUnsavedChanges) {
    return 'hydrate';
  }

  return normalizeBlogPostRevision(input.remotePost.revision)
    === normalizeBlogPostRevision(input.localPost?.revision)
    ? 'preserve-local'
    : 'conflict';
}
