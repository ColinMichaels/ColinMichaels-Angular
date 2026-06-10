import {CommonModule} from '@angular/common';
import {ChangeDetectionStrategy, Component, EventEmitter, Input, Output} from '@angular/core';
import {FormsModule} from '@angular/forms';

import {
  BatchRenameCaseTransform,
  BatchRenameRequest,
  MediaLibraryItem,
  RenamePreviewRow
} from '../models/media-library.models';
import {buildRenamePreviewRows} from '../utils/media-library.utils';

@Component({
  selector: 'app-batch-rename-dialog',
  imports: [CommonModule, FormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-label="Batch rename media">
      <button type="button" class="absolute inset-0 bg-gray-950/50" aria-label="Close batch rename" (click)="closeRequested.emit()"></button>

      <section class="relative z-10 flex max-h-[92vh] w-full max-w-5xl flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-2xl">
        <header class="flex items-center justify-between border-b border-gray-200 px-5 py-4">
          <div>
            <h2 class="text-lg font-semibold text-gray-900">Batch Rename</h2>
            <p class="text-sm text-gray-500">Preview metadata display-name changes before applying them.</p>
          </div>
          <button type="button" class="rounded-md border border-gray-200 px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-50" (click)="closeRequested.emit()">Close</button>
        </header>

        <div class="grid min-h-0 flex-1 gap-0 overflow-hidden lg:grid-cols-[340px_1fr]">
          <form class="space-y-4 overflow-y-auto border-r border-gray-200 p-5" (ngSubmit)="applyRename()">
            <div class="rounded-xl border border-blue-200 bg-blue-50 p-3 text-sm text-blue-800">
              <p class="font-semibold">{{ items.length }} selected item{{ items.length === 1 ? '' : 's' }}</p>
              <p class="mt-1 text-xs">Storage object paths are not renamed here. This updates media display-name metadata.</p>
            </div>

            <label class="block space-y-1">
              <span class="field-label">Template</span>
              <input class="field-input" name="template" [(ngModel)]="request.template" placeholder="shirt_{index}">
            </label>

            <div class="grid grid-cols-2 gap-3">
              <label class="block space-y-1">
                <span class="field-label">Start index</span>
                <input type="number" class="field-input" name="startIndex" min="0" [(ngModel)]="request.startIndex">
              </label>
              <label class="block space-y-1">
                <span class="field-label">Padding</span>
                <input type="number" class="field-input" name="paddingLength" min="1" max="8" [(ngModel)]="request.paddingLength">
              </label>
            </div>

            <div class="grid grid-cols-2 gap-3">
              <label class="block space-y-1">
                <span class="field-label">Prefix</span>
                <input class="field-input" name="prefix" [(ngModel)]="request.prefix">
              </label>
              <label class="block space-y-1">
                <span class="field-label">Suffix</span>
                <input class="field-input" name="suffix" [(ngModel)]="request.suffix">
              </label>
            </div>

            <div class="grid grid-cols-2 gap-3">
              <label class="block space-y-1">
                <span class="field-label">Find text</span>
                <input class="field-input" name="findText" [(ngModel)]="request.findText">
              </label>
              <label class="block space-y-1">
                <span class="field-label">Replace text</span>
                <input class="field-input" name="replaceText" [(ngModel)]="request.replaceText">
              </label>
            </div>

            <label class="block space-y-1">
              <span class="field-label">Case transform</span>
              <select class="field-input" name="caseTransform" [(ngModel)]="request.caseTransform">
                @for (option of caseTransforms; track option.value) {
                  <option [value]="option.value">{{ option.label }}</option>
                }
              </select>
            </label>

            <section class="rounded-xl border border-gray-200 bg-gray-50 p-3 text-xs text-gray-600">
              <p class="font-semibold text-gray-800">Variables</p>
              <p class="mt-2 leading-5">
                {{ '{name}' }}, {{ '{ext}' }}, {{ '{index}' }}, {{ '{date}' }}, {{ '{uploaded}' }},
                {{ '{updated}' }}, {{ '{width}' }}, {{ '{height}' }}, {{ '{folder}' }}, {{ '{rating}' }}
              </p>
              <p class="mt-2 text-gray-500">
                Examples: shirt_{{ '{index}' }}, {{ '{folder}' }}_{{ '{index}' }}_{{ '{width}' }}x{{ '{height}' }}
              </p>
            </section>

            <label class="flex items-start gap-2 rounded-xl border border-gray-200 p-3 text-sm text-gray-700">
              <input type="checkbox" class="mt-1 h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500" name="confirmed" [(ngModel)]="confirmed">
              <span>I reviewed the preview and want to apply valid rename operations.</span>
            </label>
          </form>

          <section class="min-h-0 overflow-auto p-5">
            <div class="mb-3 flex flex-wrap items-center justify-between gap-2">
              <div class="text-sm text-gray-600">
                <span class="font-semibold text-gray-900">{{ validRows.length }}</span> valid,
                <span class="font-semibold text-gray-900">{{ rows.length - validRows.length }}</span> blocked
              </div>
              <button
                type="button"
                class="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-gray-300"
                [disabled]="!confirmed || validRows.length === 0 || rows.length !== validRows.length"
                (click)="applyRename()"
              >
                Apply Rename
              </button>
            </div>

            <div class="overflow-hidden rounded-xl border border-gray-200">
              <table class="min-w-full divide-y divide-gray-200 text-sm">
                <thead class="bg-gray-50 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                  <tr>
                    <th class="px-3 py-2">Current Name</th>
                    <th class="px-3 py-2">New Name</th>
                    <th class="px-3 py-2">Status</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-gray-100 bg-white">
                  @for (row of rows; track row.itemId) {
                    <tr>
                      <td class="max-w-[260px] truncate px-3 py-2 text-gray-700" [title]="row.currentName">{{ row.currentName }}</td>
                      <td class="max-w-[260px] truncate px-3 py-2 font-medium text-gray-900" [title]="row.newName">{{ row.newName }}</td>
                      <td class="px-3 py-2">
                        <span class="rounded-full px-2 py-1 text-xs font-semibold" [ngClass]="statusClass(row.status)">{{ row.status }}</span>
                      </td>
                    </tr>
                  }
                </tbody>
              </table>
            </div>
          </section>
        </div>
      </section>
    </div>
  `,
  styles: [`
    .field-label {
      color: #6b7280;
      display: block;
      font-size: 0.75rem;
      font-weight: 600;
      letter-spacing: 0.08em;
      text-transform: uppercase;
    }

    .field-input {
      border: 1px solid #d1d5db;
      border-radius: 0.5rem;
      color: #111827;
      font-size: 0.875rem;
      padding: 0.5rem 0.75rem;
      width: 100%;
    }

    .field-input:focus {
      border-color: #2563eb;
      box-shadow: 0 0 0 2px #dbeafe;
      outline: none;
    }
  `],
})
export class BatchRenameDialogComponent {
  @Input() items: readonly MediaLibraryItem[] = [];
  @Input() allItems: readonly MediaLibraryItem[] = [];
  @Output() renameApplied = new EventEmitter<readonly RenamePreviewRow[]>();
  @Output() closeRequested = new EventEmitter<void>();

  protected request: BatchRenameRequest = {
    template: '{name}_{index}',
    startIndex: 1,
    paddingLength: 2,
    prefix: '',
    suffix: '',
    findText: '',
    replaceText: '',
    caseTransform: 'none',
  };
  protected confirmed = false;

  protected readonly caseTransforms: readonly { value: BatchRenameCaseTransform; label: string }[] = [
    {value: 'none', label: 'None'},
    {value: 'lowercase', label: 'lowercase'},
    {value: 'uppercase', label: 'UPPERCASE'},
    {value: 'titlecase', label: 'Title Case'},
    {value: 'slugify', label: 'slugify'},
  ];

  protected get rows(): readonly RenamePreviewRow[] {
    return buildRenamePreviewRows(this.items, this.allItems, this.request);
  }

  protected get validRows(): readonly RenamePreviewRow[] {
    return this.rows.filter(row => row.status === 'OK');
  }

  protected applyRename(): void {
    if (!this.confirmed || this.validRows.length === 0 || this.validRows.length !== this.rows.length) {
      return;
    }

    this.renameApplied.emit(this.rows);
  }

  protected statusClass(status: RenamePreviewRow['status']): string {
    return status === 'OK'
      ? 'bg-emerald-50 text-emerald-700'
      : status === 'Name unchanged'
        ? 'bg-gray-100 text-gray-600'
        : 'bg-red-50 text-red-700';
  }
}
