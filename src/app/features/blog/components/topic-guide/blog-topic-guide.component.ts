import {ChangeDetectionStrategy, Component, input} from '@angular/core';
import {RouterLink} from '@angular/router';

import {PATH_NAMES} from '../../../../app-route-paths';
import type {TopicHub} from '../../../topics/topic-hubs.data';

@Component({
  selector: 'app-blog-topic-guide',
  imports: [RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <aside
      class="article-topic-guide grid gap-5 p-5 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center sm:p-6"
      [style.--article-topic-accent]="topic().theme.accent"
      aria-labelledby="article-topic-guide-heading"
    >
      <div>
        <p class="site-meta article-topic-guide__eyebrow">Continue exploring</p>
        <h2
          id="article-topic-guide-heading"
          class="mt-2 text-xl font-semibold leading-tight text-slate-950 dark:text-zinc-50"
        >
          More in {{ topic().title }}
        </h2>
        <p class="mt-2 max-w-2xl text-sm leading-6 text-slate-600 dark:text-zinc-300">
          {{ topic().summary }}
        </p>
      </div>

      <a
        [routerLink]="['/', pathNames.TOPICS, topic().slug]"
        class="article-topic-guide__link inline-flex min-h-11 items-center justify-center gap-2 rounded-md border px-4 py-2.5 text-center text-sm font-semibold transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
      >
        Explore {{ topic().theme.shortLabel }}
        <span aria-hidden="true">&rarr;</span>
      </a>
    </aside>
  `,
  styles: `
    :host {
      display: block;
      margin-top: 3rem;
    }

    .article-topic-guide {
      border: 1px solid color-mix(in srgb, var(--article-topic-accent) 40%, var(--site-border));
      border-left: 0.25rem solid var(--article-topic-accent);
      background:
        linear-gradient(
          120deg,
          color-mix(in srgb, var(--article-topic-accent) 8%, transparent),
          transparent 60%
        ),
        var(--site-panel);
    }

    .article-topic-guide__eyebrow {
      color: color-mix(in srgb, var(--article-topic-accent) 72%, var(--site-text));
    }

    .article-topic-guide__link {
      border-color: color-mix(in srgb, var(--article-topic-accent) 55%, var(--site-border));
      color: var(--site-text);
      outline-color: var(--article-topic-accent);
    }

    .article-topic-guide__link:hover {
      border-color: var(--article-topic-accent);
      background: color-mix(in srgb, var(--article-topic-accent) 12%, transparent);
    }
  `,
})
export class BlogTopicGuideComponent {
  readonly topic = input.required<TopicHub>();
  protected readonly pathNames = PATH_NAMES;
}
