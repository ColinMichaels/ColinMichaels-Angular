import {DOCUMENT} from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  HostListener,
  ViewChild,
  effect,
  inject,
  signal,
} from '@angular/core';
import {takeUntilDestroyed, toSignal} from '@angular/core/rxjs-interop';
import {Router, RouterLink} from '@angular/router';
import {of, switchMap} from 'rxjs';

import {PATH_NAMES} from '../../../../app-route-paths';
import {AuthService} from '../../../../services/auth.service';
import {PwaPushService} from '../../../../shared/pwa/pwa-push.service';
import {UserAccountService} from '../../../../shared/user-account/user-account.service';
import {
  BlogMembershipCampaignStateService,
  PendingBlogMembershipPreferences,
} from '../../services/blog-membership-campaign-state.service';

type CampaignStage = 'offer' | 'browser-followup' | 'success';

@Component({
  selector: 'app-blog-membership-campaign',
  imports: [RouterLink],
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (isOpen()) {
      <div
        class="membership-campaign-backdrop"
        aria-hidden="true"
      ></div>

      <section
        #dialog
        class="membership-campaign-dialog"
        role="dialog"
        aria-modal="true"
        [attr.aria-labelledby]="stage() === 'offer' ? 'membership-campaign-title' : 'membership-followup-title'"
        [attr.aria-describedby]="stage() === 'offer' ? 'membership-campaign-description' : 'membership-followup-description'"
        tabindex="-1"
        data-testid="blog-membership-campaign"
      >
        <button
          type="button"
          class="membership-close"
          aria-label="Close account benefits"
          (click)="closeCampaign(7)"
        >
          <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor"
               stroke-width="1.8" stroke-linecap="round">
            <path d="m6 6 12 12M18 6 6 18"></path>
          </svg>
        </button>

        @if (stage() === 'offer') {
          <div class="membership-art">
            <img
              src="assets/images/campaigns/reader-membership-master.webp"
              alt="A glowing reader pass with comment, points, and notification symbols"
              width="1024"
              height="1536"
            >
            <div class="membership-art-caption" aria-hidden="true">
              <span>Read.</span>
              <span>Connect.</span>
              <span>Grow.</span>
            </div>
          </div>

          <div class="membership-content">
            <header>
              <h2 id="membership-campaign-title">Get more from every post.</h2>
              <p id="membership-campaign-description">
                Create a free reader account to join the conversation and keep up with new writing.
              </p>
            </header>

            <ul class="membership-benefits" aria-label="Reader account benefits">
              <li>
                <span class="membership-benefit-icon" aria-hidden="true">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7">
                    <path d="M5 5.5h14v10H9l-4 3v-13Z"></path>
                  </svg>
                </span>
                <span>Comment on posts</span>
              </li>
              <li>
                <span class="membership-benefit-icon" aria-hidden="true">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7">
                    <path d="m12 3 2.5 5.2 5.7.8-4.1 4 1 5.7-5.1-2.8-5.1 2.8 1-5.7-4.1-4 5.7-.8L12 3Z"></path>
                  </svg>
                </span>
                <span>Earn points for reading and sharing</span>
              </li>
              <li>
                <span class="membership-benefit-icon" aria-hidden="true">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7">
                    <path d="M18 8a6 6 0 0 0-12 0c0 6-2.5 6.5-2.5 8.5h17C20.5 14.5 18 14 18 8Z"></path>
                    <path d="M10 20h4"></path>
                  </svg>
                </span>
                <span>Choose how new-post updates reach you</span>
              </li>
            </ul>

            <fieldset class="membership-preferences">
              <legend>Start with your preferred updates</legend>

              <label>
                <input
                  type="checkbox"
                  [checked]="browserNotifications()"
                  (change)="browserNotifications.set(!browserNotifications())"
                >
                <span class="membership-checkbox" aria-hidden="true">
                  <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="m3.5 8 3 3 6-6"></path>
                  </svg>
                </span>
                <span>
                  <strong>Browser alerts</strong>
                  <small>The fastest way to hear about new posts.</small>
                </span>
              </label>

              <label>
                <input
                  type="checkbox"
                  [checked]="newPostEmails()"
                  (change)="newPostEmails.set(!newPostEmails())"
                >
                <span class="membership-checkbox" aria-hidden="true">
                  <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="m3.5 8 3 3 6-6"></path>
                  </svg>
                </span>
                <span>
                  <strong>New-post emails</strong>
                  <small>Join the list for new-post email delivery.</small>
                </span>
              </label>

              <label>
                <input
                  type="checkbox"
                  [checked]="newsletter()"
                  (change)="newsletter.set(!newsletter())"
                >
                <span class="membership-checkbox" aria-hidden="true">
                  <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="m3.5 8 3 3 6-6"></path>
                  </svg>
                </span>
                <span>
                  <strong>Occasional newsletter</strong>
                  <small>Periodic highlights and behind-the-scenes updates.</small>
                </span>
              </label>
            </fieldset>

            <p class="membership-consent-note">
              All choices are optional. Change them anytime in your
              <a [routerLink]="['/', pathNames.PROFILE]">profile</a>
              or review the <a [routerLink]="['/', pathNames.PRIVACY]">privacy policy</a>.
            </p>

            <div class="membership-actions">
              <button type="button" class="membership-primary-action" (click)="continueToAccount('register')">
                Create free account
              </button>
              <button type="button" class="membership-link-action" (click)="continueToAccount('login')">
                I already have an account
              </button>
              <button type="button" class="membership-muted-action" (click)="closeCampaign(30)">
                Not now
              </button>
            </div>
          </div>
        } @else {
          <div class="membership-followup">
            <div class="membership-followup-art" aria-hidden="true">
              <img
                src="assets/images/campaigns/reader-membership-master.webp"
                alt=""
                width="1024"
                height="1536"
              >
            </div>

            @if (stage() === 'browser-followup') {
              <div class="membership-followup-copy">
                <h2 id="membership-followup-title">You’re in. Turn on browser alerts?</h2>
                <p id="membership-followup-description">
                  Your email choices are saved. Allow browser notifications now for the quickest new-post alerts.
                </p>

                <div class="membership-actions">
                  <button
                    type="button"
                    class="membership-primary-action"
                    [disabled]="push.busy()"
                    (click)="enableBrowserAlerts()"
                  >
                    {{ push.busy() ? 'Requesting permission…' : 'Enable browser alerts' }}
                  </button>
                  <button type="button" class="membership-link-action" (click)="skipBrowserAlerts()">
                    Maybe later
                  </button>
                </div>

                @if (push.statusMessage()) {
                  <p class="membership-status" role="status" aria-live="polite">{{ push.statusMessage() }}</p>
                }
              </div>
            } @else {
              <div class="membership-followup-copy">
                <h2 id="membership-followup-title">Your reader account is ready.</h2>
                <p id="membership-followup-description">
                  {{ completionMessage() }}
                </p>
                <button type="button" class="membership-primary-action" (click)="finishCampaign()">
                  Continue reading
                </button>
              </div>
            }
          </div>
        }
      </section>
    }
  `,
  styles: `
    :host {
      --campaign-bg: #09090b;
      --campaign-panel: #18181b;
      --campaign-border: rgb(255 255 255 / 0.14);
      --campaign-cyan: #22d3ee;
      --campaign-teal: #2dd4bf;
      --campaign-heading: #fafafa;
      --campaign-text: #d4d4d8;
      --campaign-muted: #a1a1aa;
    }

    .membership-campaign-backdrop {
      animation: membership-fade-in 220ms ease-out both;
      backdrop-filter: blur(10px);
      background: rgb(0 0 0 / 0.76);
      inset: 0;
      position: fixed;
      z-index: 180;
    }

    .membership-campaign-dialog {
      animation: membership-enter 280ms cubic-bezier(0.16, 1, 0.3, 1) both;
      background: var(--campaign-panel);
      border: 1px solid var(--campaign-border);
      border-radius: 1.5rem;
      box-shadow: 0 2.5rem 7rem rgb(0 0 0 / 0.62);
      color: var(--campaign-text);
      display: grid;
      grid-template-columns: minmax(20rem, 0.94fr) minmax(26rem, 1.06fr);
      inset: 50% auto auto 50%;
      max-height: min(50rem, calc(100dvh - 2rem));
      max-width: calc(100vw - 2rem);
      min-height: 38rem;
      outline: none;
      overflow: hidden auto;
      position: fixed;
      translate: -50% -50%;
      width: min(70rem, calc(100vw - 2rem));
      z-index: 181;
    }

    .membership-close {
      align-items: center;
      background: rgb(9 9 11 / 0.72);
      border: 1px solid rgb(255 255 255 / 0.12);
      border-radius: 9999px;
      color: var(--campaign-text);
      display: inline-flex;
      height: 2.5rem;
      justify-content: center;
      position: absolute;
      right: 1rem;
      top: 1rem;
      transition: background-color 150ms ease, border-color 150ms ease, color 150ms ease;
      width: 2.5rem;
      z-index: 4;
    }

    .membership-close svg {
      height: 1.25rem;
      width: 1.25rem;
    }

    .membership-close:hover {
      background: rgb(39 39 42);
      border-color: rgb(34 211 238 / 0.6);
      color: var(--campaign-cyan);
    }

    .membership-close:focus-visible,
    .membership-primary-action:focus-visible,
    .membership-link-action:focus-visible,
    .membership-muted-action:focus-visible,
    .membership-preferences label:has(input:focus-visible) {
      outline: 2px solid var(--campaign-cyan);
      outline-offset: 3px;
    }

    .membership-art {
      background:
        linear-gradient(180deg, rgb(9 9 11 / 0.06), rgb(9 9 11 / 0.8)),
        radial-gradient(circle at 50% 48%, rgb(34 211 238 / 0.16), transparent 48%),
        #09090b;
      min-height: 100%;
      overflow: hidden;
      position: relative;
    }

    .membership-art::before {
      background-image:
        linear-gradient(rgb(255 255 255 / 0.035) 1px, transparent 1px),
        linear-gradient(90deg, rgb(255 255 255 / 0.035) 1px, transparent 1px);
      background-size: 2rem 2rem;
      content: '';
      inset: 0;
      mask-image: linear-gradient(to bottom, transparent, black 24%, black 75%, transparent);
      position: absolute;
    }

    .membership-art img {
      height: 100%;
      inset: 0;
      object-fit: cover;
      object-position: center;
      position: absolute;
      width: 100%;
    }

    .membership-art-caption {
      bottom: 1.5rem;
      color: rgb(165 243 252);
      display: flex;
      font-family: var(--font-accent);
      font-size: 0.72rem;
      font-weight: 700;
      gap: 1rem;
      justify-content: center;
      letter-spacing: 0.17em;
      position: absolute;
      text-transform: uppercase;
      width: 100%;
      z-index: 2;
    }

    .membership-content {
      align-content: center;
      display: grid;
      gap: 1.25rem;
      padding: 3.5rem clamp(2rem, 4vw, 3.75rem) 2.5rem;
    }

    .membership-content h2,
    .membership-followup h2 {
      color: var(--campaign-heading);
      font-family: var(--font-heading);
      font-size: clamp(2rem, 3.6vw, 3rem);
      font-weight: 650;
      letter-spacing: -0.035em;
      line-height: 1.08;
      margin: 0;
      text-wrap: balance;
    }

    .membership-content header p,
    .membership-followup-copy > p {
      color: var(--campaign-muted);
      font-size: 1.05rem;
      line-height: 1.65;
      margin: 0.85rem 0 0;
      max-width: 38rem;
    }

    .membership-benefits {
      display: grid;
      list-style: none;
      margin: 0;
      padding: 0;
    }

    .membership-benefits li {
      align-items: center;
      border-bottom: 1px solid rgb(255 255 255 / 0.09);
      display: flex;
      font-size: 0.97rem;
      font-weight: 600;
      gap: 0.8rem;
      min-height: 3.1rem;
    }

    .membership-benefit-icon {
      align-items: center;
      border: 1px solid rgb(34 211 238 / 0.62);
      border-radius: 9999px;
      color: var(--campaign-cyan);
      display: inline-flex;
      flex: 0 0 auto;
      height: 2rem;
      justify-content: center;
      width: 2rem;
    }

    .membership-benefit-icon svg {
      height: 1rem;
      width: 1rem;
    }

    .membership-preferences {
      border: 0;
      display: grid;
      gap: 0.55rem;
      margin: 0;
      padding: 0;
    }

    .membership-preferences legend {
      color: var(--campaign-muted);
      font-size: 0.75rem;
      font-weight: 700;
      letter-spacing: 0.12em;
      margin-bottom: 0.25rem;
      text-transform: uppercase;
    }

    .membership-preferences label {
      align-items: center;
      border: 1px solid rgb(255 255 255 / 0.09);
      border-radius: 0.8rem;
      cursor: pointer;
      display: grid;
      gap: 0.8rem;
      grid-template-columns: auto 1fr;
      min-height: 3.5rem;
      padding: 0.65rem 0.8rem;
      transition: border-color 150ms ease, background-color 150ms ease;
    }

    .membership-preferences label:hover {
      background: rgb(255 255 255 / 0.025);
      border-color: rgb(34 211 238 / 0.3);
    }

    .membership-preferences input {
      height: 1px;
      opacity: 0;
      position: absolute;
      width: 1px;
    }

    .membership-checkbox {
      align-items: center;
      background: rgb(9 9 11);
      border: 1px solid rgb(113 113 122);
      border-radius: 0.42rem;
      color: #09090b;
      display: inline-flex;
      height: 1.35rem;
      justify-content: center;
      transition: background-color 150ms ease, border-color 150ms ease;
      width: 1.35rem;
    }

    .membership-checkbox svg {
      height: 0.9rem;
      opacity: 0;
      width: 0.9rem;
    }

    .membership-preferences input:checked + .membership-checkbox {
      background: var(--campaign-cyan);
      border-color: var(--campaign-cyan);
    }

    .membership-preferences input:checked + .membership-checkbox svg {
      opacity: 1;
    }

    .membership-preferences strong,
    .membership-preferences small {
      display: block;
    }

    .membership-preferences strong {
      color: var(--campaign-heading);
      font-size: 0.9rem;
      line-height: 1.25;
    }

    .membership-preferences small {
      color: var(--campaign-muted);
      font-size: 0.76rem;
      line-height: 1.35;
      margin-top: 0.15rem;
    }

    .membership-consent-note {
      color: #71717a;
      font-size: 0.73rem;
      line-height: 1.45;
      margin: 0;
    }

    .membership-consent-note a {
      color: #a5f3fc;
      text-decoration: underline;
      text-decoration-color: rgb(34 211 238 / 0.45);
      text-underline-offset: 0.18em;
    }

    .membership-actions {
      display: grid;
      gap: 0.5rem;
    }

    .membership-primary-action {
      align-items: center;
      background: var(--campaign-cyan);
      border: 1px solid var(--campaign-cyan);
      border-radius: 0.72rem;
      color: #083344;
      display: inline-flex;
      font-family: var(--font-accent);
      font-size: 0.94rem;
      font-weight: 750;
      justify-content: center;
      min-height: 3.15rem;
      padding: 0.7rem 1rem;
      transition: background-color 150ms ease, border-color 150ms ease, translate 150ms ease;
      width: 100%;
    }

    .membership-primary-action:hover {
      background: #67e8f9;
      border-color: #67e8f9;
      translate: 0 -1px;
    }

    .membership-primary-action:disabled {
      cursor: wait;
      opacity: 0.7;
    }

    .membership-link-action,
    .membership-muted-action {
      background: transparent;
      border: 0;
      font-family: var(--font-accent);
      font-size: 0.82rem;
      min-height: 2rem;
    }

    .membership-link-action {
      color: #a5f3fc;
      font-weight: 650;
    }

    .membership-muted-action {
      color: #71717a;
    }

    .membership-link-action:hover,
    .membership-muted-action:hover {
      color: var(--campaign-heading);
    }

    .membership-followup {
      align-items: center;
      display: grid;
      gap: clamp(1.5rem, 4vw, 3rem);
      grid-column: 1 / -1;
      grid-template-columns: minmax(15rem, 0.75fr) minmax(20rem, 1fr);
      min-height: 38rem;
      padding: clamp(2rem, 5vw, 4.5rem);
    }

    .membership-followup-art {
      align-self: stretch;
      background: #09090b;
      border: 1px solid rgb(255 255 255 / 0.1);
      border-radius: 1.1rem;
      min-height: 25rem;
      overflow: hidden;
      position: relative;
    }

    .membership-followup-art img {
      height: 100%;
      object-fit: cover;
      position: absolute;
      width: 100%;
    }

    .membership-followup-copy {
      display: grid;
      gap: 1.5rem;
    }

    .membership-status {
      color: var(--campaign-muted);
      font-size: 0.82rem;
      line-height: 1.5;
      margin: 0;
    }

    @keyframes membership-fade-in {
      from { opacity: 0; }
      to { opacity: 1; }
    }

    @keyframes membership-enter {
      from {
        opacity: 0;
        scale: 0.975;
      }
      to {
        opacity: 1;
        scale: 1;
      }
    }

    @media (max-width: 820px) {
      .membership-campaign-dialog {
        display: block;
        max-height: calc(100dvh - 1rem);
        max-width: calc(100vw - 1rem);
        min-height: 0;
        width: calc(100vw - 1rem);
      }

      .membership-art {
        height: 14rem;
        min-height: 0;
      }

      .membership-art img {
        object-position: center 42%;
      }

      .membership-art-caption {
        bottom: 0.75rem;
      }

      .membership-content {
        gap: 1rem;
        padding: 2rem 1.25rem 1.5rem;
      }

      .membership-content h2,
      .membership-followup h2 {
        font-size: clamp(1.8rem, 8vw, 2.4rem);
      }

      .membership-content header p,
      .membership-followup-copy > p {
        font-size: 0.95rem;
      }

      .membership-followup {
        display: block;
        min-height: 0;
        padding: 4rem 1.25rem 1.5rem;
      }

      .membership-followup-art {
        height: 12rem;
        min-height: 0;
      }

      .membership-followup-art img {
        object-position: center 44%;
      }

      .membership-followup-copy {
        margin-top: 1.5rem;
      }
    }

    @media (max-height: 760px) and (min-width: 821px) {
      .membership-campaign-dialog {
        grid-template-columns: minmax(18rem, 0.8fr) minmax(28rem, 1.2fr);
        min-height: 0;
      }

      .membership-content {
        gap: 0.8rem;
        padding-block: 2rem 1.5rem;
      }

      .membership-content h2 {
        font-size: 2.2rem;
      }

      .membership-benefits li {
        min-height: 2.65rem;
      }

      .membership-preferences label {
        min-height: 3rem;
        padding-block: 0.45rem;
      }
    }

    @media (prefers-reduced-motion: reduce) {
      .membership-campaign-backdrop,
      .membership-campaign-dialog {
        animation: none;
      }

      .membership-close,
      .membership-primary-action,
      .membership-preferences label,
      .membership-checkbox {
        transition: none;
      }
    }
  `,
})
export class BlogMembershipCampaignComponent {
  @ViewChild('dialog') private dialog?: ElementRef<HTMLElement>;

  private readonly auth = inject(AuthService);
  private readonly campaignState = inject(BlogMembershipCampaignStateService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly document = inject(DOCUMENT);
  private readonly router = inject(Router);
  private readonly userAccounts = inject(UserAccountService);
  protected readonly push = inject(PwaPushService);

  protected readonly pathNames = PATH_NAMES;
  protected readonly browserNotifications = signal(true);
  protected readonly newPostEmails = signal(false);
  protected readonly newsletter = signal(false);
  protected readonly stage = signal<CampaignStage>('offer');
  protected readonly isOpen = signal(false);
  protected readonly completionMessage = signal(
    'Your choices are saved. You can update them anytime from your profile.'
  );
  private readonly pending = signal<PendingBlogMembershipPreferences | null>(
    this.campaignState.getPendingPreferences()
  );
  private readonly user = toSignal(this.auth.user$, {initialValue: null});
  private readonly account = toSignal(
    this.auth.user$.pipe(
      switchMap(user => user ? this.userAccounts.listenToUserAccount(user.uid) : of(null)),
      takeUntilDestroyed(this.destroyRef)
    ),
    {initialValue: null}
  );
  private completionUid: string | null = null;
  private promptTimer: ReturnType<typeof setTimeout> | undefined;
  private originalBodyOverflow = '';
  private promptScheduled = false;

  constructor() {
    effect(() => {
      const user = this.user();
      const account = this.account();
      const pending = this.pending();

      if (user && account && pending && this.completionUid !== user.uid) {
        void this.completeAccountPreferences(user.uid, pending);
        return;
      }

      if (!user && !pending && !this.promptScheduled && this.campaignState.shouldPromptAnonymousReader()) {
        this.promptScheduled = true;
        this.promptTimer = setTimeout(() => {
          this.stage.set('offer');
          this.openDialog();
        }, 3200);
      }
    });

    effect(() => {
      if (this.isOpen()) {
        this.originalBodyOverflow = this.document.body.style.overflow;
        this.document.body.style.overflow = 'hidden';
      } else {
        this.document.body.style.overflow = this.originalBodyOverflow;
      }
    });

    this.destroyRef.onDestroy(() => {
      if (this.promptTimer) {
        clearTimeout(this.promptTimer);
      }
      this.document.body.style.overflow = this.originalBodyOverflow;
    });
  }

  @HostListener('document:keydown.escape')
  protected onEscape(): void {
    if (this.isOpen()) {
      this.closeCampaign(this.stage() === 'offer' ? 7 : 365);
    }
  }

  protected closeCampaign(days: number): void {
    if (this.stage() !== 'offer') {
      this.campaignState.clearPendingPreferences();
      this.pending.set(null);
      this.campaignState.markCompleted();
    } else {
      this.campaignState.snooze(days);
    }

    this.isOpen.set(false);
  }

  protected continueToAccount(mode: 'login' | 'register'): void {
    const pending = this.campaignState.rememberPendingPreferences({
      browserNotifications: this.browserNotifications(),
      newPostEmails: this.newPostEmails(),
      newsletter: this.newsletter(),
    });
    this.pending.set(pending);
    this.isOpen.set(false);

    const redirectUrl = this.router.url.startsWith('/') ? this.router.url : `/${PATH_NAMES.BLOG}`;
    void this.router.navigate(['/', PATH_NAMES.OS_LOGIN], {
      queryParams: {
        mode,
        redirectUrl,
        source: 'blog-membership',
      },
    });
  }

  protected async enableBrowserAlerts(): Promise<void> {
    const enabled = await this.push.enableNotifications();

    if (!enabled) {
      return;
    }

    this.campaignState.clearPendingPreferences();
    this.campaignState.markCompleted();
    this.pending.set(null);
    this.completionMessage.set('Browser alerts and your email choices are set. Welcome to the conversation.');
    this.stage.set('success');
    this.focusDialog();
  }

  protected skipBrowserAlerts(): void {
    this.campaignState.clearPendingPreferences();
    this.campaignState.markCompleted();
    this.pending.set(null);
    this.completionMessage.set('Your email choices are saved. Browser alerts remain off on this device.');
    this.stage.set('success');
    this.focusDialog();
  }

  protected finishCampaign(): void {
    this.campaignState.clearPendingPreferences();
    this.campaignState.markCompleted();
    this.pending.set(null);
    this.isOpen.set(false);
  }

  private async completeAccountPreferences(
    uid: string,
    pending: PendingBlogMembershipPreferences
  ): Promise<void> {
    this.completionUid = uid;

    try {
      await this.userAccounts.updateCommunicationPreferences(uid, {
        newPostEmails: pending.newPostEmails,
        newsletter: pending.newsletter,
      }, 'signup-campaign');

      if (pending.browserNotifications && this.push.available()) {
        this.stage.set('browser-followup');
        this.openDialog();
        return;
      }

      this.campaignState.clearPendingPreferences();
      this.campaignState.markCompleted();
      this.pending.set(null);
      this.completionMessage.set(
        pending.browserNotifications
          ? 'Your email choices are saved. Browser alerts are unavailable here, but you can try again from your profile.'
          : 'Your email choices are saved. Browser alerts remain off on this device.'
      );
      this.stage.set('success');
      this.openDialog();
    } catch {
      this.completionUid = null;
      this.completionMessage.set(
        'Your account is ready, but notification preferences could not be saved. You can retry from your profile.'
      );
      this.stage.set('success');
      this.openDialog();
    }
  }

  private openDialog(): void {
    this.isOpen.set(true);
    this.focusDialog();
  }

  private focusDialog(): void {
    setTimeout(() => this.dialog?.nativeElement.focus(), 0);
  }
}
