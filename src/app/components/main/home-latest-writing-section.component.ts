import {DatePipe, NgStyle} from '@angular/common';
import {ChangeDetectionStrategy, Component, computed, inject} from '@angular/core';
import {toSignal} from '@angular/core/rxjs-interop';
import {RouterLink} from '@angular/router';

import {PATH_NAMES} from '../../app-route-paths';
import {BlogPostSummary} from '../../features/blog/models/blog-post.model';
import {BlogRepositoryService} from '../../features/blog/services/blog-repository.service';
import {TopicHubRepositoryService} from '../../features/topics/services/topic-hub-repository.service';
import type {TopicHub} from '../../features/topics/topic-hubs.data';
import {postMatchesHubTerms} from './home-blog-section.utils';

@Component({
  selector: 'app-home-latest-writing-section',
  imports: [
    DatePipe,
    NgStyle,
    RouterLink,
  ],
  standalone: true,
  changeDetection: ChangeDetectionStrategy.Eager,
  template: `
    <section id="blog" class="site-section home-latest-section">
      <div class="site-section-header">
        <div>
          <h2 class="mt-3 heading-section">Latest writing</h2>
        </div>
        <a [routerLink]="['/', pathNames.BLOG]" class="btn-link">
          View all posts
        </a>
      </div>

      @if (blogLoadError(); as error) {
        <div class="site-error-panel mt-8">
          <p class="font-medium text-rose-950 dark:text-red-100">Unable to load latest posts.</p>
          <p class="mt-2 text-sm">{{ error }}</p>
        </div>
      } @else {
        @defer (when !blogIsLoading()) {
          <div class="site-card-grid">
            @for (post of publishedPosts(); track post.id; let first = $first) {
              <article
                class="site-card flex h-full flex-col overflow-hidden"
                [class.home-featured-post-card]="first && post.featured"
                [class.home-topic-post-card]="postTopic(post) !== null"
                [ngStyle]="postTopicStyle(post)"
              >
                <a [routerLink]="['/', pathNames.BLOG, post.slug]"
                   class="site-media-link blog-post-image-frame group aspect-[16/9]">
                  <img [src]="postImage(post)" [alt]="post.title + ' cover image'"
                       class="blog-post-image-fill"
                       loading="lazy">
                </a>
                <div class="site-card-body flex flex-1 flex-col">
                  <div class="flex flex-wrap items-center gap-2">
                    @if (first && post.featured) {
                      <span class="home-featured-post-label">Featured</span>
                    }
                    @if (postTopic(post); as topic) {
                      <span class="home-topic-post-label">{{ topic.theme.shortLabel }}</span>
                    }
                    <p class="site-meta">
                      {{ (post.publishedAt || post.updatedAt) | date: 'MMM d, y':'UTC' }}
                    </p>
                  </div>
                  <h3 class="mt-3 heading-card">
                    <a [routerLink]="['/', pathNames.BLOG, post.slug]" class="hover:text-cyan-300">{{ post.title }}</a>
                  </h3>
                  <p class="mt-3 text-body">{{ post.excerpt }}</p>
                  <div class="mt-auto pt-5">
                    <a
                      [routerLink]="['/', pathNames.BLOG, post.slug]"
                      class="btn-secondary"
                    >
                      Read more
                    </a>
                  </div>
                </div>
              </article>
            } @empty {
              <p class="site-empty-panel">No published posts yet.</p>
            }
          </div>
        } @placeholder (minimum 300ms) {
          <div class="site-card-grid">
            @for (i of [1, 2, 3]; track i) {
              <article class="site-skeleton-card" aria-hidden="true">
                <div class="site-skeleton-block aspect-[16/9] w-full"></div>
                <div class="flex flex-1 flex-col gap-3 p-5">
                  <div class="site-skeleton-block h-3 w-24"></div>
                  <div class="site-skeleton-block h-6 w-3/4"></div>
                  <div class="space-y-2">
                    <div class="site-skeleton-block h-3 w-full"></div>
                    <div class="site-skeleton-block h-3 w-4/5"></div>
                  </div>
                </div>
              </article>
            }
          </div>
        }
      }
    </section>
  `,
  styles: [`
    .home-topic-post-card {
      border-color: rgb(var(--post-topic-accent-rgb) / 0.28);
      background:
        linear-gradient(135deg, rgb(var(--post-topic-accent-rgb) / 0.08), rgba(255, 255, 255, 0.98) 44%),
        #ffffff;
    }

    .home-featured-post-card {
      border-color: rgb(var(--post-topic-accent-rgb, 34 211 238) / 0.45);
      background:
        linear-gradient(135deg, rgb(var(--post-topic-accent-rgb, 34 211 238) / 0.14), rgba(255, 255, 255, 0.96) 42%),
        #ffffff;
      box-shadow: 0 22px 55px rgba(15, 23, 42, 0.12);
    }

    .home-featured-post-label,
    .home-topic-post-label {
      border: 1px solid rgb(var(--post-topic-accent-rgb, 34 211 238) / 0.32);
      background: rgb(var(--post-topic-accent-rgb, 34 211 238) / 0.1);
      color: color-mix(in srgb, var(--post-topic-accent, #22d3ee) 58%, #0f172a);
      font-family: var(--font-accent);
      font-size: 0.68rem;
      font-weight: 700;
      letter-spacing: 0.16em;
      line-height: 1;
      padding: 0.35rem 0.5rem;
      text-transform: uppercase;
    }

    .home-topic-post-label {
      border-color: rgb(var(--post-topic-accent-rgb) / 0.28);
    }

    .home-topic-post-card .btn-secondary {
      border-color: rgb(var(--post-topic-accent-rgb) / 0.55);
      color: color-mix(in srgb, var(--post-topic-accent) 62%, #0f172a);
    }

    .home-topic-post-card .btn-secondary:hover {
      background: var(--post-topic-accent);
      color: #ffffff;
    }

    .home-topic-post-card .heading-card a:hover {
      color: color-mix(in srgb, var(--post-topic-accent) 68%, #0f172a);
    }

    :host-context(.dark) .home-featured-post-card {
      background:
        linear-gradient(135deg, rgb(var(--post-topic-accent-rgb, 34 211 238) / 0.16), rgba(24, 24, 27, 0.78) 46%),
        rgba(24, 24, 27, 0.72);
      box-shadow: 0 22px 55px rgba(0, 0, 0, 0.28);
    }

    :host-context(.dark) .home-topic-post-card {
      background:
        linear-gradient(135deg, rgb(var(--post-topic-accent-rgb) / 0.12), rgba(24, 24, 27, 0.78) 46%),
        rgba(24, 24, 27, 0.72);
    }

    :host-context(.dark) .home-featured-post-label,
    :host-context(.dark) .home-topic-post-label {
      border-color: rgb(var(--post-topic-accent-rgb, 34 211 238) / 0.36);
      background: rgb(var(--post-topic-accent-rgb, 34 211 238) / 0.14);
      color: var(--post-topic-accent-strong, #a5f3fc);
    }

    :host-context(.dark) .home-topic-post-card .btn-secondary {
      border-color: rgb(var(--post-topic-accent-rgb) / 0.5);
      color: var(--post-topic-accent-strong);
    }

    :host-context(.dark) .home-topic-post-card .btn-secondary:hover {
      background: var(--post-topic-accent);
      color: #09090b;
    }

    :host-context(.dark) .home-topic-post-card .heading-card a:hover {
      color: var(--post-topic-accent-strong);
    }

    @media (min-width: 1024px) {
      .home-featured-post-card {
        grid-column: span 2;
      }
    }
  `],
})
export class HomeLatestWritingSectionComponent {
  private readonly blogRepository = inject(BlogRepositoryService);
  private readonly topicHubRepository = inject(TopicHubRepositoryService);

