import {Component, Input, ChangeDetectionStrategy} from '@angular/core';
import {RouterLink} from '@angular/router';

import {PATH_NAMES} from '../../../../app-route-paths';
import {createBlogTagSlug} from '../../utils/blog-category-url.util';

@Component({
  selector: 'app-blog-tag-list',
  imports: [RouterLink],
  changeDetection: ChangeDetectionStrategy.Eager,
  template: `
    <div class="flex flex-wrap gap-2">
      @for (tag of tags; track tag) {
        <a
          [routerLink]="['/', pathNames.BLOG, 'tag', tagSlug(tag)]"
          class="rounded border border-zinc-700 bg-zinc-900 px-1 py-0.5 text-xs uppercase tracking-wide text-zinc-300 hover:border-cyan-300 hover:text-cyan-200">
          {{ tag }}
        </a>
      }
    </div>
  `,
})
export class BlogTagListComponent {
  @Input() tags: readonly string[] = [];

  protected readonly pathNames = PATH_NAMES;

  protected tagSlug(tag: string): string {
    return createBlogTagSlug(tag);
  }
}
