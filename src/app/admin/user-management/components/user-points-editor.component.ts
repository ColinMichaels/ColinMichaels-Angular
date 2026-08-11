import {ChangeDetectionStrategy, Component, computed, HostListener, inject, input, output, signal} from '@angular/core';

import {
  AdjustAdminUserPointsResponse,
  AdminManagedUser,
  AdminUserPointOperation,
} from '../models/user-management.models';
import {UserManagementService} from '../services/user-management.service';

const MAX_ADMIN_POINT_AMOUNT = 1_000_000;

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'Unable to update this point balance.';
}

@Component({
  selector: 'app-user-points-editor',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section
      class="fixed inset-0 z-[85] flex items-start justify-center overflow-y-auto bg-black/75 px-4 py-8"
      role="dialog"
      aria-modal="true"
      aria-labelledby="user-points-editor-title"
    >
      <div class="min-w-0 w-full max-w-2xl border border-violet-400/50 bg-zinc-950 p-5 shadow-2xl shadow-black">
        <header class="flex items-start justify-between gap-4 border-b border-zinc-800 pb-4">
          <div class="min-w-0">
            <p class="text-sm uppercase tracking-[0.24em] text-violet-300">Reader points</p>
            <h2 id="user-points-editor-title" class="mt-2 truncate text-2xl font-semibold text-zinc-50">
              Manage points for {{ user().displayName || user().email || user().uid }}
            </h2>
            <p class="mt-1 break-all text-xs text-zinc-500">{{ user().email || user().uid }}</p>
          </div>
          <button
            type="button"
            class="border border-zinc-700 px-3 py-2 text-sm text-zinc-300 hover:bg-zinc-800 disabled:cursor-not-allowed disabled:text-zinc-600"
            [disabled]="isSaving()"
            (click)="dismiss()"
          >
            Close
          </button>
        </header>

        <div class="space-y-6 py-5">
          <section class="grid gap-3 sm:grid-cols-3" aria-label="Current point balance">
            <div class="border border-violet-400/30 bg-violet-950/20 p-4 sm:col-span-3">
              <p class="text-sm text-zinc-400">Current total</p>
              <p class="mt-1 text-4xl font-semibold text-violet-100">{{ user().points.total }}</p>
            </div>
            <div class="border border-zinc-800 bg-zinc-900 p-3">
              <p class="text-xs text-zinc-500">Post reads</p>
              <p class="mt-1 text-lg text-zinc-100">{{ user().points.postReads }}</p>
            </div>
            <div class="border border-zinc-800 bg-zinc-900 p-3">
              <p class="text-xs text-zinc-500">Shares</p>
              <p class="mt-1 text-lg text-zinc-100">{{ user().points.shares }}</p>
            </div>
            <div class="border border-zinc-800 bg-zinc-900 p-3">
              <p class="text-xs text-zinc-500">Approved comments</p>
              <p class="mt-1 text-lg text-zinc-100">{{ user().points.approvedComments }}</p>
            </div>
            <div class="border border-zinc-800 bg-zinc-900 p-3">
              <p class="text-xs text-zinc-500">Daily Discovery</p>
              <p class="mt-1 text-lg text-zinc-100">{{ user().points.dailyDiscoveries }}</p>
            </div>
            <div class="border border-zinc-800 bg-zinc-900 p-3 sm:col-span-2">
              <p class="text-xs text-zinc-500">Admin adjustments</p>
              <p class="mt-1 text-lg text-zinc-100">{{ formatSigned(user().points.manualAdjustments) }}</p>
            </div>
          </section>

          <section class="space-y-3">
            <p class="text-sm font-medium text-zinc-200">Change balance</p>
            <div class="grid grid-cols-3" role="group" aria-label="Point operation">
              @for (option of operations; track option.id) {
                <button
                  type="button"
                  class="border px-3 py-2 text-sm font-medium focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-300"
                  [class.border-violet-300]="operation() === option.id"
                  [class.bg-violet-400]="operation() === option.id"
                  [class.text-zinc-950]="operation() === option.id"
                  [class.border-zinc-700]="operation() !== option.id"
                  [class.text-zinc-200]="operation() !== option.id"
                  [attr.aria-pressed]="operation() === option.id"
                  (click)="selectOperation(option.id)"
                >
                  {{ option.label }}
                </button>
              }
            </div>
            <p class="text-xs leading-5 text-zinc-500">Earned-category counters stay intact. Every change is recorded as a separate admin adjustment.</p>
          </section>

          <label class="grid gap-2 text-sm text-zinc-300">
            {{ amountLabel() }}
            <input
              type="number"
              inputmode="numeric"
              class="w-full border border-zinc-700 bg-zinc-950 px-3 py-2 text-zinc-100 outline-none focus:border-violet-300"
              [min]="operation() === 'set' ? 0 : 1"
              [max]="operation() === 'remove' ? user().points.total : maxAmount"
              step="1"
              [value]="amountText()"
              (input)="updateAmount($event)"
            >
          </label>

          <label class="grid gap-2 text-sm text-zinc-300">
            Reason
            <textarea
              class="min-h-24 w-full resize-y border border-zinc-700 bg-zinc-950 px-3 py-2 text-zinc-100 outline-none focus:border-violet-300"
              maxlength="240"
              placeholder="Why is this balance changing?"
              [value]="reason()"
              (input)="updateReason($event)"
            ></textarea>
            <span class="text-xs text-zinc-500">Required for the audit record and visible in the user’s Profile activity. Use 3–240 characters and do not include private staff notes.</span>
          </label>

          @if (preview(); as change) {
            <p class="border border-violet-400/30 bg-violet-950/20 px-4 py-3 text-sm text-violet-100" role="status">
              Balance preview: {{ change.previousTotal }} → {{ change.newTotal }} ({{ formatSigned(change.delta) }})
            </p>
          }

          @if (validationMessage()) {
            <p class="text-sm text-amber-200">{{ validationMessage() }}</p>
          }

          @if (errorMessage()) {
            <p class="border border-red-500/40 bg-red-950/30 p-3 text-sm text-red-100" role="alert">{{ errorMessage() }}</p>
          }
        </div>

        <footer class="flex flex-wrap justify-end gap-3 border-t border-zinc-800 pt-4">
          <button
            type="button"
            class="border border-zinc-700 px-4 py-2 text-sm font-medium text-zinc-200 hover:bg-zinc-800 disabled:cursor-not-allowed disabled:text-zinc-600"
            [disabled]="isSaving()"
            (click)="dismiss()"
          >
            Cancel
          </button>
          <button
            type="button"
            class="border border-violet-400 bg-violet-400 px-4 py-2 text-sm font-semibold text-zinc-950 hover:bg-violet-300 disabled:cursor-not-allowed disabled:border-zinc-700 disabled:bg-transparent disabled:text-zinc-600"
            [disabled]="!canSave()"
            (click)="save()"
          >
            {{ isSaving() ? 'Saving...' : 'Save Point Change' }}
          </button>
        </footer>
      </div>
    </section>
  `,
})
export class UserPointsEditorComponent {
  private readonly userManagement = inject(UserManagementService);

  readonly user = input.required<AdminManagedUser>();
  readonly dismissed = output<void>();
  readonly pointsAdjusted = output<AdjustAdminUserPointsResponse>();

  protected readonly maxAmount = MAX_ADMIN_POINT_AMOUNT;
  protected readonly operations: readonly { id: AdminUserPointOperation; label: string }[] = [
    {id: 'add', label: 'Add'},
    {id: 'remove', label: 'Remove'},
    {id: 'set', label: 'Set total'},
  ];
  protected readonly operation = signal<AdminUserPointOperation>('add');
  protected readonly amountText = signal('');
  protected readonly reason = signal('');
  protected readonly isSaving = signal(false);
  protected readonly errorMessage = signal<string | null>(null);

  protected readonly amount = computed(() => {
    const value = this.amountText().trim();
    const amount = Number(value);
    return value && Number.isSafeInteger(amount) ? amount : null;
  });
  protected readonly preview = computed(() => {
    const amount = this.amount();
    const previousTotal = this.user().points.total;

    if (amount === null) {
      return null;
    }

    const delta = this.operation() === 'add'
      ? amount
      : this.operation() === 'remove'
        ? -amount
        : amount - previousTotal;

    return {
      previousTotal,
      delta,
      newTotal: previousTotal + delta,
    };
  });
  protected readonly validationMessage = computed(() => {
    const amount = this.amount();
    const preview = this.preview();

    if (amount === null) {
      return this.amountText().trim() ? 'Enter a whole number.' : null;
    }
    if (amount < (this.operation() === 'set' ? 0 : 1) || amount > MAX_ADMIN_POINT_AMOUNT) {
      return `Enter a whole number from ${this.operation() === 'set' ? 0 : 1} to ${MAX_ADMIN_POINT_AMOUNT}.`;
    }
    if (!preview || preview.newTotal < 0) {
      return 'You cannot remove more points than the current balance.';
    }
    if (preview.delta === 0) {
      return 'Choose a value that changes the current balance.';
    }
    if (this.reason().trim().length > 0 && this.reason().trim().length < 3) {
      return 'Enter at least 3 characters for the reason.';
    }

    return null;
  });
  protected readonly canSave = computed(() => !this.isSaving()
    && !!this.preview()
    && !this.validationMessage()
    && this.reason().trim().length >= 3
    && this.reason().trim().length <= 240);
  protected readonly amountLabel = computed(() => {
    switch (this.operation()) {
      case 'remove':
        return 'Points to remove';
      case 'set':
        return 'New total';
      default:
        return 'Points to add';
    }
  });

  @HostListener('document:keydown.escape')
  protected onEscape(): void {
    this.dismiss();
  }

  protected selectOperation(operation: AdminUserPointOperation): void {
    this.operation.set(operation);
    this.amountText.set('');
    this.errorMessage.set(null);
  }

  protected updateAmount(event: Event): void {
    const inputElement = event.target instanceof HTMLInputElement ? event.target : null;
    this.amountText.set(inputElement?.value ?? '');
    this.errorMessage.set(null);
  }

  protected updateReason(event: Event): void {
    const inputElement = event.target instanceof HTMLTextAreaElement ? event.target : null;
    this.reason.set(inputElement?.value ?? '');
    this.errorMessage.set(null);
  }

  protected dismiss(): void {
    if (!this.isSaving()) {
      this.dismissed.emit();
    }
  }

  protected async save(): Promise<void> {
    const amount = this.amount();

    if (!this.canSave() || amount === null) {
      return;
    }

    this.isSaving.set(true);
    this.errorMessage.set(null);

    try {
      const result = await this.userManagement.adjustUserPoints({
        uid: this.user().uid,
        operation: this.operation(),
        amount,
        reason: this.reason().trim(),
      });
      this.pointsAdjusted.emit(result);
    } catch (error) {
      this.errorMessage.set(getErrorMessage(error));
    } finally {
      this.isSaving.set(false);
    }
  }

  protected formatSigned(value: number): string {
    return value > 0 ? `+${value}` : String(value);
  }
}