  protected readonly allPublishedPosts = toSignal(
    this.blogRepository.getPublishedPosts$(),
    {initialValue: []}
  );
  protected readonly topicHubs = toSignal(
    this.topicHubRepository.getPublishedTopicHubs$(),
    {initialValue: this.topicHubRepository.getPublishedTopicHubs()}
  );
  protected readonly publishedPosts = computed(() => {
    const posts = this.allPublishedPosts();
    const featuredPost = posts.find(post => post.featured);

    if (!featuredPost) {
      return posts.slice(0, 3);
    }

    return [
      featuredPost,
      ...posts.filter(post => post.id !== featuredPost.id),
    ].slice(0, 3);
  });
  protected readonly topicByPostId = computed(() => {
    const topics = this.topicHubs();

    return new Map(
      this.allPublishedPosts().map(post => [
        post.id,
        topics.find(topic => postMatchesHubTerms(post, topic.terms)) ?? null,
      ])
    );
  });
  protected readonly blogIsLoading = toSignal(this.blogRepository.loading$, {initialValue: true});
  protected readonly blogLoadError = toSignal(this.blogRepository.error$, {initialValue: null});
  protected readonly pathNames = PATH_NAMES;

  protected postImage(post: BlogPostSummary): string {
    return post.thumbnailImage?.trim() || post.coverImage;
  }

  protected postTopic(post: BlogPostSummary): TopicHub | null {
    return this.topicByPostId().get(post.id) ?? null;
  }

  protected postTopicStyle(post: BlogPostSummary): Record<string, string> | null {
    const topic = this.postTopic(post);

    if (!topic) {
      return null;
    }

    return {
      '--post-topic-accent': topic.theme.accent,
      '--post-topic-accent-strong': topic.theme.accentStrong,
      '--post-topic-accent-rgb': topic.theme.accentRgb,
    };
  }
}
