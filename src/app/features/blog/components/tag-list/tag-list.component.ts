import {Component, Input, ChangeDetectionStrategy} from '@angular/core';
import {RouterLink} from '@angular/router';

import {PATH_NAMES} from '../../../../app-route-paths';
import {createBlogTagTaxonomyRoute} from '../../utils/blog-category-url.util';

@Component({
  selector: 'app-blog-tag-list',
  imports: [RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="flex flex-wrap gap-2">
      @for (tag of tags; track $index) {
        <a
          [routerLink]="tagRouteCommands(tag)"
          class="blog-tag-chip">
          {{ tag }}
        </a>
      }
    </div>
  `,
})
export class BlogTagListComponent {
  @Input() tags: readonly string[] = [];

  protected readonly pathNames = PATH_NAMES;

  protected tagRouteCommands(tag: string): readonly string[] {
    const route = createBlogTagTaxonomyRoute(tag);
    return ['/', this.pathNames.BLOG, route.kind, route.slug];
  }
}
