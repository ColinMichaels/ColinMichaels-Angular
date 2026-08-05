import {ChangeDetectionStrategy, Component, ElementRef, inject, signal} from '@angular/core';
import {
  AbstractControl,
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  ValidationErrors,
  ValidatorFn,
  Validators,
} from '@angular/forms';
import {ActivatedRoute, RouterLink} from '@angular/router';
import {FirebaseError} from 'firebase/app';

import {PATH_NAMES} from '../../../app-route-paths';
import {
  AuthorPitchSubmissionRequest,
  ContactSubmissionRequest,
  PublicSubmissionRequest,
  PublicSubmissionType,
} from '../models/public-submission.model';
import {PublicSubmissionService} from '../services/public-submission.service';

interface SubmissionPageContent {
  alternateAction: string;
  alternateDescription: string;
  alternatePath: string;
  description: string;
  formTitle: string;
  submitLabel: string;
  successMessage: string;
  successTitle: string;
  title: string;
}

const SUBMISSION_PAGE_CONTENT: Readonly<Record<PublicSubmissionType, SubmissionPageContent>> = {
  contact: {
    title: 'Contact Colin',
    description: 'Send a question, project note, correction, media request, or other message.',
    formTitle: 'Your message',
    submitLabel: 'Send message',
    successTitle: 'Message received',
    successMessage: 'Thanks for reaching out. Your message is in the review queue.',
    alternateAction: 'Pitch a post',
    alternateDescription: 'Want to write for the site or propose an article instead?',
    alternatePath: `/${PATH_NAMES.WRITE_FOR_US}`,
  },
  'author-pitch': {
    title: 'Write for ColinMichaels.com',
    description: 'Introduce yourself, describe your post idea, and share the credit details you would want on an author page.',
    formTitle: 'Author and post questionnaire',
    submitLabel: 'Submit post idea',
    successTitle: 'Pitch received',
    successMessage: 'Thanks for sharing your idea. It is ready for editorial review.',
    alternateAction: 'Contact Colin',
    alternateDescription: 'Have a general question or message that is not a post proposal?',
    alternatePath: `/${PATH_NAMES.CONTACT}`,
  },
};

