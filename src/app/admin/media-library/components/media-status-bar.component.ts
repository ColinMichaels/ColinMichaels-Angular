import {CommonModule} from '@angular/common';
import {ChangeDetectionStrategy, Component, Input} from '@angular/core';

@Component({
  selector: 'app-media-status-bar',
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <footer class="flex h-8 items-center justify-between gap-3 border-t border-gray-200 bg-white px-3 text-xs text-gray-600">
      <div class="flex min-w-0 items-center gap-3">
        <span>{{ visibleCount }} visible</span>
        <span>{{ totalCount }} total</span>
        @if (selectedCount > 0) {
          <span class="rounded-full bg-blue-50 px-2 py-0.5 font-medium text-blue-700">{{ selectedCount }} selected</span>
        }
      </div>

      <div class="flex items-center gap-3">
        @if (uploadingCount > 0) {
          <span class="text-blue-700">{{ uploadingCount }} uploading</span>
        }
        @if (processingCount > 0) {
          <span class="text-amber-700">{{ processingCount }} processing</span>
        }
        @if (failedCount > 0) {
          <span class="text-red-700">{{ failedCount }} failed</span>
        }
        @if (!uploadingCount && !processingCount && !failedCount) {
          <span>Ready</span>
        }
      </div>
    </footer>
  `,
})
export class MediaStatusBarComponent {
  @Input() totalCount = 0;
  @Input() visibleCount = 0;
  @Input() selectedCount = 0;
  @Input() uploadingCount = 0;
  @Input() processingCount = 0;
  @Input() failedCount = 0;
}
