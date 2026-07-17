import {UserRole} from '../../shared/user-account/user-account.model';

export interface AdminGuideLink {
  label: string;
  route: string;
}

export interface AdminGuideStep {
  text: string;
  link?: AdminGuideLink;
}

export interface AdminGuideEntry {
  category: AdminGuideCategoryId;
  featured?: boolean;
  id: string;
  keywords: readonly string[];
  links: readonly AdminGuideLink[];
  roles: readonly UserRole[];
  steps: readonly AdminGuideStep[];
  summary: string;
  title: string;
}

export type AdminGuideCategoryId =
  | 'getting-started'
  | 'publishing'
  | 'site-content'
  | 'media'
  | 'community'
  | 'administration';

export interface AdminGuideCategory {
  id: AdminGuideCategoryId;
  label: string;
}
