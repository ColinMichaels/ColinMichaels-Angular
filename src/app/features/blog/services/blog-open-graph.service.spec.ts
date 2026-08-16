import {DOCUMENT} from '@angular/common';
import {TestBed} from '@angular/core/testing';

import {SeoService} from '../../../shared/seo/seo.service';
import {BlogPost} from '../models/blog-post.model';
import {BlogOpenGraphService} from './blog-open-graph.service';

function createPost(catCorner?: BlogPost['catCorner']): BlogPost {
  return {
    id: 'cat-corner-seo-post',
    slug: 'cat-corner-seo-post',
    title: 'Cat Corner SEO Post',
    excerpt: 'A Cat Corner article.',
    coverImage: '/assets/images/cat-corner/gretchen-easter-egg.png',
    author: {name: 'Gretchen'},
    categories: ['Cats'],
    tags: ['Gretchen'],
    status: 'published',
    seo: {
      title: 'Cat Corner SEO Post',
      description: 'A Cat Corner article.',
    },
    contentFormat: 'editorjs',
    blocks: [],
    ...(catCorner ? {catCorner} : {}),
    createdAt: '2026-07-12T12:00:00.000Z',
    updatedAt: '2026-07-12T12:00:00.000Z',
    publishedAt: '2026-07-12T12:00:00.000Z',
  };
}

describe('BlogOpenGraphService Cat Corner indexing', () => {
  let service: BlogOpenGraphService;
  let seo: jasmine.SpyObj<SeoService>;

  beforeEach(() => {
    seo = jasmine.createSpyObj<SeoService>('SeoService', [
      'apply',
      'createBlogPostingJsonLd',
      'toOpenGraphCompatibleImage',
      'toAbsoluteUrl',
      'createUrl',
    ]);
    seo.createUrl.and.callFake(path => `https://www.colinmichaels.com${path}`);
    seo.toAbsoluteUrl.and.callFake(value => value.startsWith('http') ? value : `https://www.colinmichaels.com${value}`);
    seo.toOpenGraphCompatibleImage.and.callFake(value => `https://www.colinmichaels.com${value}`);
    seo.createBlogPostingJsonLd.and.returnValue({'@context': 'https://schema.org', '@type': 'BlogPosting'});

    TestBed.configureTestingModule({
      providers: [
        BlogOpenGraphService,
        {provide: DOCUMENT, useValue: document},
        {provide: SeoService, useValue: seo},
      ],
    });

    service = TestBed.inject(BlogOpenGraphService);
  });

  it('marks non-discovery Cat Corner articles noindex,nofollow', () => {
    service.applyBlogPost(createPost({enabled: true, discoveryPost: false}));

    expect(seo.apply).toHaveBeenCalledWith(jasmine.objectContaining({
      robots: 'noindex,nofollow',
    }));
  });

  it('leaves normal and discovery articles indexable', () => {
    service.applyBlogPost(createPost());
    service.applyBlogPost(createPost({enabled: true, discoveryPost: true}));

    const firstMetadata = seo.apply.calls.argsFor(0)[0];
    const secondMetadata = seo.apply.calls.argsFor(1)[0];

    expect(firstMetadata.robots).toBeUndefined();
    expect(secondMetadata.robots).toBeUndefined();
  });

  it('uses the route canonical for structured data when stored canonical data is stale', () => {
    const post = createPost();
    post.seo.canonical = '/blog/legacy-slug';

    service.applyBlogPost(post);

    expect(seo.createBlogPostingJsonLd).toHaveBeenCalledWith(jasmine.objectContaining({
      url: 'https://www.colinmichaels.com/blog/cat-corner-seo-post',
    }));
  });

  it('uses the consolidated category identity for article metadata', () => {
    const post = createPost();
    post.categories = ['Cat Corner', 'Cats & Pets'];

    service.applyBlogPost(post);

    expect(seo.apply).toHaveBeenCalledWith(jasmine.objectContaining({
      article: jasmine.objectContaining({section: 'Cats & Pets'}),
    }));
  });

  it('adds only explicit external article references to BlogPosting schema', () => {
    const post = createPost();
    post.blocks = [{
      id: 'references',
      type: 'paragraph',
      data: {
        text: 'Use <a href="https://www.faa.gov/uas">FAA guidance</a> and <a href="/blog/next-story">the next story</a>.',
      },
    }];

    service.applyBlogPost(post);

    expect(seo.createBlogPostingJsonLd).toHaveBeenCalledWith(jasmine.objectContaining({
      citations: ['https://www.faa.gov/uas'],
    }));
  });

  it('passes only a complete exact companion video into BlogPosting schema', () => {
    const post = createPost();
    post.blocks = [{
      id: 'companion',
      type: 'embed',
      data: {
        provider: 'youtube',
        url: 'https://youtu.be/L229QDxDakU',
        isCompanionVideo: true,
        videoTitle: 'Field flight',
        videoDescription: 'The exact public companion video.',
        videoUploadDate: '2026-08-13T13:43:21Z',
        videoDurationSeconds: 158,
      },
    }];

    service.applyBlogPost(post);

    expect(seo.createBlogPostingJsonLd).toHaveBeenCalledWith(jasmine.objectContaining({
      video: {
        name: 'Field flight',
        description: 'The exact public companion video.',
        thumbnailUrl: ['https://i.ytimg.com/vi/L229QDxDakU/hqdefault.jpg'],
        uploadDate: '2026-08-13T13:43:21Z',
        embedUrl: 'https://www.youtube.com/embed/L229QDxDakU',
        url: 'https://www.youtube.com/watch?v=L229QDxDakU',
        duration: 'PT2M38S',
      },
    }));
  });
});
