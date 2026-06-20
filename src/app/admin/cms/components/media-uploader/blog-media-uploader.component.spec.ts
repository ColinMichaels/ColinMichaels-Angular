import {ComponentFixture, TestBed} from '@angular/core/testing';
import {BehaviorSubject, of} from 'rxjs';

import {MediaLibraryItem, MediaUploadEvent} from '../../../media-library/models/media-library.models';
import {MediaLibraryService} from '../../../media-library/services/media-library.service';
import {BlogMediaUploaderComponent} from './blog-media-uploader.component';

const existingImage: MediaLibraryItem = {
  id: 'media-existing',
  displayName: 'Existing hero image',
  originalFileName: 'existing-hero.webp',
  fileName: 'existing-hero.webp',
  extension: 'webp',
  mediaType: 'image',
  mimeType: 'image/webp',
  thumbnailUrl: '/assets/images/backgrounds/day.webp',
  previewUrl: '/assets/images/backgrounds/day.webp',
  originalUrl: '/assets/images/backgrounds/day.webp',
  downloadUrl: '/assets/images/backgrounds/day.webp',
  width: 1600,
  height: 900,
  sizeBytes: 120000,
  folderId: null,
  folderPath: 'Blog',
  tags: ['blog'],
  favorite: false,
  rating: null,
  colorLabel: null,
  notes: null,
  altText: 'Existing hero image',
  description: null,
  status: 'ready',
  processingError: null,
  uploadedAt: '2026-06-20T12:00:00.000Z',
};

const uploadedImage: MediaLibraryItem = {
  ...existingImage,
  id: 'media-uploaded',
  displayName: 'Uploaded social image',
  originalFileName: 'uploaded-social.jpg',
  fileName: 'uploaded-social.jpg',
  extension: 'jpg',
  mimeType: 'image/jpeg',
  thumbnailUrl: '/assets/images/backgrounds/night.jpg',
  previewUrl: '/assets/images/backgrounds/night.jpg',
  originalUrl: '/assets/images/backgrounds/night.jpg',
  downloadUrl: '/assets/images/backgrounds/night.jpg',
  altText: 'Uploaded social image',
};

class MockMediaLibraryService {
  readonly items$ = new BehaviorSubject<readonly MediaLibraryItem[]>([existingImage]);
  readonly uploadFiles = jasmine.createSpy('uploadFiles').and.returnValue(of({
    fileName: 'uploaded-social.jpg',
    progress: 100,
    status: 'complete',
    item: uploadedImage,
  } satisfies MediaUploadEvent));

  listenToMediaItems() {
    return this.items$.asObservable();
  }
}

describe('BlogMediaUploaderComponent', () => {
  let fixture: ComponentFixture<BlogMediaUploaderComponent>;
  let mediaLibrary: MockMediaLibraryService;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [BlogMediaUploaderComponent],
      providers: [
        {provide: MediaLibraryService, useClass: MockMediaLibraryService},
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(BlogMediaUploaderComponent);
    mediaLibrary = TestBed.inject(MediaLibraryService) as unknown as MockMediaLibraryService;
    fixture.componentRef.setInput('buttonLabel', 'Choose Cover');
    fixture.detectChanges();
  });

  it('opens a media library picker and applies an existing image', () => {
    const onChange = jasmine.createSpy('onChange');
    fixture.componentInstance.registerOnChange(onChange);

    clickButtonByText('Choose Cover');
    fixture.detectChanges();

    expect(queryText()).toContain('Media Library');
    expect(queryText()).toContain('Existing hero image');

    clickButtonByText('Existing hero image');
    fixture.detectChanges();
    clickButtonByText('Use Selected Image');
    fixture.detectChanges();

    expect(onChange).toHaveBeenCalledWith('/assets/images/backgrounds/day.webp');
    expect(queryInputValue('input[type="text"]')).toBe('/assets/images/backgrounds/day.webp');
    expect(queryText()).toContain('Selected Existing hero image from the media library.');
  });

  it('uploads a new image as a media library item and applies it', () => {
    const onChange = jasmine.createSpy('onChange');
    fixture.componentInstance.registerOnChange(onChange);
    fixture.componentRef.setInput('postSlug', 'test-post');
    fixture.componentRef.setInput('assetRole', 'open-graph');
    fixture.componentRef.setInput('optimizationOutputType', 'image/jpeg');
    fixture.componentRef.setInput('forceOptimizationOutputType', true);
    fixture.detectChanges();

    clickButtonByText('Choose Cover');
    fixture.detectChanges();
    clickButtonByText('Upload');
    fixture.detectChanges();

    const fileInput = (fixture.nativeElement as HTMLElement).querySelector<HTMLInputElement>('input[type="file"]');
    const file = new File(['image'], 'uploaded-social.jpg', {type: 'image/jpeg'});

    Object.defineProperty(fileInput, 'files', {value: [file]});
    fileInput?.dispatchEvent(new Event('change'));
    fixture.detectChanges();

    expect(mediaLibrary.uploadFiles).toHaveBeenCalled();
    expect(mediaLibrary.uploadFiles.calls.mostRecent().args[2]).toEqual(jasmine.objectContaining({
      slug: 'test-post',
      role: 'open-graph',
      optimization: jasmine.objectContaining({
        outputType: 'image/jpeg',
        forceOutputType: true,
      }),
    }));
    expect(onChange).toHaveBeenCalledWith('/assets/images/backgrounds/night.jpg');
    expect(queryInputValue('input[type="text"]')).toBe('/assets/images/backgrounds/night.jpg');
    expect(queryText()).toContain('Uploaded uploaded-social.jpg to the media library.');
  });

  function clickButtonByText(text: string): void {
    const button = Array.from((fixture.nativeElement as HTMLElement).querySelectorAll<HTMLButtonElement>('button'))
      .find(candidate => candidate.textContent?.includes(text));

    expect(button).withContext(`Expected button containing "${text}"`).toBeTruthy();
    button?.click();
  }

  function queryText(): string {
    return (fixture.nativeElement as HTMLElement).textContent ?? '';
  }

  function queryInputValue(selector: string): string {
    return (fixture.nativeElement as HTMLElement).querySelector<HTMLInputElement>(selector)?.value ?? '';
  }
});
