import {Injectable, inject} from '@angular/core';
import {map, Observable} from 'rxjs';

import {
  getPublishedTopicHubs,
  sortTopicHubs,
  TOPIC_HUBS,
  TopicHub,
} from '../topic-hubs.data';
import {TopicHubStorageService} from './topic-hub-storage.service';

export interface TopicHubAdminStats {
  total: number;
  published: number;
  drafts: number;
  archived: number;
}

export interface TopicHubsExportDocument {
  version: 1;
  source: 'colinmichaels-cms';
  collection: 'topics';
  exportedAt: string;
  totalTopics: number;
  topics: readonly TopicHub[];
}

export type TopicHubDeleteResult = 'deleted-cms-topic' | 'not-found';

export function createTopicSlug(value: string): string {
  const slug = value
    .trim()
    .toLowerCase()
    .replace(/['"]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

  return slug || 'untitled-topic';
}

function createTopicId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return `topic-${crypto.randomUUID()}`;
  }

  return `topic-${Date.now().toString(36)}`;
}

function normalizeHexColor(value: string, fallback: string): string {
  const trimmedValue = value.trim();
  const fullHexMatch = /^#[0-9a-f]{6}$/i.test(trimmedValue);

  return fullHexMatch ? trimmedValue : fallback;
}

function hexToRgbChannels(value: string, fallback = '34 211 238'): string {
  const normalizedValue = normalizeHexColor(value, '#22d3ee').slice(1);
  const red = Number.parseInt(normalizedValue.slice(0, 2), 16);
  const green = Number.parseInt(normalizedValue.slice(2, 4), 16);
  const blue = Number.parseInt(normalizedValue.slice(4, 6), 16);

  if ([red, green, blue].some(channel => Number.isNaN(channel))) {
    return fallback;
  }

  return `${red} ${green} ${blue}`;
}

function clampNumber(value: number, minimum: number, maximum: number, fallback: number): number {
  if (!Number.isFinite(value)) {
    return fallback;
  }

  return Math.min(maximum, Math.max(minimum, value));
}

@Injectable({
  providedIn: 'root',
})
export class TopicHubRepositoryService {
  private readonly storage = inject(TopicHubStorageService);
  private readonly fallbackTopicHubs = getPublishedTopicHubs(TOPIC_HUBS);

  readonly loading$ = this.storage.loading$;
  readonly error$ = this.storage.error$;

  getPublishedTopicHubs$(): Observable<readonly TopicHub[]> {
    return this.storage.topics$.pipe(
      map(topics => this.createPublishedTopicHubs(topics))
    );
  }

  getPublishedTopicHubBySlug$(slug: string): Observable<TopicHub | undefined> {
    return this.getPublishedTopicHubs$().pipe(
      map(topics => topics.find(topicHub => topicHub.slug === slug))
    );
  }

  getAdminTopicHubs$(): Observable<readonly TopicHub[]> {
    return this.storage.topics$.pipe(
      map(topics => this.createAdminTopicHubs(topics))
    );
  }

  getAdminStats$(): Observable<TopicHubAdminStats> {
    return this.storage.topics$.pipe(
      map(topics => this.createAdminStats(topics))
    );
  }

  getPublishedTopicHubs(): readonly TopicHub[] {
    return this.createPublishedTopicHubs(this.storage.getTopics());
  }

  getPublishedTopicHubBySlug(slug: string): TopicHub | undefined {
    return this.getPublishedTopicHubs().find(topicHub => topicHub.slug === slug);
  }

  getAdminTopicHubs(): readonly TopicHub[] {
    return this.createAdminTopicHubs(this.storage.getTopics());
  }

  getAdminStats(): TopicHubAdminStats {
    return this.createAdminStats(this.storage.getTopics());
  }

  createNewTopicTemplate(): TopicHub {
    const now = new Date().toISOString();
    const nextDisplayOrder = this.getAdminTopicHubs()
      .reduce((highestOrder, topicHub) => Math.max(highestOrder, topicHub.displayOrder), 0) + 10;

    return {
      id: createTopicId(),
      slug: this.createUniqueSlug('untitled-topic'),
      eyebrow: 'Topic',
      title: 'Untitled Topic',
      description: '',
      summary: '',
      status: 'draft',
      displayOrder: nextDisplayOrder,
      terms: [],
      theme: {
        shortLabel: 'Topic',
        accent: '#22d3ee',
        accentStrong: '#67e8f9',
        accentRgb: '34 211 238',
        mapPlacement: {
          xPercent: 50,
          yPercent: 50,
          depth: 1,
          scale: 1,
          floatDelayMs: 0,
        },
        icon: 'spark',
        heroMotifs: [],
      },
      asset: {
        title: 'Start Here',
        intro: '',
        items: [],
      },
      featuredProject: {
        label: 'Featured project',
        title: '',
        description: '',
        href: '',
        ctaLabel: 'Open project',
      },
      learningPath: [],
      checklist: [],
      resources: [],
      createdAt: now,
      updatedAt: now,
    };
  }

