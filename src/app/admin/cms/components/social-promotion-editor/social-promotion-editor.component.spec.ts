import {ComponentFixture, TestBed} from '@angular/core/testing';

import {BlogPost} from '../../../../features/blog/models/blog-post.model';
import {BlogAiFunctionsService} from '../../services/blog-ai-functions.service';
import {SocialPromotionEditorComponent} from './social-promotion-editor.component';

function createPost(overrides: Partial<BlogPost> = {}): BlogPost {
  return {
    id: 'post-1',
    slug: 'a-useful-story',
    title: 'A Useful Story',
    excerpt: 'A practical lesson worth sharing with friends and family.',
    coverImage: '/assets/images/blog/cover.webp',
    author: {name: 'Colin Michaels'},
    categories: ['Technology'],
    tags: ['safety', 'family'],
    status: 'draft',
    seo: {
      title: 'A Useful Story',
      description: 'A practical lesson worth sharing with friends and family.',
    },
    contentFormat: 'editorjs',
    blocks: [],
    createdAt: '2026-07-01T12:00:00.000Z',
    updatedAt: '2026-07-15T12:00:00.000Z',
    publishedAt: null,
    ...overrides,
  };
}

function findButton(fixture: ComponentFixture<SocialPromotionEditorComponent>, label: string): HTMLButtonElement {
  const buttons = Array.from(fixture.nativeElement.querySelectorAll('button')) as HTMLButtonElement[];
  const button = buttons.find(candidate => candidate.textContent?.includes(label));

  if (!button) {
    throw new Error(`Could not find button containing “${label}”.`);
  }

  return button;
}

