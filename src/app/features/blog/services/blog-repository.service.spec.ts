import {TestBed} from '@angular/core/testing';

import {BlogRepositoryService} from './blog-repository.service';

describe('BlogRepositoryService', () => {
  let service: BlogRepositoryService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(BlogRepositoryService);
  });

  it('returns only published posts for the public blog', () => {
    const posts = service.getPublishedPosts();

    expect(posts.length).toBe(1);
    expect(posts[0].slug).toBe('architecture-boundaries');
  });

  it('does not expose draft posts by public slug lookup', () => {
    expect(service.getPublishedPostBySlug('cms-foundation')).toBeUndefined();
  });

  it('keeps drafts available to the admin repository view', () => {
    const posts = service.getAdminPosts();
    const stats = service.getAdminStats();

    expect(posts.length).toBe(2);
    expect(stats).toEqual({
      total: 2,
      published: 1,
      drafts: 1,
      scheduled: 0,
      archived: 0,
    });
  });

  it('returns draft posts by slug for the admin editor', () => {
    expect(service.getAdminPostBySlug('cms-foundation')?.status).toBe('draft');
  });
});
