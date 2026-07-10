import {BlogPost} from '../../../features/blog/models/blog-post.model';
import {SITE_URL} from '../../../shared/seo/seo.metadata';
import {createSeoChecklist} from '../utils/blog-seo-checklist';
import {ContentOperationPostAudit} from './content-operations.models';

export function createContentOperationPostAudit(post: BlogPost): ContentOperationPostAudit {
  const generatedCanonicalUrl = `${SITE_URL}/blog/${post.slug}`;
  const summary = createSeoChecklist({
    title: post.title,
    slug: post.slug,
    excerpt: post.excerpt,
    coverImage: post.coverImage,
    categories: post.categories,
    tags: post.tags,
    seoTitle: post.seo.title,
    seoDescription: post.seo.description,
    canonical: post.seo.canonical?.trim() || generatedCanonicalUrl,
    generatedCanonicalUrl,
    openGraphImage: post.seo.openGraphImage?.trim() || '',
    blocks: post.blocks,
  });
  const issues = summary.items.filter(item => item.status !== 'pass');

  return {
    failCount: summary.failCount,
    warningCount: summary.warningCount,
    issueCount: issues.length,
    issueIds: issues.map(item => item.id),
    status: summary.failCount > 0 ? 'fail' : summary.warningCount > 0 ? 'warning' : 'ok',
  };
}
