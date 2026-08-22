import {DatePipe} from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  OnDestroy,
  computed,
  inject,
  signal,
} from '@angular/core';
import {RouterLink} from '@angular/router';
import {Subscription} from 'rxjs';

import {PATH_NAMES} from '../../app-route-paths';
import {BlogComment, BlogCommentStatus} from '../../features/blog/models/blog-comment.model';
import {
  CommentModerationAction,
  CommentModerationService,
} from './services/comment-moderation.service';
import {AdminAlertComponent} from '../shared/admin-alert.component';
import {AdminEmptyStateComponent} from '../shared/admin-empty-state.component';
import {AdminPageHeaderComponent} from '../shared/admin-page-header.component';
import {AdminSearchFieldComponent} from '../shared/admin-search-field.component';
import {DialogFocusDirective} from '../shared/dialog-focus.directive';

const moderationStatuses: readonly BlogCommentStatus[] = ['pending', 'approved', 'hidden', 'deleted'];

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'Unknown moderation error';
}

@Component({
  selector: 'app-comment-moderation-page',
  imports: [
    AdminAlertComponent,
    AdminEmptyStateComponent,
    AdminPageHeaderComponent,
    AdminSearchFieldComponent,
    DialogFocusDirective,
    DatePipe,
    RouterLink,
  ],
  changeDetection: ChangeDetectionStrategy.Eager,
  template: `
    <main class="min-h-screen bg-zinc-950 px-5 py-10 text-zinc-100 sm:px-8 lg:px-12">
      <section class="mx-auto max-w-6xl space-y-8">
        <app-admin-page-header
          eyebrow="Admin"
          title="Comment Moderation"
          description="Review first-time comments, trust approved readers, and hide or restore published discussion."
        >
          <button
            adminPageHeaderActions
            type="button"
            class="inline-flex justify-center border border-zinc-700 px-4 py-2 text-sm font-medium text-zinc-200 hover:bg-zinc-800 disabled:cursor-not-allowed disabled:text-zinc-600"
            [disabled]="isLoading() || savingCommentId() !== null"
            (click)="listenToStatus(selectedStatus())"
          >
            Refresh
          </button>
        </app-admin-page-header>

        <section class="flex flex-wrap gap-2" aria-label="Comment status filters">
          @for (status of statuses; track status) {
            <button
              type="button"
              class="border px-4 py-2 text-sm font-medium disabled:cursor-not-allowed disabled:opacity-60"
              [class.border-cyan-300]="selectedStatus() === status"
              [class.bg-cyan-400]="selectedStatus() === status"
              [class.text-zinc-950]="selectedStatus() === status"
              [class.border-zinc-700]="selectedStatus() !== status"
              [class.text-zinc-200]="selectedStatus() !== status"
              [attr.aria-pressed]="selectedStatus() === status"
              [disabled]="isLoading() || savingCommentId() !== null"
              (click)="listenToStatus(status)"
            >
              {{ status }}
            </button>
          }
        </section>

        <app-admin-search-field
          label="Search comments"
          placeholder="Search author, post, reply, or comment text"
          [value]="searchQuery()"
          (valueChange)="searchQuery.set($event)"
        ></app-admin-search-field>

        @if (statusMessage()) {
          <p class="border border-emerald-500/30 bg-emerald-950/20 px-4 py-3 text-sm text-emerald-100" role="status" aria-live="polite">{{ statusMessage() }}</p>
        }

        @if (errorMessage()) {
          <app-admin-alert [message]="errorMessage()!"></app-admin-alert>
        }

        <section class="grid gap-4">
          @if (isLoading()) {
            <p class="border border-zinc-800 bg-zinc-900 p-5 text-zinc-400" role="status" aria-live="polite">Loading comments...</p>
          } @else {
            @for (comment of filteredComments(); track comment.id) {
              <article
                class="grid gap-4 border border-zinc-800 bg-zinc-900 p-5"
                [attr.aria-busy]="savingCommentId() === comment.id"
              >
                <header class="grid gap-2 md:grid-cols-[1fr_auto] md:items-start">
                  <div>
                    <p class="font-semibold text-zinc-50">{{ comment.authorDisplayName || comment.authorUid }}</p>
                    <p class="mt-1 break-all text-xs text-zinc-500">{{ comment.authorUid }}</p>
                    <p class="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-zinc-500">
                      <span>{{ comment.createdAt | date: 'MMM d, y, h:mm a' }}</span>
                      <span aria-hidden="true">&middot;</span>
                      <a
                        [routerLink]="['/', pathNames.BLOG, comment.postSlug]"
                        fragment="blog-comments"
                        target="_blank"
                        rel="noopener noreferrer"
                        class="font-medium text-cyan-300 underline decoration-cyan-300/40 underline-offset-4 hover:text-cyan-200"
                        [attr.aria-label]="'View post and discussion for ' + comment.postSlug"
                      >
                        View post &amp; discussion
                        <span aria-hidden="true">&nearr;</span>
                      </a>
                    </p>
                    @if (comment.parentCommentId) {
                      <p class="mt-1 text-xs text-cyan-300">
                        Reply to {{ comment.parentAuthorDisplayName || comment.parentCommentId }}
                      </p>
                    }
                  </div>
                  <span class="justify-self-start border border-zinc-700 px-2 py-1 text-xs uppercase tracking-[0.18em] text-zinc-300 md:justify-self-end">
                    {{ comment.status }}
                  </span>
                </header>

                <p class="whitespace-pre-line text-sm leading-7 text-zinc-300">{{ comment.body }}</p>

                <footer class="flex flex-wrap items-center gap-2">
                  <div class="flex flex-wrap gap-2" aria-label="Routine comment moderation actions">
                    @if (comment.status === 'pending') {
                      <button type="button" class="border border-emerald-400 px-3 py-2 text-sm text-emerald-100 hover:bg-emerald-400 hover:text-zinc-950 disabled:cursor-wait disabled:opacity-50" [disabled]="savingCommentId() !== null" (click)="moderate(comment, 'approve')">Approve</button>
                      <button type="button" class="border border-amber-400 px-3 py-2 text-sm text-amber-100 hover:bg-amber-400 hover:text-zinc-950 disabled:cursor-wait disabled:opacity-50" [disabled]="savingCommentId() !== null" (click)="moderate(comment, 'hide')">Hide</button>
                    }
                    @if (comment.status === 'approved') {
                      <button type="button" class="border border-amber-400 px-3 py-2 text-sm text-amber-100 hover:bg-amber-400 hover:text-zinc-950 disabled:cursor-wait disabled:opacity-50" [disabled]="savingCommentId() !== null" (click)="moderate(comment, 'hide')">Hide</button>
                    }
                    @if (comment.status === 'hidden') {
                      <button type="button" class="border border-cyan-400 px-3 py-2 text-sm text-cyan-100 hover:bg-cyan-400 hover:text-zinc-950 disabled:cursor-wait disabled:opacity-50" [disabled]="savingCommentId() !== null" (click)="moderate(comment, 'restore')">Restore</button>
                    }
                    @if (comment.status === 'deleted') {
                      <button type="button" class="border border-cyan-400 px-3 py-2 text-sm text-cyan-100 hover:bg-cyan-400 hover:text-zinc-950 disabled:cursor-wait disabled:opacity-50" [disabled]="savingCommentId() !== null" (click)="moderate(comment, 'restore')">Restore</button>
                    }
                  </div>
                  @if (comment.status !== 'deleted') {
                    <div class="ml-auto border-l border-zinc-700 pl-3" aria-label="Destructive comment actions">
                      <button type="button" class="border border-red-400 px-3 py-2 text-sm text-red-100 hover:bg-red-400 hover:text-zinc-950 disabled:cursor-wait disabled:opacity-50" [disabled]="savingCommentId() !== null" (click)="requestDelete(comment, $event)">Delete</button>
                    </div>
                  }
                  @if (savingCommentId() === comment.id) {
                    <span class="w-full text-xs text-cyan-200" role="status" aria-live="polite">Saving moderation change...</span>
                  }
                </footer>
              </article>
            } @empty {
              <app-admin-empty-state [message]="emptyStateMessage()"></app-admin-empty-state>
            }
          }
        </section>

        @if (pendingDeleteComment(); as comment) {
          <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4">
            <section
              class="w-full max-w-lg border border-red-400/50 bg-zinc-950 p-6 shadow-2xl outline-none"
              role="dialog"
              aria-modal="true"
              aria-labelledby="delete-comment-title"
              aria-describedby="delete-comment-description"
              [appDialogFocus]="deleteTrigger"
              (appDialogEscape)="cancelDelete()"
            >
              <h2 id="delete-comment-title" class="text-xl font-semibold text-zinc-50" tabindex="-1" data-dialog-initial-focus>Move comment to Deleted?</h2>
              <p id="delete-comment-description" class="mt-3 text-sm leading-6 text-zinc-300">
                This removes the comment from public discussion and keeps the retained record in the Deleted queue. It can be restored later.
              </p>
              <p class="mt-4 max-h-32 overflow-y-auto border-l-2 border-zinc-700 pl-3 text-sm text-zinc-400">
                {{ comment.body }}
              </p>
              <div class="mt-6 flex flex-wrap justify-end gap-3">
                <button type="button" class="min-h-11 border border-zinc-600 px-4 py-2 text-sm text-zinc-200 hover:bg-zinc-800" (click)="cancelDelete()">Cancel</button>
                <button type="button" class="min-h-11 border border-red-400 bg-red-950/40 px-4 py-2 text-sm font-semibold text-red-100 hover:bg-red-400 hover:text-zinc-950" (click)="confirmDelete()">Move to Deleted</button>
              </div>
            </section>
          </div>
        }
      </section>
    </main>
  `,
})
export class CommentModerationPageComponent implements OnDestroy {
  private readonly moderation = inject(CommentModerationService);
  private commentsSubscription?: Subscription;

