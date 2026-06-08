import {JsonPipe} from '@angular/common';
import {Component, ViewChild, inject} from '@angular/core';
import {FormControl, FormGroup, ReactiveFormsModule, Validators} from '@angular/forms';
import {ActivatedRoute, Router, RouterLink} from '@angular/router';

import {BlogPost, BlogPostStatus} from '../../../../features/blog/models/blog-post.model';
import {BlogRepositoryService, createBlogSlug} from '../../../../features/blog/services/blog-repository.service';
import {EditorJsComponent} from '../../components/editor-js/editor-js.component';
import {
  BlogAssistantContext,
  BlogAssistantResult,
  BlogMetadataSuggestion,
  BlogStoredThumbnail,
  BlogThumbnailSuggestion,
} from '../../models/blog-ai-assistant.model';
import {EditorSavedDocument} from '../../models/editor-document.model';
import {BlogAiAssistantService} from '../../services/blog-ai-assistant.service';
import {BlogAiFunctionsService} from '../../services/blog-ai-functions.service';
import {createBlogBlocksFromEditorDocument, createEditorDocument} from '../../utils/blog-editorjs-adapter';

interface PostEditorForm {
  title: FormControl<string>;
  slug: FormControl<string>;
  excerpt: FormControl<string>;
  coverImage: FormControl<string>;
  status: FormControl<BlogPostStatus>;
  categories: FormControl<string>;
  tags: FormControl<string>;
  seoTitle: FormControl<string>;
  seoDescription: FormControl<string>;
  canonical: FormControl<string>;
  openGraphImage: FormControl<string>;
}

const DEFAULT_COVER_IMAGE = '/assets/images/backgrounds/night.webp';
const statusOptions: readonly BlogPostStatus[] = ['draft', 'scheduled', 'published', 'archived'];

function toCsv(values: readonly string[]): string {
  return values.join(', ');
}

function fromCsv(value: string): readonly string[] {
  return [...new Set(
    value
      .split(',')
      .map(item => item.trim())
      .filter(item => item.length > 0)
  )];
}

function requiredText(value: string, fallback: string): string {
  const trimmedValue = value.trim();
  return trimmedValue || fallback;
}

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'Unknown error';
}

