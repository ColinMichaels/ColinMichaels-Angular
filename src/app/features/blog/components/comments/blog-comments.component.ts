import {DatePipe} from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  Input,
  OnChanges,
  OnDestroy,
  SimpleChanges,
  ViewChild,
  computed,
  inject,
  signal,
} from '@angular/core';
import {toSignal} from '@angular/core/rxjs-interop';
import {FormBuilder, ReactiveFormsModule, Validators} from '@angular/forms';
import {RouterLink} from '@angular/router';
import {EMPTY, Subscription, catchError} from 'rxjs';

import {PATH_NAMES} from '../../../../app-route-paths';
import {AuthService} from '../../../../services/auth.service';
import {SiteAnalyticsService} from '../../../../shared/analytics/site-analytics.service';
import {BlogComment} from '../../models/blog-comment.model';
import {BlogPost} from '../../models/blog-post.model';
import {BLOG_COMMENT_PAGE_SIZE, BlogCommentService} from '../../services/blog-comment.service';
import {
  COMMENT_BODY_MAX_LENGTH,
  COMMENT_BODY_UNSAFE_CONTENT_MESSAGE,
  normalizeCommentBodyInput,
  plainTextCommentValidator,
} from '../../utils/comment-safety.util';

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'Unable to submit comment.';
}

function isPermissionDeniedError(error: unknown): boolean {
  return typeof error === 'object'
    && error !== null
    && 'code' in error
    && String(error.code).includes('permission-denied');
}

const MAX_THREAD_INDENT_DEPTH = 4;

interface BlogCommentThreadItem {
  comment: BlogComment;
  depth: number;
  parentAuthorDisplayName: string | null;
  parentLoaded: boolean;
}

function createCommentThreadItems(comments: readonly BlogComment[]): readonly BlogCommentThreadItem[] {
  const orderedComments = [...comments].sort((firstComment, secondComment) => {
    const dateComparison = firstComment.createdAt.localeCompare(secondComment.createdAt);

    return dateComparison || firstComment.id.localeCompare(secondComment.id);
  });
  const commentsById = new Map(orderedComments.map(comment => [comment.id, comment]));
  const childrenByParentId = new Map<string, BlogComment[]>();
  const rootComments: BlogComment[] = [];

  for (const comment of orderedComments) {
    const parentCommentId = comment.parentCommentId ?? null;

    if (parentCommentId && commentsById.has(parentCommentId)) {
      const siblings = childrenByParentId.get(parentCommentId) ?? [];
      siblings.push(comment);
      childrenByParentId.set(parentCommentId, siblings);
    } else {
      rootComments.push(comment);
    }
  }

  const threadItems: BlogCommentThreadItem[] = [];
  const visitedCommentIds = new Set<string>();
  const addComment = (comment: BlogComment, depth: number): void => {
    if (visitedCommentIds.has(comment.id)) {
      return;
    }

    visitedCommentIds.add(comment.id);
    const parentCommentId = comment.parentCommentId ?? null;
    const parentComment = parentCommentId ? commentsById.get(parentCommentId) : undefined;
    const parentLoaded = Boolean(parentComment);

    threadItems.push({
      comment,
      depth: parentLoaded ? Math.min(depth, MAX_THREAD_INDENT_DEPTH) : 0,
      parentAuthorDisplayName: parentCommentId
        ? comment.parentAuthorDisplayName ?? parentComment?.authorDisplayName ?? 'Reader'
        : null,
      parentLoaded,
    });

    for (const childComment of childrenByParentId.get(comment.id) ?? []) {
      addComment(childComment, depth + 1);
    }
  };

  for (const comment of rootComments) {
    addComment(comment, 0);
  }

  for (const comment of orderedComments) {
    addComment(comment, 0);
  }

  return threadItems;
}

