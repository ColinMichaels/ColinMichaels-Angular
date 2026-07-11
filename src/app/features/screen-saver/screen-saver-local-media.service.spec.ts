import {TestBed} from '@angular/core/testing';

import {ScreenSaverLocalMediaService} from './screen-saver-local-media.service';

describe('ScreenSaverLocalMediaService', () => {
  let service: ScreenSaverLocalMediaService;

  beforeEach(async () => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(ScreenSaverLocalMediaService);
    await service.whenReady();
    await service.clearAll();
  });

  afterEach(async () => {
    await service.clearAll();
  });

  it('stores uploaded images in the browser-local media set', async () => {
    const file = new File([new Uint8Array([137, 80, 78, 71])], 'trail.png', {type: 'image/png'});

    const addedCount = await service.addFiles([file]);

    expect(addedCount).toBe(1);
    expect(service.images().length).toBe(1);
    expect(service.images()[0].name).toBe('trail.png');
    expect(service.images()[0].imageUrl.startsWith('blob:')).toBeTrue();
  });

  it('rejects non-image files', async () => {
    const file = new File(['not an image'], 'notes.txt', {type: 'text/plain'});

    const addedCount = await service.addFiles([file]);

    expect(addedCount).toBe(0);
    expect(service.images().length).toBe(0);
    expect(service.error()).toContain('Choose image files');
  });
});
