import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  EventEmitter,
  Input,
  NgZone,
  OnChanges,
  OnDestroy,
  Output,
  ViewChild,
} from '@angular/core';

@Component({
  selector: 'app-blog-infinite-scroll',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="blog-infinite-scroll" aria-label="More blog posts">
      <p class="blog-infinite-scroll__progress" aria-live="polite">
        @if (hasMore) {
          {{ loadedCount }} of {{ totalCount }} posts shown
        } @else {
          All {{ totalCount }} posts shown
        }
      </p>

      @if (hasMore) {
        <button
          type="button"
          class="blog-infinite-scroll__button"
          [disabled]="loading"
          (click)="requestLoad()"
        >
          {{ loading ? 'Loading posts…' : 'Load more posts' }}
        </button>
        <span #sentinel class="blog-infinite-scroll__sentinel" aria-hidden="true"></span>
      }
    </section>
  `,
  styles: [`
    :host {
      display: block;
    }

    .blog-infinite-scroll {
      display: grid;
      justify-items: center;
      gap: 0.72rem;
      margin-top: 1.65rem;
      padding: 1.25rem 0 0.15rem;
      border-top: 1px solid var(--site-border);
    }

    .blog-infinite-scroll__progress {
      margin: 0;
      color: var(--site-muted);
      font-family: var(--font-accent);
      font-size: 0.76rem;
      font-weight: 700;
      letter-spacing: 0.08em;
      text-align: center;
      text-transform: uppercase;
    }

    .blog-infinite-scroll__button {
      min-height: 2.65rem;
      border: 1px solid var(--site-accent-strong);
      border-radius: 999px;
      background: var(--site-accent-soft);
      color: var(--site-accent-strong);
      cursor: pointer;
      font-family: var(--font-accent);
      font-size: 0.82rem;
      font-weight: 700;
      padding: 0.55rem 1rem;
      transition: background-color 160ms ease, color 160ms ease, transform 160ms ease;
    }

    .blog-infinite-scroll__button:hover:not(:disabled),
    .blog-infinite-scroll__button:focus-visible {
      background: var(--site-accent);
      color: #022c22;
      outline: none;
      transform: translateY(-1px);
    }

    .blog-infinite-scroll__button:focus-visible {
      outline: 2px solid var(--site-accent-strong);
      outline-offset: 3px;
    }

    .blog-infinite-scroll__button:disabled {
      cursor: progress;
      opacity: 0.72;
    }

    .blog-infinite-scroll__sentinel {
      display: block;
      inline-size: 100%;
      block-size: 1px;
    }
  `],
})
export class BlogInfiniteScrollComponent implements AfterViewInit, OnChanges, OnDestroy {
  @Input({required: true}) hasMore = false;
  @Input({required: true}) loadedCount = 0;
  @Input({required: true}) totalCount = 0;
  @Input() loading = false;
  @Output() readonly loadMore = new EventEmitter<void>();
  @ViewChild('sentinel') private sentinel?: ElementRef<HTMLElement>;

  private observer?: IntersectionObserver;
  private initialized = false;
  private loadRequested = false;

  constructor(private readonly zone: NgZone) {}

  ngAfterViewInit(): void {
    this.initialized = true;
    this.observeSentinel();
  }

  ngOnChanges(): void {
    if (!this.initialized) {
      return;
    }

    this.loadRequested = false;
    this.observeSentinel();
  }

  ngOnDestroy(): void {
    this.observer?.disconnect();
  }

  protected requestLoad(): void {
    if (!this.hasMore || this.loading || this.loadRequested) {
      return;
    }

    this.loadRequested = true;
    this.loadMore.emit();
  }

  private observeSentinel(): void {
    this.observer?.disconnect();

    const sentinel = this.sentinel;

    if (!this.hasMore || !sentinel || typeof IntersectionObserver === 'undefined') {
      return;
    }

    this.zone.runOutsideAngular(() => {
      this.observer = new IntersectionObserver(
        entries => {
          if (entries.some(entry => entry.isIntersecting)) {
            this.zone.run(() => this.requestLoad());
          }
        },
        {rootMargin: '480px 0px'}
      );
      this.observer.observe(sentinel.nativeElement);
    });
  }
}
