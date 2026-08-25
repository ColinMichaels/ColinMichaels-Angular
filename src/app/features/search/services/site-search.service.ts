import {Injectable, inject} from '@angular/core';
import {combineLatest, map, Observable} from 'rxjs';

import {PATH_NAMES} from '../../../app-route-paths';
import {BlogGalleryImage, BlogPostSummary} from '../../blog/models/blog-post.model';
import {BlogRepositoryService} from '../../blog/services/blog-repository.service';
import {getBlogTaxonomyTerms} from '../../blog/utils/blog-category-url.util';
import {resolveBlogPostImage} from '../../blog/utils/blog-image-url.util';
import {TopicHubRepositoryService} from '../../topics/services/topic-hub-repository.service';
import {TopicHub} from '../../topics/topic-hubs.data';

export type SiteSearchContentType = 'blog' | 'page';
export type SiteSearchSortMode = 'relevance' | 'newest';

export interface SiteSearchTopic {
  label: string;
  accent: string;
  accentStrong: string;
  accentRgb: string;
}

export interface SiteSearchItem {
  id: string;
  type: SiteSearchContentType;
  title: string;
  excerpt: string;
  path: string;
  titleText: string;
  excerptText: string;
  taxonomyText: string;
  bodyText: string;
  categories: readonly string[];
  tags: readonly string[];
  authorId?: string;
  authorName?: string;
  authorSlug?: string;
  date: string | null;
  image?: string;
  previewImages?: readonly BlogGalleryImage[];
  topic?: SiteSearchTopic;
}

export interface SiteSearchFilters {
  query: string;
  type: SiteSearchContentType | 'all';
  category: string;
  tag: string;
  author: string;
  sort: SiteSearchSortMode;
}

export interface SiteSearchResult extends SiteSearchItem {
  score: number;
  matchedFields: readonly string[];
}

const STATIC_SEARCH_ITEMS: readonly SiteSearchItem[] = [
  {
    id: 'page-home',
    type: 'page' as const,
    title: 'Home',
    excerpt: 'Cool gadgets, useful technology, internet finds, FPV stories, and creator projects from Colin Michaels.',
    path: '/',
    titleText: 'home colin michaels cool gadgets useful tech internet finds captain colin',
    excerptText: 'unusual gadgets practical technology fpv drone stories videos creator projects applications developer',
    taxonomyText: 'homepage gadgets drones fpv youtube projects writing',
    bodyText: 'is it actually useful captain colin flies one annoying problem one useful fix',
    categories: ['Site', 'Gadgets & Toys', 'Drones & FPV'],
    tags: ['gadgets', 'useful technology', 'internet finds', 'fpv', 'Captain Colin'],
    date: null,
  },
  {
    id: 'page-blog',
    type: 'page' as const,
    title: 'Blog',
    excerpt: 'Articles about unusual gadgets, useful technology, FPV flights, creator projects, recovery, and software systems.',
    path: `/${PATH_NAMES.BLOG}`,
    titleText: 'blog writing articles unusual gadgets useful technology fpv creator projects',
    excerptText: 'gadget finds product research drones flights recovery angular firebase cms web systems',
    taxonomyText: 'blog writing articles gadgets drones projects recovery software',
    bodyText: 'is it actually useful captain colin flies practical guides first person stories',
    categories: ['Writing', 'Gadgets & Toys', 'Drones & FPV'],
    tags: ['gadgets', 'fpv', 'projects', 'recovery', 'angular', 'firebase'],
    date: null,
  },
  {
    id: 'page-editorial-standards',
    type: 'page' as const,
    title: 'Editorial Standards & Corrections',
    excerpt: 'How ColinMichaels.com labels hands-on experience, research, sources, synthetic media, relationships, and corrections.',
    path: `/${PATH_NAMES.EDITORIAL_STANDARDS}`,
    titleText: 'editorial standards corrections trust transparency',
    excerptText: 'hands-on tested research sources citations synthetic media ai disclosure sponsorship affiliate corrections updates',
    taxonomyText: 'site policy trust sourcing author accountability',
    bodyText: 'report an error explain evidence boundaries distinguish manufacturer claims from independent results',
    categories: ['Site'],
    tags: ['editorial standards', 'corrections', 'sources', 'disclosure'],
    date: null,
  },
  {
    id: 'page-gadget-usefulness-scorecard',
    type: 'page' as const,
    title: 'Gadget Usefulness Scorecard',
    excerpt: 'A printable Is It Actually Useful? worksheet for scoring problem fit, evidence, true cost, everyday friction, support, and an honest verdict.',
    path: `/${PATH_NAMES.RESOURCES}/${PATH_NAMES.RESOURCE_GADGET_USEFULNESS_SCORECARD}`,
    titleText: 'gadget usefulness scorecard is it actually useful printable worksheet',
    excerptText: 'score gadgets problem fit evidence true cost daily friction support verdict buyer research',
    taxonomyText: 'gadgets toys useful technology internet finds product review resource captain colin',
    bodyText: 'own tried borrowed research only product claims relationship disclosure test borrow buy wait skip watch list',
    categories: ['Gadgets & Toys', 'Resources'],
    tags: ['gadget scorecard', 'Is It Actually Useful', 'product research', 'printable worksheet'],
    date: null,
  },
  {
    id: 'page-personal-aircraft-buyer-verification',
    type: 'page' as const,
    title: 'Personal Aircraft Buyer Verification',
    excerpt: 'A printable worksheet for checking an aircraft offer, deposit terms, legal-category claims, operating reality, support, and evidence.',
    path: `/${PATH_NAMES.RESOURCES}/${PATH_NAMES.RESOURCE_PERSONAL_AIRCRAFT_BUYER_VERIFICATION}`,
    titleText: 'personal aircraft buyer verification worksheet passenger drone ultralight evtol',
    excerptText: 'aircraft offer deposit refund seller legal category part 103 operation training support evidence purchase research',
    taxonomyText: 'drones fpv gadgets buyer guide printable resource',
    bodyText: 'verify before paying filmed flight checkout page delivery configuration maintenance batteries parts warranty insurance records stop signs',
    categories: ['Drones & FPV', 'Resources'],
    tags: ['personal aircraft', 'buyer verification', 'Part 103', 'printable worksheet'],
    date: null,
  },
];

