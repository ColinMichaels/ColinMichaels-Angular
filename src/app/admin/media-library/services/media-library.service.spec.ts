import {TestBed} from '@angular/core/testing';
import {firstValueFrom, of} from 'rxjs';

import {BlogPost} from '../../../features/blog/models/blog-post.model';
import {BlogRepositoryService} from '../../../features/blog/services/blog-repository.service';
import {FirestoreService} from '../../../services/firebase/firestore.service';
import {BlogMediaUploadService} from '../../cms/services/blog-media-upload.service';
import {MediaLibraryService} from './media-library.service';

function createPost(): BlogPost {
  return {
    id: 'post-with-background',
    slug: 'post-with-background',
    title: 'Post With Background',
    excerpt: 'A post with dedicated background artwork.',
    coverImage: '/assets/images/backgrounds/night.webp',
    backgroundImage: '/assets/images/backgrounds/day.webp',
    author: {name: 'Colin Michaels'},
    categories: ['CMS'],
    tags: ['Background'],
    status: 'published',
    seo: {
      title: 'Post With Background',
      description: 'A post with dedicated background artwork.',
    },
    contentFormat: 'editorjs',
    blocks: [],
    createdAt: '2026-07-11T12:00:00.000Z',
    updatedAt: '2026-07-11T12:00:00.000Z',
    publishedAt: '2026-07-11T12:00:00.000Z',
  };
}

describe('MediaLibraryService blog attachments', () => {
  it('derives an optional post background as reusable blog media', async () => {
    TestBed.configureTestingModule({
      providers: [
        MediaLibraryService,
        {
          provide: FirestoreService,
          useValue: {
            listenToCollection: jasmine.createSpy('listenToCollection').and.returnValue(of([])),
          },
        },
        {
          provide: BlogRepositoryService,
          useValue: {
            getAdminPosts$: () => of([createPost()]),
          },
        },
        {provide: BlogMediaUploadService, useValue: {}},
      ],
    });

    const service = TestBed.inject(MediaLibraryService);
    const items = await firstValueFrom(service.listenToMediaItems());
    const background = items.find(item => item.originalUrl === '/assets/images/backgrounds/day.webp');

    expect(background).toBeDefined();
    expect(background?.tags).toContain('post-background');
    expect(background?.altText).toBe('Post With Background background image');
  });
});