  protected readonly statuses = moderationStatuses;
  protected readonly pathNames = PATH_NAMES;
  protected readonly selectedStatus = signal<BlogCommentStatus>('pending');
  protected readonly comments = signal<readonly BlogComment[]>([]);
  protected readonly searchQuery = signal('');
  protected readonly filteredComments = computed(() => {
    const query = this.searchQuery().trim().toLocaleLowerCase();

    if (!query) {
      return this.comments();
    }

    return this.comments().filter(comment => [
      comment.authorDisplayName,
      comment.authorUid,
      comment.body,
      comment.postSlug,
      comment.parentAuthorDisplayName,
      comment.parentCommentId,
    ].some(value => value?.toLocaleLowerCase().includes(query)));
  });
  protected readonly isLoading = signal(false);
  protected readonly errorMessage = signal<string | null>(null);
  protected readonly statusMessage = signal<string | null>(null);
  protected readonly savingCommentId = signal<string | null>(null);
  protected readonly pendingDeleteComment = signal<BlogComment | null>(null);
  protected deleteTrigger: HTMLElement | null = null;

  constructor() {
    this.listenToStatus('pending');
  }

  ngOnDestroy(): void {
    this.commentsSubscription?.unsubscribe();
  }

  protected listenToStatus(status: BlogCommentStatus): void {
    this.commentsSubscription?.unsubscribe();
    this.selectedStatus.set(status);
    this.isLoading.set(true);
    this.errorMessage.set(null);
    this.statusMessage.set(null);

    this.commentsSubscription = this.moderation.listenToComments(status)
      .subscribe({
        next: comments => {
          this.comments.set(comments);
          this.isLoading.set(false);
        },
        error: error => {
          this.errorMessage.set(getErrorMessage(error));
          this.comments.set([]);
          this.isLoading.set(false);
        },
      });
  }

