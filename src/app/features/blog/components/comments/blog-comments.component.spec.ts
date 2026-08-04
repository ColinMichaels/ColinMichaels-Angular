import {ComponentFixture, TestBed} from '@angular/core/testing';
import {RouterTestingModule} from '@angular/router/testing';
import {User} from 'firebase/auth';
import {BehaviorSubject, of, throwError} from 'rxjs';

import {AuthService} from '../../../../services/auth.service';
import {BlogComment} from '../../models/blog-comment.model';
import {BlogPost} from '../../models/blog-post.model';
import {BLOG_COMMENT_PAGE_SIZE, BlogCommentService} from '../../services/blog-comment.service';
import {BlogCommentsComponent} from './blog-comments.component';

const mockPost: BlogPost = {
  id: 'post-1',
  slug: 'sample-post',
  title: 'Sample Post',
  excerpt: 'A short post.',
  coverImage: '/cover.jpg',
  author: {name: 'Colin Michaels'},
  categories: ['Updates'],
  subcategories: [],
  tags: [],
  status: 'published',
  seo: {
    title: 'Sample Post',
    description: 'A short post.',
  },
  contentFormat: 'editorjs',
  blocks: [],
  createdAt: '2026-07-07T00:00:00.000Z',
  updatedAt: '2026-07-07T00:00:00.000Z',
  publishedAt: '2026-07-07T00:00:00.000Z',
};

const approvedComment: BlogComment = {
  id: 'comment-parent',
  postId: mockPost.id,
  postSlug: mockPost.slug,
  parentCommentId: null,
  parentAuthorDisplayName: null,
  threadRootId: 'comment-parent',
  threadDepth: 0,
  authorUid: 'parent-reader',
  authorDisplayName: 'Parent Reader',
  authorPhotoURL: null,
  body: 'Parent comment',
  status: 'approved',
  createdAt: '2026-07-07T00:00:00.000Z',
  updatedAt: '2026-07-07T00:00:00.000Z',
  moderatedAt: '2026-07-07T00:00:00.000Z',
  moderatedBy: 'parent-reader',
};

