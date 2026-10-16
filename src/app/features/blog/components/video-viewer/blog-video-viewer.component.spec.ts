import {TestBed} from '@angular/core/testing';
import {BlogVideoViewerComponent} from './blog-video-viewer.component';

describe('BlogVideoViewerComponent', () => {
  function setup() {
    const fixture = TestBed.createComponent(BlogVideoViewerComponent);
    fixture.componentRef.setInput('articleTitle', 'Flight notes');
    fixture.componentRef.setInput('video', {blockId: 'video', videoId: 'L229QDxDakU',
      videoUrl: 'https://youtu.be/L229QDxDakU', thumbnailUrl: '/assets/example.webp'});
    fixture.detectChanges();
    return fixture;
  }

  it('loads no third-party player until the reader chooses play', () => {
    const fixture = setup();
    expect(fixture.nativeElement.querySelector('iframe')).toBeNull();
    fixture.nativeElement.querySelector('.video-poster').click();
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('iframe').src).toContain('www.youtube.com/embed/L229QDxDakU');
  });

  it('retains the same iframe when docking and toggling watch while reading', () => {
    const fixture = setup();
    fixture.nativeElement.querySelector('.video-poster').click();
    fixture.detectChanges();
    const frame = fixture.nativeElement.querySelector('iframe');
    // Simulate the geometry signal; browser QA exercises the real observer.
    (fixture.componentInstance as unknown as {pastViewer: {set(value: boolean): void}}).pastViewer.set(true);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('[data-floating="true"]')).not.toBeNull();
    fixture.nativeElement.querySelector('input').click();
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('[data-floating="true"]')).toBeNull();
    expect(fixture.nativeElement.querySelector('iframe')).toBe(frame);
  });

  it('stops the player when closed or when a different article video arrives', () => {
    const fixture = setup();
    fixture.nativeElement.querySelector('.video-poster').click();
    fixture.detectChanges();
    fixture.nativeElement.querySelector('[aria-label="Stop watching"]').click();
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('iframe')).toBeNull();
    fixture.nativeElement.querySelector('.video-poster').click();
    fixture.detectChanges();
    fixture.componentRef.setInput('video', {blockId: 'new', videoId: 'abcdefghijk',
      videoUrl: 'https://youtu.be/abcdefghijk', thumbnailUrl: '/assets/other.webp'});
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('iframe')).toBeNull();
  });
});
