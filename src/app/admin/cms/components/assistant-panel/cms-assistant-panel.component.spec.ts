import {ComponentFixture, TestBed} from '@angular/core/testing';

import {BlogAssistantResult} from '../../models/blog-ai-assistant.model';
import {CmsAssistantPanelComponent} from './cms-assistant-panel.component';

const assistantResult: BlogAssistantResult = {
  generatedAt: '2026-08-22T00:00:00.000Z',
  source: 'backend',
  suggestions: [],
  thumbnailSuggestions: [
    {
      id: 'thumbnail-1',
      prompt: 'First thumbnail',
      altText: 'First thumbnail',
      style: 'editorial',
    },
    {
      id: 'thumbnail-2',
      prompt: 'Second thumbnail',
      altText: 'Second thumbnail',
      style: 'documentary',
    },
  ],
};

describe('CmsAssistantPanelComponent', () => {
  let fixture: ComponentFixture<CmsAssistantPanelComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CmsAssistantPanelComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(CmsAssistantPanelComponent);
    document.body.appendChild(fixture.nativeElement as HTMLElement);
    fixture.componentRef.setInput('result', assistantResult);
    fixture.componentRef.setInput('isLoading', false);
    fixture.componentRef.setInput('message', '');
    fixture.componentRef.setInput('error', '');
    fixture.componentRef.setInput('sourceLabel', 'Backend');
    fixture.componentRef.setInput('isThumbnailLoading', null);
    fixture.componentRef.setInput('thumbnailError', '');
    fixture.componentRef.setInput('lastGeneratedThumbnail', null);
    fixture.detectChanges();

    const moduleToggle = (fixture.nativeElement as HTMLElement).querySelector<HTMLButtonElement>(
      'app-admin-control-module button'
    );
    moduleToggle?.click();
    fixture.detectChanges();
  });

  afterEach(() => {
    const nativeElement = fixture.nativeElement as HTMLElement;
    if (nativeElement.parentNode === document.body) {
      document.body.removeChild(nativeElement);
    }
    fixture.destroy();
  });

  it('keeps thumbnail launchers focusable and blocks every repeat activation while a writer is busy', () => {
    const generateThumbnail = jasmine.createSpy('generateThumbnail');
    fixture.componentInstance.generateThumbnail.subscribe(generateThumbnail);
    const buttons = thumbnailButtons();
    const activeButton = buttons[0];

    expect(buttons.length).toBe(2);
    expect(activeButton).toBeTruthy();
    if (!activeButton) return;

    activeButton.focus();
    activeButton.click();
    expect(generateThumbnail).toHaveBeenCalledTimes(1);

    fixture.componentRef.setInput('isThumbnailLoading', 'thumbnail-1');
    fixture.componentRef.setInput('isThumbnailWriterUnavailable', true);
    fixture.detectChanges();

    const busyButtons = thumbnailButtons();
    expect(busyButtons[0]).toBe(activeButton);
    expect(document.activeElement).toBe(activeButton);
    expect(busyButtons[0]?.textContent).toContain('Generating Image');
    expect(busyButtons.every(button => button.getAttribute('aria-disabled') === 'true')).toBeTrue();

    busyButtons.forEach(button => button.click());
    expect(generateThumbnail).toHaveBeenCalledTimes(1);
  });

  function thumbnailButtons(): HTMLButtonElement[] {
    return Array.from(
      (fixture.nativeElement as HTMLElement).querySelectorAll<HTMLButtonElement>('button')
    ).filter(button => /Generate & Store|Generating Image/.test(button.textContent ?? ''));
  }
});