  async saveTopicHub(topicHub: TopicHub): Promise<TopicHub> {
    const now = new Date().toISOString();
    const slug = this.createUniqueSlug(topicHub.slug || topicHub.title, topicHub.id);
    const accent = normalizeHexColor(topicHub.theme.accent, '#22d3ee');
    const accentStrong = normalizeHexColor(topicHub.theme.accentStrong, accent);
    const savedTopicHub: TopicHub = {
      ...topicHub,
      slug,
      title: topicHub.title.trim() || 'Untitled Topic',
      eyebrow: topicHub.eyebrow.trim() || 'Topic',
      description: topicHub.description.trim(),
      summary: topicHub.summary.trim() || topicHub.description.trim(),
      displayOrder: Number.isFinite(topicHub.displayOrder) ? topicHub.displayOrder : 999,
      terms: this.normalizeStringList(topicHub.terms),
      theme: {
        ...topicHub.theme,
        shortLabel: topicHub.theme.shortLabel.trim() || topicHub.title.trim() || 'Topic',
        accent,
        accentStrong,
        accentRgb: hexToRgbChannels(accent),
        mapPlacement: {
          xPercent: clampNumber(topicHub.theme.mapPlacement.xPercent, 0, 100, 50),
          yPercent: clampNumber(topicHub.theme.mapPlacement.yPercent, 0, 100, 50),
          depth: clampNumber(topicHub.theme.mapPlacement.depth, 0, 5, 1),
          scale: clampNumber(topicHub.theme.mapPlacement.scale, 0.5, 1.5, 1),
          floatDelayMs: clampNumber(topicHub.theme.mapPlacement.floatDelayMs, -20000, 20000, 0),
        },
        heroMotifs: this.normalizeStringList(topicHub.theme.heroMotifs),
      },
      asset: {
        ...topicHub.asset,
        title: topicHub.asset.title.trim() || 'Start Here',
        intro: topicHub.asset.intro.trim(),
        items: topicHub.asset.items
          .map(item => ({
            label: item.label.trim(),
            description: item.description.trim(),
          }))
          .filter(item => item.label || item.description),
      },
      featuredProject: {
        label: topicHub.featuredProject.label.trim() || 'Featured project',
        title: topicHub.featuredProject.title.trim(),
        description: topicHub.featuredProject.description.trim(),
        href: topicHub.featuredProject.href.trim(),
        ctaLabel: topicHub.featuredProject.ctaLabel.trim() || 'Open project',
      },
      learningPath: topicHub.learningPath
        .map(step => ({
          label: step.label.trim(),
          title: step.title.trim(),
          description: step.description.trim(),
        }))
        .filter(step => step.label || step.title || step.description),
      checklist: this.normalizeStringList(topicHub.checklist),
      resources: topicHub.resources
        .map(resource => ({
          label: resource.label.trim(),
          description: resource.description.trim(),
          href: resource.href.trim(),
        }))
        .filter(resource => resource.label || resource.description || resource.href),
      createdAt: topicHub.createdAt || now,
      updatedAt: now,
    };

    await this.storage.saveTopicHub(savedTopicHub);
    return savedTopicHub;
  }

  createExportDocument(topics: readonly TopicHub[] = this.getAdminTopicHubs()): TopicHubsExportDocument {
    return {
      version: 1,
      source: 'colinmichaels-cms',
      collection: 'topics',
      exportedAt: new Date().toISOString(),
      totalTopics: topics.length,
      topics,
    };
  }

  backupTopicHubsToFirestore(topics: readonly TopicHub[] = this.getAdminTopicHubs()): Promise<number> {
    return this.storage.backupTopicHubsToFirestore(topics);
  }

  seedDefaultTopicHubs(): Promise<number> {
    return this.storage.backupTopicHubsToFirestore(TOPIC_HUBS);
  }

  loadTopicHubsFromFirestore(): Promise<readonly TopicHub[]> {
    return this.storage.loadTopicHubsFromFirestore();
  }

  loadPublishedTopicHubsFromFirestore(): Promise<readonly TopicHub[]> {
    return this.storage.loadPublishedTopicHubsFromFirestore();
  }

  async deleteTopicHub(topicHubId: string): Promise<TopicHubDeleteResult> {
    const firestoreTopicHub = this.storage.getTopics().find(topicHub => topicHub.id === topicHubId);

    if (!firestoreTopicHub) {
      return 'not-found';
    }

    await this.storage.deleteTopicHub(topicHubId);
    return 'deleted-cms-topic';
  }

  createUniqueSlug(value: string, currentTopicHubId?: string): string {
    const baseSlug = createTopicSlug(value);
    const existingSlugs = new Set(
      this.storage.getTopics()
        .filter(topicHub => topicHub.id !== currentTopicHubId)
        .map(topicHub => topicHub.slug)
    );

    if (!existingSlugs.has(baseSlug)) {
      return baseSlug;
    }

    let suffix = 2;
    let nextSlug = `${baseSlug}-${suffix}`;

    while (existingSlugs.has(nextSlug)) {
      suffix += 1;
      nextSlug = `${baseSlug}-${suffix}`;
    }

    return nextSlug;
  }

  private createPublishedTopicHubs(topics: readonly TopicHub[]): readonly TopicHub[] {
    if (topics.length === 0) {
      return this.fallbackTopicHubs;
    }

    return getPublishedTopicHubs(topics);
  }

  private createAdminTopicHubs(topics: readonly TopicHub[]): readonly TopicHub[] {
    return sortTopicHubs(topics);
  }

  private createAdminStats(topics: readonly TopicHub[]): TopicHubAdminStats {
    return {
      total: topics.length,
      published: topics.filter(topicHub => topicHub.status === 'published').length,
      drafts: topics.filter(topicHub => topicHub.status === 'draft').length,
      archived: topics.filter(topicHub => topicHub.status === 'archived').length,
    };
  }

  private normalizeStringList(values: readonly string[]): readonly string[] {
    return [...new Set(values.map(value => value.trim()).filter(Boolean))];
  }
}
