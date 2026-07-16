import type {SitePaginationViewOption} from '../../../shared/pagination/site-pagination.component';
import type {BlogPostListingLayout} from '../components/post-listing/blog-post-listing.component';

export type BlogArchiveView = 'list' | 'grid' | 'image-title';

export const BLOG_ARCHIVE_VIEW_OPTIONS: readonly SitePaginationViewOption[] = [
  {value: 'list', label: 'List', icon: 'list'},
  {value: 'grid', label: 'Grid', icon: 'grid'},
  {value: 'image-title', label: 'Image + title', icon: 'image-title'},
];

export function parseBlogArchiveView(
  value: string | null,
  fallback: BlogArchiveView
): BlogArchiveView {
  return BLOG_ARCHIVE_VIEW_OPTIONS.some(option => option.value === value)
    ? value as BlogArchiveView
    : fallback;
}

export function resolveBlogArchiveListingLayout(view: BlogArchiveView): BlogPostListingLayout {
  switch (view) {
    case 'list':
      return 'compact';
    case 'grid':
      return 'grid';
    default:
      return 'list';
  }
}
