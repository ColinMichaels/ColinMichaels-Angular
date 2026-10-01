import {DOCUMENT} from '@angular/common';
import {DestroyRef, inject, Injectable, signal} from '@angular/core';
import {BlogPost} from '../blog/models/blog-post.model';
import {AuthService} from '../../services/auth.service';
import {PublishingScheduleApiService} from './publishing-schedule-api.service';
import {isScheduleSlug, PublishingScheduleEntry} from './publishing-schedule.models';

/** Component-scoped reader state. Private bodies never enter a repository or browser storage. */
@Injectable()
export class PublishingScheduleService {
  private readonly api = inject(PublishingScheduleApiService);
  private readonly document = inject(DOCUMENT);
  private readonly destroyRef = inject(DestroyRef);
  private readonly entryState = signal<readonly PublishingScheduleEntry[]>([]);
  private readonly postState = signal<BlogPost | null>(null);
  private readonly accessState = signal<'public' | 'early' | null>(null);
  private readonly loadingState = signal(false);
  private readonly errorState = signal<string | null>(null);
  private readonly serverNowState = signal<string | null>(null);
  readonly entries = this.entryState.asReadonly();
  readonly post = this.postState.asReadonly();
  readonly access = this.accessState.asReadonly();
  readonly loading = this.loadingState.asReadonly();
  readonly error = this.errorState.asReadonly();
  readonly serverNow = this.serverNowState.asReadonly();
  private context: 'schedule' | 'reader' | null = null;
  private slug = '';
  private authReady = false;
  private authIdentity = '';
  private generation = 0;
  private destroyed = false;

  constructor() {
    const subscription = inject(AuthService).authState$.subscribe(state => {
      const identity = `${state.status}:${state.user?.uid ?? ''}`;
      if (identity === this.authIdentity) return;
      this.authIdentity = identity;
      this.authReady = state.status !== 'initializing';
      this.clear();
      if (this.authReady && this.context) void this.refresh();
    });
    const window = this.document.defaultView;
    const interval = window?.setInterval(() => {
      if (this.document.visibilityState === 'visible') void this.refresh();
    }, 60_000);
    const onVisibility = () => {
      if (this.document.visibilityState === 'visible') void this.refresh();
    };
    this.document.addEventListener('visibilitychange', onVisibility);
    this.destroyRef.onDestroy(() => {
      this.destroyed = true;
      this.clear();
      subscription.unsubscribe();
      if (interval !== undefined) window?.clearInterval(interval);
      this.document.removeEventListener('visibilitychange', onVisibility);
    });
  }

  loadSchedule(): void {
    this.context = 'schedule';
    this.clear();
    void this.refresh();
  }

  loadPost(slug: string): void {
    this.context = 'reader';
    this.slug = slug;
    this.clear();
    if (!isScheduleSlug(slug)) {
      this.errorState.set('This article is unavailable.');
      return;
    }
    void this.refresh();
  }

  async refresh(): Promise<void> {
    if (this.destroyed || !this.context || !this.authReady || this.loadingState()) return;
    if (this.context === 'reader' && !isScheduleSlug(this.slug)) return;
    const generation = ++this.generation;
    const context = this.context;
    // Clear early content while access is revalidated, including minute/visibility checks.
    if (context === 'reader') { this.postState.set(null); this.accessState.set(null); }
    this.loadingState.set(true);
    this.errorState.set(null);
    try {
      if (context === 'schedule') {
        const response = await this.api.getSchedule();
        if (this.destroyed || generation !== this.generation) return;
        this.entryState.set(response.entries);
        this.serverNowState.set(response.serverNow);
      } else {
        const response = await this.api.getPost(this.slug);
        if (this.destroyed || generation !== this.generation) return;
        this.postState.set(response.post);
        this.accessState.set(response.access);
        this.serverNowState.set(response.serverNow);
      }
    } catch (error: unknown) {
      if (this.destroyed || generation !== this.generation) return;
      this.entryState.set([]);
      this.postState.set(null);
      this.accessState.set(null);
      const code = error && typeof error === 'object' && 'code' in error ? error.code : '';
      const denied = ['functions/permission-denied', 'functions/not-found', 'functions/unauthenticated'].includes(String(code));
      this.errorState.set(context === 'reader'
        ? denied ? 'This article is not available to your account yet. It may still be scheduled, or early access may have changed.'
          : 'This article could not be loaded. Please try again.'
        : 'The posting schedule could not be loaded. Please try again.');
    } finally {
      if (!this.destroyed && generation === this.generation) this.loadingState.set(false);
    }
  }

  private clear(): void {
    ++this.generation;
    this.entryState.set([]);
    this.postState.set(null);
    this.accessState.set(null);
    this.loadingState.set(false);
    this.errorState.set(null);
    this.serverNowState.set(null);
  }
}
