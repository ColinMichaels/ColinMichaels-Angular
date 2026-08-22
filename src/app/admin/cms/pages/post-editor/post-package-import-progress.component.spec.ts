import {ComponentFixture, TestBed} from '@angular/core/testing';

import {
  PostPackageImportProgress,
  PostPackageImportProgressComponent,
} from './post-package-import-progress.component';

describe('PostPackageImportProgressComponent', () => {
  let fixture: ComponentFixture<PostPackageImportProgressComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PostPackageImportProgressComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(PostPackageImportProgressComponent);
  });

  it('announces package checking with an indeterminate progress bar', () => {
    render({
      stage: 'checking',
      message: 'Reading 6 selected files and locating the post and image manifest.',
      progress: null,
      completedImages: 0,
      totalImages: 0,
    });

    const progressBar = queryProgressBar();

    expect(queryText()).toContain('Checking package');
    expect(queryText()).toContain('Reading 6 selected files');
    expect(progressBar?.hasAttribute('aria-valuenow')).toBeFalse();
    expect(progressBar?.getAttribute('aria-valuetext')).toBe('Checking the post package.');
    expect(query('[data-testid="post-package-import-progress"]')?.getAttribute('aria-busy')).toBe('true');
    expect(query('[role="status"]')).toBeNull();
  });

  it('shows real per-package progress while the backend processes an uploaded image', () => {
    render({
      stage: 'processing',
      message: 'Upload 2 of 4 is complete. Processing detail.webp and creating web-ready versions.',
      detail: 'The transfer is complete; server-side validation and image variants are still running.',
      progress: 50,
      completedImages: 1,
      totalImages: 4,
      currentFile: 'images/detail.webp',
    });

    expect(queryProgressBar()?.getAttribute('aria-valuenow')).toBe('50');
    expect(queryText()).toContain('Processing media');
    expect(queryText()).toContain('1 of 4 images ready');
    expect(queryText()).toContain('images/detail.webp');
    expect(queryText()).toContain('server-side validation');
    expect(query('[data-testid="post-package-import-detail"]')?.classList).toContain('text-zinc-400');
    expect(query('[data-testid="post-package-import-image-count"]')?.classList).toContain('text-zinc-400');
    expect(queryProgressBar()?.getAttribute('aria-valuetext')).toBe('Processing media: 50 percent; 1 of 4 images ready');
  });

  it('keeps the completed unsaved-draft status visible at 100 percent', () => {
    render({
      stage: 'complete',
      message: 'The imported draft is ready for review and has not been saved.',
      progress: 100,
      completedImages: 4,
      totalImages: 4,
    });

    expect(queryProgressBar()?.getAttribute('aria-valuenow')).toBe('100');
    expect(queryText()).toContain('Package import complete');
    expect(queryText()).toContain('4 of 4 images ready');
    expect(query('[data-testid="post-package-import-progress"]')?.getAttribute('aria-busy')).toBe('false');
  });

  it('keeps high-frequency transfer copy outside the live status region', () => {
    render({
      stage: 'uploading',
      message: 'Uploading image 1 of 2: cover.webp (37%)',
      progress: 18.5,
      completedImages: 0,
      totalImages: 2,
      currentFile: 'cover.webp',
    });

    expect(query('[role="status"]')).toBeNull();
    expect(queryProgressBar()?.getAttribute('aria-valuenow')).toBe('19');
  });

  it('keeps a pre-manifest failure indeterminate without animating an active transfer', () => {
    render({
      stage: 'error',
      message: 'Unable to import post package: image manifest is missing.',
      progress: null,
      completedImages: 0,
      totalImages: 0,
    });

    expect(queryProgressBar()?.hasAttribute('aria-valuenow')).toBeFalse();
    expect(queryProgressBar()?.getAttribute('aria-valuetext')).toBe('Post package import failed. Review the status details.');
    expect(query('.package-progress-indeterminate')).toBeNull();
  });

  it('keeps partial-failure details visible after the import stops', () => {
    render({
      stage: 'error',
      message: 'Unable to import post package: detail.webp could not be finalized.',
      detail: '1 image already uploaded remains available in the Media Library.',
      progress: 50,
      completedImages: 1,
      totalImages: 2,
      currentFile: 'detail.webp',
    });

    expect(queryText()).toContain('Package import stopped');
    expect(queryText()).toContain('1 of 2 images ready');
    expect(queryText()).toContain('remains available in the Media Library');
    expect(queryProgressBar()?.getAttribute('aria-valuenow')).toBe('50');
    expect(query('[data-testid="post-package-import-progress"]')?.getAttribute('aria-busy')).toBe('false');
    expect(query('[role="status"]')).toBeNull();
  });

  function render(progress: PostPackageImportProgress): void {
    fixture.componentRef.setInput('progress', progress);
    fixture.detectChanges();
  }

  function query(selector: string): HTMLElement | null {
    return (fixture.nativeElement as HTMLElement).querySelector<HTMLElement>(selector);
  }

  function queryProgressBar(): HTMLElement | null {
    return query('[role="progressbar"]');
  }

  function queryText(): string {
    return (fixture.nativeElement as HTMLElement).textContent ?? '';
  }
});