@Injectable({
  providedIn: 'root',
})
export class SiteSearchService {
  private readonly blogRepository = inject(BlogRepositoryService);
  private readonly topicHubRepository = inject(TopicHubRepositoryService);
  readonly loading$ = this.blogRepository.loading$;
  readonly error$ = this.blogRepository.error$;

  getSearchItems$(): Observable<readonly SiteSearchItem[]> {
    return combineLatest([
      this.blogRepository.getPublishedPosts$(),
      this.topicHubRepository.getPublishedTopicHubs$(),
    ]).pipe(
      map(([posts, topicHubs]) => [
        ...posts.map(post => createBlogSearchItem(post, topicHubs)),
        ...topicHubs.map(topicHub => createTopicSearchItem(topicHub)),
        ...STATIC_SEARCH_ITEMS,
      ])
    );
  }
}

export function searchSiteItems(
  items: readonly SiteSearchItem[],
  filters: SiteSearchFilters,
  limit = Number.POSITIVE_INFINITY
): readonly SiteSearchResult[] {
  const normalizedQuery = normalizeSearchValue(filters.query);
  const queryTokens = normalizedQuery.split(' ').filter(Boolean);
  const filteredItems = items.filter(item => matchesFilters(item, filters));

  if (!normalizedQuery) {
    return sortFilteredItems(filteredItems, filters.sort)
      .slice(0, limit)
      .map(item => ({...item, score: 0, matchedFields: []}));
  }

  return filteredItems
    .map(item => scoreSearchItem(item, normalizedQuery, queryTokens))
    .filter((result): result is SiteSearchResult => result !== null)
    .sort((left, right) => {
      if (filters.sort === 'newest') {
        return compareSearchDates(left, right) || right.score - left.score;
      }

      return right.score - left.score || compareSearchDates(left, right);
    })
    .slice(0, limit);
}

export function getFeaturedSearchItems(items: readonly SiteSearchItem[], limit: number): readonly SiteSearchResult[] {
  return sortFilteredItems(items, 'newest')
    .slice(0, limit)
    .map(item => ({...item, score: 0, matchedFields: []}));
}

