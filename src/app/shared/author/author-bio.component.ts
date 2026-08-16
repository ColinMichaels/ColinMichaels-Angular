import {Component, Input, ChangeDetectionStrategy} from '@angular/core';
import {RouterLink} from '@angular/router';

import {COLIN_AUTHOR_PROFILE} from './author-profile.data';
import {AuthorProfile as CanonicalAuthorProfile} from '../../features/authors/models/author.model';
import {PATH_NAMES} from '../../app-route-paths';

export type AuthorBioVariant = 'home' | 'blog';

@Component({
  selector: 'app-author-bio',
  imports: [RouterLink],
  standalone: true,
  changeDetection: ChangeDetectionStrategy.Eager,
  template: `
    @if (variant === 'home') {
      <div class="space-y-8">
        <div class="grid gap-8 lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)] lg:items-start">
          <figure class="overflow-hidden border border-neutral-300 bg-neutral-950 lg:flex lg:h-[52rem] lg:flex-col">
            <img
              [src]="profile.imageUrl"
              [alt]="profile.imageAlt"
              class="aspect-[9/16] w-full object-cover lg:min-h-0 lg:flex-1 lg:aspect-auto"
              loading="lazy"
            >
            <figcaption class="border-t border-white/10 px-4 py-3 text-sm text-zinc-400">
              {{ profile.title }} based in {{ profile.location }}.
            </figcaption>
          </figure>

          <div class="relative">
            <div
              #introBioScroller
              class="lg:max-h-[52rem] lg:overflow-y-auto lg:pr-4 lg:[scrollbar-gutter:stable]"
              (scroll)="updateIntroBioScrollState(introBioScroller)"
            >
              <p class="text-sm uppercase tracking-[0.28em] text-neutral-500">About</p>
              <div class="mt-4 space-y-8 pb-16 text-base leading-8 text-neutral-700 lg:pb-24">
                @for (section of introBioSections; track section.heading; let first = $first) {
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
                  </section>
                }
              </div>
            </div>
            <div
              aria-hidden="true"
              class="pointer-events-none absolute inset-x-0 bottom-0 hidden h-24 bg-gradient-to-t from-zinc-100 via-zinc-100/90 to-transparent lg:block"
            ></div>
            <button
              type="button"
              class="absolute bottom-4 right-4 z-10 hidden h-11 w-11 items-center justify-center border border-cyan-700 bg-neutral-950/90 text-cyan-100 shadow-lg shadow-neutral-950/20 transition hover:-translate-y-0.5 hover:bg-cyan-600 hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500 focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-100 lg:flex"
              [attr.aria-label]="introBioAtBottom ? 'Scroll to top of author bio' : 'Scroll to more author bio text'"
              [attr.title]="introBioAtBottom ? 'Back to top' : 'More to read'"
              (click)="toggleIntroBioScroll(introBioScroller)"
            >
              @if (introBioAtBottom) {
                <svg aria-hidden="true" viewBox="0 0 24 24" class="h-5 w-5" fill="none" stroke="currentColor"
                     stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M12 19V5"></path>
                  <path d="m5 12 7-7 7 7"></path>
                </svg>
              } @else {
                <svg aria-hidden="true" viewBox="0 0 24 24" class="h-5 w-5" fill="none" stroke="currentColor"
                     stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M12 5v14"></path>
                  <path d="m19 12-7 7-7-7"></path>
                </svg>
              }
            </button>
          </div>
        </div>

        @if (findHereSection; as section) {
          <section class="border-y border-neutral-300 py-6">
            <div class="grid gap-6 lg:grid-cols-[minmax(0,0.42fr)_minmax(0,1fr)] lg:items-start">
              <div class="space-y-4">
                <h3 class="text-2xl font-semibold text-neutral-950">{{ section.heading }}</h3>
                @for (paragraph of section.paragraphs; track paragraph) {
                  <p class="text-base leading-8 text-neutral-700">{{ paragraph }}</p>
                }
              </div>
              <ul class="grid gap-3 text-sm leading-6 text-neutral-700 sm:grid-cols-2">
                @for (bullet of section.bullets; track bullet) {
                  <li class="border-l-2 border-cyan-500 bg-white/70 px-4 py-3">{{ bullet }}</li>
                }
              </ul>
            </div>
          </section>
        }

        @if (signoffSection; as section) {
          <section class="max-w-4xl border-l-2 border-cyan-600 pl-5">
            <h3 class="text-3xl font-semibold text-neutral-950">{{ section.heading }}</h3>
            <div class="mt-4 space-y-4 text-xl leading-8 text-neutral-700">
              @for (paragraph of section.paragraphs; track paragraph) {
                <p>{{ paragraph }}</p>
              }
            </div>
          </section>
        }

        <div class="flex flex-col gap-4 border-t border-neutral-300 pt-5 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p class="text-sm font-semibold uppercase tracking-[0.22em] text-neutral-500">Connect</p>
            <div class="mt-3 flex flex-wrap gap-3">
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
              <a
                [routerLink]="['/', pathNames.EDITORIAL_STANDARDS]"
                class="text-sm font-semibold text-cyan-800 hover:text-cyan-600"
              >
                Editorial Standards
              </a>
            </div>
          </div>
          <p class="max-w-2xl border-l-2 border-rose-500 pl-4 text-sm leading-7 text-neutral-600">
            {{ profile.healthDisclaimer }}
          </p>
        </div>
      </div>
    } @else {
      <aside aria-labelledby="author-bio-heading"
             class="rounded border border-slate-200 bg-white p-5 shadow-sm shadow-slate-950/5 dark:border-zinc-800 dark:bg-zinc-900/70 dark:shadow-black/20">
        <div class="grid gap-4 sm:grid-cols-[5rem_1fr] sm:items-start">
          <a
            [routerLink]="['/authors', blogProfile.slug]"
            class="block overflow-hidden rounded border border-slate-200 bg-slate-100 dark:border-zinc-700 dark:bg-zinc-950"
            [attr.aria-label]="'Read more about ' + blogProfile.name"
          >
            <img
              [src]="blogProfile.imageUrl"
              [alt]="blogProfile.imageAlt"
              class="aspect-square w-full object-cover"
              loading="lazy"
            >
          </a>
          <div>
            <p class="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500 dark:text-zinc-500">About the
              author</p>
            <h2 id="author-bio-heading" class="mt-2 text-xl font-semibold text-slate-950 dark:text-zinc-50">
              <a [routerLink]="['/authors', blogProfile.slug]"
                 class="hover:text-cyan-800 dark:hover:text-cyan-200">
                {{ blogProfile.name }}
              </a>
            </h2>
            <p class="mt-1 text-sm text-cyan-700 dark:text-cyan-200">{{ blogProfile.title }}</p>
            <p class="mt-3 text-sm leading-6 text-slate-600 dark:text-zinc-400">{{ blogProfile.shortBio }}</p>
            <div class="mt-4 flex flex-wrap gap-2">
              <a
                [routerLink]="['/', pathNames.EDITORIAL_STANDARDS]"
                class="rounded border border-slate-200 px-2 py-1 text-xs font-semibold text-slate-700 transition hover:border-cyan-600 hover:text-cyan-800 dark:border-zinc-700 dark:text-zinc-300 dark:hover:border-cyan-300 dark:hover:text-cyan-200"
              >
                Editorial Standards
              </a>
              @for (externalProfile of blogProfile.externalProfiles; track externalProfile.href) {
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
              [routerLink]="['/authors', blogProfile.slug]"
              class="mt-4 inline-flex rounded border border-cyan-700 bg-cyan-50 px-3 py-2 text-sm font-semibold text-cyan-800 transition hover:bg-cyan-600 hover:text-white dark:border-cyan-300 dark:bg-transparent dark:text-cyan-200 dark:hover:bg-cyan-300 dark:hover:text-zinc-950"
            >
              Read {{ blogProfile.name }}'s bio
            </a>
          </div>
        </div>
      </aside>
    }
  `,
})
export class AuthorBioComponent {
  @Input() variant: AuthorBioVariant = 'blog';
  @Input() author: CanonicalAuthorProfile | null = null;

