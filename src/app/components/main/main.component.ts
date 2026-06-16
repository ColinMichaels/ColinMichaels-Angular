import {DatePipe, NgClass} from '@angular/common';
import {Component, ChangeDetectionStrategy, computed, inject} from '@angular/core';
import {toSignal} from '@angular/core/rxjs-interop';
import {RouterLink} from '@angular/router';

import {PATH_NAMES} from '../../app-route-paths';
import {BlogPostCardComponent} from '../../features/blog/components/post-card/post-card.component';
import {BlogShareActionsComponent} from '../../features/blog/components/share-actions/blog-share-actions.component';
import {BlogPostSummary} from '../../features/blog/models/blog-post.model';
import {BlogRepositoryService} from '../../features/blog/services/blog-repository.service';
import {
  YouTubeLatestVideosComponent
} from '../../features/youtube/components/latest-videos/youtube-latest-videos.component';
import {SiteThemeService} from '../../shared/theme/site-theme.service';
import {SocialsComponent} from './socials/socials.component';
import {HomeTerminalWindowComponent} from './home-terminal-window/home-terminal-window.component';

interface HomeHighlight {
  eyebrow: string;
  title: string;
  description: string;
  route: string;
  action: string;
  accentClass: string;
}

interface HomeCapability {
  title: string;
  description: string;
  meta: string;
}

const WEEKLY_UPDATES_TERMS = [
  'weekly update',
  'weekly updates'
] as const;

const MEDICAL_INFORMATION_TERMS = [
  'medical information',
  'medical info',
  'medical notes',
  'health and recovery'
] as const;

function normalizeSearchValue(value: string): string {
  return value
    .toLowerCase()
    .replace(/&/g, 'and')
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function postMatchesTerms(post: BlogPostSummary, terms: readonly string[]): boolean {
  const searchableText = normalizeSearchValue([
    post.title,
    post.excerpt,
    post.slug,
    ...post.categories,
    ...(post.subcategories ?? []),
    ...post.tags,
  ].join(' '));

  return terms.some(term => searchableText.includes(normalizeSearchValue(term)));
}

@Component({
  selector: 'app-main',
  imports: [
    BlogPostCardComponent,
    BlogShareActionsComponent,
    DatePipe,
    HomeTerminalWindowComponent,
    NgClass,
    RouterLink,
    SocialsComponent,
    YouTubeLatestVideosComponent,
  ],
  templateUrl: './main.component.html',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.Eager,
  styleUrl: `./home-page.scss`
})
export class MainComponent {
  private readonly blogRepository = inject(BlogRepositoryService);
  protected readonly theme = inject(SiteThemeService);

  protected readonly capabilities: readonly HomeCapability[] = [
    {
      title: 'Public Website',
      description: 'Portfolio, publishing, media, and project context organized for quick scanning.',
      meta: 'Home / Blog / Work',
    },
    {
      title: 'Core OS Framework',
      description: 'Reusable desktop, window, dock, terminal, tooltip, and command systems.',
      meta: 'Protected OS routes',
    },
    {
      title: 'Labs',
      description: 'Experimental interaction and visual systems kept separate from production pages.',
      meta: 'Route-backed experiments',
    },
  ];

  protected readonly labItems: readonly HomeHighlight[] = [
    {
      eyebrow: 'Visual Lab',
      title: 'Full Screen Backgrounds',
      description: 'Image, video, overlay, and parallax background experiments for immersive interfaces.',
      route: `/${PATH_NAMES.FS_BACKGROUND}`,
      action: 'View background lab',
      accentClass: 'border-sky-400/70 text-sky-200',
    },
    {
      eyebrow: 'Project Demos',
      title: 'Homepage Experiments',
      description: 'SpaceX, weather, patch builder, task, tooltip, and Tailwind demos now belong with labs.',
      route: `/${PATH_NAMES.LABS}`,
      action: 'Browse labs',
      accentClass: 'border-amber-400/70 text-amber-200',
    },
  ];

  protected readonly allPublishedPosts = toSignal(
    this.blogRepository.getPublishedPosts$(),
    {initialValue: []}
  );
  protected readonly publishedPosts = computed(() => this.allPublishedPosts().slice(0, 3));
  protected readonly healthRecoveryPosts = computed(() => (
    this.allPublishedPosts().filter(post => postMatchesTerms(post, WEEKLY_UPDATES_TERMS))
  ));
  protected readonly medicalInfoPosts = computed(() => (
    this.allPublishedPosts().filter(post => postMatchesTerms(post, MEDICAL_INFORMATION_TERMS))
  ));
  protected readonly blogIsLoading = toSignal(this.blogRepository.loading$, {initialValue: true});
  protected readonly blogLoadError = toSignal(this.blogRepository.error$, {initialValue: null});
  protected readonly pathNames = PATH_NAMES;
}
