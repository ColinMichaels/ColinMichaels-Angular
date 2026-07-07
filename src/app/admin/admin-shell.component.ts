import {ChangeDetectionStrategy, Component} from '@angular/core';
import {RouterOutlet} from '@angular/router';

import {AdminEnvironmentBadgeComponent} from './shared/admin-environment-badge.component';

@Component({
  selector: 'app-admin-shell',
  imports: [
    AdminEnvironmentBadgeComponent,
    RouterOutlet,
  ],
  changeDetection: ChangeDetectionStrategy.Eager,
  template: `
    <div class="bg-zinc-950 px-5 pt-4 text-zinc-100 sm:px-8 lg:px-12">
      <div class="mx-auto max-w-7xl">
        <app-admin-environment-badge></app-admin-environment-badge>
      </div>
    </div>
    <router-outlet></router-outlet>
  `,
})
export class AdminShellComponent {}