@Component({
  selector: 'app-cms-post-editor',
  imports: [
    JsonPipe,
    ReactiveFormsModule,
    RouterLink,
    EditorJsComponent,
  ],
  template: `
    <main class="min-h-screen bg-zinc-950 px-5 py-10 text-zinc-100 sm:px-8 lg:px-12">
      <section class="mx-auto max-w-6xl space-y-8">
        <nav class="flex items-center justify-between text-sm text-zinc-400">
          <a routerLink="/admin/cms" class="hover:text-zinc-100">Posts</a>
          <a routerLink="/blog" class="hover:text-zinc-100">Blog</a>
        </nav>

        @if (currentPost; as post) {
          <header class="space-y-3 border-b border-zinc-800 pb-8">
            <p class="text-sm uppercase tracking-[0.3em] text-cyan-300">{{ isNewPost ? 'New Post' : 'CMS Editor' }}</p>
            <h1 class="text-4xl font-semibold text-zinc-50">{{ editorTitle }}</h1>
            <p class="max-w-2xl text-zinc-400">{{ editorExcerpt || 'Create metadata, write blocks, then save the post into local CMS storage.' }}</p>
          </header>

          <section class="grid gap-8 xl:grid-cols-[minmax(0,1fr)_360px]">
            <section class="space-y-8">
              <form [formGroup]="postForm" class="grid gap-5 border border-zinc-800 bg-zinc-900/70 p-5 md:grid-cols-2">
                <label class="space-y-2 md:col-span-2">
                  <span class="text-sm font-medium text-zinc-200">Title</span>
                  <input
                    type="text"
                    formControlName="title"
                    class="w-full border border-zinc-700 bg-zinc-950 px-3 py-2 text-zinc-100 outline-none focus:border-cyan-300"
                    (input)="syncSlugFromTitle()"
                  >
                </label>

                <label class="space-y-2">
                  <span class="text-sm font-medium text-zinc-200">Slug</span>
                  <input
                    type="text"
                    formControlName="slug"
                    class="w-full border border-zinc-700 bg-zinc-950 px-3 py-2 text-zinc-100 outline-none focus:border-cyan-300"
                    (blur)="normalizeSlug()"
                  >
                </label>

                <label class="space-y-2">
                  <span class="text-sm font-medium text-zinc-200">Status</span>
                  <select
                    formControlName="status"
                    class="w-full border border-zinc-700 bg-zinc-950 px-3 py-2 text-zinc-100 outline-none focus:border-cyan-300"
                  >
                    @for (status of statuses; track status) {
                      <option [value]="status">{{ status }}</option>
                    }
                  </select>
                </label>

                <label class="space-y-2 md:col-span-2">
                  <span class="text-sm font-medium text-zinc-200">Excerpt</span>
                  <textarea
                    formControlName="excerpt"
                    rows="3"
                    class="w-full border border-zinc-700 bg-zinc-950 px-3 py-2 text-zinc-100 outline-none focus:border-cyan-300"
                  ></textarea>
                </label>

                <label class="space-y-2 md:col-span-2">
                  <span class="text-sm font-medium text-zinc-200">Cover Image URL</span>
                  <input
                    type="text"
                    formControlName="coverImage"
                    class="w-full border border-zinc-700 bg-zinc-950 px-3 py-2 text-zinc-100 outline-none focus:border-cyan-300"
                  >
                </label>

                <label class="space-y-2">
                  <span class="text-sm font-medium text-zinc-200">Categories</span>
                  <input
                    type="text"
                    formControlName="categories"
                    placeholder="CMS, Angular"
                    class="w-full border border-zinc-700 bg-zinc-950 px-3 py-2 text-zinc-100 outline-none focus:border-cyan-300"
                  >
                </label>

                <label class="space-y-2">
                  <span class="text-sm font-medium text-zinc-200">Tags</span>
                  <input
                    type="text"
                    formControlName="tags"
                    placeholder="Editor.js, Drafts"
                    class="w-full border border-zinc-700 bg-zinc-950 px-3 py-2 text-zinc-100 outline-none focus:border-cyan-300"
                  >
                </label>

                <label class="space-y-2 md:col-span-2">
                  <span class="text-sm font-medium text-zinc-200">SEO Title</span>
                  <input
                    type="text"
                    formControlName="seoTitle"
                    class="w-full border border-zinc-700 bg-zinc-950 px-3 py-2 text-zinc-100 outline-none focus:border-cyan-300"
                  >
                </label>

                <label class="space-y-2 md:col-span-2">
                  <span class="text-sm font-medium text-zinc-200">SEO Description</span>
                  <textarea
                    formControlName="seoDescription"
                    rows="2"
                    class="w-full border border-zinc-700 bg-zinc-950 px-3 py-2 text-zinc-100 outline-none focus:border-cyan-300"
                  ></textarea>
                </label>

                <label class="space-y-2">
                  <span class="text-sm font-medium text-zinc-200">Canonical URL</span>
                  <input
                    type="url"
                    formControlName="canonical"
                    class="w-full border border-zinc-700 bg-zinc-950 px-3 py-2 text-zinc-100 outline-none focus:border-cyan-300"
                  >
                </label>

                <label class="space-y-2">
                  <span class="text-sm font-medium text-zinc-200">Open Graph Image</span>
                  <input
                    type="text"
                    formControlName="openGraphImage"
                    class="w-full border border-zinc-700 bg-zinc-950 px-3 py-2 text-zinc-100 outline-none focus:border-cyan-300"
                  >
                </label>
              </form>

              @if (saveError) {
                <p class="border border-red-500/50 bg-red-950/40 px-4 py-3 text-sm text-red-200">{{ saveError }}</p>
              }

              @if (saveMessage) {
                <p class="border border-emerald-500/50 bg-emerald-950/30 px-4 py-3 text-sm text-emerald-200">{{ saveMessage }}</p>
              }

              <app-editor-js
                [title]="editorTitle"
                [saveLabel]="'Save Post'"
                [initialData]="initialData"
                (saved)="onSaved($event)"
              ></app-editor-js>
            </section>

            <aside class="space-y-5 border-t border-zinc-800 pt-6 xl:border-l xl:border-t-0 xl:pl-6 xl:pt-0">
              <section class="space-y-3">
                <h2 class="text-lg font-semibold text-zinc-50">Post State</h2>
                <dl class="space-y-3 text-sm">
                  <div class="flex justify-between gap-4">
                    <dt class="text-zinc-500">Status</dt>
                    <dd class="text-zinc-200">{{ postForm.controls.status.value }}</dd>
                  </div>
                  <div class="flex justify-between gap-4">
                    <dt class="text-zinc-500">Slug</dt>
                    <dd class="text-right text-zinc-200">{{ postForm.controls.slug.value }}</dd>
                  </div>
                  <div class="flex justify-between gap-4">
                    <dt class="text-zinc-500">Format</dt>
                    <dd class="text-zinc-200">{{ post.contentFormat }}</dd>
                  </div>
                  <div class="flex justify-between gap-4">
                    <dt class="text-zinc-500">Storage</dt>
                    <dd class="text-zinc-200">local browser</dd>
                  </div>
                </dl>
              </section>

              <section class="space-y-4 border-t border-zinc-800 pt-5">
                <div class="space-y-2">
                  <div class="flex items-center justify-between gap-3">
                    <h2 class="text-lg font-semibold text-zinc-50">AI Writing Assistant</h2>
                    <span
                      class="border border-amber-500/50 px-2 py-1 text-[0.65rem] uppercase tracking-[0.2em] text-amber-200">
                      {{ assistantSourceLabel }}
                    </span>
                  </div>
                  <p class="text-sm text-zinc-400">
                    Suggests titles, descriptions, categories, tags, and thumbnail prompts from the current draft.
                  </p>
                </div>

                <button
                  type="button"
                  class="w-full border border-cyan-400 px-4 py-2 text-sm font-medium text-cyan-200 hover:bg-cyan-400 hover:text-zinc-950 disabled:cursor-not-allowed disabled:border-zinc-700 disabled:text-zinc-600"
                  [disabled]="isAssistantLoading"
                  (click)="generateAssistantSuggestions()"
                >
                  {{ isAssistantLoading ? 'Generating Suggestions' : 'Suggest Metadata' }}
                </button>

                @if (assistantError) {
                  <p
                    class="border border-red-500/50 bg-red-950/40 px-3 py-2 text-sm text-red-200">{{ assistantError }}</p>
                }

                @if (assistantMessage) {
                  <p
                    class="border border-emerald-500/50 bg-emerald-950/30 px-3 py-2 text-sm text-emerald-200">{{ assistantMessage }}</p>
                }

                @if (assistantResult; as result) {
                  <div class="space-y-4">
                    @for (suggestion of result.suggestions; track suggestion.id) {
                      <article class="space-y-3 border border-zinc-800 bg-zinc-900/70 p-4">
                        <div class="space-y-2">
                          <h3 class="text-base font-semibold text-zinc-50">{{ suggestion.title }}</h3>
                          <p class="text-sm leading-6 text-zinc-400">{{ suggestion.description }}</p>
                          <p class="text-xs text-zinc-500">{{ suggestion.rationale }}</p>
                        </div>

                        <div class="space-y-2 text-xs text-zinc-400">
                          <p><span class="text-zinc-500">Categories:</span> {{ suggestion.categories.join(', ') }}</p>
                          <p><span class="text-zinc-500">Tags:</span> {{ suggestion.tags.join(', ') }}</p>
                        </div>

                        <div class="grid grid-cols-2 gap-2">
                          <button
                            type="button"
                            class="border border-cyan-500/70 px-3 py-2 text-xs font-medium text-cyan-200 hover:bg-cyan-400 hover:text-zinc-950"
                            (click)="applySuggestion(suggestion)"
                          >
                            Apply All
                          </button>
                          <button
                            type="button"
                            class="border border-zinc-700 px-3 py-2 text-xs text-zinc-200 hover:bg-zinc-800"
                            (click)="applyTitleSuggestion(suggestion)"
                          >
                            Use Title
                          </button>
                          <button
                            type="button"
                            class="border border-zinc-700 px-3 py-2 text-xs text-zinc-200 hover:bg-zinc-800"
                            (click)="applyDescriptionSuggestion(suggestion)"
                          >
                            Use Description
                          </button>
                          <button
                            type="button"
                            class="border border-zinc-700 px-3 py-2 text-xs text-zinc-200 hover:bg-zinc-800"
                            (click)="applyTaxonomySuggestion(suggestion)"
                          >
                            Use Taxonomy
                          </button>
                        </div>
                      </article>
                    }

                    <section class="space-y-3 border border-dashed border-zinc-700 bg-black/30 p-4">
                      <div>
                        <h3 class="text-sm font-semibold uppercase tracking-[0.2em] text-zinc-300">Thumbnail Generator
                          Prep</h3>
                        <p class="mt-2 text-xs leading-5 text-zinc-500">
                          These prompts are ready for a future server-backed image generation endpoint.
                        </p>
                      </div>

                      @for (thumbnail of result.thumbnailSuggestions; track thumbnail.id) {
                        <article class="space-y-2 border-t border-zinc-800 pt-3">
                          <p class="text-xs font-medium uppercase tracking-wide text-cyan-300">{{ thumbnail.style }}</p>
                          <p class="text-sm leading-6 text-zinc-300">{{ thumbnail.prompt }}</p>
                          <p class="text-xs text-zinc-500">Alt text: {{ thumbnail.altText }}</p>
                          <button
                            type="button"
                            class="border border-cyan-500/70 px-3 py-2 text-xs font-medium text-cyan-200 hover:bg-cyan-400 hover:text-zinc-950 disabled:cursor-not-allowed disabled:border-zinc-700 disabled:text-zinc-600"
                            [disabled]="isThumbnailLoading === thumbnail.id"
                            (click)="generateAndStoreThumbnail(thumbnail)"
                          >
                            {{ isThumbnailLoading === thumbnail.id ? 'Generating Image' : 'Generate & Store' }}
                          </button>
                        </article>
                      }

                      @if (thumbnailError) {
                        <p
                          class="border border-red-500/50 bg-red-950/40 px-3 py-2 text-sm text-red-200">{{ thumbnailError }}</p>
                      }

                      @if (lastGeneratedThumbnail; as storedThumbnail) {
                        <div
                          class="space-y-2 border border-emerald-500/40 bg-emerald-950/20 p-3 text-xs text-emerald-100">
                          <p class="font-medium">Stored thumbnail and applied it to Cover Image and Open Graph
                            Image.</p>
                          <a [href]="storedThumbnail.downloadUrl" target="_blank" rel="noopener noreferrer"
                             class="break-all text-cyan-200 hover:text-cyan-100">
                            {{ storedThumbnail.storagePath }}
                          </a>
                        </div>
                      }
                    </section>
                  </div>
                }
              </section>

              @if (lastSaved; as saved) {
                <section class="space-y-3 border-t border-zinc-800 pt-5">
                  <h2 class="text-lg font-semibold text-zinc-50">Last Saved</h2>
                  <p class="text-sm text-zinc-400">{{ saved.blockCount }} blocks at {{ saved.savedAt }}</p>
                  <pre class="max-h-[420px] overflow-auto bg-black p-4 text-xs leading-5 text-cyan-100">{{ saved.data | json }}</pre>
                </section>
              } @else {
                <section class="border-t border-zinc-800 pt-5 text-sm text-zinc-500">
                  Saved post JSON will appear here after the first save.
                </section>
              }
            </aside>
          </section>
        } @else {
          <section class="border border-zinc-800 bg-zinc-900 p-6">
            <h1 class="text-2xl font-semibold text-zinc-50">Post not found</h1>
            <p class="mt-2 text-zinc-400">This post is unavailable in the CMS repository.</p>
            <a routerLink="/admin/cms" class="mt-5 inline-block text-cyan-300 hover:text-cyan-200">Back to posts</a>
          </section>
        }
      </section>
    </main>
  `,
})
export class CmsPostEditorComponent {
  @ViewChild(EditorJsComponent) private editorComponent?: EditorJsComponent;

  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly blogRepository = inject(BlogRepositoryService);
  private readonly blogAssistant = inject(BlogAiAssistantService);
  private readonly blogAiFunctions = inject(BlogAiFunctionsService);
  private readonly slug = this.route.snapshot.paramMap.get('slug');
  private hasCreatedPost = false;

