import {DatePipe, NgClass} from '@angular/common';
import {ChangeDetectionStrategy, Component, OnDestroy, computed, inject, signal} from '@angular/core';
import {ActivatedRoute} from '@angular/router';
import {Subscription} from 'rxjs';

import {AdminEmptyStateComponent} from '../shared/admin-empty-state.component';
import {AdminSearchFieldComponent} from '../shared/admin-search-field.component';
import {
  PUBLIC_SUBMISSION_STATUSES,
  PublicSubmission,
  PublicSubmissionReviewAction,
  PublicSubmissionStatus,
  getPublicSubmissionSearchText,
  getPublicSubmissionSummary,
} from './public-submission.models';
import {PublicSubmissionService} from './public-submission.service';

function getErrorMessage(error: unknown): string {
  return error instanceof Error && error.message ? error.message : 'The submission workflow could not be updated.';
}

@Component({
  selector: 'app-public-submissions-page',
  imports: [AdminEmptyStateComponent, AdminSearchFieldComponent, DatePipe, NgClass],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <main class="min-h-[calc(100vh-4rem)] bg-zinc-950 px-4 py-8 text-zinc-100 sm:px-6 lg:px-8 xl:px-10">
      <section class="mx-auto max-w-[96rem] space-y-6">
        <header class="grid gap-5 border-b border-zinc-800 pb-7 md:grid-cols-[minmax(0,1fr)_auto] md:items-end">
          <div>
            <h1 class="text-3xl font-semibold tracking-tight text-zinc-50 sm:text-4xl">Submissions</h1>
            <p class="mt-3 max-w-2xl text-sm leading-6 text-zinc-400 sm:text-base">
              Review contact messages and prospective-author proposals.
            </p>
          </div>
          <button
            type="button"
            class="inline-flex h-10 items-center justify-center border border-zinc-700 px-4 text-sm font-semibold text-zinc-200 hover:border-cyan-400 hover:text-cyan-200 disabled:cursor-not-allowed disabled:text-zinc-600"
            [disabled]="isLoading()"
            (click)="listenToSubmissions()"
          >
            Refresh
          </button>
        </header>

        <section class="grid border-y border-zinc-800 sm:grid-cols-2 xl:grid-cols-5" aria-label="Submission status counts">
          @for (status of statuses; track status) {
            <button
              type="button"
              class="border-b border-zinc-800 px-4 py-4 text-left hover:bg-zinc-900/70 focus-visible:bg-zinc-900/70 xl:border-b-0 xl:border-r xl:last:border-r-0"
              [class.bg-zinc-900]="selectedStatus() === status"
              [attr.aria-pressed]="selectedStatus() === status"
              (click)="selectStatus(status)"
            >
              <span class="block text-xs font-semibold uppercase tracking-[0.14em] text-zinc-600">{{ statusLabel(status) }}</span>
              <span
                class="mt-2 block text-2xl font-semibold"
                [class.text-cyan-300]="status === 'new'"
                [class.text-amber-300]="status === 'in-review'"
                [class.text-emerald-300]="status === 'responded'"
                [class.text-zinc-300]="status === 'archived'"
                [class.text-red-300]="status === 'rejected'"
              >{{ statusCounts()[status] }}</span>
            </button>
          }
        </section>

        <div class="grid gap-4 sm:grid-cols-[minmax(0,1fr)_18rem] sm:items-end">
          <nav class="flex gap-1 overflow-x-auto border-b border-zinc-800" aria-label="Submission status filters">
            @for (status of statuses; track status) {
              <button
                type="button"
                class="shrink-0 border-b-2 px-3 py-2 text-sm font-medium"
                [class.border-cyan-400]="selectedStatus() === status"
                [class.text-cyan-200]="selectedStatus() === status"
                [class.border-transparent]="selectedStatus() !== status"
                [class.text-zinc-500]="selectedStatus() !== status"
                (click)="selectStatus(status)"
              >
                {{ statusLabel(status) }}
              </button>
            }
          </nav>
          <app-admin-search-field
            label="Search"
            placeholder="Search submissions"
            [value]="searchQuery()"
            (valueChange)="updateSearch($event)"
          ></app-admin-search-field>
        </div>

        @if (statusMessage()) {
          <p class="border border-emerald-500/30 bg-emerald-950/20 px-4 py-3 text-sm text-emerald-100" role="status" aria-live="polite">
            {{ statusMessage() }}
          </p>
        }
        @if (errorMessage()) {
          <p class="border border-red-500/40 bg-red-950/30 px-4 py-3 text-sm text-red-100" role="alert" aria-live="assertive">
            {{ errorMessage() }}
          </p>
        }

        @if (isLoading()) {
          <p class="border border-zinc-800 bg-zinc-900 p-5 text-sm text-zinc-400" role="status">Loading submissions...</p>
        } @else if (filteredSubmissions().length === 0) {
          <app-admin-empty-state [message]="emptyStateMessage()"></app-admin-empty-state>
        } @else {
          <div class="grid min-h-[36rem] border border-zinc-800 xl:grid-cols-[minmax(18rem,0.72fr)_minmax(22rem,1fr)_minmax(21rem,0.9fr)]">
            <section class="min-w-0 border-b border-zinc-800 xl:border-b-0 xl:border-r" aria-label="Submission list">
              <div class="grid grid-cols-[minmax(0,1fr)_auto] border-b border-zinc-800 px-4 py-3 text-xs font-semibold uppercase tracking-[0.12em] text-zinc-600">
                <span>From and subject</span>
                <span>Received</span>
              </div>
              <div class="max-h-[42rem] overflow-y-auto">
                @for (submission of filteredSubmissions(); track submission.id) {
                  <button
                    type="button"
                    class="grid w-full grid-cols-[minmax(0,1fr)_auto] gap-3 border-b border-zinc-800 px-4 py-4 text-left hover:bg-zinc-900 focus-visible:bg-zinc-900"
                    [ngClass]="selectedSubmissionId() === submission.id
                      ? 'border-l-2 border-l-cyan-400 bg-cyan-400/5'
                      : ''"
                    [attr.aria-pressed]="selectedSubmissionId() === submission.id"
                    (click)="selectSubmission(submission)"
                  >
                    <span class="min-w-0">
                      <span class="block truncate text-sm font-semibold text-zinc-200">{{ submission.contact.name }}</span>
                      <span class="mt-1 block truncate text-xs text-zinc-500">{{ submission.contact.email }}</span>
                      <span class="mt-2 block truncate text-sm text-zinc-300">{{ summary(submission) }}</span>
                      <span class="mt-1 block text-xs text-zinc-600">{{ typeLabel(submission) }}</span>
                    </span>
                    <span class="shrink-0 text-right text-xs leading-5 text-zinc-500">
                      {{ submission.submittedAt | date: 'MMM d, y' }}
                      <span class="block">{{ submission.submittedAt | date: 'h:mm a' }}</span>
                    </span>
                  </button>
                }
              </div>
            </section>

            @if (selectedSubmission(); as submission) {
              <article class="min-w-0 border-b border-zinc-800 xl:border-b-0 xl:border-r">
                <header class="border-b border-zinc-800 px-5 py-4">
                  <div class="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p class="text-xs font-semibold uppercase tracking-[0.14em] text-cyan-300">{{ typeLabel(submission) }}</p>
                      <h2 class="mt-2 text-xl font-semibold text-zinc-50">{{ summary(submission) }}</h2>
                      <p class="mt-1 break-all text-xs text-zinc-600">{{ submission.id }}</p>
                    </div>
                    <span class="border border-zinc-700 px-2 py-1 text-xs font-semibold uppercase tracking-[0.12em] text-zinc-300">
                      {{ statusLabel(submission.status) }}
                    </span>
                  </div>

                  <div class="mt-4 flex flex-wrap gap-2">
                    @if (submission.status === 'new') {
                      <button type="button" class="border border-amber-400 px-3 py-2 text-xs font-semibold text-amber-100 hover:bg-amber-400 hover:text-zinc-950" [disabled]="isSaving()" (click)="review(submission, 'start-review')">Start review</button>
                    }
                    @if (submission.status !== 'archived' && submission.status !== 'rejected') {
                      <button type="button" class="border border-cyan-400 px-3 py-2 text-xs font-semibold text-cyan-100 hover:bg-cyan-400 hover:text-zinc-950" [disabled]="isSaving()" (click)="focusResponseComposer()">Respond</button>
                      <button type="button" class="border border-zinc-600 px-3 py-2 text-xs font-semibold text-zinc-200 hover:bg-zinc-700" [disabled]="isSaving()" (click)="review(submission, 'archive')">Archive</button>
                      <button type="button" class="border border-red-400 px-3 py-2 text-xs font-semibold text-red-100 hover:bg-red-400 hover:text-zinc-950" [disabled]="isSaving()" (click)="review(submission, 'reject')">Reject</button>
                    } @else {
                      <button type="button" class="border border-cyan-400 px-3 py-2 text-xs font-semibold text-cyan-100 hover:bg-cyan-400 hover:text-zinc-950" [disabled]="isSaving()" (click)="review(submission, 'restore')">Restore to review</button>
                    }
                  </div>
                </header>

                <div class="max-h-[42rem] space-y-6 overflow-y-auto p-5 text-sm">
                  <dl class="grid grid-cols-[7rem_minmax(0,1fr)] gap-x-4 gap-y-3">
                    <dt class="text-zinc-600">From</dt>
                    <dd class="text-zinc-200">{{ submission.contact.name }}</dd>
                    <dt class="text-zinc-600">Email</dt>
                    <dd class="break-all text-zinc-200">{{ submission.contact.email }}</dd>
                    <dt class="text-zinc-600">Received</dt>
                    <dd class="text-zinc-300">{{ submission.submittedAt | date: 'medium' }}</dd>
                    <dt class="text-zinc-600">Alert</dt>
                    <dd [class.text-emerald-300]="submission.alertDelivery?.status === 'sent'" [class.text-red-300]="submission.alertDelivery?.status === 'failed'">
                      {{ alertDeliveryLabel(submission) }}
                    </dd>
                  </dl>

                  @if (submission.inquiry; as inquiry) {
                    <section class="border-t border-zinc-800 pt-5" aria-labelledby="contact-message-heading">
                      <h3 id="contact-message-heading" class="text-sm font-semibold text-zinc-100">Contact message</h3>
                      <dl class="mt-4 grid gap-4">
                        <div>
                          <dt class="text-xs font-semibold uppercase tracking-[0.12em] text-zinc-600">Reason</dt>
                          <dd class="mt-1 text-zinc-300">{{ inquiry.reason }}</dd>
                        </div>
                        <div>
                          <dt class="text-xs font-semibold uppercase tracking-[0.12em] text-zinc-600">Subject</dt>
                          <dd class="mt-1 text-zinc-300">{{ inquiry.subject }}</dd>
                        </div>
                        <div>
                          <dt class="text-xs font-semibold uppercase tracking-[0.12em] text-zinc-600">Message</dt>
                          <dd class="mt-2 whitespace-pre-line leading-6 text-zinc-300">{{ inquiry.message }}</dd>
                        </div>
                      </dl>
                    </section>
                  }

                  @if (submission.authorProfile; as profile) {
                    <section class="border-t border-zinc-800 pt-5" aria-labelledby="author-profile-heading">
                      <h3 id="author-profile-heading" class="text-sm font-semibold text-zinc-100">Proposed author profile</h3>
                      <dl class="mt-4 grid gap-4">
                        <div><dt class="text-xs uppercase tracking-[0.12em] text-zinc-600">Credit</dt><dd class="mt-1 text-zinc-300">{{ profile.creditName }}</dd></div>
                        @if (profile.currentRole) {<div><dt class="text-xs uppercase tracking-[0.12em] text-zinc-600">Current role</dt><dd class="mt-1 text-zinc-300">{{ profile.currentRole }}</dd></div>}
                        @if (profile.location) {<div><dt class="text-xs uppercase tracking-[0.12em] text-zinc-600">Location</dt><dd class="mt-1 text-zinc-300">{{ profile.location }}</dd></div>}
                        @if (profile.profileWebsite) {<div><dt class="text-xs uppercase tracking-[0.12em] text-zinc-600">Website</dt><dd class="mt-1 break-all"><a [href]="profile.profileWebsite" target="_blank" rel="noopener noreferrer" class="text-cyan-300 underline underline-offset-4">{{ profile.profileWebsite }}</a></dd></div>}
                        <div><dt class="text-xs uppercase tracking-[0.12em] text-zinc-600">Biography</dt><dd class="mt-1 whitespace-pre-line leading-6 text-zinc-300">{{ profile.shortBio }}</dd></div>
                        @if (profile.creditDetails) {<div><dt class="text-xs uppercase tracking-[0.12em] text-zinc-600">Credit details</dt><dd class="mt-1 whitespace-pre-line leading-6 text-zinc-300">{{ profile.creditDetails }}</dd></div>}
                      </dl>
                    </section>
                  }

                  @if (submission.proposal; as proposal) {
                    <section class="border-t border-zinc-800 pt-5" aria-labelledby="proposal-heading">
                      <h3 id="proposal-heading" class="text-sm font-semibold text-zinc-100">Article proposal</h3>
                      <dl class="mt-4 grid gap-4">
                        <div><dt class="text-xs uppercase tracking-[0.12em] text-zinc-600">Topics</dt><dd class="mt-1 whitespace-pre-line leading-6 text-zinc-300">{{ proposal.topics }}</dd></div>
                        <div><dt class="text-xs uppercase tracking-[0.12em] text-zinc-600">Working title</dt><dd class="mt-1 text-zinc-300">{{ proposal.proposedTitle }}</dd></div>
                        <div><dt class="text-xs uppercase tracking-[0.12em] text-zinc-600">Pitch</dt><dd class="mt-1 whitespace-pre-line leading-6 text-zinc-300">{{ proposal.pitch }}</dd></div>
                        @if (proposal.references) {<div><dt class="text-xs uppercase tracking-[0.12em] text-zinc-600">References</dt><dd class="mt-1 whitespace-pre-line break-words leading-6 text-zinc-300">{{ proposal.references }}</dd></div>}
                        @if (proposal.publishingHistory) {<div><dt class="text-xs uppercase tracking-[0.12em] text-zinc-600">Publishing history</dt><dd class="mt-1 whitespace-pre-line break-words leading-6 text-zinc-300">{{ proposal.publishingHistory }}</dd></div>}
                      </dl>
                    </section>
                  }
                </div>
              </article>

              <section class="min-w-0 p-5" aria-labelledby="response-composer-heading">
                <h2 id="response-composer-heading" class="text-lg font-semibold text-zinc-50">Respond</h2>
                @if (submission.status === 'archived' || submission.status === 'rejected') {
                  <p class="mt-3 text-sm leading-6 text-zinc-500">Restore this submission to review before sending a response.</p>
                } @else {
                  <p class="mt-2 text-sm text-zinc-500">To {{ submission.contact.name }} &lt;{{ submission.contact.email }}&gt;</p>
                  <form class="mt-5 space-y-5" (submit)="sendResponse($event, submission)">
                    <label class="block space-y-2">
                      <span class="text-xs font-semibold uppercase tracking-[0.12em] text-zinc-600">Subject</span>
                      <input
                        id="submission-response-subject"
                        type="text"
                        maxlength="160"
                        required
                        class="w-full border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-cyan-300"
                        [value]="responseSubject()"
                        (input)="updateResponseSubject($event)"
                      >
                    </label>
                    <label class="block space-y-2">
                      <span class="text-xs font-semibold uppercase tracking-[0.12em] text-zinc-600">Message</span>
                      <textarea
                        id="submission-response-message"
                        rows="14"
                        maxlength="5000"
                        required
                        placeholder="Write a complete response."
                        class="w-full resize-y border border-zinc-700 bg-zinc-950 px-3 py-3 text-sm leading-6 text-zinc-100 outline-none placeholder:text-zinc-700 focus:border-cyan-300"
                        [value]="responseMessage()"
                        (input)="updateResponseMessage($event)"
                      ></textarea>
                    </label>
                    <button
                      type="submit"
                      class="inline-flex h-10 w-full items-center justify-center border border-cyan-400 px-4 text-sm font-semibold text-cyan-200 hover:bg-cyan-400 hover:text-zinc-950 disabled:cursor-not-allowed disabled:border-zinc-700 disabled:text-zinc-600"
                      [disabled]="isSaving() || responseSubject().trim().length < 3 || responseMessage().trim().length < 10"
                    >
                      {{ isSendingResponse() ? 'Sending response...' : 'Send response' }}
                    </button>
                    <p class="text-xs leading-5 text-zinc-600">The message is sent through the authenticated server mail account and recorded with this submission.</p>
                  </form>
                }
              </section>
            }
          </div>
        }
      </section>
    </main>
  `,
})
export class PublicSubmissionsPageComponent implements OnDestroy {
  private readonly submissionsService = inject(PublicSubmissionService);
  private readonly route = inject(ActivatedRoute);
  private submissionsSubscription?: Subscription;
  private routeSubscription?: Subscription;
  private requestedSubmissionId = '';

  protected readonly statuses = PUBLIC_SUBMISSION_STATUSES;
  protected readonly submissions = signal<readonly PublicSubmission[]>([]);
  protected readonly selectedStatus = signal<PublicSubmissionStatus>('new');
  protected readonly selectedSubmissionId = signal('');
  protected readonly searchQuery = signal('');
  protected readonly isLoading = signal(true);
  protected readonly savingAction = signal<string | null>(null);
  protected readonly statusMessage = signal<string | null>(null);
  protected readonly errorMessage = signal<string | null>(null);
  protected readonly responseSubject = signal('');
  protected readonly responseMessage = signal('');
  private readonly responseRequestId = signal('');

  protected readonly statusCounts = computed<Record<PublicSubmissionStatus, number>>(() => ({
    new: this.submissions().filter(submission => submission.status === 'new').length,
    'in-review': this.submissions().filter(submission => submission.status === 'in-review').length,
    responded: this.submissions().filter(submission => submission.status === 'responded').length,
    archived: this.submissions().filter(submission => submission.status === 'archived').length,
    rejected: this.submissions().filter(submission => submission.status === 'rejected').length,
  }));
  protected readonly filteredSubmissions = computed(() => {
    const query = this.searchQuery().trim().toLowerCase();
    return this.submissions().filter(submission => (
      submission.status === this.selectedStatus()
      && (!query || getPublicSubmissionSearchText(submission).includes(query))
    ));
  });
  protected readonly selectedSubmission = computed(() => this.submissions()
    .find(submission => submission.id === this.selectedSubmissionId()) ?? null);
  protected readonly isSaving = computed(() => this.savingAction() !== null);
  protected readonly isSendingResponse = computed(() => this.savingAction() === 'respond');

  constructor() {
    this.routeSubscription = this.route.queryParamMap.subscribe(params => {
      this.requestedSubmissionId = params.get('submission')?.trim() ?? '';
      this.applyRequestedSelection();
    });
    this.listenToSubmissions();
  }

  ngOnDestroy(): void {
    this.submissionsSubscription?.unsubscribe();
    this.routeSubscription?.unsubscribe();
  }

  protected listenToSubmissions(): void {
    this.submissionsSubscription?.unsubscribe();
    this.isLoading.set(true);
    this.errorMessage.set(null);

    this.submissionsSubscription = this.submissionsService.listenToSubmissions().subscribe({
      next: submissions => {
        this.submissions.set(submissions);
        this.isLoading.set(false);
        if (!this.applyRequestedSelection()) {
          this.ensureVisibleSelection();
        }
      },
      error: error => {
        this.submissions.set([]);
        this.errorMessage.set(getErrorMessage(error));
        this.isLoading.set(false);
      },
    });
  }

  protected selectStatus(status: PublicSubmissionStatus): void {
    this.selectedStatus.set(status);
    this.requestedSubmissionId = '';
    this.statusMessage.set(null);
    this.errorMessage.set(null);
    this.selectFirstFilteredSubmission();
  }

  protected selectSubmission(submission: PublicSubmission): void {
    this.selectedSubmissionId.set(submission.id);
    this.statusMessage.set(null);
    this.errorMessage.set(null);
    this.resetResponseComposer(submission);
  }

  protected updateSearch(value: string): void {
    this.searchQuery.set(value);
    this.selectFirstFilteredSubmission();
  }

  protected async review(submission: PublicSubmission, action: PublicSubmissionReviewAction): Promise<void> {
    this.savingAction.set(action);
    this.statusMessage.set(null);
    this.errorMessage.set(null);
    try {
      const result = await this.submissionsService.reviewSubmission(submission.id, action);
      this.statusMessage.set(this.reviewStatusMessage(result.status));
    } catch (error) {
      this.errorMessage.set(getErrorMessage(error));
    } finally {
      this.savingAction.set(null);
    }
  }

  protected async sendResponse(event: Event, submission: PublicSubmission): Promise<void> {
    event.preventDefault();
    const subject = this.responseSubject().trim();
    const message = this.responseMessage().trim();
    if (subject.length < 3 || message.length < 10) {
      this.errorMessage.set('Add a subject and a complete response before sending.');
      return;
    }

    this.savingAction.set('respond');
    this.statusMessage.set(null);
    this.errorMessage.set(null);
    try {
      const requestId = this.responseRequestId() || this.submissionsService.createResponseRequestId();
      this.responseRequestId.set(requestId);
      await this.submissionsService.respondToSubmission(submission.id, requestId, subject, message);
      this.responseRequestId.set('');
      this.responseMessage.set('');
      this.statusMessage.set(`Response sent to ${submission.contact.email}.`);
    } catch (error) {
      this.errorMessage.set(getErrorMessage(error));
    } finally {
      this.savingAction.set(null);
    }
  }

  protected updateResponseSubject(event: Event): void {
    this.responseSubject.set((event.target as HTMLInputElement | null)?.value ?? '');
    this.responseRequestId.set('');
  }

  protected updateResponseMessage(event: Event): void {
    this.responseMessage.set((event.target as HTMLTextAreaElement | null)?.value ?? '');
    this.responseRequestId.set('');
  }

  protected focusResponseComposer(): void {
    if (typeof document !== 'undefined') {
      document.getElementById('submission-response-subject')?.focus();
    }
  }

  protected statusLabel(status: PublicSubmissionStatus): string {
    return status === 'in-review' ? 'In review' : status.charAt(0).toUpperCase() + status.slice(1);
  }

  protected typeLabel(submission: PublicSubmission): string {
    return submission.type === 'contact' ? 'Contact submission' : 'Author pitch';
  }

  protected summary(submission: PublicSubmission): string {
    return getPublicSubmissionSummary(submission);
  }

  protected alertDeliveryLabel(submission: PublicSubmission): string {
    switch (submission.alertDelivery?.status) {
      case 'sent':
        return submission.alertDelivery.sentAt
          ? `Alert sent ${new Date(submission.alertDelivery.sentAt).toLocaleString()}`
          : 'Alert sent';
      case 'sending':
        return 'Alert sending';
      case 'failed':
        return 'Alert failed; check Functions logs and mail configuration';
      default:
        return 'No alert delivery recorded';
    }
  }

  protected emptyStateMessage(): string {
    const suffix = this.searchQuery().trim() ? ' matching this search' : '';
    return `No ${this.statusLabel(this.selectedStatus()).toLowerCase()} submissions${suffix}.`;
  }

  private applyRequestedSelection(): boolean {
    if (!this.requestedSubmissionId) {
      return false;
    }
    const submission = this.submissions().find(candidate => candidate.id === this.requestedSubmissionId);
    if (!submission) {
      return false;
    }
    this.selectedStatus.set(submission.status);
    this.selectedSubmissionId.set(submission.id);
    this.resetResponseComposer(submission);
    return true;
  }

  private ensureVisibleSelection(): void {
    if (!this.filteredSubmissions().some(submission => submission.id === this.selectedSubmissionId())) {
      this.selectFirstFilteredSubmission();
    }
  }

  private selectFirstFilteredSubmission(): void {
    const first = this.filteredSubmissions()[0] ?? null;
    this.selectedSubmissionId.set(first?.id ?? '');
    if (first) {
      this.resetResponseComposer(first);
    } else {
      this.responseSubject.set('');
      this.responseMessage.set('');
      this.responseRequestId.set('');
    }
  }

  private resetResponseComposer(submission: PublicSubmission): void {
    this.responseSubject.set(`Re: ${getPublicSubmissionSummary(submission)}`.slice(0, 160));
    this.responseMessage.set('');
    this.responseRequestId.set('');
  }

  private reviewStatusMessage(status: PublicSubmissionStatus): string {
    switch (status) {
      case 'in-review':
        return 'Submission moved into review.';
      case 'archived':
        return 'Submission archived.';
      case 'rejected':
        return 'Submission rejected.';
      case 'responded':
        return 'Submission marked responded.';
      case 'new':
        return 'Submission restored.';
    }
  }
}
