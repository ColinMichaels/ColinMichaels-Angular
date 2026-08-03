import {BlogPost} from '../../../features/blog/models/blog-post.model';
import {normalizeBlogPostRevision} from '../../../features/blog/models/blog-post-revision.model';

export type RemotePostDisposition = 'wait' | 'hydrate' | 'preserve-local' | 'conflict' | 'deleted';

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

  if (!input.hasHydrated || !input.hasUnsavedChanges) {
    return 'hydrate';
  }

  return normalizeBlogPostRevision(input.remotePost.revision)
    === normalizeBlogPostRevision(input.localPost?.revision)
    ? 'preserve-local'
    : 'conflict';
}