describe('SocialPromotionEditorComponent', () => {
  let fixture: ComponentFixture<SocialPromotionEditorComponent>;
  let aiFunctions: jasmine.SpyObj<BlogAiFunctionsService>;

  beforeEach(async () => {
    aiFunctions = jasmine.createSpyObj<BlogAiFunctionsService>('BlogAiFunctionsService', ['generateSocialPosts']);

    await TestBed.configureTestingModule({
      imports: [SocialPromotionEditorComponent],
      providers: [{provide: BlogAiFunctionsService, useValue: aiFunctions}],
    }).compileComponents();

    fixture = TestBed.createComponent(SocialPromotionEditorComponent);
    fixture.componentRef.setInput('post', createPost());
    fixture.detectChanges();
  });

  it('renders each editable channel and starts on Facebook', () => {
    const text = fixture.nativeElement.textContent as string;

    expect(text).toContain('Facebook');
    expect(text).toContain('Instagram');
    expect(text).toContain('X (Twitter)');
    expect(text).toContain('Threads');
    expect(text).toContain('LinkedIn');
    expect(text).toContain('YouTube');
    expect(fixture.nativeElement.querySelector('[role="tab"][aria-selected="true"]')?.textContent)
      .toContain('Facebook');
  });

  it('reflects the native-first Facebook defaults in the rendered controls', () => {
    const [angle, format, media] = Array.from(
      fixture.nativeElement.querySelectorAll('select')
    ) as HTMLSelectElement[];

    expect(angle.value).toBe('personal-story');
    expect(format.value).toBe('image');
    expect(media.value).toBe('image');
  });

  it('supports arrow-key navigation across the channel tabs', () => {
    const facebookTab = fixture.nativeElement.querySelector('#social-tab-facebook') as HTMLButtonElement;
    facebookTab.dispatchEvent(new KeyboardEvent('keydown', {key: 'ArrowRight'}));
    fixture.detectChanges();

    const instagramTab = fixture.nativeElement.querySelector('#social-tab-instagram') as HTMLButtonElement;
    expect(instagramTab.getAttribute('aria-selected')).toBe('true');
    expect(instagramTab.tabIndex).toBe(0);
    expect(facebookTab.tabIndex).toBe(-1);
    expect(fixture.nativeElement.querySelector('[role="tabpanel"]')?.getAttribute('aria-labelledby'))
      .toBe('social-tab-instagram');
  });

  it('starts a fresh Calendar draft instead of replacing the latest channel draft', () => {
    const createdAt = '2026-07-15T12:00:00.000Z';
    fixture.componentRef.setInput('mode', 'schedule');
    fixture.componentRef.setInput('createNew', true);
    fixture.componentRef.setInput('post', createPost({
      socialPromotion: {
        announcements: [{
          id: 'facebook-existing',
          channel: 'facebook',
          message: 'Existing Facebook copy that must be preserved.',
          status: 'draft',
          createdAt,
          updatedAt: createdAt,
          contentAngle: 'personal-story',
          linkPlacement: 'first-comment',
          postFormat: 'text',
        }],
      },
    }));
    fixture.detectChanges();

    const textarea = fixture.nativeElement.querySelector('textarea') as HTMLTextAreaElement;
    expect(textarea.value).not.toBe('Existing Facebook copy that must be preserved.');

    let announcements: readonly string[] = [];
    fixture.componentInstance.promotionChange.subscribe(promotion => {
      announcements = promotion.announcements.map(announcement => announcement.id);
    });
    textarea.value = 'A new Calendar-created Facebook post.';
    textarea.dispatchEvent(new Event('input'));
    fixture.detectChanges();

    expect(announcements).toContain('facebook-existing');
    expect(announcements.length).toBe(2);
  });

  it('emits a controlled promotion update when copy changes', () => {
    let latestMessage = '';
    fixture.componentInstance.promotionChange.subscribe(promotion => {
      latestMessage = promotion.announcements[0]?.message ?? '';
    });
    const textarea = fixture.nativeElement.querySelector('textarea') as HTMLTextAreaElement;

    textarea.value = 'A native-first version written for Facebook.';
    textarea.dispatchEvent(new Event('input'));
    fixture.detectChanges();

    expect(latestMessage).toBe('A native-first version written for Facebook.');
    expect(fixture.nativeElement.textContent).toContain('Unsaved social changes');
  });

  it('preserves existing announcements while switching channels and drafting another one', () => {
    const createdAt = '2026-07-15T12:00:00.000Z';
    fixture.componentRef.setInput('post', createPost({
      socialPromotion: {
        announcements: [
          {
            id: 'facebook-existing',
            channel: 'facebook',
            message: 'Existing Facebook copy.',
            status: 'draft',
            createdAt,
            updatedAt: createdAt,
            contentAngle: 'personal-story',
            linkPlacement: 'first-comment',
            postFormat: 'text',
          },
          {
            id: 'linkedin-existing',
            channel: 'linkedin',
            message: 'Existing LinkedIn copy.',
            status: 'draft',
            createdAt,
            updatedAt: createdAt,
            contentAngle: 'practical-takeaway',
            linkPlacement: 'post',
            postFormat: 'text',
          },
        ],
      },
    }));
    fixture.detectChanges();
    let announcementIds: readonly string[] = [];
    fixture.componentInstance.promotionChange.subscribe(promotion => {
      announcementIds = promotion.announcements.map(announcement => announcement.id);
    });

    findButton(fixture, 'Instagram').click();
    fixture.detectChanges();
    const textarea = fixture.nativeElement.querySelector('textarea') as HTMLTextAreaElement;
    textarea.value = 'New Instagram caption.';
    textarea.dispatchEvent(new Event('input'));
    fixture.detectChanges();

    expect(announcementIds).toContain('facebook-existing');
    expect(announcementIds).toContain('linkedin-existing');
    expect(announcementIds.length).toBe(3);

    findButton(fixture, 'Facebook').click();
    fixture.detectChanges();
    expect((fixture.nativeElement.querySelector('textarea') as HTMLTextAreaElement).value)
      .toBe('Existing Facebook copy.');
  });

  it('blocks saving a native-media format until it has a public media URL', () => {
    const createdAt = '2026-07-15T12:00:00.000Z';
    fixture.componentRef.setInput('post', createPost({
      socialPromotion: {
        announcements: [{
          id: 'facebook-video',
          channel: 'facebook',
          message: 'A video post without its video yet.',
          status: 'draft',
          createdAt,
          updatedAt: createdAt,
          contentAngle: 'personal-story',
          linkPlacement: 'first-comment',
          postFormat: 'video',
          mediaType: 'video',
        }],
      },
    }));
    fixture.detectChanges();

    expect(findButton(fixture, 'Save social draft').disabled).toBeTrue();
    expect(fixture.nativeElement.textContent).toContain('complete public http(s) image or video URL');
  });

  it('keeps queued and posted delivery history read-only', () => {
    const createdAt = '2026-07-15T12:00:00.000Z';
    fixture.componentRef.setInput('post', createPost({
      socialPromotion: {
        announcements: [{
          id: 'facebook-posted',
          channel: 'facebook',
          message: 'Already delivered copy.',
          status: 'posted',
          createdAt,
          updatedAt: createdAt,
          postedAt: createdAt,
          contentAngle: 'personal-story',
          linkPlacement: 'first-comment',
          postFormat: 'text',
        }],
      },
    }));
    fixture.detectChanges();
    let updateCount = 0;
    fixture.componentInstance.promotionChange.subscribe(() => updateCount += 1);
    const textarea = fixture.nativeElement.querySelector('textarea') as HTMLTextAreaElement;

    expect(textarea.disabled).toBeTrue();
    textarea.value = 'Attempted overwrite.';
    textarea.dispatchEvent(new Event('input'));
    fixture.detectChanges();

    expect(updateCount).toBe(0);
    expect(fixture.nativeElement.textContent).toContain('history is read-only');
    expect(fixture.nativeElement.textContent).toContain('Create another draft');
  });

  it('preserves a failed attempt and creates an editable retry draft', () => {
    const createdAt = '2026-07-15T12:00:00.000Z';
    fixture.componentRef.setInput('post', createPost({
      socialPromotion: {
        announcements: [{
          id: 'facebook-failed',
          channel: 'facebook',
          message: 'Copy worth retrying.',
          status: 'failed',
          createdAt,
          updatedAt: createdAt,
          contentAngle: 'personal-story',
          linkPlacement: 'first-comment',
          postFormat: 'text',
          failureReason: 'Provider unavailable.',
        }],
      },
    }));
    fixture.detectChanges();

    expect((fixture.nativeElement.querySelector('textarea') as HTMLTextAreaElement).disabled).toBeTrue();
    findButton(fixture, 'Create retry draft').click();
    fixture.detectChanges();

    const textarea = fixture.nativeElement.querySelector('textarea') as HTMLTextAreaElement;
    expect(textarea.disabled).toBeFalse();
    expect(textarea.value).toBe('Copy worth retrying.');

    let ids: readonly string[] = [];
    fixture.componentInstance.promotionChange.subscribe(promotion => {
      ids = promotion.announcements.map(announcement => announcement.id);
    });
    textarea.value = 'Revised retry copy.';
    textarea.dispatchEvent(new Event('input'));
    fixture.detectChanges();

    expect(ids).toContain('facebook-failed');
    expect(ids.length).toBe(2);
  });

  it('uses a future custom time when scheduling promotion for an already-published article', () => {
    fixture.componentRef.setInput('mode', 'schedule');
    fixture.componentRef.setInput('post', createPost({
      status: 'published',
      publishedAt: '2026-07-01T12:00:00.000Z',
      updatedAt: '2026-07-16T12:00:00.000Z',
    }));
    fixture.detectChanges();

    const atPublish = fixture.nativeElement.querySelector('option[value="at-publish"]') as HTMLOptionElement;
    const scheduledAt = fixture.nativeElement.querySelector('input[type="datetime-local"]') as HTMLInputElement;

    expect(atPublish.disabled).toBeTrue();
    expect(scheduledAt.disabled).toBeFalse();
    expect(new Date(scheduledAt.value).getTime()).toBeGreaterThan(Date.now());
  });

  it('requires an explicit apply before an AI variant changes the draft', async () => {
    aiFunctions.generateSocialPosts.and.resolveTo({
      generatedAt: '2026-07-16T12:00:00.000Z',
      source: 'backend',
      suggestions: [{
        id: 'facebook-1',
        channel: 'facebook',
        message: 'The AI-assisted Facebook variant.',
        rationale: 'Leads with a native takeaway.',
        mediaConcept: 'A simple portrait image.',
      }],
    });
    const textarea = fixture.nativeElement.querySelector('textarea') as HTMLTextAreaElement;
    const originalMessage = textarea.value;

    findButton(fixture, 'Write variants with AI').click();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(textarea.value).toBe(originalMessage);
    expect(fixture.nativeElement.textContent).toContain('The AI-assisted Facebook variant.');

    findButton(fixture, 'Apply variant').click();
    fixture.detectChanges();

    expect(textarea.value).toBe('The AI-assisted Facebook variant.');
  });
});