export function getSearchCategories(items: readonly SiteSearchItem[]): readonly string[] {
  return uniqueSorted(items.flatMap(item => item.categories));
}

export function getSearchTags(items: readonly SiteSearchItem[]): readonly string[] {
  return uniqueSorted(items.flatMap(item => item.tags));
}

export function getSearchAuthors(items: readonly SiteSearchItem[]): readonly {name: string; slug: string}[] {
  const authors = new Map<string, string>();
  for (const item of items) {
    if (item.authorSlug && item.authorName) authors.set(item.authorSlug, item.authorName);
  }
  return [...authors].map(([slug, name]) => ({slug, name})).sort((left, right) => left.name.localeCompare(right.name));
}

export function normalizeSearchValue(value: string): string {
  return value
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, ' and ')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

function createBlogSearchItem(post: BlogPostSummary, topicHubs: readonly TopicHub[]): SiteSearchItem {
  // Backend and legacy-summary projection both store this bounded field in the
  // same normalized form, so the active search view can share the string
  // instead of allocating a second article-body copy.
  const bodyText = post.searchBodyText ?? '';
  const taxonomyTerms = getBlogTaxonomyTerms(post);
  const taxonomyText = [...taxonomyTerms, ...post.tags].join(' ');
  const authorText = [post.author.name, post.author.title, post.author.slug].filter(Boolean).join(' ');
  const titleText = `${post.title} ${post.seo?.title ?? ''}`;
  const excerptText = `${post.excerpt} ${post.seo?.description ?? ''}`;
  const topicHub = findTopicHubForBlogPost(post, taxonomyTerms, topicHubs);
  const previewImages = post.previewImages ?? [];

  return {
    id: post.id,
    type: 'blog',
    title: post.title,
    excerpt: post.excerpt,
    path: `/${PATH_NAMES.BLOG}/${post.slug}`,
    titleText: normalizeSearchValue(titleText),
    excerptText: normalizeSearchValue(excerptText),
    taxonomyText: normalizeSearchValue(`${taxonomyText} ${authorText}`),
    bodyText,
    categories: taxonomyTerms,
    tags: post.tags,
    authorId: post.authorId,
    authorName: post.author.name,
    authorSlug: post.author.slug ?? 'colin-michaels',
    date: post.publishedAt ?? post.updatedAt,
    image: resolveBlogPostImage(post),
    ...(previewImages.length ? {previewImages} : {}),
    ...(topicHub ? {topic: createSearchTopic(topicHub)} : {}),
  };
}

function createTopicSearchItem(topicHub: TopicHub): SiteSearchItem {
  const titleText = `${topicHub.title} ${topicHub.eyebrow}`;
  const excerptText = `${topicHub.description} ${topicHub.summary}`;
  const taxonomyText = `topics ${topicHub.terms.join(' ')}`;
  const bodyText = [
    topicHub.heroImage?.alt,
    topicHub.pageCopy?.featuredHeading,
    topicHub.pageCopy?.featuredDescription,
    topicHub.pageCopy?.archiveHeading,
    topicHub.pageCopy?.archiveDescription,
    topicHub.asset.title,
    topicHub.asset.intro,
    ...topicHub.asset.items.flatMap(item => [item.label, item.description]),
    topicHub.featuredProject.title,
    topicHub.featuredProject.description,
    ...topicHub.learningPath.flatMap(step => [step.label, step.title, step.description]),
    ...topicHub.checklist,
    ...topicHub.resources.flatMap(resource => [resource.label, resource.description]),
  ].filter((value): value is string => typeof value === 'string').join(' ');

  return {
    id: `topic-${topicHub.id}`,
    type: 'page',
    title: topicHub.title,
    excerpt: topicHub.description,
    path: `/${PATH_NAMES.TOPICS}/${topicHub.slug}`,
    titleText: normalizeSearchValue(titleText),
    excerptText: normalizeSearchValue(excerptText),
    taxonomyText: normalizeSearchValue(taxonomyText),
    bodyText: normalizeSearchValue(bodyText),
    categories: ['Topics'],
    tags: topicHub.terms,
    date: topicHub.updatedAt,
    topic: createSearchTopic(topicHub),
  };
}

