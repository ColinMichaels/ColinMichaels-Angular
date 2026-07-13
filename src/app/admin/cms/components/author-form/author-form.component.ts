import {ChangeDetectionStrategy, Component, EventEmitter, Input, OnChanges, Output, SimpleChanges, inject} from '@angular/core';
import {FormControl, FormGroup, ReactiveFormsModule, Validators} from '@angular/forms';

import {createAuthorSlug} from '../../../../features/authors/authors.constants';
import {AuthorProfile, AuthorStatus} from '../../../../features/authors/models/author.model';
import {AuthorRepositoryService} from '../../../../features/authors/services/author-repository.service';
import {BlogMediaUploaderComponent} from '../media-uploader/blog-media-uploader.component';

interface AuthorForm {
  name: FormControl<string>;
  slug: FormControl<string>;
  title: FormControl<string>;
  location: FormControl<string>;
  shortBio: FormControl<string>;
  bio: FormControl<string>;
  avatarUrl: FormControl<string>;
  imageAlt: FormControl<string>;
  externalProfiles: FormControl<string>;
  healthDisclaimer: FormControl<string>;
  status: FormControl<AuthorStatus>;
}

@Component({
  selector: 'app-cms-author-form',
  imports: [ReactiveFormsModule, BlogMediaUploaderComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <form [formGroup]="form" class="grid gap-4" (ngSubmit)="save()">
      <div class="grid gap-3 md:grid-cols-2">
        <label class="space-y-1.5">
          <span class="site-meta">Name</span>
          <input formControlName="name" class="site-input" (input)="syncSlug()">
        </label>
        <label class="space-y-1.5">
          <span class="site-meta">Slug</span>
          <input formControlName="slug" class="site-input" (blur)="normalizeSlug()">
        </label>
        <label class="space-y-1.5">
          <span class="site-meta">Title</span>
          <input formControlName="title" class="site-input">
        </label>
        <label class="space-y-1.5">
          <span class="site-meta">Location</span>
          <input formControlName="location" class="site-input">
        </label>
      </div>

      <label class="space-y-1.5">
        <span class="site-meta">Short bio</span>
        <textarea formControlName="shortBio" rows="3" class="site-input"></textarea>
      </label>
      <label class="space-y-1.5">
        <span class="site-meta">Full bio</span>
        <textarea formControlName="bio" rows="7" class="site-input" placeholder="Separate paragraphs with a blank line."></textarea>
      </label>

      <div class="grid gap-3">
        <app-blog-media-uploader
          formControlName="avatarUrl"
          label="Author Avatar"
          description="Choose an existing Media Library image or upload a new portrait to Firebase Storage. Square images work best."
          buttonLabel="Choose Avatar"
          placeholder="Select or upload an author portrait"
          [previewAlt]="form.controls.imageAlt.value || 'Author avatar preview'"
          [postSlug]="form.controls.slug.value || author.id"
          assetRole="author-avatar"
          [optimizationMaxWidth]="1200"
          [optimizationMaxHeight]="1200"
          [optimizationQuality]="0.86"
        ></app-blog-media-uploader>
        <label class="space-y-1.5">
          <span class="site-meta">Image alt text</span>
          <input formControlName="imageAlt" class="site-input">
        </label>
      </div>

      <label class="space-y-1.5">
        <span class="site-meta">External profiles</span>
        <textarea formControlName="externalProfiles" rows="3" class="site-input" placeholder="GitHub | https://github.com/example"></textarea>
        <span class="block text-xs text-zinc-500">One profile per line using Label | URL.</span>
      </label>
      <label class="space-y-1.5">
        <span class="site-meta">Health disclaimer</span>
        <textarea formControlName="healthDisclaimer" rows="2" class="site-input"></textarea>
      </label>

      <div class="flex flex-wrap items-end justify-between gap-3">
        <label class="space-y-1.5">
          <span class="site-meta">Status</span>
          <select formControlName="status" class="site-input min-w-40">
            <option value="draft">Draft</option>
            <option value="published">Published</option>
          </select>
        </label>
        <div class="flex gap-2">
          <button type="button" class="border border-zinc-700 px-4 py-2 text-sm text-zinc-300 hover:bg-zinc-800" (click)="cancelled.emit()">Cancel</button>
          <button type="submit" class="border border-cyan-400 bg-cyan-400 px-4 py-2 text-sm font-semibold text-zinc-950 disabled:opacity-50" [disabled]="form.invalid || saving">
            {{ saving ? 'Saving…' : 'Save author' }}
          </button>
        </div>
      </div>
      @if (error) {
        <p class="border border-red-500/40 bg-red-950/30 px-3 py-2 text-sm text-red-200" role="alert">{{ error }}</p>
      }
    </form>
  `,
})
export class CmsAuthorFormComponent implements OnChanges {
  private readonly repository = inject(AuthorRepositoryService);
  @Input({required: true}) author!: AuthorProfile;
  @Output() authorSaved = new EventEmitter<AuthorProfile>();
  @Output() cancelled = new EventEmitter<void>();

  protected saving = false;
  protected error = '';
  protected readonly form = new FormGroup<AuthorForm>({
    name: new FormControl('', {nonNullable: true, validators: [Validators.required]}),
    slug: new FormControl('', {nonNullable: true, validators: [Validators.required]}),
    title: new FormControl('', {nonNullable: true}),
    location: new FormControl('', {nonNullable: true}),
    shortBio: new FormControl('', {nonNullable: true, validators: [Validators.required]}),
    bio: new FormControl('', {nonNullable: true}),
    avatarUrl: new FormControl('', {nonNullable: true}),
    imageAlt: new FormControl('', {nonNullable: true}),
    externalProfiles: new FormControl('', {nonNullable: true}),
    healthDisclaimer: new FormControl('', {nonNullable: true}),
    status: new FormControl<AuthorStatus>('draft', {nonNullable: true}),
  });

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['author'] && this.author) {
      this.form.setValue({
        name: this.author.name,
        slug: this.author.slug,
        title: this.author.title,
        location: this.author.location ?? '',
        shortBio: this.author.shortBio,
        bio: this.author.bio,
        avatarUrl: this.author.avatarUrl,
        imageAlt: this.author.imageAlt,
        externalProfiles: this.author.externalProfiles.map(profile => `${profile.label} | ${profile.url}`).join('\n'),
        healthDisclaimer: this.author.healthDisclaimer ?? '',
        status: this.author.status,
      });
      this.form.markAsPristine();
      this.error = '';
    }
  }

  protected syncSlug(): void {
    if (!this.form.controls.slug.dirty) {
      this.form.controls.slug.setValue(createAuthorSlug(this.form.controls.name.value));
    }
  }

  protected normalizeSlug(): void {
    this.form.controls.slug.setValue(createAuthorSlug(this.form.controls.slug.value || this.form.controls.name.value));
  }

  protected async save(): Promise<void> {
    this.form.markAllAsTouched();
    if (this.form.invalid || this.saving) return;

    this.saving = true;
    this.error = '';
    const value = this.form.getRawValue();
    try {
      const saved = await this.repository.saveAuthor({
        ...this.author,
        ...value,
        externalProfiles: value.externalProfiles.split('\n').map(line => {
          const [label, ...urlParts] = line.split('|');
          return {label: label?.trim() ?? '', url: urlParts.join('|').trim()};
        }),
      });
      this.authorSaved.emit(saved);
    } catch (error) {
      this.error = error instanceof Error ? error.message : 'Unable to save author.';
    } finally {
      this.saving = false;
    }
  }
}
