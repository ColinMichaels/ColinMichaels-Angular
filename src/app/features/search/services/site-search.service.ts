import {Injectable, inject} from '@angular/core';
import {map, Observable} from 'rxjs';

import {PATH_NAMES} from '../../../app-route-paths';
import {BlogPost} from '../../blog/models/blog-post.model';
import {BlogRepositoryService} from '../../blog/services/blog-repository.service';
import {getBlogTaxonomyTerms} from '../../blog/utils/blog-category-url.util';
import {TOPIC_HUBS} from '../../topics/topic-hubs.data';

export type SiteSearchContentType = 'blog' | 'page';
export type SiteSearchSortMode = 'relevance' | 'newest';

export interface SiteSearchItem {
  id: string;
  type: SiteSearchContentType;
  title: string;
  excerpt: string;
  path: string;
  searchText: string;
  titleText: string;
  excerptText: string;
  taxonomyText: string;
  bodyText: string;
  categories: readonly string[];
  tags: readonly string[];
  date: string | null;
  image?: string;
}

export interface SiteSearchFilters {
  query: string;
  type: SiteSearchContentType | 'all';
  category: string;
  tag: string;
  sort: SiteSearchSortMode;
}

export interface SiteSearchResult extends SiteSearchItem {
  score: number;
  matchedFields: readonly string[];
}

const RAW_STATIC_SEARCH_ITEMS: readonly Omit<SiteSearchItem, 'searchText'>[] = [
  {
    id: 'page-home',
    type: 'page' as const,
    title: 'Home',
    excerpt: 'Portfolio, writing, media, projects, and recovery updates from Colin Michaels.',
    path: '/',
    titleText: 'home colin michaels',
    excerptText: 'portfolio writing media projects recovery updates applications developer fpv drone creative technologist',
    taxonomyText: 'homepage portfolio projects media writing',
    bodyText: '',
    categories: ['Site'],
    tags: ['portfolio', 'projects', 'writing', 'media'],
    date: null,
  },
  {
    id: 'page-blog',
    type: 'page' as const,
    title: 'Blog',
    excerpt: 'Notes on frontend engineering, Angular architecture, Firebase, CMS workflows, and web systems.',
    path: `/${PATH_NAMES.BLOG}`,
    titleText: 'blog writing articles notes',
    excerptText: 'frontend engineering angular architecture firebase cms workflows web systems',
    taxonomyText: 'blog writing articles',
    bodyText: '',
    categories: ['Writing'],
    tags: ['angular', 'firebase', 'cms', 'frontend'],
    date: null,
  },
  {
    id: 'page-labs',
    type: 'page' as const,
    title: 'Labs',
    excerpt: 'Interactive demos, frontend experiments, OS-style UI systems, and public project notes.',
    path: `/${PATH_NAMES.LABS}`,
    titleText: 'labs projects experiments',
    excerptText: 'interactive demos frontend experiments reusable os style interface systems public project notes',
    taxonomyText: 'labs projects experiments',
    bodyText: '',
    categories: ['Projects'],
    tags: ['labs', 'experiments', 'os', 'frontend'],
    date: null,
  },
  ...TOPIC_HUBS.map(topicHub => ({
    id: `topic-${topicHub.slug}`,
    type: 'page' as const,
    title: topicHub.title,
    excerpt: topicHub.description,
    path: `/${PATH_NAMES.TOPICS}/${topicHub.slug}`,
    titleText: `${topicHub.title} ${topicHub.eyebrow}`,
    excerptText: `${topicHub.description} ${topicHub.summary}`,
    taxonomyText: `topics ${topicHub.terms.join(' ')}`,
    bodyText: [
      ...topicHub.checklist,
      ...topicHub.resources.flatMap(resource => [resource.label, resource.description]),
    ].join(' '),
    categories: ['Topics'],
    tags: topicHub.terms,
    date: null,
  })),
];

const STATIC_SEARCH_ITEMS: readonly SiteSearchItem[] = RAW_STATIC_SEARCH_ITEMS.map(item => ({
  ...item,
  searchText: normalizeSearchValue([
    item.titleText,
    item.excerptText,
    item.taxonomyText,
    item.bodyText,
  ].join(' ')),
}));

@Injectable({
  providedIn: 'root',
})
export class SiteSearchService {
  private readonly blogRepository = inject(BlogRepositoryService);
  readonly loading$ = this.blogRepository.loading$;
  readonly error$ = this.blogRepository.error$;

  getSearchItems$(): Observable<readonly SiteSearchItem[]> {
    return this.blogRepository.getPublishedFullPosts$().pipe(
      map(posts => [
        ...posts.map(post => createBlogSearchItem(post)),
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

export function normalizeSearchValue(value: string): string {
  return value
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, ' and ')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

function createBlogSearchItem(post: BlogPost): SiteSearchItem {
  const bodyText = createBlogPostBodyText(post);
  const taxonomyTerms = getBlogTaxonomyTerms(post);
  const taxonomyText = [...taxonomyTerms, ...post.tags].join(' ');
  const titleText = post.title;
  const excerptText = post.excerpt;

  return {
    id: post.id,
    type: 'blog',
    title: post.title,
    excerpt: post.excerpt,
    path: `/${PATH_NAMES.BLOG}/${post.slug}`,
    titleText: normalizeSearchValue(titleText),
    excerptText: normalizeSearchValue(excerptText),
    taxonomyText: normalizeSearchValue(taxonomyText),
    bodyText: normalizeSearchValue(bodyText),
    searchText: normalizeSearchValue([
      titleText,
      excerptText,
      taxonomyText,
      bodyText,
      post.seo.title,
      post.seo.description,
    ].join(' ')),
    categories: taxonomyTerms,
    tags: post.tags,
    date: post.publishedAt ?? post.updatedAt,
    image: post.thumbnailImage?.trim() || post.coverImage,
  };
}

function createBlogPostBodyText(post: BlogPost): string {
  return post.blocks
    .flatMap(block => [
      block.data.title,
      block.data.text,
      block.data.caption,
      block.data.attribution,
      block.data.code,
      block.data.html,
      ...(block.data.items ?? []),
      ...(block.data.stats ?? []).flatMap(stat => [stat.label, stat.value, stat.caption]),
      ...(block.data.chartPoints ?? []).flatMap(point => [point.label, point.note]),
    ])
    .filter((value): value is string => typeof value === 'string')
    .join(' ');
}

function matchesFilters(item: SiteSearchItem, filters: SiteSearchFilters): boolean {
  const typeMatches = filters.type === 'all' || item.type === filters.type;
  const categoryMatches = !filters.category || item.categories.some(category => sameSearchFacet(category, filters.category));
  const tagMatches = !filters.tag || item.tags.some(tag => sameSearchFacet(tag, filters.tag));

  return typeMatches && categoryMatches && tagMatches;
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
    matchedFields.add('Category or tag');
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
      matchedFields.add('Category or tag');
    }

    if (item.bodyText.includes(token)) {
      score += 3;
      matchedFields.add('Body');
    }
  }

  if (score === 0 && item.searchText.includes(normalizedQuery)) {
    score = 1;
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
