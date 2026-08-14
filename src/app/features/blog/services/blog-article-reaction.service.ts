import {DOCUMENT, isPlatformBrowser} from '@angular/common';
import {Injectable, PLATFORM_ID, inject} from '@angular/core';

export const BLOG_ARTICLE_REACTIONS = [
  'useful',
  'surprising',
  'more_like_this',
  'not_for_me',
] as const;

export type BlogArticleReaction = typeof BLOG_ARTICLE_REACTIONS[number];

const ARTICLE_REACTION_STORAGE_KEY = 'cm-blog-article-reactions-v1';

@Injectable({providedIn: 'root'})
export class BlogArticleReactionService {
  private readonly document = inject(DOCUMENT);
  private readonly platformId = inject(PLATFORM_ID);

  getReaction(slug: string): BlogArticleReaction | null {
    return this.readReactions()[this.normalizeSlug(slug)] ?? null;
  }

  setReaction(slug: string, reaction: BlogArticleReaction): void {
    const storage = this.getStorage();
    const normalizedSlug = this.normalizeSlug(slug);
    if (!storage || !normalizedSlug) {
      return;
    }

    try {
      storage.setItem(ARTICLE_REACTION_STORAGE_KEY, JSON.stringify({
        ...this.readReactions(),
        [normalizedSlug]: reaction,
      }));
    } catch {
      // Reader feedback remains usable even when storage is unavailable or full.
    }
  }

  private readReactions(): Readonly<Record<string, BlogArticleReaction>> {
    const storage = this.getStorage();
    if (!storage) {
      return {};
    }

    try {
      const parsed = JSON.parse(storage.getItem(ARTICLE_REACTION_STORAGE_KEY) ?? '{}') as Record<string, unknown>;
      return Object.fromEntries(
        Object.entries(parsed).filter((entry): entry is [string, BlogArticleReaction] => (
          BLOG_ARTICLE_REACTIONS.includes(entry[1] as BlogArticleReaction)
        ))
      );
    } catch {
      return {};
    }
  }

  private getStorage(): Storage | null {
    if (!isPlatformBrowser(this.platformId)) {
      return null;
    }

    try {
      return this.document.defaultView?.localStorage ?? null;
    } catch {
      return null;
    }
  }

  private normalizeSlug(slug: string): string {
    return slug.trim().toLowerCase();
  }
}
