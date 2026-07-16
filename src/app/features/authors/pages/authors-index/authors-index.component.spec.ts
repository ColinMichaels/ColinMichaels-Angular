import {ComponentFixture, TestBed} from '@angular/core/testing';
import {provideRouter} from '@angular/router';
import {of} from 'rxjs';

import {SeoService} from '../../../../shared/seo/seo.service';
import {DEFAULT_AUTHOR_PROFILE} from '../../authors.constants';
import {AuthorProfile} from '../../models/author.model';
import {AuthorRepositoryService} from '../../services/author-repository.service';
import {AuthorsIndexComponent} from './authors-index.component';

const SECOND_AUTHOR: AuthorProfile = {
  ...DEFAULT_AUTHOR_PROFILE,
  id: 'guest-writer',
  slug: 'guest-writer',
  name: 'Guest Reporter',
  title: 'Contributing writer',
  shortBio: 'Guest reporting on useful creative tools and practical workflows.',
  bio: 'Guest reporting on useful creative tools and practical workflows.',
  avatarUrl: '',
  imageAlt: 'Guest Reporter portrait',
  location: 'New York',
  externalProfiles: [],
};

describe('AuthorsIndexComponent', () => {
  let fixture: ComponentFixture<AuthorsIndexComponent>;
  const seo = jasmine.createSpyObj<SeoService>('SeoService', ['apply']);

  beforeEach(async () => {
    seo.apply.calls.reset();

    await TestBed.configureTestingModule({
      imports: [AuthorsIndexComponent],
      providers: [
        provideRouter([]),
        {
          provide: AuthorRepositoryService,
          useValue: {
            getPublishedAuthors$: () => of([DEFAULT_AUTHOR_PROFILE, SECOND_AUTHOR]),
            loading$: of(false),
            error$: of(null),
          },
        },
        {provide: SeoService, useValue: seo},
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(AuthorsIndexComponent);
    fixture.detectChanges();
  });

  it('renders every published author as a profile link', () => {
    const element = fixture.nativeElement as HTMLElement;
    const cards = element.querySelectorAll<HTMLAnchorElement>('.author-directory-card');

    expect(cards.length).toBe(2);
    expect(cards[0].getAttribute('href')).toBe('/authors/colin-michaels');
    expect(cards[0].textContent).toContain('Colin Michaels');
    expect(cards[1].getAttribute('href')).toBe('/authors/guest-writer');
    expect(cards[1].textContent).toContain('Guest Reporter');
    expect(cards[1].textContent).toContain('GR');
    expect(element.querySelector('.authors-index-count')?.textContent).toContain('2 published authors');
  });

  it('publishes CollectionPage metadata with an ItemList of author profiles', () => {
    expect(seo.apply).toHaveBeenCalled();

    const metadata = seo.apply.calls.mostRecent().args[0];
    const structuredData = metadata.structuredData as {
      '@type': string;
      mainEntity: {numberOfItems: number; itemListElement: readonly {url: string}[]};
    };

    expect(metadata.path).toBe('/authors');
    expect(structuredData['@type']).toBe('CollectionPage');
    expect(structuredData.mainEntity.numberOfItems).toBe(2);
    expect(structuredData.mainEntity.itemListElement[1].url).toBe('https://colinmichaels.com/authors/guest-writer');
  });
});
