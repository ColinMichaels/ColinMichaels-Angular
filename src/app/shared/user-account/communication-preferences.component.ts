import {ChangeDetectionStrategy, Component, computed, inject, input, signal} from '@angular/core';

import {PwaPushService} from '../pwa/pwa-push.service';
import {UserCommunicationPreferences} from './user-account.model';
import {UserAccountService} from './user-account.service';

interface EmailPreferenceSelection {
  newPostEmails: boolean;
  newsletter: boolean;
}

@Component({
  selector: 'app-communication-preferences',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="space-y-5" aria-labelledby="communication-preferences-title">
      <header class="space-y-2">
        <p class="text-sm font-semibold uppercase tracking-[0.18em] text-cyan-300">Notifications & email</p>
        <h2 id="communication-preferences-title" class="text-xl font-semibold text-zinc-50">
          Choose how to hear about new posts
        </h2>
        <p class="text-sm leading-6 text-zinc-400">
          Browser alerts are managed per device. Email and newsletter choices are saved to your account.
        </p>
      </header>

      <div class="divide-y divide-zinc-800 border-y border-zinc-800">
        <div class="flex items-center justify-between gap-4 py-4">
          <div>
            <p class="font-medium text-zinc-100">Browser notifications</p>
            <p class="mt-1 text-sm leading-5 text-zinc-400">The fastest way to hear when a new post is live.</p>
          </div>
          <button
            type="button"
            role="switch"
            class="preference-switch"
            [class.preference-switch-active]="push.subscribed()"
            [attr.aria-checked]="push.subscribed()"
            [attr.aria-label]="push.subscribed() ? 'Disable browser notifications' : 'Enable browser notifications'"
            [disabled]="disabled() || push.busy() || !push.available()"
            (click)="toggleBrowserNotifications()"
          >
            <span aria-hidden="true"></span>
          </button>
        </div>

        <div class="flex items-center justify-between gap-4 py-4">
          <div>
            <p class="font-medium text-zinc-100">New-post emails</p>
            <p class="mt-1 text-sm leading-5 text-zinc-400">Join the list for new-post email delivery.</p>
          </div>
          <button
            type="button"
            role="switch"
            class="preference-switch"
            [class.preference-switch-active]="newPostEmails()"
            [attr.aria-checked]="newPostEmails()"
            aria-label="Toggle new-post emails"
            [disabled]="disabled() || emailBusy() || !uid()"
            (click)="updateEmailPreferences(!newPostEmails(), newsletter())"
          >
            <span aria-hidden="true"></span>
          </button>
        </div>

        <div class="flex items-center justify-between gap-4 py-4">
          <div>
            <p class="font-medium text-zinc-100">Occasional newsletter</p>
            <p class="mt-1 text-sm leading-5 text-zinc-400">Get periodic highlights and behind-the-scenes updates.</p>
          </div>
          <button
            type="button"
            role="switch"
            class="preference-switch"
            [class.preference-switch-active]="newsletter()"
            [attr.aria-checked]="newsletter()"
            aria-label="Toggle occasional newsletter"
            [disabled]="disabled() || emailBusy() || !uid()"
            (click)="updateEmailPreferences(newPostEmails(), !newsletter())"
          >
            <span aria-hidden="true"></span>
          </button>
        </div>
      </div>

      @if (!push.available()) {
        <p class="text-xs leading-5 text-zinc-500">
          Browser alerts are unavailable in this browser or app build.
        </p>
      } @else if (push.statusMessage()) {
        <p class="text-xs leading-5 text-zinc-400" role="status" aria-live="polite">
          {{ push.statusMessage() }}
        </p>
      }

      @if (statusMessage()) {
        <p class="text-xs leading-5 text-zinc-400" role="status" aria-live="polite">
          {{ statusMessage() }}
        </p>
      }
    </section>
  `,
  styles: `
    .preference-switch {
      align-items: center;
      background: rgb(63 63 70);
      border: 1px solid rgb(82 82 91);
      border-radius: 9999px;
      display: inline-flex;
      flex: 0 0 auto;
      height: 1.75rem;
      padding: 0.1875rem;
      transition: background-color 150ms ease, border-color 150ms ease;
      width: 3rem;
    }

    .preference-switch span {
      background: rgb(244 244 245);
      border-radius: 9999px;
      display: block;
      height: 1.25rem;
      translate: 0 0;
      transition: translate 150ms ease;
      width: 1.25rem;
    }

    .preference-switch-active {
      background: rgb(8 145 178);
      border-color: rgb(34 211 238);
    }

    .preference-switch-active span {
      translate: 1.125rem 0;
    }

    .preference-switch:focus-visible {
      outline: 2px solid rgb(34 211 238);
      outline-offset: 3px;
    }

    .preference-switch:disabled {
      cursor: not-allowed;
      opacity: 0.45;
    }

    @media (prefers-reduced-motion: reduce) {
      .preference-switch,
      .preference-switch span {
        transition: none;
      }
    }
  `,
})
export class CommunicationPreferencesComponent {
  readonly uid = input<string | null>(null);
  readonly preferences = input<UserCommunicationPreferences | null>(null);
  readonly disabled = input(false);

  protected readonly push = inject(PwaPushService);
  private readonly userAccounts = inject(UserAccountService);
  private readonly emailBusyState = signal(false);
  private readonly emailOverride = signal<EmailPreferenceSelection | null>(null);
  protected readonly statusMessage = signal<string | null>(null);
  protected readonly emailBusy = this.emailBusyState.asReadonly();
  protected readonly newPostEmails = computed(() => (
    this.emailOverride()?.newPostEmails
    ?? this.preferences()?.newPostEmails
    ?? false
  ));
  protected readonly newsletter = computed(() => (
    this.emailOverride()?.newsletter
    ?? this.preferences()?.newsletter
    ?? false
  ));

  protected toggleBrowserNotifications(): void {
    if (this.disabled()) {
      return;
    }

    void this.push.toggleSubscription();
  }

  protected async updateEmailPreferences(newPostEmails: boolean, newsletter: boolean): Promise<void> {
    const uid = this.uid();

    if (!uid || this.disabled() || this.emailBusyState()) {
      return;
    }

    const next = {newPostEmails, newsletter};
    this.emailOverride.set(next);
    this.emailBusyState.set(true);
    this.statusMessage.set(null);

    try {
      await this.userAccounts.updateCommunicationPreferences(uid, next, 'profile');
      this.statusMessage.set('Email preferences saved.');
    } catch (error) {
      this.emailOverride.set(null);
      this.statusMessage.set(error instanceof Error ? error.message : 'Email preferences could not be saved.');
    } finally {
      this.emailBusyState.set(false);
    }
  }
}