function createSearchTopic(topicHub: TopicHub): SiteSearchTopic {
  return {
    label: topicHub.theme.shortLabel,
    accent: topicHub.theme.accent,
    accentStrong: topicHub.theme.accentStrong,
    accentRgb: topicHub.theme.accentRgb,
  };
}

function findTopicHubForBlogPost(
  post: BlogPostSummary,
  taxonomyTerms: readonly string[],
  topicHubs: readonly TopicHub[]
): TopicHub | null {
  const searchableText = normalizeTopicMatchValue([
    post.title,
    post.excerpt,
    post.slug,
    ...taxonomyTerms,
    ...post.tags,
  ].join(' '));
  const searchableTokens = new Set(searchableText.split(' ').filter(Boolean));

  return topicHubs.find(topicHub => topicHub.terms.some(term => {
    const normalizedTerm = normalizeTopicMatchValue(term);

    if (!normalizedTerm) {
      return false;
    }

    return normalizedTerm.includes(' ')
      ? searchableText.includes(normalizedTerm)
      : searchableTokens.has(normalizedTerm);
  })) ?? null;
}

function normalizeTopicMatchValue(value: string): string {
  return normalizeSearchValue(value)
    .replace(/&/g, 'and')
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function matchesFilters(item: SiteSearchItem, filters: SiteSearchFilters): boolean {
  const typeMatches = filters.type === 'all' || item.type === filters.type;
  const categoryMatches = !filters.category || item.categories.some(category => sameSearchFacet(category, filters.category));
  const tagMatches = !filters.tag || item.tags.some(tag => sameSearchFacet(tag, filters.tag));
  const authorMatches = !filters.author || item.authorSlug === filters.author;

  return typeMatches && categoryMatches && tagMatches && authorMatches;
}

function scoreSearchItem(
  item: SiteSearchItem,
  normalizedQuery: string,
  queryTokens: readonly string[]
): SiteSearchResult | null {
  let score = 0;
  const matchedFields = new Set<string>();

  if (item.titleText.includes(normalizedQuery)) {
    score += 80;
    matchedFields.add('Title');
  }

  if (item.excerptText.includes(normalizedQuery)) {
    score += 35;
    matchedFields.add('Excerpt');
  }

  if (item.taxonomyText.includes(normalizedQuery)) {
    score += 45;
    matchedFields.add(item.authorName && normalizeSearchValue(item.authorName).includes(normalizedQuery) ? 'Author' : 'Category or tag');
  }

  if (item.bodyText.includes(normalizedQuery)) {
    score += 16;
    matchedFields.add('Body');
  }

  for (const token of queryTokens) {
    if (item.titleText.includes(token)) {
      score += 18;
      matchedFields.add('Title');
    }

    if (item.excerptText.includes(token)) {
      score += 8;
      matchedFields.add('Excerpt');
    }

    if (item.taxonomyText.includes(token)) {
      score += 12;
      matchedFields.add(item.authorName && normalizeSearchValue(item.authorName).includes(token) ? 'Author' : 'Category or tag');
    }

    if (item.bodyText.includes(token)) {
      score += 3;
      matchedFields.add('Body');
    }
  }

  return score > 0 ? {...item, score, matchedFields: [...matchedFields]} : null;
}

function sortFilteredItems(items: readonly SiteSearchItem[], sort: SiteSearchSortMode): readonly SiteSearchItem[] {
  return [...items].sort((left, right) => {
    if (sort === 'newest') {
      return compareSearchDates(left, right) || left.title.localeCompare(right.title);
    }

    return (left.type === right.type ? 0 : left.type === 'blog' ? -1 : 1)
      || compareSearchDates(left, right)
      || left.title.localeCompare(right.title);
  });
}

function compareSearchDates(left: { date: string | null }, right: { date: string | null }): number {
  return (right.date ?? '').localeCompare(left.date ?? '');
}

function sameSearchFacet(left: string, right: string): boolean {
  return normalizeSearchValue(left) === normalizeSearchValue(right);
}

function uniqueSorted(values: readonly string[]): readonly string[] {
  return [...new Set(values.map(value => value.trim()).filter(Boolean))]
    .sort((left, right) => left.localeCompare(right));
}
