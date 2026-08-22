import {ComponentFixture, TestBed, fakeAsync, flush, tick} from '@angular/core/testing';
import {of} from 'rxjs';

import {MediaLibraryItem} from './models/media-library.models';
import {MediaLibraryPageComponent} from './media-library-page.component';
import {MediaLibraryService} from './services/media-library.service';
import {MediaProcessingService} from './services/media-processing.service';

function createItem(id: string, status: MediaLibraryItem['status']): MediaLibraryItem {
  return {
    id,
    displayName: `${status} asset`,
    extension: 'webp',
    mediaType: 'image',
    tags: [],
    favorite: false,
    status,
    uploadedAt: '2026-08-01T12:00:00.000Z',
    updatedAt: '2026-08-01T12:00:00.000Z',
  };
}

function findButton(element: HTMLElement, label: string): HTMLButtonElement {
  const button = [...element.querySelectorAll<HTMLButtonElement>('button')]
    .find(candidate => candidate.textContent?.replace(/\s+/g, ' ').trim().endsWith(label));

  if (!button) {
    throw new Error(`Unable to find button: ${label}`);
  }

  return button;
}

describe('MediaLibraryPageComponent production safety', () => {
  let fixture: ComponentFixture<MediaLibraryPageComponent>;
  let mediaLibrary: jasmine.SpyObj<MediaLibraryService>;

  beforeEach(async () => {
    mediaLibrary = jasmine.createSpyObj<MediaLibraryService>('MediaLibraryService', [
      'listenToMediaItems',
      'listenToFolders',
      'restoreMedia',
    ]);
    mediaLibrary.listenToMediaItems.and.returnValue(of([
      createItem('ready', 'ready'),
      createItem('archived', 'archived'),
      createItem('deleted', 'deleted'),
    ]));
    mediaLibrary.listenToFolders.and.returnValue(of([]));
    mediaLibrary.restoreMedia.and.returnValue(of(void 0));

    await TestBed.configureTestingModule({
      imports: [MediaLibraryPageComponent],
      providers: [
        {provide: MediaLibraryService, useValue: mediaLibrary},
        {provide: MediaProcessingService, useValue: {resizeMedia: jasmine.createSpy('resizeMedia')}},
      ],
    }).compileComponents();
  });

  afterEach(() => {
    fixture?.destroy();
  });

  it('keeps deleted media out of ordinary views and restores it from the distinct Deleted view', fakeAsync(() => {
    fixture = TestBed.createComponent(MediaLibraryPageComponent);
    fixture.detectChanges();
    tick(250);
    fixture.detectChanges();

    const element = fixture.nativeElement as HTMLElement;
    expect(element.querySelector('app-admin-page-header h1')?.textContent).toContain('Media Library');
    expect(element.querySelector('[aria-label="ready asset"]')).not.toBeNull();
    expect(element.querySelector('[aria-label="archived asset"]')).not.toBeNull();
    expect(element.querySelector('[aria-label="deleted asset"]')).toBeNull();

    findButton(element, 'Deleted').click();
    fixture.detectChanges();

    expect(element.querySelector('[aria-label="ready asset"]')).toBeNull();
    expect(element.querySelector('[aria-label="archived asset"]')).toBeNull();
    const deletedCard = element.querySelector<HTMLElement>('[aria-label="deleted asset"]');
    expect(deletedCard).not.toBeNull();

    deletedCard?.querySelector<HTMLInputElement>('input[type="checkbox"]')?.click();
    fixture.detectChanges();
    const inspector = element.querySelector<HTMLElement>('app-media-inspector');
    expect(inspector?.textContent).toContain('Restore this retained record before editing');
    expect([...inspector?.querySelectorAll<HTMLButtonElement>('button') ?? []]
      .some(button => button.textContent?.trim() === 'Rename')).toBeFalse();
    expect(inspector?.querySelector('form')).toBeNull();

    const restoreButton = findButton(deletedCard as HTMLElement, 'Restore');
    expect(restoreButton.className).toContain('bg-cyan-950');
    expect(restoreButton.className).toContain('focus-visible:outline');
    restoreButton.click();
    fixture.detectChanges();

    expect(mediaLibrary.restoreMedia).toHaveBeenCalledOnceWith(['deleted']);
    expect(element.textContent).toContain('Media restored.');
    flush();
  }));

  it('provides a direct, high-contrast Restore action in list view', fakeAsync(() => {
    fixture = TestBed.createComponent(MediaLibraryPageComponent);
    fixture.detectChanges();
    tick(250);
    fixture.detectChanges();

    const element = fixture.nativeElement as HTMLElement;
    findButton(element, 'Deleted').click();
    findButton(element, 'List').click();
    fixture.detectChanges();

    const deletedRow = element.querySelector<HTMLElement>('[aria-label="deleted asset"]')!;
    expect(deletedRow.textContent).toContain('Deleted');
    const restoreButton = findButton(deletedRow, 'Restore');
    expect(restoreButton.className).toContain('bg-cyan-950');

    restoreButton.click();
    fixture.detectChanges();
    expect(mediaLibrary.restoreMedia).toHaveBeenCalledOnceWith(['deleted']);
    flush();
  }));

  it('ignores document shortcuts while an overlay is open and when events originate from controls', fakeAsync(() => {
    fixture = TestBed.createComponent(MediaLibraryPageComponent);
    fixture.detectChanges();
    tick(250);
    fixture.detectChanges();

    const element = fixture.nativeElement as HTMLElement;
    findButton(element, 'Filters').click();
    fixture.detectChanges();
    expect(element.querySelector('[role="dialog"][aria-label="Advanced media filters"]')).not.toBeNull();

    document.dispatchEvent(new KeyboardEvent('keydown', {
      key: 'a',
      ctrlKey: true,
      bubbles: true,
      cancelable: true,
    }));
    fixture.detectChanges();
    expect(element.querySelector('[aria-selected="true"]')).toBeNull();

    element.querySelector<HTMLButtonElement>('button[aria-label="Close filters"]')?.click();
    fixture.detectChanges();

    const refreshButton = element.querySelector<HTMLButtonElement>('button[aria-label="Refresh media"]');
    refreshButton?.dispatchEvent(new KeyboardEvent('keydown', {
      key: 'a',
      ctrlKey: true,
      bubbles: true,
      cancelable: true,
    }));
    fixture.detectChanges();
    expect(element.querySelector('[aria-selected="true"]')).toBeNull();

    document.dispatchEvent(new KeyboardEvent('keydown', {
      key: 'a',
      ctrlKey: true,
      bubbles: true,
      cancelable: true,
    }));
    fixture.detectChanges();
    expect(element.querySelectorAll('[aria-selected="true"]').length).toBe(2);
  }));

  it('keeps rename and lifecycle shortcuts from mutating a selected Deleted record', fakeAsync(() => {
    fixture = TestBed.createComponent(MediaLibraryPageComponent);
    fixture.detectChanges();
    tick(250);
    fixture.detectChanges();

    const element = fixture.nativeElement as HTMLElement;
    findButton(element, 'Deleted').click();
    fixture.detectChanges();
    element.querySelector<HTMLInputElement>('[aria-label="deleted asset"] input[type="checkbox"]')?.click();
    fixture.detectChanges();

    document.dispatchEvent(new KeyboardEvent('keydown', {
      key: 'r',
      ctrlKey: true,
      bubbles: true,
      cancelable: true,
    }));
    document.dispatchEvent(new KeyboardEvent('keydown', {
      key: 'Delete',
      bubbles: true,
      cancelable: true,
    }));
    fixture.detectChanges();

    expect(element.querySelector('[role="dialog"][aria-label="Rename media"]')).toBeNull();
    expect(element.textContent).not.toContain('Media archived.');
    expect(mediaLibrary.restoreMedia).not.toHaveBeenCalled();
  }));
});
