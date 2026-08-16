import {ChangeDetectionStrategy, Component, computed, effect, inject, input, signal} from '@angular/core';
import {toSignal} from '@angular/core/rxjs-interop';
import {RouterLink} from '@angular/router';

import {PATH_NAMES} from '../../../../app-route-paths';
import {AuthService, INITIAL_AUTH_STATE} from '../../../../services/auth.service';
import {SiteAnalyticsService} from '../../../../shared/analytics/site-analytics.service';
import {BlogMembershipCampaignStateService} from '../../services/blog-membership-campaign-state.service';

@Component({
  selector: 'app-reader-membership-invite',
  imports: [RouterLink],
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (visible()) {
      <aside class="reader-invite" aria-labelledby="reader-invite-title" data-testid="reader-membership-invite">
        <div>
          <p class="reader-invite-eyebrow">Keep the conversation going</p>
          <h2 id="reader-invite-title">Reading stays free. An account adds the extras.</h2>
          <p>
            Create a free reader account to comment, save your place, and choose whether you want new-post updates.
            You can keep reading without one.
          </p>
        </div>

        <ul aria-label="Free reader account benefits">
          <li>Comment on posts</li>
          <li>Save reading progress</li>
          <li>Control optional updates</li>
        </ul>

        <div class="reader-invite-actions">
          <a
            class="reader-invite-primary"
            [routerLink]="['/', pathNames.OS_LOGIN]"
            [queryParams]="accountQueryParams('register')"
            (click)="trackAccountAction('register')"
          >Create free account</a>
          <a
            class="reader-invite-secondary"
            [routerLink]="['/', pathNames.OS_LOGIN]"
            [queryParams]="accountQueryParams('login')"
            (click)="trackAccountAction('login')"
          >I already have an account</a>
          <button type="button" (click)="dismiss()">Not now</button>
        </div>
      </aside>
    }
  `,
  styles: [`
    :host {
      display: block;
      margin-top: 3rem;
    }

    .reader-invite {
      display: grid;
      gap: 1.25rem;
      border: 1px solid color-mix(in srgb, var(--site-accent) 38%, var(--site-border));
      border-radius: 0.75rem;
      padding: clamp(1.25rem, 4vw, 2rem);
      background:
        linear-gradient(135deg, color-mix(in srgb, var(--site-accent) 10%, transparent), transparent 55%),
        var(--site-panel);
      color: var(--site-text);
    }

    .reader-invite-eyebrow {
      margin: 0 0 0.5rem;
      color: var(--site-accent-strong);
      font-size: 0.75rem;
      font-weight: 700;
      letter-spacing: 0.08em;
      text-transform: uppercase;
    }

    h2 {
      margin: 0;
      font-size: clamp(1.25rem, 3vw, 1.65rem);
      line-height: 1.2;
    }

    p:not(.reader-invite-eyebrow) {
      max-width: 48rem;
      margin: 0.75rem 0 0;
      color: var(--site-text-muted);
      line-height: 1.65;
    }

    ul {
      display: flex;
      flex-wrap: wrap;
      gap: 0.6rem 1.25rem;
      margin: 0;
      padding: 0;
      color: var(--site-text-muted);
      font-size: 0.875rem;
      list-style: none;
    }

    li::before {
      content: '✓';
      margin-right: 0.4rem;
      color: var(--site-accent-strong);
    }

    .reader-invite-actions {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 0.75rem;
    }

    a,
    button {
      min-height: 2.75rem;
      border-radius: 0.45rem;
      padding: 0.7rem 0.9rem;
      font: inherit;
      font-weight: 700;
      line-height: 1.25rem;
      text-decoration: none;
      cursor: pointer;
    }

    .reader-invite-primary {
      border: 1px solid var(--site-accent);
      background: var(--site-accent);
      color: #061014;
    }

    .reader-invite-secondary {
      border: 1px solid var(--site-border-strong);
      color: var(--site-text);
    }

    button {
      border: 0;
      background: transparent;
      color: var(--site-text-muted);
    }

    a:hover,
    a:focus-visible,
    button:hover,
    button:focus-visible {
      outline: 2px solid var(--site-accent-strong);
      outline-offset: 2px;
    }

    @media (max-width: 520px) {
      .reader-invite-actions {
        display: grid;
      }

      a,
      button {
        width: 100%;
        text-align: center;
      }
    }
  `],
})
export class ReaderMembershipInviteComponent {
  readonly postSlug = input.required<string>();

  private readonly auth = inject(AuthService);
  private readonly analytics = inject(SiteAnalyticsService);
  private readonly campaignState = inject(BlogMembershipCampaignStateService);
  private readonly authState = toSignal(this.auth.authState$, {initialValue: INITIAL_AUTH_STATE});
  private readonly dismissed = signal(false);
  private impressionTracked = false;

  protected readonly pathNames = PATH_NAMES;
  protected readonly visible = computed(() => (
    !this.dismissed()
      && this.authState().status === 'unauthenticated'
      && this.campaignState.shouldPromptAnonymousReader()
  ));

  constructor() {
    effect(() => {
      const postSlug = this.postSlug().trim();

      if (!this.visible() || !postSlug || this.impressionTracked) {
        return;
      }

      this.impressionTracked = true;
      this.analytics.trackReaderMembershipInvite(postSlug, 'view');
    });
  }

  protected accountQueryParams(mode: 'login' | 'register'): Record<string, string> {
    return {
      mode,
      redirectUrl: `/${PATH_NAMES.BLOG}/${this.postSlug()}`,
      source: 'blog-membership',
    };
  }

  protected trackAccountAction(mode: 'login' | 'register'): void {
    this.analytics.trackReaderMembershipInvite(this.postSlug(), mode);
  }

  protected dismiss(): void {
    this.analytics.trackReaderMembershipInvite(this.postSlug(), 'dismiss');
    this.campaignState.snooze(30);
    this.dismissed.set(true);
  }
}
