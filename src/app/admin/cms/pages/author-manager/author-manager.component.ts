import {ChangeDetectionStrategy, Component, inject, signal} from '@angular/core';
import {toSignal} from '@angular/core/rxjs-interop';

import {AuthorProfile} from '../../../../features/authors/models/author.model';
import {AuthorRepositoryService} from '../../../../features/authors/services/author-repository.service';
import {CmsAuthorFormComponent} from '../../components/author-form/author-form.component';

@Component({
  selector: 'app-cms-author-manager',
  imports: [CmsAuthorFormComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <main class="min-h-screen bg-zinc-950 px-5 py-8 text-zinc-100 sm:px-8 lg:px-12">
      <section class="mx-auto max-w-6xl space-y-6">
        <header class="flex flex-wrap items-end justify-between gap-4 border-b border-zinc-800 pb-5">
          <div>
            <p class="site-meta">Publishing</p>
            <h1 class="mt-2 text-3xl font-semibold">Authors</h1>
            <p class="mt-2 max-w-2xl text-sm leading-6 text-zinc-400">Manage reusable public profiles and post bylines.</p>
          </div>
          <button type="button" class="border border-cyan-400 bg-cyan-400 px-4 py-2 text-sm font-semibold text-zinc-950" (click)="startNewAuthor()">Add author</button>
        </header>

        <div class="grid gap-6 lg:grid-cols-[minmax(0,0.75fr)_minmax(22rem,1.25fr)]">
          <section class="border border-zinc-800">
            @for (author of authors(); track author.id) {
              <button type="button" class="flex w-full items-center gap-3 border-b border-zinc-800 px-4 py-3 text-left hover:bg-zinc-900" (click)="selectedAuthor.set(author)">
                @if (author.avatarUrl) {
                  <img [src]="author.avatarUrl" [alt]="author.imageAlt" class="h-11 w-11 rounded-full object-cover">
                } @else {
                  <span class="grid h-11 w-11 place-items-center rounded-full bg-zinc-800 text-sm font-semibold">{{ initials(author.name) }}</span>
                }
                <span class="min-w-0 flex-1">
                  <span class="block font-medium text-zinc-100">{{ author.name }}</span>
                  <span class="block truncate text-xs text-zinc-500">/authors/{{ author.slug }}</span>
                </span>
                <span class="text-xs uppercase tracking-wide" [class.text-emerald-300]="author.status === 'published'" [class.text-amber-300]="author.status === 'draft'">{{ author.status }}</span>
              </button>
            }
          </section>

          <section class="border border-zinc-800 bg-zinc-900/40 p-5">
            @if (selectedAuthor(); as author) {
              <app-cms-author-form [author]="author" (authorSaved)="onAuthorSaved($event)" (cancelled)="selectedAuthor.set(null)"></app-cms-author-form>
            } @else {
              <p class="text-sm text-zinc-500">Select an author to edit, or add a new author.</p>
            }
          </section>
        </div>
      </section>
    </main>
  `,
})
export class CmsAuthorManagerComponent {
  private readonly repository = inject(AuthorRepositoryService);
  protected readonly authors = toSignal(this.repository.getAuthors$(), {initialValue: []});
  protected readonly selectedAuthor = signal<AuthorProfile | null>(null);

  protected startNewAuthor(): void {
    this.selectedAuthor.set(this.repository.createNewAuthorTemplate());
  }

  protected onAuthorSaved(author: AuthorProfile): void {
    this.selectedAuthor.set(author);
  }

  protected initials(name: string): string {
    return name.split(/\s+/).map(part => part[0]).join('').slice(0, 2).toUpperCase();
  }
}
