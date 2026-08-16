import {TestBed} from '@angular/core/testing';
import {RouterTestingModule} from '@angular/router/testing';

import {SiteAnalyticsService} from '../../../../shared/analytics/site-analytics.service';
import {BlogPostSummary} from '../../models/blog-post.model';
import {BlogNextReadComponent} from './blog-next-read.component';

describe('BlogNextReadComponent', () => {
  const post: BlogPostSummary = {
    id: 'related-1',
    slug: 'related-story',
    title: 'The genuinely related story',
    excerpt: 'A concise reason to continue this subject.',
    coverImage: '/assets/related.webp',
    author: {name: 'Colin Michaels'},
    categories: ['Technology'],
    tags: ['Angular'],
    publishedAt: '2026-08-10T00:00:00.000Z',
    updatedAt: '2026-08-10T00:00:00.000Z',
  };

  it('renders one same-intent next read and records the selection', async () => {
    const analytics = jasmine.createSpyObj<SiteAnalyticsService>(
      'SiteAnalyticsService',
      ['trackContentSelection']
    );
    await TestBed.configureTestingModule({
      imports: [BlogNextReadComponent, RouterTestingModule],
      providers: [{provide: SiteAnalyticsService, useValue: analytics}],
    }).compileComponents();

    const fixture = TestBed.createComponent(BlogNextReadComponent);
    fixture.componentRef.setInput('post', post);
    fixture.detectChanges();

    const element = fixture.nativeElement as HTMLElement;
    const link = element.querySelector<HTMLAnchorElement>('a');

    expect(element.textContent).toContain('Continue this thread');
    expect(element.textContent).toContain(post.title);
    expect(link?.getAttribute('href')).toBe('/blog/related-story');

    link?.click();

    expect(analytics.trackContentSelection).toHaveBeenCalledWith(post, 'related_reading');
  });
});