@Component({
  selector: 'app-public-submission-page',
  imports: [ReactiveFormsModule, RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <main class="submission-page">
      <div class="submission-shell">
        <nav class="blog-breadcrumb" aria-label="Submission page navigation">
          <a routerLink="/" class="font-medium hover:text-cyan-800 dark:hover:text-cyan-200">Home</a>
          <span aria-hidden="true" class="mx-2">/</span>
          <span aria-current="page" class="text-slate-900 dark:text-zinc-200">{{ content.title }}</span>
        </nav>

        <!-- Keep the unbroken ColinMichaels.com wordmark in the full-width hero, outside the narrower form grid. -->
        <header
          class="submission-introduction"
          [class.submission-introduction-author]="isAuthorPitch"
        >
          <div class="submission-hero-copy">
            <h1>{{ content.title }}</h1>
            <p>{{ content.description }}</p>
          </div>

          @if (isAuthorPitch) {
            <div class="submission-hero-art" aria-hidden="true">
              <span class="submission-orbit"></span>
              <span class="submission-paper submission-paper-back"></span>
              <span class="submission-paper submission-paper-middle"></span>
              <span class="submission-paper submission-paper-front">
                <i></i>
                <i></i>
                <i></i>
              </span>
              <span class="submission-spark"></span>
            </div>
          }
        </header>

        <div class="submission-layout">
          <div class="submission-guidance">

            <section class="submission-expectations" aria-labelledby="submission-expectations-title">
              <h2 id="submission-expectations-title">What happens next</h2>
              @if (isAuthorPitch) {
                <ol>
                  <li>The idea, sources, writing background, and proposed public credit are reviewed.</li>
                  <li>If the idea is a fit, Colin will reply by email about scope and next steps.</li>
                  <li>Author profiles and writing access are created only after approval; this form grants no publishing permissions.</li>
                </ol>
              } @else {
                <ol>
                  <li>Your message is stored in a private review queue.</li>
                  <li>Colin will reply by email when a response is appropriate.</li>
                  <li>Privacy or removal requests are handled using the information you provide here.</li>
                </ol>
              }
            </section>

            <aside class="submission-alternate">
              <p>{{ content.alternateDescription }}</p>
              <a [routerLink]="content.alternatePath">{{ content.alternateAction }}</a>
            </aside>
          </div>

          <section class="submission-form-surface" [attr.aria-labelledby]="formTitleId">
            @if (submissionReference()) {
              <div
                class="submission-success"
                role="status"
                tabindex="-1"
                data-submission-success
              >
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <path d="m5 12.5 4.25 4.25L19 7"></path>
                </svg>
                <h2>{{ content.successTitle }}</h2>
                <p>{{ content.successMessage }}</p>
                <p class="submission-reference">
                  Reference: <strong>{{ submissionReference() }}</strong>
                </p>
                <div class="submission-success-actions">
                  <button type="button" class="btn-secondary" (click)="startAnotherSubmission()">
                    Send another
                  </button>
                  <a routerLink="/" class="btn-primary">Return home</a>
                </div>
              </div>
            } @else {
              <form [formGroup]="form" (ngSubmit)="submit()" novalidate>
                <div class="submission-form-heading">
                  <h2 [id]="formTitleId">{{ content.formTitle }}</h2>
                  <p>Fields marked <span aria-hidden="true">*</span><span class="sr-only">required</span> are required.</p>
                </div>

                <fieldset>
                  <legend>About you</legend>
                  <div class="submission-fields submission-fields-two-column">
                    <div class="submission-field">
                      <label for="submission-name">Your name <span aria-hidden="true">*</span></label>
                      <input
                        id="submission-name"
                        type="text"
                        formControlName="name"
                        autocomplete="name"
                        maxlength="120"
                        [attr.aria-invalid]="isInvalid('name')"
                        [attr.aria-describedby]="isInvalid('name') ? 'submission-name-error' : null"
                      >
                      @if (isInvalid('name')) {
                        <p id="submission-name-error" class="submission-error">Enter your name.</p>
                      }
                    </div>

                    <div class="submission-field">
                      <label for="submission-email">Email address <span aria-hidden="true">*</span></label>
                      <input
                        id="submission-email"
                        type="email"
                        formControlName="email"
                        autocomplete="email"
                        inputmode="email"
                        maxlength="254"
                        [attr.aria-invalid]="isInvalid('email')"
                        [attr.aria-describedby]="isInvalid('email') ? 'submission-email-error' : null"
                      >
                      @if (isInvalid('email')) {
                        <p id="submission-email-error" class="submission-error">Enter a valid email address.</p>
                      }
                    </div>
                  </div>
                </fieldset>

                @if (isAuthorPitch) {
                  <fieldset>
                    <legend>Your public author credit</legend>
                    <p class="submission-fieldset-description">
                      These answers are for review. Nothing is published automatically.
                    </p>
                    <div class="submission-fields submission-fields-two-column">
                      <div class="submission-field">
                        <label for="submission-credit-name">Byline or credit name <span aria-hidden="true">*</span></label>
                        <input
                          id="submission-credit-name"
                          type="text"
                          formControlName="creditName"
                          autocomplete="nickname"
                          maxlength="120"
                          [attr.aria-invalid]="isInvalid('creditName')"
                        >
                        @if (isInvalid('creditName')) {
                          <p class="submission-error">Enter the name you would want shown publicly.</p>
                        }
                      </div>

                      <div class="submission-field">
                        <label for="submission-location">Public location <span class="submission-optional">Optional</span></label>
                        <input
                          id="submission-location"
                          type="text"
                          formControlName="location"
                          autocomplete="address-level2"
                          maxlength="120"
                          placeholder="City, state, or region"
                        >
                      </div>

                      <div class="submission-field">
                        <label for="submission-role">Title or current role <span class="submission-optional">Optional</span></label>
                        <input
                          id="submission-role"
                          type="text"
                          formControlName="currentRole"
                          autocomplete="organization-title"
                          maxlength="160"
                        >
                      </div>

                      <div class="submission-field">
                        <label for="submission-website">Website or main profile <span class="submission-optional">Optional</span></label>
                        <input
                          id="submission-website"
                          type="url"
                          formControlName="profileWebsite"
                          autocomplete="url"
                          inputmode="url"
                          maxlength="500"
                          placeholder="https://example.com"
                          [attr.aria-invalid]="isInvalid('profileWebsite')"
                        >
                        @if (isInvalid('profileWebsite')) {
                          <p class="submission-error">Use a complete HTTP or HTTPS URL.</p>
                        }
                      </div>

                      <div class="submission-field submission-field-full">
                        <label for="submission-bio">Short author bio <span aria-hidden="true">*</span></label>
                        <textarea
                          id="submission-bio"
                          formControlName="shortBio"
                          rows="4"
                          maxlength="600"
                          [attr.aria-invalid]="isInvalid('shortBio')"
                          aria-describedby="submission-bio-hint"
                        ></textarea>
                        <p id="submission-bio-hint" class="submission-hint">40–600 characters. Write it close to how you would want it presented.</p>
                        @if (isInvalid('shortBio')) {
                          <p class="submission-error">Add a short bio of at least 40 characters.</p>
                        }
                      </div>

                      <div class="submission-field submission-field-full">
                        <label for="submission-credit-details">Other credit details <span class="submission-optional">Optional</span></label>
                        <textarea
                          id="submission-credit-details"
                          formControlName="creditDetails"
                          rows="3"
                          maxlength="800"
                          placeholder="Preferred pronouns, professional affiliations, social profiles, or other public credit notes"
                        ></textarea>
                      </div>
                    </div>
                  </fieldset>

                  <fieldset>
                    <legend>Your post idea</legend>
                    <div class="submission-fields">
                      <div class="submission-field">
                        <label for="submission-topics">Topics you want to write about <span aria-hidden="true">*</span></label>
                        <input
                          id="submission-topics"
                          type="text"
                          formControlName="topics"
                          maxlength="500"
                          placeholder="For example: recovery, AI workflows, Angular, travel"
                          [attr.aria-invalid]="isInvalid('topics')"
                        >
                        @if (isInvalid('topics')) {
                          <p class="submission-error">List at least one topic.</p>
                        }
                      </div>

                      <div class="submission-field">
                        <label for="submission-title">Working post title <span aria-hidden="true">*</span></label>
                        <input
                          id="submission-title"
                          type="text"
                          formControlName="proposedTitle"
                          maxlength="180"
                          [attr.aria-invalid]="isInvalid('proposedTitle')"
                        >
                        @if (isInvalid('proposedTitle')) {
                          <p class="submission-error">Add a working title.</p>
                        }
                      </div>

                      <div class="submission-field">
                        <label for="submission-pitch">What is the post, and why should it be published? <span aria-hidden="true">*</span></label>
                        <textarea
                          id="submission-pitch"
                          formControlName="pitch"
                          rows="8"
                          maxlength="5000"
                          [attr.aria-invalid]="isInvalid('pitch')"
                          aria-describedby="submission-pitch-hint"
                        ></textarea>
                        <p id="submission-pitch-hint" class="submission-hint">Include the reader, main takeaway, your perspective, and a rough outline. Minimum 80 characters.</p>
                        @if (isInvalid('pitch')) {
                          <p class="submission-error">Describe the idea in at least 80 characters.</p>
                        }
                      </div>

                      <div class="submission-field">
                        <label for="submission-references">References or source material <span class="submission-optional">Optional</span></label>
                        <textarea
                          id="submission-references"
                          formControlName="references"
                          rows="5"
                          maxlength="3000"
                          placeholder="List links, books, papers, interviews, data, or first-hand sources you expect to use"
                        ></textarea>
                      </div>

                      <div class="submission-field">
                        <label for="submission-history">Where else do you publish? <span class="submission-optional">Optional</span></label>
                        <textarea
                          id="submission-history"
                          formControlName="publishingHistory"
                          rows="5"
                          maxlength="3000"
                          placeholder="Share publications, newsletters, social profiles, portfolio links, or representative work"
                        ></textarea>
                      </div>
                    </div>
                  </fieldset>
                } @else {
                  <fieldset>
                    <legend>{{ content.formTitle }}</legend>
                    <div class="submission-fields">
                      <div class="submission-field">
                        <label for="submission-reason">What is this about? <span aria-hidden="true">*</span></label>
                        <select id="submission-reason" formControlName="reason">
                          <option value="general">General question</option>
                          <option value="project">Project or collaboration</option>
                          <option value="correction">Correction or site feedback</option>
                          <option value="media">Media or interview request</option>
                          <option value="privacy">Privacy or data removal</option>
                          <option value="other">Something else</option>
                        </select>
                      </div>

                      <div class="submission-field">
                        <label for="submission-subject">Subject <span aria-hidden="true">*</span></label>
                        <input
                          id="submission-subject"
                          type="text"
                          formControlName="subject"
                          maxlength="160"
                          [attr.aria-invalid]="isInvalid('subject')"
                        >
                        @if (isInvalid('subject')) {
                          <p class="submission-error">Add a short subject.</p>
                        }
                      </div>

                      <div class="submission-field">
                        <label for="submission-message">Message <span aria-hidden="true">*</span></label>
                        <textarea
                          id="submission-message"
                          formControlName="message"
                          rows="9"
                          maxlength="4000"
                          [attr.aria-invalid]="isInvalid('message')"
                          aria-describedby="submission-message-hint"
                        ></textarea>
                        <p id="submission-message-hint" class="submission-hint">Add enough detail to understand and respond to your message.</p>
                        @if (isInvalid('message')) {
                          <p class="submission-error">Enter a message of at least 20 characters.</p>
                        }
                      </div>
                    </div>
                  </fieldset>
                }

                <div class="submission-honeypot" aria-hidden="true">
                  <label for="submission-company">Company</label>
                  <input
                    id="submission-company"
                    type="text"
                    formControlName="company"
                    autocomplete="off"
                    tabindex="-1"
                  >
                </div>

                <fieldset class="submission-confirmations">
                  <legend>Before you submit</legend>
                  @if (isAuthorPitch) {
                    <label class="submission-checkbox">
                      <input type="checkbox" formControlName="originalWorkConfirmation">
                      <span>I confirm this is my original proposal and that I can identify the sources and permissions needed for any submitted work.</span>
                    </label>
                    @if (isInvalid('originalWorkConfirmation')) {
                      <p class="submission-error">Confirm the original-work statement.</p>
                    }
                  }

                  <label class="submission-checkbox">
                    <input type="checkbox" formControlName="privacyConsent">
                    <span>
                      I agree that the information in this form may be stored and used to review and respond to my submission.
                      See the <a [routerLink]="['/', pathNames.PRIVACY]">Privacy Policy</a>.
                    </span>
                  </label>
                  @if (isInvalid('privacyConsent')) {
                    <p class="submission-error">Consent is required to send this form.</p>
                  }
                </fieldset>

                @if (submissionError()) {
                  <div class="submission-alert" role="alert">
                    <strong>Unable to submit</strong>
                    <p>{{ submissionError() }}</p>
                  </div>
                }

                <div class="submission-actions">
                  <button type="submit" class="btn-primary" [disabled]="isSubmitting()">
                    @if (isSubmitting()) {
                      Sending…
                    } @else {
                      {{ content.submitLabel }}
                    }
                  </button>
                  <p>Your answers remain private unless you later approve public author information or published work.</p>
                </div>
              </form>
            }
          </section>
        </div>
      </div>
    </main>
  `,
  styles: `
    :host {
      display: block;
    }

    .submission-page {
      position: relative;
      isolation: isolate;
      min-height: 75vh;
      padding: clamp(2rem, 5vw, 4.5rem) 1rem clamp(4rem, 8vw, 7rem);
      background:
        radial-gradient(circle at 78% 2%, rgb(var(--site-accent-rgb) / 0.13), transparent 32rem),
        linear-gradient(rgb(var(--site-accent-rgb) / 0.025) 1px, transparent 1px),
        linear-gradient(90deg, rgb(var(--site-accent-rgb) / 0.025) 1px, transparent 1px),
        var(--site-bg);
      background-size: auto, 3.5rem 3.5rem, 3.5rem 3.5rem, auto;
      color: var(--site-text);
      overflow: hidden;
    }

    .submission-shell {
      width: min(100%, 76rem);
      margin-inline: auto;
    }

    .submission-introduction {
      display: grid;
      position: relative;
      align-items: center;
      gap: clamp(2rem, 6vw, 5rem);
      margin-top: clamp(2rem, 5vw, 4rem);
      padding: clamp(2rem, 4vw, 3.25rem) clamp(0rem, 2vw, 1.5rem);
      border-block: 1px solid rgb(var(--site-accent-rgb) / 0.15);
    }

    .submission-introduction-author {
      min-height: clamp(17rem, 28vw, 22rem);
    }

    .submission-introduction::before {
      position: absolute;
      inset: 0;
      z-index: -1;
      background: linear-gradient(115deg, rgb(var(--site-accent-rgb) / 0.06), transparent 56%);
      content: '';
      pointer-events: none;
    }

    .submission-hero-copy {
      min-width: 0;
    }

    .submission-layout {
      display: grid;
      gap: clamp(2rem, 5vw, 4.5rem);
      margin-top: clamp(2.5rem, 5vw, 4.5rem);
    }

    .submission-introduction h1 {
      max-width: 14ch;
      margin: 0;
      color: var(--site-heading);
      font-family: var(--font-heading);
      font-size: clamp(3.1rem, 7vw, 5.35rem);
      font-weight: 720;
      letter-spacing: -0.052em;
      line-height: 0.94;
      text-wrap: balance;
    }

    .submission-hero-copy > p {
      max-width: 38rem;
      margin-top: 1.5rem;
      color: var(--site-muted);
      font-size: clamp(1.05rem, 2vw, 1.25rem);
      line-height: 1.75;
    }

    .submission-hero-art {
      position: relative;
      width: min(100%, 23rem);
      aspect-ratio: 1.35;
      justify-self: end;
      filter: drop-shadow(0 2rem 3rem rgb(2 132 199 / 0.08));
    }

    .submission-orbit {
      position: absolute;
      inset: 7% 2% 4% 8%;
      border: 1px solid rgb(var(--site-accent-rgb) / 0.22);
      border-radius: 50%;
      transform: rotate(-11deg);
    }

    .submission-orbit::after {
      position: absolute;
      top: 46%;
      right: -0.35rem;
      width: 0.7rem;
      height: 0.7rem;
      border-radius: 999px;
      background: var(--site-accent-strong);
      box-shadow: 0 0 1.5rem rgb(var(--site-accent-rgb) / 0.85);
      content: '';
    }

    .submission-paper {
      position: absolute;
      inset: 20% 10% 14% 14%;
      border: 1px solid rgb(var(--site-accent-rgb) / 0.2);
      background: color-mix(in srgb, var(--site-panel) 92%, transparent);
    }

    .submission-paper-back {
      transform: rotate(-8deg) translate(-1rem, 0.25rem);
      opacity: 0.45;
    }

    .submission-paper-middle {
      transform: rotate(5deg) translate(0.75rem, -0.35rem);
      opacity: 0.68;
    }

    .submission-paper-front {
      display: grid;
      align-content: center;
      gap: 0.85rem;
      padding: 2rem;
      border-top-color: rgb(var(--site-accent-rgb) / 0.62);
      box-shadow: 0 1.25rem 3rem rgb(0 0 0 / 0.18);
      animation: submission-paper-float 7s ease-in-out infinite;
    }

    .submission-paper-front::before {
      width: 54%;
      height: 0.55rem;
      border-radius: 999px;
      background: rgb(var(--site-accent-rgb) / 0.34);
      content: '';
    }

    .submission-paper-front i {
      display: block;
      height: 0.3rem;
      border-radius: 999px;
      background: color-mix(in srgb, var(--site-muted) 35%, transparent);
    }

    .submission-paper-front i:nth-child(2) {
      width: 82%;
    }

    .submission-paper-front i:nth-child(3) {
      width: 68%;
    }

    .submission-spark {
      position: absolute;
      top: 12%;
      right: 8%;
      width: 2px;
      height: 2px;
      border-radius: 999px;
      background: var(--site-heading);
      box-shadow:
        -2.5rem 1.75rem 0 1px rgb(var(--site-accent-rgb) / 0.55),
        -0.75rem 4rem 0 rgb(var(--site-accent-rgb) / 0.4),
        -5rem -0.5rem 0 rgb(var(--site-accent-rgb) / 0.45);
    }

    .submission-expectations {
      margin-top: 0;
      padding: clamp(1.25rem, 3vw, 1.75rem);
      border: 1px solid var(--site-border);
      border-top: 2px solid rgb(var(--site-accent-rgb) / 0.55);
      background: color-mix(in srgb, var(--site-panel) 78%, transparent);
    }

    .submission-expectations h2,
    .submission-alternate a {
      color: var(--site-heading);
      font-family: var(--font-accent);
      font-weight: 720;
    }

    .submission-expectations h2 {
      font-size: 1rem;
      letter-spacing: 0.02em;
    }

    .submission-expectations ol {
      display: grid;
      gap: 0.9rem;
      margin: 1.25rem 0 0;
      padding: 0;
      counter-reset: submission-step;
      list-style: none;
    }

    .submission-expectations li {
      display: grid;
      position: relative;
      grid-template-columns: 2rem minmax(0, 1fr);
      gap: 0.85rem;
      color: var(--site-muted);
      line-height: 1.65;
      counter-increment: submission-step;
    }

    .submission-expectations li:not(:last-child)::after {
      position: absolute;
      top: 2rem;
      bottom: -0.9rem;
      left: calc(1rem - 0.5px);
      width: 1px;
      background: rgb(var(--site-accent-rgb) / 0.2);
      content: '';
    }

    .submission-expectations li::before {
      display: grid;
      width: 2rem;
      height: 2rem;
      place-items: center;
      border: 1px solid rgb(var(--site-accent-rgb) / 0.35);
      border-radius: 999px;
      color: var(--site-accent-strong);
      content: counter(submission-step);
      font-family: var(--font-accent);
      font-size: 0.8rem;
      font-weight: 700;
    }

    .submission-alternate {
      margin-top: 2rem;
      padding: 1.25rem;
      border-left: 3px solid var(--site-accent-strong);
      background: linear-gradient(110deg, rgb(var(--site-accent-rgb) / 0.1), rgb(var(--site-accent-rgb) / 0.025));
    }

    .submission-alternate p {
      color: var(--site-muted);
      line-height: 1.6;
    }

    .submission-alternate a {
      display: inline-block;
      margin-top: 0.65rem;
      color: var(--site-accent-strong);
      text-decoration: underline;
      text-underline-offset: 0.2em;
    }

    .submission-form-surface {
      position: relative;
      min-width: 0;
      border: 1px solid var(--site-border);
      border-radius: 0.85rem;
      background:
        linear-gradient(145deg, rgb(var(--site-accent-rgb) / 0.035), transparent 18rem),
        var(--site-panel);
      box-shadow: 0 2rem 5rem rgb(0 0 0 / 0.16);
      overflow: hidden;
    }

    .submission-form-surface::before {
      position: absolute;
      inset: 0 0 auto;
      height: 3px;
      background: linear-gradient(90deg, var(--site-accent-strong), rgb(var(--site-accent-rgb) / 0.08) 72%, transparent);
      content: '';
    }

    .submission-form-surface form,
    .submission-success {
      padding: clamp(1.25rem, 4vw, 2.5rem);
    }

    .submission-form-heading {
      display: flex;
      flex-wrap: wrap;
      align-items: baseline;
      justify-content: space-between;
      gap: 0.75rem 2rem;
      padding-bottom: 1.5rem;
      border-bottom: 1px solid var(--site-border);
    }

    .submission-form-surface form {
      counter-reset: submission-section;
    }

    .submission-form-heading h2,
    fieldset legend,
    .submission-success h2 {
      color: var(--site-heading);
      font-family: var(--font-heading);
      font-weight: 720;
    }

    .submission-form-heading h2,
    .submission-success h2 {
      font-size: clamp(1.65rem, 3vw, 2.2rem);
      letter-spacing: -0.025em;
    }

    .submission-form-heading p,
    .submission-hint,
    .submission-fieldset-description,
    .submission-actions p,
    .submission-reference {
      color: var(--site-muted);
      font-size: 0.84rem;
      line-height: 1.55;
    }

    fieldset {
      counter-increment: submission-section;
      min-width: 0;
      margin: 0;
      padding: 2rem 0;
      border: 0;
      border-bottom: 1px solid var(--site-border);
    }

    fieldset legend {
      float: left;
      width: 100%;
      margin-bottom: 1.25rem;
      font-size: 1.1rem;
    }

    fieldset legend::before {
      display: inline-block;
      min-width: 2.35rem;
      margin-right: 0.65rem;
      color: var(--site-accent-strong);
      content: counter(submission-section, decimal-leading-zero);
      font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
      font-size: 0.72rem;
      font-weight: 700;
      letter-spacing: 0.08em;
      vertical-align: 0.13em;
    }

    fieldset legend + * {
      clear: both;
    }

    .submission-fieldset-description {
      margin: -0.75rem 0 1.25rem;
    }

    .submission-fields {
      display: grid;
      gap: 1.25rem;
    }

    .submission-field {
      min-width: 0;
    }

    .submission-field label {
      display: block;
      margin-bottom: 0.5rem;
      color: var(--site-heading);
      font-family: var(--font-accent);
      font-size: 0.9rem;
      font-weight: 700;
    }

    .submission-optional {
      margin-left: 0.35rem;
      color: var(--site-muted);
      font-size: 0.72rem;
      font-weight: 500;
      text-transform: uppercase;
    }

    .submission-field :is(input, select, textarea) {
      width: 100%;
      border: 1px solid color-mix(in srgb, var(--site-text) 24%, transparent);
      border-radius: 0.45rem;
      background: color-mix(in srgb, var(--site-bg) 92%, var(--site-panel));
      color: var(--site-text);
      font-family: var(--font-body);
      font-size: 1rem;
      line-height: 1.5;
      transition: border-color 160ms ease, box-shadow 160ms ease, background-color 160ms ease;
    }

    .submission-field :is(input, select, textarea):hover:not(:focus-visible) {
      border-color: rgb(var(--site-accent-rgb) / 0.38);
    }

    .submission-field :is(input, select) {
      min-height: 3rem;
      padding: 0.7rem 0.85rem;
    }

    .submission-field textarea {
      min-height: 7rem;
      padding: 0.8rem 0.85rem;
      resize: vertical;
    }

    .submission-field :is(input, select, textarea)::placeholder {
      color: var(--site-muted);
      opacity: 0.75;
    }

    .submission-field :is(input, select, textarea):focus-visible {
      border-color: var(--site-accent-strong);
      outline: 3px solid rgb(var(--site-accent-rgb) / 0.2);
      outline-offset: 1px;
    }

    .submission-field :is(input, select, textarea)[aria-invalid='true'] {
      border-color: rgb(220 38 38 / 0.75);
    }

    .submission-hint {
      margin-top: 0.45rem;
    }

    .submission-error {
      margin-top: 0.45rem;
      color: rgb(185 28 28);
      font-size: 0.82rem;
      font-weight: 620;
      line-height: 1.45;
    }

    :host-context(.dark) .submission-error {
      color: rgb(252 165 165);
    }

    .submission-confirmations {
      display: grid;
      gap: 1rem;
    }

    .submission-checkbox {
      display: grid;
      grid-template-columns: 1.25rem minmax(0, 1fr);
      gap: 0.75rem;
      color: var(--site-muted);
      line-height: 1.6;
    }

    .submission-checkbox input {
      width: 1.15rem;
      height: 1.15rem;
      margin-top: 0.2rem;
      accent-color: var(--site-accent-strong);
    }

    .submission-checkbox a {
      color: var(--site-accent-strong);
      font-weight: 650;
      text-decoration: underline;
      text-underline-offset: 0.18em;
    }

    .submission-alert {
      margin-top: 1.5rem;
      padding: 1rem 1.1rem;
      border: 1px solid rgb(220 38 38 / 0.35);
      border-radius: 0.45rem;
      background: rgb(220 38 38 / 0.06);
      color: var(--site-text);
    }

    .submission-alert strong {
      color: rgb(185 28 28);
    }

    .submission-alert p {
      margin-top: 0.3rem;
      color: var(--site-muted);
      line-height: 1.55;
    }

    .submission-actions,
    .submission-success-actions {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 1rem 1.5rem;
      padding-top: 1.5rem;
    }

    .submission-actions p {
      max-width: 30rem;
    }

    .submission-actions button[disabled] {
      cursor: wait;
      opacity: 0.65;
    }

    .submission-honeypot {
      position: absolute;
      left: -10000px;
      width: 1px;
      height: 1px;
      overflow: hidden;
    }

    .submission-success {
      display: grid;
      min-height: 28rem;
      place-content: center;
      text-align: center;
    }

    .submission-success > svg {
      width: 4rem;
      height: 4rem;
      margin: 0 auto 1.5rem;
      padding: 0.85rem;
      border: 1px solid rgb(var(--site-accent-rgb) / 0.35);
      border-radius: 999px;
      color: var(--site-accent-strong);
      fill: none;
      stroke: currentColor;
      stroke-linecap: round;
      stroke-linejoin: round;
      stroke-width: 1.8;
    }

    .submission-success > p {
      max-width: 30rem;
      margin: 1rem auto 0;
      color: var(--site-muted);
      line-height: 1.65;
    }

    .submission-reference strong {
      color: var(--site-text);
      font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
      overflow-wrap: anywhere;
    }

    .submission-success-actions {
      justify-content: center;
    }

    @media (min-width: 46rem) {
      .submission-fields-two-column {
        grid-template-columns: repeat(2, minmax(0, 1fr));
      }

      .submission-field-full {
        grid-column: 1 / -1;
      }
    }

    @media (min-width: 64rem) {
      .submission-introduction-author {
        grid-template-columns: minmax(0, 1fr) minmax(17rem, 0.48fr);
      }

      .submission-layout {
        grid-template-columns: minmax(18rem, 0.72fr) minmax(0, 1.28fr);
        align-items: start;
      }

      .submission-guidance {
        position: sticky;
        top: calc(var(--site-header-sticky-height) + 2rem);
      }
    }

    @media (max-width: 63.999rem) {
      .submission-introduction {
        min-height: auto;
      }

      .submission-hero-art {
        display: none;
      }
    }

    @media (max-width: 32rem) {
      .submission-page {
        padding-inline: 0.75rem;
      }

      .submission-introduction h1 {
        max-width: 100%;
        font-size: clamp(2.5rem, 10.2vw, 3rem);
        line-height: 0.98;
      }

      .submission-introduction {
        padding-block: 2.25rem;
      }

      .submission-form-surface form,
      .submission-success {
        padding-inline: 1rem;
      }

      .submission-actions :is(button, a),
      .submission-success-actions :is(button, a) {
        width: 100%;
        justify-content: center;
      }
    }

    @media (prefers-reduced-motion: reduce) {
      .submission-field :is(input, select, textarea),
      .submission-paper-front {
        animation: none;
        transition: none;
      }
    }

    @keyframes submission-paper-float {
      0%,
      100% {
        transform: translateY(0);
      }

      50% {
        transform: translateY(-0.55rem);
      }
    }
  `,
})
export class PublicSubmissionPageComponent {
  private readonly elementRef: ElementRef<HTMLElement> = inject(ElementRef);
  private readonly route = inject(ActivatedRoute);
  private readonly submissions = inject(PublicSubmissionService);

  protected readonly pathNames = PATH_NAMES;
  protected readonly submissionType = this.getSubmissionType();
  protected readonly isAuthorPitch = this.submissionType === 'author-pitch';
  protected readonly content = SUBMISSION_PAGE_CONTENT[this.submissionType];
  protected readonly formTitleId = `${this.submissionType}-form-title`;
  protected readonly form = createPublicSubmissionForm(this.submissionType);
  protected readonly isSubmitting = signal(false);
  protected readonly submissionError = signal<string | null>(null);
  protected readonly submissionReference = signal<string | null>(null);

  protected async submit(): Promise<void> {
    this.submissionError.set(null);

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      queueMicrotask(() => this.focusFirstInvalidControl());
      return;
    }

    this.isSubmitting.set(true);
    try {
      const result = await this.submissions.submit(this.createRequest());
      this.submissionReference.set(result.referenceId);
      this.form.reset({reason: 'general'});
      queueMicrotask(() => this.elementRef.nativeElement
        .querySelector<HTMLElement>('[data-submission-success]')
        ?.focus());
    } catch (error) {
      this.submissionError.set(this.toSubmissionErrorMessage(error));
    } finally {
      this.isSubmitting.set(false);
    }
  }

  protected isInvalid(controlName: keyof typeof this.form.controls): boolean {
    const control = this.form.controls[controlName];
    return control.invalid && (control.touched || control.dirty);
  }

  protected startAnotherSubmission(): void {
    this.submissionReference.set(null);
    this.submissionError.set(null);
    this.form.reset({reason: 'general'});
    queueMicrotask(() => this.elementRef.nativeElement
      .querySelector<HTMLInputElement>('#submission-name')
      ?.focus());
  }

  private createRequest(): PublicSubmissionRequest {
    const value = this.form.getRawValue();
    const base = {
      name: value.name.trim(),
      email: value.email.trim(),
      privacyConsent: true as const,
      company: value.company.trim(),
    };

    if (!this.isAuthorPitch) {
      return {
        ...base,
        type: 'contact',
        reason: value.reason as ContactSubmissionRequest['reason'],
        subject: value.subject.trim(),
        message: value.message.trim(),
      };
    }

    return {
      ...base,
      type: 'author-pitch',
      creditName: value.creditName.trim(),
      location: value.location.trim(),
      profileWebsite: value.profileWebsite.trim(),
      currentRole: value.currentRole.trim(),
      shortBio: value.shortBio.trim(),
      topics: value.topics.trim(),
      proposedTitle: value.proposedTitle.trim(),
      pitch: value.pitch.trim(),
      references: value.references.trim(),
      publishingHistory: value.publishingHistory.trim(),
      creditDetails: value.creditDetails.trim(),
      originalWorkConfirmation: true,
    } satisfies AuthorPitchSubmissionRequest;
  }

  private getSubmissionType(): PublicSubmissionType {
    return this.route.snapshot.data['submissionType'] === 'author-pitch'
      ? 'author-pitch'
      : 'contact';
  }

  private focusFirstInvalidControl(): void {
    this.elementRef.nativeElement
      .querySelector<HTMLElement>('input.ng-invalid:not([tabindex="-1"]), select.ng-invalid, textarea.ng-invalid')
      ?.focus();
  }

  private toSubmissionErrorMessage(error: unknown): string {
    if (error instanceof FirebaseError) {
      if (error.code === 'functions/resource-exhausted') {
        return 'Too many forms were submitted from this connection. Please wait and try again.';
      }
      if (error.code === 'functions/unavailable' || error.code === 'functions/deadline-exceeded') {
        return 'The submission service is temporarily unavailable. Your answers are still here; please try again.';
      }
      if (error.code === 'functions/invalid-argument') {
        return 'One or more answers could not be accepted. Review the form and try again.';
      }
    }

    return 'Your form could not be sent. Your answers are still here; please try again.';
  }
}

export function createPublicSubmissionForm(type: PublicSubmissionType): FormGroup<{
  name: FormControl<string>;
  email: FormControl<string>;
  reason: FormControl<string>;
  subject: FormControl<string>;
  message: FormControl<string>;
  creditName: FormControl<string>;
  location: FormControl<string>;
  profileWebsite: FormControl<string>;
  currentRole: FormControl<string>;
  shortBio: FormControl<string>;
  topics: FormControl<string>;
  proposedTitle: FormControl<string>;
  pitch: FormControl<string>;
  references: FormControl<string>;
  publishingHistory: FormControl<string>;
  creditDetails: FormControl<string>;
  originalWorkConfirmation: FormControl<boolean>;
  privacyConsent: FormControl<boolean>;
  company: FormControl<string>;
}> {
  const authorValidators = (validators: ValidatorFn[]) => (
    type === 'author-pitch' ? validators : []
  );
  const contactValidators = (validators: ValidatorFn[]) => (
    type === 'contact' ? validators : []
  );

  return new FormGroup({
    name: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.minLength(2), Validators.maxLength(120)],
    }),
    email: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.email, Validators.maxLength(254)],
    }),
    reason: new FormControl('general', {
      nonNullable: true,
      validators: contactValidators([Validators.required]),
    }),
    subject: new FormControl('', {
      nonNullable: true,
      validators: contactValidators([Validators.required, Validators.minLength(3), Validators.maxLength(160)]),
    }),
    message: new FormControl('', {
      nonNullable: true,
      validators: contactValidators([Validators.required, Validators.minLength(20), Validators.maxLength(4_000)]),
    }),
    creditName: new FormControl('', {
      nonNullable: true,
      validators: authorValidators([Validators.required, Validators.minLength(2), Validators.maxLength(120)]),
    }),
    location: new FormControl('', {nonNullable: true, validators: [Validators.maxLength(120)]}),
    profileWebsite: new FormControl('', {
      nonNullable: true,
      validators: [Validators.maxLength(500), optionalHttpUrlValidator],
    }),
    currentRole: new FormControl('', {nonNullable: true, validators: [Validators.maxLength(160)]}),
    shortBio: new FormControl('', {
      nonNullable: true,
      validators: authorValidators([Validators.required, Validators.minLength(40), Validators.maxLength(600)]),
    }),
    topics: new FormControl('', {
      nonNullable: true,
      validators: authorValidators([Validators.required, Validators.minLength(3), Validators.maxLength(500)]),
    }),
    proposedTitle: new FormControl('', {
      nonNullable: true,
      validators: authorValidators([Validators.required, Validators.minLength(5), Validators.maxLength(180)]),
    }),
    pitch: new FormControl('', {
      nonNullable: true,
      validators: authorValidators([Validators.required, Validators.minLength(80), Validators.maxLength(5_000)]),
    }),
    references: new FormControl('', {nonNullable: true, validators: [Validators.maxLength(3_000)]}),
    publishingHistory: new FormControl('', {nonNullable: true, validators: [Validators.maxLength(3_000)]}),
    creditDetails: new FormControl('', {nonNullable: true, validators: [Validators.maxLength(800)]}),
    originalWorkConfirmation: new FormControl(false, {
      nonNullable: true,
      validators: authorValidators([Validators.requiredTrue]),
    }),
    privacyConsent: new FormControl(false, {nonNullable: true, validators: [Validators.requiredTrue]}),
    company: new FormControl('', {nonNullable: true, validators: [Validators.maxLength(200)]}),
  });
}

function optionalHttpUrlValidator(control: AbstractControl<string>): ValidationErrors | null {
  const value = control.value.trim();
  if (!value) {
    return null;
  }

  try {
    const url = new URL(value);
    return url.protocol === 'http:' || url.protocol === 'https:'
      ? null
      : {httpUrl: true};
  } catch {
    return {httpUrl: true};
  }
}
