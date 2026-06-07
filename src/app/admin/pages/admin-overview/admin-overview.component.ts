import {Component, inject} from '@angular/core';
import {RouterLink} from '@angular/router';

import {BlogRepositoryService} from '../../../features/blog/services/blog-repository.service';

@Component({
  selector: 'app-admin-overview',
  imports: [
    RouterLink,
  ],
  template: `
    <main class="min-h-screen bg-zinc-950 px-5 py-10 text-zinc-100 sm:px-8 lg:px-12">
      <section class="mx-auto max-w-5xl space-y-8">
        <nav class="flex items-center justify-between text-sm text-zinc-400">
          <a routerLink="/" class="hover:text-zinc-100">Home</a>
          <a routerLink="/blog" class="hover:text-zinc-100">Blog</a>
        </nav>

        <header class="space-y-3 border-b border-zinc-800 pb-8">
          <p class="text-sm uppercase tracking-[0.3em] text-cyan-300">Admin</p>
          <h1 class="text-4xl font-semibold text-zinc-50">Publishing Console</h1>
          <p class="max-w-2xl text-zinc-400">Manage posts, drafts, and future media workflows from one protected area.</p>
        </header>

        <section class="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div class="border border-zinc-800 bg-zinc-900 p-4">
            <p class="text-sm text-zinc-500">Total Posts</p>
            <p class="mt-2 text-3xl font-semibold">{{ stats.total }}</p>
          </div>
          <div class="border border-zinc-800 bg-zinc-900 p-4">
            <p class="text-sm text-zinc-500">Published</p>
            <p class="mt-2 text-3xl font-semibold">{{ stats.published }}</p>
          </div>
          <div class="border border-zinc-800 bg-zinc-900 p-4">
            <p class="text-sm text-zinc-500">Drafts</p>
            <p class="mt-2 text-3xl font-semibold">{{ stats.drafts }}</p>
          </div>
          <div class="border border-zinc-800 bg-zinc-900 p-4">
            <p class="text-sm text-zinc-500">Scheduled</p>
            <p class="mt-2 text-3xl font-semibold">{{ stats.scheduled }}</p>
          </div>
        </section>

        <section class="flex flex-wrap gap-3 border-t border-zinc-800 pt-6">
          <a routerLink="/admin/cms" class="inline-flex border border-cyan-400 px-4 py-2 text-sm font-medium text-cyan-200 hover:bg-cyan-400 hover:text-zinc-950">
            Open CMS
          </a>
          <a routerLink="/admin/cms/new" class="inline-flex border border-zinc-700 px-4 py-2 text-sm font-medium text-zinc-200 hover:bg-zinc-800">
            New Post
          </a>
        </section>
      </section>
    </main>
  `,
})
export class AdminOverviewComponent {
  private readonly blogRepository = inject(BlogRepositoryService);

  protected readonly stats = this.blogRepository.getAdminStats();
}
