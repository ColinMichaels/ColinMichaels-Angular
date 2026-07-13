export type AuthorStatus = 'draft' | 'published';

export interface AuthorExternalProfile {
  label: string;
  url: string;
}
export interface AuthorProfile {
  id: string;
  slug: string;
  name: string;
  title: string;
  shortBio: string;
  bio: string;
  avatarUrl: string;
  imageAlt: string;
  location?: string;
  externalProfiles: readonly AuthorExternalProfile[];
  healthDisclaimer?: string;
  status: AuthorStatus;
  createdAt: string;
  updatedAt: string;
}

export interface AuthorStats {
  publishedPosts: number;
  totalWords: number;
  totalReadingMinutes: number;
  categoryCount: number;
  latestPublishedAt: string | null;
}
