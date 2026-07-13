import {ChangeDetectionStrategy, Component} from '@angular/core';
import {RouterLink} from '@angular/router';

@Component({
  selector: 'app-privacy-policy',
  imports: [RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <main class="blog-page">
      <article class="mx-auto max-w-4xl">
        <header class="blog-page-header">
          <nav class="blog-breadcrumb" aria-label="Privacy policy navigation">
            <a routerLink="/" class="font-medium hover:text-cyan-800 dark:hover:text-cyan-200">Home</a>
            <span aria-hidden="true" class="mx-2">/</span>
            <span class="text-slate-900 dark:text-zinc-200">Privacy Policy</span>
          </nav>

          <h1 class="blog-page-title">Privacy Policy</h1>
          <p class="blog-page-description">
            A plain-language summary of how ColinMichaels.com handles your information and deletion requests.
          </p>
          <p class="mt-4 text-sm text-slate-500 dark:text-zinc-500">
            Effective July 13, 2026
          </p>
        </header>

        <div class="grid gap-10 text-slate-700 dark:text-zinc-300">
          <section aria-labelledby="privacy-commitment">
            <h2 id="privacy-commitment" class="heading-subsection">Our privacy commitment</h2>
            <p class="mt-3 max-w-3xl leading-7">
              We do not collect personal information for the purpose of selling it. We do not sell, rent, or trade
              your personal information. Information is handled only when you choose to provide it or when it is
              reasonably needed to operate, secure, and improve this website.
            </p>
          </section>

          <section aria-labelledby="information-handled">
            <h2 id="information-handled" class="heading-subsection">Information the site may handle</h2>
            <p class="mt-3 max-w-3xl leading-7">
              Depending on the features you use, this may include account details supplied through Firebase sign-in,
              profile information, comments, notification settings, and other content you submit. The site and its
              service providers may also process limited technical information needed for hosting, security, error
              diagnosis, and reliable delivery. Some preferences, saved articles, and offline data are stored only on
              your device.
            </p>
          </section>

          <section aria-labelledby="information-use">
            <h2 id="information-use" class="heading-subsection">How information is used</h2>
            <p class="mt-3 max-w-3xl leading-7">
              Information is used to provide the feature you requested, maintain your account and preferences,
              moderate submitted content, protect the site from misuse, and keep the service working. Trusted service
              providers such as Firebase and Google may process information only as needed to deliver these functions.
              External websites and embedded services have their own privacy practices.
            </p>
          </section>

          <section aria-labelledby="data-removal">
            <h2 id="data-removal" class="heading-subsection">Your right to removal</h2>
            <p class="mt-3 max-w-3xl leading-7">
              You may ask at any time to have personal information associated with you removed. Email
              <a class="site-inline-link" href="mailto:colin@colinmichaels.com">colin&#64;colinmichaels.com</a>
              with enough information to identify your account or submission. After the request is verified, the
              associated information will be deleted from active systems, except for limited records that must be kept
              for security, fraud prevention, legal obligations, or normal backup cycles.
            </p>
          </section>

          <section aria-labelledby="policy-updates">
            <h2 id="policy-updates" class="heading-subsection">Policy updates</h2>
            <p class="mt-3 max-w-3xl leading-7">
              This policy may be updated when site features or privacy practices change. The effective date above will
              be revised when material changes are published.
            </p>
          </section>
        </div>

        <footer class="mt-12 border-t border-slate-200 pt-6 dark:border-zinc-800">
          <a routerLink="/" class="site-inline-link">Return home</a>
        </footer>
      </article>
    </main>
  `,
  standalone: true,
})
export class PrivacyPolicyComponent {}
