import {Injectable, inject} from '@angular/core';

import {BlogPost} from '../../blog/models/blog-post.model';
import {HOME_SEO_METADATA} from '../../../shared/seo/seo.metadata';
import {SeoService} from '../../../shared/seo/seo.service';
import {HomepageHeroSettings} from '../models/homepage-hero.model';
import {
  appendSocialImageVersion,
  createHomepageSocialPreviewSelection,
} from '../utils/homepage-social-preview.util';

@Injectable({providedIn: 'root'})
export class HomepageSocialPreviewService {
  private readonly seo = inject(SeoService);

  apply(settings: HomepageHeroSettings, posts: readonly BlogPost[]): void {
    const selection = createHomepageSocialPreviewSelection(posts, settings);
    const compatibleImage = this.seo.toOpenGraphCompatibleImage(selection.image);

    this.seo.apply({
      ...HOME_SEO_METADATA,
      image: appendSocialImageVersion(compatibleImage, selection.versionSeed),
      imageAlt: selection.imageAlt,
      ...(selection.imageWidth ? {imageWidth: selection.imageWidth} : {}),
      ...(selection.imageHeight ? {imageHeight: selection.imageHeight} : {}),
    });
  }
}
