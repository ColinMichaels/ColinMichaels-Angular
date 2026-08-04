import {ComponentFixture, TestBed} from '@angular/core/testing';
import {BehaviorSubject, Subject, of} from 'rxjs';

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

const existingVideo: MediaLibraryItem = {
  ...existingImage,
  id: 'media-video',
  displayName: 'Existing social video',
  originalFileName: 'existing-social.mp4',
  fileName: 'existing-social.mp4',
  extension: 'mp4',
  mediaType: 'video',
  mimeType: 'video/mp4',
  thumbnailUrl: undefined,
  previewUrl: 'https://cdn.example.com/existing-social.mp4',
  originalUrl: 'https://cdn.example.com/existing-social.mp4',
  downloadUrl: 'https://cdn.example.com/existing-social.mp4',
  durationMs: 12_000,
  altText: null,
};

class MockMediaLibraryService {
  readonly items$ = new BehaviorSubject<readonly MediaLibraryItem[]>([existingImage, existingVideo]);
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

  it('distinguishes upload progress from server-side image processing', () => {
    const uploadEvents = new Subject<MediaUploadEvent>();
    mediaLibrary.uploadFiles.and.returnValue(uploadEvents.asObservable());

    clickButtonByText('Choose Cover');
    fixture.detectChanges();
    clickButtonByText('Upload');
    fixture.detectChanges();

    const fileInput = (fixture.nativeElement as HTMLElement).querySelector<HTMLInputElement>('input[type="file"]');
    const file = new File(['image'], 'slow-cover.jpg', {type: 'image/jpeg'});

    Object.defineProperty(fileInput, 'files', {value: [file]});
    fileInput?.dispatchEvent(new Event('change'));
    fixture.detectChanges();

    let progress = (fixture.nativeElement as HTMLElement)
      .querySelector<HTMLElement>('[data-testid="media-picker-upload-progress"]');
    expect(progress?.textContent).toContain('Preparing image for upload');
    expect(progress?.querySelector('[role="progressbar"]')?.getAttribute('aria-valuenow')).toBe('0');

    uploadEvents.next({fileName: file.name, progress: 42, status: 'uploading'});
    fixture.detectChanges();
    progress = (fixture.nativeElement as HTMLElement)
      .querySelector<HTMLElement>('[data-testid="media-picker-upload-progress"]');
    expect(progress?.textContent).toContain('Uploading slow-cover.jpg... 42%');
    expect(progress?.querySelector('[role="progressbar"]')?.getAttribute('aria-valuenow')).toBe('42');

    uploadEvents.next({fileName: file.name, progress: 100, status: 'uploading'});
    fixture.detectChanges();
    progress = (fixture.nativeElement as HTMLElement)
      .querySelector<HTMLElement>('[data-testid="media-picker-upload-progress"]');
    expect(progress?.textContent).toContain('Upload complete. Processing image');
    expect(progress?.querySelector('[role="progressbar"]')?.getAttribute('aria-valuenow')).toBe('100');

    uploadEvents.complete();
  });

  it('filters the picker to allowed videos and applies an existing video', () => {
    const onChange = jasmine.createSpy('onChange');
    const valueChange = jasmine.createSpy('valueChange');
    fixture.componentInstance.registerOnChange(onChange);
    fixture.componentInstance.valueChange.subscribe(valueChange);
    fixture.componentRef.setInput('buttonLabel', 'Choose Video');
    fixture.componentRef.setInput('allowedMediaTypes', ['video']);
    fixture.componentRef.setInput('accept', 'video/*');
    fixture.detectChanges();

    clickButtonByText('Choose Video');
    fixture.detectChanges();

    expect(queryText()).toContain('Existing social video');
    expect(queryText()).not.toContain('Existing hero image');

    clickButtonByText('Existing social video');
    fixture.detectChanges();
    clickButtonByText('Use Selected Video');
    fixture.detectChanges();

    const videoUrl = 'https://cdn.example.com/existing-social.mp4';
    expect(onChange).toHaveBeenCalledWith(videoUrl);
    expect(valueChange).toHaveBeenCalledWith(videoUrl);
    expect((fixture.nativeElement as HTMLElement).querySelector<HTMLVideoElement>('video')?.src).toBe(videoUrl);
  });

  it('does not preselect an existing item with a disallowed media type', () => {
    fixture.componentRef.setInput('value', existingImage.downloadUrl ?? '');
    fixture.componentRef.setInput('buttonLabel', 'Choose Video');
    fixture.componentRef.setInput('allowedMediaTypes', ['video']);
    fixture.detectChanges();

    clickButtonByText('Choose Video');
    fixture.detectChanges();

    const applyButton = Array.from(
      (fixture.nativeElement as HTMLElement).querySelectorAll<HTMLButtonElement>('button')
    ).find(candidate => candidate.textContent?.includes('Use Selected Video'));

    expect(queryText()).not.toContain('Existing hero image');
    expect(applyButton?.disabled).toBeTrue();
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
