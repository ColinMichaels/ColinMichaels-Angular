import {isPlatformBrowser} from '@angular/common';
import {
  AfterViewInit, ChangeDetectionStrategy, Component, DestroyRef, ElementRef,
  Input, OnChanges, PLATFORM_ID, ViewChild, computed, inject, signal,
} from '@angular/core';
import {DomSanitizer} from '@angular/platform-browser';
import type {BlogLeadVideo} from '../../utils/blog-lead-video.util';
import {getYouTubeVideoId} from '../../../youtube/utils/youtube-url.util';
import {BlogRichTextComponent} from '../rich-text/blog-rich-text.component';

@Component({
  selector: 'app-blog-video-viewer',
  imports: [BlogRichTextComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section id="blog-article-video" aria-label="Article video" class="video-cinema">
      <div #videoSlot class="video-slot">
        <div class="video-player" [class.video-player-floating]="floating()" [attr.data-floating]="floating()">
          <div class="floating-controls" [hidden]="!floating()">
            <button type="button" (click)="returnToVideo()">Return to video</button>
            <button type="button" (click)="stopWatching()" aria-label="Stop watching">Close</button>
          </div>
          <div class="video-frame">
            @if (started() && embedUrl(); as url) {
              <iframe [src]="url" [title]="'Video: ' + articleTitle"
                allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
                allowfullscreen referrerpolicy="strict-origin-when-cross-origin"></iframe>
            } @else {
              <button class="video-poster" type="button" (click)="play()" [attr.aria-label]="'Play video: ' + articleTitle">
                <img #poster [src]="posterUrl()" alt="" width="1280" height="720" fetchpriority="high"
                  (error)="useFallbackPoster()" (load)="checkPosterSize(poster)">
                <span class="video-play-icon" aria-hidden="true">
                  <svg viewBox="0 0 24 24" fill="currentColor"><path d="m9 5 11 7-11 7z"/></svg>
                </span>
                <span class="video-play-label">Play video</span>
              </button>
            }
          </div>
        </div>
        @if (floating()) {
          <button class="video-return-placeholder" type="button" (click)="returnToVideo()">Return to video</button>
        }
      </div>
      <div class="video-options">
        <label><input type="checkbox" [checked]="watchWhileReading()"
          (change)="watchWhileReading.set($any($event.target).checked)">
          <span class="watch-toggle" aria-hidden="true"></span> Watch while reading</label>
        <a [href]="video.videoUrl" target="_blank" rel="noopener noreferrer">Watch on YouTube</a>
      </div>
      @if (video.caption) {
        <p class="video-caption"><app-blog-rich-text [html]="video.caption || ''"></app-blog-rich-text></p>
      }
    </section>
  `,
  styles: `
    :host { display: block; }
    .video-cinema { max-width: 72rem; margin: 0 auto clamp(2rem, 4vw, 3.5rem); scroll-margin-top: calc(var(--site-header-sticky-height) + 1rem); }
    .video-slot { position: relative; aspect-ratio: 16 / 9; background: #080b10; }
    .video-player { width: 100%; background: #080b10; }
    .video-frame { position: relative; aspect-ratio: 16 / 9; }
    iframe, .video-poster { display: block; width: 100%; height: 100%; position: absolute; inset: 0; border: 0; }
    .video-poster { cursor: pointer; overflow: hidden; color: white; background: #080b10; }
    .video-poster img { width: 100%; height: 100%; object-fit: cover; }
    .video-play-icon { position: absolute; inset: 50% auto auto 50%; transform: translate(-50%, -50%); width: 5rem; height: 3.5rem; display: grid; place-items: center; border-radius: .75rem; background: rgb(0 0 0 / .8); }
    .video-play-icon svg { width: 2rem; height: 2rem; }
    .video-poster:hover .video-play-icon { background: #b91c1c; }
    .video-play-label { position: absolute; bottom: 1rem; left: 1rem; padding: .5rem .75rem; background: rgb(0 0 0 / .8); border-radius: .25rem; font-size: .875rem; }
    .video-options { display: flex; flex-wrap: wrap; justify-content: space-between; gap: .25rem 1rem; align-items: center; padding-top: .5rem; font-size: .875rem; color: var(--site-muted); }
    .video-options label, .video-options a { display: inline-flex; align-items: center; min-height: 2.75rem; gap: .65rem; }
    .video-options label { cursor: pointer; position: relative; }
    input { position: absolute; width: 1px; height: 1px; opacity: 0; }
    .watch-toggle { display: inline-block; position: relative; width: 2.25rem; height: 1.25rem; border-radius: 1rem; background: var(--site-border); }
    .watch-toggle::after { content: ''; position: absolute; top: .125rem; left: .125rem; width: 1rem; height: 1rem; border-radius: 50%; background: white; box-shadow: 0 1px 3px rgb(0 0 0 / .25); }
    input:checked + .watch-toggle { background: var(--site-accent); }
    input:checked + .watch-toggle::after { transform: translateX(1rem); }
    input:focus-visible + .watch-toggle { outline: 2px solid var(--site-accent); outline-offset: 3px; }
    .video-caption { color: var(--site-muted); font-size: .8125rem; line-height: 1.6; margin-top: .5rem; }
    a { color: var(--site-accent); text-decoration: underline; text-underline-offset: .2em; }
    button:focus-visible, a:focus-visible, input:focus-visible { outline: 2px solid var(--site-accent); outline-offset: 3px; }
    .video-player-floating { position: fixed; bottom: 5rem; right: 1rem; width: min(22rem, calc(100vw - 2rem)); z-index: 45; border: 1px solid var(--site-border); border-radius: .5rem; overflow: hidden; box-shadow: 0 .75rem 3rem rgb(0 0 0 / .4); }
    .floating-controls { display: flex; justify-content: space-between; background: #080b10; color: #f4f4f5; font-size: .75rem; }
    .floating-controls[hidden] { display: none; }
    .floating-controls button { min-height: 2.75rem; padding: .5rem .75rem; }
    .video-return-placeholder { position: absolute; inset: 0; width: 100%; color: #e4e4e7; }
    @media (max-width: 639px) { .video-player-floating { width: 13rem; right: .75rem; } }
  `,
})
export class BlogVideoViewerComponent implements AfterViewInit, OnChanges {
  @Input({required: true}) video!: BlogLeadVideo;
  @Input({required: true}) articleTitle = '';
  @ViewChild('videoSlot', {static: true}) private slot!: ElementRef<HTMLElement>;
  private readonly sanitizer = inject(DomSanitizer);
  private readonly platformId = inject(PLATFORM_ID);
  private readonly destroyRef = inject(DestroyRef);
  private readonly pastViewer = signal(false);
  private previousVideoId = '';
  protected readonly started = signal(false);
  protected readonly watchWhileReading = signal(true);
  protected readonly posterUrl = signal('');
  protected readonly floating = computed(() => this.started() && this.watchWhileReading() && this.pastViewer());
  protected readonly embedUrl = signal<ReturnType<DomSanitizer['bypassSecurityTrustResourceUrl']> | null>(null);

  ngOnChanges(): void {
    const id = getYouTubeVideoId(this.video.videoUrl);
    if (id !== this.previousVideoId) {
      this.started.set(false);
      this.previousVideoId = id ?? '';
      this.posterUrl.set(id ? `https://i.ytimg.com/vi/${id}/maxresdefault.jpg` : this.video.thumbnailUrl);
      this.embedUrl.set(id ? this.sanitizer.bypassSecurityTrustResourceUrl(
        `https://www.youtube.com/embed/${id}?autoplay=1&playsinline=1&rel=0`
      ) : null);
    }
  }

  ngAfterViewInit(): void {
    if (!isPlatformBrowser(this.platformId) || typeof IntersectionObserver === 'undefined') return;
    const observer = new IntersectionObserver(([entry]) => {
      this.pastViewer.set(!entry.isIntersecting && entry.boundingClientRect.bottom < 0);
    });
    observer.observe(this.slot.nativeElement);
    this.destroyRef.onDestroy(() => observer.disconnect());
  }

  protected play(): void { this.started.set(Boolean(this.embedUrl())); }
  protected useFallbackPoster(): void {
    if (this.posterUrl() !== this.video.thumbnailUrl) this.posterUrl.set(this.video.thumbnailUrl);
  }
  protected checkPosterSize(image: HTMLImageElement): void {
    if (image.naturalWidth < 480) this.useFallbackPoster();
  }
  protected stopWatching(): void { this.started.set(false); }
  returnToVideo(): void {
    // Restore the same iframe in place without reloading its playback session.
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    this.slot.nativeElement.scrollIntoView({behavior: reduceMotion ? 'instant' : 'smooth', block: 'center'});
  }
}
