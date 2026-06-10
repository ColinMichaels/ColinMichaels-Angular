import {Component, Input, ChangeDetectionStrategy} from '@angular/core';

@Component({
  selector: 'app-blog-tag-list',
  changeDetection: ChangeDetectionStrategy.Eager,
  template: `
    <div class="flex flex-wrap gap-2">
      @for (tag of tags; track tag) {
        <span class="rounded border border-zinc-700 bg-zinc-900 px-2 py-1 text-xs uppercase tracking-wide text-zinc-300">
          {{ tag }}
        </span>
      }
    </div>
  `,
})
export class BlogTagListComponent {
  @Input() tags: readonly string[] = [];
}
