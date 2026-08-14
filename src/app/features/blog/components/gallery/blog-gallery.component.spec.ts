import {ComponentFixture, TestBed} from '@angular/core/testing';

import {BlogGalleryComponent} from './blog-gallery.component';

const images = [
  {url: '/assets/images/backgrounds/day.webp', alt: 'Daytime studio', caption: 'Day session', width: 1600, height: 900},
  {
    url: '/assets/images/backgrounds/night.webp',
    alt: 'Nighttime studio',
    caption: 'Night session',
    width: 1200,
    height: 800
  },
  {url: '/assets/images/backgrounds/day.webp?detail=1', alt: 'Mixing console'},
] as const;

describe('BlogGalleryComponent', () => {
  let fixture: ComponentFixture<BlogGalleryComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({imports: [BlogGalleryComponent]}).compileComponents();
    fixture = TestBed.createComponent(BlogGalleryComponent);
    fixture.componentRef.setInput('images', images);
  });

  it('renders grid and mosaic images in document order with accessible media metadata', () => {
    fixture.componentRef.setInput('layout', 'grid');
    fixture.componentRef.setInput('title', 'Studio gallery');
    fixture.detectChanges();

    const element = fixture.nativeElement as HTMLElement;
    const renderedImages = [...element.querySelectorAll<HTMLImageElement>('img')];

    expect(element.querySelector('[data-gallery-layout="grid"]')).not.toBeNull();
    expect(renderedImages.map(image => image.alt)).toEqual(images.map(image => image.alt));
    expect(renderedImages[0].getAttribute('width')).toBe('1600');
    expect(renderedImages[0].getAttribute('height')).toBe('900');
    expect(renderedImages.every(image => image.loading === 'lazy')).toBeTrue();
    expect(element.textContent).toContain('Day session');

    fixture.componentRef.setInput('layout', 'mosaic');
    fixture.detectChanges();

    expect(element.querySelector('[data-gallery-layout="mosaic"]')).not.toBeNull();
    expect(element.querySelectorAll('.blog-gallery-mosaic-lead').length).toBe(1);
    expect([...element.querySelectorAll<HTMLImageElement>('img')].map(image => image.alt))
      .toEqual(images.map(image => image.alt));
  });

  it('runs a manual slideshow with visible and scoped keyboard controls', () => {
    fixture.componentRef.setInput('layout', 'slideshow');
    fixture.detectChanges();

    const element = fixture.nativeElement as HTMLElement;
    const position = () => element.querySelector<HTMLElement>('[data-testid="blog-gallery-position"]')?.textContent ?? '';

    expect(position()).toContain('Image 1 of 3');
    expect(element.querySelector<HTMLImageElement>('img')?.alt).toBe('Daytime studio');

    element.querySelector<HTMLButtonElement>('[data-testid="blog-gallery-next"]')?.click();
    fixture.detectChanges();
    expect(position()).toContain('Image 2 of 3');
    expect(element.querySelector<HTMLImageElement>('img')?.alt).toBe('Nighttime studio');

    element.querySelector<HTMLElement>('.blog-gallery-slideshow')
      ?.dispatchEvent(new KeyboardEvent('keydown', {key: 'ArrowLeft', bubbles: true}));
    fixture.detectChanges();
    expect(position()).toContain('Image 1 of 3');
  });

  it('opens the selected full image and replaces a failed preview accessibly', () => {
    fixture.componentRef.setInput('layout', 'grid');
    fixture.componentRef.setInput('lightboxStartIndex', 4);
    const openedIndexes: number[] = [];
    fixture.componentInstance.imageOpen.subscribe(index => openedIndexes.push(index));
    fixture.detectChanges();

    const element = fixture.nativeElement as HTMLElement;
    const buttons = element.querySelectorAll<HTMLButtonElement>('[data-testid="blog-gallery-image-button"]');
    buttons[1].click();
    expect(openedIndexes).toEqual([5]);

    element.querySelectorAll<HTMLImageElement>('img')[0].dispatchEvent(new Event('error'));
    fixture.detectChanges();
    const fallback = element.querySelector<HTMLElement>('[data-testid="blog-gallery-unavailable"]');

    expect(fallback?.textContent).toContain('Image unavailable');
    expect(fallback?.textContent).toContain('Daytime studio');
  });
});
