import {ComponentFixture, TestBed} from '@angular/core/testing';
import {WritableSignal} from '@angular/core';
import {ActivatedRoute, Router, convertToParamMap} from '@angular/router';
import {Observable, Subject, of, throwError} from 'rxjs';

import {AuthorRepositoryService} from '../../../../features/authors/services/author-repository.service';
import {BlogPost} from '../../../../features/blog/models/blog-post.model';
import {BlogRepositoryService} from '../../../../features/blog/services/blog-repository.service';
import {BlogAiAssistantService} from '../../services/blog-ai-assistant.service';
import {BlogAiFunctionsService} from '../../services/blog-ai-functions.service';
import {
  BlogMediaUploadProgress,
  BlogMediaUploadService,
} from '../../services/blog-media-upload.service';
import {EditorSavedDocument} from '../../models/editor-document.model';
import {CmsPostRecoveryService} from '../../services/post-recovery.service';
import {CmsToastService} from '../../services/cms-toast.service';
import {PostPackageImportProgress} from './post-package-import-progress.component';
import {CmsPostEditorComponent} from './post-editor.component';

interface TestablePostEditor {
  canDeactivate(): boolean;

  deleteCurrentPost(): Promise<void>;

  exportPostJson(): Promise<void>;

  generatePreviewLink(): Promise<void>;

  importPostJson(event: Event): Promise<void>;

  importPostPackage(event: Event): Promise<void>;

  isJsonImportInProgress: WritableSignal<boolean>;
  isPackageImportInProgress: WritableSignal<boolean>;
  isPostImportInProgress: () => boolean;

  onSaved(saved: EditorSavedDocument): Promise<boolean>;

  packageImportProgress: WritableSignal<PostPackageImportProgress | null>;
  postImportAnnouncement: WritableSignal<string>;

  protectBrowserUnload(event: BeforeUnloadEvent): void;

  savePost(): Promise<boolean>;
}

