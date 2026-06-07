import {JsonPipe} from '@angular/common';
import {Component, inject} from '@angular/core';
import {FormControl, FormGroup, ReactiveFormsModule, Validators} from '@angular/forms';
import {ActivatedRoute, Router, RouterLink} from '@angular/router';

import {BlogPost, BlogPostStatus} from '../../../../features/blog/models/blog-post.model';
import {BlogRepositoryService, createBlogSlug} from '../../../../features/blog/services/blog-repository.service';
import {EditorJsComponent} from '../../components/editor-js/editor-js.component';
import {EditorSavedDocument} from '../../models/editor-document.model';
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
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly blogRepository = inject(BlogRepositoryService);
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

  protected get editorTitle(): string {
    return requiredText(this.postForm.controls.title.value, 'Untitled Post');
  }

  protected get editorExcerpt(): string {
    return this.postForm.controls.excerpt.value.trim();
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
