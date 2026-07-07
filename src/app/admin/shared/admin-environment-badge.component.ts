import {ChangeDetectionStrategy, Component} from '@angular/core';

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
  const usesFirestoreEmulator = Boolean(emulators?.firestore);
  const usesFunctionsEmulator = Boolean(emulators?.functions);

  if (usesFirestoreEmulator && usesFunctionsEmulator) {
    return {
      description: 'Local emulator data is active.',
      detail: `Firestore ${emulators?.firestore?.host}:${emulators?.firestore?.port} / Functions ${emulators?.functions?.host}:${emulators?.functions?.port}`,
      label: 'Emulator Data',
      mode: 'emulator',
    };
  }

  if (usesFirestoreEmulator || usesFunctionsEmulator) {
    return {
      description: 'Firestore and Functions are split between local and live services.',
      detail: `Firestore ${usesFirestoreEmulator ? 'emulator' : 'live'} / Functions ${usesFunctionsEmulator ? 'emulator' : 'live'}`,
      label: 'Mixed Firebase',
      mode: 'mixed',
    };
  }

  return {
    description: 'Live Firebase data is active.',
    detail: 'Firestore live / Functions live',
    label: 'Live Firebase',
    mode: 'live',
  };
}

@Component({
  selector: 'app-admin-environment-badge',
  changeDetection: ChangeDetectionStrategy.Eager,
  template: `
    <aside
      class="border px-3 py-2 text-xs"
      [class.border-emerald-400]="badge.mode === 'live'"
      [class.bg-emerald-950]="badge.mode === 'live'"
      [class.text-emerald-100]="badge.mode === 'live'"
      [class.border-cyan-400]="badge.mode === 'emulator'"
      [class.bg-cyan-950]="badge.mode === 'emulator'"
      [class.text-cyan-100]="badge.mode === 'emulator'"
      [class.border-amber-400]="badge.mode === 'mixed'"
      [class.bg-amber-950]="badge.mode === 'mixed'"
      [class.text-amber-100]="badge.mode === 'mixed'"
      aria-label="Firebase environment"
    >
      <div class="flex flex-wrap items-center gap-x-2 gap-y-1">
        <span class="font-semibold uppercase tracking-[0.18em]">{{ badge.label }}</span>
        <span class="text-[0.7rem] opacity-80">{{ badge.description }}</span>
      </div>
      <p class="mt-1 font-mono text-[0.68rem] opacity-75">{{ badge.detail }}</p>
    </aside>
  `,
})
export class AdminEnvironmentBadgeComponent {
  protected readonly badge = createFirebaseEnvironmentBadge(environment.firebaseEmulators);
}
