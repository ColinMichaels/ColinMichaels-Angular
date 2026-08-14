import {ComponentFixture, TestBed} from '@angular/core/testing';
import {provideRouter} from '@angular/router';

import {BlogPostSummary} from '../../models/blog-post.model';
import {
  BlogPostListingComponent,
  BlogPostListingLayout,
} from './blog-post-listing.component';

function createPost(overrides: Partial<BlogPostSummary> = {}): BlogPostSummary {
  return {
    id: overrides.id ?? 'post-one',
    slug: overrides.slug ?? 'first-post',
    title: overrides.title ?? 'A useful first post',
    excerpt: overrides.excerpt ?? 'A practical description of the article.',
    coverImage: overrides.coverImage ?? '/assets/images/blog/first-cover.webp',
    thumbnailImage: Object.prototype.hasOwnProperty.call(overrides, 'thumbnailImage')
      ? overrides.thumbnailImage
      : '/assets/images/blog/first-thumbnail.webp',
    featured: overrides.featured ?? false,
    author: overrides.author ?? {name: 'Colin Michaels'},
    categories: overrides.categories ?? ['Angular Architecture'],
    subcategories: overrides.subcategories ?? [],
    tags: overrides.tags ?? ['Angular', 'Design systems'],
    publishedAt: Object.prototype.hasOwnProperty.call(overrides, 'publishedAt')
      ? overrides.publishedAt ?? null
      : '2026-07-05T12:00:00.000Z',
    updatedAt: overrides.updatedAt ?? '2026-07-06T12:00:00.000Z',
  };
}

