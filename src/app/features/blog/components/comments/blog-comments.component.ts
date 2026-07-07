import {DatePipe} from '@angular/common';
import {ChangeDetectionStrategy, Component, Input, OnChanges, OnDestroy, SimpleChanges, inject, signal} from '@angular/core';
import {toSignal} from '@angular/core/rxjs-interop';
import {FormBuilder, ReactiveFormsModule, Validators} from '@angular/forms';
import {RouterLink} from '@angular/router';
import {EMPTY, Subscription, catchError} from 'rxjs';

import {PATH_NAMES} from '../../../../app-route-paths';
import {AuthService} from '../../../../services/auth.service';
import {BlogComment} from '../../models/blog-comment.model';
import {BlogPost} from '../../models/blog-post.model';
import {BlogCommentService} from '../../services/blog-comment.service';
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

@Component({
  selector: 'app-blog-comments',
  imports: [
    DatePipe,
    ReactiveFormsModule,
    RouterLink,
  ],
  changeDetection: ChangeDetectionStrategy.Eager,
  template: `
    <section aria-labelledby="blog-comments-heading" class="blog-section-rule mt-10">
      <div class="grid gap-2">
        <p class="eyebrow-sm eyebrow-cyan">Discussion</p>
        <h2 id="blog-comments-heading" class="text-2xl font-semibold text-slate-950 dark:text-zinc-50">Comments</h2>
      </div>

      <div class="mt-6 grid gap-6">
        @if (currentUser()) {
          <form [formGroup]="commentForm" (ngSubmit)="submitComment()" class="grid gap-3 border border-slate-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900/70">
            <label class="grid gap-2 text-sm font-medium text-slate-700 dark:text-zinc-300">
              Add a comment
              <textarea
                formControlName="body"
                rows="4"
                [attr.maxlength]="commentMaxLength"
                class="min-h-32 w-full resize-y rounded-none border border-slate-300 bg-white px-3 py-2 text-slate-950 outline-none transition focus:border-cyan-600 focus:ring-2 focus:ring-cyan-500/20 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100 dark:focus:border-cyan-300"
                placeholder="Share a plain-text thought, question, or note about this post."
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
                class="inline-flex border border-cyan-600 px-4 py-2 font-semibold text-cyan-800 hover:bg-cyan-600 hover:text-white disabled:cursor-not-allowed disabled:border-slate-300 disabled:text-slate-400 disabled:hover:bg-transparent dark:border-cyan-300 dark:text-cyan-100 dark:hover:bg-cyan-300 dark:hover:text-zinc-950 dark:disabled:border-zinc-700 dark:disabled:text-zinc-600"
              >
                {{ isSubmitting() ? 'Submitting...' : 'Post Comment' }}
              </button>
            </div>
          </form>
        } @else {
          <div class="border border-slate-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900/70">
            <p class="text-sm leading-6 text-slate-600 dark:text-zinc-400">Sign in to join the discussion and earn points for approved comments.</p>
            <a
              [routerLink]="['/', pathNames.OS_LOGIN]"
              [queryParams]="loginQueryParams"
              class="mt-4 inline-flex border border-cyan-600 px-4 py-2 text-sm font-semibold text-cyan-800 hover:bg-cyan-600 hover:text-white dark:border-cyan-300 dark:text-cyan-100 dark:hover:bg-cyan-300 dark:hover:text-zinc-950"
            >
              Sign in
            </a>
          </div>
        }

        @if (statusMessage()) {
          <p class="border border-emerald-500/30 bg-emerald-50 px-4 py-3 text-sm text-emerald-900 dark:bg-emerald-950/20 dark:text-emerald-100">{{ statusMessage() }}</p>
        }

        @if (errorMessage()) {
          <p class="border border-red-500/40 bg-red-50 px-4 py-3 text-sm text-red-900 dark:bg-red-950/30 dark:text-red-100">{{ errorMessage() }}</p>
        }

        <div class="grid gap-4">
          @for (comment of comments(); track comment.id) {
            <article class="border border-slate-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900/60">
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
              <p class="mt-4 whitespace-pre-line text-sm leading-7 text-slate-700 dark:text-zinc-300">{{ comment.body }}</p>
            </article>
          } @empty {
            <p class="border border-slate-200 bg-white p-4 text-sm text-slate-600 dark:border-zinc-800 dark:bg-zinc-900/60 dark:text-zinc-400">
              No comments yet. Start the conversation.
            </p>
          }
        </div>
      </div>
    </section>
  `,
})
export class BlogCommentsComponent implements OnChanges, OnDestroy {
  @Input({required: true}) post!: BlogPost;

  private readonly fb = inject(FormBuilder);
  private readonly authService = inject(AuthService);
  private readonly commentService = inject(BlogCommentService);
  private commentsSubscription?: Subscription;
  private bodyValueSubscription?: Subscription;

  protected readonly currentUser = toSignal(this.authService.user$, {initialValue: null});
  protected readonly comments = signal<readonly BlogComment[]>([]);
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
      const result = await this.commentService.submitComment({
        postId: this.post.id,
        postSlug: this.post.slug,
        body: normalizedBody,
      });
      this.commentForm.reset({body: ''});
      this.commentLength.set(0);
      this.statusMessage.set(result.comment.status === 'approved'
        ? 'Your comment is live.'
        : 'Your comment is waiting for admin review. Once approved, future comments can publish faster.');
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

  private listenToComments(): void {
    this.commentsSubscription?.unsubscribe();

    if (!this.post?.slug) {
      this.comments.set([]);
      return;
    }

    this.commentsSubscription = this.commentService.listenToApprovedComments(this.post.slug)
      .pipe(catchError(error => {
        if (!isPermissionDeniedError(error)) {
          this.errorMessage.set(getErrorMessage(error));
        }

        this.comments.set([]);

        return EMPTY;
      }))
      .subscribe({
        next: comments => this.comments.set(comments),
      });
  }
}