describe('BlogCommentsComponent', () => {
  let fixture: ComponentFixture<BlogCommentsComponent>;
  let authState$: BehaviorSubject<User | null>;
  let commentService: {
    listenToApprovedComments: jasmine.Spy;
    submitComment: jasmine.Spy;
  };
  const mockUser = {
    uid: 'reader-uid',
    email: 'reader@example.com',
    displayName: 'Reader Example',
    providerData: [],
  } as unknown as User;

  function createComponent(): ComponentFixture<BlogCommentsComponent> {
    const componentFixture = TestBed.createComponent(BlogCommentsComponent);
    componentFixture.componentRef.setInput('post', mockPost);
    componentFixture.detectChanges();

    return componentFixture;
  }

  function setCommentBody(value: string): void {
    const textarea = fixture.nativeElement.querySelector('textarea') as HTMLTextAreaElement;
    textarea.value = value;
    textarea.dispatchEvent(new Event('input'));
    fixture.detectChanges();
  }

  beforeEach(async () => {
    authState$ = new BehaviorSubject<User | null>(null);
    commentService = {
      listenToApprovedComments: jasmine.createSpy('listenToApprovedComments').and.returnValue(of({
        comments: [],
        hasMore: false,
      })),
      submitComment: jasmine.createSpy('submitComment').and.resolveTo({
        comment: {
          id: 'comment-1',
          postId: mockPost.id,
          postSlug: mockPost.slug,
          parentCommentId: null,
          parentAuthorDisplayName: null,
          threadRootId: 'comment-1',
          threadDepth: 0,
          authorUid: mockUser.uid,
          authorDisplayName: mockUser.displayName,
          authorPhotoURL: null,
          body: 'Plain comment',
          status: 'pending',
          createdAt: '2026-07-07T00:00:00.000Z',
          updatedAt: '2026-07-07T00:00:00.000Z',
          moderatedAt: null,
          moderatedBy: null,
        },
        trusted: false,
      }),
    };

    await TestBed.configureTestingModule({
      imports: [
        BlogCommentsComponent,
        RouterTestingModule,
      ],
      providers: [
        {provide: AuthService, useValue: {user$: authState$.asObservable()}},
        {provide: BlogCommentService, useValue: commentService},
      ],
    }).compileComponents();
  });

  it('shows a sign-in prompt for signed-out readers', () => {
    fixture = createComponent();
    const element = fixture.nativeElement as HTMLElement;

    expect(element.textContent).toContain('Sign in to join the discussion');
    expect(element.textContent).toContain('No comments yet');
    expect(element.querySelector('a.btn-primary')?.textContent).toContain('Sign in');
    expect(element.querySelector('.site-card')).not.toBeNull();
    expect(element.querySelector('.site-empty-panel')).not.toBeNull();
    expect(commentService.listenToApprovedComments).toHaveBeenCalledWith('sample-post', BLOG_COMMENT_PAGE_SIZE);
  });

  it('uses the shared public form and control primitives for signed-in readers', () => {
    authState$.next(mockUser);
    fixture = createComponent();
    const element = fixture.nativeElement as HTMLElement;

    expect(element.querySelector('form.site-card')).not.toBeNull();
    expect(element.querySelector('textarea.site-input')).not.toBeNull();
    expect(element.querySelector('button[type="submit"]')?.classList).toContain('btn-primary');
  });

  it('blocks links and markup before submitting a signed-in comment', async () => {
    authState$.next(mockUser);
    fixture = createComponent();

    setCommentBody('Check this out https://evil.example <script>alert(1)</script>');
    fixture.nativeElement.querySelector('form').dispatchEvent(new Event('submit'));
    fixture.detectChanges();
    await fixture.whenStable();

    const element = fixture.nativeElement as HTMLElement;
    const submitButton = element.querySelector('button[type="submit"]') as HTMLButtonElement;

    expect(submitButton.disabled).toBeTrue();
    expect(element.textContent).toContain('Comments are plain text only right now');
    expect(commentService.submitComment).not.toHaveBeenCalled();
  });

  it('submits normalized plain text comments for signed-in readers', async () => {
    authState$.next(mockUser);
    fixture = createComponent();

    setCommentBody('  This is a safe comment.\n\n\nThanks for sharing.  ');
    fixture.nativeElement.querySelector('form').dispatchEvent(new Event('submit'));
    fixture.detectChanges();
    await fixture.whenStable();

    expect(commentService.submitComment).toHaveBeenCalledWith({
      postId: mockPost.id,
      postSlug: mockPost.slug,
      body: 'This is a safe comment.\n\nThanks for sharing.',
      parentCommentId: null,
    });
  });

  it('submits replies with the selected parent comment id', async () => {
    authState$.next(mockUser);
    commentService.listenToApprovedComments.and.returnValue(of({
      comments: [approvedComment],
      hasMore: false,
    }));
    fixture = createComponent();

    const replyButton = fixture.nativeElement.querySelector('[aria-label="Reply to Parent Reader"]') as HTMLButtonElement;
    replyButton.click();
    fixture.detectChanges();

    setCommentBody('Thanks for the thread.');
    fixture.nativeElement.querySelector('form').dispatchEvent(new Event('submit'));
    fixture.detectChanges();
    await fixture.whenStable();

    expect(commentService.submitComment).toHaveBeenCalledWith({
      postId: mockPost.id,
      postSlug: mockPost.slug,
      body: 'Thanks for the thread.',
      parentCommentId: approvedComment.id,
    });
  });

  it('loads more comments in ten-comment windows', () => {
    commentService.listenToApprovedComments.and.returnValues(
      of({comments: [approvedComment], hasMore: true}),
      of({comments: [approvedComment], hasMore: false})
    );
    fixture = createComponent();

    const viewMoreButton = Array.from(fixture.nativeElement.querySelectorAll('button'))
      .find(button => (button as HTMLButtonElement).textContent?.includes('View more comments')) as HTMLButtonElement;
    viewMoreButton.click();
    fixture.detectChanges();

    expect(commentService.listenToApprovedComments.calls.allArgs()).toEqual([
      ['sample-post', BLOG_COMMENT_PAGE_SIZE],
      ['sample-post', BLOG_COMMENT_PAGE_SIZE * 2],
    ]);
  });

  it('shows pending review copy only after a new reader submits a comment', async () => {
    authState$.next(mockUser);
    fixture = createComponent();

    expect(fixture.nativeElement.textContent).not.toContain('waiting for admin review');

    setCommentBody('This is a safe comment.');
    fixture.nativeElement.querySelector('form').dispatchEvent(new Event('submit'));
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('waiting for admin review');
    expect(fixture.nativeElement.querySelector('.site-success-panel')).not.toBeNull();
  });

  it('does not show raw permission errors when approved comments cannot be read', () => {
    commentService.listenToApprovedComments.and.returnValue(throwError(() => ({code: 'permission-denied'})));

    fixture = createComponent();

    expect(fixture.nativeElement.textContent).not.toContain('permission');
    expect(fixture.nativeElement.textContent).toContain('No comments yet');
  });
});
