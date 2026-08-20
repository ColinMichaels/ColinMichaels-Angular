import {ChangeDetectionStrategy, Component, inject} from '@angular/core';
import {RouterLink} from '@angular/router';

import {PATH_NAMES} from '../../../app-route-paths';
import {SiteAnalyticsService} from '../../../shared/analytics/site-analytics.service';
import {YOUTUBE_CHANNEL_URL} from '../../../shared/seo/site-identity';

const SCORECARD_FILENAME = 'captain-colin-gadget-usefulness-scorecard.pdf';

@Component({
  selector: 'app-gadget-usefulness-scorecard',
  imports: [RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <main class="blog-page">
      <article class="site-layout site-layout-prose">
        <header class="blog-page-header">
          <nav class="blog-breadcrumb" aria-label="Gadget scorecard navigation">
            <a routerLink="/" class="font-medium hover:text-cyan-800 dark:hover:text-cyan-200">Home</a>
            <span aria-hidden="true" class="mx-2">/</span>
            <a
              [routerLink]="['/', pathNames.TOPICS, 'gadgets-toys']"
              class="font-medium hover:text-cyan-800 dark:hover:text-cyan-200"
            >Gadgets &amp; Toys</a>
            <span aria-hidden="true" class="mx-2">/</span>
            <span class="text-slate-900 dark:text-zinc-200">Usefulness Scorecard</span>
          </nav>

          <p class="site-meta">Is It Actually Useful?</p>
          <h1 class="blog-page-title mt-3">Gadget Usefulness Scorecard</h1>
          <p class="blog-page-description mt-4">
            A printable way to judge an unusual gadget on the problem it solves, the evidence behind the pitch,
            its complete cost, everyday friction, and what happens when it breaks or the novelty wears off.
          </p>

          <div class="mt-6 flex flex-wrap gap-2 text-xs font-semibold uppercase tracking-[0.12em] text-slate-600 dark:text-zinc-400" aria-label="Scorecard details">
            <span class="border border-slate-300 px-3 py-2 dark:border-zinc-700">1 printable page</span>
            <span class="border border-slate-300 px-3 py-2 dark:border-zinc-700">5 evidence-led scores</span>
            <span class="border border-slate-300 px-3 py-2 dark:border-zinc-700">20-point conversation tool</span>
          </div>

          <div class="mt-7 flex flex-wrap gap-3">
            <a
              class="blog-action-primary"
              href="/downloads/captain-colin-gadget-usefulness-scorecard.pdf"
              download="captain-colin-gadget-usefulness-scorecard.pdf"
              (click)="trackScorecardDownload()"
            >Download the scorecard</a>
            <a
              class="blog-action-secondary"
              [routerLink]="['/', pathNames.RESOURCES, pathNames.RESOURCE_GADGET_USEFULNESS_SCORECARD]"
              fragment="five-scores"
            >See the five scores</a>
          </div>
        </header>

        <aside class="my-8 border-l-4 border-amber-500 bg-amber-50 px-5 py-4 text-sm leading-6 text-amber-950 dark:bg-amber-950/20 dark:text-amber-100" role="note">
          This worksheet organizes research and personal judgment. It is not a scientific rating, product test,
          safety assessment, financial recommendation, or buying instruction. The evidence label and written
          explanation matter more than the total.
        </aside>

        <section class="border-y border-slate-200 py-9 dark:border-zinc-800" aria-labelledby="series-purpose-heading">
          <div class="grid gap-8 lg:grid-cols-[minmax(0,0.88fr)_minmax(0,1.12fr)]">
            <div>
              <p class="site-meta">A repeatable question</p>
              <h2 id="series-purpose-heading" class="heading-subsection mt-3">Useful is more interesting than merely new</h2>
              <p class="mt-4 leading-7 text-slate-700 dark:text-zinc-300">
                The internet is excellent at showing the strangest feature, the cleanest demonstration, and the
                lowest headline price. It is much worse at showing who will still use the object after setup,
                charging, subscriptions, storage, cleanup, maintenance, and the first failed part.
              </p>
            </div>
            <div class="grid gap-4 leading-7 text-slate-700 dark:text-zinc-300">
              <p>
                <strong class="text-slate-950 dark:text-zinc-100">Is It Actually Useful?</strong> is the recurring
                ColinMichaels.com framework for unusual gadgets, clever problem-solvers,
                marketplace finds, creator tools, robots, flying cameras, and objects that are too interesting to
                ignore. It does not begin with a verdict. It begins by naming the relationship to the item and the
                evidence available.
              </p>
              <p>
                An owned item, a brief hands-on trial, a borrowed sample, manufacturer material, a viral clip, and
                research-only reporting are different evidence. The scorecard keeps those states visible before a
                number or enthusiastic sentence makes them sound interchangeable.
              </p>
            </div>
          </div>
        </section>

        <div class="grid gap-12 py-10 text-slate-700 dark:text-zinc-300">
          <section id="five-scores" aria-labelledby="five-scores-heading">
            <p class="site-meta">Problem &gt; proof &gt; cost &gt; friction &gt; support</p>
            <h2 id="five-scores-heading" class="heading-subsection mt-3">The five usefulness scores</h2>
            <p class="mt-4 max-w-3xl leading-7">
              Score each area from zero to four using the evidence in front of you. Write one supporting fact or
              unanswered question beside every score. A blank note is a warning that the number may be doing more
              work than the evidence.
            </p>
            <ol class="mt-6 grid gap-4 md:grid-cols-2" aria-label="Five gadget usefulness criteria">
              @for (criterion of criteria; track criterion.number) {
                <li class="border border-slate-200 p-5 dark:border-zinc-800">
                  <div class="flex items-start justify-between gap-4">
                    <div>
                      <span class="text-xs font-bold tracking-[0.14em] text-cyan-700 dark:text-cyan-300">{{ criterion.number }}</span>
                      <h3 class="mt-2 text-lg font-semibold text-slate-950 dark:text-zinc-100">{{ criterion.title }}</h3>
                    </div>
                    <span class="shrink-0 border border-cyan-700 px-2 py-1 text-xs font-bold text-cyan-800 dark:border-cyan-300 dark:text-cyan-200">0-4</span>
                  </div>
                  <p class="mt-3 text-sm leading-6 text-slate-600 dark:text-zinc-400">{{ criterion.description }}</p>
                  <p class="mt-3 text-sm font-medium leading-6 text-slate-800 dark:text-zinc-200">Ask: {{ criterion.question }}</p>
                </li>
              }
            </ol>
          </section>

          <section aria-labelledby="scoring-heading">
            <p class="site-meta">A number with a written reason</p>
            <h2 id="scoring-heading" class="heading-subsection mt-3">How to score without pretending it is science</h2>
            <div class="mt-5 grid gap-6 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
              <div class="border border-slate-200 p-5 dark:border-zinc-800">
                <dl class="grid gap-4 text-sm leading-6">
                  @for (anchor of scoreAnchors; track anchor.score) {
                    <div class="grid grid-cols-[2rem_minmax(0,1fr)] gap-3">
                      <dt class="font-bold text-cyan-800 dark:text-cyan-200">{{ anchor.score }}</dt>
                      <dd><strong class="text-slate-950 dark:text-zinc-100">{{ anchor.label }}.</strong> {{ anchor.description }}</dd>
                    </div>
                  }
                </dl>
              </div>
              <div class="grid content-start gap-4 leading-7">
                <p>
                  The maximum is 20, but a high total cannot erase a safety problem, a privacy concern, an unclear
                  relationship, or a claim the available evidence does not support. The score exists to reveal the
                  tradeoff, not to hide it behind a badge.
                </p>
                <p>
                  A score from 16 to 20 suggests a strong fit with caveats worth stating. Eleven to 15 means
                  interesting but still conditional. Six to 10 usually means the idea is cleverer than the everyday
                  case. Zero to five means the useful case is not established yet. None of those bands tells a reader
                  to buy; the final lines ask who it helps, who should skip it, and whether the next move is test,
                  borrow, buy, wait, skip, or watch list.
                </p>
              </div>
            </div>
          </section>

          <section aria-labelledby="evidence-label-heading">
            <p class="site-meta">Trust starts before the score</p>
            <h2 id="evidence-label-heading" class="heading-subsection mt-3">Label the relationship to the gadget</h2>
            <div class="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              @for (label of evidenceLabels; track label.title) {
                <div class="border-l-2 border-cyan-600 pl-4">
                  <h3 class="font-semibold text-slate-950 dark:text-zinc-100">{{ label.title }}</h3>
                  <p class="mt-2 text-sm leading-6 text-slate-600 dark:text-zinc-400">{{ label.description }}</p>
                </div>
              }
            </div>
            <p class="mt-6 max-w-3xl leading-7">
              Gifts, review units, sponsorships, affiliate links, company relationships, and synthetic media need
              their own disclosure. A scorecard does not turn manufacturer claims into independent results or make a
              generated illustration into product evidence. The public
              <a routerLink="/editorial-standards" class="font-semibold text-cyan-800 underline underline-offset-4 dark:text-cyan-200">Editorial Standards &amp; Corrections</a>
              page defines those boundaries in more detail.
            </p>
          </section>

          <section aria-labelledby="episode-loop-heading">
            <p class="site-meta">One framework across site and channel</p>
            <h2 id="episode-loop-heading" class="heading-subsection mt-3">Turn each find into a useful article and video</h2>
            <ol class="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3" aria-label="Is It Actually Useful episode loop">
              @for (step of episodeLoop; track step.number) {
                <li class="border border-slate-200 p-4 dark:border-zinc-800">
                  <span class="text-xs font-bold tracking-[0.14em] text-cyan-700 dark:text-cyan-300">{{ step.number }}</span>
                  <h3 class="mt-2 font-semibold text-slate-950 dark:text-zinc-100">{{ step.title }}</h3>
                  <p class="mt-2 text-sm leading-6 text-slate-600 dark:text-zinc-400">{{ step.description }}</p>
                </li>
              }
            </ol>
            <p class="mt-6 max-w-3xl leading-7">
              That shared rhythm gives a reader or viewer something recognizable to return to: the strange object,
              the honest evidence label, the five tradeoffs, the verdict, and one next item worth judging. The website
              holds sources, updates, and the printable; the video supplies motion, personality, demonstration, and a
              spoken next-watch cue.
            </p>
          </section>

          <section class="border-y border-slate-200 py-8 dark:border-zinc-800" aria-labelledby="continue-heading">
            <p class="site-meta">Continue the series</p>
            <h2 id="continue-heading" class="heading-subsection mt-3">Start with one curious object</h2>
            <div class="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <a
                [routerLink]="['/', pathNames.TOPICS, 'gadgets-toys']"
                class="border border-slate-200 p-5 transition-colors hover:border-cyan-600 hover:bg-cyan-50/50 dark:border-zinc-800 dark:hover:border-cyan-400 dark:hover:bg-cyan-950/20"
              >
                <strong class="text-slate-950 dark:text-zinc-100">Gadgets &amp; Toys</strong>
                <span class="mt-2 block text-sm leading-6 text-slate-600 dark:text-zinc-400">Browse owned, tried, wanted, and research-only finds with honest context.</span>
              </a>
              <a
                [routerLink]="['/', pathNames.BLOG, 'they-bought-a-full-size-temu-mega-drone']"
                class="border border-slate-200 p-5 transition-colors hover:border-cyan-600 hover:bg-cyan-50/50 dark:border-zinc-800 dark:hover:border-cyan-400 dark:hover:bg-cyan-950/20"
              >
                <strong class="text-slate-950 dark:text-zinc-100">The full-size Temu mega drone</strong>
                <span class="mt-2 block text-sm leading-6 text-slate-600 dark:text-zinc-400">See why one filmed flight proves less than a buyer or viewer may assume.</span>
              </a>
              <a
                [href]="youtubeChannelUrl"
                target="_blank"
                rel="noopener noreferrer"
                class="border border-slate-200 p-5 transition-colors hover:border-cyan-600 hover:bg-cyan-50/50 dark:border-zinc-800 dark:hover:border-cyan-400 dark:hover:bg-cyan-950/20"
              >
                <strong class="text-slate-950 dark:text-zinc-100">Colin Michaels on YouTube</strong>
                <span class="mt-2 block text-sm leading-6 text-slate-600 dark:text-zinc-400">Continue with useful finds, demonstrations, creator builds, and new experiments.</span>
              </a>
            </div>
          </section>

          <section class="bg-slate-950 px-6 py-8 text-white dark:bg-black" aria-labelledby="download-heading">
            <p class="text-xs font-bold uppercase tracking-[0.14em] text-cyan-300">Printable series framework</p>
            <h2 id="download-heading" class="mt-3 text-2xl font-semibold">Score the evidence, then explain the verdict</h2>
            <p class="mt-3 max-w-2xl leading-7 text-slate-300">
              Print one sheet per gadget. Keep the evidence note beside every score and save the completed sheet with
              the article, video, or research file so a later update can show what changed.
            </p>
            <a
              class="blog-action-primary mt-6"
              href="/downloads/captain-colin-gadget-usefulness-scorecard.pdf"
              download="captain-colin-gadget-usefulness-scorecard.pdf"
              (click)="trackScorecardDownload()"
            >Download the one-page PDF</a>
          </section>
        </div>
      </article>
    </main>
  `,
})
export class GadgetUsefulnessScorecardComponent {
  protected readonly pathNames = PATH_NAMES;
  protected readonly youtubeChannelUrl = YOUTUBE_CHANNEL_URL;
  private readonly analytics = inject(SiteAnalyticsService);

  protected readonly criteria = [
    {
      number: '01',
      title: 'Real problem fit',
      description: 'Name the user, the recurring problem, how often it happens, and the current workaround. Fun can be a valid reason, but it is not the same promise as usefulness.',
      question: 'Does it solve a specific problem often enough to matter?',
    },
    {
      number: '02',
      title: 'Evidence quality',
      description: 'Separate direct use, first-person footage, independent testing, seller or manufacturer claims, and evidence that is still missing.',
      question: 'What proves the claim beyond the product page or one clip?',
    },
    {
      number: '03',
      title: 'True cost',
      description: 'Include shipping, tax, accessories, subscriptions, consumables, replacement parts, maintenance, and the cost of a failed experiment.',
      question: 'Is the complete cost proportionate to the problem it solves?',
    },
    {
      number: '04',
      title: 'Everyday friction',
      description: 'Count charging, pairing, accounts, compatibility, storage, cleanup, learning, noise, and the attention required after the first day.',
      question: 'Will setup and upkeep erase the promised convenience?',
    },
    {
      number: '05',
      title: 'Support and exit',
      description: 'Check return terms, warranty, parts, app or cloud dependence, privacy, support history, resale, and what stops working if the company disappears.',
      question: 'Can it be repaired, returned, resold, or abandoned safely?',
    },
  ] as const;

  protected readonly scoreAnchors = [
    {score: '0', label: 'No useful evidence', description: 'The claim is unclear, unsupported, or unrelated to a real use.'},
    {score: '1', label: 'Mostly promise', description: 'The idea is visible, but the practical case relies mainly on marketing or hope.'},
    {score: '2', label: 'Conditional', description: 'The benefit may be real for a narrow user, setup, or price, with important unknowns.'},
    {score: '3', label: 'Solid with tradeoffs', description: 'The evidence supports a useful case and the remaining costs are explainable.'},
    {score: '4', label: 'Unusually strong', description: 'The fit, proof, ownership reality, and exit path all hold up unusually well.'},
  ] as const;

  protected readonly evidenceLabels = [
    {title: 'Own', description: 'Used over enough time to discuss recurring behavior, not only first setup.'},
    {title: 'Tried', description: 'Direct hands-on experience with its duration, conditions, and limits stated.'},
    {title: 'Borrowed', description: 'Temporary access with ownership, return, and relationship context disclosed.'},
    {title: 'Research only', description: 'No hands-on claim; findings come from dated sources, footage, and documented limits.'},
  ] as const;

  protected readonly episodeLoop = [
    {number: '01', title: 'Show the strange promise', description: 'Open with the real object or claim, not a manufactured mystery.'},
    {number: '02', title: 'State the evidence', description: 'Say owned, tried, borrowed, research-only, sponsored, or otherwise connected.'},
    {number: '03', title: 'Score the five tradeoffs', description: 'Use the same problem, proof, cost, friction, and support questions every time.'},
    {number: '04', title: 'Give the useful answer', description: 'Name who benefits, who should skip it, and the evidence behind the verdict.'},
    {number: '05', title: 'Link the source page', description: 'Put dated references, updates, images, and the printable on the canonical article.'},
    {number: '06', title: 'Cue the next judgment', description: 'End with one related object or flight instead of a generic subscription plea.'},
  ] as const;

  protected trackScorecardDownload(): void {
    this.analytics.trackResourceDownload(SCORECARD_FILENAME, 'resource_page');
  }
}
