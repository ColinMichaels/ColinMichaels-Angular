import {TestBed} from '@angular/core/testing';

import {BlogMediaFunctionsService} from './blog-media-functions.service';

describe('BlogMediaFunctionsService', () => {
  beforeEach(() => TestBed.configureTestingModule({providers: [BlogMediaFunctionsService]}));

  it('fails closed when Firebase Functions is unavailable', async () => {
    const service = TestBed.inject(BlogMediaFunctionsService);
    await expectAsync(service.inspectDelete('019fc788-730b-7982-91c8-055dcdb1a8bf'))
      .toBeRejectedWithError('Firebase Functions is not initialized.');
    await expectAsync(service.finalizeUpload({
      mediaId: '019fc788-730b-7982-91c8-055dcdb1a8bf',
      stagingPath: 'cms/blog-media-staging/user/id/source.webp',
      originalName: 'source.webp',
      declaredContentType: 'image/webp',
      slug: 'post',
      role: 'editor-image',
      altText: '',
    })).toBeRejectedWithError('Firebase Functions is not initialized.');
  });
});
