import {ComponentFixture, TestBed} from '@angular/core/testing';

import {BlogRepositoryService} from '../../../../features/blog/services/blog-repository.service';
import {CmsDraftPreviewPanelComponent} from './cms-draft-preview-panel.component';

describe('CmsDraftPreviewPanelComponent', () => {
  let fixture: ComponentFixture<CmsDraftPreviewPanelComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CmsDraftPreviewPanelComponent],
      providers: [{
        provide: BlogRepositoryService,
        useValue: {createPreviewUrl: (token: string) => `/preview/${token}`},
      }],
    }).compileComponents();

    fixture = TestBed.createComponent(CmsDraftPreviewPanelComponent);
    document.body.appendChild(fixture.nativeElement as HTMLElement);
    fixture.componentRef.setInput('post', null);
    fixture.componentRef.setInput('status', 'draft');
    fixture.detectChanges();
  });

  afterEach(() => {
    const nativeElement = fixture.nativeElement as HTMLElement;
    if (nativeElement.parentNode === document.body) {
      document.body.removeChild(nativeElement);
    }
    fixture.destroy();
  });

  it('keeps focus on the preview launcher while its parent operation is busy', () => {
    const generateRequested = jasmine.createSpy('generateRequested');
    fixture.componentInstance.generateRequested.subscribe(generateRequested);
    const moduleToggle = (fixture.nativeElement as HTMLElement).querySelector<HTMLButtonElement>(
      'app-admin-control-module button'
    );
    moduleToggle?.click();
    fixture.detectChanges();
    const button = Array.from(
      (fixture.nativeElement as HTMLElement).querySelectorAll<HTMLButtonElement>('button')
    ).find(candidate => candidate.textContent?.includes('Create Link'));

    expect(button).toBeTruthy();
    if (!button) return;

    button.focus();
    button.click();
    expect(generateRequested).toHaveBeenCalledTimes(1);

    fixture.componentRef.setInput('isSaving', true);
    fixture.detectChanges();

    expect(document.activeElement).toBe(button);
    expect(button.getAttribute('aria-disabled')).toBe('true');
    button.click();
    expect(generateRequested).toHaveBeenCalledTimes(1);
  });
});
