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
        scheduledAt: '2026-07-24T14:00:00.000Z',
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

describe('PublishingCalendarComponent', () => {
  let fixture: ComponentFixture<PublishingCalendarComponent>;
  let postSubject: BehaviorSubject<readonly BlogPost[]>;
  let blogRepository: jasmine.SpyObj<Pick<BlogRepositoryService, 'getAdminPosts$' | 'savePost'>>;

  beforeEach(async () => {
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
    const postSelect = element.querySelector('select');

    if (!(postSelect instanceof HTMLSelectElement)) {
      throw new Error('Post selector was not found.');
    }

    postSelect.value = 'calendar-post';
    postSelect.dispatchEvent(new Event('change'));
    fixture.detectChanges();

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
  });
});