describe('BlogPostListingComponent', () => {
  let fixture: ComponentFixture<BlogPostListingComponent>;
  const posts: readonly BlogPostSummary[] = [
    createPost(),
    createPost({
      id: 'post-two',
      slug: 'second-post',
      title: 'A second useful post',
      thumbnailImage: undefined,
      coverImage: '/assets/images/blog/second-cover.webp',
      categories: ['Recovery Planning'],
      tags: ['Recovery'],
      publishedAt: null,
    }),
  ];

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [BlogPostListingComponent],
      providers: [provideRouter([])],
    }).compileComponents();

    fixture = TestBed.createComponent(BlogPostListingComponent);
    fixture.componentRef.setInput('posts', posts);
    fixture.detectChanges();
  });

  it('renders every typed layout as an accessible list region', () => {
    const layouts: readonly BlogPostListingLayout[] = ['list', 'grid', 'fan', 'compact', 'editorial'];

    for (const layout of layouts) {
      fixture.componentRef.setInput('layout', layout);
      fixture.componentRef.setInput('regionLabel', `${layout} posts`);
      fixture.detectChanges();

      const element = fixture.nativeElement as HTMLElement;
      const region = element.querySelector<HTMLElement>('[role="region"]');
      const list = region?.querySelector(`ul.post-listing--${layout}`);

      expect(region?.getAttribute('aria-label')).toBe(`${layout} posts`);
      expect(region?.getAttribute('data-layout')).toBe(layout);
      expect(list?.getAttribute('role')).toBe('list');
      expect(list?.querySelectorAll(':scope > li').length).toBe(posts.length);
    }
  });

  it('owns loading, error, and empty states', () => {
    fixture.componentRef.setInput('posts', []);
    fixture.componentRef.setInput('loading', true);
    fixture.componentRef.setInput('loadingItemCount', 2);
    fixture.componentRef.setInput('loadingLabel', 'Loading topic articles');
    fixture.detectChanges();

    let element = fixture.nativeElement as HTMLElement;
    expect(element.querySelector('[role="status"]')?.textContent).toContain('Loading topic articles');
    expect(element.querySelectorAll('.post-listing__item--skeleton').length).toBe(2);
    expect(element.querySelector('[role="region"]')?.getAttribute('aria-busy')).toBe('true');

    fixture.componentRef.setInput('loading', false);
    fixture.componentRef.setInput('error', 'Firestore is unavailable.');
    fixture.componentRef.setInput('errorTitle', 'Topic posts could not load');
    fixture.detectChanges();

    element = fixture.nativeElement as HTMLElement;
    expect(element.querySelector('[role="alert"]')?.textContent).toContain('Topic posts could not load');
    expect(element.querySelector('[role="alert"]')?.textContent).toContain('Firestore is unavailable.');

    fixture.componentRef.setInput('error', null);
    fixture.componentRef.setInput('emptyTitle', 'No AI posts yet');
    fixture.componentRef.setInput('emptyMessage', 'New AI guides will appear here.');
    fixture.detectChanges();

    element = fixture.nativeElement as HTMLElement;
    expect(element.querySelector('[role="status"]')?.textContent).toContain('No AI posts yet');
    expect(element.querySelector('[role="status"]')?.textContent).toContain('New AI guides will appear here.');
  });

  it('uses the requested heading level and code-native post and taxonomy links', () => {
    fixture.componentRef.setInput('headingLevel', 3);
    fixture.detectChanges();

    const element = fixture.nativeElement as HTMLElement;
    const firstPost = element.querySelector<HTMLElement>('[data-post-id="post-one"]');

    expect(firstPost?.querySelector('h2')).toBeNull();
    expect(firstPost?.querySelector('h3')?.textContent).toContain('A useful first post');
    expect(firstPost?.querySelector('h3 a')?.getAttribute('href')).toBe('/blog/first-post');
    expect(firstPost?.querySelector('a[href="/blog/category/angular-architecture"]')).not.toBeNull();
    expect(firstPost?.querySelector('a[href="/blog/tag/angular"]')).not.toBeNull();
    expect(firstPost?.querySelector('time')?.getAttribute('datetime')).toBe('2026-07-05T12:00:00.000Z');
    expect(firstPost?.querySelector('img')?.getAttribute('src')).toBe('/assets/images/blog/first-thumbnail.webp');
    expect(firstPost?.querySelector('.post-listing__media')?.classList).toContain('blog-image-reveal');

    const secondPost = element.querySelector<HTMLElement>('[data-post-id="post-two"]');
    expect(secondPost?.querySelector('img')?.getAttribute('src')).toBe('/assets/images/blog/second-cover.webp');
    expect(secondPost?.querySelector('time')?.getAttribute('datetime')).toBe('2026-07-06T12:00:00.000Z');
  });

  it('can hide optional excerpt, tag, and metadata presentation', () => {
    fixture.componentRef.setInput('showExcerpt', false);
    fixture.componentRef.setInput('showTags', false);
    fixture.componentRef.setInput('showMeta', false);
    fixture.detectChanges();

    const element = fixture.nativeElement as HTMLElement;
    expect(element.querySelector('.post-listing__excerpt')).toBeNull();
    expect(element.querySelector('.post-listing__tags')).toBeNull();
    expect(element.querySelector('.post-listing__meta')).toBeNull();
  });

  it('can expose a custom read action outside the fan layout', () => {
    fixture.componentRef.setInput('layout', 'list');
    fixture.componentRef.setInput('showReadLink', true);
    fixture.componentRef.setInput('readLinkLabel', 'Read this lesson');
    fixture.detectChanges();

    const element = fixture.nativeElement as HTMLElement;
    const readLinks = element.querySelectorAll<HTMLAnchorElement>('.post-listing__read-link');

    expect(readLinks.length).toBe(posts.length);
    expect(readLinks[0].textContent).toContain('Read this lesson');
    expect(readLinks[0].getAttribute('href')).toBe('/blog/first-post');
  });

  it('can clamp promotional excerpts without changing their content', () => {
    fixture.componentRef.setInput('excerptLineClamp', 3);
    fixture.detectChanges();

    const element = fixture.nativeElement as HTMLElement;
    const region = element.querySelector<HTMLElement>('.post-listing-region');

    expect(region?.classList.contains('post-listing-region--clamped')).toBeTrue();
    expect(region?.style.getPropertyValue('--listing-excerpt-lines')).toBe('3');
    expect(element.querySelector('.post-listing__excerpt')?.textContent).toContain('A practical description');
  });

  it('keeps fan media in the standard presentation by default', () => {
    fixture.componentRef.setInput('layout', 'fan');
    fixture.detectChanges();

    const element = fixture.nativeElement as HTMLElement;
    const region = element.querySelector<HTMLElement>('.post-listing-region');

    expect(region?.getAttribute('data-media-presentation')).toBe('standard');
    expect(region?.classList.contains('post-listing-region--background-media')).toBeFalse();
    expect(region?.classList.contains('post-listing-region--title-clamped')).toBeFalse();
    expect(region?.style.getPropertyValue('--listing-title-lines')).toBe('');
  });

  it('keeps editorial cover artwork fully visible without changing other layouts', () => {
    fixture.componentRef.setInput('layout', 'editorial');
    fixture.detectChanges();

    let image = (fixture.nativeElement as HTMLElement).querySelector<HTMLImageElement>(
      '.post-listing__media img'
    );
    expect(image?.style.objectFit).toBe('contain');

    fixture.componentRef.setInput('layout', 'grid');
    fixture.detectChanges();

    image = (fixture.nativeElement as HTMLElement).querySelector<HTMLImageElement>(
      '.post-listing__media img'
    );
    expect(image?.style.objectFit).toBe('');
  });

  it('supports background fan media and word-aware visible title truncation without losing the full title', () => {
    const fullTitle =
      'A weekly recovery update about rebuilding routines, rediscovering confidence, and making steady progress';
    const shortTitle = 'A short recovery note';
    const titleMaxLength = 64;

    fixture.componentRef.setInput('posts', [
      createPost({title: fullTitle}),
      createPost({
        id: 'post-short-title',
        slug: 'short-recovery-note',
        title: shortTitle,
      }),
    ]);
    fixture.componentRef.setInput('layout', 'fan');
    fixture.componentRef.setInput('mediaPresentation', 'background');
    fixture.componentRef.setInput('titleMaxLength', titleMaxLength);
    fixture.componentRef.setInput('titleLineClamp', 3);
    fixture.detectChanges();

    const element = fixture.nativeElement as HTMLElement;
    const region = element.querySelector<HTMLElement>('.post-listing-region');
    const longTitleLink = element.querySelector<HTMLAnchorElement>(
      '[data-post-id="post-one"] .post-listing__title a'
    );
    const longTitleText = longTitleLink?.querySelector<HTMLSpanElement>('span');
    const visibleTitle = longTitleText?.textContent?.trim() ?? '';
    const visiblePrefix = visibleTitle.replace(/(?:\.\.\.|…)$/, '');
    const shortTitleText = element.querySelector<HTMLSpanElement>(
      '[data-post-id="post-short-title"] .post-listing__title span'
    );

    expect(region?.getAttribute('data-media-presentation')).toBe('background');
    expect(region?.classList.contains('post-listing-region--background-media')).toBeTrue();
    expect(region?.classList.contains('post-listing-region--title-clamped')).toBeTrue();
    expect(region?.style.getPropertyValue('--listing-title-lines')).toBe('3');
    expect(element.querySelectorAll('.post-listing__backdrop').length).toBe(2);
    expect(element.querySelectorAll('.post-listing__backdrop img[alt=""]').length).toBe(2);
    expect(element.querySelectorAll('.post-listing__media img').length).toBe(2);
    expect(visibleTitle.length).toBeLessThanOrEqual(titleMaxLength);
    expect(visibleTitle).toMatch(/(?:\.\.\.|…)$/);
    expect(fullTitle.startsWith(visiblePrefix)).toBeTrue();
    expect(fullTitle.charAt(visiblePrefix.length)).toBe(' ');
    expect(longTitleLink?.getAttribute('aria-label')).toBe(`Read ${fullTitle}`);
    expect(longTitleText?.getAttribute('title')).toBe(fullTitle);
    expect(shortTitleText?.textContent?.trim()).toBe(shortTitle);
    expect(shortTitleText?.hasAttribute('title')).toBeFalse();
  });

  it('applies the topic appearance and per-post theme override through brand variables', () => {
    fixture.componentRef.setInput('appearance', {
      label: 'AI setup guides',
      accent: '#22d3ee',
      accentStrong: '#67e8f9',
      accentRgb: '34 211 238',
    });
    fixture.componentRef.setInput('appearanceByPostId', {
      'post-two': {
        label: 'Recovery planning',
        accent: '#2dd4bf',
        accentStrong: '#5eead4',
        accentRgb: '45 212 191',
      },
    });
    fixture.detectChanges();

    const element = fixture.nativeElement as HTMLElement;
    const firstPost = element.querySelector<HTMLElement>('[data-post-id="post-one"]');
    const secondPost = element.querySelector<HTMLElement>('[data-post-id="post-two"]');

    expect(firstPost?.style.getPropertyValue('--post-accent')).toBe('#22d3ee');
    expect(firstPost?.style.getPropertyValue('--post-accent-strong')).toBe('#67e8f9');
    expect(firstPost?.style.getPropertyValue('--post-accent-rgb')).toBe('34 211 238');
    expect(firstPost?.querySelector('.post-listing__topic')?.textContent).toContain('AI setup guides');

    expect(secondPost?.style.getPropertyValue('--post-accent')).toBe('#2dd4bf');
    expect(secondPost?.style.getPropertyValue('--post-accent-strong')).toBe('#5eead4');
    expect(secondPost?.style.getPropertyValue('--post-accent-rgb')).toBe('45 212 191');
    expect(secondPost?.querySelector('.post-listing__topic')?.textContent).toContain('Recovery planning');
  });
});
