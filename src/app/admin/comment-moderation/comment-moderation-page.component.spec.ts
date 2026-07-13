import {ComponentFixture, TestBed} from '@angular/core/testing';
import {RouterTestingModule} from '@angular/router/testing';
import {of} from 'rxjs';

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
});
