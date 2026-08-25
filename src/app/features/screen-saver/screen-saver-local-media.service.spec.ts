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
    expect(service.activeImages()).toEqual([]);
  });

  it('rejects non-image files', async () => {
    const file = new File(['not an image'], 'notes.txt', {type: 'text/plain'});

    const addedCount = await service.addFiles([file]);

    expect(addedCount).toBe(0);
    expect(service.images().length).toBe(0);
    expect(service.error()).toContain('Choose image files');
  });

  it('keeps object URLs bounded to the current and adjacent images', async () => {
    const revokeObjectUrl = spyOn(URL, 'revokeObjectURL').and.callThrough();
    const files = ['a.png', 'b.png', 'c.png', 'd.png'].map((name, index) => (
      new File([new Uint8Array([137, 80, 78, index])], name, {type: 'image/png'})
    ));
    await service.addFiles(files);

    await service.setActiveWindow(0);

    expect(service.activeImages().length).toBe(3);
    expect(service.activeImages().map(image => image.sourceIndex)).toEqual([0, 1, 3]);

    await service.setActiveWindow(1);

    expect(service.activeImages().length).toBe(3);
    expect(service.activeImages().map(image => image.sourceIndex)).toEqual([1, 2, 0]);
    expect(revokeObjectUrl).toHaveBeenCalledTimes(1);

    service.releaseActiveImages();

    expect(service.activeImages()).toEqual([]);
    expect(revokeObjectUrl).toHaveBeenCalledTimes(4);
  });
});