  protected async moderate(comment: BlogComment, action: CommentModerationAction): Promise<void> {
    if (this.savingCommentId() !== null) {
      return;
    }

    this.savingCommentId.set(comment.id);
    this.errorMessage.set(null);
    this.statusMessage.set(null);

    try {
      const result = await this.moderation.moderateComment(comment.id, action);
      this.statusMessage.set(this.createStatusMessage(action, result.trustedAuthor, result.awardedPoints));
    } catch (error) {
      this.errorMessage.set(getErrorMessage(error));
    } finally {
      this.savingCommentId.set(null);
    }
  }

  protected requestDelete(comment: BlogComment, event: Event): void {
    if (this.savingCommentId() !== null) {
      return;
    }

    this.deleteTrigger = event.currentTarget instanceof HTMLElement ? event.currentTarget : null;
    this.pendingDeleteComment.set(comment);
  }

  protected cancelDelete(): void {
    this.pendingDeleteComment.set(null);
  }

  protected confirmDelete(): void {
    const comment = this.pendingDeleteComment();
    if (!comment) {
      return;
    }

    this.pendingDeleteComment.set(null);
    void this.moderate(comment, 'delete');
  }

  private createStatusMessage(action: CommentModerationAction, trustedAuthor: boolean, awardedPoints: boolean): string {
    if (action === 'approve') {
      return `Comment approved.${trustedAuthor ? ' Author is now trusted.' : ''}${awardedPoints ? ' Points awarded.' : ''}`;
    }

    if (action === 'restore') {
      return 'Comment restored.';
    }

    return action === 'delete' ? 'Comment moved to Deleted.' : 'Comment hidden.';
  }

  protected emptyStateMessage(): string {
    if (this.searchQuery().trim()) {
      return `No ${this.selectedStatus()} comments match this search.`;
    }

    switch (this.selectedStatus()) {
      case 'pending':
        return 'No pending comments. Approved, hidden, and deleted comments are available in their status tabs.';
      case 'approved':
        return 'No approved comments yet.';
      case 'hidden':
        return 'No hidden comments.';
      case 'deleted':
        return 'No deleted comments.';
    }
  }
}
