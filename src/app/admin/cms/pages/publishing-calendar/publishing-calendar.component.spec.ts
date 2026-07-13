import {ComponentFixture, TestBed} from '@angular/core/testing';
import {RouterTestingModule} from '@angular/router/testing';
import {BehaviorSubject} from 'rxjs';

import {BlogPost} from '../../../../features/blog/models/blog-post.model';
import {BlogRepositoryService} from '../../../../features/blog/services/blog-repository.service';
import {PublishingCalendarComponent} from './publishing-calendar.component';

function createScheduledPost(): BlogPost {
  return {
    id: 'calendar-post',
    slug: 'publishing-calendar-test',
    title: 'Publishing Calendar Test',
    excerpt: 'A post used to verify calendar and social scheduling behavior.',
    coverImage: '/assets/images/backgrounds/night.webp',
    author: {name: 'Colin Michaels'},
    categories: ['CMS'],
    tags: ['Angular', 'Firebase'],
    status: 'scheduled',
    seo: {
      title: 'Publishing Calendar Test',
      description: 'A calendar test post.',
      openGraphImage: '',
    },
    contentFormat: 'editorjs',
    blocks: [],
    socialPromotion: {
      announcements: [{
        id: 'instagram-launch',
        channel: 'instagram',
        message: 'Instagram launch message',
        scheduledAt: '2026-07-23T15:00:00.000Z',
        deliveryTiming: 'at-publish',
        status: 'scheduled',
        createdAt: '2026-07-01T12:00:00.000Z',
        updatedAt: '2026-07-01T12:00:00.000Z',
      }],
    },
    createdAt: '2026-07-01T12:00:00.000Z',
    updatedAt: '2026-07-01T12:00:00.000Z',
    publishedAt: '2026-07-23T15:00:00.000Z',
  };
}

function findButton(element: HTMLElement, label: string): HTMLButtonElement {
  const button = Array.from(element.querySelectorAll('button'))
    .find(candidate => candidate.textContent?.trim() === label);

  if (!(button instanceof HTMLButtonElement)) {
    throw new Error(`Button with label “${label}” was not found.`);
  }

  return button;
}

function selectPost(fixture: ComponentFixture<PublishingCalendarComponent>): void {
  const postSelect = (fixture.nativeElement as HTMLElement).querySelector('select');

  if (!(postSelect instanceof HTMLSelectElement)) {
    throw new Error('Post selector was not found.');
  }

  postSelect.value = 'calendar-post';
  postSelect.dispatchEvent(new Event('change'));
  fixture.detectChanges();
}

