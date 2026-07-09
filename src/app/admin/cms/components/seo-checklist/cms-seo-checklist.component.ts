import {Component, Input, ChangeDetectionStrategy} from '@angular/core';

import {AdminControlModuleComponent} from '../../../shared/admin-control-module.component';
import {
  createSearchPreviewDescription,
  createSearchPreviewTitle,
  createSeoChecklist,
  createSocialPreviewImage,
  SeoChecklistInput,
  SeoChecklistStatus,
  SeoChecklistSummary,
} from '../../utils/blog-seo-checklist';

@Component({
  selector: 'app-cms-seo-checklist',
  imports: [AdminControlModuleComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-admin-control-module
      title="SEO Checklist"
      [summary]="checklistSummary"
      description="Authoring checks for search, sharing, and discovery."
    >
      <span
        adminControlModuleStatus
        class="shrink-0 border px-2 py-1 text-[0.6rem] uppercase tracking-[0.16em]"
        [class.border-emerald-500]="checklist.failCount === 0 && checklist.warningCount === 0"
        [class.text-emerald-200]="checklist.failCount === 0 && checklist.warningCount === 0"
        [class.border-amber-500]="checklist.failCount === 0 && checklist.warningCount > 0"
        [class.text-amber-200]="checklist.failCount === 0 && checklist.warningCount > 0"
        [class.border-red-500]="checklist.failCount > 0"
        [class.text-red-200]="checklist.failCount > 0"
      >
        {{ checklist.passCount }}/{{ checklist.items.length }}
      </span>

      <div class="space-y-3">
      <div class="grid grid-cols-3 gap-2 text-center text-xs">
        <div class="border border-emerald-500/40 bg-emerald-950/20 px-2 py-2 text-emerald-100">
          <span class="block text-lg font-semibold">{{ checklist.passCount }}</span>
          <span class="uppercase tracking-[0.16em]">Pass</span>
        </div>
        <div class="border border-amber-500/40 bg-amber-950/20 px-2 py-2 text-amber-100">
          <span class="block text-lg font-semibold">{{ checklist.warningCount }}</span>
          <span class="uppercase tracking-[0.16em]">Warn</span>
        </div>
        <div class="border border-red-500/40 bg-red-950/20 px-2 py-2 text-red-100">
          <span class="block text-lg font-semibold">{{ checklist.failCount }}</span>
          <span class="uppercase tracking-[0.16em]">Fix</span>
        </div>
      </div>

      <div class="space-y-2">
        @for (item of checklist.items; track item.id) {
          <article class="border border-zinc-800 bg-zinc-900/60 p-3">
            <div class="flex items-start justify-between gap-3">
              <div class="min-w-0">
                <h3 class="text-sm font-medium text-zinc-100">{{ item.label }}</h3>
                <p class="mt-1 text-xs leading-5 text-zinc-500">{{ item.description }}</p>
                @if (item.metric) {
                  <p class="mt-1 break-all text-xs text-zinc-400">{{ item.metric }}</p>
                }
              </div>
              <span
                class="shrink-0 border px-2 py-1 text-[0.65rem] uppercase tracking-[0.16em]"
                [class]="statusClass(item.status)"
              >
                {{ statusLabel(item.status) }}
              </span>
            </div>
          </article>
        }
      </div>

      <section class="space-y-3 border border-zinc-800 bg-black/30 p-4">
        <h3 class="text-sm font-semibold text-zinc-50">Search Preview</h3>
        <div class="space-y-1 rounded bg-zinc-950 p-3">
          <p class="truncate text-sm text-emerald-300">{{ searchPreviewUrl }}</p>
          <p class="text-base leading-6 text-blue-300">{{ searchPreviewTitle }}</p>
          <p class="line-clamp-3 text-sm leading-5 text-zinc-400">{{ searchPreviewDescription }}</p>
        </div>
      </section>

      <section class="space-y-3 border border-zinc-800 bg-black/30 p-4">
        <h3 class="text-sm font-semibold text-zinc-50">Social Preview</h3>
        <article class="overflow-hidden border border-zinc-800 bg-zinc-950">
          @if (socialPreviewImage) {
            <img
              [src]="socialPreviewImage"
              [alt]="searchPreviewTitle + ' social preview'"
              class="aspect-[1.91/1] w-full object-cover"
              loading="lazy"
            >
          }
          <div class="space-y-1 p-3">
            <p class="truncate text-xs uppercase tracking-[0.16em] text-zinc-500">colinmichaels.com</p>
            <p class="line-clamp-2 text-sm font-medium leading-5 text-zinc-100">{{ searchPreviewTitle }}</p>
            <p class="line-clamp-2 text-xs leading-5 text-zinc-500">{{ searchPreviewDescription }}</p>
          </div>
        </article>
      </section>
      </div>
    </app-admin-control-module>
  `,
})
export class CmsSeoChecklistComponent {
  @Input({required: true}) checklistInput!: SeoChecklistInput;

  get checklist(): SeoChecklistSummary {
    return createSeoChecklist(this.checklistInput);
  }

  get searchPreviewTitle(): string {
    return createSearchPreviewTitle(this.checklistInput);
  }

  get searchPreviewDescription(): string {
    return createSearchPreviewDescription(this.checklistInput);
  }

  get searchPreviewUrl(): string {
    return this.checklistInput.canonical || this.checklistInput.generatedCanonicalUrl;
  }

  get socialPreviewImage(): string {
    return createSocialPreviewImage(this.checklistInput);
  }

  get checklistSummary(): string {
    const checklist = this.checklist;
    return `${checklist.failCount} fixes · ${checklist.warningCount} warnings · ${checklist.passCount} passing`;
  }

  protected statusLabel(status: SeoChecklistStatus): string {
    switch (status) {
      case 'pass':
        return 'Pass';
      case 'warning':
        return 'Warn';
      case 'fail':
        return 'Fix';
    }
  }

  protected statusClass(status: SeoChecklistStatus): string {
    switch (status) {
      case 'pass':
        return 'border-emerald-500/60 text-emerald-200';
      case 'warning':
        return 'border-amber-500/60 text-amber-200';
      case 'fail':
        return 'border-red-500/60 text-red-200';
    }
  }
}