@Component({
  selector: 'app-blog-comments',
  imports: [
    DatePipe,
    ReactiveFormsModule,
    RouterLink,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section aria-labelledby="blog-comments-heading" class="blog-section-rule mt-10">
      <div class="grid gap-2">
        <p class="eyebrow-sm eyebrow-cyan">Discussion</p>
        <h2 id="blog-comments-heading" class="text-2xl font-semibold text-slate-950 dark:text-zinc-50">Comments</h2>
      </div>

      <div class="mt-6 grid gap-6">
        @if (currentUser()) {
          <form [formGroup]="commentForm" (ngSubmit)="submitComment()" class="site-card grid gap-3 p-4">
            @if (replyingToComment(); as replyTarget) {
              <div class="flex flex-wrap items-center justify-between gap-3 border border-cyan-500/30 bg-cyan-50 px-3 py-2 text-sm text-cyan-950 dark:bg-cyan-950/30 dark:text-cyan-100">
                <span>Replying to {{ getCommentAuthorName(replyTarget) }}</span>
                <button
                  type="button"
                  class="font-semibold text-cyan-800 hover:text-cyan-950 dark:text-cyan-100 dark:hover:text-white"
                  (click)="cancelReply()"
                >
                  Cancel
                </button>
              </div>
            }
            <label class="grid gap-2 text-sm font-medium text-slate-700 dark:text-zinc-300">
              {{ replyingToComment() ? 'Add a reply' : 'Add a comment' }}
              <textarea
                #commentBodyInput
                formControlName="body"
                rows="4"
                [attr.maxlength]="commentMaxLength"
                class="site-input min-h-32 w-full resize-y"
                [placeholder]="replyingToComment() ? 'Write a plain-text reply.' : 'Share a plain-text thought, question, or note about this post.'"
              ></textarea>
            </label>
            <p class="text-xs leading-5 text-slate-500 dark:text-zinc-500">
              Plain text only for now. Links and HTML are disabled while moderation tools settle in.
            </p>
            @if (commentForm.controls.body.hasError('unsafeCommentContent') && (commentForm.controls.body.dirty || commentForm.controls.body.touched)) {
              <p class="text-sm text-red-700 dark:text-red-200">{{ unsafeContentMessage }}</p>
            }
            <div class="flex flex-wrap items-center justify-between gap-3 text-sm">
              <span class="text-slate-500 dark:text-zinc-500">{{ commentLength() }}/{{ commentMaxLength }}</span>
              <button
                type="submit"
                [disabled]="commentForm.invalid || isSubmitting()"
                class="btn-primary disabled:cursor-not-allowed disabled:border-slate-300 disabled:text-slate-400 disabled:hover:bg-transparent dark:disabled:border-zinc-700 dark:disabled:text-zinc-600"
              >
                {{ isSubmitting() ? 'Submitting...' : (replyingToComment() ? 'Post Reply' : 'Post Comment') }}
              </button>
            </div>
          </form>
        } @else {
          <div class="site-card p-4">
            <p class="text-sm leading-6 text-slate-600 dark:text-zinc-400">Sign in to join the discussion and earn points for approved comments.</p>
            <a
              [routerLink]="['/', pathNames.OS_LOGIN]"
              [queryParams]="loginQueryParams"
              class="btn-primary mt-4"
            >
              Sign in
            </a>
          </div>
        }

        @if (statusMessage()) {
          <p class="site-success-panel">{{ statusMessage() }}</p>
        }

        @if (errorMessage()) {
          <p class="site-error-panel">{{ errorMessage() }}</p>
        }

        <div class="grid gap-4">
          @if (comments().length) {
            <p class="text-sm text-slate-500 dark:text-zinc-500">
              Showing the {{ comments().length }} most recent approved {{ comments().length === 1 ? 'comment' : 'comments' }}.
            </p>
          }

          @for (item of commentThreadItems(); track item.comment.id) {
            @let comment = item.comment;
            <article
              class="site-card p-4"
              [class.border-l-4]="item.depth > 0"
              [class.border-l-cyan-500]="item.depth > 0"
              [style.margin-left.rem]="getThreadIndentRem(item.depth)"
            >
              <header class="flex flex-wrap items-center gap-3 text-sm">
                @if (comment.authorPhotoURL) {
                  <img [src]="comment.authorPhotoURL" [alt]="(comment.authorDisplayName || 'Reader') + ' avatar'" class="h-9 w-9 rounded-full object-cover" loading="lazy">
                } @else {
                  <span class="grid h-9 w-9 place-items-center rounded-full border border-slate-300 bg-slate-100 text-xs font-semibold text-slate-700 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-200">
                    {{ getInitials(comment) }}
                  </span>
                }
                <div>
                  <p class="font-semibold text-slate-950 dark:text-zinc-100">{{ comment.authorDisplayName || 'Reader' }}</p>
                  <p class="text-xs text-slate-500 dark:text-zinc-500">{{ comment.createdAt | date: 'MMM d, y, h:mm a' }}</p>
                </div>
              </header>
              @if (item.parentAuthorDisplayName) {
                <p class="mt-3 text-xs font-medium uppercase tracking-[0.18em] text-cyan-700 dark:text-cyan-200">
                  Replying to {{ item.parentAuthorDisplayName }}{{ item.parentLoaded ? '' : ' (parent not loaded)' }}
                </p>
              }
              <p class="mt-4 whitespace-pre-line text-sm leading-7 text-slate-700 dark:text-zinc-300">{{ comment.body }}</p>
              @if (currentUser()) {
                <footer class="mt-4">
                  <button
                    type="button"
                    class="text-sm font-semibold text-cyan-800 hover:text-cyan-950 dark:text-cyan-200 dark:hover:text-cyan-100"
                    [attr.aria-label]="getReplyButtonLabel(comment)"
                    (click)="startReply(comment)"
                  >
                    Reply
                  </button>
                </footer>
              }
            </article>
          } @empty {
            <p class="site-empty-panel">
              No comments yet. Start the conversation.
            </p>
          }

          @if (hasMoreComments()) {
            <button
              type="button"
              class="btn-ghost justify-self-start"
              (click)="loadMoreComments()"
            >
              View more comments
            </button>
          }
        </div>
      </div>
    </section>
  `,
})
export class BlogCommentsComponent implements OnChanges, OnDestroy {
  @Input({required: true}) post!: BlogPost;
  @ViewChild('commentBodyInput') private readonly commentBodyInput?: ElementRef<HTMLTextAreaElement>;

  private readonly fb = inject(FormBuilder);
  private readonly authService = inject(AuthService);
  private readonly commentService = inject(BlogCommentService);
  private readonly analytics = inject(SiteAnalyticsService);
  private commentsSubscription?: Subscription;
  private bodyValueSubscription?: Subscription;
  private readonly commentsPageSize = signal(BLOG_COMMENT_PAGE_SIZE);

  protected readonly currentUser = toSignal(this.authService.user$, {initialValue: null});
  protected readonly comments = signal<readonly BlogComment[]>([]);
  protected readonly commentThreadItems = computed(() => createCommentThreadItems(this.comments()));
  protected readonly hasMoreComments = signal(false);
  protected readonly replyingToComment = signal<BlogComment | null>(null);
  protected readonly isSubmitting = signal(false);
  protected readonly statusMessage = signal<string | null>(null);
  protected readonly errorMessage = signal<string | null>(null);
  protected readonly pathNames = PATH_NAMES;
  protected readonly commentMaxLength = COMMENT_BODY_MAX_LENGTH;
  protected readonly unsafeContentMessage = COMMENT_BODY_UNSAFE_CONTENT_MESSAGE;
  protected readonly commentForm = this.fb.nonNullable.group({
    body: ['', [
      Validators.required,
      Validators.minLength(2),
      Validators.maxLength(COMMENT_BODY_MAX_LENGTH),
      plainTextCommentValidator(),
    ]],
  });
  protected readonly commentLength = signal(0);

  protected get loginQueryParams(): Record<string, string> {
    const postSlug = this.post?.slug;

    return {
      redirectUrl: postSlug ? `/${PATH_NAMES.BLOG}/${postSlug}` : `/${PATH_NAMES.BLOG}`,
    };
  }

  constructor() {
    this.bodyValueSubscription = this.commentForm.controls.body.valueChanges.subscribe(value => this.commentLength.set(value.length));
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['post']) {
      this.commentsPageSize.set(BLOG_COMMENT_PAGE_SIZE);
      this.replyingToComment.set(null);
      this.listenToComments();
    }
  }

  ngOnDestroy(): void {
    this.commentsSubscription?.unsubscribe();
    this.bodyValueSubscription?.unsubscribe();
  }

  protected async submitComment(): Promise<void> {
    const normalizedBody = normalizeCommentBodyInput(this.commentForm.controls.body.value);
    this.commentForm.controls.body.setValue(normalizedBody, {emitEvent: false});
    this.commentForm.controls.body.updateValueAndValidity({emitEvent: false});
    this.commentLength.set(normalizedBody.length);

    if (this.commentForm.invalid || !this.post) {
      this.commentForm.markAllAsTouched();
      return;
    }

    this.isSubmitting.set(true);
    this.statusMessage.set(null);
    this.errorMessage.set(null);

    try {
      const replyTarget = this.replyingToComment();
      const result = await this.commentService.submitComment({
        postId: this.post.id,
        postSlug: this.post.slug,
        body: normalizedBody,
        parentCommentId: replyTarget?.id ?? null,
      });
      this.commentForm.reset({body: ''});
      this.commentLength.set(0);
      this.replyingToComment.set(null);
      this.analytics.trackCommentSubmit(
        this.post,
        Boolean(replyTarget),
        result.comment.status === 'approved' ? 'approved' : 'pending'
      );
      this.statusMessage.set(result.comment.status === 'approved'
        ? `Your ${replyTarget ? 'reply' : 'comment'} is live.`
        : `Your ${replyTarget ? 'reply' : 'comment'} is waiting for admin review. Once approved, future comments can publish faster.`);
    } catch (error) {
      this.errorMessage.set(getErrorMessage(error));
    } finally {
      this.isSubmitting.set(false);
    }
  }

  protected getInitials(comment: BlogComment): string {
    return (comment.authorDisplayName || 'Reader')
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map(part => part.charAt(0).toUpperCase())
      .join('') || 'R';
  }

  protected getCommentAuthorName(comment: BlogComment): string {
    return comment.authorDisplayName || 'Reader';
  }

  protected getReplyButtonLabel(comment: BlogComment): string {
    return `Reply to ${this.getCommentAuthorName(comment)}`;
  }

  protected getThreadIndentRem(depth: number): number {
    return Math.max(0, Math.min(depth, MAX_THREAD_INDENT_DEPTH)) * 1.25;
  }

  protected startReply(comment: BlogComment): void {
    this.replyingToComment.set(comment);
    this.statusMessage.set(null);
    this.errorMessage.set(null);
    queueMicrotask(() => this.commentBodyInput?.nativeElement.focus());
  }

  protected cancelReply(): void {
    this.replyingToComment.set(null);
  }

  protected loadMoreComments(): void {
    this.commentsPageSize.update(currentPageSize => currentPageSize + BLOG_COMMENT_PAGE_SIZE);
    this.listenToComments();
  }

  private listenToComments(): void {
    this.commentsSubscription?.unsubscribe();

    if (!this.post?.slug) {
      this.comments.set([]);
      this.hasMoreComments.set(false);
      return;
    }

    this.commentsSubscription = this.commentService.listenToApprovedComments(this.post.slug, this.commentsPageSize())
      .pipe(catchError(error => {
        if (!isPermissionDeniedError(error)) {
          this.errorMessage.set(getErrorMessage(error));
        }

        this.comments.set([]);
        this.hasMoreComments.set(false);

        return EMPTY;
      }))
      .subscribe({
        next: result => {
          this.comments.set(result.comments);
          this.hasMoreComments.set(result.hasMore);
        },
      });
  }
}
