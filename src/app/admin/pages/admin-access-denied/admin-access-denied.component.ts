import {AsyncPipe} from '@angular/common';
import {Component, inject} from '@angular/core';
import {RouterLink} from '@angular/router';

import {AuthService} from '../../../services/auth.service';

@Component({
  selector: 'app-admin-access-denied',
  imports: [
    AsyncPipe,
    RouterLink,
  ],
  template: `
    <main class="min-h-screen bg-zinc-950 px-5 py-10 text-zinc-100 sm:px-8 lg:px-12">
      <section class="mx-auto max-w-3xl space-y-8">
        <nav class="flex items-center justify-between text-sm text-zinc-400">
          <a routerLink="/" class="hover:text-zinc-100">Home</a>
          <a routerLink="/blog" class="hover:text-zinc-100">Blog</a>
        </nav>

        <section class="space-y-5 border border-amber-500/40 bg-amber-950/20 p-6">
          <p class="text-sm uppercase tracking-[0.3em] text-amber-200">Admin Access Required</p>
          <h1 class="text-3xl font-semibold text-zinc-50">This account is signed in but not authorized for admin
            tools.</h1>
          <p class="text-zinc-300">
            Admin publishing actions require the Firebase Auth custom claim <code class="text-amber-100">admin:
            true</code>.
            Ask an existing project owner to grant the claim, then sign out and sign back in to refresh your token.
          </p>

          <div class="flex flex-wrap gap-3">
            <a routerLink="/login"
               class="border border-cyan-400 px-4 py-2 text-sm font-medium text-cyan-200 hover:bg-cyan-400 hover:text-zinc-950">
              Sign In Again
            </a>
            <a routerLink="/"
               class="border border-zinc-700 px-4 py-2 text-sm font-medium text-zinc-200 hover:bg-zinc-800">
              Back Home
            </a>
          </div>

          @if (authService.user$ | async; as user) {
            <p class="border-t border-amber-500/20 pt-4 text-sm text-zinc-400">
              Current account: <span class="text-zinc-200">{{ user.email || user.uid }}</span>
            </p>
          }
        </section>
      </section>
    </main>
  `,
})
export class AdminAccessDeniedComponent {
  protected readonly authService = inject(AuthService);
}
