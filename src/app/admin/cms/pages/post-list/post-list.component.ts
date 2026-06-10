import {Component, inject, ChangeDetectionStrategy} from '@angular/core';
import {RouterLink} from '@angular/router';

import {BlogPost, BlogPostStatus} from '../../../../features/blog/models/blog-post.model';
import {BlogPostDeleteResult, BlogRepositoryService} from '../../../../features/blog/services/blog-repository.service';

interface AdminPostRow {
  post: BlogPost;
  updatedAt: string;
  publishedAt: string;
}

const dateFormatter = new Intl.DateTimeFormat('en-US', {
  month: 'short',
  day: 'numeric',
  year: 'numeric',
  timeZone: 'UTC',
});

function formatDate(value: string | null): string {
  return value ? dateFormatter.format(new Date(value)) : 'Not published';
}

@Component({
  selector: 'app-cms-post-list',
  imports: [
    RouterLink,
  ],
  changeDetection: ChangeDetectionStrategy.Eager,
  template: `
    <main class="min-h-screen bg-zinc-950 px-5 py-10 text-zinc-100 sm:px-8 lg:px-12">
      <section class="mx-auto max-w-6xl space-y-8">
        <nav class="flex items-center justify-between text-sm text-zinc-400">
          <a routerLink="/admin" class="hover:text-zinc-100">Admin</a>
          <a routerLink="/blog" class="hover:text-zinc-100">Blog</a>
        </nav>

        <header class="grid gap-5 border-b border-zinc-800 pb-8 md:grid-cols-[1fr_auto] md:items-end">
          <div class="space-y-3">
            <p class="text-sm uppercase tracking-[0.3em] text-cyan-300">CMS</p>
            <h1 class="text-4xl font-semibold text-zinc-50">Posts</h1>
            <p class="max-w-2xl text-zinc-400">Draft, scheduled, published, and archived entries using the shared blog content model.</p>
          </div>
          <div class="flex flex-wrap gap-3">
            <a
              routerLink="/admin/cms/new"
              class="inline-flex justify-center border border-cyan-400 px-4 py-2 text-sm font-medium text-cyan-200 hover:bg-cyan-400 hover:text-zinc-950"
            >
              New Post
            </a>
            <a
              routerLink="/admin/cms/media-library"
              class="inline-flex justify-center border border-zinc-700 px-4 py-2 text-sm font-medium text-zinc-200 hover:bg-zinc-800"
            >
              Media Library
            </a>
          </div>
        </header>

        <section class="overflow-x-auto border border-zinc-800">
          <table class="min-w-full divide-y divide-zinc-800 text-left text-sm">
            <thead class="bg-zinc-900 text-xs uppercase tracking-wide text-zinc-500">
              <tr>
                <th class="px-4 py-3 font-medium">Title</th>
                <th class="px-4 py-3 font-medium">Status</th>
                <th class="px-4 py-3 font-medium">Category</th>
                <th class="px-4 py-3 font-medium">Updated</th>
                <th class="px-4 py-3 font-medium">Published</th>
                <th class="px-4 py-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-zinc-800">
              @for (row of rows; track row.post.id) {
                <tr class="bg-zinc-950">
                  <td class="px-4 py-4">
                    <p class="font-medium text-zinc-50">{{ row.post.title }}</p>
                    <p class="mt-1 max-w-xl text-zinc-500">{{ row.post.excerpt }}</p>
                  </td>
                  <td class="px-4 py-4">
                    <span [class]="statusClass(row.post.status)">{{ row.post.status }}</span>
                  </td>
                  <td class="px-4 py-4 text-zinc-400">
                    {{ row.post.categories.join(', ') }}
                  </td>
                  <td class="px-4 py-4 text-zinc-400">{{ row.updatedAt }}</td>
                  <td class="px-4 py-4 text-zinc-400">{{ row.publishedAt }}</td>
                  <td class="space-x-4 px-4 py-4">
                    <a [routerLink]="['/admin/cms', row.post.slug, 'edit']" class="text-cyan-300 hover:text-cyan-200">Edit</a>
                    @if (row.post.status === 'published') {
                      <a [routerLink]="['/blog', row.post.slug]" class="text-cyan-300 hover:text-cyan-200">View</a>
                    } @else {
                      <span class="text-zinc-600">Hidden</span>
                    }
                    <button type="button" class="text-red-300 hover:text-red-200" (click)="deletePost(row.post)">
                      Delete
                    </button>
                  </td>
                </tr>
              }
            </tbody>
          </table>
        </section>

        @if (deleteMessage) {
          <p
            class="border border-emerald-500/50 bg-emerald-950/30 px-4 py-3 text-sm text-emerald-200">{{ deleteMessage }}</p>
        }
      </section>
    </main>
  `,
})
export class CmsPostListComponent {
  private readonly blogRepository = inject(BlogRepositoryService);

  protected rows: readonly AdminPostRow[] = this.createRows();
  protected deleteMessage = '';

  protected statusClass(status: BlogPostStatus): string {
    const baseClass = 'rounded border px-2 py-1 text-xs uppercase tracking-wide';

    switch (status) {
      case 'published':
        return `${baseClass} border-emerald-500/60 text-emerald-300`;
      case 'draft':
        return `${baseClass} border-amber-500/60 text-amber-300`;
      case 'scheduled':
        return `${baseClass} border-cyan-500/60 text-cyan-300`;
      case 'archived':
        return `${baseClass} border-zinc-600 text-zinc-400`;
    }
  }

  protected deletePost(post: BlogPost): void {
    const confirmed = window.confirm(`Delete "${post.title}" from the CMS? Seed posts will be archived instead of removed.`);

    if (!confirmed) {
      return;
    }

    const result = this.blogRepository.deletePost(post.id);

    this.rows = this.createRows();
    this.deleteMessage = this.getDeleteMessage(result, post.title);
  }

  private createRows(): readonly AdminPostRow[] {
    return this.blogRepository.getAdminPosts().map(post => ({
      post,
      updatedAt: formatDate(post.updatedAt),
      publishedAt: formatDate(post.publishedAt),
    }));
  }

  private getDeleteMessage(result: BlogPostDeleteResult, title: string): string {
    switch (result) {
      case 'archived-seed-post':
        return `Archived seeded post "${title}" instead of deleting source content.`;
      case 'deleted-local-post':
        return `Deleted local CMS post "${title}".`;
      case 'not-found':
        return `Could not delete "${title}" because it was not found.`;
    }
  }
}
