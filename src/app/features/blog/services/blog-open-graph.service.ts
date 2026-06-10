import {DOCUMENT} from '@angular/common';
import {Injectable, inject} from '@angular/core';
import {Meta, Title} from '@angular/platform-browser';

import {PATH_NAMES} from '../../../app-route-paths';
import {BlogPost} from '../models/blog-post.model';
import {createBlogCategorySlug} from '../utils/blog-category-url.util';

export interface BlogShareMetadata {
  title: string;
  description: string;
  url: string;
  image: string;
  imageAlt: string;
}

const SITE_NAME = 'ColinMichaels.com';
const BLOG_TITLE = 'Blog | ColinMichaels.com';
const BLOG_DESCRIPTION = 'Notes on frontend engineering, Angular architecture, Firebase, CMS workflows, and web systems.';
const DEFAULT_IMAGE = '/assets/images/backgrounds/night.webp';
const DEFAULT_LOCALE = 'en_US';

@Injectable({
  providedIn: 'root',
})
export class BlogOpenGraphService {
  private readonly document = inject(DOCUMENT);
  private readonly meta = inject(Meta);
  private readonly title = inject(Title);

  applyBlogPost(post: BlogPost): BlogShareMetadata {
    const metadata = this.createBlogPostMetadata(post);
    const publishedAt = post.publishedAt ?? post.updatedAt;

    this.title.setTitle(metadata.title);
    this.setCanonicalUrl(metadata.url);
    this.applyBaseMetadata(metadata, 'article');
    this.updatePropertyTag('article:published_time', publishedAt);
    this.updatePropertyTag('article:modified_time', post.updatedAt);
    this.updatePropertyTag('article:author', post.author.name);

    if (post.categories[0]) {
      this.updatePropertyTag('article:section', post.categories[0]);
    } else {
      this.removeTag("property='article:section'");
    }

    this.clearArticleTags();
    post.tags.forEach(tag => this.meta.addTag({property: 'article:tag', content: tag}));

    return metadata;
  }

  applyBlogIndex(): BlogShareMetadata {
    const metadata: BlogShareMetadata = {
      title: BLOG_TITLE,
      description: BLOG_DESCRIPTION,
      url: this.createRouteUrl(PATH_NAMES.BLOG),
      image: this.toAbsoluteUrl(DEFAULT_IMAGE),
      imageAlt: 'Colin Michaels blog',
    };

    this.title.setTitle(metadata.title);
    this.setCanonicalUrl(metadata.url);
    this.applyBaseMetadata(metadata, 'website');
    this.clearArticleMetadata();

    return metadata;
  }

  applyBlogCategory(category: string): BlogShareMetadata {
    const categoryTitle = this.toPlainText(category || 'Blog Category');
    const metadata: BlogShareMetadata = {
      title: `${categoryTitle} Posts | ColinMichaels.com`,
      description: `Published Colin Michaels blog posts in the ${categoryTitle} category.`,
      url: this.createRouteUrl(`${PATH_NAMES.BLOG}/category/${createBlogCategorySlug(categoryTitle)}`),
      image: this.toAbsoluteUrl(DEFAULT_IMAGE),
      imageAlt: `${categoryTitle} blog category`,
    };

    this.title.setTitle(metadata.title);
    this.setCanonicalUrl(metadata.url);
    this.applyBaseMetadata(metadata, 'website');
    this.clearArticleMetadata();

    return metadata;
  }

  applyMissingBlogPost(slug: string): void {
    const title = 'Post not found | ColinMichaels.com';
    const metadata: BlogShareMetadata = {
      title,
      description: 'This post is unavailable or has not been published.',
      url: this.createRouteUrl(`${PATH_NAMES.BLOG}/${slug}`),
      image: this.toAbsoluteUrl(DEFAULT_IMAGE),
      imageAlt: 'Colin Michaels blog',
    };

    this.title.setTitle(title);
    this.setCanonicalUrl(metadata.url);
    this.applyBaseMetadata(metadata, 'website');
    this.clearArticleMetadata();
  }

