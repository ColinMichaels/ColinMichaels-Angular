import {TestBed} from '@angular/core/testing';

import {
  AUTH_RETURN_URL_MAX_AGE_MS,
  AUTH_RETURN_URL_STORAGE_KEY,
  AuthReturnUrlService,
  normalizeAuthReturnUrl,
} from './auth-return-url.service';

describe('AuthReturnUrlService', () => {
  let service: AuthReturnUrlService;

  beforeEach(() => {
    sessionStorage.clear();
    TestBed.configureTestingModule({});
    service = TestBed.inject(AuthReturnUrlService);
  });

  it('accepts internal post URLs with query parameters and fragments', () => {
    expect(normalizeAuthReturnUrl('/blog/shared-post?source=facebook#comments'))
      .toBe('/blog/shared-post?source=facebook#comments');
  });

  it('rejects external, protocol-relative, and authentication utility URLs', () => {
    expect(normalizeAuthReturnUrl('https://example.com/blog/post')).toBeNull();
    expect(normalizeAuthReturnUrl('//example.com/blog/post')).toBeNull();
    expect(normalizeAuthReturnUrl('/\\example.com/blog/post')).toBeNull();
    expect(normalizeAuthReturnUrl('/login?redirectUrl=/blog/post')).toBeNull();
    expect(normalizeAuthReturnUrl('/logout')).toBeNull();
  });

  it('restores a post destination after the provider callback loses the login query string', () => {
    service.rememberDestination('/blog/shared-post?source=google');

    expect(service.resolveDestination(null)).toBe('/blog/shared-post?source=google');
  });

  it('drops expired and malformed redirect state', () => {
    const expiredAt = new Date(Date.now() - AUTH_RETURN_URL_MAX_AGE_MS - 1).toISOString();
    sessionStorage.setItem(AUTH_RETURN_URL_STORAGE_KEY, JSON.stringify({
      url: '/blog/expired-post',
      createdAt: expiredAt,
    }));

    expect(service.resolveDestination(null)).toBeNull();
    expect(sessionStorage.getItem(AUTH_RETURN_URL_STORAGE_KEY)).toBeNull();

    sessionStorage.setItem(AUTH_RETURN_URL_STORAGE_KEY, '{invalid json');
    expect(service.resolveDestination(null)).toBeNull();
    expect(sessionStorage.getItem(AUTH_RETURN_URL_STORAGE_KEY)).toBeNull();
  });
});
