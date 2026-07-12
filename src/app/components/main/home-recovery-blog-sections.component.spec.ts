import {signal} from '@angular/core';
import {ComponentFixture, TestBed} from '@angular/core/testing';
import {provideRouter} from '@angular/router';
import {of} from 'rxjs';

import {BlogPost} from '../../features/blog/models/blog-post.model';
import {TopicHubRepositoryService} from '../../features/topics/services/topic-hub-repository.service';
import {HomeBlogPostFeedService} from './home-blog-post-feed.service';
import {HomeRecoveryBlogSectionsComponent} from './home-recovery-blog-sections.component';

function createPost(
  id: string,
  taxonomy: {categories: readonly string[]; tags: readonly string[]},
): BlogPost {
  return {
    id,
    slug: id,
    title: id.replaceAll('-', ' '),
    excerpt: `A short introduction to ${id}.`,
    coverImage: '/assets/images/backgrounds/day.webp',
    author: {name: 'Colin Michaels'},
    categories: taxonomy.categories,
    tags: taxonomy.tags,
    status: 'published',
    seo: {
      title: id.replaceAll('-', ' '),
      description: `A short introduction to ${id}.`,
      openGraphImage: '/assets/images/backgrounds/day.webp',
    },
    contentFormat: 'editorjs',
    blocks: [],
    createdAt: '2026-07-01T12:00:00.000Z',
    publishedAt: '2026-07-01T12:00:00.000Z',
    updatedAt: '2026-07-01T12:00:00.000Z',
  };
}

describe('HomeRecoveryBlogSectionsComponent', () => {
  let fixture: ComponentFixture<HomeRecoveryBlogSectionsComponent>;

  beforeEach(async () => {
    const posts: readonly BlogPost[] = [
      createPost('weekly-update-one', {
        categories: ['Weekly Updates'],
        tags: ['Recovery'],
      }),
      createPost('weekly-tag-only', {
        categories: ['Health and Recovery'],
        tags: ['Weekly Updates'],
      }),
      createPost('patient-prep-guide', {
        categories: ['Medical Lessons'],
        tags: ['Pain Management'],
      }),
      createPost('weekly-update-two', {
        categories: ['Weekly Updates'],
        tags: ['Recovery'],
      }),
      createPost('weekly-update-three', {
        categories: ['Weekly Updates'],
        tags: ['Recovery'],
      }),
      createPost('weekly-update-four', {
        categories: ['Weekly Updates'],
        tags: ['Recovery'],
      }),
      createPost('hospital-lesson-two', {
        categories: ['Hospital Lessons'],
        tags: ['Recovery Planning'],
      }),
    ];
    const blogPostFeed = {
      publishedPosts: signal(posts),
      isReady: signal(true),
      loadError: signal<string | null>(null),
    } satisfies Pick<HomeBlogPostFeedService, 'publishedPosts' | 'isReady' | 'loadError'>;
    const topicHubRepository = {
      getPublishedTopicHubs$: () => of([]),
      getPublishedTopicHubs: () => [],
    } satisfies Pick<TopicHubRepositoryService, 'getPublishedTopicHubs$' | 'getPublishedTopicHubs'>;

    await TestBed.configureTestingModule({
      imports: [HomeRecoveryBlogSectionsComponent],
      providers: [
        provideRouter([]),
        {provide: HomeBlogPostFeedService, useValue: blogPostFeed},
        {provide: TopicHubRepositoryService, useValue: topicHubRepository},
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(HomeRecoveryBlogSectionsComponent);
    fixture.detectChanges();
  });

  it('promotes the three newest weekly updates on a fan-style board', () => {
    const element = fixture.nativeElement as HTMLElement;
    const section = element.querySelector<HTMLElement>('#health-recovery');
    const listing = section?.querySelector<HTMLElement>('[data-layout="fan"]');

    expect(section?.querySelector('.home-updates-board')).not.toBeNull();
    expect(listing?.querySelectorAll('[data-post-id]').length).toBe(3);
    expect(listing?.querySelector('[data-post-id="weekly-update-one"]')).not.toBeNull();
    expect(listing?.querySelector('[data-post-id="weekly-update-two"]')).not.toBeNull();
    expect(listing?.querySelector('[data-post-id="weekly-update-three"]')).not.toBeNull();
    expect(listing?.querySelector('[data-post-id="weekly-update-four"]')).toBeNull();
    expect(listing?.querySelector('[data-post-id="weekly-tag-only"]')).toBeNull();
    expect(listing?.querySelectorAll('.post-listing__read-link').length).toBe(3);
    expect(listing?.textContent).toContain('Read update');
    expect(section?.querySelector('a[href="/blog/category/weekly-updates"]')).not.toBeNull();
  });

  it('shows one hospital lesson and routes readers to the Recovery Planning topic', () => {
    const element = fixture.nativeElement as HTMLElement;
    const section = element.querySelector<HTMLElement>('#medical-information');
    const listing = section?.querySelector<HTMLElement>('[data-layout="list"]');

    expect(listing?.querySelectorAll('[data-post-id]').length).toBe(1);
    expect(listing?.querySelector('[data-post-id="patient-prep-guide"]')).not.toBeNull();
    expect(listing?.querySelector('[data-post-id="hospital-lesson-two"]')).toBeNull();
    expect(listing?.querySelector('[data-post-id^="weekly-update"]')).toBeNull();
    expect(listing?.textContent).toContain('Read this lesson');
    expect(section?.querySelector('a[href="/topics/recovery-planning"]')).not.toBeNull();
  });
});
