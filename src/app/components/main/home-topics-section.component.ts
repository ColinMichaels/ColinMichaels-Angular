import {ChangeDetectionStrategy, Component, computed, inject} from '@angular/core';
import {toSignal} from '@angular/core/rxjs-interop';
import {RouterLink} from '@angular/router';

import {PATH_NAMES} from '../../app-route-paths';
import {TopicHubRepositoryService} from '../../features/topics/services/topic-hub-repository.service';
import type {TopicHub} from '../../features/topics/topic-hubs.data';
import {HomeBlogPostFeedService} from './home-blog-post-feed.service';
import {postMatchesHubTerms} from './home-blog-section.utils';

@Component({
  selector: 'app-home-topics-section',
  imports: [RouterLink],
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section id="topic-guides" class="home-topic-strip" aria-labelledby="home-topic-strip-heading">
      <div class="home-topic-strip__inner">
        <h2 id="home-topic-strip-heading">Browse by topic</h2>
        <nav class="home-topic-strip__links" aria-label="Topic guides">
          @for (topic of topicHubCards(); track topic.slug) {
            <a
              [routerLink]="['/', pathNames.TOPICS, topic.slug]"
              [style.--topic-accent]="topic.theme.accentStrong"
              [attr.aria-label]="topic.title + ', ' + topic.count + ' posts'"
            >
              <span class="home-topic-strip__icon" aria-hidden="true">
                @switch (topic.theme.icon) {
                  @case ('spark') {
                    <svg viewBox="0 0 32 32"><path d="m16 3 3.4 9.6L29 16l-9.6 3.4L16 29l-3.4-9.6L3 16l9.6-3.4L16 3Z"></path></svg>
                  }
                  @case ('heart') {
                    <svg viewBox="0 0 32 32"><path d="M4 16h6l3-6 5 12 3-6h7"></path><path d="M16 27C8 21 5 17 5 11.5A6.5 6.5 0 0 1 16 7a6.5 6.5 0 0 1 11 4.5C27 17 24 21 16 27Z"></path></svg>
                  }
                  @case ('flask') {
                    <svg viewBox="0 0 32 32"><path d="M11 4h10M13 4v8L6 25a2 2 0 0 0 1.8 3h16.4a2 2 0 0 0 1.8-3l-7-13V4M10 22h12"></path></svg>
                  }
                  @case ('gamepad') {
                    <svg viewBox="0 0 32 32"><path d="M10 10h12a7 7 0 0 1 7 7v5c0 3-3.5 4.5-5.4 2.4L20 21h-8l-3.6 3.4C6.5 26.5 3 25 3 22v-5a7 7 0 0 1 7-7Z"></path><path d="M9 16h6M12 13v6M21 15h.01M25 18h.01"></path></svg>
                  }
                  @case ('flight') {
                    <svg viewBox="0 0 32 32"><path d="M8 10h16M8 22h16M10 8v16M22 8v16"></path><circle cx="6" cy="8" r="3"></circle><circle cx="26" cy="8" r="3"></circle><circle cx="6" cy="24" r="3"></circle><circle cx="26" cy="24" r="3"></circle><path d="m12 16 4-3 4 3-4 3-4-3Z"></path></svg>
                  }
                  @default {
                    <svg viewBox="0 0 32 32"><path d="M16 3 27 9v14l-11 6-11-6V9l11-6Z"></path><path d="m5 9 11 6 11-6M16 15v14"></path></svg>
                  }
                }
              </span>
              <span class="home-topic-strip__copy">
                <strong>{{ topic.title }}</strong>
                <small>{{ topic.count }} post{{ topic.count === 1 ? '' : 's' }}</small>
              </span>
              <svg class="home-topic-strip__arrow" viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h13"></path><path d="m13 6 6 6-6 6"></path></svg>
            </a>
          }
        </nav>
      </div>
    </section>
  `,
  styles: [`
    :host {
      display: block;
    }

    .home-topic-strip {
      scroll-margin-top: calc(var(--site-header-sticky-height) + 0.75rem);
      border-block: 1px solid var(--site-border);
      background: #020811;
      color: #f8fafc;
      padding-block: clamp(2rem, 4vw, 3rem);
    }

    .home-topic-strip__inner {
      width: min(100%, 92rem);
      margin-inline: auto;
      padding-inline: clamp(1rem, 4vw, 3rem);
    }

    .home-topic-strip h2 {
      margin: 0;
      font-family: var(--font-editorial, Georgia, 'Times New Roman', serif);
      font-size: clamp(2rem, 3.5vw, 3rem);
      font-weight: 500;
      letter-spacing: -0.035em;
    }

    .home-topic-strip__links {
      display: grid;
      margin-top: 1.4rem;
      border-top: 1px solid rgba(148, 163, 184, 0.2);
    }

    .home-topic-strip__links a {
      --topic-accent: #67e8f9;
      display: grid;
      min-width: 0;
      grid-template-columns: 2rem minmax(0, 1fr) 1.2rem;
      gap: 0.85rem;
      align-items: center;
      border-bottom: 1px solid rgba(148, 163, 184, 0.2);
      padding: 1rem 0;
      color: #e2e8f0;
      text-decoration: none;
    }

    .home-topic-strip__links a:hover,
    .home-topic-strip__links a:focus-visible {
      color: var(--topic-accent);
    }

    .home-topic-strip__icon,
    .home-topic-strip__arrow {
      color: var(--topic-accent);
    }

    .home-topic-strip__icon svg,
    .home-topic-strip__arrow {
      width: 100%;
      height: auto;
      fill: none;
      stroke: currentColor;
      stroke-linecap: round;
      stroke-linejoin: round;
      stroke-width: 1.55;
    }

    .home-topic-strip__copy {
      display: grid;
      min-width: 0;
      gap: 0.18rem;
    }

    .home-topic-strip__copy strong {
      font-family: var(--font-accent);
      font-size: 0.95rem;
      font-weight: 600;
    }

    .home-topic-strip__copy small {
      color: #94a3b8;
      font-size: 0.75rem;
    }

    @media (min-width: 52rem) {
      .home-topic-strip__links {
        grid-template-columns: repeat(3, minmax(0, 1fr));
      }

      .home-topic-strip__links a {
        grid-template-columns: 1.75rem minmax(0, 1fr) 1rem;
        border-bottom: 0;
        padding-inline: 1rem;
      }

      .home-topic-strip__links a:nth-child(3n + 1) {
        padding-left: 0;
      }

      .home-topic-strip__links a:not(:nth-child(3n + 1)) {
        border-left: 1px solid rgba(148, 163, 184, 0.2);
      }

      .home-topic-strip__links a:nth-child(-n + 3) {
        border-bottom: 1px solid rgba(148, 163, 184, 0.2);
      }
    }

    @media (min-width: 80rem) {
      .home-topic-strip__links {
        grid-template-columns: repeat(6, minmax(0, 1fr));
      }

      .home-topic-strip__links a:not(:first-child) {
        border-left: 1px solid rgba(148, 163, 184, 0.2);
        padding-left: 1rem;
      }

      .home-topic-strip__links a:nth-child(-n + 3) {
        border-bottom: 0;
      }
    }
  `],
})
export class HomeTopicsSectionComponent {
  private readonly blogPostFeed = inject(HomeBlogPostFeedService);
  private readonly topicHubRepository = inject(TopicHubRepositoryService);

  protected readonly allPublishedPosts = this.blogPostFeed.publishedPosts;
  protected readonly topicHubs = toSignal(
    this.topicHubRepository.getPublishedTopicHubs$(),
    {initialValue: this.topicHubRepository.getPublishedTopicHubs()}
  );
  protected readonly topicHubCards = computed<readonly (TopicHub & {count: number})[]>(() => (
    this.topicHubs().map(hub => ({
      ...hub,
      count: this.allPublishedPosts().filter(post => postMatchesHubTerms(post, hub.terms)).length,
    }))
  ));
  protected readonly pathNames = PATH_NAMES;
}
