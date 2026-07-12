export type HomepageHeroStatus = 'draft' | 'published';
export type HomepageHeroSlideStatus = 'draft' | 'published';
export type HomepageHeroFeaturedPostMode = 'featured' | 'selected';

export interface HomepageHeroSlide {
  id: string;
  imageUrl: string;
  storagePath?: string;
  mediaId?: string;
  altText: string;
  width?: number;
  height?: number;
  focalPointX: number;
  focalPointY: number;
  kenBurnsEnabled: boolean;
  sortOrder: number;
  status: HomepageHeroSlideStatus;
  createdAt: string;
  updatedAt: string;
}

export interface HomepageHeroSettings {
  id: 'home';
  status: HomepageHeroStatus;
  headlineLines: readonly string[];
  summary: string;
  featuredPostMode: HomepageHeroFeaturedPostMode;
  featuredPostId: string | null;
  useFeaturedPostBackground: boolean;
  slideshowEnabled: boolean;
  intervalMs: number;
  transitionMs: number;
  slides: readonly HomepageHeroSlide[];
  createdAt: string;
  updatedAt: string;
}

export interface HomepageHeroAdminStats {
  totalSlides: number;
  publishedSlides: number;
  draftSlides: number;
}
