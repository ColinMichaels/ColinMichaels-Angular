import {ComponentFixture, TestBed} from '@angular/core/testing';

import {BlogStickyPostToolbarComponent} from './blog-sticky-post-toolbar.component';

describe('BlogStickyPostToolbarComponent', () => {
  let fixture: ComponentFixture<BlogStickyPostToolbarComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [BlogStickyPostToolbarComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(BlogStickyPostToolbarComponent);
    fixture.componentRef.setInput('title', 'Sticky post title');
    fixture.componentRef.setInput('imageUrl', '/assets/images/backgrounds/day.webp');
    fixture.componentRef.setInput('sharePath', 'blog/sticky-post');
    fixture.detectChanges();
  });

  it('keeps the post title, cover, share fan, and comments shortcut together', () => {
    const element = fixture.nativeElement as HTMLElement;
    const toolbarImage = element.querySelector<HTMLImageElement>('nav > div > img');
    const commentsLink = element.querySelector<HTMLAnchorElement>('a[aria-label="Jump to comments"]');
    const shareGroup = element.querySelector<HTMLElement>('[role="group"]');

    expect(element.querySelector('nav')?.getAttribute('aria-label')).toBe('Post reading shortcuts');
    expect(element.textContent).toContain('Sticky post title');
    expect(toolbarImage?.getAttribute('src')).toBe('/assets/images/backgrounds/day.webp');
    expect(shareGroup?.querySelector('[data-share-trigger]')).not.toBeNull();
    expect(shareGroup?.querySelectorAll('[data-share-provider]').length).toBe(5);
    expect(commentsLink?.getAttribute('href')).toBe('#blog-comments');
  });

  it('can hide the comments shortcut for draft previews', () => {
    fixture.componentRef.setInput('showComments', false);
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('[aria-label="Jump to comments"]')).toBeNull();
  });

  it('keeps the visible article title separate from social share metadata', () => {
    fixture.componentRef.setInput('shareTitle', 'Optimized social title');
    fixture.detectChanges();

    const element = fixture.nativeElement as HTMLElement;

    expect(element.querySelector('p')?.textContent).toContain('Sticky post title');
    expect(element.querySelector('a[title="Share on X"]')?.getAttribute('aria-label'))
      .toContain('Optimized social title');
  });

  it('scrolls and focuses the post header from the on-scroll action', () => {
    const target = document.createElement('header');
    target.id = 'blog-post-top';
    target.tabIndex = -1;
    const scrollIntoView = spyOn(target, 'scrollIntoView');
    const focus = spyOn(target, 'focus');
    document.body.append(target);

    try {
      const component = fixture.componentInstance as unknown as {
        showScrollTop: {set(value: boolean): void};
      };
      component.showScrollTop.set(true);
      fixture.detectChanges();

      const button = (fixture.nativeElement as HTMLElement)
        .querySelector<HTMLButtonElement>('button[aria-label="Scroll to top of post"]');
      button?.click();

      expect(scrollIntoView).toHaveBeenCalledOnceWith({behavior: 'smooth', block: 'start'});
      expect(focus).toHaveBeenCalledOnceWith({preventScroll: true});
    } finally {
      target.remove();
    }
  });
});
