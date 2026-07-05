import {Injectable, inject} from '@angular/core';
import {map, Observable} from 'rxjs';

import {DEFAULT_RECOMMENDED_LINKS} from '../recommended-links.data';
import {
  RecommendedLink,
  RecommendedLinkAdminStats,
  RecommendedLinkFeaturedSlot,
  RecommendedLinkStatus,
} from '../models/recommended-link.model';
import {
  isRecommendedLinkFeaturedSlot,
  isRecommendedLinkStatus,
} from '../utils/recommended-link-validation.util';
import {RecommendedLinkStorageService} from './recommended-link-storage.service';

export interface RecommendedLinksExportDocument {
  version: 1;
  source: 'colinmichaels-cms';
  collection: 'recommendedLinks';
  exportedAt: string;
  totalLinks: number;
  links: readonly RecommendedLink[];
}

export type RecommendedLinkDeleteResult = 'deleted-cms-recommended-link' | 'not-found';

function createRecommendedLinkId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return `recommended-link-${crypto.randomUUID()}`;
  }

  return `recommended-link-${Date.now().toString(36)}`;
}

function normalizeHref(value: string): string {
  const trimmedValue = value.trim();

  if (!trimmedValue) {
    return '';
  }

  return /^[a-z][a-z\d+.-]*:\/\//i.test(trimmedValue) ? trimmedValue : `https://${trimmedValue}`;
}

