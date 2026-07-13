import {ComponentFixture, TestBed} from '@angular/core/testing';
import {of} from 'rxjs';

import {DEFAULT_AUTHOR_PROFILE} from '../../../../features/authors/authors.constants';
import {AuthorRepositoryService} from '../../../../features/authors/services/author-repository.service';
import {MediaLibraryService} from '../../../media-library/services/media-library.service';
import {CmsAuthorFormComponent} from './author-form.component';

describe('CmsAuthorFormComponent', () => {
  let fixture: ComponentFixture<CmsAuthorFormComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CmsAuthorFormComponent],
      providers: [
        {
          provide: AuthorRepositoryService,
          useValue: {saveAuthor: jasmine.createSpy('saveAuthor')},
        },
        {
          provide: MediaLibraryService,
          useValue: {
            listenToMediaItems: () => of([]),
            uploadFiles: jasmine.createSpy('uploadFiles'),
          },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(CmsAuthorFormComponent);
    fixture.componentRef.setInput('author', DEFAULT_AUTHOR_PROFILE);
    fixture.detectChanges();
  });

  it('uses the Media Library uploader for the author avatar URL', () => {
    const element = fixture.nativeElement as HTMLElement;
    const avatarUploader = element.querySelector('app-blog-media-uploader');
    const mediaUrlInput = avatarUploader?.querySelector<HTMLInputElement>('input[type="text"]');

    expect(avatarUploader).not.toBeNull();
    expect(avatarUploader?.textContent).toContain('Author Avatar');
    expect(avatarUploader?.textContent).toContain('Choose Avatar');
    expect(avatarUploader?.textContent).toContain('Media Library');
    expect(mediaUrlInput?.value).toBe(DEFAULT_AUTHOR_PROFILE.avatarUrl);
  });
});
