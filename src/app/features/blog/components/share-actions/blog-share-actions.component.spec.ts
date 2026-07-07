import {ComponentFixture, TestBed} from '@angular/core/testing';

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
    const sharedProviders: string[] = [];
    component.shared.subscribe(provider => sharedProviders.push(provider));
    const element = fixture.nativeElement as HTMLElement;
    const facebookLink = element.querySelector<HTMLAnchorElement>('a[title="Share on Facebook"]');

    facebookLink?.click();

    expect(sharedProviders).toEqual(['facebook']);
  });
});
