import {ChangeDetectionStrategy, Component, computed, inject} from '@angular/core';
import {toSignal} from '@angular/core/rxjs-interop';
import {Router} from '@angular/router';

import {PATH_NAMES} from '../../app-route-paths';
import {AuthService} from '../../services/auth.service';
import {BASE_USER_ROLE} from '../user-account/user-account.model';

@Component({
  selector: 'app-user-view-banner',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (userView(); as view) {
      <aside
        class="fixed inset-x-0 bottom-0 z-[100] border-t border-amber-300/60 bg-amber-950 px-4 py-3 text-amber-50 shadow-[0_-12px_32px_rgba(0,0,0,0.45)]"
        role="status"
        aria-live="polite"
      >
        <div class="mx-auto flex max-w-7xl flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div class="min-w-0">
            <div class="flex flex-wrap items-center gap-x-3 gap-y-1">
              <strong class="text-sm font-semibold uppercase tracking-[0.16em] text-amber-200">View as user</strong>
              @if (view.disabled) {
                <span class="border border-red-300/50 bg-red-950/50 px-2 py-0.5 text-xs font-semibold text-red-100">Disabled account</span>
              }
            </div>
            <p class="mt-1 truncate text-sm">
              Viewing as <span class="font-semibold">{{ view.displayName || view.email || view.uid }}</span>
              <span class="text-amber-200/80"> · {{ roleSummary() }}</span>
            </p>
            <p class="mt-0.5 text-xs text-amber-200/75">Role and profile preview only. Firebase requests still use your admin account.</p>
          </div>
          <button
            type="button"
            class="inline-flex min-h-10 shrink-0 items-center justify-center border border-amber-200 bg-amber-200 px-4 py-2 text-sm font-semibold text-amber-950 hover:bg-amber-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-100"
            (click)="exitUserView()"
          >
            Exit View
          </button>
        </div>
      </aside>
    }
  `,
})
export class UserViewBannerComponent {
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);

  protected readonly userView = toSignal(this.authService.userView$, {initialValue: null});
  protected readonly roleSummary = computed(() => {
    const roles = this.userView()?.roles ?? [];
    return roles.length > 0 ? roles.join(', ') : BASE_USER_ROLE;
  });

  protected async exitUserView(): Promise<void> {
    this.authService.stopViewingAsUser();
    await this.router.navigate(['/', PATH_NAMES.ADMIN, PATH_NAMES.ADMIN_USERS]);
  }
}
