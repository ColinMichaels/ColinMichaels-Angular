import {AuthGuard} from '../../guards/auth.guard';
import {
  CAT_CORNER_SEO_METADATA,
  CAT_CORNER_UNLOCK_SEO_METADATA,
} from '../../shared/seo/seo.metadata';
import {CatCornerAccessGuard} from './guards/cat-corner-access.guard';
import {catCornerRoutes} from './cat-corner.routes';

describe('catCornerRoutes', () => {
  it('keeps unlocking authenticated and soft-gates the hidden hub with a generic not-found fallback', () => {
    const root = catCornerRoutes[0];
    const unlock = root.children?.find(route => route.path === 'unlock');
    const hub = root.children?.find(route => route.path === '');
    const notFound = root.children?.find(route => route.path === '**');

    expect(root.path).toBe('cat-corner');
    expect(unlock?.canActivate).toContain(AuthGuard);
    expect(hub?.canMatch).toContain(CatCornerAccessGuard);
    expect(notFound?.loadComponent).toBeDefined();
  });

  it('keeps both exclusive routes out of search indexing', () => {
    expect(CAT_CORNER_SEO_METADATA.robots).toBe('noindex,nofollow');
    expect(CAT_CORNER_UNLOCK_SEO_METADATA.robots).toBe('noindex,nofollow');
  });
});
