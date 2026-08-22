import {ComponentFixture, TestBed} from '@angular/core/testing';
import {RouterTestingModule} from '@angular/router/testing';
import {Observable, of} from 'rxjs';

import {BlogComment} from '../../features/blog/models/blog-comment.model';
import {CommentModerationPageComponent} from './comment-moderation-page.component';
import {CommentModerationService} from './services/comment-moderation.service';

describe('CommentModerationPageComponent', () => {
  let fixture: ComponentFixture<CommentModerationPageComponent>;
  let moderationService: jasmine.SpyObj<CommentModerationService>;

  const pendingComment: BlogComment = {
    id: 'comment-1',
    postId: 'post-1',
    postSlug: 'contextual-post',
    authorUid: 'reader-1',
    authorDisplayName: 'A Reader',
    authorPhotoURL: null,
    body: 'This comment needs its article context.',
    status: 'pending',
    createdAt: '2026-07-13T12:00:00.000Z',
    updatedAt: '2026-07-13T12:00:00.000Z',
  };

  beforeEach(async () => {
    moderationService = jasmine.createSpyObj('CommentModerationService', [
      'listenToComments',
      'moderateComment',
    ]);
    moderationService.listenToComments.and.returnValue(of([pendingComment]));
    moderationService.moderateComment.and.resolveTo({
      comment: {...pendingComment, status: 'approved'},
      trustedAuthor: true,
      awardedPoints: true,
    });

    await TestBed.configureTestingModule({
      imports: [CommentModerationPageComponent, RouterTestingModule],
      providers: [{provide: CommentModerationService, useValue: moderationService}],
    }).compileComponents();

    fixture = TestBed.createComponent(CommentModerationPageComponent);
    fixture.detectChanges();
  });

  it('links each comment to its public post discussion in a new tab', () => {
    const link = (fixture.nativeElement as HTMLElement)
      .querySelector<HTMLAnchorElement>('a[aria-label="View post and discussion for contextual-post"]');

    expect(link).not.toBeNull();
    expect(link?.getAttribute('href')).toBe('/blog/contextual-post#blog-comments');
    expect(link?.getAttribute('target')).toBe('_blank');
    expect(link?.getAttribute('rel')).toBe('noopener noreferrer');
  });

  it('uses the shared admin header and exposes the active status filter', () => {
    const root = fixture.nativeElement as HTMLElement;
    const heading = root.querySelector('app-admin-page-header h1');
    const pendingFilter = Array.from(root.querySelectorAll<HTMLButtonElement>('section[aria-label="Comment status filters"] button'))
      .find(button => button.textContent?.trim() === 'pending');

    expect(heading?.textContent).toContain('Comment Moderation');
    expect(pendingFilter?.getAttribute('aria-pressed')).toBe('true');
  });

  it('filters comments through the shared search field', () => {
    const root = fixture.nativeElement as HTMLElement;
    const search = root.querySelector<HTMLInputElement>('app-admin-search-field input');

    search!.value = 'no-match';
    search!.dispatchEvent(new Event('input'));
    fixture.detectChanges();

    expect(root.querySelector('article')).toBeNull();
    expect(root.querySelector('app-admin-empty-state')?.textContent).toContain('No pending comments match this search');

    search!.value = 'contextual-post';
    search!.dispatchEvent(new Event('input'));
    fixture.detectChanges();

    expect(root.querySelector('article')?.textContent).toContain(pendingComment.body);
  });

  it('serializes moderation actions and announces the save state', async () => {
    let resolveModeration!: (value: Awaited<ReturnType<CommentModerationService['moderateComment']>>) => void;
    moderationService.moderateComment.and.returnValue(new Promise(resolve => {
      resolveModeration = resolve;
    }));
    const root = fixture.nativeElement as HTMLElement;
    const approveButton = Array.from(root.querySelectorAll<HTMLButtonElement>('button'))
      .find(button => button.textContent?.trim() === 'Approve');
    const deleteButton = Array.from(root.querySelectorAll<HTMLButtonElement>('button'))
      .find(button => button.textContent?.trim() === 'Delete');

    approveButton?.click();
    fixture.detectChanges();
    deleteButton?.click();

    expect(moderationService.moderateComment).toHaveBeenCalledOnceWith(pendingComment.id, 'approve');
    expect(approveButton?.disabled).toBeTrue();
    expect(deleteButton?.disabled).toBeTrue();
    expect(root.querySelector('[role="status"]')?.textContent).toContain('Saving moderation change');
    expect(root.querySelector('article')?.getAttribute('aria-busy')).toBe('true');

    resolveModeration({
      comment: {...pendingComment, status: 'approved'},
      trustedAuthor: true,
      awardedPoints: true,
    });
    await fixture.whenStable();
    fixture.detectChanges();

    const success = Array.from(root.querySelectorAll<HTMLElement>('[role="status"]'))
      .find(element => element.textContent?.includes('Comment approved'));
    expect(success?.getAttribute('aria-live')).toBe('polite');
    expect(success?.textContent).toContain('Author is now trusted');
    expect(success?.textContent).toContain('Points awarded');
  });

  it('renders failures through the shared assertive alert', async () => {
    moderationService.moderateComment.and.rejectWith(new Error('Moderation is unavailable.'));
    const root = fixture.nativeElement as HTMLElement;
    const hideButton = Array.from(root.querySelectorAll<HTMLButtonElement>('button'))
      .find(button => button.textContent?.trim() === 'Hide');

    hideButton?.click();
    await fixture.whenStable();
    fixture.detectChanges();

    const alert = root.querySelector<HTMLElement>('app-admin-alert [role="alert"]');
    expect(alert?.getAttribute('aria-live')).toBe('assertive');
    expect(alert?.textContent).toContain('Moderation is unavailable.');
  });

  it('confirms Delete in an accessible dialog before moving a retained record', async () => {
    const root = fixture.nativeElement as HTMLElement;
    const deleteButton = Array.from(root.querySelectorAll<HTMLButtonElement>('button'))
      .find(button => button.textContent?.trim() === 'Delete');

    deleteButton?.click();
    fixture.detectChanges();

    const dialog = root.querySelector<HTMLElement>('[role="dialog"]');
    expect(dialog?.getAttribute('aria-modal')).toBe('true');
    expect(dialog?.textContent).toContain('keeps the retained record in the Deleted queue');
    expect(moderationService.moderateComment).not.toHaveBeenCalled();

    const cancelButton = Array.from(dialog?.querySelectorAll<HTMLButtonElement>('button') ?? [])
      .find(button => button.textContent?.trim() === 'Cancel');
    cancelButton?.click();
    fixture.detectChanges();
    expect(root.querySelector('[role="dialog"]')).toBeNull();
    expect(moderationService.moderateComment).not.toHaveBeenCalled();

    deleteButton?.click();
    fixture.detectChanges();
    const confirmButton = Array.from(root.querySelectorAll<HTMLButtonElement>('[role="dialog"] button'))
      .find(button => button.textContent?.trim() === 'Move to Deleted');
    confirmButton?.click();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(moderationService.moderateComment).toHaveBeenCalledOnceWith(pendingComment.id, 'delete');
    expect(root.querySelector('[role="dialog"]')).toBeNull();
  });

  it('contains focus inside the Delete dialog, closes on Escape, and restores the trigger', async () => {
    const root = fixture.nativeElement as HTMLElement;
    const deleteButton = Array.from(root.querySelectorAll<HTMLButtonElement>('button'))
      .find(button => button.textContent?.trim() === 'Delete')!;
    deleteButton.focus();
    deleteButton.click();
    fixture.detectChanges();
    await Promise.resolve();

    const dialog = root.querySelector<HTMLElement>('[role="dialog"]')!;
    const dialogTitle = dialog.querySelector<HTMLElement>('#delete-comment-title')!;
    const [cancelButton, confirmButton] = Array.from(dialog.querySelectorAll<HTMLButtonElement>('button'));
    expect(document.activeElement).toBe(dialogTitle);
    expect(deleteButton.closest('[inert]')).not.toBeNull();

    deleteButton.focus();
    expect(document.activeElement).toBe(dialogTitle);

    confirmButton.focus();
    confirmButton.dispatchEvent(new KeyboardEvent('keydown', {key: 'Tab', bubbles: true}));
    expect(document.activeElement).toBe(cancelButton);

    cancelButton.focus();
    cancelButton.dispatchEvent(new KeyboardEvent('keydown', {key: 'Tab', shiftKey: true, bubbles: true}));
    expect(document.activeElement).toBe(confirmButton);

    dialog.dispatchEvent(new KeyboardEvent('keydown', {key: 'Escape', bubbles: true}));
    fixture.detectChanges();
    await Promise.resolve();

    expect(root.querySelector('[role="dialog"]')).toBeNull();
    expect(deleteButton.closest('[inert]')).toBeNull();
    expect(document.activeElement).toBe(deleteButton);
  });

  it('restores a retained record from the Deleted queue and announces the result', async () => {
    const deletedComment = {...pendingComment, status: 'deleted' as const};
    moderationService.listenToComments.and.returnValue(of([deletedComment]));
    const root = fixture.nativeElement as HTMLElement;
    const deletedFilter = Array.from(root.querySelectorAll<HTMLButtonElement>('section[aria-label="Comment status filters"] button'))
      .find(button => button.textContent?.trim() === 'deleted');

    deletedFilter?.click();
    fixture.detectChanges();

    const restoreButton = Array.from(root.querySelectorAll<HTMLButtonElement>('button'))
      .find(button => button.textContent?.trim() === 'Restore');
    expect(restoreButton).toBeDefined();
    expect(root.textContent).not.toContain('Move comment to Deleted?');

    restoreButton?.click();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(moderationService.moderateComment).toHaveBeenCalledOnceWith(deletedComment.id, 'restore');
    expect(root.textContent).toContain('Comment restored.');
  });

  it('uses the shared empty state when the selected queue has no comments', () => {
    moderationService.listenToComments.and.returnValue(of([]));
    fixture.destroy();
    fixture = TestBed.createComponent(CommentModerationPageComponent);
    fixture.detectChanges();

    const emptyState = (fixture.nativeElement as HTMLElement)
      .querySelector<HTMLElement>('app-admin-empty-state [role="status"]');
    expect(emptyState?.textContent).toContain('No pending comments');
  });

  it('unsubscribes from the active queue when the page is destroyed', () => {
    let unsubscribed = false;
    moderationService.listenToComments.and.returnValue(new Observable(observer => {
      observer.next([pendingComment]);
      return () => {
        unsubscribed = true;
      };
    }));
    fixture.destroy();
    fixture = TestBed.createComponent(CommentModerationPageComponent);
    fixture.detectChanges();

    fixture.destroy();

    expect(unsubscribed).toBeTrue();
  });
});
