import {ComponentFixture, TestBed} from '@angular/core/testing';
import {RouterTestingModule} from '@angular/router/testing';
import {BehaviorSubject} from 'rxjs';

import {BlogPostSummary} from '../../blog/models/blog-post.model';
import {BlogRepositoryService} from '../../blog/services/blog-repository.service';
import {CatCornerHubComponent} from './cat-corner-hub.component';

function createPost(index: number): BlogPostSummary {
  return {
    id: `cat-${index}`,
    slug: `gretchen-dispatch-${index}`,
    title: index === 1 ? 'A Dispatch from the Sunny Spot' : 'Notes on Breakfast Timing',
    excerpt: index === 1 ? 'A considered review of the best light in the house.' : 'The schedule requires immediate attention.',
    coverImage: '/assets/images/cat-corner/gretchen-easter-egg.png',
    author: {name: 'Gretchen'},
    categories: ['Cat Corner'],
    tags: ['Gretchen'],
    catCorner: {enabled: true, discoveryPost: false},
    publishedAt: `2026-07-${10 + index}T12:00:00.000Z`,
    updatedAt: `2026-07-${10 + index}T12:00:00.000Z`,
  };
}

describe('CatCornerHubComponent', () => {
  let fixture: ComponentFixture<CatCornerHubComponent>;
  const posts = new BehaviorSubject<readonly BlogPostSummary[]>([createPost(1), createPost(2)]);
  const loading = new BehaviorSubject(false);
  const error = new BehaviorSubject<unknown>(null);

  beforeEach(async () => {
    posts.next([createPost(1), createPost(2)]);
    loading.next(false);
    error.next(null);

    await TestBed.configureTestingModule({
      imports: [CatCornerHubComponent, RouterTestingModule],
      providers: [
        {
          provide: BlogRepositoryService,
          useValue: {
            getPublishedCatCornerPosts$: () => posts.asObservable(),
            loading$: loading.asObservable(),
            error$: error.asObservable(),
          },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(CatCornerHubComponent);
    fixture.detectChanges();
  });

  it('uses the newest real post as the featured dispatch and renders the remainder as an open list', () => {
    const element = fixture.nativeElement as HTMLElement;
    const featureLink = element.querySelector<HTMLAnchorElement>('.hero-action');
    const latestRows = element.querySelectorAll('.latest-row');

    expect(element.textContent).toContain('Cat Corner');
    expect(element.textContent).toContain('Cat Corner Addict');
    expect(element.textContent).toContain('A Dispatch from the Sunny Spot');
    expect(featureLink?.getAttribute('href')).toBe('/blog/gretchen-dispatch-1');
    expect(latestRows).toHaveSize(1);
    expect(latestRows[0].textContent).toContain('Notes on Breakfast Timing');
  });

  it('renders a polished empty state without invented post data', () => {
    posts.next([]);
    fixture.detectChanges();
    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';

    expect(text).toContain("Gretchen hasn't published from her desk yet.");
    expect(text).not.toContain('A Dispatch from the Sunny Spot');
    expect((fixture.nativeElement as HTMLElement).querySelector('.hero-action')).toBeNull();
  });
});
