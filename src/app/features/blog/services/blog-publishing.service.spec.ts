import {TestBed} from '@angular/core/testing';

import {BlogPost} from '../models/blog-post.model';
import {BlogPublishingService} from './blog-publishing.service';

function createPost(): BlogPost {
  return {
    id: 'post-publishing-service',
    revision: 0,
    slug: 'publishing-service',
    title: 'Publishing Service',
    excerpt: 'A complete draft for the trusted publishing client.',
    coverImage: '/assets/images/backgrounds/night.webp',
    author: {name: 'Colin Michaels'},
    categories: ['CMS'],
    tags: ['Firebase'],
    status: 'draft',
    seo: {title: 'Publishing Service', description: 'A complete draft for the trusted publishing client.'},
    contentFormat: 'editorjs',
    blocks: [],
    createdAt: '2026-08-03T12:00:00.000Z',
    updatedAt: '2026-08-03T12:00:00.000Z',
    publishedAt: null,
  };
}

describe('BlogPublishingService', () => {
  beforeEach(() => TestBed.configureTestingModule({providers: [BlogPublishingService]}));

  it('fails closed when Firebase Functions is unavailable', async () => {
    const service = TestBed.inject(BlogPublishingService);
    await expectAsync(service.savePost(createPost(), 0))
      .toBeRejectedWithError('Firebase Functions is not initialized.');
    await expectAsync(service.updateEditorial(createPost(), {evidenceBasis: 'researched'}, 0))
      .toBeRejectedWithError('Firebase Functions is not initialized.');
    await expectAsync(service.issuePreview(createPost().id, 0))
      .toBeRejectedWithError('Firebase Functions is not initialized.');
    await expectAsync(service.deletePost(createPost().id, 0))
      .toBeRejectedWithError('Firebase Functions is not initialized.');
  });
});
