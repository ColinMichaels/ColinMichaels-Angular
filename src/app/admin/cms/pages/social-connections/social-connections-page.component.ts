import {ChangeDetectionStrategy, Component, inject, signal} from '@angular/core';
import {FaIconComponent} from '@fortawesome/angular-fontawesome';
import {faFacebookF, faInstagram, faThreads} from '@fortawesome/free-brands-svg-icons';
import {faArrowLeft, faArrowUpRightFromSquare, faLinkSlash, faRotate} from '@fortawesome/free-solid-svg-icons';
import {ActivatedRoute, RouterLink} from '@angular/router';

import {
  SOCIAL_CONNECTION_PROVIDERS,
  SocialConnection,
  SocialConnectionProvider,
} from '../../models/social-connection.model';
import {SocialConnectionsService} from '../../services/social-connections.service';
import {CmsToastContainerComponent} from '../../components/toast/cms-toast.component';
import {CmsToastService} from '../../services/cms-toast.service';

interface SocialProviderPresentation {
  description: string;
  icon: typeof faFacebookF;
  label: string;
  provider: SocialConnectionProvider;
  requirements: string;
}

const providerPresentations: readonly SocialProviderPresentation[] = [
  {
    provider: 'facebook',
    label: 'Facebook Page',
    description: 'Authorize a managed Page for future text, link, image, and video delivery.',
    requirements: 'Requires Page management access and pages_manage_posts.',
    icon: faFacebookF,
  },
  {
    provider: 'instagram',
    label: 'Instagram',
    description: 'Authorize a professional Business or Creator account for media publishing.',
    requirements: 'Uses Instagram Business Login with a separate Instagram app credential pair.',
    icon: faInstagram,
  },
  {
    provider: 'threads',
    label: 'Threads',
    description: 'Authorize a Threads profile for future text and media publishing.',
    requirements: 'Requires threads_basic and threads_content_publish.',
    icon: faThreads,
  },
];

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'Unknown error';
}

