import {ChangeDetectionStrategy, Component} from '@angular/core';
import {RouterLink} from '@angular/router';

import {PATH_NAMES} from '../../../app-route-paths';

@Component({
  selector: 'app-editorial-standards',
  imports: [RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <main class="blog-page">
      <article class="site-layout site-layout-prose">
        <header class="blog-page-header">
          <nav class="blog-breadcrumb" aria-label="Editorial standards navigation">
            <a routerLink="/" class="font-medium hover:text-cyan-800 dark:hover:text-cyan-200">Home</a>
            <span aria-hidden="true" class="mx-2">/</span>
            <span class="text-slate-900 dark:text-zinc-200">Editorial Standards &amp; Corrections</span>
          </nav>

          <p class="site-meta">Trust &amp; transparency</p>
          <h1 class="blog-page-title mt-3">Editorial Standards &amp; Corrections</h1>
          <p class="blog-page-description mt-4">
            How ColinMichaels.com distinguishes hands-on experience from research, handles sources and synthetic
            media, discloses relationships, and corrects meaningful errors.
          </p>
          <p class="mt-4 text-sm text-slate-500 dark:text-zinc-500">
            Effective August 15, 2026
          </p>
        </header>

        <section class="grid gap-4 border-y border-slate-200 py-8 dark:border-zinc-800 sm:grid-cols-3" aria-label="Editorial principles">
          <article class="border-l-2 border-cyan-600 pl-4">
            <h2 class="text-base font-semibold text-slate-950 dark:text-zinc-100">Say what the evidence is</h2>
            <p class="mt-2 text-sm leading-6 text-slate-600 dark:text-zinc-400">
              A product page, manufacturer video, personal test, and editorial illustration are different kinds of
              evidence and should be described that way.
            </p>
          </article>
          <article class="border-l-2 border-amber-500 pl-4">
            <h2 class="text-base font-semibold text-slate-950 dark:text-zinc-100">Keep the limits visible</h2>
            <p class="mt-2 text-sm leading-6 text-slate-600 dark:text-zinc-400">
              Research-only work, incomplete testing, compensation, uncertainty, and high-stakes boundaries belong
              near the claim—not hidden in fine print.
            </p>
          </article>
          <article class="border-l-2 border-rose-500 pl-4">
            <h2 class="text-base font-semibold text-slate-950 dark:text-zinc-100">Correct the record</h2>
            <p class="mt-2 text-sm leading-6 text-slate-600 dark:text-zinc-400">
              A meaningful factual correction should be fixed promptly, dated, and explained when it changes the
              evidence, recommendation, or conclusion.
            </p>
          </article>
        </section>

        <div class="grid gap-12 py-10 text-slate-700 dark:text-zinc-300">
          <section aria-labelledby="editorial-scope-heading">
            <h2 id="editorial-scope-heading" class="heading-subsection">What this policy covers</h2>
            <div class="mt-4 grid max-w-3xl gap-4 leading-7">
              <p>
                ColinMichaels.com is a personal creator publication, not a newsroom, laboratory, medical practice, or
                product-testing company. Colin publishes first-person project notes, practical technology guides,
                gadget research, FPV stories, software work, and patient-perspective recovery writing.
              </p>
              <p>
                The standard for new and meaningfully revised work is to make the basis of each important claim clear.
                Older articles may not yet meet every part of this policy; they are reviewed when they are updated
                instead of being silently presented as newly verified.
              </p>
            </div>
          </section>

          <section aria-labelledby="editorial-labels-heading">
            <h2 id="editorial-labels-heading" class="heading-subsection">What the experience labels mean</h2>
            <p class="mt-3 max-w-3xl leading-7">
              These labels are evidence boundaries. If a label is absent, readers should not assume that an item was
              owned, tested, purchased, borrowed, or independently verified.
            </p>
            <dl class="mt-6 grid gap-4">
              <div class="site-card border-l-4 border-cyan-600 p-5">
                <dt class="font-semibold text-slate-950 dark:text-zinc-100">Hands-on or tested</dt>
                <dd class="mt-2 leading-7">
                  Colin personally used the product, process, aircraft, software, or location. The article should name
                  the meaningful conditions, duration, version, and limitations instead of turning one use into a
                  universal verdict.
                </dd>
              </div>
              <div class="site-card border-l-4 border-emerald-600 p-5">
                <dt class="font-semibold text-slate-950 dark:text-zinc-100">First-person or field notes</dt>
                <dd class="mt-2 leading-7">
                  The material comes from Colin's own project, flight, recovery experience, photograph, footage, or
                  documented workflow. Personal experience can be useful evidence, but it does not automatically apply
                  to every reader.
                </dd>
              </div>
              <div class="site-card border-l-4 border-amber-500 p-5">
                <dt class="font-semibold text-slate-950 dark:text-zinc-100">Researched or pre-buy analysis</dt>
                <dd class="mt-2 leading-7">
                  Colin did not test the item for the article. The analysis compares current public evidence and should
                  identify the source date, open questions, and the difference between availability, marketing, and
                  independent proof.
                </dd>
              </div>
              <div class="site-card border-l-4 border-violet-500 p-5">
                <dt class="font-semibold text-slate-950 dark:text-zinc-100">Manufacturer claim or demonstration</dt>
                <dd class="mt-2 leading-7">
                  A specification, price, release statement, or video came from the company responsible for the product.
                  It is attributed to that company and is not described as an independent result.
                </dd>
              </div>
              <div class="site-card border-l-4 border-rose-500 p-5">
                <dt class="font-semibold text-slate-950 dark:text-zinc-100">Editorial illustration or synthetic media</dt>
                <dd class="mt-2 leading-7">
                  The image or media helps explain an idea but is not a product photograph, documentary record, test
                  result, or proof that an event occurred. Material synthetic media should be disclosed in its caption
                  or nearby context.
                </dd>
              </div>
            </dl>
          </section>

          <section aria-labelledby="editorial-sources-heading">
            <h2 id="editorial-sources-heading" class="heading-subsection">Sources, links, and current claims</h2>
            <div class="mt-4 grid max-w-3xl gap-4 leading-7">
              <p>
                Verifiable claims should link to the most direct useful source available: official documentation,
                product or regulatory material, original research, a complete public statement, or clearly identified
                independent reporting. A media embed can provide context, but its destination does not automatically
                count as a citation.
              </p>
              <p>
                Source links should use descriptive labels, not a bare publication name without a destination. Prices,
                availability, software behavior, regulations, and product specifications can change; current articles
                should say when the evidence was checked and avoid converting a snapshot into a permanent claim.
              </p>
            </div>
          </section>

          <section aria-labelledby="editorial-independence-heading">
            <h2 id="editorial-independence-heading" class="heading-subsection">Independence, access, and compensation</h2>
            <div class="mt-4 grid max-w-3xl gap-4 leading-7">
              <p>
                A relevant financial or access relationship should be disclosed close to the article or recommendation.
                That includes sponsorship, affiliate links, free products, loans, travel, early access, paid consulting,
                or another relationship that a reasonable reader would want to know about.
              </p>
              <p>
                Compensation does not buy a favorable conclusion or the removal of a supported criticism. If no
                relationship is disclosed, readers should not infer that a product was supplied, sponsored, or tested.
              </p>
            </div>
          </section>

          <section aria-labelledby="editorial-ai-heading">
            <h2 id="editorial-ai-heading" class="heading-subsection">AI assistance and synthetic media</h2>
            <div class="mt-4 grid max-w-3xl gap-4 leading-7">
              <p>
                AI tools may assist with research organization, drafting alternatives, code, transcription, or visual
                ideation. Colin remains responsible for the published claims, source choices, disclosures, and final
                editorial judgment. AI output is not treated as a source merely because it sounds confident.
              </p>
              <p>
                Synthetic editorial images should be labeled and should never be presented as documentary evidence,
                an official product image, or proof of hands-on testing. Original photographs, screenshots,
                measurements, and footage should be distinguished from illustrative media.
              </p>
            </div>
          </section>

          <section aria-labelledby="editorial-high-stakes-heading">
            <h2 id="editorial-high-stakes-heading" class="heading-subsection">Health, safety, legal, and financial boundaries</h2>
            <div class="mt-4 grid max-w-3xl gap-4 leading-7">
              <p>
                Recovery and medical-planning articles describe personal experience and organization help, not medical
                advice. Aviation rules, product safety, insurance, legal, and financial claims should be checked against
                current qualified or official sources. Readers should confirm decisions with the appropriate licensed
                professional or regulator.
              </p>
              <p>
                Personal experience is labeled as such. It should not be generalized into a diagnosis, treatment plan,
                legal conclusion, flight authorization, or guarantee of another person's outcome.
              </p>
            </div>
          </section>

          <section aria-labelledby="editorial-corrections-heading">
            <h2 id="editorial-corrections-heading" class="heading-subsection">Corrections and substantive updates</h2>
            <ol class="mt-5 max-w-3xl space-y-4 pl-5 leading-7 marker:font-semibold marker:text-cyan-700 dark:marker:text-cyan-300">
              <li class="pl-2">Send the article URL, the disputed statement, and the best available supporting source.</li>
              <li class="pl-2">The evidence and the article's original context are reviewed before changing the record.</li>
              <li class="pl-2">Clear factual errors are corrected promptly. A substantive revision keeps a visible Updated date.</li>
              <li class="pl-2">When a correction changes the evidence, recommendation, or conclusion, the article should explain the material change rather than silently rewriting history.</li>
            </ol>
            <div class="mt-6 flex flex-wrap gap-3">
              <a [routerLink]="['/', pathNames.CONTACT]" class="blog-action-primary">Report a correction</a>
              <a href="mailto:colin@colinmichaels.com" class="blog-action-secondary">Email Colin</a>
            </div>
          </section>

          <section aria-labelledby="editorial-accountability-heading">
            <h2 id="editorial-accountability-heading" class="heading-subsection">Who is accountable</h2>
            <p class="mt-4 max-w-3xl leading-7">
              Colin Michaels is the publisher and is responsible for this policy. Read the public author profile for
              his background and complete publishing history, or use the contact path for a sourcing, rights,
              disclosure, or correction question.
            </p>
            <div class="mt-6 flex flex-wrap gap-3">
              <a [routerLink]="['/', pathNames.AUTHORS, 'colin-michaels']" class="blog-action-secondary">About Colin Michaels</a>
              <a [routerLink]="['/', pathNames.PRIVACY]" class="blog-action-secondary">Privacy Policy</a>
              <a [routerLink]="['/', pathNames.BLOG]" class="blog-action-secondary">Read the blog</a>
            </div>
          </section>
        </div>
      </article>
    </main>
  `,
  standalone: true,
})
export class EditorialStandardsComponent {
  protected readonly pathNames = PATH_NAMES;
}
