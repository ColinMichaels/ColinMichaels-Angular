import {TestBed} from '@angular/core/testing';
import {lastValueFrom, of} from 'rxjs';

import {FIREBASE_AUTH} from '../../../services/firebase/firebase.tokens';
import {FirestoreService} from '../../../services/firebase/firestore.service';
import {BlogMediaFunctionsService} from './blog-media-functions.service';
import {BlogMediaUploadService} from './blog-media-upload.service';

describe('BlogMediaUploadService trusted finalization', () => {
  let service: BlogMediaUploadService;
  let firestore: jasmine.SpyObj<FirestoreService>;
  let mediaFunctions: jasmine.SpyObj<BlogMediaFunctionsService>;

  beforeEach(() => {
    firestore = jasmine.createSpyObj<FirestoreService>('FirestoreService', ['uploadFileWithProgress']);
    mediaFunctions = jasmine.createSpyObj<BlogMediaFunctionsService>('BlogMediaFunctionsService', ['finalizeUpload']);
    firestore.uploadFileWithProgress.and.returnValue(of({progress: 100, uploadComplete: true}));
    mediaFunctions.finalizeUpload.and.resolveTo({
      mediaId: '019fc788-730b-7982-91c8-055dcdb1a8bf',
      checksum: 'abc123',
      originalName: 'story.png',
      originalContentType: 'image/png',
      originalSize: 4,
      downloadUrl: 'https://firebasestorage.googleapis.com/final.webp',
      storagePath: 'cms/blog-media/story/editor-image/media/960w.webp',
      contentType: 'image/webp',
      size: 3,
      width: 960,
      height: 540,
      variants: [{
        contentType: 'image/webp',
        format: 'webp',
        width: 960,
        height: 540,
        size: 3,
        storagePath: 'cms/blog-media/story/editor-image/media/960w.webp',
        url: 'https://firebasestorage.googleapis.com/final.webp',
      }],
    });

    TestBed.configureTestingModule({
      providers: [
        BlogMediaUploadService,
        {provide: FirestoreService, useValue: firestore},
        {provide: BlogMediaFunctionsService, useValue: mediaFunctions},
        {provide: FIREBASE_AUTH, useValue: {currentUser: {uid: 'editor-user'}}},
      ],
    });
    service = TestBed.inject(BlogMediaUploadService);
  });

  it('uploads only to the user staging path and returns the server-owned primary variant', async () => {
    const file = new File([new Uint8Array([0x89, 0x50, 0x4e, 0x47])], 'story.png', {type: 'image/png'});
    const result = await lastValueFrom(service.uploadImage(file, {
      slug: 'Story',
      role: 'editor-image',
      optimization: {enabled: false},
    }));

    const stagingPath = firestore.uploadFileWithProgress.calls.mostRecent().args[0] as string;
    expect(stagingPath).toMatch(/^cms\/blog-media-staging\/editor-user\/.+\/source\.png$/);
    expect(firestore.uploadFileWithProgress.calls.mostRecent().args[3]).toEqual({resolveDownloadUrl: false});
    expect(mediaFunctions.finalizeUpload).toHaveBeenCalledOnceWith(jasmine.objectContaining({
      stagingPath,
      declaredContentType: 'image/png',
      slug: 'story',
      role: 'editor-image',
    }));
    expect(result.downloadUrl).toBe('https://firebasestorage.googleapis.com/final.webp');
    expect(result.contentType).toBe('image/webp');
    expect(result.checksum).toBe('abc123');
  });

  it('rejects unsupported SVG uploads before Storage is called', async () => {
    const file = new File(['<svg/>'], 'unsafe.svg', {type: 'image/svg+xml'});
    await expectAsync(lastValueFrom(service.uploadImage(file, {slug: 'story', role: 'editor-image'})))
      .toBeRejectedWithError('Choose a JPEG, PNG, WebP, AVIF, or GIF image.');
    expect(firestore.uploadFileWithProgress).not.toHaveBeenCalled();
  });
});
