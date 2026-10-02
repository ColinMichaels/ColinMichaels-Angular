import {DatePipe} from '@angular/common';
import {ChangeDetectionStrategy, Component, effect, inject} from '@angular/core';
import {takeUntilDestroyed} from '@angular/core/rxjs-interop';
import {ActivatedRoute, Router, RouterLink} from '@angular/router';
import {BlogBlockRendererComponent} from '../../blog/components/block-renderer/blog-block-renderer.component';
import {PublishingScheduleService} from '../publishing-schedule.service';

@Component({
  selector: 'app-scheduled-reader',
  imports: [RouterLink, DatePipe, BlogBlockRendererComponent],
  providers: [PublishingScheduleService],
  changeDetection: ChangeDetectionStrategy.OnPush,
  styleUrl: './publishing-schedule.scss',
  template: `
    <section class="site-section scheduled-reader">
      <a routerLink="/schedule" class="site-inline-link">← Posting schedule</a>
      @if (schedule.loading()) { <p role="status" class="text-body py-12">Checking your reading access…</p> }
      @if (schedule.error(); as error) { <div role="alert" class="schedule-message"><h1 class="heading-section">Not ready to read</h1><p>{{ error }}</p><button type="button" class="btn-ghost" (click)="schedule.refresh()">Check again</button></div> }
      @if (schedule.post(); as post) {
        @if (schedule.access() === 'early') {
          <article data-testid="early-reader-article">
            <header class="schedule-reader-intro"><p class="site-meta">Member early access</p><h1 class="heading-display">{{ post.title }}</h1><p class="text-body">{{ post.excerpt }}</p><p class="schedule-note">By {{ post.author.name }} · Public release <time [attr.datetime]="post.publishedAt">{{ post.publishedAt | date:'MMMM d, y, h:mm a' }}</time></p></header>
            <app-blog-block-renderer [blocks]="post.blocks" [fallbackAlt]="post.title" [postId]="post.id" [postSlug]="post.slug" [previewMode]="true"></app-blog-block-renderer>
          </article>
        }
      }
    </section>
  `,
})
export class ScheduledReaderComponent {
  protected readonly schedule = inject(PublishingScheduleService);
  private readonly router = inject(Router);
  constructor() {
    inject(ActivatedRoute).paramMap.pipe(takeUntilDestroyed()).subscribe(params => this.schedule.loadPost(params.get('slug') ?? ''));
    effect(() => {
      const post = this.schedule.post();
      if (post && this.schedule.access() === 'public') void this.router.navigate(['/blog', post.slug], {replaceUrl: true});
    });
  }
}