  protected readonly profile = COLIN_AUTHOR_PROFILE;
  protected readonly pathNames = PATH_NAMES;
  protected get blogProfile(): {
    name: string;
    slug: string;
    title: string;
    shortBio: string;
    imageUrl: string;
    imageAlt: string;
    externalProfiles: readonly {label: string; href: string}[];
  } {
    const author = this.author;

    return author ? {
      name: author.name,
      slug: author.slug,
      title: author.title,
      shortBio: author.shortBio,
      imageUrl: author.avatarUrl,
      imageAlt: author.imageAlt,
      externalProfiles: author.externalProfiles.map(profile => ({label: profile.label, href: profile.url})),
    } : {
      name: this.profile.name,
      slug: 'colin-michaels',
      title: this.profile.title,
      shortBio: this.profile.shortBio,
      imageUrl: this.profile.imageUrl,
      imageAlt: this.profile.imageAlt,
      externalProfiles: this.profile.externalProfiles,
    };
  }
  protected readonly introBioSections = this.profile.homeBioSections.slice(0, 4);
  protected readonly findHereSection = this.profile.homeBioSections.find(
    section => section.heading === 'What You’ll Find Here',
  );
  protected readonly signoffSection = this.profile.homeBioSections.find(
    section => section.heading === 'Thanks for Stopping By',
  );
  protected introBioAtBottom = false;

  protected updateIntroBioScrollState(container: HTMLElement): void {
    const remainingScroll = container.scrollHeight - container.scrollTop - container.clientHeight;

    this.introBioAtBottom = remainingScroll <= 8;
  }

  protected toggleIntroBioScroll(container: HTMLElement): void {
    this.updateIntroBioScrollState(container);

    const maxScrollTop = Math.max(container.scrollHeight - container.clientHeight, 0);
    const nextTop = this.introBioAtBottom
      ? 0
      : Math.min(container.scrollTop + (container.clientHeight * 0.85), maxScrollTop);

    container.scrollTo({
      behavior: 'smooth',
      top: nextTop,
    });

    window.setTimeout(() => this.updateIntroBioScrollState(container), 350);
  }
}