function createHostFromHref(href: string): string {
  try {
    return new URL(href).host.replace(/^www\./i, '');
  } catch {
    return href
      .replace(/^[a-z][a-z\d+.-]*:\/\//i, '')
      .replace(/^www\./i, '')
      .split('/')[0]
      .trim();
  }
}

function sortRecommendedLinks(left: RecommendedLink, right: RecommendedLink): number {
  return left.displayOrder - right.displayOrder
    || left.title.localeCompare(right.title)
    || left.id.localeCompare(right.id);
}

function sortFeaturedRecommendedLinks(left: RecommendedLink, right: RecommendedLink): number {
  return (left.featuredSlot ?? 999) - (right.featuredSlot ?? 999)
    || sortRecommendedLinks(left, right);
}

@Injectable({
  providedIn: 'root',
})
export class RecommendedLinkRepositoryService {
  private readonly storage = inject(RecommendedLinkStorageService);
  private readonly fallbackRecommendedLinks = DEFAULT_RECOMMENDED_LINKS;

  readonly loading$ = this.storage.loading$;
  readonly error$ = this.storage.error$;

  getFeaturedRecommendedLinks$(): Observable<readonly RecommendedLink[]> {
    return this.storage.links$.pipe(
      map(links => this.createFeaturedRecommendedLinks(links))
    );
  }

  getAdminRecommendedLinks$(): Observable<readonly RecommendedLink[]> {
    return this.storage.links$.pipe(
      map(links => this.createAdminRecommendedLinks(links))
    );
  }

  getAdminStats$(): Observable<RecommendedLinkAdminStats> {
    return this.storage.links$.pipe(
      map(links => this.createAdminStats(links))
    );
  }

  getFeaturedRecommendedLinks(): readonly RecommendedLink[] {
    return this.createFeaturedRecommendedLinks(this.storage.getLinks());
  }

  getAdminRecommendedLinks(): readonly RecommendedLink[] {
    return this.createAdminRecommendedLinks(this.storage.getLinks());
  }

  getAdminStats(): RecommendedLinkAdminStats {
    return this.createAdminStats(this.storage.getLinks());
  }

  createNewRecommendedLinkTemplate(): RecommendedLink {
    const now = new Date().toISOString();
    const nextDisplayOrder = this.getAdminRecommendedLinks()
      .reduce((highestOrder, link) => Math.max(highestOrder, link.displayOrder), 0) + 10;

    return {
      id: createRecommendedLinkId(),
      title: 'Untitled Link',
      description: '',
      meta: 'Resource',
      href: '',
      host: '',
      status: 'draft',
      featuredSlot: null,
      displayOrder: nextDisplayOrder,
      createdAt: now,
      updatedAt: now,
    };
  }

  async saveRecommendedLink(link: RecommendedLink): Promise<RecommendedLink> {
    const now = new Date().toISOString();
    const savedLink = this.normalizeRecommendedLink(link, now);
    const linksToSave: RecommendedLink[] = [savedLink];

    if (savedLink.featuredSlot !== null) {
      const displacedLinks = this.storage.getLinks()
        .filter(existingLink => existingLink.id !== savedLink.id && existingLink.featuredSlot === savedLink.featuredSlot)
        .map(existingLink => ({
          ...existingLink,
          featuredSlot: null,
          updatedAt: now,
        }));

      linksToSave.push(...displacedLinks);
    }

    await this.storage.saveRecommendedLinks(linksToSave);
    return savedLink;
  }

  createExportDocument(links: readonly RecommendedLink[] = this.getAdminRecommendedLinks()): RecommendedLinksExportDocument {
    return {
      version: 1,
      source: 'colinmichaels-cms',
      collection: 'recommendedLinks',
      exportedAt: new Date().toISOString(),
      totalLinks: links.length,
      links,
    };
  }

  backupRecommendedLinksToFirestore(links: readonly RecommendedLink[] = this.getAdminRecommendedLinks()): Promise<number> {
    return this.storage.backupRecommendedLinksToFirestore(links);
  }

  seedDefaultRecommendedLinks(): Promise<number> {
    return this.storage.backupRecommendedLinksToFirestore(DEFAULT_RECOMMENDED_LINKS);
  }

  loadRecommendedLinksFromFirestore(): Promise<readonly RecommendedLink[]> {
    return this.storage.loadRecommendedLinksFromFirestore();
  }

  loadPublishedRecommendedLinksFromFirestore(): Promise<readonly RecommendedLink[]> {
    return this.storage.loadPublishedRecommendedLinksFromFirestore();
  }

  async deleteRecommendedLink(linkId: string): Promise<RecommendedLinkDeleteResult> {
    const firestoreLink = this.storage.getLinks().find(link => link.id === linkId);

    if (!firestoreLink) {
      return 'not-found';
    }

    await this.storage.deleteRecommendedLink(linkId);
    return 'deleted-cms-recommended-link';
  }

  private normalizeRecommendedLink(link: RecommendedLink, now: string): RecommendedLink {
    const href = normalizeHref(link.href);
    const title = link.title.trim() || 'Untitled Link';
    const status: RecommendedLinkStatus = isRecommendedLinkStatus(link.status) ? link.status : 'draft';
    const featuredSlot: RecommendedLinkFeaturedSlot | null = isRecommendedLinkFeaturedSlot(link.featuredSlot)
      ? link.featuredSlot
      : null;

    return {
      ...link,
      title,
      description: link.description.trim(),
      meta: link.meta.trim() || 'Resource',
      href,
      host: link.host.trim() || createHostFromHref(href),
      status,
      featuredSlot,
      displayOrder: Number.isFinite(link.displayOrder) ? link.displayOrder : 999,
      createdAt: link.createdAt || now,
      updatedAt: now,
    };
  }

  private createFeaturedRecommendedLinks(links: readonly RecommendedLink[]): readonly RecommendedLink[] {
    const sourceLinks = links.length > 0 ? links : this.fallbackRecommendedLinks;

    return sourceLinks
      .filter(link => link.status === 'published' && link.featuredSlot !== null)
      .sort(sortFeaturedRecommendedLinks)
      .slice(0, 3);
  }

  private createAdminRecommendedLinks(links: readonly RecommendedLink[]): readonly RecommendedLink[] {
    return [...links].sort(sortRecommendedLinks);
  }

  private createAdminStats(links: readonly RecommendedLink[]): RecommendedLinkAdminStats {
    return {
      total: links.length,
      published: links.filter(link => link.status === 'published').length,
      drafts: links.filter(link => link.status === 'draft').length,
      archived: links.filter(link => link.status === 'archived').length,
      featured: links.filter(link => link.featuredSlot !== null).length,
    };
  }
}
