import {ChangeDetectionStrategy, Component, OnInit, inject, signal} from '@angular/core';
import {Router, RouterLink} from '@angular/router';
import {catchError, of, switchMap, take} from 'rxjs';
import {User} from 'firebase/auth';

import {PATH_NAMES} from '../../app-route-paths';
import {AuthService} from '../../services/auth.service';
import {writeAuthDebug} from '../debug/auth-debug';

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'Unable to sign out.';
}

@Component({
  selector: 'app-logout',
  imports: [
    RouterLink,
  ],
  changeDetection: ChangeDetectionStrategy.Eager,
  template: `
    <main class="min-h-screen bg-zinc-950 px-5 py-10 text-zinc-100 sm:px-8 lg:px-12">
      <section class="mx-auto max-w-2xl space-y-8">
        <nav class="flex items-center justify-between text-sm text-zinc-400">
          <a routerLink="/" class="hover:text-zinc-100">Home</a>
          <a routerLink="/login" class="hover:text-zinc-100">Login</a>
        </nav>

        <section class="space-y-5 border border-zinc-800 bg-zinc-900 p-6">
          <p class="text-sm uppercase tracking-[0.3em] text-cyan-300">Account</p>
          <h1 class="text-3xl font-semibold text-zinc-50">{{ title() }}</h1>
          <p class="text-zinc-400">{{ message() }}</p>

          @if (errorMessage()) {
            <p class="border border-red-500/40 bg-red-950/30 px-4 py-3 text-sm text-red-100">{{ errorMessage() }}</p>
          }

          <div class="flex flex-wrap gap-3">
            <a routerLink="/login" class="border border-cyan-400 px-4 py-2 text-sm font-medium text-cyan-200 hover:bg-cyan-400 hover:text-zinc-950">
              Login
            </a>
            <a routerLink="/" class="border border-zinc-700 px-4 py-2 text-sm font-medium text-zinc-200 hover:bg-zinc-800">
              Home
            </a>
          </div>
        </section>
      </section>
    </main>
  `,
})
export class LogoutComponent implements OnInit {
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);

  protected readonly title = signal('Signing out');
  protected readonly message = signal('Ending your current session.');
  protected readonly errorMessage = signal<string | null>(null);

  ngOnInit(): void {
    this.debugLogout('initialized');

    this.authService.user$
      .pipe(
        take(1),
        switchMap(user => {
          this.debugLogout('auth user resolved before logout', {
            signedIn: !!user,
            user: user ? this.createUserDebugSummary(user) : null,
          });

          if (!user) {
            this.title.set('Signed out');
            this.message.set('No active session was found.');
            this.debugLogout('no active session, redirecting to login');
            void this.router.navigate(['/', PATH_NAMES.OS_LOGIN]);
            return of(undefined);
          }

          this.debugLogout('logout requested', {user: this.createUserDebugSummary(user)});
          return this.authService.logout();
        }),
        catchError(error => {
          this.title.set('Sign out failed');
          this.message.set('The session could not be ended. Try again or close the browser.');
          this.errorMessage.set(getErrorMessage(error));
          this.debugLogout('logout failed', {
            error: this.createErrorDebugSummary(error),
            displayedMessage: this.errorMessage(),
          });
          return of(undefined);
        })
      )
      .subscribe(() => {
        if (!this.errorMessage()) {
          this.title.set('Signed out');
          this.message.set('Your session has ended.');
          this.debugLogout('logout flow completed');
        }
      });
  }

  private createUserDebugSummary(user: User): Record<string, unknown> {
    return {
      uid: user.uid,
      email: user.email,
      displayName: user.displayName,
      emailVerified: user.emailVerified,
      isAnonymous: user.isAnonymous,
      providerIds: user.providerData.map(provider => provider.providerId),
    };
  }

  private createErrorDebugSummary(error: unknown): Record<string, unknown> {
    if (error instanceof Error) {
      return {
        name: error.name,
        message: error.message,
      };
    }

    return {
      message: String(error),
    };
  }

  private debugLogout(event: string, details?: unknown): void {
    writeAuthDebug('LogoutDebug', event, details);
  }
}
