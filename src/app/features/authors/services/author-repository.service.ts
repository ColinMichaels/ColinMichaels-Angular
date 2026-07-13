import {Injectable, inject} from '@angular/core';
import {map, Observable} from 'rxjs';

import {DEFAULT_AUTHOR_ID, DEFAULT_AUTHOR_PROFILE, createAuthorSlug} from '../authors.constants';
import {AuthorProfile} from '../models/author.model';
import {AuthorStorageService} from './author-storage.service';

@Injectable({providedIn: 'root'})
export class AuthorRepositoryService {
  private readonly storage = inject(AuthorStorageService);
  readonly loading$ = this.storage.loading$;
  readonly error$ = this.storage.error$;

  getAuthors$(): Observable<readonly AuthorProfile[]> {
    return this.storage.authors$.pipe(map(authors => this.withDefaultAuthor(authors)));
  }

  getPublishedAuthors$(): Observable<readonly AuthorProfile[]> {
    return this.getAuthors$().pipe(map(authors => authors.filter(author => author.status === 'published')));
  }

  getAuthorById(id: string): AuthorProfile | undefined {
    return this.withDefaultAuthor(this.storage.getAuthors()).find(author => author.id === id);
  }

  getAuthorBySlug$(slug: string): Observable<AuthorProfile | undefined> {
    const normalizedSlug = createAuthorSlug(slug);
    return this.getAuthors$().pipe(map(authors => authors.find(author => author.slug === normalizedSlug)));
  }

  createNewAuthorTemplate(): AuthorProfile {
    const now = new Date().toISOString();
    const uniqueId = typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
      ? crypto.randomUUID()
      : Date.now().toString(36);
    return {
      id: `author-${uniqueId}`,
      slug: 'new-author',
      name: '',
      title: '',
      shortBio: '',
      bio: '',
      avatarUrl: '',
      imageAlt: '',
      externalProfiles: [],
      status: 'draft',
      createdAt: now,
      updatedAt: now,
    };
  }

  async saveAuthor(author: AuthorProfile): Promise<AuthorProfile> {
    const name = author.name.trim();
    if (!name) {
      throw new Error('Author name is required.');
    }

    const slug = createAuthorSlug(author.slug || name);
    const duplicate = this.withDefaultAuthor(this.storage.getAuthors())
      .find(candidate => candidate.slug === slug && candidate.id !== author.id);
    if (duplicate) {
      throw new Error(`The author slug "${slug}" is already in use.`);
    }

    if (author.status === 'published' && !author.shortBio.trim()) {
      throw new Error('A short bio is required before publishing an author.');
    }

    const externalProfiles = author.externalProfiles
      .map(profile => ({label: profile.label.trim(), url: profile.url.trim()}))
      .filter(profile => profile.label && profile.url);
    if (externalProfiles.some(profile => !isSafeExternalProfileUrl(profile.url))) {
      throw new Error('External profile links must use an http or https URL.');
    }

    const saved: AuthorProfile = {
      ...author,
      slug,
      name,
      title: author.title.trim(),
      shortBio: author.shortBio.trim(),
      bio: author.bio.trim(),
      avatarUrl: author.avatarUrl.trim(),
      imageAlt: author.imageAlt.trim() || `${name} portrait`,
      location: author.location?.trim() || undefined,
      healthDisclaimer: author.healthDisclaimer?.trim() || undefined,
      externalProfiles,
      updatedAt: new Date().toISOString(),
    };

    await this.storage.saveAuthor(saved);
    return saved;
  }

  private withDefaultAuthor(authors: readonly AuthorProfile[]): readonly AuthorProfile[] {
    const byId = new Map(authors.map(author => [author.id, author]));
    if (!byId.has(DEFAULT_AUTHOR_ID)) {
      byId.set(DEFAULT_AUTHOR_ID, DEFAULT_AUTHOR_PROFILE);
    }

    return [...byId.values()].sort((left, right) => left.name.localeCompare(right.name));
  }
}

function isSafeExternalProfileUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}
