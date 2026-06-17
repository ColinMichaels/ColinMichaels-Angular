import {ComponentFixture, TestBed} from '@angular/core/testing';
import {of} from 'rxjs';

import {MediaLibraryService} from '../../../media-library/services/media-library.service';
import {EditorJsComponent} from './editor-js.component';

async function waitForEditorLoad(fixture: ComponentFixture<EditorJsComponent>): Promise<void> {
  const startedAt = Date.now();

  while (Date.now() - startedAt < 5000) {
    fixture.detectChanges();

    const element = fixture.nativeElement as HTMLElement;

    if (!element.textContent?.includes('Loading editor...')) {
      return;
    }

    await new Promise(resolve => setTimeout(resolve, 50));
  }

  throw new Error('Timed out waiting for Editor.js to initialize.');
}

describe('EditorJsComponent', () => {
  let fixture: ComponentFixture<EditorJsComponent>;

  beforeEach(async () => {
    const mediaLibraryService = {
      listenToMediaItems: jasmine.createSpy('listenToMediaItems').and.returnValue(of([])),
      listenToFolders: jasmine.createSpy('listenToFolders').and.returnValue(of([])),
    } satisfies Pick<MediaLibraryService, 'listenToMediaItems' | 'listenToFolders'>;

    await TestBed.configureTestingModule({
      imports: [EditorJsComponent],
      providers: [
        {provide: MediaLibraryService, useValue: mediaLibraryService},
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(EditorJsComponent);
  });

  it('initializes with the YouTube embed tool registered', async () => {
    fixture.componentRef.setInput('initialData', {
      blocks: [
        {
          id: 'youtube-embed',
          type: 'youtubeEmbed',
          data: {
            url: 'https://www.youtube.com/watch?v=L229QDxDakU',
          },
        },
      ],
    });

    fixture.detectChanges();
    await waitForEditorLoad(fixture);

    const element = fixture.nativeElement as HTMLElement;

    expect(element.textContent).not.toContain('Cannot read properties of undefined');
    expect(element.textContent).not.toContain('Unable to load YouTube Embed Editor.js tool.');
    expect(element.querySelector('iframe')?.getAttribute('src')).toContain('https://www.youtube.com/embed/L229QDxDakU');
  });
});