  createBlogPostMetadata(post: BlogPost): BlogShareMetadata {
    const title = this.toPlainText(post.seo.title || post.title);
    const description = this.truncateDescription(this.toPlainText(post.seo.description || post.excerpt));
    const image = this.toAbsoluteUrl(post.seo.openGraphImage || this.findFirstImageBlockUrl(post) || post.coverImage || DEFAULT_IMAGE);
    const imageAlt = this.toPlainText(this.findFirstImageBlockAlt(post) || `${post.title} cover image`);
    const url = post.seo.canonical ? this.toAbsoluteUrl(post.seo.canonical) : this.createRouteUrl(`${PATH_NAMES.BLOG}/${post.slug}`);

    return {
      title,
      description,
      url,
      image,
      imageAlt,
    };
  }

  clearArticleMetadata(): void {
    this.removeTag("property='article:published_time'");
    this.removeTag("property='article:modified_time'");
    this.removeTag("property='article:author'");
    this.removeTag("property='article:section'");
    this.clearArticleTags();
  }

  private applyBaseMetadata(metadata: BlogShareMetadata, type: 'article' | 'website'): void {
    this.updateNameTag('description', metadata.description);
    this.updatePropertyTag('og:site_name', SITE_NAME);
    this.updatePropertyTag('og:locale', DEFAULT_LOCALE);
    this.updatePropertyTag('og:title', metadata.title);
    this.updatePropertyTag('og:description', metadata.description);
    this.updatePropertyTag('og:type', type);
    this.updatePropertyTag('og:url', metadata.url);
    this.updatePropertyTag('og:image', metadata.image);
    this.updatePropertyTag('og:image:secure_url', metadata.image);
    this.updatePropertyTag('og:image:alt', metadata.imageAlt);
    this.updatePropertyTag('og:image:type', this.getImageMimeType(metadata.image));
    this.updateNameTag('twitter:card', 'summary_large_image');
    this.updateNameTag('twitter:title', metadata.title);
    this.updateNameTag('twitter:description', metadata.description);
    this.updateNameTag('twitter:image', metadata.image);
    this.updateNameTag('twitter:image:alt', metadata.imageAlt);
  }

  private updateNameTag(name: string, content: string): void {
    this.meta.updateTag({name, content});
  }

  private updatePropertyTag(property: string, content: string): void {
    this.meta.updateTag({property, content});
  }

  private removeTag(selector: string): void {
    this.meta.removeTag(selector);
  }

  private clearArticleTags(): void {
    this.document.head
      .querySelectorAll<HTMLMetaElement>('meta[property="article:tag"]')
      .forEach(tag => this.meta.removeTagElement(tag));
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

  private createRouteUrl(path: string): string {
    const normalizedPath = path.replace(/^\/+/, '');
    return `${this.document.location.origin}${this.getBasePath()}#/${normalizedPath}`;
  }

  private toAbsoluteUrl(value: string): string {
    const trimmedValue = value.trim();

    if (!trimmedValue) {
      return this.toAbsoluteUrl(DEFAULT_IMAGE);
    }

    if (trimmedValue.startsWith('#/')) {
      return `${this.document.location.origin}${this.getBasePath()}${trimmedValue}`;
    }

    try {
      return new URL(trimmedValue, `${this.document.location.origin}${this.getBasePath()}`).toString();
    } catch {
      return trimmedValue;
    }
  }

  private getBasePath(): string {
    const pathname = this.document.location.pathname || '/';
    const normalizedPathname = pathname.endsWith('/index.html')
      ? pathname.slice(0, -'index.html'.length)
      : pathname;

    return normalizedPathname.endsWith('/') ? normalizedPathname : `${normalizedPathname}/`;
  }

  private findFirstImageBlockUrl(post: BlogPost): string {
    return post.blocks.find(block => block.type === 'image' && block.data.url)?.data.url ?? '';
  }

  private findFirstImageBlockAlt(post: BlogPost): string {
    return post.blocks.find(block => block.type === 'image' && block.data.alt)?.data.alt ?? '';
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

  private truncateDescription(value: string): string {
    const trimmedValue = value.trim();

    if (trimmedValue.length <= 300) {
      return trimmedValue;
    }

    return `${trimmedValue.slice(0, 297).trimEnd()}...`;
  }

  private toPlainText(value: string): string {
    const element = this.document.createElement('div');
    element.innerHTML = value;

    return element.textContent?.trim() ?? value.trim();
  }
}
