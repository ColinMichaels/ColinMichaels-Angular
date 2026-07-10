import {ComponentFixture, TestBed} from '@angular/core/testing';

import {BlogShareEvent} from '../../services/blog-engagement.service';
import {BlogShareActionsComponent} from './blog-share-actions.component';

describe('BlogShareActionsComponent', () => {
  let fixture: ComponentFixture<BlogShareActionsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [BlogShareActionsComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(BlogShareActionsComponent);
    fixture.componentRef.setInput('title', 'Shareable post');
    fixture.componentRef.setInput('path', '/blog/shareable-post');
    fixture.detectChanges();
  });

  it('opens every share link in a new tab', () => {
    const element = fixture.nativeElement as HTMLElement;
    const shareLinks = Array.from(element.querySelectorAll<HTMLAnchorElement>('a'));

    expect(shareLinks.length).toBe(4);

    for (const link of shareLinks) {
      expect(link.getAttribute('target')).toBe('_blank');
      expect(link.getAttribute('rel')).toBe('noopener noreferrer');
    }
  });

  it('emits a share provider when a share link is clicked', () => {
    const component = fixture.componentInstance;
    const shareEvents: BlogShareEvent[] = [];
    component.shared.subscribe(event => shareEvents.push(event));
    const element = fixture.nativeElement as HTMLElement;
    const facebookLink = element.querySelector<HTMLAnchorElement>('a[title="Share on Facebook"]');

    facebookLink?.click();

    expect(shareEvents).toEqual([{
      provider: 'facebook',
      shareId: null,
      shareUrl: `${document.location.origin}/blog/shareable-post`,
    }]);
  });

  it('adds one opaque attribution id per provider when tracking is enabled', () => {
    fixture.componentRef.setInput('trackingEnabled', true);
    fixture.detectChanges();

    const element = fixture.nativeElement as HTMLElement;
    const facebookLink = element.querySelector<HTMLAnchorElement>('a[title="Share on Facebook"]');
    const linkedInLink = element.querySelector<HTMLAnchorElement>('a[title="Share on LinkedIn"]');
    const decodedFacebookUrl = decodeURIComponent(new URL(facebookLink?.href ?? '').searchParams.get('u') ?? '');
    const decodedLinkedInUrl = decodeURIComponent(new URL(linkedInLink?.href ?? '').searchParams.get('url') ?? '');
    const facebookShareId = new URL(decodedFacebookUrl).searchParams.get('share');
    const linkedInShareId = new URL(decodedLinkedInUrl).searchParams.get('share');

    expect(facebookShareId).toMatch(/^[A-Za-z0-9_-]{20,80}$/);
    expect(linkedInShareId).toMatch(/^[A-Za-z0-9_-]{20,80}$/);
    expect(linkedInShareId).not.toBe(facebookShareId);
  });

  it('fans toolbar share providers out from one trigger', () => {
    fixture.componentRef.setInput('variant', 'toolbar');
    fixture.detectChanges();

    const element = fixture.nativeElement as HTMLElement;
    const trigger = element.querySelector<HTMLButtonElement>('[data-share-trigger]');
    const providerActions = Array.from(element.querySelectorAll<HTMLElement>('[data-share-provider]'));

    expect(trigger?.getAttribute('aria-expanded')).toBe('false');
    expect(providerActions.length).toBe(5);
    expect(providerActions.every(action => action.getAttribute('tabindex') === '-1')).toBeTrue();

    trigger?.click();
    fixture.detectChanges();

    expect(trigger?.getAttribute('aria-expanded')).toBe('true');
    expect(providerActions.every(action => action.getAttribute('tabindex') === null)).toBeTrue();
    expect(element.querySelector('.share-fan__actions')?.classList).toContain('share-fan__actions--open');
  });

  it('opens the toolbar share fan on hover', () => {
    fixture.componentRef.setInput('variant', 'toolbar');
    fixture.detectChanges();

    const shareGroup = fixture.nativeElement.querySelector('[role="group"]') as HTMLElement;
    shareGroup.dispatchEvent(new PointerEvent('pointerenter', {pointerType: 'mouse'}));
    fixture.detectChanges();

    expect(shareGroup.querySelector('[data-share-trigger]')?.getAttribute('aria-expanded')).toBe('true');
  });
});