describe('CmsPostEditorComponent package import lifecycle', () => {
  let fixture: ComponentFixture<CmsPostEditorComponent>;
  let editor: TestablePostEditor;
  let uploadImage: jasmine.Spy<(file: File) => Observable<BlogMediaUploadProgress>>;
  let getAdminPostBySlug: jasmine.Spy<(slug: string) => BlogPost | undefined>;
  let router: jasmine.SpyObj<Pick<Router, 'navigate'>>;
  let toast: jasmine.SpyObj<Pick<CmsToastService, 'error' | 'success'>>;

  beforeEach(async () => {
    uploadImage = jasmine.createSpy('uploadImage');
    getAdminPostBySlug = jasmine.createSpy('getAdminPostBySlug').and.returnValue(undefined);
    router = jasmine.createSpyObj('Router', ['navigate']);
    router.navigate.and.resolveTo(true);
    toast = jasmine.createSpyObj('CmsToastService', ['error', 'success']);

    const blogRepository = {
      loading$: of(false),
      createNewPostTemplate: () => createPost('https://images.example/original.webp'),
      createUniqueSlug: (slug: string) => slug,
      getAdminPostBySlug,
      getAdminPosts$: () => of([]),
      savePost: jasmine.createSpy('savePost'),
    };
    const recoveryService = {
      clearNewPostId: jasmine.createSpy('clearNewPostId'),
      delete: jasmine.createSpy('delete').and.resolveTo(undefined),
      getOrCreateNewPostId: (fallback: string) => fallback,
      load: jasmine.createSpy('load').and.resolveTo(undefined),
      save: jasmine.createSpy('save'),
    };

    await TestBed.configureTestingModule({
      imports: [CmsPostEditorComponent],
      providers: [
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: {
              paramMap: convertToParamMap({}),
              queryParamMap: convertToParamMap({}),
            },
          },
        },
        {provide: Router, useValue: router},
        {provide: BlogRepositoryService, useValue: blogRepository},
        {provide: AuthorRepositoryService, useValue: {getAuthors$: () => of([])}},
        {provide: BlogAiAssistantService, useValue: {}},
        {provide: BlogAiFunctionsService, useValue: {}},
        {provide: BlogMediaUploadService, useValue: {uploadImage}},
        {provide: CmsToastService, useValue: toast},
        {provide: CmsPostRecoveryService, useValue: recoveryService},
      ],
    })
      .overrideComponent(CmsPostEditorComponent, {
        set: {
          template: `
        <button
          type="button"
          data-testid="package-import-trigger"
          [attr.aria-disabled]="isPostImportInProgress()"
        >Import post package</button>
        <p role="status" aria-live="polite" data-testid="post-import-announcement">
          {{ postImportAnnouncement() }}
        </p>
      `
        }
      })
      .compileComponents();

    fixture = TestBed.createComponent(CmsPostEditorComponent);
    editor = fixture.componentInstance as unknown as TestablePostEditor;
  });

  afterEach(() => {
    if (!fixture.componentRef.hostView.destroyed) {
      fixture.destroy();
    }
  });

  it('locks save and navigation while transfer and finalization are active, then loads an unsaved draft', async () => {
    const upload = new Subject<BlogMediaUploadProgress>();
    uploadImage.and.returnValue(upload);
    spyOn(window, 'confirm').and.returnValue(false);
    fixture.detectChanges();
    const trigger = query('[data-testid="package-import-trigger"]') as HTMLButtonElement;
    const liveRegion = query('[data-testid="post-import-announcement"]');
    trigger.focus();
    expect(liveRegion?.textContent?.trim()).toBe('');

    const importPromise = editor.importPostPackage(createPackageEvent());
    await waitForSpy(uploadImage);
    fixture.detectChanges();

    expect(query('[data-testid="post-import-announcement"]')).toBe(liveRegion);
    expect(liveRegion?.textContent?.trim()).toContain('Uploading 1 post package image');
    expect(document.activeElement).toBe(trigger);
    expect(trigger.getAttribute('aria-disabled')).toBe('true');
    expect(editor.isPackageImportInProgress()).toBeTrue();
    expect(editor.canDeactivate()).toBeFalse();
    expect(await editor.savePost()).toBeFalse();
    await editor.deleteCurrentPost();
    await editor.generatePreviewLink();
    await editor.exportPostJson();
    expect(await editor.onSaved({
      data: {blocks: []},
      savedAt: '2026-08-22T00:00:00.000Z',
      blockCount: 0,
    })).toBeFalse();
    expect(router.navigate).not.toHaveBeenCalled();

    const unloadEvent = {
      preventDefault: jasmine.createSpy('preventDefault'),
      returnValue: undefined,
    } as unknown as BeforeUnloadEvent;
    editor.protectBrowserUnload(unloadEvent);
    expect(unloadEvent.preventDefault).toHaveBeenCalled();

    upload.next(createUploadProgress(35));
    expect(editor.packageImportProgress()?.stage).toBe('uploading');
    expect(editor.postImportAnnouncement()).toBe('Uploading 1 post package image.');
    upload.next(createUploadProgress(100));
    expect(editor.packageImportProgress()?.stage).toBe('processing');
    expect(editor.postImportAnnouncement()).toContain('Processing media');
    upload.next(createUploadProgress(100, 'https://images.example/package-cover.webp'));
    upload.complete();
    await importPromise;

    expect(editor.isPackageImportInProgress()).toBeFalse();
    expect(editor.postImportAnnouncement()).toBe('');
    expect(editor.packageImportProgress()).toEqual(jasmine.objectContaining({
      stage: 'complete',
      completedImages: 1,
      totalImages: 1,
      progress: 100,
    }));
    expect(editor.canDeactivate()).toBeFalse();
    expect(toast.success).toHaveBeenCalledWith(jasmine.stringMatching(/Review and save the draft/));
  });

  it('uses one shared lock when JSON reading starts before a package import', async () => {
    let resolveJson: ((value: string) => void) | undefined;
    const delayedJson = new Promise<string>(resolve => {
      resolveJson = resolve;
    });
    const jsonFile = {
      name: 'post.json',
      text: () => delayedJson,
    } as unknown as File;

    const jsonPromise = editor.importPostJson(createFileEvent([jsonFile]));
    await Promise.resolve();

    expect(editor.isJsonImportInProgress()).toBeTrue();
    expect(editor.isPostImportInProgress()).toBeTrue();
    await editor.importPostPackage(createPackageEvent());
    expect(uploadImage).not.toHaveBeenCalled();

    resolveJson?.(JSON.stringify(createPost('https://images.example/json-cover.webp')));
    await jsonPromise;

    expect(editor.isJsonImportInProgress()).toBeFalse();
    expect(editor.isPostImportInProgress()).toBeFalse();
    expect(toast.success).toHaveBeenCalledWith(jasmine.stringMatching(/Imported post/));
  });

  it('reports finalized media after a later package image fails and releases the busy lock', async () => {
    uploadImage.and.returnValues(
      of(createUploadProgress(100, 'https://images.example/package-cover.webp')),
      throwError(() => new Error('Variant creation failed'))
    );

    await editor.importPostPackage(createPackageEvent(['images/cover.webp', 'images/inline.webp']));

    expect(editor.isPackageImportInProgress()).toBeFalse();
    expect(editor.packageImportProgress()).toEqual(jasmine.objectContaining({
      stage: 'error',
      completedImages: 1,
      totalImages: 2,
      currentFile: 'images/inline.webp',
    }));
    expect(editor.packageImportProgress()?.detail).toContain('remain available in the Media Library');
  });

  it('cancels a duplicate-slug package before upload without changing the draft', async () => {
    getAdminPostBySlug.and.returnValue(createPost('https://images.example/existing.webp'));
    spyOn(window, 'confirm').and.returnValue(false);

    await editor.importPostPackage(createPackageEvent());

    expect(uploadImage).not.toHaveBeenCalled();
    expect(editor.isPackageImportInProgress()).toBeFalse();
    expect(editor.packageImportProgress()).toEqual(jasmine.objectContaining({
      stage: 'cancelled',
      completedImages: 0,
      progress: 0,
    }));
  });

  it('unsubscribes an unfinished upload when the editor is destroyed', async () => {
    const upload = new Subject<BlogMediaUploadProgress>();
    uploadImage.and.returnValue(upload);

    const importPromise = editor.importPostPackage(createPackageEvent());
    await waitForSpy(uploadImage);
    expect(upload.observers.length).toBe(1);

    fixture.destroy();
    await importPromise;

    expect(upload.observers.length).toBe(0);
    expect(toast.success).not.toHaveBeenCalled();
  });

  it('preserves indeterminate progress when package validation fails before totals exist', async () => {
    const postFile = createPackageFile(
      'post.json',
      JSON.stringify(createPost('media://images/cover.webp')),
      'application/json'
    );

    await editor.importPostPackage(createFileEvent([postFile]));

    expect(editor.packageImportProgress()).toEqual(jasmine.objectContaining({
      stage: 'error',
      progress: null,
      totalImages: 0,
    }));
  });

  function query(selector: string): HTMLElement | null {
    return (fixture.nativeElement as HTMLElement).querySelector<HTMLElement>(selector);
  }
});

