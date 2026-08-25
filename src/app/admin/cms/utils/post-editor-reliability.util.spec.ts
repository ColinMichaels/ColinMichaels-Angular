import {BlogPost} from '../../../features/blog/models/blog-post.model';
import {getRemotePostDisposition} from './post-editor-reliability.util';

function createPost(revision: number): BlogPost {
  return {
    id: 'post-1',
    revision,
    slug: 'post-1',
    title: 'Post',
    excerpt: 'Post excerpt',
    coverImage: '/cover.webp',
    author: {name: 'Colin Michaels'},
    categories: [],
    tags: [],
    status: 'draft',
    seo: {title: 'Post', description: 'Post excerpt'},
    contentFormat: 'editorjs',
    blocks: [],
    createdAt: '2026-08-03T12:00:00.000Z',
    updatedAt: '2026-08-03T12:00:00.000Z',
    publishedAt: null,
  };
}

describe('post editor remote hydration policy', () => {
  it('hydrates the first remote snapshot', () => {
    expect(getRemotePostDisposition({
      localPost: undefined,
      remotePost: createPost(3),
      hasHydrated: false,
      hasUnsavedChanges: false,
      isLoading: false,
    })).toBe('hydrate');
  });

  it('acknowledges an unchanged first snapshot without requesting another editor render', () => {
    const localPost = createPost(3);

    expect(getRemotePostDisposition({
      localPost,
      remotePost: {...localPost},
      hasHydrated: false,
      hasUnsavedChanges: false,
      isLoading: false,
    })).toBe('acknowledge');
  });

  it('does not rehydrate an already applied canonical version', () => {
    const localPost = createPost(3);

    expect(getRemotePostDisposition({
      localPost,
      remotePost: {...localPost},
      hasHydrated: true,
      hasUnsavedChanges: false,
      isLoading: false,
    })).toBe('preserve-local');
  });

  it('hydrates a same-revision snapshot when its canonical timestamp changed', () => {
    const localPost = createPost(3);

    expect(getRemotePostDisposition({
      localPost,
      remotePost: {...localPost, updatedAt: '2026-08-03T12:01:00.000Z'},
      hasHydrated: true,
      hasUnsavedChanges: false,
      isLoading: false,
    })).toBe('hydrate');
  });

  it('preserves dirty local state during unrelated Firestore refreshes', () => {
    expect(getRemotePostDisposition({
      localPost: createPost(3),
      remotePost: createPost(3),
      hasHydrated: true,
      hasUnsavedChanges: true,
      isLoading: false,
    })).toBe('preserve-local');
  });

  it('surfaces newer remote revisions and remote deletion as conflicts', () => {
    expect(getRemotePostDisposition({
      localPost: createPost(3),
      remotePost: createPost(4),
      hasHydrated: true,
      hasUnsavedChanges: true,
      isLoading: false,
    })).toBe('conflict');
    expect(getRemotePostDisposition({
      localPost: createPost(3),
      remotePost: undefined,
      hasHydrated: true,
      hasUnsavedChanges: true,
      isLoading: false,
    })).toBe('deleted');
  });
});
