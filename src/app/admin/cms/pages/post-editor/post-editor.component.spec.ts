import {ComponentFixture, TestBed} from '@angular/core/testing';
import {WritableSignal} from '@angular/core';
import {ActivatedRoute, Router, convertToParamMap} from '@angular/router';
import {Observable, Subject, of, throwError} from 'rxjs';

import {AuthorRepositoryService} from '../../../../features/authors/services/author-repository.service';
import {BlogPost} from '../../../../features/blog/models/blog-post.model';
import {BlogPostRevisionConflictError} from '../../../../features/blog/models/blog-post-revision.model';
import {BlogRepositoryService} from '../../../../features/blog/services/blog-repository.service';
import {BlogAiAssistantService} from '../../services/blog-ai-assistant.service';
import {BlogAiFunctionsService} from '../../services/blog-ai-functions.service';
import {
  BlogMediaUploadProgress,
  BlogMediaUploadService,
} from '../../services/blog-media-upload.service';
import {EditorSavedDocument} from '../../models/editor-document.model';
import {BlogStoredThumbnail, BlogThumbnailSuggestion} from '../../models/blog-ai-assistant.model';
import {CmsPostRecoverySnapshot} from '../../models/post-recovery.model';
import {CmsPostRecoveryService} from '../../services/post-recovery.service';
import {CmsToastService} from '../../services/cms-toast.service';
import {PostPackageImportProgress} from './post-package-import-progress.component';
import {CmsPostEditorComponent} from './post-editor.component';

interface TestablePostEditor {
  applyFirestorePost(post: BlogPost): Promise<void>;

  canDeactivate(): boolean;

  deleteCurrentPost(): Promise<void>;

  exportPostJson(): Promise<void>;

  createCurrentBackupPost(): Promise<BlogPost>;

  downloadJson(value: unknown, fileName: string): void;

  generatePreviewLink(): Promise<void>;

  generateAndStoreThumbnail(thumbnail: BlogThumbnailSuggestion): Promise<void>;

  importPostJson(event: Event): Promise<void>;

  importPostPackage(event: Event): Promise<void>;

  isJsonImportInProgress: WritableSignal<boolean>;
  isPackageImportInProgress: WritableSignal<boolean>;
  isPostImportInProgress: () => boolean;

  isImportLauncherUnavailable(): boolean;

  isCoverMediaWriterUnavailable(): boolean;

  isApplyingEditorState: boolean;
  isJsonExportInProgress: boolean;
  isPreviewGenerationInProgress: boolean;
  isThumbnailLoading: string | null;

  onSaved(saved: EditorSavedDocument): Promise<boolean>;

  packageImportProgress: WritableSignal<PostPackageImportProgress | null>;

  persistRecovery(force?: boolean): Promise<boolean>;
  postImportAnnouncement: WritableSignal<string>;
  recoveryDraft: WritableSignal<CmsPostRecoverySnapshot | null>;

  reloadRemotePost(automaticFirstSaveAdoption?: boolean): Promise<boolean>;

  recoveryPanelExpanded: WritableSignal<boolean>;

  restoreRecoveryDraft(): Promise<void>;

  saveConflict: WritableSignal<BlogPostRevisionConflictError | null>;

  saveConflictAsCopy(): Promise<void>;

  protectBrowserUnload(event: BeforeUnloadEvent): void;

  savePost(): Promise<boolean>;

  setMediaUploadInProgress(field: string, isUploading: boolean): void;

  uploadEditorImage(file: File): Promise<unknown>;

  editorComponent?: {
    renderDocument(document: unknown): Promise<void>;
    restoreRecoverySnapshot(snapshot: unknown): Promise<void>;
  };
  currentPost?: BlogPost;
  postForm: { controls: { title: { value: string } } };
}