  protected readonly isNewPost = !this.slug;
  protected readonly statuses = statusOptions;
  protected currentPost = this.resolvePost();
  protected readonly initialData = this.currentPost ? createEditorDocument(this.currentPost) : {blocks: []};
  protected readonly postForm = this.createForm(this.currentPost ?? this.blogRepository.createNewPostTemplate());
  protected lastSaved: EditorSavedDocument | null = null;
  protected saveMessage = '';
  protected saveError = '';
  protected assistantResult: BlogAssistantResult | null = null;
  protected assistantMessage = '';
  protected assistantError = '';
  protected isAssistantLoading = false;
  protected isThumbnailLoading: string | null = null;
  protected thumbnailError = '';
  protected lastGeneratedThumbnail: BlogStoredThumbnail | null = null;

  protected get editorTitle(): string {
    return requiredText(this.postForm.controls.title.value, 'Untitled Post');
  }

  protected get editorExcerpt(): string {
    return this.postForm.controls.excerpt.value.trim();
  }

  protected get assistantSourceLabel(): string {
    if (!this.assistantResult) {
      return 'Backend';
    }

    return this.assistantResult.source === 'backend' ? 'Backend' : 'Local fallback';
  }

  protected syncSlugFromTitle(): void {
    const slugControl = this.postForm.controls.slug;

    if (!this.isNewPost || slugControl.dirty) {
      return;
    }

    slugControl.setValue(createBlogSlug(this.postForm.controls.title.value), {emitEvent: false});
  }