function createPost(coverImage: string): BlogPost {
  return {
    id: 'package-post',
    revision: 0,
    slug: 'package-post',
    title: 'Package post',
    excerpt: 'A packaged post.',
    coverImage,
    featured: false,
    authorId: 'colin-michaels',
    author: {name: 'Colin Michaels', slug: 'colin-michaels'},
    categories: ['Projects'],
    subcategories: [],
    tags: ['Import'],
    status: 'draft',
    seo: {
      title: 'Package post',
      description: 'A packaged post.',
      openGraphImage: '',
    },
    contentFormat: 'editorjs',
    blocks: [],
    createdAt: '2026-08-20T00:00:00.000Z',
    updatedAt: '2026-08-20T00:00:00.000Z',
    publishedAt: null,
  };
}

function createPackageEvent(imagePaths: readonly string[] = ['images/cover.webp']): Event {
  const post = createPost('media://images/cover.webp');

  if (imagePaths.includes('images/inline.webp')) {
    post.blocks = [{id: 'inline', type: 'image', data: {url: 'media://images/inline.webp', alt: 'Inline'}}];
  }

  const files = [
    createPackageFile('post.json', JSON.stringify(post), 'application/json'),
    createPackageFile('image-manifest.json', JSON.stringify({
      images: imagePaths.map(file => ({file, role: file.includes('cover') ? 'cover' : 'inline-image'})),
    }), 'application/json'),
    ...imagePaths.map(path => createPackageFile(path, 'image-bytes', 'image/webp')),
  ];
  return createFileEvent(files);
}

function createFileEvent(files: readonly File[]): Event {
  const input = {files, value: 'selected'};
  return {target: input} as unknown as Event;
}

function createPackageFile(path: string, content: string, type: string): File {
  const name = path.split('/').at(-1) ?? path;
  return {
    name,
    type,
    webkitRelativePath: `package/${path}`,
    text: () => Promise.resolve(content),
  } as unknown as File;
}

function createUploadProgress(progress: number, downloadUrl?: string): BlogMediaUploadProgress {
  return {
    progress,
    storagePath: 'blog-media/package/cover.webp',
    originalName: 'cover.webp',
    contentType: 'image/webp',
    size: 10,
    originalSize: 10,
    optimized: false,
    optimizationSavings: 0,
    optimizationSavingsPercent: 0,
    ...(downloadUrl ? {downloadUrl} : {}),
  };
}

async function waitForSpy(spy: jasmine.Spy): Promise<void> {
  for (let attempt = 0; attempt < 20 && !spy.calls.any(); attempt += 1) {
    await Promise.resolve();
  }

  expect(spy).toHaveBeenCalled();
}
