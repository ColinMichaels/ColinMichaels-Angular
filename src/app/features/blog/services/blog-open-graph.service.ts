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
import {BlogPost, isPublicBlogListingPost} from '../models/blog-post.model';
import {htmlToPlainText} from '../utils/blog-html.util';
import {resolveBlogPostImage} from '../utils/blog-image-url.util';

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
      robots: isPublicBlogListingPost(post) ? undefined : 'noindex,nofollow',
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
        authorUrl: `/authors/${post.author.slug || 'colin-michaels'}`,
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

  applyBlogCategory(category: string, postCount?: number): BlogShareMetadata {
    const metadata = createBlogCategorySeoMetadata(category, postCount);
    this.seo.apply(metadata);

    return this.toShareMetadata(metadata);
  }

  applyBlogTag(tag: string, postCount?: number): BlogShareMetadata {
    const metadata = createBlogTagSeoMetadata(tag, postCount);
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
      || resolveBlogPostImage(post)
      || this.findFirstImageBlockUrl(post)
      || HOMEPAGE_OG_IMAGE
    );
    const imageAlt = this.toPlainText(post.og?.imageAlt || this.findFirstImageBlockAlt(post) || `${post.title} preview image`);
    const url = this.seo.createUrl(`/${PATH_NAMES.BLOG}/${post.slug}`);
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
    for (const block of post.blocks) {
      if (block.type === 'image' && block.data.url) {
        return block.data.url;
      }

      const galleryUrl = block.type === 'gallery' ? block.data.galleryImages?.find(image => image.url)?.url : undefined;
      if (galleryUrl) {
        return galleryUrl;
      }
    }

    return '';
  }

  private findFirstImageBlockAlt(post: BlogPost): string {
    for (const block of post.blocks) {
      if (block.type === 'image' && block.data.alt) {
        return block.data.alt;
      }

      const galleryAlt = block.type === 'gallery' ? block.data.galleryImages?.find(image => image.alt)?.alt : undefined;
      if (galleryAlt) {
        return galleryAlt;
      }
    }

    return '';
  }

  private truncateDescription(value: string): string {
    const trimmedValue = value.trim();

    if (trimmedValue.length <= 300) {
      return trimmedValue;
    }

    return `${trimmedValue.slice(0, 297).trimEnd()}...`;
  }

  private toPlainText(value: string): string {
    return htmlToPlainText(this.document, value);
  }
}
