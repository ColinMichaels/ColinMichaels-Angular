import {ChangeDetectionStrategy, Component, input} from '@angular/core';

import {environment} from '../../../environments/environment';
import {FirebaseServiceEmulatorConfig} from '../../services/firebase/firebase.tokens';

type FirebaseEnvironmentMode = 'emulator' | 'live' | 'mixed';

interface FirebaseEnvironmentBadgeViewModel {
  description: string;
  detail: string;
  label: string;
  mode: FirebaseEnvironmentMode;
}

export function createFirebaseEnvironmentBadge(
  emulators: FirebaseServiceEmulatorConfig | undefined
): FirebaseEnvironmentBadgeViewModel {
  const usesAuthEmulator = Boolean(emulators?.auth);
  const usesFirestoreEmulator = Boolean(emulators?.firestore);
  const usesFunctionsEmulator = Boolean(emulators?.functions);

  if (usesAuthEmulator && usesFirestoreEmulator && usesFunctionsEmulator) {
    return {
      description: 'Local emulator data is active.',
      detail: `Auth ${emulators?.auth?.host}:${emulators?.auth?.port} / Firestore ${emulators?.firestore?.host}:${emulators?.firestore?.port} / Functions ${emulators?.functions?.host}:${emulators?.functions?.port}`,
      label: 'Emulator Data',
      mode: 'emulator',
    };
  }

  if (usesAuthEmulator || usesFirestoreEmulator || usesFunctionsEmulator) {
    return {
      description: 'Firebase services are split between local and live environments.',
      detail: `Auth ${usesAuthEmulator ? 'emulator' : 'live'} / Firestore ${usesFirestoreEmulator ? 'emulator' : 'live'} / Functions ${usesFunctionsEmulator ? 'emulator' : 'live'}`,
      label: 'Mixed Firebase',
      mode: 'mixed',
    };
  }

  return {
    description: 'Live Firebase data is active.',
    detail: 'Auth live / Firestore live / Functions live',
    label: 'Live Firebase',
    mode: 'live',
  };
}

@Component({
  selector: 'app-admin-environment-badge',
  changeDetection: ChangeDetectionStrategy.Eager,
  template: `
    <aside
      class="border text-xs"
      [class.grid]="iconOnly()"
      [class.h-9]="iconOnly()"
      [class.w-9]="iconOnly()"
      [class.place-items-center]="iconOnly()"
      [class.px-3]="!iconOnly()"
      [class.py-2]="!iconOnly()"
      [class.border-emerald-400]="badge.mode === 'live'"
      [class.bg-emerald-950]="badge.mode === 'live'"
      [class.text-emerald-100]="badge.mode === 'live'"
      [class.border-cyan-400]="badge.mode === 'emulator'"
      [class.bg-cyan-950]="badge.mode === 'emulator'"
      [class.text-cyan-100]="badge.mode === 'emulator'"
      [class.border-amber-400]="badge.mode === 'mixed'"
      [class.bg-amber-950]="badge.mode === 'mixed'"
      [class.text-amber-100]="badge.mode === 'mixed'"
      [attr.aria-label]="iconOnly() ? 'Firebase environment: ' + badge.label : 'Firebase environment'"
      [attr.title]="badge.detail"
    >
      @if (iconOnly()) {
        <span
          class="h-2 w-2"
          [class.bg-emerald-300]="badge.mode === 'live'"
          [class.bg-cyan-300]="badge.mode === 'emulator'"
          [class.bg-amber-300]="badge.mode === 'mixed'"
          aria-hidden="true"
        ></span>
      } @else {
        <div class="flex flex-wrap items-center gap-x-2 gap-y-1">
          <span class="font-semibold uppercase tracking-[0.18em]">{{ badge.label }}</span>
          @if (!compact()) {
            <span class="text-[0.7rem] opacity-80">{{ badge.description }}</span>
          }
        </div>
        @if (!compact()) {
          <p class="mt-1 font-mono text-[0.68rem] opacity-75">{{ badge.detail }}</p>
        }
      }
    </aside>
  `,
})
export class AdminEnvironmentBadgeComponent {
  readonly compact = input(false);
  readonly iconOnly = input(false);
  protected readonly badge = createFirebaseEnvironmentBadge(environment.firebaseEmulators);
}
