import {ChangeDetectionStrategy, Component, inject} from '@angular/core';
import {toSignal} from '@angular/core/rxjs-interop';
import {RouterLink} from '@angular/router';

import {PATH_NAMES} from '../../app-route-paths';
import {SocialsComponent} from '../../components/main/socials/socials.component';
import {AuthService} from '../../services/auth.service';
import {BlogShareActionsComponent} from '../../features/blog/components/share-actions/blog-share-actions.component';
import {BlogEngagementService, BlogShareEvent} from '../../features/blog/services/blog-engagement.service';
import {SiteAnalyticsService} from '../analytics/site-analytics.service';
import {CelebrationService} from '../celebration/celebration.service';
import {HOMEPAGE_DESCRIPTION, HOMEPAGE_TITLE, SITE_URL} from '../seo/seo.metadata';

@Component({
  selector: 'app-site-footer',
  imports: [
    RouterLink,
    BlogShareActionsComponent,
    SocialsComponent,
  ],
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <footer class="pointer-events-auto pb-20 sm:pb-24" aria-labelledby="site-footer-title">
      <section id="site-footer" class="site-section">
        <div class="site-section-rule grid gap-8 lg:grid-cols-[minmax(0,1.1fr)_minmax(24rem,0.9fr)]">
          <div class="max-w-xl">
            <h2 id="site-footer-title" class="heading-card">ColinMichaels.com</h2>
            <p class="mt-3 text-body">
              Ideas, tools, and discoveries worth passing on.
            </p>
            <p class="mt-4 text-sm text-zinc-500 dark:text-zinc-500">
              &copy; {{ currentYear }} Colin Michaels. All rights reserved.
            </p>
          </div>

          <nav class="grid gap-6 sm:grid-cols-2" aria-label="Footer navigation">
            <div>
              <h3 class="site-meta">Explore</h3>
              <div class="mt-3 grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
                <a routerLink="/" class="site-inline-link">Home</a>
                <a [routerLink]="['/', pathNames.BLOG]" class="site-inline-link">Blog</a>
                <a [routerLink]="['/', pathNames.AUTHORS]" class="site-inline-link">Authors</a>
                <a [routerLink]="['/', pathNames.WRITE_FOR_US]" class="site-inline-link">Write for Us</a>
                <a routerLink="/" fragment="topic-guides" class="site-inline-link">Topics</a>
                <a routerLink="/" fragment="about" class="site-inline-link">About</a>
                <a [routerLink]="['/', pathNames.OS_MAIN]" class="site-inline-link">Open OS</a>
              </div>
            </div>

            <div>
              <h3 class="site-meta">Information</h3>
              <div class="mt-3 grid gap-2 text-sm">
                <a [routerLink]="['/', pathNames.EDITORIAL_STANDARDS]" class="site-inline-link">Editorial Standards</a>
                <a [routerLink]="['/', pathNames.PRIVACY]" class="site-inline-link">Privacy Policy</a>
                <a [routerLink]="['/', pathNames.CONTACT]" class="site-inline-link">Contact</a>
              </div>
            </div>
          </nav>
        </div>

        <div class="mt-8 flex flex-col gap-4 border-t border-slate-200 pt-6 dark:border-white/10 sm:flex-row sm:items-center sm:justify-between">
          <app-blog-share-actions
            [title]="siteTitle"
            [excerpt]="siteDescription"
            [path]="''"
            [url]="siteUrl"
            [trackingEnabled]="isSignedIn()"
            label="Share site"
            groupLabel="Share ColinMichaels.com"
            linkLabel="site"
            variant="panel"
            (shared)="recordSiteShare($event)"
          ></app-blog-share-actions>

          <a
            class="btn-ghost w-fit"
            href="https://signal-desk-feedback.captaincolin.chatgpt.site/"
            rel="noreferrer"
            target="_blank"
          >
            Report a Bug
          </a>
        </div>
      </section>

      @defer (on viewport) {
        <app-socials></app-socials>
      } @placeholder {
        <div class="h-16" aria-hidden="true"></div>
      }
    </footer>
  `,
})
export class SiteFooterComponent {
  private readonly authService = inject(AuthService);
  private readonly engagement = inject(BlogEngagementService);
  private readonly celebration = inject(CelebrationService);
  private readonly analytics = inject(SiteAnalyticsService);

  protected readonly isSignedIn = toSignal(this.authService.isAuthenticated(), {initialValue: false});
  protected readonly pathNames = PATH_NAMES;
  protected readonly currentYear = new Date().getFullYear();
  protected readonly siteDescription = HOMEPAGE_DESCRIPTION;
  protected readonly siteTitle = HOMEPAGE_TITLE;
  protected readonly siteUrl = SITE_URL;

  protected recordSiteShare(event: BlogShareEvent): void {
    this.analytics.trackShare(null, event.provider, 'site_footer', this.isSignedIn());
    void this.engagement.recordSiteShare({
      provider: event.provider,
      ...(event.shareId ? {shareId: event.shareId} : {}),
    }).then(result => {
      this.celebration.celebrateConfirmedPointAward(result);
    }).catch(() => {
      // Sharing must remain available to anonymous readers and during transient Function failures.
    });
  }
}
