import {ChangeDetectionStrategy, Component, computed, inject, input} from '@angular/core';
import {toSignal} from '@angular/core/rxjs-interop';
import {RouterLink} from '@angular/router';

import {PATH_NAMES} from '../../../../app-route-paths';
import {BlogRepositoryService} from '../../services/blog-repository.service';
import {createBlogCategorySlug} from '../../utils/blog-category-url.util';

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
            [class]="activeSlug() == null ? activeCls : inactiveCls"
            [attr.aria-current]="activeSlug() == null ? 'page' : null"
          >
            All
            <span [class]="activeSlug() == null ? activeBadgeCls : inactiveBadgeCls">
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

  protected readonly activeCls =
    'inline-flex items-center gap-1.5 whitespace-nowrap rounded border border-cyan-300 bg-cyan-400 px-3 py-1.5 text-sm font-medium text-zinc-950 transition-colors';
  protected readonly inactiveCls =
    'inline-flex items-center gap-1.5 whitespace-nowrap rounded border border-zinc-700 px-3 py-1.5 text-sm text-zinc-300 transition-colors hover:border-cyan-300 hover:text-cyan-200';
  protected readonly activeBadgeCls =
    'inline-flex min-w-[1.25rem] items-center justify-center rounded-full bg-zinc-950/25 px-1.5 py-0.5 text-xs font-semibold';
  protected readonly inactiveBadgeCls =
    'inline-flex min-w-[1.25rem] items-center justify-center rounded-full bg-zinc-800 px-1.5 py-0.5 text-xs font-medium text-zinc-400';

  protected readonly totalCount = computed(() => this.posts().length);

  protected readonly categoriesWithCounts = computed((): readonly CategoryWithCount[] => {
    const countMap = new Map<string, { name: string; count: number }>();

    for (const post of this.posts()) {
      for (const category of post.categories) {
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
