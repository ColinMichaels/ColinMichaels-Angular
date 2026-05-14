import {JsonPipe} from '@angular/common';
import {Component, inject} from '@angular/core';
import {ActivatedRoute, RouterLink} from '@angular/router';

import {BlogRepositoryService} from '../../../../features/blog/services/blog-repository.service';
import {EditorJsComponent} from '../../components/editor-js/editor-js.component';
import {EditorSavedDocument} from '../../models/editor-document.model';
import {createEditorDocument} from '../../utils/blog-editorjs-adapter';

@Component({
  selector: 'app-cms-post-editor',
  imports: [
    JsonPipe,
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

        @if (post; as currentPost) {
          <header class="space-y-3 border-b border-zinc-800 pb-8">
            <p class="text-sm uppercase tracking-[0.3em] text-cyan-300">CMS Editor</p>
            <h1 class="text-4xl font-semibold text-zinc-50">{{ currentPost.title }}</h1>
            <p class="max-w-2xl text-zinc-400">{{ currentPost.excerpt }}</p>
          </header>

          <section class="grid gap-8 xl:grid-cols-[minmax(0,1fr)_360px]">
            <app-editor-js
              [title]="currentPost.title"
              [initialData]="initialData"
              (saved)="onSaved($event)"
            ></app-editor-js>

            <aside class="space-y-5 border-t border-zinc-800 pt-6 xl:border-l xl:border-t-0 xl:pl-6 xl:pt-0">
              <section class="space-y-3">
                <h2 class="text-lg font-semibold text-zinc-50">Post State</h2>
                <dl class="space-y-3 text-sm">
                  <div class="flex justify-between gap-4">
                    <dt class="text-zinc-500">Status</dt>
                    <dd class="text-zinc-200">{{ currentPost.status }}</dd>
                  </div>
                  <div class="flex justify-between gap-4">
                    <dt class="text-zinc-500">Slug</dt>
                    <dd class="text-right text-zinc-200">{{ currentPost.slug }}</dd>
                  </div>
                  <div class="flex justify-between gap-4">
                    <dt class="text-zinc-500">Format</dt>
                    <dd class="text-zinc-200">{{ currentPost.contentFormat }}</dd>
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
                  Saved draft JSON will appear here.
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
  private readonly blogRepository = inject(BlogRepositoryService);
  private readonly slug = this.route.snapshot.paramMap.get('slug') ?? '';

  protected readonly post = this.blogRepository.getAdminPostBySlug(this.slug);
  protected readonly initialData = this.post ? createEditorDocument(this.post) : {blocks: []};
  protected lastSaved: EditorSavedDocument | null = null;

  protected onSaved(saved: EditorSavedDocument): void {
    this.lastSaved = saved;
  }
}
