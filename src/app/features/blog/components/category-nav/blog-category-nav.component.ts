import {ChangeDetectionStrategy, Component, computed, inject, input} from '@angular/core';
import {toSignal} from '@angular/core/rxjs-interop';
import {RouterLink} from '@angular/router';

import {PATH_NAMES} from '../../../../app-route-paths';
import {BlogRepositoryService} from '../../services/blog-repository.service';
import {createBlogCategorySlug, getBlogTaxonomyTerms} from '../../utils/blog-category-url.util';

interface CategoryWithCount {
  name: string;
  slug: string;
  count: number;
}

@Component({
  selector: 'app-blog-category-nav',
  imports: [RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <nav aria-label="Blog categories">
      <div class="overflow-x-auto [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        <div class="flex min-w-max gap-2 pb-0.5">
          <a
            [routerLink]="['/', pathNames.BLOG]"
            [class]="activeSlug() === null ? activeCls : inactiveCls"
            [attr.aria-current]="activeSlug() === null ? 'page' : null"
          >
            All
            <span [class]="activeSlug() === null ? activeBadgeCls : inactiveBadgeCls">
              {{ totalCount() }}
            </span>
          </a>

          @for (cat of categoriesWithCounts(); track cat.slug) {
            <a
              [routerLink]="['/', pathNames.BLOG, 'category', cat.slug]"
              [class]="activeSlug() === cat.slug ? activeCls : inactiveCls"
              [attr.aria-current]="activeSlug() === cat.slug ? 'page' : null"
            >
              {{ cat.name }}
              <span [class]="activeSlug() === cat.slug ? activeBadgeCls : inactiveBadgeCls">
                {{ cat.count }}
              </span>
            </a>
          }
        </div>
      </div>
    </nav>
  `,
})
export class BlogCategoryNavComponent {
  private readonly blogRepository = inject(BlogRepositoryService);
  private readonly posts = toSignal(this.blogRepository.getPublishedPosts$(), {initialValue: []});

  readonly activeSlug = input<string | null>(null);

  protected readonly pathNames = PATH_NAMES;

  protected readonly activeCls = 'blog-chip-active';
  protected readonly inactiveCls = 'blog-chip';
  protected readonly activeBadgeCls = 'blog-chip-count-active';
  protected readonly inactiveBadgeCls = 'blog-chip-count';

  protected readonly totalCount = computed(() => this.posts().length);

  protected readonly categoriesWithCounts = computed((): readonly CategoryWithCount[] => {
    const countMap = new Map<string, { name: string; count: number }>();

    for (const post of this.posts()) {
      for (const category of getBlogTaxonomyTerms(post)) {
        const slug = createBlogCategorySlug(category);
        const entry = countMap.get(slug);
        if (entry) {
          entry.count++;
        } else {
          countMap.set(slug, {name: category, count: 1});
        }
      }
    }

    return Array.from(countMap.entries())
      .map(([slug, {name, count}]) => ({name, slug, count}))
      .sort((a, b) => b.count - a.count);
  });
}
