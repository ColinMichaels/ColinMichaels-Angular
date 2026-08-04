import {ComponentFixture, TestBed} from '@angular/core/testing';

import {BlogPost} from '../../../../features/blog/models/blog-post.model';
import {PostScheduleCalendarComponent} from './post-schedule-calendar.component';

function createPost(id: string, title: string, publishedAt: string): BlogPost {
  return {
    id,
    slug: id,
    title,
    excerpt: `${title} excerpt.`,
    coverImage: '/assets/images/backgrounds/night.webp',
    author: {name: 'Colin Michaels'},
    categories: ['CMS'],
    tags: ['Calendar'],
    status: 'scheduled',
    seo: {
      title,
      description: `${title} description.`,
      openGraphImage: '',
    },
    contentFormat: 'editorjs',
    blocks: [],
    createdAt: '2026-08-01T12:00:00.000Z',
    updatedAt: '2026-08-01T12:00:00.000Z',
    publishedAt,
  };
}

describe('PostScheduleCalendarComponent', () => {
  let fixture: ComponentFixture<PostScheduleCalendarComponent>;

  beforeEach(async () => {
    jasmine.clock().install();
    jasmine.clock().mockDate(new Date(2026, 7, 4, 12));

    await TestBed.configureTestingModule({
      imports: [PostScheduleCalendarComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(PostScheduleCalendarComponent);
    fixture.componentRef.setInput('posts', [
      createPost('current-post', 'Current post', new Date(2026, 7, 10, 12).toISOString()),
      createPost('occupied-post', 'Already scheduled post', new Date(2026, 7, 10, 15).toISOString()),
    ]);
    fixture.componentRef.setInput('currentPostId', 'current-post');
    fixture.componentRef.setInput('value', '2026-08-10T12:00');
    fixture.detectChanges();
  });

  afterEach(() => {
    jasmine.clock().uninstall();
  });

  it('reuses the publishing month calendar and shows other scheduled posts', () => {
    const element = fixture.nativeElement as HTMLElement;

    expect(element.querySelector('app-publishing-calendar-month')).not.toBeNull();
    expect(element.textContent).toContain('August 2026');
    expect(element.textContent).toContain('Already scheduled post');
    expect(element.textContent).not.toContain('Current post');
  });

  it('disables occupied suggested times and emits an open slot', () => {
    const element = fixture.nativeElement as HTMLElement;
    const occupied = element.querySelector<HTMLButtonElement>('button[aria-label^="3:00 PM, Used by"]');
    const open = element.querySelector<HTMLButtonElement>('button[aria-label="12:00 PM, Open"]');
    const selected = jasmine.createSpy('selected');
    fixture.componentInstance.valueChange.subscribe(selected);

    expect(occupied?.disabled).toBeTrue();
    expect(occupied?.textContent).toContain('Already scheduled post');
    expect(open?.disabled).toBeFalse();

    open?.click();

    expect(selected).toHaveBeenCalledOnceWith('2026-08-10T12:00');
    fixture.detectChanges();
    expect(element.textContent).toContain('Current publish date: Aug 10, 2026, 12:00 PM');
  });

  it('moves through months with the shared calendar controls', () => {
    const element = fixture.nativeElement as HTMLElement;
    const nextMonth = element.querySelector<HTMLButtonElement>('button[aria-label="Next month"]');

    nextMonth?.click();
    fixture.detectChanges();

    expect(element.textContent).toContain('September 2026');
  });
});
