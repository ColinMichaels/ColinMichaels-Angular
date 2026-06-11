import {DOCUMENT} from '@angular/common';
import {Injectable, inject} from '@angular/core';
import {Meta, Title} from '@angular/platform-browser';
import {ActivatedRoute, NavigationEnd, Router} from '@angular/router';
import {filter} from 'rxjs/operators';

import {DEFAULT_LOCALE, SITE_NAME, SITE_URL} from './seo.metadata';
import {SeoMetadata, SeoStructuredDataObject} from './seo.model';

const jsonLdScriptId = 'seo-json-ld';

@Injectable({
  providedIn: 'root',
})
export class SeoService {
  private initialized = false;
  private readonly document = inject(DOCUMENT);
  private readonly meta = inject(Meta);
  private readonly title = inject(Title);
  private readonly router = inject(Router);
  private readonly activatedRoute = inject(ActivatedRoute);

  initializeRouteTracking(): void {
    if (this.initialized) {
      return;
    }

    this.initialized = true;
    this.applyActiveRouteSeo();
    this.router.events
      .pipe(filter((event): event is NavigationEnd => event instanceof NavigationEnd))
      .subscribe(() => this.applyActiveRouteSeo());
  }

  apply(metadata: SeoMetadata): void {
    const url = this.createUrl(metadata.path);
    const image = this.toAbsoluteUrl(metadata.image);
    const type = metadata.type ?? 'website';

    this.title.setTitle(metadata.title);
    this.setCanonicalUrl(url);
    this.updateNameTag('description', metadata.description);
    this.updateNameTag('robots', metadata.robots ?? 'index,follow');
    this.updatePropertyTag('og:site_name', SITE_NAME);
    this.updatePropertyTag('og:locale', DEFAULT_LOCALE);
    this.updatePropertyTag('og:title', metadata.title);
    this.updatePropertyTag('og:description', metadata.description);
    this.updatePropertyTag('og:type', type);
    this.updatePropertyTag('og:url', url);
    this.updatePropertyTag('og:image', image);
    this.updatePropertyTag('og:image:secure_url', image);
    this.updatePropertyTag('og:image:alt', metadata.imageAlt);
    this.updatePropertyTag('og:image:type', this.getImageMimeType(image));
    this.updatePropertyTag('og:image:width', '1200');
    this.updatePropertyTag('og:image:height', '630');
    this.updateNameTag('twitter:card', 'summary_large_image');
    this.updateNameTag('twitter:title', metadata.title);
    this.updateNameTag('twitter:description', metadata.description);
    this.updateNameTag('twitter:image', image);
    this.updateNameTag('twitter:image:alt', metadata.imageAlt);

    if (type === 'article' && metadata.article) {
      this.applyArticleMetadata(metadata.article);
    } else {
      this.clearArticleMetadata();
    }

    this.updateStructuredData(metadata.structuredData ?? null);
  }

  createUrl(path: string): string {
    const normalizedPath = path.trim().replace(/^\/+/, '');

    return normalizedPath ? `${SITE_URL}/${normalizedPath}` : SITE_URL;
  }

  toAbsoluteUrl(value: string): string {
    const trimmedValue = value.trim();

    if (!trimmedValue) {
      return this.createUrl('');
    }

    try {
      return new URL(trimmedValue, SITE_URL).toString();
    } catch {
      return trimmedValue;
    }
  }

  createBlogPostingJsonLd(options: {
    title: string;
    description: string;
    url: string;
    image: string;
    author: string;
    publishedAt: string | null;
    modifiedAt: string;
  }): SeoStructuredDataObject {
    return {
      '@context': 'https://schema.org',
      '@type': 'BlogPosting',
      headline: options.title,
      description: options.description,
      url: options.url,
      image: [options.image],
      datePublished: options.publishedAt ?? options.modifiedAt,
      dateModified: options.modifiedAt,
      author: {
        '@type': 'Person',
        name: options.author,
        url: SITE_URL,
      },
      publisher: {
        '@type': 'Person',
        name: 'Colin Michaels',
        url: SITE_URL,
      },
      mainEntityOfPage: {
        '@type': 'WebPage',
        '@id': options.url,
      },
    };
  }

