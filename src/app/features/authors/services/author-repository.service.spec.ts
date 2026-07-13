import {TestBed} from '@angular/core/testing';
import {BehaviorSubject, of} from 'rxjs';

import {DEFAULT_AUTHOR_ID} from '../authors.constants';
import {AuthorProfile} from '../models/author.model';
import {AuthorRepositoryService} from './author-repository.service';
import {AuthorStorageService} from './author-storage.service';

class FakeAuthorStorageService {
  private readonly subject = new BehaviorSubject<readonly AuthorProfile[]>([]);
  readonly authors$ = this.subject.asObservable();
  readonly loading$ = of(false);
  readonly error$ = of(null);

  getAuthors(): readonly AuthorProfile[] {
    return this.subject.value;
  }

  async saveAuthor(author: AuthorProfile): Promise<void> {
    this.subject.next([...this.subject.value.filter(saved => saved.id !== author.id), author]);
  }
}

describe('AuthorRepositoryService', () => {
  let service: AuthorRepositoryService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [{provide: AuthorStorageService, useClass: FakeAuthorStorageService}],
    });
    service = TestBed.inject(AuthorRepositoryService);
  });

  it('always exposes Colin as the default author', () => {
    expect(service.getAuthorById(DEFAULT_AUTHOR_ID)?.name).toBe('Colin Michaels');
  });

  it('normalizes and saves a new author profile', async () => {
    const author = service.createNewAuthorTemplate();
    const saved = await service.saveAuthor({
      ...author,
      name: 'Guest Writer',
      slug: 'Guest Writer',
      shortBio: 'A guest contributor.',
      status: 'published',
      externalProfiles: [{label: 'Website', url: 'https://example.com'}],
    });

    expect(saved.slug).toBe('guest-writer');
    expect(service.getAuthorById(saved.id)?.name).toBe('Guest Writer');
  });

  it('rejects unsafe external profile links', async () => {
    const author = service.createNewAuthorTemplate();

    await expectAsync(service.saveAuthor({
      ...author,
      name: 'Guest Writer',
      shortBio: 'A guest contributor.',
      externalProfiles: [{label: 'Unsafe', url: 'javascript:alert(1)'}],
    })).toBeRejectedWithError('External profile links must use an http or https URL.');
  });
});