  protected normalizeSlug(): void {
    const postId = this.currentPost?.id;
    const slug = this.blogRepository.createUniqueSlug(
      this.postForm.controls.slug.value || this.postForm.controls.title.value,
      postId
    );

    this.postForm.controls.slug.setValue(slug, {emitEvent: false});
  }

  protected async generateAssistantSuggestions(): Promise<void> {
    this.assistantError = '';
    this.assistantMessage = '';
    this.isAssistantLoading = true;

    try {
      const context = await this.createAssistantContext();

      try {
        this.assistantResult = await this.blogAiFunctions.generateMetadata(context);
        this.assistantMessage = 'Generated AI metadata and thumbnail prompts with Firebase Functions.';
      } catch (backendError) {
        this.assistantResult = this.blogAssistant.createSuggestions(context);
        this.assistantMessage = `Generated local fallback suggestions because the backend was unavailable: ${getErrorMessage(backendError)}`;
      }
    } catch (error) {
      this.assistantError = error instanceof Error ? error.message : 'Unable to generate writing suggestions.';
    } finally {
      this.isAssistantLoading = false;
    }
  }

  protected async generateAndStoreThumbnail(thumbnail: BlogThumbnailSuggestion): Promise<void> {
    this.thumbnailError = '';
    this.lastGeneratedThumbnail = null;

    if (!this.currentPost) {
      this.thumbnailError = 'Unable to generate a thumbnail because the source post is missing.';
      return;
    }

    this.isThumbnailLoading = thumbnail.id;

    try {
      const storedThumbnail = await this.blogAiFunctions.generateAndStoreThumbnail({
        prompt: thumbnail.prompt,
        altText: thumbnail.altText,
        style: thumbnail.style,
        postId: this.currentPost.id,
        slug: this.postForm.controls.slug.value || this.currentPost.slug,
      });

      this.postForm.controls.coverImage.setValue(storedThumbnail.downloadUrl);
      this.postForm.controls.openGraphImage.setValue(storedThumbnail.downloadUrl);
      this.postForm.markAsDirty();
      this.lastGeneratedThumbnail = storedThumbnail;
      this.assistantMessage = 'Generated and stored a thumbnail in Firebase Storage.';
    } catch (error) {
      this.thumbnailError = `Unable to generate and store the thumbnail: ${getErrorMessage(error)}`;
    } finally {
      this.isThumbnailLoading = null;
    }
  }

