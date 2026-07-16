import {ComponentFixture, TestBed} from '@angular/core/testing';
import {RouterTestingModule} from '@angular/router/testing';

import {BlogPostSummary} from '../../models/blog-post.model';
import {BlogPostRailComponent} from './blog-post-rail.component';

describe('BlogPostRailComponent', () => {
  let fixture: ComponentFixture<BlogPostRailComponent>;

  const suggestedPost: BlogPostSummary = {
    id: 'related-1',
    slug: 'related-post',
    title: 'A related article',
    excerpt: 'Related summary',
    coverImage: '/assets/related.webp',
    author: {name: 'Colin Michaels'},
    categories: ['Engineering'],
    tags: ['Angular'],
    publishedAt: '2026-07-15T12:00:00.000Z',
    updatedAt: '2026-07-15T12:00:00.000Z',
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [BlogPostRailComponent, RouterTestingModule],
    }).compileComponents();

    fixture = TestBed.createComponent(BlogPostRailComponent);
  });

  it('renders compact suggested-post navigation', () => {
    fixture.componentInstance.suggestedPosts = [suggestedPost];
    fixture.detectChanges();

    const text = fixture.nativeElement.textContent;
    const relatedLink = fixture.nativeElement.querySelector('a[href="/blog/related-post"]');

    expect(text).toContain('More posts');
    expect(text).toContain('A related article');
    expect(relatedLink).not.toBeNull();
  });

  it('renders explicitly placed custom blocks in rail mode', () => {
    fixture.componentInstance.blocks = [{
      id: 'rail-stat',
      type: 'stats',
      data: {
        placement: 'rail',
        title: 'Quick stat',
        stats: [{label: 'Articles', value: '12'}],
      },
    }];
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('On this post');
    expect(fixture.nativeElement.textContent).toContain('Quick stat');
    expect(fixture.nativeElement.textContent).toContain('12');
  });
});
