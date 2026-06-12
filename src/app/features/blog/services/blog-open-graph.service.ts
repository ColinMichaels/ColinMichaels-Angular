import {DOCUMENT} from '@angular/common';
import {Injectable, inject} from '@angular/core';

import {PATH_NAMES} from '../../../app-route-paths';
import {
  BLOG_INDEX_SEO_METADATA,
  BLOG_SEARCH_SEO_METADATA,
  HOMEPAGE_OG_IMAGE,
  createBlogCategorySeoMetadata,
  createBlogTagSeoMetadata,
  createMissingBlogPostSeoMetadata,
} from '../../../shared/seo/seo.metadata';
import {SeoService} from '../../../shared/seo/seo.service';
import {BlogPost} from '../models/blog-post.model';

export interface BlogShareMetadata {
  title: string;
  description: string;
  url: string;
  image: string;
  imageAlt: string;
  imageWidth: number;
  imageHeight: number;
}

const DEFAULT_OG_IMAGE_WIDTH = 1200;
const DEFAULT_OG_IMAGE_HEIGHT = 630;

@Injectable({
  providedIn: 'root',
})
export class BlogOpenGraphService {
  private readonly document = inject(DOCUMENT);
  private readonly seo = inject(SeoService);

  applyBlogPost(post: BlogPost): BlogShareMetadata {
    const metadata = this.createBlogPostMetadata(post);
    const publishedAt = post.publishedAt ?? post.updatedAt;

    this.seo.apply({
      title: metadata.title,
      description: metadata.description,
      path: `/${PATH_NAMES.BLOG}/${post.slug}`,
      image: metadata.image,
      imageAlt: metadata.imageAlt,
      imageWidth: metadata.imageWidth,
      imageHeight: metadata.imageHeight,
      type: 'article',
      article: {
        publishedAt,
        modifiedAt: post.updatedAt,
        author: post.author.name,
        section: post.categories[0],
        tags: post.tags,
      },
      structuredData: this.seo.createBlogPostingJsonLd({
        title: metadata.title,
        description: metadata.description,
        url: metadata.url,
        image: metadata.image,
        author: post.author.name,
        publishedAt: post.publishedAt,
        modifiedAt: post.updatedAt,
      }),
    });

    return metadata;
  }

  applyBlogIndex(): BlogShareMetadata {
    const metadata = this.toShareMetadata(BLOG_INDEX_SEO_METADATA);
    this.seo.apply(BLOG_INDEX_SEO_METADATA);

    return metadata;
  }

  applyBlogSearch(): BlogShareMetadata {
    const metadata = this.toShareMetadata(BLOG_SEARCH_SEO_METADATA);
    this.seo.apply(BLOG_SEARCH_SEO_METADATA);

    return metadata;
  }

  applyBlogCategory(category: string): BlogShareMetadata {
    const metadata = createBlogCategorySeoMetadata(category);
    this.seo.apply(metadata);

    return this.toShareMetadata(metadata);
  }

  applyBlogTag(tag: string): BlogShareMetadata {
    const metadata = createBlogTagSeoMetadata(tag);
    this.seo.apply(metadata);

    return this.toShareMetadata(metadata);
  }

  applyMissingBlogPost(slug: string): void {
    this.seo.apply(createMissingBlogPostSeoMetadata(slug));
  }

  createBlogPostMetadata(post: BlogPost): BlogShareMetadata {
    const title = this.toPlainText(post.og?.title || post.seo.title || post.seo.metaTitle || post.title);
    const description = this.truncateDescription(this.toPlainText(
      post.og?.description || post.seo.description || post.seo.metaDescription || post.excerpt
    ));
    const image = this.seo.toOpenGraphCompatibleImage(
      post.seo.openGraphImage
      || post.og?.image
      || post.thumbnailImage
      || post.coverImage
      || this.findFirstImageBlockUrl(post)
      || HOMEPAGE_OG_IMAGE
    );
    const imageAlt = this.toPlainText(post.og?.imageAlt || this.findFirstImageBlockAlt(post) || `${post.title} preview image`);
    const url = post.seo.canonical ? this.seo.toAbsoluteUrl(post.seo.canonical) : this.seo.createUrl(`/${PATH_NAMES.BLOG}/${post.slug}`);
    const imageWidth = post.seo.openGraphImageWidth ?? post.og?.imageWidth ?? DEFAULT_OG_IMAGE_WIDTH;
    const imageHeight = post.seo.openGraphImageHeight ?? post.og?.imageHeight ?? DEFAULT_OG_IMAGE_HEIGHT;

    return {
      title,
      description,
      url,
      image,
      imageAlt,
      imageWidth,
      imageHeight,
    };
  }

  private toShareMetadata(metadata: {
    title: string;
    description: string;
    path: string;
    image: string;
    imageAlt: string;
    imageWidth?: number;
    imageHeight?: number;
  }): BlogShareMetadata {
    return {
      title: metadata.title,
      description: metadata.description,
      url: this.seo.createUrl(metadata.path),
      image: this.seo.toAbsoluteUrl(metadata.image),
      imageAlt: metadata.imageAlt,
      imageWidth: metadata.imageWidth ?? DEFAULT_OG_IMAGE_WIDTH,
      imageHeight: metadata.imageHeight ?? DEFAULT_OG_IMAGE_HEIGHT,
    };
  }

  private findFirstImageBlockUrl(post: BlogPost): string {
    return post.blocks.find(block => block.type === 'image' && block.data.url)?.data.url ?? '';
  }

  private findFirstImageBlockAlt(post: BlogPost): string {
    return post.blocks.find(block => block.type === 'image' && block.data.alt)?.data.alt ?? '';
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
