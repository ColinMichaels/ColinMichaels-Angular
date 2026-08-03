import {Injectable, inject} from '@angular/core';
import {combineLatest, map, Observable} from 'rxjs';

import {PATH_NAMES} from '../../../app-route-paths';
import {BlogPost, getBlogListItemTexts} from '../../blog/models/blog-post.model';
import {BlogRepositoryService} from '../../blog/services/blog-repository.service';
import {getBlogTaxonomyTerms} from '../../blog/utils/blog-category-url.util';
import {resolveBlogPostImage} from '../../blog/utils/blog-image-url.util';
import {createBlogMarkdownPlainText} from '../../blog/utils/blog-markdown.util';
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
  searchText: string;
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
  private readonly topicHubRepository = inject(TopicHubRepositoryService);
  readonly loading$ = this.blogRepository.loading$;
  readonly error$ = this.blogRepository.error$;

  getSearchItems$(): Observable<readonly SiteSearchItem[]> {
    return combineLatest([
      this.blogRepository.getPublishedFullPosts$(),
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

function createBlogSearchItem(post: BlogPost, topicHubs: readonly TopicHub[]): SiteSearchItem {
  const bodyText = createBlogPostBodyText(post);
  const taxonomyTerms = getBlogTaxonomyTerms(post);
  const taxonomyText = [...taxonomyTerms, ...post.tags].join(' ');
  const authorText = [post.author.name, post.author.title, post.author.slug].filter(Boolean).join(' ');
  const titleText = post.title;
  const excerptText = post.excerpt;
  const topicHub = findTopicHubForBlogPost(post, taxonomyTerms, topicHubs);

  return {
    id: post.id,
    type: 'blog',
    title: post.title,
    excerpt: post.excerpt,
    path: `/${PATH_NAMES.BLOG}/${post.slug}`,
    titleText: normalizeSearchValue(titleText),
    excerptText: normalizeSearchValue(excerptText),
    taxonomyText: normalizeSearchValue(`${taxonomyText} ${authorText}`),
    bodyText: normalizeSearchValue(bodyText),
    searchText: normalizeSearchValue([
      titleText,
      excerptText,
      taxonomyText,
      authorText,
      bodyText,
      post.seo.title,
      post.seo.description,
    ].join(' ')),
    categories: taxonomyTerms,
    tags: post.tags,
    authorId: post.authorId,
    authorName: post.author.name,
    authorSlug: post.author.slug ?? 'colin-michaels',
    date: post.publishedAt ?? post.updatedAt,
    image: resolveBlogPostImage(post),
    ...(topicHub ? {topic: createSearchTopic(topicHub)} : {}),
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
      block.type === 'markdown' ? createBlogMarkdownPlainText(block.data.markdown) : block.data.markdown,
      ...getBlogListItemTexts(block.data),
      ...(block.data.stats ?? []).flatMap(stat => [stat.label, stat.value, stat.caption]),
      ...(block.data.chartPoints ?? []).flatMap(point => [point.label, point.note]),
      ...(block.data.labels ?? []),
      ...(block.data.datasets ?? []).map(dataset => dataset.label),
      block.data.xAxisTitle,
      block.data.yAxisTitle,
      block.data.sourceLabel,
      block.data.accessibilitySummary,
    ])
    .filter((value): value is string => typeof value === 'string')
    .join(' ');
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
    searchText: normalizeSearchValue([
      titleText,
      excerptText,
      taxonomyText,
      bodyText,
    ].join(' ')),
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
  post: BlogPost,
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
