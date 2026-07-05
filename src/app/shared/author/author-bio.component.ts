import {Component, Input, ChangeDetectionStrategy} from '@angular/core';
import {RouterLink} from '@angular/router';

import {COLIN_AUTHOR_PROFILE} from './author-profile.data';

export type AuthorBioVariant = 'home' | 'blog';

@Component({
  selector: 'app-author-bio',
  imports: [RouterLink],
  standalone: true,
  changeDetection: ChangeDetectionStrategy.Eager,
  template: `
    @if (variant === 'home') {
      <div class="grid gap-8 lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)] lg:items-start">
        <figure class="overflow-hidden border border-neutral-300 bg-neutral-950">
          <img
            [src]="profile.imageUrl"
            [alt]="profile.imageAlt"
            class="aspect-[9/16] w-full object-cover"
            loading="lazy"
          >
          <figcaption class="border-t border-white/10 px-4 py-3 text-sm text-zinc-400">
            {{ profile.title }} based in {{ profile.location }}.
          </figcaption>
        </figure>

        <div>
          <p class="text-sm uppercase tracking-[0.28em] text-neutral-500">About</p>
          <div class="mt-4 space-y-8 text-base leading-8 text-neutral-700">
            @for (section of profile.homeBioSections; track section.heading; let first = $first) {
              <section class="space-y-4">
                @if (first) {
                  <h2 class="text-3xl font-semibold text-neutral-950 sm:text-4xl">{{ section.heading }}</h2>
                } @else {
                  <h3 class="text-2xl font-semibold text-neutral-950">{{ section.heading }}</h3>
                }
                @for (paragraph of section.paragraphs; track paragraph; let firstParagraph = $first) {
                  <p [class]="first && firstParagraph ? 'text-lg font-medium leading-8 text-neutral-950' : ''">
                    {{ paragraph }}
                  </p>
                }
                @if (section.bullets.length > 0) {
                  <ul class="grid gap-2 text-sm leading-6 text-neutral-700 sm:grid-cols-2">
                    @for (bullet of section.bullets; track bullet) {
                      <li class="border-l-2 border-cyan-500 pl-3">{{ bullet }}</li>
                    }
                  </ul>
                }
              </section>
            }
            <div class="border border-neutral-200 bg-white p-4">
              <p class="text-sm font-semibold uppercase tracking-[0.22em] text-neutral-500">Connect</p>
              <div class="mt-4 flex flex-wrap gap-3">
                @for (externalProfile of profile.externalProfiles; track externalProfile.href) {
                  <a
                    [href]="externalProfile.href"
                    target="_blank"
                    rel="noopener noreferrer me"
                    class="text-sm font-semibold text-cyan-800 hover:text-cyan-600"
                  >
                    {{ externalProfile.label }}
                  </a>
                }
              </div>
            </div>
            <p class="border-l-2 border-rose-500 pl-4 text-sm leading-7 text-neutral-600">
              {{ profile.healthDisclaimer }}
            </p>
          </div>
        </div>
      </div>
    } @else {
      <aside aria-labelledby="author-bio-heading"
             class="rounded border border-slate-200 bg-white p-5 shadow-sm shadow-slate-950/5 dark:border-zinc-800 dark:bg-zinc-900/70 dark:shadow-black/20">
        <div class="grid gap-4 sm:grid-cols-[5rem_1fr] sm:items-start">
          <a
            routerLink="/"
            [fragment]="profile.profileFragment"
            class="block overflow-hidden rounded border border-slate-200 bg-slate-100 dark:border-zinc-700 dark:bg-zinc-950"
            aria-label="Read more about Colin Michaels"
          >
            <img
              [src]="profile.imageUrl"
              [alt]="profile.imageAlt"
              class="aspect-square w-full object-cover"
              loading="lazy"
            >
          </a>
          <div>
            <p class="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500 dark:text-zinc-500">About the
              author</p>
            <h2 id="author-bio-heading" class="mt-2 text-xl font-semibold text-slate-950 dark:text-zinc-50">
              <a routerLink="/" [fragment]="profile.profileFragment"
                 class="hover:text-cyan-800 dark:hover:text-cyan-200">
                {{ profile.name }}
              </a>
            </h2>
            <p class="mt-1 text-sm text-cyan-700 dark:text-cyan-200">{{ profile.title }}</p>
            <p class="mt-3 text-sm leading-6 text-slate-600 dark:text-zinc-400">{{ profile.shortBio }}</p>
            <div class="mt-4 flex flex-wrap gap-2">
              @for (externalProfile of profile.externalProfiles; track externalProfile.href) {
                <a
                  [href]="externalProfile.href"
                  target="_blank"
                  rel="noopener noreferrer me"
                  class="rounded border border-slate-200 px-2 py-1 text-xs font-semibold text-slate-700 transition hover:border-cyan-600 hover:text-cyan-800 dark:border-zinc-700 dark:text-zinc-300 dark:hover:border-cyan-300 dark:hover:text-cyan-200"
                >
                  {{ externalProfile.label }}
                </a>
              }
            </div>
            <a
              routerLink="/"
              [fragment]="profile.profileFragment"
              class="mt-4 inline-flex rounded border border-cyan-700 bg-cyan-50 px-3 py-2 text-sm font-semibold text-cyan-800 transition hover:bg-cyan-600 hover:text-white dark:border-cyan-300 dark:bg-transparent dark:text-cyan-200 dark:hover:bg-cyan-300 dark:hover:text-zinc-950"
            >
              Read Colin's bio
            </a>
          </div>
        </div>
      </aside>
    }
  `,
})
export class AuthorBioComponent {
  @Input() variant: AuthorBioVariant = 'blog';

  protected readonly profile = COLIN_AUTHOR_PROFILE;
}