describe('PublishingCalendarComponent', () => {
  let fixture: ComponentFixture<PublishingCalendarComponent>;
  let postSubject: BehaviorSubject<readonly BlogPost[]>;
  let blogRepository: jasmine.SpyObj<Pick<BlogRepositoryService, 'getAdminPosts$' | 'savePost'>>;

  beforeEach(async () => {
    jasmine.clock().install();
    jasmine.clock().mockDate(new Date('2026-07-13T12:00:00.000Z'));
    const post = createScheduledPost();
    postSubject = new BehaviorSubject<readonly BlogPost[]>([post]);
    blogRepository = jasmine.createSpyObj('BlogRepositoryService', ['getAdminPosts$', 'savePost']);
    blogRepository.getAdminPosts$.and.returnValue(postSubject.asObservable());
    blogRepository.savePost.and.callFake(async savedPost => {
      postSubject.next([savedPost]);
      return savedPost;
    });

    await TestBed.configureTestingModule({
      imports: [
        PublishingCalendarComponent,
        RouterTestingModule,
      ],
      providers: [
        {provide: BlogRepositoryService, useValue: blogRepository},
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(PublishingCalendarComponent);
    fixture.detectChanges();
  });

  afterEach(() => {
    jasmine.clock().uninstall();
  });

  it('renders post and social events on the month calendar', () => {
    const element = fixture.nativeElement as HTMLElement;

    expect(element.textContent).toContain('Publishing Calendar');
    expect(element.textContent).toContain('July 2026');
    expect(element.textContent).toContain('Publishing Calendar Test');
    expect(element.textContent).toContain('Instagram');
    expect(element.textContent).toContain('Upcoming queue');
  });

  it('saves provider-specific copy as a post-linked announcement', async () => {
    const element = fixture.nativeElement as HTMLElement;
    selectPost(fixture);

    findButton(element, 'Add social post').click();
    fixture.detectChanges();
    findButton(element, 'Facebook').click();
    fixture.detectChanges();

    const composer = element.querySelector('section[aria-label="Add social posts"]');
    const textarea = composer?.querySelector('textarea');

    if (!(textarea instanceof HTMLTextAreaElement)) {
      throw new Error('Facebook message editor was not found.');
    }

    textarea.value = 'A Facebook-specific share message.';
    textarea.dispatchEvent(new Event('input'));
    fixture.detectChanges();
    findButton(element, 'Save social plan').click();

    await fixture.whenStable();

    expect(blogRepository.savePost).toHaveBeenCalled();
    const [savedPost] = blogRepository.savePost.calls.mostRecent().args;
    const facebookAnnouncement = savedPost.socialPromotion?.announcements.find(announcement => announcement.channel === 'facebook');
    expect(facebookAnnouncement?.message).toBe('A Facebook-specific share message.');
    expect(facebookAnnouncement?.status).toBe('scheduled');
    expect(facebookAnnouncement?.deliveryTiming).toBe('at-publish');
    expect(facebookAnnouncement?.scheduledAt).toBe(savedPost.publishedAt ?? undefined);
  });

  it('moves scheduled at-publication announcements when the article schedule changes', async () => {
    const post = createScheduledPost();
    postSubject.next([{
      ...post,
      socialPromotion: {
        announcements: [
          ...(post.socialPromotion?.announcements ?? []),
          {
            id: 'linkedin-already-queued',
            channel: 'linkedin',
            message: 'Already queued.',
            scheduledAt: '2026-07-23T15:00:00.000Z',
            deliveryTiming: 'at-publish',
            status: 'queued',
            createdAt: '2026-07-01T12:00:00.000Z',
            updatedAt: '2026-07-01T12:00:00.000Z',
          },
        ],
      },
    }]);
    fixture.detectChanges();
    const element = fixture.nativeElement as HTMLElement;
    selectPost(fixture);
    findButton(element, 'Edit schedule').click();
    fixture.detectChanges();

    const input = element.querySelector('section[aria-label="Edit post schedule"] input[type="datetime-local"]');

    if (!(input instanceof HTMLInputElement)) {
      throw new Error('Schedule editor input was not found.');
    }

    input.value = '2026-07-25T12:00';
    input.dispatchEvent(new Event('input'));
    fixture.detectChanges();
    findButton(element, 'Save schedule').click();
    await fixture.whenStable();

    const [savedPost] = blogRepository.savePost.calls.mostRecent().args;
    const instagramAnnouncement = savedPost.socialPromotion?.announcements.find(announcement => announcement.channel === 'instagram');
    const queuedAnnouncement = savedPost.socialPromotion?.announcements.find(announcement => announcement.id === 'linkedin-already-queued');
    expect(instagramAnnouncement?.deliveryTiming).toBe('at-publish');
    expect(instagramAnnouncement?.scheduledAt).toBe(savedPost.publishedAt ?? undefined);
    expect(queuedAnnouncement?.scheduledAt).toBe('2026-07-23T15:00:00.000Z');
    expect(queuedAnnouncement?.status).toBe('queued');
  });

  it('rejects postponing an article past a fixed social delivery', async () => {
    const post = createScheduledPost();
    postSubject.next([{
      ...post,
      socialPromotion: {
        announcements: [
          ...(post.socialPromotion?.announcements ?? []),
          {
            id: 'facebook-follow-up',
            channel: 'facebook',
            message: 'A fixed follow-up.',
            scheduledAt: '2026-07-24T15:00:00.000Z',
            deliveryTiming: 'scheduled',
            status: 'scheduled',
            createdAt: '2026-07-01T12:00:00.000Z',
            updatedAt: '2026-07-01T12:00:00.000Z',
          },
        ],
      },
    }]);
    fixture.detectChanges();
    const element = fixture.nativeElement as HTMLElement;
    selectPost(fixture);
    findButton(element, 'Edit schedule').click();
    fixture.detectChanges();

    const input = element.querySelector('section[aria-label="Edit post schedule"] input[type="datetime-local"]');

    if (!(input instanceof HTMLInputElement)) {
      throw new Error('Schedule editor input was not found.');
    }

    input.value = '2026-07-25T12:00';
    input.dispatchEvent(new Event('input'));
    fixture.detectChanges();
    findButton(element, 'Save schedule').click();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(blogRepository.savePost).not.toHaveBeenCalled();
    expect(element.textContent).toContain('Move or cancel the Facebook announcement');
  });

  it('copies the post share image into a new Instagram plan', async () => {
    const element = fixture.nativeElement as HTMLElement;
    selectPost(fixture);
    findButton(element, 'Add social post').click();
    fixture.detectChanges();
    findButton(element, 'Instagram').click();
    fixture.detectChanges();
    findButton(element, 'Save social plan').click();
    await fixture.whenStable();

    const [savedPost] = blogRepository.savePost.calls.mostRecent().args;
    const instagramAnnouncements = savedPost.socialPromotion?.announcements
      .filter(announcement => announcement.channel === 'instagram') ?? [];
    const createdAnnouncement = instagramAnnouncements.at(-1);
    expect(createdAnnouncement?.mediaUrl).toBe('https://colinmichaels.com/assets/images/backgrounds/night.webp');
    expect(createdAnnouncement?.deliveryTiming).toBe('at-publish');
  });

  it('does not offer a second planned Notify delivery beside automatic Web Push', () => {
    const element = fixture.nativeElement as HTMLElement;
    selectPost(fixture);
    findButton(element, 'Add social post').click();
    fixture.detectChanges();

    const composer = element.querySelector('section[aria-label="Add social posts"]');
    const channelLabels = Array.from(composer?.querySelectorAll('button') ?? [])
      .map(button => button.textContent?.trim());
    expect(channelLabels).not.toContain('Notify');
    expect(element.textContent).toContain('Web Push');
    expect(element.textContent).toContain('Active at publication');
  });
});