  protected applySuggestion(suggestion: BlogMetadataSuggestion): void {
    this.applyTitleSuggestion(suggestion, false);
    this.applyDescriptionSuggestion(suggestion, false);
    this.applyTaxonomySuggestion(suggestion, false);
    this.postForm.controls.seoTitle.setValue(suggestion.seoTitle);
    this.postForm.controls.seoDescription.setValue(suggestion.seoDescription);
    this.assistantMessage = 'Applied the full writing assistant suggestion.';
    this.postForm.markAsDirty();
  }

  protected applyTitleSuggestion(suggestion: BlogMetadataSuggestion, showMessage = true): void {
    this.postForm.controls.title.setValue(suggestion.title);
    this.postForm.controls.seoTitle.setValue(suggestion.seoTitle);

    if (this.isNewPost && !this.postForm.controls.slug.dirty) {
      this.postForm.controls.slug.setValue(createBlogSlug(suggestion.title));
    }

    if (showMessage) {
      this.assistantMessage = 'Applied the suggested title and SEO title.';
    }

    this.postForm.markAsDirty();
  }

  protected applyDescriptionSuggestion(suggestion: BlogMetadataSuggestion, showMessage = true): void {
    this.postForm.controls.excerpt.setValue(suggestion.description);
    this.postForm.controls.seoDescription.setValue(suggestion.seoDescription);

    if (showMessage) {
      this.assistantMessage = 'Applied the suggested excerpt and SEO description.';
    }

    this.postForm.markAsDirty();
  }