@Component({
  selector: 'app-social-connections-page',
  imports: [CmsToastContainerComponent, FaIconComponent, RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <main class="min-h-screen bg-zinc-950 px-5 py-8 text-zinc-100 sm:px-8 lg:px-12">
      <section class="mx-auto max-w-6xl space-y-6">
        <header class="border-b border-zinc-800 pb-6">
          <a routerLink="/admin/cms/calendar" class="inline-flex items-center gap-2 text-xs font-semibold text-zinc-500 hover:text-cyan-200">
            <fa-icon [icon]="faArrowLeft" aria-hidden="true"></fa-icon>
            Publishing Calendar
          </a>
          <div class="mt-4 flex flex-wrap items-end justify-between gap-4">
            <div>
              <p class="text-xs font-semibold uppercase tracking-[0.24em] text-cyan-300">Distribution</p>
              <h1 class="mt-2 text-3xl font-semibold text-zinc-50 sm:text-4xl">Social Connections</h1>
              <p class="mt-3 max-w-3xl text-sm leading-6 text-zinc-400 sm:text-base">
                Authorize publishing identities without exposing provider tokens to Angular or post documents.
              </p>
            </div>
            <button
              type="button"
              class="inline-flex h-10 items-center gap-2 border border-zinc-700 px-4 text-sm font-medium text-zinc-300 hover:border-zinc-500 hover:text-zinc-100 disabled:cursor-not-allowed disabled:text-zinc-600"
              [disabled]="loading()"
              (click)="refresh()"
            >
              <fa-icon [icon]="faRotate" aria-hidden="true"></fa-icon>
              Refresh status
            </button>
          </div>
        </header>

        <section class="border border-amber-500/40 bg-amber-500/10 p-4" aria-label="Delivery safety status">
          <p class="text-sm font-semibold text-amber-200">Connection-only phase</p>
          <p class="mt-1 text-sm leading-6 text-amber-100/70">
            Connecting an account does not activate external posting. Delivery workers remain disabled, and existing outbox records will not be sent.
          </p>
        </section>

        @if (callbackMessage()) {
          <section
            class="border p-4 text-sm"
            [class.border-emerald-500]="callbackSucceeded()"
            [class.bg-emerald-500/10]="callbackSucceeded()"
            [class.text-emerald-200]="callbackSucceeded()"
            [class.border-red-500]="!callbackSucceeded()"
            [class.bg-red-500/10]="!callbackSucceeded()"
            [class.text-red-200]="!callbackSucceeded()"
            aria-live="polite"
          >
            {{ callbackMessage() }}
          </section>
        }

        <section class="grid gap-4 lg:grid-cols-3" aria-label="Provider connections">
          @for (provider of providerPresentations; track provider.provider) {
            <article class="flex min-h-[27rem] flex-col border border-zinc-800 bg-zinc-900/50 p-5">
              <div class="flex items-start justify-between gap-4">
                <div class="grid h-11 w-11 place-items-center border border-zinc-700 bg-zinc-950 text-xl text-zinc-200">
                  <fa-icon [icon]="provider.icon" aria-hidden="true"></fa-icon>
                </div>
                <span [class]="statusClass(connectionFor(provider.provider)?.status)">
                  {{ statusLabel(connectionFor(provider.provider)?.status) }}
                </span>
              </div>

              <h2 class="mt-5 text-xl font-semibold text-zinc-50">{{ provider.label }}</h2>
              <p class="mt-2 text-sm leading-6 text-zinc-400">{{ provider.description }}</p>
              <p class="mt-2 text-xs leading-5 text-zinc-600">{{ provider.requirements }}</p>

              @if (connectionFor(provider.provider); as connection) {
                <dl class="mt-5 divide-y divide-zinc-800 border-y border-zinc-800 text-xs">
                  @if (connection.accountLabel) {
                    <div class="flex items-start justify-between gap-4 py-2.5">
                      <dt class="text-zinc-500">Account</dt>
                      <dd class="text-right font-medium text-zinc-200">{{ connection.accountLabel }}</dd>
                    </div>
                  }
                  @if (connection.lastValidatedAt) {
                    <div class="flex items-start justify-between gap-4 py-2.5">
                      <dt class="text-zinc-500">Validated</dt>
                      <dd class="text-right text-zinc-300">{{ dateLabel(connection.lastValidatedAt) }}</dd>
                    </div>
                  }
                  @if (connection.expiresAt) {
                    <div class="flex items-start justify-between gap-4 py-2.5">
                      <dt class="text-zinc-500">Token expiry</dt>
                      <dd class="text-right text-zinc-300">{{ dateLabel(connection.expiresAt) }}</dd>
                    </div>
                  }
                </dl>

                @if (connection.provider === 'facebook' && connection.status === 'needs-selection' && connection.availableAccounts?.length) {
                  <fieldset class="mt-5 space-y-2">
                    <legend class="text-xs font-semibold uppercase tracking-wide text-zinc-500">
                      Choose a Page
                    </legend>
                    @for (account of connection.availableAccounts; track account.id) {
                      <button
                        type="button"
                        class="w-full border border-zinc-700 bg-zinc-950 px-3 py-2 text-left hover:border-cyan-400 disabled:cursor-not-allowed disabled:text-zinc-600"
                        [disabled]="actionProvider() !== null"
                        (click)="selectAccount(connection.provider, account.id)"
                      >
                        <span class="block text-sm font-medium text-zinc-200">{{ account.label }}</span>
                        @if (account.note) {
                          <span class="mt-1 block text-[11px] text-zinc-500">{{ account.note }}</span>
                        }
                      </button>
                    }
                  </fieldset>
                }
              }

              <div class="mt-auto flex flex-wrap gap-2 pt-6">
                <button
                  type="button"
                  class="inline-flex h-10 flex-1 items-center justify-center gap-2 border border-cyan-400 px-3 text-sm font-semibold text-cyan-200 hover:bg-cyan-400 hover:text-zinc-950 disabled:cursor-not-allowed disabled:border-zinc-700 disabled:text-zinc-600 disabled:hover:bg-transparent"
                  [disabled]="actionProvider() !== null"
                  (click)="connect(provider.provider)"
                >
                  <fa-icon [icon]="faArrowUpRightFromSquare" aria-hidden="true"></fa-icon>
                  {{ connectionFor(provider.provider)?.status === 'connected' ? 'Reconnect' : 'Connect' }}
                </button>
                @if (connectionFor(provider.provider)?.status !== 'disconnected') {
                  <button
                    type="button"
                    class="grid h-10 w-10 place-items-center border border-zinc-700 text-zinc-500 hover:border-red-400 hover:text-red-300 disabled:cursor-not-allowed disabled:text-zinc-700"
                    [disabled]="actionProvider() !== null"
                    [attr.aria-label]="'Disconnect ' + provider.label"
                    (click)="disconnect(provider.provider, provider.label)"
                  >
                    <fa-icon [icon]="faLinkSlash" aria-hidden="true"></fa-icon>
                  </button>
                }
              </div>
            </article>
          }
        </section>
      </section>
    </main>
    <app-cms-toast-container></app-cms-toast-container>
  `,
})
export class SocialConnectionsPageComponent {
  private readonly connectionsService = inject(SocialConnectionsService);
  private readonly route = inject(ActivatedRoute);
  private readonly toast = inject(CmsToastService);

  protected readonly faArrowLeft = faArrowLeft;
  protected readonly faArrowUpRightFromSquare = faArrowUpRightFromSquare;
  protected readonly faLinkSlash = faLinkSlash;
  protected readonly faRotate = faRotate;
  protected readonly providerPresentations = providerPresentations;
  protected readonly connections = signal<readonly SocialConnection[]>([]);
  protected readonly loading = signal(true);
  protected readonly actionProvider = signal<SocialConnectionProvider | null>(null);
  protected readonly callbackSucceeded = signal(this.route.snapshot.queryParamMap.get('connection') === 'success');
  protected readonly callbackMessage = signal(this.createCallbackMessage());

  constructor() {
    void this.refresh();
  }

  protected connectionFor(provider: SocialConnectionProvider): SocialConnection | undefined {
    return this.connections().find(connection => connection.provider === provider);
  }

  protected async refresh(): Promise<void> {
    this.loading.set(true);

    try {
      const response = await this.connectionsService.listConnections();
      this.connections.set(response.connections);
    } catch (error) {
      this.toast.error(`Unable to load social connections: ${getErrorMessage(error)}`);
    } finally {
      this.loading.set(false);
    }
  }

  protected async connect(provider: SocialConnectionProvider): Promise<void> {
    this.actionProvider.set(provider);

    try {
      const connection = await this.connectionsService.beginConnection(provider);
      window.location.assign(connection.authorizationUrl);
    } catch (error) {
      this.toast.error(`Unable to start ${this.providerLabel(provider)} authorization: ${getErrorMessage(error)}`);
      this.actionProvider.set(null);
    }
  }

  protected async selectAccount(provider: 'facebook', accountId: string): Promise<void> {
    this.actionProvider.set(provider);

    try {
      await this.connectionsService.selectAccount(provider, accountId);
      this.toast.success('Connected the selected Facebook Page. External delivery remains disabled.');
      await this.refresh();
    } catch (error) {
      this.toast.error(`Unable to select the Facebook Page: ${getErrorMessage(error)}`);
    } finally {
      this.actionProvider.set(null);
    }
  }

  protected async disconnect(provider: SocialConnectionProvider, label: string): Promise<void> {
    if (!window.confirm(`Disconnect ${label}? Existing Calendar plans and outbox records will remain paused.`)) {
      return;
    }

    this.actionProvider.set(provider);

    try {
      await this.connectionsService.disconnect(provider);
      this.toast.success(`Disconnected ${label}.`);
      await this.refresh();
    } catch (error) {
      this.toast.error(`Unable to disconnect ${label}: ${getErrorMessage(error)}`);
    } finally {
      this.actionProvider.set(null);
    }
  }

  protected statusLabel(status: SocialConnection['status'] | undefined): string {
    switch (status) {
      case 'connected': return 'Connected';
      case 'expired': return 'Expired';
      case 'error': return 'Needs attention';
      case 'needs-selection': return 'Choose account';
      default: return 'Not connected';
    }
  }

  protected statusClass(status: SocialConnection['status'] | undefined): string {
    const base = 'border px-2 py-1 text-[10px] font-semibold uppercase tracking-wide';

    switch (status) {
      case 'connected': return `${base} border-emerald-500/60 text-emerald-300`;
      case 'needs-selection': return `${base} border-cyan-500/60 text-cyan-300`;
      case 'expired':
      case 'error': return `${base} border-red-500/60 text-red-300`;
      default: return `${base} border-zinc-700 text-zinc-500`;
    }
  }

  protected dateLabel(value: string): string {
    return new Intl.DateTimeFormat('en-US', {dateStyle: 'medium', timeStyle: 'short'}).format(new Date(value));
  }

  private createCallbackMessage(): string {
    const provider = this.route.snapshot.queryParamMap.get('provider');
    const result = this.route.snapshot.queryParamMap.get('connection');

    if (!SOCIAL_CONNECTION_PROVIDERS.includes(provider as SocialConnectionProvider) || !result) {
      return '';
    }

    const label = this.providerLabel(provider as SocialConnectionProvider);
    return result === 'success'
      ? `${label} authorization completed. Review the account status below; external delivery is still disabled.`
      : `${label} authorization did not complete. Confirm the callback URL, app role, and requested permissions, then try again.`;
  }

  private providerLabel(provider: SocialConnectionProvider): string {
    return providerPresentations.find(item => item.provider === provider)?.label ?? provider;
  }
}
