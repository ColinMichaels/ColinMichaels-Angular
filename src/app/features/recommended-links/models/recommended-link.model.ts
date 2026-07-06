export type RecommendedLinkStatus = 'draft' | 'published' | 'archived';
export type RecommendedLinkFeaturedSlot = 1 | 2 | 3;

export const RECOMMENDED_LINK_STATUSES: readonly RecommendedLinkStatus[] = ['draft', 'published', 'archived'];
export const RECOMMENDED_LINK_FEATURED_SLOTS: readonly RecommendedLinkFeaturedSlot[] = [1, 2, 3];

export interface RecommendedLink {
  id: string;
  title: string;
  description: string;
  meta: string;
  href: string;
  host: string;
  status: RecommendedLinkStatus;
  featuredSlot: RecommendedLinkFeaturedSlot | null;
  displayOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface RecommendedLinkAdminStats {
  total: number;
  published: number;
  drafts: number;
  archived: number;
  featured: number;
}