describe('CmsPostEditorComponent package import lifecycle', () => {
  let fixture: ComponentFixture<CmsPostEditorComponent>;
  let editor: TestablePostEditor;
  let uploadImage: jasmine.Spy<(file: File) => Observable<BlogMediaUploadProgress>>;
  let getAdminPostBySlug: jasmine.Spy<(slug: string) => BlogPost | undefined>;
  let createPreviewForPost: jasmine.Spy;
  let generateAndStoreThumbnail: jasmine.Spy<(request: unknown) => Promise<BlogStoredThumbnail>>;
  let router: jasmine.SpyObj<Pick<Router, 'navigate'>>;
  let savePost: jasmine.Spy;
  let toast: jasmine.SpyObj<Pick<CmsToastService, 'error' | 'success'>>;

  beforeEach(async () => {
    uploadImage = jasmine.createSpy('uploadImage');
    getAdminPostBySlug = jasmine.createSpy('getAdminPostBySlug').and.returnValue(undefined);
    createPreviewForPost = jasmine.createSpy('createPreviewForPost');
    generateAndStoreThumbnail = jasmine.createSpy('generateAndStoreThumbnail');
    savePost = jasmine.createSpy('savePost');
    router = jasmine.createSpyObj('Router', ['navigate']);
    router.navigate.and.resolveTo(true);
    toast = jasmine.createSpyObj('CmsToastService', ['error', 'success']);

    const blogRepository = {
      loading$: of(false),
      createExportDocument: (posts: readonly BlogPost[]) => ({posts}),
      createNewPostTemplate: () => createPost('https://images.example/original.webp'),
      createPreviewForPost,
      createUniqueSlug: (slug: string) => slug,
      getAdminPostBySlug,
      getAdminPosts$: () => of([]),
      savePost,
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
        {
          provide: AuthorRepositoryService,
          useValue: {
            getAuthors$: () => of([{
              id: 'colin-michaels',
              slug: 'colin-michaels',
              name: 'Colin Michaels',
              title: 'Publisher',
              shortBio: 'Publisher',
              bio: 'Publisher',
              avatarUrl: 'https://images.example/colin.webp',
              imageAlt: 'Colin Michaels',
              externalProfiles: [],
              status: 'published',
              createdAt: '2026-01-01T00:00:00.000Z',
              updatedAt: '2026-01-01T00:00:00.000Z',
            }]),
          },
        },
        {provide: BlogAiAssistantService, useValue: {}},
        {provide: BlogAiFunctionsService, useValue: {generateAndStoreThumbnail}},
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
          [attr.aria-disabled]="isImportLauncherUnavailable()"
        >Import post package</button>
        <button
          type="button"
          data-testid="json-export-trigger"
          [attr.aria-disabled]="isPostImportInProgress() || isJsonExportInProgress || isPreviewGenerationInProgress"
          (click)="exportPostJson()"
        >Export JSON</button>
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

  it('requests a forced JPEG upload for an Open Graph image in a post package', async () => {
    uploadImage.and.returnValue(of(createUploadProgress(100, 'https://images.example/package-social.jpg')));
    const post = createPost('media://images/cover.webp');
    post.seo.openGraphImage = 'media://images/social.jpg';
    const event = createFileEvent([
      createPackageFile('post.json', JSON.stringify(post), 'application/json'),
      createPackageFile('image-manifest.json', JSON.stringify({
        images: [
          {file: 'images/cover.webp', role: 'cover'},
          {file: 'images/social.jpg', role: 'open-graph'},
        ],
      }), 'application/json'),
      createPackageFile('images/cover.webp', 'cover-bytes', 'image/webp'),
      createPackageFile('images/social.jpg', 'social-bytes', 'image/jpeg'),
    ]);

    await editor.importPostPackage(event);

    expect((uploadImage.calls.argsFor(1) as unknown as readonly unknown[])[1]).toEqual(jasmine.objectContaining({
      role: 'open-graph',
      optimization: {enabled: true, outputType: 'image/jpeg', forceOutputType: true},
    }));
  });

  it('keeps canonical list and YouTube blocks editable when a loose backup uses a string author', async () => {
    uploadImage.and.returnValue(of(createUploadProgress(100, 'https://images.example/package-cover.webp')));
    const renderDocument = jasmine.createSpy('renderDocument').and.resolveTo(undefined);
    editor.editorComponent = {
      renderDocument,
      restoreRecoverySnapshot: jasmine.createSpy('restoreRecoverySnapshot').and.resolveTo(undefined),
    };
    const loosePost = {
      ...createPost('media://images/cover.webp'),
      author: 'Colin Michaels',
      blocks: [
        {
          id: 'package-list',
          type: 'list',
          data: {
            ordered: false,
            style: 'unordered',
            listStyle: 'unordered',
            listPresentation: 'standard',
            listMeta: {},
            items: ['See the scene', 'Carry the load'],
            listItems: [
              {content: 'See the scene', meta: {}, items: []},
              {content: 'Carry the load', meta: {}, items: []},
            ],
          },
        },
        {
          id: 'package-youtube',
          type: 'embed',
          data: {
            provider: 'youtube',
            url: 'https://www.youtube.com/watch?v=s4SHEhtmTYc',
            embedUrl: 'https://www.youtube.com/embed/s4SHEhtmTYc',
          },
        },
      ],
    };
    const event = createFileEvent([
      createPackageFile('post.json', JSON.stringify({posts: [loosePost]}), 'application/json'),
      createPackageFile('image-manifest.json', JSON.stringify({
        images: [{file: 'images/cover.webp', role: 'cover'}],
      }), 'application/json'),
      createPackageFile('images/cover.webp', 'cover-bytes', 'image/webp'),
    ]);

    await editor.importPostPackage(event);

    expect(editor.packageImportProgress()?.stage).toBe('complete');
    const rendered = renderDocument.calls.mostRecent().args[0] as { blocks: readonly { type: string }[] };
    expect(rendered.blocks.map(block => block.type)).toEqual(['list', 'youtubeEmbed']);
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

  it('keeps a pending preview authoritative and rejects an import until preview creation settles', async () => {
    let resolvePreview: ((value: { post: BlogPost }) => void) | undefined;
    createPreviewForPost.and.returnValue(new Promise<{ post: BlogPost }>(resolve => {
      resolvePreview = resolve;
    }));
    spyOn(editor, 'savePost').and.resolveTo(true);

    const previewPromise = editor.generatePreviewLink();
    await waitForSpy(createPreviewForPost);

    expect(editor.isPreviewGenerationInProgress).toBeTrue();
    expect(editor.isImportLauncherUnavailable()).toBeTrue();
    await editor.importPostPackage(createPackageEvent());
    expect(uploadImage).not.toHaveBeenCalled();

    resolvePreview?.({post: createPost('https://images.example/preview.webp')});
    await previewPromise;

    expect(editor.isPreviewGenerationInProgress).toBeFalse();
  });

  it('keeps a pending JSON export isolated from package import', async () => {
    let resolveBackup: ((value: BlogPost) => void) | undefined;
    spyOn(editor, 'createCurrentBackupPost').and.returnValue(new Promise<BlogPost>(resolve => {
      resolveBackup = resolve;
    }));
    const downloadJson = spyOn(editor, 'downloadJson');
    const exportPostJson = spyOn(editor, 'exportPostJson').and.callThrough();
    fixture.detectChanges();
    const exportTrigger = query('[data-testid="json-export-trigger"]') as HTMLButtonElement;
    exportTrigger.focus();

    exportTrigger.click();
    await waitForSpy(exportPostJson);
    const exportPromise = exportPostJson.calls.mostRecent().returnValue;
    fixture.detectChanges();

    expect(editor.isJsonExportInProgress).toBeTrue();
    expect(editor.isImportLauncherUnavailable()).toBeTrue();
    expect(exportTrigger.getAttribute('aria-disabled')).toBe('true');
    expect(document.activeElement).toBe(exportTrigger);
    await editor.importPostPackage(createPackageEvent());
    expect(uploadImage).not.toHaveBeenCalled();

    resolveBackup?.(createPost('https://images.example/export.webp'));
    await exportPromise;

    expect(editor.isJsonExportInProgress).toBeFalse();
    expect(downloadJson).toHaveBeenCalledTimes(1);
  });

  it('blocks import while remote state, thumbnail, or form-media work can still write to the editor', async () => {
    editor.isApplyingEditorState = true;
    await editor.importPostPackage(createPackageEvent());
    editor.isApplyingEditorState = false;

    editor.isThumbnailLoading = 'thumbnail-1';
    await editor.importPostPackage(createPackageEvent());
    editor.isThumbnailLoading = null;

    editor.setMediaUploadInProgress('cover', true);
    await editor.importPostPackage(createPackageEvent());
    editor.setMediaUploadInProgress('cover', false);

    expect(uploadImage).not.toHaveBeenCalled();
    expect(toast.error).toHaveBeenCalledTimes(3);
  });

  it('serializes thumbnail generation and keeps import blocked until the active writer settles', async () => {
    let resolveThumbnail: ((value: BlogStoredThumbnail) => void) | undefined;
    generateAndStoreThumbnail.and.returnValue(new Promise<BlogStoredThumbnail>(resolve => {
      resolveThumbnail = resolve;
    }));
    const suggestion: BlogThumbnailSuggestion = {
      id: 'thumbnail-1',
      prompt: 'A production-ready thumbnail',
      altText: 'A production-ready thumbnail',
      style: 'editorial',
    };

    editor.setMediaUploadInProgress('cover', true);
    await editor.generateAndStoreThumbnail(suggestion);
    expect(generateAndStoreThumbnail).not.toHaveBeenCalled();
    editor.setMediaUploadInProgress('cover', false);

    const firstGeneration = editor.generateAndStoreThumbnail(suggestion);
    await waitForSpy(generateAndStoreThumbnail);
    await editor.generateAndStoreThumbnail({...suggestion, id: 'thumbnail-2'});
    await editor.importPostPackage(createPackageEvent());

    expect(generateAndStoreThumbnail).toHaveBeenCalledTimes(1);
    expect(uploadImage).not.toHaveBeenCalled();
    expect(editor.isThumbnailLoading).toBe('thumbnail-1');
    expect(editor.isCoverMediaWriterUnavailable()).toBeTrue();

    resolveThumbnail?.(createStoredThumbnail());
    await firstGeneration;

    expect(editor.isThumbnailLoading).toBeNull();
    expect(editor.isCoverMediaWriterUnavailable()).toBeFalse();
  });

  it('re-evaluates queued remote hydration after a recovery restoration finishes', async () => {
    let resolveRestore: (() => void) | undefined;
    const restoreRecoverySnapshot = jasmine.createSpy('restoreRecoverySnapshot').and.returnValue(
      new Promise<void>(resolve => {
        resolveRestore = resolve;
      })
    );
    const renderDocument = jasmine.createSpy('renderDocument').and.resolveTo(undefined);
    editor.editorComponent = {renderDocument, restoreRecoverySnapshot};
    editor.recoveryDraft.set(createRecoverySnapshot());

    const restoration = editor.restoreRecoveryDraft();
    await waitForSpy(restoreRecoverySnapshot);

    const remotePost = {
      ...createPost('https://images.example/remote.webp'),
      title: 'Same canonical revision',
    };
    const hydration = editor.applyFirestorePost(remotePost);
    await Promise.resolve();

    expect(renderDocument).not.toHaveBeenCalled();
    expect(editor.isApplyingEditorState).toBeTrue();

    resolveRestore?.();
    await restoration;
    await hydration;

    expect(renderDocument).not.toHaveBeenCalled();
    expect(editor.currentPost).not.toEqual(remotePost);
    expect(editor.postForm.controls.title.value).toBe('Recovered local post');
    expect(editor.saveConflict()).toBeNull();
    expect(editor.isApplyingEditorState).toBeFalse();

    const newerRemotePost = {...remotePost, revision: 2, title: 'Newest canonical post'};
    await editor.applyFirestorePost(newerRemotePost);

    expect(renderDocument).not.toHaveBeenCalled();
    expect(editor.postForm.controls.title.value).toBe('Recovered local post');
    expect(editor.saveConflict()?.remotePost).toEqual(newerRemotePost);
  });

  it('serializes repeated canonical reload requests while recovery persistence is pending', async () => {
    let resolveRecovery: ((value: boolean) => void) | undefined;
    const persistRecovery = spyOn(editor, 'persistRecovery').and.returnValue(new Promise<boolean>(resolve => {
      resolveRecovery = resolve;
    }));
    editor.saveConflict.set(new BlogPostRevisionConflictError(
      'package-post',
      0,
      1,
      {...createPost('https://images.example/remote.webp'), revision: 1}
    ));

    const firstReload = editor.reloadRemotePost();
    await waitForSpy(persistRecovery);
    await editor.reloadRemotePost();

    expect(persistRecovery).toHaveBeenCalledTimes(1);
    expect(editor.isApplyingEditorState).toBeTrue();

    resolveRecovery?.(false);
    await firstReload;

    expect(editor.isApplyingEditorState).toBeFalse();
  });

  it('reloads the newest canonical revision reported while recovery persistence is pending', async () => {
    let resolveRecovery: ((value: boolean) => void) | undefined;
    const persistRecovery = spyOn(editor, 'persistRecovery').and.returnValue(new Promise<boolean>(resolve => {
      resolveRecovery = resolve;
    }));
    const renderDocument = jasmine.createSpy('renderDocument').and.resolveTo(undefined);
    editor.editorComponent = {
      renderDocument,
      restoreRecoverySnapshot: jasmine.createSpy('restoreRecoverySnapshot').and.resolveTo(undefined),
    };
    const staleRemotePost = {
      ...createPost('https://images.example/stale-remote.webp'),
      revision: 1,
      title: 'Stale canonical revision',
    };
    const latestRemotePost = {
      ...staleRemotePost,
      revision: 2,
      title: 'Latest canonical revision',
    };
    editor.saveConflict.set(new BlogPostRevisionConflictError('package-post', 0, 1, staleRemotePost));

    const reload = editor.reloadRemotePost();
    await waitForSpy(persistRecovery);
    editor.saveConflict.set(new BlogPostRevisionConflictError('package-post', 0, 2, latestRemotePost));
    resolveRecovery?.(true);
    await reload;

    expect(editor.currentPost).toEqual(latestRemotePost);
    expect(editor.postForm.controls.title.value).toBe('Latest canonical revision');
    expect(editor.saveConflict()).toBeNull();
    expect(renderDocument).toHaveBeenCalledTimes(1);
    expect(router.navigate).toHaveBeenCalledWith(['/admin/cms', 'package-post', 'edit'], {
      replaceUrl: true,
      queryParamsHandling: 'preserve',
    });
    expect(toast.success).toHaveBeenCalledWith(
      'Reloaded the latest canonical revision. Your earlier local work remains available in Recovery.'
    );
  });

  it('automatically adopts revision 1 when the first save already completed', async () => {
    const remotePost = {...createPost('https://images.example/remote.webp'), revision: 1};
    const conflict = new BlogPostRevisionConflictError('package-post', 0, 1, remotePost);
    const persistRecovery = spyOn(editor, 'persistRecovery').and.resolveTo(true);
    savePost.and.rejectWith(conflict);
    fixture.detectChanges();
    const renderDocument = jasmine.createSpy('renderDocument').and.resolveTo(undefined);
    editor.editorComponent = {
      renderDocument,
      restoreRecoverySnapshot: jasmine.createSpy('restoreRecoverySnapshot').and.resolveTo(undefined),
    };

    const result = await editor.onSaved({
      data: {blocks: []},
      savedAt: '2026-08-24T20:00:00.000Z',
      blockCount: 0,
    });

    expect(result).toBeTrue();
    expect(persistRecovery).toHaveBeenCalledWith(true);
    expect(editor.currentPost).toEqual(remotePost);
    expect(editor.saveConflict()).toBeNull();
    expect(editor.recoveryPanelExpanded()).toBeTrue();
    expect(renderDocument).toHaveBeenCalledTimes(1);
    expect(router.navigate).toHaveBeenCalledWith(['/admin/cms', 'package-post', 'edit'], {
      replaceUrl: true,
      queryParamsHandling: 'preserve',
    });
    expect(toast.success).toHaveBeenCalledWith(
      'Your first save completed successfully. The editor adopted revision 1 and kept your earlier local work in Recovery.'
    );
  });

  it('keeps the first-save conflict open when Recovery cannot be stored before adoption', async () => {
    const remotePost = {...createPost('https://images.example/remote.webp'), revision: 1};
    const conflict = new BlogPostRevisionConflictError('package-post', 0, 1, remotePost);
    spyOn(editor, 'persistRecovery').and.resolveTo(false);
    savePost.and.rejectWith(conflict);
    fixture.detectChanges();

    const result = await editor.onSaved({
      data: {blocks: []},
      savedAt: '2026-08-24T20:00:00.000Z',
      blockCount: 0,
    });

    expect(result).toBeFalse();
    expect(editor.saveConflict()).toBe(conflict);
    expect(editor.recoveryPanelExpanded()).toBeTrue();
    expect(router.navigate).not.toHaveBeenCalled();
    expect(toast.error).toHaveBeenCalledWith(
      'Reload was cancelled because the latest local work could not be written to Recovery.'
    );
  });

  it('keeps revision 2 as a manual conflict instead of treating it as a completed first save', async () => {
    const remotePost = {...createPost('https://images.example/remote.webp'), revision: 2};
    const conflict = new BlogPostRevisionConflictError('package-post', 0, 2, remotePost);
    const persistRecovery = spyOn(editor, 'persistRecovery').and.resolveTo(true);
    savePost.and.rejectWith(conflict);
    fixture.detectChanges();

    const result = await editor.onSaved({
      data: {blocks: []},
      savedAt: '2026-08-24T20:00:00.000Z',
      blockCount: 0,
    });

    expect(result).toBeFalse();
    expect(editor.saveConflict()).toBe(conflict);
    expect(editor.recoveryPanelExpanded()).toBeTrue();
    expect(persistRecovery).not.toHaveBeenCalled();
    expect(router.navigate).not.toHaveBeenCalled();
    expect(toast.error).toHaveBeenCalledWith(conflict.message);
  });

  it('requires confirmation before creating a separate conflict recovery draft', async () => {
    const confirm = spyOn(window, 'confirm').and.returnValue(false);

    await editor.saveConflictAsCopy();

    expect(confirm).toHaveBeenCalledWith(
      'Create a separate recovery draft? The canonical post will remain unchanged and both drafts will need manual review. Choose Cancel and use the saved draft unless you intentionally need two versions.'
    );
    expect(savePost).not.toHaveBeenCalled();
  });

  it('does not apply a captured revision when the canonical post is deleted during recovery persistence', async () => {
    let resolveRecovery: ((value: boolean) => void) | undefined;
    const persistRecovery = spyOn(editor, 'persistRecovery').and.returnValue(new Promise<boolean>(resolve => {
      resolveRecovery = resolve;
    }));
    const renderDocument = jasmine.createSpy('renderDocument').and.resolveTo(undefined);
    editor.editorComponent = {
      renderDocument,
      restoreRecoverySnapshot: jasmine.createSpy('restoreRecoverySnapshot').and.resolveTo(undefined),
    };
    const staleRemotePost = {
      ...createPost('https://images.example/stale-remote.webp'),
      revision: 1,
      title: 'Stale canonical revision',
    };
    editor.saveConflict.set(new BlogPostRevisionConflictError('package-post', 0, 1, staleRemotePost));

    const reload = editor.reloadRemotePost();
    await waitForSpy(persistRecovery);
    const deletionConflict = new BlogPostRevisionConflictError('package-post', 0, null);
    editor.saveConflict.set(deletionConflict);
    resolveRecovery?.(true);
    await reload;

    expect(editor.currentPost).not.toEqual(staleRemotePost);
    expect(editor.saveConflict()).toBe(deletionConflict);
    expect(renderDocument).not.toHaveBeenCalled();
    expect(toast.error).toHaveBeenCalledWith(
      'Reload was cancelled because the canonical post was deleted while Recovery was being saved. Your local work remains available.'
    );
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

  it('unsubscribes an unfinished Editor.js image upload when the editor is destroyed', async () => {
    const upload = new Subject<BlogMediaUploadProgress>();
    uploadImage.and.returnValue(upload);

    const uploadPromise = editor.uploadEditorImage(new File(['image'], 'inline.webp', {type: 'image/webp'}));
    const rejection = expectAsync(uploadPromise).toBeRejected();
    await waitForSpy(uploadImage);
    expect(upload.observers.length).toBe(1);

    fixture.destroy();
    await rejection;

    expect(upload.observers.length).toBe(0);
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

describe('CmsPostEditorComponent canonical reload live snapshot', () => {
  let fixture: ComponentFixture<CmsPostEditorComponent>;
  let editor: TestablePostEditor;
  let postStream: Subject<BlogPost | undefined>;
  let toast: jasmine.SpyObj<Pick<CmsToastService, 'error' | 'success'>>;

  beforeEach(async () => {
    postStream = new Subject<BlogPost | undefined>();
    toast = jasmine.createSpyObj('CmsToastService', ['error', 'success']);
    const cachedPost = {
      ...createPost('https://images.example/cached.webp'),
      title: 'Cached canonical revision',
    };
    const initialPost = {
      ...createPost('https://images.example/initial.webp'),
      title: 'Initial canonical revision',
    };
    const blogRepository = {
      loading$: of(false),
      createNewPostTemplate: () => createPost('https://images.example/new.webp'),
      createUniqueSlug: (slug: string) => slug,
      getAdminPostBySlug: () => cachedPost,
      getAdminPostBySlug$: () => postStream.asObservable(),
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
              paramMap: convertToParamMap({slug: 'package-post'}),
              queryParamMap: convertToParamMap({}),
            },
          },
        },
        {provide: Router, useValue: jasmine.createSpyObj('Router', ['navigate'])},
        {provide: BlogRepositoryService, useValue: blogRepository},
        {provide: AuthorRepositoryService, useValue: {getAuthors$: () => of([])}},
        {provide: BlogAiAssistantService, useValue: {}},
        {provide: BlogAiFunctionsService, useValue: {}},
        {provide: BlogMediaUploadService, useValue: {}},
        {provide: CmsToastService, useValue: toast},
        {provide: CmsPostRecoveryService, useValue: recoveryService},
      ],
    })
      .overrideComponent(CmsPostEditorComponent, {set: {template: ''}})
      .compileComponents();

    fixture = TestBed.createComponent(CmsPostEditorComponent);
    editor = fixture.componentInstance as unknown as TestablePostEditor;
    fixture.detectChanges();
    postStream.next(initialPost);
    fixture.detectChanges();
    await waitForCondition(() => (
      editor.currentPost?.title === initialPost.title && !editor.isApplyingEditorState
    ));
  });

  it('treats an empty hydrated live snapshot as deletion before the effect updates the conflict', async () => {
    let resolveRecovery: ((value: boolean) => void) | undefined;
    const persistRecovery = spyOn(editor, 'persistRecovery').and.returnValue(new Promise<boolean>(resolve => {
      resolveRecovery = resolve;
    }));
    const staleRemotePost = {
      ...createPost('https://images.example/stale-remote.webp'),
      revision: 1,
      title: 'Stale canonical revision',
    };
    editor.saveConflict.set(new BlogPostRevisionConflictError('package-post', 0, 1, staleRemotePost));

    const reload = editor.reloadRemotePost();
    await waitForSpy(persistRecovery);
    postStream.next(undefined);

    expect(editor.saveConflict()?.actualRevision).toBe(1);

    resolveRecovery?.(true);
    await reload;

    expect(editor.currentPost).not.toEqual(staleRemotePost);
    expect(editor.saveConflict()?.actualRevision).toBeNull();
    expect(toast.error).toHaveBeenCalledWith(
      'Reload was cancelled because the canonical post was deleted while Recovery was being saved. Your local work remains available.'
    );
  });
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

function createStoredThumbnail(): BlogStoredThumbnail {
  return {
    generatedAt: '2026-08-22T00:00:00.000Z',
    source: 'backend',
    prompt: 'A production-ready thumbnail',
    altText: 'A production-ready thumbnail',
    style: 'editorial',
    contentType: 'image/webp',
    storagePath: 'blog-media/package/thumbnail.webp',
    downloadUrl: 'https://images.example/thumbnail.webp',
    model: 'test-model',
  };
}

function createRecoverySnapshot(): CmsPostRecoverySnapshot {
  const post = createPost('https://images.example/recovery.webp');

  return {
    schemaVersion: 1,
    ownerUid: 'owner-1',
    postId: post.id,
    postSlug: post.slug,
    isNewPost: true,
    baseRevision: 0,
    baseUpdatedAt: post.updatedAt,
    savedAt: '2026-08-22T00:00:00.000Z',
    expiresAt: '2026-09-21T00:00:00.000Z',
    contentHash: 'fnv1a-test',
    form: {
      authorId: post.authorId ?? 'colin-michaels',
      title: 'Recovered local post',
      slug: post.slug,
      excerpt: post.excerpt,
      coverImage: post.coverImage,
      backgroundImage: '',
      featured: post.featured ?? false,
      catCornerEnabled: false,
      catCornerDiscoveryPost: false,
      status: post.status,
      publishedAt: '',
      categories: post.categories.join(', '),
      tags: post.tags.join(', '),
      seoTitle: post.seo.title,
      seoDescription: post.seo.description,
      canonical: '',
      openGraphImage: '',
    },
    editor: {mode: 'visual', document: {blocks: []}},
    socialPromotion: {announcements: []},
  };
}

async function waitForSpy(spy: jasmine.Spy): Promise<void> {
  for (let attempt = 0; attempt < 20 && !spy.calls.any(); attempt += 1) {
    await Promise.resolve();
  }

  expect(spy).toHaveBeenCalled();
}

async function waitForCondition(condition: () => boolean): Promise<void> {
  for (let attempt = 0; attempt < 20 && !condition(); attempt += 1) {
    await Promise.resolve();
  }

  expect(condition()).toBeTrue();
}
