import {ComponentFixture, TestBed} from '@angular/core/testing';
import {RouterTestingModule} from '@angular/router/testing';
import {BehaviorSubject, of} from 'rxjs';

import {BlogPostSummary} from '../../features/blog/models/blog-post.model';
import {BlogRepositoryService} from '../../features/blog/services/blog-repository.service';
import {YouTubeFeedService} from '../../features/youtube/services/youtube-feed.service';
import {COLIN_AUTHOR_PROFILE} from '../../shared/author/author-profile.data';
import {TypewriterService} from '../game/services/typewriter.service';
import {MainComponent} from './main.component';

const MOCK_POSTS: readonly BlogPostSummary[] = [
  {
    id: 'post-architecture-boundaries',
    slug: 'architecture-boundaries',
    title: 'Architecture Boundaries for the Site and OS',
    excerpt: 'A short implementation note on separating the public site, reusable OS framework, labs, and future admin tools.',
    coverImage: '/assets/images/backgrounds/day.webp',
    author: {
      name: 'Colin Michaels',
      title: 'Applications Developer',
    },
    categories: ['Architecture'],
    tags: ['Angular', 'Refactor', 'Core OS'],
    publishedAt: '2026-05-13T19:30:00.000Z',
    updatedAt: '2026-05-13T19:30:00.000Z',
  },
  {
    id: 'post-open-heart-weekly-update',
    slug: 'open-heart-surgery-weekly-update',
    title: 'Open heart surgery weekly update',
    excerpt: 'A personal recovery note after recent open heart surgery.',
    coverImage: '/assets/images/backgrounds/night.webp',
    author: {
      name: 'Colin Michaels',
    },
    categories: ['Health and Recovery'],
    tags: ['Open Heart Surgery', 'Weekly Updates'],
    publishedAt: '2026-06-01T12:00:00.000Z',
    updatedAt: '2026-06-01T12:00:00.000Z',
  },
  {
    id: 'post-surgery-medical-notes',
    slug: 'open-heart-surgery-medical-notes',
    title: 'Open heart surgery medical information',
    excerpt: 'Procedure notes, medications, and cardiology context from the surgery.',
    coverImage: '/assets/images/backgrounds/day.webp',
    author: {
      name: 'Colin Michaels',
    },
    categories: ['Medical Information'],
    tags: ['Cardiology', 'Medications'],
    publishedAt: '2026-06-02T12:00:00.000Z',
    updatedAt: '2026-06-02T12:00:00.000Z',
  },
];

describe('MainComponent', () => {
  let fixture: ComponentFixture<MainComponent>;

  beforeEach(async () => {
    const blogRepositoryService = {
      getPublishedPosts$: jasmine.createSpy('getPublishedPosts$').and.returnValue(of(MOCK_POSTS)),
      loading$: of(false),
      error$: of(null),
    } satisfies Pick<BlogRepositoryService, 'getPublishedPosts$' | 'loading$' | 'error$'>;
    const youtubeFeedService = {
      getLatestVideos$: jasmine.createSpy('getLatestVideos$').and.returnValue(of({
        fetchedAt: '2026-06-14T00:00:00.000Z',
        source: 'youtube-api',
        channelId: 'channel-id',
        channelTitle: 'Captain Colin',
        channelUrl: 'https://www.youtube.com/CaptainColin',
        videos: [],
      })),
    } satisfies Pick<YouTubeFeedService, 'getLatestVideos$'>;
    const typewriterService = jasmine.createSpyObj<Pick<TypewriterService, 'enableSound' | 'setVolume' | 'clear' | 'enqueueLine'>>(
      'TypewriterService',
      ['enableSound', 'setVolume', 'clear', 'enqueueLine'],
    ) as unknown as Pick<TypewriterService, 'enableSound' | 'setVolume' | 'clear' | 'enqueueLine'> & {
      typedText$: BehaviorSubject<string>;
    };
    typewriterService.typedText$ = new BehaviorSubject('');
    await TestBed.configureTestingModule({
      imports: [
        MainComponent,
        RouterTestingModule,
      ],
      providers: [
        {provide: BlogRepositoryService, useValue: blogRepositoryService},
        {provide: TypewriterService, useValue: typewriterService},
        {provide: YouTubeFeedService, useValue: youtubeFeedService},
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(MainComponent);
  });

  it('renders the SPA homepage sections', () => {
    fixture.detectChanges();

    const element = fixture.nativeElement as HTMLElement;

    expect(element.querySelector('#work')).not.toBeNull();
    expect(element.querySelector('#about')).not.toBeNull();
    expect(element.querySelector('#blog')).not.toBeNull();
    expect(element.querySelector('#health-recovery')).not.toBeNull();
    expect(element.querySelector('#medical-information')).not.toBeNull();
    expect(element.querySelector('#labs')).not.toBeNull();
    expect(element.querySelector('#os')).toBeNull();
    expect(element.textContent?.match(/Report a Bug/g)?.length).toBe(1);
  });

  it('embeds published blog content on the homepage', () => {
    fixture.detectChanges();

    const element = fixture.nativeElement as HTMLElement;

    expect(element.textContent).toContain('Latest writing');
    expect(element.textContent).toContain('Architecture Boundaries for the Site and OS');
  });

  it('renders the homepage author bio section', () => {
    fixture.detectChanges();

    const element = fixture.nativeElement as HTMLElement;

    expect(element.querySelector('#about')?.textContent).toContain('About Me');
    expect(element.querySelector('#about')?.textContent).toContain('application developer, creative problem solver');
    expect(element.querySelector('#about img')?.getAttribute('src')).toBe(COLIN_AUTHOR_PROFILE.imageUrl);
  });

  it('shows health recovery and medical information blog sections', () => {
    fixture.detectChanges();

    const element = fixture.nativeElement as HTMLElement;

    expect(element.querySelector('#health-recovery')?.textContent).toContain('Open heart surgery weekly update');
    expect(element.querySelector('#medical-information')?.textContent).toContain('Open heart surgery medical information');
  });
});
