import {DatePipe} from '@angular/common';
import {ChangeDetectionStrategy, Component, OnDestroy, inject, signal} from '@angular/core';
import {RouterLink} from '@angular/router';
import {Subscription} from 'rxjs';

import {BlogComment, BlogCommentStatus} from '../../features/blog/models/blog-comment.model';
import {
  CommentModerationAction,
  CommentModerationService,
} from './services/comment-moderation.service';

const moderationStatuses: readonly BlogCommentStatus[] = ['pending', 'approved', 'hidden', 'deleted'];

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'Unknown moderation error';
}

@Component({
  selector: 'app-comment-moderation-page',
  imports: [
    DatePipe,
    RouterLink,
  ],
  changeDetection: ChangeDetectionStrategy.Eager,
  template: `
    <main class="min-h-screen bg-zinc-950 px-5 py-10 text-zinc-100 sm:px-8 lg:px-12">
      <section class="mx-auto max-w-6xl space-y-8">
        <nav class="flex items-center justify-between text-sm text-zinc-400">
          <a routerLink="/admin" class="hover:text-zinc-100">Admin</a>
          <a routerLink="/blog" class="hover:text-zinc-100">Blog</a>
        </nav>

        <header class="grid gap-5 border-b border-zinc-800 pb-8 md:grid-cols-[1fr_auto] md:items-end">
          <div class="space-y-3">
            <p class="text-sm uppercase tracking-[0.3em] text-cyan-300">Admin</p>
            <h1 class="text-4xl font-semibold text-zinc-50">Comment Moderation</h1>
            <p class="max-w-2xl text-zinc-400">Review first-time comments, trust approved readers, and hide or restore published discussion.</p>
          </div>
          <button
            type="button"
            class="inline-flex justify-center border border-zinc-700 px-4 py-2 text-sm font-medium text-zinc-200 hover:bg-zinc-800 disabled:cursor-not-allowed disabled:text-zinc-600"
            [disabled]="isLoading()"
            (click)="listenToStatus(selectedStatus())"
          >
            Refresh
          </button>
        </header>

        <section class="flex flex-wrap gap-2" aria-label="Comment status filters">
          @for (status of statuses; track status) {
            <button
              type="button"
              class="border px-4 py-2 text-sm font-medium"
              [class.border-cyan-300]="selectedStatus() === status"
              [class.bg-cyan-400]="selectedStatus() === status"
              [class.text-zinc-950]="selectedStatus() === status"
              [class.border-zinc-700]="selectedStatus() !== status"
              [class.text-zinc-200]="selectedStatus() !== status"
              (click)="listenToStatus(status)"
            >
              {{ status }}
            </button>
          }
        </section>

        @if (statusMessage()) {
          <p class="border border-emerald-500/30 bg-emerald-950/20 px-4 py-3 text-sm text-emerald-100">{{ statusMessage() }}</p>
        }

        @if (errorMessage()) {
          <p class="border border-red-500/40 bg-red-950/30 px-4 py-3 text-sm text-red-100">{{ errorMessage() }}</p>
        }

        <section class="grid gap-4">
          @if (isLoading()) {
            <p class="border border-zinc-800 bg-zinc-900 p-5 text-zinc-400">Loading comments...</p>
          } @else {
            @for (comment of comments(); track comment.id) {
              <article class="grid gap-4 border border-zinc-800 bg-zinc-900 p-5">
                <header class="grid gap-2 md:grid-cols-[1fr_auto] md:items-start">
                  <div>
                    <p class="font-semibold text-zinc-50">{{ comment.authorDisplayName || comment.authorUid }}</p>
                    <p class="mt-1 break-all text-xs text-zinc-500">{{ comment.authorUid }}</p>
                    <p class="mt-1 text-xs text-zinc-500">
                      {{ comment.createdAt | date: 'MMM d, y, h:mm a' }} on /blog/{{ comment.postSlug }}
                    </p>
                  </div>
                  <span class="justify-self-start border border-zinc-700 px-2 py-1 text-xs uppercase tracking-[0.18em] text-zinc-300 md:justify-self-end">
                    {{ comment.status }}
                  </span>
                </header>

                <p class="whitespace-pre-line text-sm leading-7 text-zinc-300">{{ comment.body }}</p>

                <footer class="flex flex-wrap gap-2">
                  @if (comment.status === 'pending') {
                    <button type="button" class="border border-emerald-400 px-3 py-2 text-sm text-emerald-100 hover:bg-emerald-400 hover:text-zinc-950" (click)="moderate(comment, 'approve')">Approve</button>
                    <button type="button" class="border border-amber-400 px-3 py-2 text-sm text-amber-100 hover:bg-amber-400 hover:text-zinc-950" (click)="moderate(comment, 'hide')">Hide</button>
                  }
                  @if (comment.status === 'approved') {
                    <button type="button" class="border border-amber-400 px-3 py-2 text-sm text-amber-100 hover:bg-amber-400 hover:text-zinc-950" (click)="moderate(comment, 'hide')">Hide</button>
                  }
                  @if (comment.status === 'hidden') {
                    <button type="button" class="border border-cyan-400 px-3 py-2 text-sm text-cyan-100 hover:bg-cyan-400 hover:text-zinc-950" (click)="moderate(comment, 'restore')">Restore</button>
                  }
                  @if (comment.status !== 'deleted') {
                    <button type="button" class="border border-red-400 px-3 py-2 text-sm text-red-100 hover:bg-red-400 hover:text-zinc-950" (click)="moderate(comment, 'delete')">Delete</button>
                  }
                </footer>
              </article>
            } @empty {
              <p class="border border-zinc-800 bg-zinc-900 p-5 text-zinc-400">{{ emptyStateMessage() }}</p>
            }
          }
        </section>
      </section>
    </main>
  `,
})
export class CommentModerationPageComponent implements OnDestroy {
  private readonly moderation = inject(CommentModerationService);
  private commentsSubscription?: Subscription;

  protected readonly statuses = moderationStatuses;
  protected readonly selectedStatus = signal<BlogCommentStatus>('pending');
  protected readonly comments = signal<readonly BlogComment[]>([]);
  protected readonly isLoading = signal(false);
  protected readonly errorMessage = signal<string | null>(null);
  protected readonly statusMessage = signal<string | null>(null);
  protected readonly savingCommentId = signal<string | null>(null);

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

  private createStatusMessage(action: CommentModerationAction, trustedAuthor: boolean, awardedPoints: boolean): string {
    if (action === 'approve') {
      return `Comment approved.${trustedAuthor ? ' Author is now trusted.' : ''}${awardedPoints ? ' Points awarded.' : ''}`;
    }

    if (action === 'restore') {
      return 'Comment restored.';
    }

    return action === 'delete' ? 'Comment deleted.' : 'Comment hidden.';
  }

  protected emptyStateMessage(): string {
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
