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
});
