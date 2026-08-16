import {DOCUMENT} from '@angular/common';
import {TestBed} from '@angular/core/testing';
import {Meta, Title} from '@angular/platform-browser';
import {ActivatedRoute, Router} from '@angular/router';
import {EMPTY} from 'rxjs';

import {HOMEPAGE_OG_IMAGE, SITE_URL} from './seo.metadata';
import {SeoService} from './seo.service';

describe('SeoService', () => {
  let service: SeoService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        SeoService,
        Meta,
        Title,
        {provide: DOCUMENT, useValue: document},
        {provide: Router, useValue: {events: EMPTY}},
        {provide: ActivatedRoute, useValue: {snapshot: {data: {}}, firstChild: null}},
      ],
    });

    service = TestBed.inject(SeoService);
  });

  it('uses a matching JPEG URL for local WebP Open Graph assets', () => {
    expect(service.toOpenGraphCompatibleImage('/assets/images/blog/example-og.webp')).toBe(
      `${SITE_URL}/assets/images/blog/example-og.jpg`
    );
  });

  it('falls back to the default JPEG image for non-local WebP Open Graph URLs', () => {
    expect(service.toOpenGraphCompatibleImage('https://storage.example.com/post-og.webp')).toBe(
      `${SITE_URL}${HOMEPAGE_OG_IMAGE}`
    );
  });

  it('normalizes BlogPosting URLs and mainEntityOfPage to absolute URLs', () => {
    const structuredData = service.createBlogPostingJsonLd({
      title: 'Canonical article',
      description: 'A canonical article description.',
      url: '/blog/canonical-article',
      image: `${SITE_URL}${HOMEPAGE_OG_IMAGE}`,
      author: 'Colin Michaels',
      publishedAt: '2026-07-19T12:00:00.000Z',
      modifiedAt: '2026-07-19T12:00:00.000Z',
      citations: [
        'https://www.faa.gov/uas',
        'https://www.faa.gov/uas',
        'javascript:alert(1)',
      ],
    });

    expect(String(structuredData['url'])).toBe(`${SITE_URL}/blog/canonical-article`);
    expect(JSON.stringify(structuredData['mainEntityOfPage'])).toBe(JSON.stringify({
      '@type': 'WebPage',
      '@id': `${SITE_URL}/blog/canonical-article`,
    }));
    expect(JSON.stringify(structuredData['citation'])).toBe(JSON.stringify(['https://www.faa.gov/uas']));
  });

  it('nests a complete YouTube VideoObject without claiming a direct content URL', () => {
    const structuredData = service.createBlogPostingJsonLd({
      title: 'Field flight',
      description: 'Article description.',
      url: '/blog/field-flight',
      image: `${SITE_URL}${HOMEPAGE_OG_IMAGE}`,
      author: 'Colin Michaels',
      publishedAt: '2026-08-15T12:00:00Z',
      modifiedAt: '2026-08-15T12:00:00Z',
      video: {
        name: 'Field flight video',
        description: 'The exact public companion video.',
        thumbnailUrl: ['https://i.ytimg.com/vi/L229QDxDakU/hqdefault.jpg'],
        uploadDate: '2026-08-13T13:43:21Z',
        embedUrl: 'https://www.youtube.com/embed/L229QDxDakU',
        url: 'https://www.youtube.com/watch?v=L229QDxDakU',
        duration: 'PT2M38S',
      },
    });
    const video = structuredData['video'];

    expect(JSON.parse(JSON.stringify(video))).toEqual(jasmine.objectContaining({
      '@type': 'VideoObject',
      name: 'Field flight video',
      uploadDate: '2026-08-13T13:43:21Z',
      embedUrl: 'https://www.youtube.com/embed/L229QDxDakU',
      duration: 'PT2M38S',
    }));
    expect(JSON.stringify(video)).not.toContain('contentUrl');
  });
});
