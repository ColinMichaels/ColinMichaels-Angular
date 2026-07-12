import {ComponentFixture, TestBed} from '@angular/core/testing';

import {BlogPostBackgroundComponent} from './blog-post-background.component';

describe('BlogPostBackgroundComponent', () => {
  let fixture: ComponentFixture<BlogPostBackgroundComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [BlogPostBackgroundComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(BlogPostBackgroundComponent);
    fixture.componentRef.setInput('imageUrl', '/assets/images/backgrounds/day.webp');
    fixture.detectChanges();
  });

  it('renders a decorative, viewport-filling background image', () => {
    const image = (fixture.nativeElement as HTMLElement).querySelector<HTMLImageElement>('img');

    expect(image?.getAttribute('src')).toBe('/assets/images/backgrounds/day.webp');
    expect(image?.getAttribute('alt')).toBe('');
    expect(image?.getAttribute('aria-hidden')).toBe('true');
    expect(image?.hasAttribute('data-site-preload-image')).toBeTrue();
  });

  it('reports and removes a failed decorative background', () => {
    const loadFailed = spyOn(fixture.componentInstance.imageLoadFailed, 'emit');
    const image = (fixture.nativeElement as HTMLElement).querySelector<HTMLImageElement>('img');
    image?.dispatchEvent(new Event('error'));
    fixture.detectChanges();

    expect(loadFailed).toHaveBeenCalledOnceWith('/assets/images/backgrounds/day.webp');
    expect((fixture.nativeElement as HTMLElement).querySelector('img')).toBeNull();
    expect((fixture.nativeElement as HTMLElement).querySelector('.blog-post-background-scrim')).toBeNull();
  });
});
