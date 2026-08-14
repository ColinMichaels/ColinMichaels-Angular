import {ComponentFixture, TestBed} from '@angular/core/testing';

import {SiteAnalyticsService} from '../../../../shared/analytics/site-analytics.service';
import {BlogPostSummary} from '../../models/blog-post.model';
import {BlogArticleReactionService} from '../../services/blog-article-reaction.service';
import {ArticleReactionComponent} from './article-reaction.component';

describe('ArticleReactionComponent', () => {
  let fixture: ComponentFixture<ArticleReactionComponent>;
  let analytics: { trackContentReaction: jasmine.Spy };
  let reactions: { getReaction: jasmine.Spy; setReaction: jasmine.Spy };

  const post: BlogPostSummary = {
    id: 'post-1',
    slug: 'test-post',
    title: 'Test post',
    excerpt: 'Summary',
    coverImage: '/assets/test.webp',
    author: {name: 'Colin Michaels'},
    categories: ['Technology'],
    tags: ['Angular'],
    publishedAt: '2026-08-01T12:00:00.000Z',
    updatedAt: '2026-08-01T12:00:00.000Z',
  };

  beforeEach(async () => {
    analytics = {trackContentReaction: jasmine.createSpy('trackContentReaction')};
    reactions = {
      getReaction: jasmine.createSpy('getReaction').and.returnValue(null),
      setReaction: jasmine.createSpy('setReaction'),
    };

    await TestBed.configureTestingModule({
      imports: [ArticleReactionComponent],
      providers: [
        {provide: SiteAnalyticsService, useValue: analytics},
        {provide: BlogArticleReactionService, useValue: reactions},
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(ArticleReactionComponent);
    fixture.componentRef.setInput('post', post);
    fixture.detectChanges();
  });

  it('records and visibly confirms an anonymous one-tap reaction', () => {
    const usefulButton = fixture.nativeElement.querySelector('[data-reaction="useful"]') as HTMLButtonElement;
    usefulButton.click();
    fixture.detectChanges();

    expect(reactions.setReaction).toHaveBeenCalledWith('test-post', 'useful');
    expect(analytics.trackContentReaction).toHaveBeenCalledWith(post, 'useful', false, false);
    expect(usefulButton.getAttribute('aria-pressed')).toBe('true');
    expect(fixture.nativeElement.textContent).toContain('Thanks — this helps shape future stories.');
  });

  it('marks a changed reaction without emitting duplicates for the selected choice', () => {
    reactions.getReaction.and.returnValue('surprising');
    fixture.componentRef.setInput('post', {...post});
    fixture.detectChanges();

    const usefulButton = fixture.nativeElement.querySelector('[data-reaction="useful"]') as HTMLButtonElement;
    usefulButton.click();
    usefulButton.click();
    fixture.detectChanges();

    expect(analytics.trackContentReaction).toHaveBeenCalledOnceWith(post, 'useful', true, false);
    expect(fixture.nativeElement.textContent).toContain('Preference updated — thanks.');
  });
});
