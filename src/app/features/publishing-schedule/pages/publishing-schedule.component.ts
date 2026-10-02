import {DatePipe} from '@angular/common';
import {ChangeDetectionStrategy, Component, inject} from '@angular/core';
import {RouterLink} from '@angular/router';
import {isBlogMediaUrl} from '../../blog/utils/blog-url-policy.util';
import {UpcomingHolidayScheduleComponent} from '../../seasonal/components/upcoming-holiday-schedule.component';
import {publishingScheduleReadPath} from '../publishing-schedule.models';
import {PublishingScheduleService} from '../publishing-schedule.service';

@Component({
  selector: 'app-publishing-schedule',
  imports: [RouterLink, DatePipe, UpcomingHolidayScheduleComponent],
  providers: [PublishingScheduleService],
  changeDetection: ChangeDetectionStrategy.OnPush,
  styleUrl: './publishing-schedule.scss',
  template: `
    <section class="site-section publishing-schedule" aria-labelledby="publishing-schedule-title">
      <header class="schedule-intro">
        <p class="site-meta">On the horizon</p>
        <h1 id="publishing-schedule-title" class="heading-display">Posting schedule</h1>
        <p class="text-body">Ideas taking shape. Stories worth waiting for.</p>
        <p class="schedule-note">Announced articles appear here. Read them when they publish, or earlier when your membership includes early access.</p>
      </header>
      <section aria-labelledby="announced-posts-title" class="schedule-posts">
        <header class="schedule-section-heading"><h2 id="announced-posts-title" class="heading-section">Coming to the blog</h2><a routerLink="/blog" class="site-inline-link">Browse the blog <span aria-hidden="true">→</span></a></header>
        @if (schedule.loading()) { <p role="status" class="text-body py-8">Checking the posting schedule…</p> }
        @if (schedule.error(); as error) {
          <div role="alert" class="schedule-message"><p>{{ error }}</p><button class="btn-ghost" type="button" (click)="schedule.refresh()">Try again</button></div>
        } @else if (!schedule.loading() && !schedule.entries().length) {
          <p class="text-body py-8">No announced posts yet. There is still plenty to explore in the blog.</p>
        }
        <div class="schedule-list">
          @for (entry of schedule.entries(); track entry.id) {
            <article class="schedule-row" [attr.data-testid]="'scheduled-post-' + entry.slug">
              <div class="schedule-art"><img [src]="art(entry.coverImage)" alt="" width="960" height="640" loading="lazy" decoding="async"></div>
              <div class="schedule-copy"><p class="site-meta">{{ entry.status === 'published' ? 'Published' : 'Coming soon' }} · <time [attr.datetime]="entry.publishedAt">{{ entry.publishedAt | date:'MMMM d, y, h:mm a' }}</time></p><h3>{{ entry.title }}</h3><p>{{ entry.excerpt }}</p></div>
              <div class="schedule-action">
                @if (readPath(entry); as path) { <a [routerLink]="path" class="site-inline-link">{{ entry.access === 'early' ? 'Member early access' : 'Read' }} <span aria-hidden="true">↗</span></a> }
                @else { <span class="schedule-soon">Soon</span> }
              </div>
            </article>
          }
        </div>
      </section>
      <app-upcoming-holiday-schedule></app-upcoming-holiday-schedule>
    </section>
  `,
})
export class PublishingScheduleComponent {
  protected readonly schedule = inject(PublishingScheduleService);
  protected readonly readPath = publishingScheduleReadPath;
  protected readonly art = (url: string) => isBlogMediaUrl(url) ? url : '/assets/images/backgrounds/night.webp';
  constructor() { this.schedule.loadSchedule(); }
}