  protected applyTaxonomySuggestion(suggestion: BlogMetadataSuggestion, showMessage = true): void {
    this.postForm.controls.categories.setValue(toCsv(suggestion.categories));
    this.postForm.controls.tags.setValue(toCsv(suggestion.tags));

    if (showMessage) {
      this.assistantMessage = 'Applied the suggested categories and tags.';
    }

    this.postForm.markAsDirty();
  }

  protected onSaved(saved: EditorSavedDocument): void {
    this.saveError = '';
    this.saveMessage = '';
    this.postForm.markAllAsTouched();

    if (!this.currentPost) {
      this.saveError = 'Unable to save because the source post is missing.';
      return;
    }

    if (this.postForm.invalid) {
      this.saveError = 'Title, slug, excerpt, and cover image are required before saving.';
      return;
    }

    const formValue = this.postForm.getRawValue();
    const coverImage = requiredText(formValue.coverImage, DEFAULT_COVER_IMAGE);
    const savedPost = this.blogRepository.savePost({
      ...this.currentPost,
      title: requiredText(formValue.title, 'Untitled Post'),
      slug: this.blogRepository.createUniqueSlug(formValue.slug || formValue.title, this.currentPost.id),
      excerpt: formValue.excerpt.trim(),
      coverImage,
      status: formValue.status,
      categories: fromCsv(formValue.categories),
      tags: fromCsv(formValue.tags),
      seo: {
        title: requiredText(formValue.seoTitle, formValue.title),
        description: requiredText(formValue.seoDescription, formValue.excerpt),
        canonical: formValue.canonical.trim() || undefined,
        openGraphImage: formValue.openGraphImage.trim() || coverImage,
      },
      blocks: createBlogBlocksFromEditorDocument(saved.data),
      updatedAt: saved.savedAt,
      publishedAt: this.getPublishedAt(formValue.status, this.currentPost.publishedAt, saved.savedAt),
    });

    this.currentPost = savedPost;
    this.postForm.controls.slug.setValue(savedPost.slug, {emitEvent: false});
    this.lastSaved = saved;
    this.saveMessage = `Saved ${savedPost.title} to local CMS storage.`;

    if (this.isNewPost && !this.hasCreatedPost) {
      this.hasCreatedPost = true;
      void this.router.navigate(['/admin/cms', savedPost.slug, 'edit'], {replaceUrl: true});
    }
  }

  private resolvePost(): BlogPost | undefined {
    return this.slug
      ? this.blogRepository.getAdminPostBySlug(this.slug)
      : this.blogRepository.createNewPostTemplate();
  }

  private async createAssistantContext(): Promise<BlogAssistantContext> {
    const document = await this.editorComponent?.getDocument() ?? this.initialData;
    const formValue = this.postForm.getRawValue();

    return {
      title: formValue.title,
      excerpt: formValue.excerpt,
      seoTitle: formValue.seoTitle,
      seoDescription: formValue.seoDescription,
      categories: fromCsv(formValue.categories),
      tags: fromCsv(formValue.tags),
      blocks: createBlogBlocksFromEditorDocument(document),
    };
  }

  private createForm(post: BlogPost): FormGroup<PostEditorForm> {
    return new FormGroup<PostEditorForm>({
      title: new FormControl(post.title, {nonNullable: true, validators: [Validators.required]}),
      slug: new FormControl(post.slug, {nonNullable: true, validators: [Validators.required]}),
      excerpt: new FormControl(post.excerpt, {nonNullable: true, validators: [Validators.required]}),
      coverImage: new FormControl(post.coverImage, {nonNullable: true, validators: [Validators.required]}),
      status: new FormControl(post.status, {nonNullable: true, validators: [Validators.required]}),
      categories: new FormControl(toCsv(post.categories), {nonNullable: true}),
      tags: new FormControl(toCsv(post.tags), {nonNullable: true}),
      seoTitle: new FormControl(post.seo.title, {nonNullable: true}),
      seoDescription: new FormControl(post.seo.description, {nonNullable: true}),
      canonical: new FormControl(post.seo.canonical ?? '', {nonNullable: true}),
      openGraphImage: new FormControl(post.seo.openGraphImage ?? post.coverImage, {nonNullable: true}),
    });
  }

  private getPublishedAt(status: BlogPostStatus, currentValue: string | null, savedAt: string): string | null {
    return status === 'published' ? currentValue ?? savedAt : null;
  }
}
