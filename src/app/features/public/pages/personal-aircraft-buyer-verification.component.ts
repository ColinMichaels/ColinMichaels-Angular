import {ChangeDetectionStrategy, Component, inject} from '@angular/core';
import {RouterLink} from '@angular/router';

import {PATH_NAMES} from '../../../app-route-paths';
import {SiteAnalyticsService} from '../../../shared/analytics/site-analytics.service';

const WORKSHEET_FILENAME = 'captain-colin-personal-aircraft-buyer-verification.pdf';

@Component({
  selector: 'app-personal-aircraft-buyer-verification',
  imports: [RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <main class="blog-page">
      <article class="site-layout site-layout-prose">
        <header class="blog-page-header">
          <nav class="blog-breadcrumb" aria-label="Buyer verification navigation">
            <a routerLink="/" class="font-medium hover:text-cyan-800 dark:hover:text-cyan-200">Home</a>
            <span aria-hidden="true" class="mx-2">/</span>
            <a
              [routerLink]="['/', pathNames.TOPICS, 'drones-fpv']"
              class="font-medium hover:text-cyan-800 dark:hover:text-cyan-200"
            >Drones &amp; FPV</a>
            <span aria-hidden="true" class="mx-2">/</span>
            <span class="text-slate-900 dark:text-zinc-200">Buyer Verification</span>
          </nav>

          <p class="site-meta">Captain Colin field resource</p>
          <h1 class="blog-page-title mt-3">Personal Aircraft Buyer Verification</h1>
          <p class="blog-page-description mt-4">
            A printable two-page worksheet for slowing down a viral-aircraft purchase long enough to verify the
            seller, exact configuration, deposit terms, claimed legal category, operating reality, and support.
          </p>

          <div class="mt-6 flex flex-wrap gap-2 text-xs font-semibold uppercase tracking-[0.12em] text-slate-600 dark:text-zinc-400" aria-label="Resource details">
            <span class="border border-slate-300 px-3 py-2 dark:border-zinc-700">2 printable pages</span>
            <span class="border border-slate-300 px-3 py-2 dark:border-zinc-700">U.S. research starting point</span>
            <span class="border border-slate-300 px-3 py-2 dark:border-zinc-700">Reviewed August 15, 2026</span>
          </div>

          <div class="mt-7 flex flex-wrap gap-3">
            <a
              class="blog-action-primary"
              href="/downloads/captain-colin-personal-aircraft-buyer-verification.pdf"
              download="captain-colin-personal-aircraft-buyer-verification.pdf"
              (click)="trackWorksheetDownload()"
            >Download the worksheet</a>
            <a class="blog-action-secondary" href="#evidence-boundary">Read the evidence boundary</a>
          </div>
        </header>

        <aside class="my-8 border-l-4 border-amber-500 bg-amber-50 px-5 py-4 text-sm leading-6 text-amber-950 dark:bg-amber-950/20 dark:text-amber-100" role="note">
          This is a research organizer, not financial, legal, aviation, safety, or purchase advice. It does not
          determine whether any aircraft qualifies for Part 103 or another category. Verify the exact aircraft,
          intended operation, transaction, and jurisdiction with the appropriate qualified professionals and agencies.
        </aside>

        <section class="border-y border-slate-200 py-9 dark:border-zinc-800" aria-labelledby="worksheet-purpose-heading">
          <div class="grid gap-8 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
            <div>
              <p class="site-meta">Before you send the deposit</p>
              <h2 id="worksheet-purpose-heading" class="heading-subsection mt-3">What the worksheet helps you verify</h2>
              <p class="mt-4 leading-7 text-slate-700 dark:text-zinc-300">
                The useful question is not simply whether a machine appeared to fly. The question is whether the exact
                offer in front of you is identifiable, documented, supportable, and appropriate for the way you intend
                to own and operate it.
              </p>
            </div>

            <ol class="grid gap-3 sm:grid-cols-2" aria-label="Buyer verification sequence">
              @for (item of verificationSteps; track item.number) {
                <li class="border border-slate-200 p-4 dark:border-zinc-800">
                  <span class="text-xs font-bold tracking-[0.14em] text-cyan-700 dark:text-cyan-300">{{ item.number }}</span>
                  <h3 class="mt-2 font-semibold text-slate-950 dark:text-zinc-100">{{ item.title }}</h3>
                  <p class="mt-2 text-sm leading-6 text-slate-600 dark:text-zinc-400">{{ item.description }}</p>
                </li>
              }
            </ol>
          </div>
        </section>

        <div class="grid gap-12 py-10 text-slate-700 dark:text-zinc-300">
          <section id="evidence-boundary" aria-labelledby="evidence-boundary-heading">
            <p class="site-meta">Proof versus promise</p>
            <h2 id="evidence-boundary-heading" class="heading-subsection mt-3">A filmed flight proves less than a purchase requires</h2>
            <div class="mt-4 grid max-w-3xl gap-4 leading-7">
              <p>
                A video can show one aircraft lifting one person during one filmed test. It does not, by itself, prove
                repeatable reliability, airworthiness, the legal category of another configuration, the buyer's pilot
                readiness, insurance availability, safe shipping, parts support, or the seller's ability to deliver the
                next order. A checkout page proves that money can be requested. It does not prove production maturity.
              </p>
              <p>
                Save the exact listing, configuration, quote, invoice, promised delivery window, refund terms, and the
                name of the legal entity receiving payment. Ask for current delivered-customer evidence and written
                answers about training, maintenance, batteries, life-limited parts, warranty exclusions, service, and
                replacement lead times. If the version in the paperwork is not the version behind the seller's legal or
                performance claim, stop and resolve the mismatch before paying.
              </p>
            </div>
          </section>

          <section aria-labelledby="part-103-heading">
            <p class="site-meta">Current U.S. starting point</p>
            <h2 id="part-103-heading" class="heading-subsection mt-3">Part 103 is a narrow category, not a marketing label</h2>
            <div class="mt-4 grid gap-7 lg:grid-cols-[minmax(0,1fr)_minmax(17rem,0.72fr)]">
              <div class="grid gap-4 leading-7">
                <p>
                  The current eCFR says Part 103 applies to a single-occupant vehicle used only for recreation or sport
                  that has no U.S. or foreign airworthiness certificate and meets the applicable weight, fuel, speed,
                  and stall limits. For a powered ultralight, the empty-weight threshold is less than 254 pounds after
                  the rule's stated exclusions, fuel capacity cannot exceed five U.S. gallons, full-power level-flight
                  speed cannot exceed 55 knots calibrated airspeed, and power-off stall speed cannot exceed 24 knots.
                </p>
                <p>
                  Part 103 also contains operating restrictions. It generally limits operations to daylight, requires
                  the operator to see and avoid aircraft, bars flight over congested areas and open-air assemblies, and
                  requires prior authorization in specified controlled airspace. Those points do not classify a
                  particular electric multicopter. The exact vehicle and intended operation need their own review.
                </p>
              </div>
              <aside class="border border-slate-200 bg-slate-50 p-5 dark:border-zinc-800 dark:bg-zinc-900/60" aria-label="Part 103 verification questions">
                <h3 class="font-semibold text-slate-950 dark:text-zinc-100">If Part 103 is claimed, ask for:</h3>
                <ul class="mt-4 grid gap-3 text-sm leading-6">
                  <li>The written basis for the exact configuration.</li>
                  <li>The complete empty-weight treatment and exclusions.</li>
                  <li>The applicable fuel, speed, and stall evidence.</li>
                  <li>The operating limits the training actually covers.</li>
                  <li>The path that applies if the aircraft does not qualify.</li>
                </ul>
              </aside>
            </div>
          </section>

          <section aria-labelledby="money-heading">
            <p class="site-meta">Transaction reality</p>
            <h2 id="money-heading" class="heading-subsection mt-3">Make the deposit terms survive the sales call</h2>
            <div class="mt-4 grid max-w-3xl gap-4 leading-7">
              <p>
                Record what is refundable, what becomes non-refundable, the cancellation process, payment milestones,
                taxes, freight, import or customs costs, assembly, inspection, training, storage, transport, insurance,
                and the remedy if production or delivery slips. Keep copies of the seller's page, written quote, order
                agreement, receipt, messages, and every promise tied to timing or refunds.
              </p>
              <p>
                Current Federal Trade Commission guidance explains shipping-delay, refund, recordkeeping, and payment
                dispute considerations for many mail, online, and telephone orders. A personal-aircraft deposit,
                preorder, custom build, or cross-border transaction may raise different questions. Review the current
                guidance and get transaction-specific advice instead of assuming an ordinary online-shopping remedy
                will fit later.
              </p>
            </div>
          </section>

          <section aria-labelledby="records-heading">
            <p class="site-meta">Build the file before the problem</p>
            <h2 id="records-heading" class="heading-subsection mt-3">Evidence worth saving</h2>
            <div class="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              @for (item of evidenceItems; track item) {
                <div class="border-l-2 border-cyan-600 pl-4 text-sm leading-6">{{ item }}</div>
              }
            </div>
          </section>

          <section aria-labelledby="stop-signs-heading">
            <p class="site-meta">Decision gate</p>
            <h2 id="stop-signs-heading" class="heading-subsection mt-3">Stop signs that deserve a written answer</h2>
            <ul class="mt-5 grid gap-3 sm:grid-cols-2">
              @for (item of stopSigns; track item) {
                <li class="border border-rose-200 bg-rose-50/70 p-4 text-sm leading-6 text-rose-950 dark:border-rose-900 dark:bg-rose-950/20 dark:text-rose-100">{{ item }}</li>
              }
            </ul>
          </section>

          <section aria-labelledby="official-sources-heading">
            <p class="site-meta">Reviewed August 15, 2026</p>
            <h2 id="official-sources-heading" class="heading-subsection mt-3">Official starting points</h2>
            <p class="mt-4 max-w-3xl leading-7">
              The eCFR page was current through August 13, 2026 when this resource was reviewed. Recheck every source
              before relying on it; regulations, agency pages, transaction facts, and available records can change.
            </p>
            <div class="mt-6 grid gap-3">
              @for (source of officialSources; track source.href) {
                <a
                  class="grid gap-1 border-b border-slate-200 px-2 py-4 text-slate-800 transition-colors hover:bg-slate-50 hover:text-cyan-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-700 dark:border-zinc-800 dark:text-zinc-200 dark:hover:bg-zinc-900 dark:hover:text-cyan-200"
                  [href]="source.href"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <strong>{{ source.label }}</strong>
                  <span class="text-sm leading-6 text-slate-600 dark:text-zinc-400">{{ source.description }}</span>
                </a>
              }
            </div>
          </section>

          <section class="border-y border-slate-200 py-8 dark:border-zinc-800" aria-labelledby="continue-heading">
            <p class="site-meta">Continue the evidence trail</p>
            <h2 id="continue-heading" class="heading-subsection mt-3">From viral aircraft to useful questions</h2>
            <div class="mt-5 grid gap-4 sm:grid-cols-2">
              <a
                [routerLink]="['/', pathNames.BLOG, 'they-bought-a-full-size-temu-mega-drone']"
                class="border border-slate-200 p-5 transition-colors hover:border-cyan-600 hover:bg-cyan-50/50 dark:border-zinc-800 dark:hover:border-cyan-400 dark:hover:bg-cyan-950/20"
              >
                <strong class="text-slate-950 dark:text-zinc-100">What the full-size Temu drone video actually proved</strong>
                <span class="mt-2 block text-sm leading-6 text-slate-600 dark:text-zinc-400">Separate the filmed flight from classification, reliability, delivery, and support claims.</span>
              </a>
              <a
                [routerLink]="['/', pathNames.TOPICS, 'drones-fpv']"
                class="border border-slate-200 p-5 transition-colors hover:border-cyan-600 hover:bg-cyan-50/50 dark:border-zinc-800 dark:hover:border-cyan-400 dark:hover:bg-cyan-950/20"
              >
                <strong class="text-slate-950 dark:text-zinc-100">Drones &amp; FPV topic guide</strong>
                <span class="mt-2 block text-sm leading-6 text-slate-600 dark:text-zinc-400">Continue through field notes, flights, practical resources, and Captain Colin videos.</span>
              </a>
            </div>
          </section>

          <section class="bg-slate-950 px-6 py-8 text-white dark:bg-black" aria-labelledby="download-heading">
            <p class="text-xs font-bold uppercase tracking-[0.14em] text-cyan-300">Printable field resource</p>
            <h2 id="download-heading" class="mt-3 text-2xl font-semibold">Put every unanswered promise in one place</h2>
            <p class="mt-3 max-w-2xl leading-7 text-slate-300">
              Use the two-page sheet during research, sales calls, and qualified review. No deposit until the red flags
              that matter to you are resolved in writing.
            </p>
            <a
              class="blog-action-primary mt-6"
              href="/downloads/captain-colin-personal-aircraft-buyer-verification.pdf"
              download="captain-colin-personal-aircraft-buyer-verification.pdf"
              (click)="trackWorksheetDownload()"
            >Download the two-page PDF</a>
          </section>
        </div>
      </article>
    </main>
  `,
})
export class PersonalAircraftBuyerVerificationComponent {
  protected readonly pathNames = PATH_NAMES;
  private readonly analytics = inject(SiteAnalyticsService);

  protected readonly verificationSteps = [
    {number: '01', title: 'Identify the seller', description: 'Record the legal entity, address, named contact, and payment recipient.'},
    {number: '02', title: 'Freeze the offer', description: 'Name the exact version, options, quote date, amount due now, and expected total cost.'},
    {number: '03', title: 'Read every deposit term', description: 'Separate refundable amounts, non-refundable amounts, cancellation, delay, and transfer terms.'},
    {number: '04', title: 'Verify the category claim', description: 'Ask for the written basis that applies to this aircraft, configuration, and intended operation.'},
    {number: '05', title: 'Price the operating reality', description: 'Include training, site, airspace, transport, charging, storage, maintenance, and insurance.'},
    {number: '06', title: 'Build the evidence file', description: 'Save dated pages, quotes, receipts, messages, delivery proof, technical documents, and open questions.'},
  ] as const;

  protected readonly evidenceItems = [
    'Dated listing, specification, and configuration snapshots.',
    'Written quote, order agreement, invoice, receipt, and payment milestones.',
    'Delivery, cancellation, delay, refund, warranty, and support promises.',
    'Training syllabus, manuals, maintenance schedule, and emergency procedures.',
    'Classification basis, weight and performance evidence, and intended-operation notes.',
    'Delivered-customer references plus relevant FAA, registry, and NTSB checks.',
  ] as const;

  protected readonly stopSigns = [
    'Refund status is unclear, changes during the conversation, or is explained only verbally.',
    'The legal entity, physical address, payment recipient, or contracting party cannot be confirmed.',
    'The exact configuration differs between the marketing page, quote, invoice, and legal-category claim.',
    'Urgency or a disappearing slot replaces written delivery, delay, cancellation, and refund terms.',
    'Current customer-delivery evidence is unavailable while reservation or prototype numbers are emphasized.',
    'Training, manuals, parts, batteries, service, warranty exclusions, or incident questions stay vague.',
  ] as const;

  protected readonly officialSources = [
    {
      label: '14 CFR Part 103 - Ultralight Vehicles',
      description: 'Current applicability, certification, registration, and operating-rule text from the eCFR.',
      href: 'https://www.ecfr.gov/current/title-14/chapter-I/subchapter-F/part-103',
    },
    {
      label: 'FAA Ultralights & Amateur-built Aircraft',
      description: 'FAA starting point for ultralight and amateur-built reference material.',
      href: 'https://www.faa.gov/aircraft/gen_av/ultralights',
    },
    {
      label: 'FAA Aircraft Registration',
      description: 'Aircraft inquiry, record requests, registration services, and registration-reference paths.',
      href: 'https://www.faa.gov/licenses_certificates/aircraft_certification/aircraft_registry',
    },
    {
      label: 'NTSB Aviation Investigation Search',
      description: 'Search U.S. civil aviation accidents and selected incidents by make, model, registration, FAR part, and narrative.',
      href: 'https://www.ntsb.gov/Pages/AviationQueryV2.aspx',
    },
    {
      label: 'FTC Guidance for Orders That Do Not Arrive',
      description: 'Current consumer guidance on shipment timing, records, refunds, and credit or debit card disputes.',
      href: 'https://consumer.ftc.gov/articles/what-do-if-youre-billed-things-you-never-got-or-you-get-unordered-products',
    },
  ] as const;

  protected trackWorksheetDownload(): void {
    this.analytics.trackResourceDownload(WORKSHEET_FILENAME, 'resource_page');
  }
}
