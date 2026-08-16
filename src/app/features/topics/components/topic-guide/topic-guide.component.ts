import {ChangeDetectionStrategy, Component, computed, inject, input} from '@angular/core';

import {SiteAnalyticsService} from '../../../../shared/analytics/site-analytics.service';
import {TopicHub} from '../../topic-hubs.data';

function normalizeTitle(value: string): string {
  return value
    .normalize('NFKD')
    .toLowerCase()
    .replace(/&/g, 'and')
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

@Component({
  selector: 'app-topic-guide',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <article class="topic-guide" [attr.aria-label]="hub().theme.shortLabel + ' topic guide'">
      <section id="topic-start-here" class="topic-guide-section topic-guide-start" aria-labelledby="topic-guide-start-heading">
        <header class="topic-guide-heading">
          <p class="topic-guide-kicker">Start here</p>
          <h2 id="topic-guide-start-heading">{{ hub().asset.title }}</h2>
          <p class="topic-guide-intro">{{ hub().asset.intro }}</p>
        </header>

        <ol class="topic-guide-editorial-list">
          @for (item of hub().asset.items; track $index; let index = $index) {
            <li class="topic-guide-editorial-item">
              <span class="topic-guide-editorial-number" aria-hidden="true">{{ itemNumber(index) }}</span>
              <div>
                <h3>{{ item.label }}</h3>
                <p>{{ item.description }}</p>
              </div>
            </li>
          }
        </ol>
      </section>

      @if (featuredProject(); as project) {
        <aside class="topic-guide-featured" aria-labelledby="topic-guide-featured-heading">
          <div class="topic-guide-featured-copy">
            <p class="topic-guide-kicker">{{ project.label }}</p>
            <h2 id="topic-guide-featured-heading">{{ project.title }}</h2>
            <p>{{ project.description }}</p>
          </div>
          <a class="topic-guide-featured-link" [attr.href]="project.href">
            <span>{{ project.ctaLabel }}</span>
            <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
              <path d="M7 17L17 7"></path>
              <path d="M9 7h8v8"></path>
            </svg>
          </a>
        </aside>
      }

      <section id="topic-learning" class="topic-guide-section topic-guide-learning" aria-labelledby="topic-guide-learning-heading">
        <header class="topic-guide-heading topic-guide-heading-compact">
          <p class="topic-guide-kicker">Learning path</p>
          <h2 id="topic-guide-learning-heading">A practical route through {{ hub().theme.shortLabel }}</h2>
        </header>

        <ol class="topic-guide-route" [attr.aria-label]="hub().theme.shortLabel + ' learning route'">
          @for (step of hub().learningPath; track $index) {
            <li>
              <span class="topic-guide-route-label" aria-hidden="true">{{ step.label }}</span>
              <div>
                <h3>{{ step.title }}</h3>
                <p>{{ step.description }}</p>
              </div>
            </li>
          }
        </ol>
      </section>

      <section id="topic-reference" class="topic-guide-reference" aria-label="Topic reference">
        <div class="topic-guide-checklist">
          <h2>Keep in mind</h2>
          <ul>
            @for (item of hub().checklist; track $index) {
              <li>{{ item }}</li>
            }
          </ul>

          @if (hub().slug === 'recovery-planning') {
            <p class="topic-guide-disclaimer" role="note">
              Health-related writing here is personal experience and organization help only, not medical advice.
            </p>
          }
        </div>

        <nav class="topic-guide-resources" aria-labelledby="topic-guide-resources-heading">
          <h2 id="topic-guide-resources-heading">Resources</h2>
          <div class="topic-guide-resource-list">
            @for (resource of hub().resources; track $index) {
              <a
                [attr.href]="resource.href"
                [attr.download]="resourceDownloadName(resource.href)"
                [attr.target]="isExternalResource(resource.href) ? '_blank' : null"
                [attr.rel]="isExternalResource(resource.href) ? 'noopener noreferrer' : null"
                (click)="trackResourceSelection(resource.href)"
              >
                <span>
                  <strong>{{ resource.label }}</strong>
                  <span class="topic-guide-resource-description">{{ resource.description }}</span>
                </span>
                <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
                  <path d="M9 5l7 7-7 7"></path>
                </svg>
              </a>
            }
          </div>
        </nav>
      </section>
    </article>
  `,
  styles: [`
    :host {
      --topic-guide-accent: var(--topic-accent, var(--site-accent));
      --topic-guide-accent-strong: var(--topic-accent-readable, var(--topic-accent-strong, var(--site-accent-strong)));
      --topic-guide-accent-rgb: var(--topic-accent-rgb, var(--site-accent-rgb));
      display: block;
    }

    .topic-guide {
      color: var(--site-text);
    }

    .topic-guide-section,
    .topic-guide-featured,
    .topic-guide-reference {
      border-top: 1px solid var(--site-border);
      padding-block: clamp(1.75rem, 4vw, 2.75rem);
      scroll-margin-top: 5.5rem;
    }

    .topic-guide-heading {
      max-width: 49rem;
    }

    .topic-guide-heading-compact {
      max-width: none;
    }

    .topic-guide-kicker {
      color: var(--topic-guide-accent-strong);
      font-family: var(--font-accent);
      font-size: 0.75rem;
      font-weight: 700;
      letter-spacing: 0.14em;
      line-height: 1.2;
      text-transform: uppercase;
    }

    .topic-guide h2,
    .topic-guide h3,
    .topic-guide p {
      margin: 0;
    }

    .topic-guide h2 {
      margin-top: 0.55rem;
      color: var(--site-heading);
      font-family: var(--font-subheading);
      font-size: clamp(1.4rem, 2.6vw, 2rem);
      font-weight: 600;
      line-height: 1.18;
    }

    .topic-guide .topic-guide-intro {
      margin-top: 0.8rem;
      max-width: 45rem;
      color: var(--site-muted);
      font-size: 1rem;
      line-height: 1.68;
    }

    .topic-guide-editorial-list {
      margin: clamp(1.25rem, 3vw, 2rem) 0 0;
      padding: 0;
      border-bottom: 1px solid var(--site-border);
      list-style: none;
    }

    .topic-guide-editorial-item {
      display: grid;
      grid-template-columns: 3rem minmax(0, 1fr);
      gap: clamp(0.8rem, 2vw, 1.35rem);
      border-top: 1px solid var(--site-border);
      padding-block: 1rem;
    }

    .topic-guide-editorial-number {
      color: var(--topic-guide-accent-strong);
      font-family: var(--font-accent);
      font-size: 0.78rem;
      font-weight: 700;
      letter-spacing: 0.1em;
      line-height: 1.6;
    }

    .topic-guide-editorial-item h3,
    .topic-guide-route h3 {
      color: var(--site-heading);
      font-family: var(--font-subheading);
      font-size: 1.02rem;
      font-weight: 600;
      line-height: 1.35;
    }

    .topic-guide-editorial-item p,
    .topic-guide-route p,
    .topic-guide-featured-copy > p:last-child {
      margin-top: 0.35rem;
      color: var(--site-muted);
      line-height: 1.58;
    }

    .topic-guide-featured {
      display: grid;
      grid-template-columns: minmax(0, 1fr) auto;
      gap: 1.5rem;
      align-items: end;
      border-bottom: 1px solid var(--site-border);
      background: linear-gradient(90deg, rgb(var(--topic-guide-accent-rgb) / 0.08), transparent 58%);
      padding-inline: clamp(0.9rem, 2.5vw, 1.4rem);
    }

    .topic-guide-featured-copy {
      max-width: 42rem;
    }

    .topic-guide-featured-link {
      display: inline-flex;
      min-height: 2.75rem;
      align-items: center;
      justify-content: space-between;
      gap: 1rem;
      border: 1px solid rgb(var(--topic-guide-accent-rgb) / 0.52);
      color: var(--site-heading);
      font-family: var(--font-accent);
      font-size: 0.9rem;
      font-weight: 700;
      padding: 0.65rem 0.8rem;
      text-decoration: none;
      transition: border-color 160ms ease, background-color 160ms ease, color 160ms ease;
    }

    .topic-guide-featured-link svg,
    .topic-guide-resources svg {
      width: 1.15rem;
      height: 1.15rem;
      flex: 0 0 auto;
      fill: none;
      stroke: currentColor;
      stroke-linecap: round;
      stroke-linejoin: round;
      stroke-width: 2;
    }

    .topic-guide-featured-link:hover,
    .topic-guide-featured-link:focus-visible,
    .topic-guide-resources a:hover,
    .topic-guide-resources a:focus-visible {
      border-color: var(--topic-guide-accent);
      background: rgb(var(--topic-guide-accent-rgb) / 0.1);
      color: var(--topic-guide-accent-strong);
    }

    .topic-guide-featured-link:focus-visible,
    .topic-guide-resources a:focus-visible {
      outline: 2px solid var(--topic-guide-accent-strong);
      outline-offset: 0.2rem;
    }

    .topic-guide-route {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(10.5rem, 1fr));
      margin: 1.35rem 0 0;
      padding: 0;
      border-block: 1px solid var(--site-border);
      list-style: none;
    }

    .topic-guide-route li {
      display: grid;
      grid-template-columns: auto minmax(0, 1fr);
      gap: 0.7rem;
      align-content: start;
      padding: 0.9rem;
    }

    .topic-guide-route li + li {
      border-left: 1px solid var(--site-border);
    }

    .topic-guide-route-label {
      color: var(--topic-guide-accent-strong);
      font-family: var(--font-accent);
      font-size: 0.72rem;
      font-weight: 700;
      letter-spacing: 0.08em;
      line-height: 1.85;
    }

    .topic-guide-route p {
      font-size: 0.88rem;
    }

    .topic-guide-reference {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: clamp(1.5rem, 4vw, 3.5rem);
      border-bottom: 1px solid var(--site-border);
    }

    .topic-guide-reference h2 {
      margin-top: 0;
      font-size: clamp(1.25rem, 2vw, 1.55rem);
    }

    .topic-guide-checklist ul {
      display: grid;
      gap: 0.65rem;
      margin: 1rem 0 0;
      padding: 0;
      list-style: none;
    }

    .topic-guide-checklist li {
      position: relative;
      color: var(--site-muted);
      line-height: 1.5;
      padding-left: 1.05rem;
    }

    .topic-guide-checklist li::before {
      content: '';
      position: absolute;
      left: 0;
      top: 0.62em;
      width: 0.36rem;
      height: 0.36rem;
      border: 1px solid var(--topic-guide-accent);
    }

    .topic-guide .topic-guide-disclaimer {
      margin-top: 1.15rem;
      border-left: 1px solid #fb7185;
      color: var(--site-muted);
      font-size: 0.9rem;
      line-height: 1.55;
      padding-left: 0.75rem;
    }

    .topic-guide-resource-list {
      margin-top: 0.75rem;
      border-top: 1px solid var(--site-border);
    }

    .topic-guide-resources a {
      display: grid;
      grid-template-columns: minmax(0, 1fr) auto;
      gap: 1rem;
      align-items: center;
      border-bottom: 1px solid var(--site-border);
      color: var(--site-text);
      padding: 0.8rem 0.65rem;
      text-decoration: none;
      transition: background-color 160ms ease, border-color 160ms ease, color 160ms ease;
    }

    .topic-guide-resources strong,
    .topic-guide-resource-description {
      display: block;
    }

    .topic-guide-resources strong {
      color: var(--site-heading);
      font-family: var(--font-subheading);
      font-weight: 600;
    }

    .topic-guide-resource-description {
      margin-top: 0.2rem;
      color: var(--site-muted);
      font-size: 0.88rem;
      line-height: 1.45;
    }

    .topic-guide-resources svg {
      color: var(--topic-guide-accent-strong);
    }

    :host-context(.light) .topic-guide-featured {
      background: linear-gradient(90deg, rgb(var(--topic-guide-accent-rgb) / 0.07), transparent 58%);
    }

    @media (min-width: 761px) and (max-width: 920px) {
      .topic-guide-route {
        grid-template-columns: repeat(2, minmax(0, 1fr));
      }

      .topic-guide-route li:nth-child(odd) {
        border-left: 0;
      }

      .topic-guide-route li:nth-child(n + 3) {
        border-top: 1px solid var(--site-border);
      }
    }

    @media (max-width: 760px) {
      .topic-guide-featured,
      .topic-guide-reference {
        grid-template-columns: 1fr;
      }

      .topic-guide-featured {
        align-items: start;
      }

      .topic-guide-featured-link {
        width: fit-content;
      }

      .topic-guide-route {
        grid-template-columns: 1fr;
      }

      .topic-guide-route li + li {
        border-top: 1px solid var(--site-border);
        border-left: 0;
      }
    }

    @media (max-width: 460px) {
      .topic-guide-editorial-item {
        grid-template-columns: 2rem minmax(0, 1fr);
      }
    }

    @media (prefers-reduced-motion: reduce) {
      .topic-guide-featured-link,
      .topic-guide-resources a {
        transition: none;
      }
    }
  `],
})
export class TopicGuideComponent {
  readonly hub = input.required<TopicHub>();
  private readonly analytics = inject(SiteAnalyticsService);

  protected readonly featuredProject = computed(() => {
    const hub = this.hub();
    const project = hub.featuredProject;
    const hasCompleteProject = [
      project.label,
      project.title,
      project.description,
      project.href,
      project.ctaLabel,
    ].every(value => value.trim().length > 0);

    if (!hasCompleteProject || normalizeTitle(project.title) === normalizeTitle(hub.asset.title)) {
      return null;
    }

    return project;
  });

  protected itemNumber(index: number): string {
    return String(index + 1).padStart(2, '0');
  }

  protected isExternalResource(href: string): boolean {
    return /^https?:\/\//i.test(href);
  }

  protected resourceDownloadName(href: string): string | null {
    if (!href.startsWith('/') || !href.toLowerCase().endsWith('.pdf')) {
      return null;
    }

    return href.split('/').pop() || 'download.pdf';
  }

  protected trackResourceSelection(href: string): void {
    const downloadName = this.resourceDownloadName(href);
    if (!downloadName) {
      return;
    }

    this.analytics.trackResourceDownload(downloadName);
  }
}