  private applyActiveRouteSeo(): void {
    const metadata = this.getDeepestSeoMetadata(this.activatedRoute);

    if (metadata) {
      this.apply(metadata);
    }
  }

  private getDeepestSeoMetadata(route: ActivatedRoute): SeoMetadata | null {
    let current: ActivatedRoute | null = route;
    let metadata: SeoMetadata | null = null;

    while (current) {
      const candidate = current.snapshot.data['seo'];

      if (this.isSeoMetadata(candidate)) {
        metadata = candidate;
      }

      current = current.firstChild;
    }

    return metadata;
  }

  private isSeoMetadata(value: unknown): value is SeoMetadata {
    return typeof value === 'object'
      && value !== null
      && typeof (value as SeoMetadata).title === 'string'
      && typeof (value as SeoMetadata).description === 'string'
      && typeof (value as SeoMetadata).path === 'string'
      && typeof (value as SeoMetadata).image === 'string'
      && typeof (value as SeoMetadata).imageAlt === 'string';
  }

  private applyArticleMetadata(article: NonNullable<SeoMetadata['article']>): void {
    this.updateOptionalPropertyTag('article:published_time', article.publishedAt);
    this.updateOptionalPropertyTag('article:modified_time', article.modifiedAt);
    this.updateOptionalPropertyTag('article:author', article.author);
    this.updateOptionalPropertyTag('article:section', article.section);
    this.clearArticleTags();
    article.tags?.forEach(tag => this.meta.addTag({property: 'article:tag', content: tag}));
  }

  private clearArticleMetadata(): void {
    this.removeTag("property='article:published_time'");
    this.removeTag("property='article:modified_time'");
    this.removeTag("property='article:author'");
    this.removeTag("property='article:section'");
    this.clearArticleTags();
  }

  private clearArticleTags(): void {
    this.document.head
      .querySelectorAll<HTMLMetaElement>('meta[property="article:tag"]')
      .forEach(tag => this.meta.removeTagElement(tag));
  }

  private updateStructuredData(data: SeoMetadata['structuredData'] | null): void {
    const existingScript = this.document.getElementById(jsonLdScriptId);

    if (!data) {
      existingScript?.remove();
      return;
    }

    const script = existingScript ?? this.document.createElement('script');
    script.id = jsonLdScriptId;
    script.setAttribute('type', 'application/ld+json');
    script.textContent = JSON.stringify(data);

    if (!existingScript) {
      this.document.head.appendChild(script);
    }
  }

  private setCanonicalUrl(url: string): void {
    const canonicalLink = this.getOrCreateCanonicalLink();
    canonicalLink.href = url;
  }

  private getOrCreateCanonicalLink(): HTMLLinkElement {
    const existingLink = this.document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]');

    if (existingLink) {
      return existingLink;
    }

    const link = this.document.createElement('link');
    link.rel = 'canonical';
    this.document.head.appendChild(link);

    return link;
  }

  private updateNameTag(name: string, content: string): void {
    this.meta.updateTag({name, content});
  }

  private updatePropertyTag(property: string, content: string): void {
    this.meta.updateTag({property, content});
  }

  private updateOptionalPropertyTag(property: string, content: string | undefined): void {
    if (content) {
      this.updatePropertyTag(property, content);
      return;
    }

    this.removeTag(`property='${property}'`);
  }

  private removeTag(selector: string): void {
    this.meta.removeTag(selector);
  }

  private getImageMimeType(imageUrl: string): string {
    const pathname = this.parseUrlPathname(imageUrl);

    if (pathname.endsWith('.jpg') || pathname.endsWith('.jpeg')) {
      return 'image/jpeg';
    }

    if (pathname.endsWith('.png')) {
      return 'image/png';
    }

    if (pathname.endsWith('.gif')) {
      return 'image/gif';
    }

    if (pathname.endsWith('.svg')) {
      return 'image/svg+xml';
    }

    if (pathname.endsWith('.avif')) {
      return 'image/avif';
    }

    return 'image/webp';
  }

  private parseUrlPathname(value: string): string {
    try {
      return decodeURIComponent(new URL(value).pathname).toLowerCase();
    } catch {
      return value.split('?')[0].split('#')[0].toLowerCase();
    }
  }
}
