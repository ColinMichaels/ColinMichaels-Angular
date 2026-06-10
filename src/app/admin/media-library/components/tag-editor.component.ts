import {CommonModule} from '@angular/common';
import {ChangeDetectionStrategy, Component, EventEmitter, Input, Output} from '@angular/core';
import {FormsModule} from '@angular/forms';

@Component({
  selector: 'app-tag-editor',
  imports: [CommonModule, FormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="space-y-3">
      <div class="flex flex-wrap gap-2" [class.opacity-60]="disabled">
        @for (tag of tags; track tag) {
          <span class="inline-flex items-center gap-1 rounded-full border border-blue-200 bg-blue-50 px-2.5 py-1 text-xs font-medium text-blue-700">
            {{ tag }}
            <button
              type="button"
              class="rounded-full px-1 text-blue-500 hover:bg-blue-100 hover:text-blue-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-500"
              [disabled]="disabled"
              [attr.aria-label]="'Remove tag ' + tag"
              (click)="removeTag(tag)"
            >
              x
            </button>
          </span>
        } @empty {
          <p class="text-xs text-gray-500">No tags assigned.</p>
        }
      </div>

      <div class="flex gap-2">
        <input
          type="text"
          class="min-w-0 flex-1 rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100 disabled:cursor-not-allowed disabled:bg-gray-50"
          placeholder="Add tag"
          [disabled]="disabled"
          [(ngModel)]="draftTag"
          (keydown.enter)="addDraftTag($event)"
          list="media-tag-suggestions"
        >
        <button
          type="button"
          class="rounded-md bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-gray-300"
          [disabled]="disabled || !draftTag.trim()"
          (click)="addDraftTag()"
        >
          Add
        </button>
      </div>

      <datalist id="media-tag-suggestions">
        @for (tag of availableTags; track tag) {
          <option [value]="tag"></option>
        }
      </datalist>
    </section>
  `,
})
export class TagEditorComponent {
  @Input() tags: readonly string[] = [];
  @Input() availableTags: readonly string[] = [];
  @Input() disabled = false;
  @Output() tagsChange = new EventEmitter<readonly string[]>();

  protected draftTag = '';

  protected addDraftTag(event?: Event): void {
    event?.preventDefault();
    const tag = this.normalizeTag(this.draftTag);

    if (!tag || this.tags.includes(tag)) {
      this.draftTag = '';
      return;
    }

    this.tagsChange.emit([...this.tags, tag].sort());
    this.draftTag = '';
  }

  protected removeTag(tag: string): void {
    this.tagsChange.emit(this.tags.filter(existingTag => existingTag !== tag));
  }

  private normalizeTag(value: string): string {
    return value.trim().toLowerCase().replace(/\s+/g, '-');
  }
}
