import {TestBed} from '@angular/core/testing';

import {BlogPost} from '../models/blog-post.model';
import {BlogStorageService} from './blog-storage.service';

interface BlogStorageSerializer {
  toFirestorePost(post: BlogPost): Record<string, unknown>;
}

function createPost(backgroundImage?: string): BlogPost {
  return {
    id: 'storage-background-post',
    slug: 'storage-background-post',
    title: 'Storage Background Post',
    excerpt: 'A post used to verify Firestore background serialization.',
    coverImage: '/assets/images/backgrounds/night.webp',
    ...(backgroundImage === undefined ? {} : {backgroundImage}),
    author: {name: 'Colin Michaels'},
    categories: ['CMS'],
    tags: ['Firestore'],
    status: 'draft',
    seo: {
      title: 'Storage Background Post',
      description: 'A post used to verify Firestore background serialization.',
    },
    contentFormat: 'editorjs',
    blocks: [],
    createdAt: '2026-07-11T12:00:00.000Z',
    updatedAt: '2026-07-11T12:00:00.000Z',
    publishedAt: null,
  };
}

describe('BlogStorageService background serialization', () => {
  let serializer: BlogStorageSerializer;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    serializer = TestBed.inject(BlogStorageService) as unknown as BlogStorageSerializer;
  });

  it('writes a trimmed post background URL', () => {
    const document = serializer.toFirestorePost(createPost('  /assets/images/backgrounds/day.webp  '));

    expect(document['backgroundImage']).toBe('/assets/images/backgrounds/day.webp');
  });

  it('uses a Firestore delete sentinel when the background is cleared', () => {
    const document = serializer.toFirestorePost(createPost('   '));
    const sentinel = document['backgroundImage'] as { _methodName?: string };

    expect(sentinel._methodName).toBe('deleteField');
  });
});
