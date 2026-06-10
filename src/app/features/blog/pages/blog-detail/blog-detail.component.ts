import {DatePipe} from '@angular/common';
import {Component, effect, inject, signal, ChangeDetectionStrategy} from '@angular/core';
import {toSignal} from '@angular/core/rxjs-interop';
import {ActivatedRoute, RouterLink} from '@angular/router';

import {PATH_NAMES} from '../../../../app-route-paths';
import {BlogBlockRendererComponent} from '../../components/block-renderer/blog-block-renderer.component';
import {BlogShareActionsComponent} from '../../components/share-actions/blog-share-actions.component';
import {BlogOpenGraphService, BlogShareMetadata} from '../../services/blog-open-graph.service';
import {BlogRepositoryService} from '../../services/blog-repository.service';

@Component({
  selector: 'app-blog-detail',
  imports: [
    DatePipe,
    BlogBlockRendererComponent,
    BlogShareActionsComponent,
    RouterLink,
  ],
  changeDetection: ChangeDetectionStrategy.Eager,
  template: `
    <main class="min-h-screen bg-zinc-950 px-5 py-10 text-zinc-100 sm:px-8 lg:px-12">
      <article class="mx-auto max-w-3xl">
        <nav class="mb-10 flex items-center justify-between text-sm text-zinc-400">
          <a routerLink="/blog" class="hover:text-zinc-100">Blog</a>
          <a routerLink="/" class="hover:text-zinc-100">Home</a>
        </nav>

        @if (post(); as currentPost) {
          <header class="mb-10 space-y-5 border-b border-zinc-800 pb-8">
            <div class="flex flex-wrap gap-2 text-sm text-cyan-300">
              @for (category of currentPost.categories; track category) {
                <span>{{ category }}</span>
              }
            </div>
            <h1 class="text-4xl font-semibold leading-tight text-zinc-50 sm:text-5xl" [innerHTML]="currentPost.title"></h1>
            <p class="text-sm text-zinc-500">
              Posted {{ currentPost.publishedAt ? (currentPost.publishedAt | date: 'MMM d, y') : (currentPost.updatedAt | date: 'MMM d, y') }}
            </p>
            <p class="text-lg leading-8 text-zinc-400" [innerHTML]="currentPost.excerpt"></p>
            @if (shareMetadata(); as share) {
              <app-blog-share-actions
                [title]="share.title"
                [excerpt]="share.description"
                [path]="pathNames.BLOG + '/' + currentPost.slug"
                [url]="share.url"
                variant="panel"
              ></app-blog-share-actions>
            }
            <img
              [src]="currentPost.coverImage"
              [alt]="currentPost.title + ' cover image'"
              class="aspect-[16/9] w-full rounded object-cover"
            >
          </header>

          <app-blog-block-renderer [blocks]="currentPost.blocks" [fallbackAlt]="currentPost.title"></app-blog-block-renderer>
        } @else if (loadError(); as error) {
          <section class="rounded border border-zinc-800 bg-zinc-900 p-6">
            <h1 class="text-2xl font-semibold text-zinc-50">Unable to load post</h1>
            <p class="mt-2 text-zinc-400">{{ error }}</p>
            <a routerLink="/blog" class="mt-5 inline-block text-cyan-300 hover:text-cyan-200">Back to blog</a>
          </section>
        } @else if (isLoading()) {
          <section class="rounded border border-zinc-800 bg-zinc-900 p-6">
            <h1 class="text-2xl font-semibold text-zinc-50">Loading post</h1>
            <p class="mt-2 text-zinc-400">Fetching the latest post data from Firestore.</p>
          </section>
        } @else {
          <section class="rounded border border-zinc-800 bg-zinc-900 p-6">
            <h1 class="text-2xl font-semibold text-zinc-50">Post not found</h1>
            <p class="mt-2 text-zinc-400">This post is unavailable or has not been published.</p>
            <a routerLink="/blog" class="mt-5 inline-block text-cyan-300 hover:text-cyan-200">Back to blog</a>
          </section>
        }
      </article>
    </main>
  `,
})
export class BlogDetailComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly blogRepository = inject(BlogRepositoryService);
  private readonly openGraph = inject(BlogOpenGraphService);
  private readonly slug = this.route.snapshot.paramMap.get('slug') ?? '';

  protected readonly pathNames = PATH_NAMES;
  protected readonly post = toSignal(this.blogRepository.getPublishedPostBySlug$(this.slug), {initialValue: undefined});
  protected readonly isLoading = toSignal(this.blogRepository.loading$, {initialValue: true});
  protected readonly loadError = toSignal(this.blogRepository.error$, {initialValue: null});
  protected readonly shareMetadata = signal<BlogShareMetadata | null>(null);

  constructor() {
    effect(() => {
      const post = this.post();

      if (post) {
        this.shareMetadata.set(this.openGraph.applyBlogPost(post));
        return;
      }

      this.shareMetadata.set(null);

      if (!this.isLoading() && !this.loadError()) {
        this.openGraph.applyMissingBlogPost(this.slug);
      }
    });
  }
}
