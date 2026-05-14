import {Component, inject} from '@angular/core';
import {Meta, Title} from '@angular/platform-browser';
import {ActivatedRoute, RouterLink} from '@angular/router';

import {BlogBlockRendererComponent} from '../../components/block-renderer/blog-block-renderer.component';
import {BlogRepositoryService} from '../../services/blog-repository.service';

@Component({
  selector: 'app-blog-detail',
  imports: [
    BlogBlockRendererComponent,
    RouterLink,
  ],
  template: `
    <main class="min-h-screen bg-zinc-950 px-5 py-10 text-zinc-100 sm:px-8 lg:px-12">
      <article class="mx-auto max-w-3xl">
        <nav class="mb-10 flex items-center justify-between text-sm text-zinc-400">
          <a routerLink="/blog" class="hover:text-zinc-100">Blog</a>
          <a routerLink="/" class="hover:text-zinc-100">Home</a>
        </nav>

        @if (post; as currentPost) {
          <header class="mb-10 space-y-5 border-b border-zinc-800 pb-8">
            <div class="flex flex-wrap gap-2 text-sm text-cyan-300">
              @for (category of currentPost.categories; track category) {
                <span>{{ category }}</span>
              }
            </div>
            <h1 class="text-4xl font-semibold leading-tight text-zinc-50 sm:text-5xl">{{ currentPost.title }}</h1>
            <p class="text-lg leading-8 text-zinc-400">{{ currentPost.excerpt }}</p>
            <img
              [src]="currentPost.coverImage"
              [alt]="currentPost.title + ' cover image'"
              class="aspect-[16/9] w-full rounded object-cover"
            >
          </header>

          <app-blog-block-renderer [blocks]="currentPost.blocks" [fallbackAlt]="currentPost.title"></app-blog-block-renderer>
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
  private readonly title = inject(Title);
  private readonly meta = inject(Meta);
  private readonly slug = this.route.snapshot.paramMap.get('slug') ?? '';

  protected readonly post = this.blogRepository.getPublishedPostBySlug(this.slug);

  constructor() {
    this.applySeoMetadata();
  }

  private applySeoMetadata(): void {
    if (!this.post) {
      this.title.setTitle('Post not found | ColinMichaels.com');
      this.meta.updateTag({
        name: 'description',
        content: 'This post is unavailable or has not been published.',
      });
      return;
    }

    this.title.setTitle(this.post.seo.title);
    this.meta.updateTag({name: 'description', content: this.post.seo.description});
    this.meta.updateTag({property: 'og:title', content: this.post.seo.title});
    this.meta.updateTag({property: 'og:description', content: this.post.seo.description});
    this.meta.updateTag({property: 'og:type', content: 'article'});
    this.meta.updateTag({property: 'og:image', content: this.post.seo.openGraphImage ?? this.post.coverImage});
  }
}
