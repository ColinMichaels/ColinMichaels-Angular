import {
  hasDisallowedInlineUrlProtocol,
  isBlogHttpUrl,
  isBlogMediaUrl,
  isBlogNavigationUrl,
  isBlogSitePath,
} from './blog-url-policy.util';

describe('blog URL policy', () => {
  it('accepts only absolute HTTP(S) external URLs', () => {
    expect(isBlogHttpUrl('https://example.com/story')).toBeTrue();
    expect(isBlogHttpUrl('http://localhost:4200/story')).toBeTrue();
    expect(isBlogHttpUrl('//example.com/story')).toBeFalse();
    expect(isBlogHttpUrl('javascript:alert(1)')).toBeFalse();
  });

  it('allows bounded site paths for media without allowing protocol-relative URLs', () => {
    expect(isBlogSitePath('/assets/images/story.webp')).toBeTrue();
    expect(isBlogSitePath('assets/images/story.webp')).toBeTrue();
    expect(isBlogMediaUrl('/assets/images/story.webp')).toBeTrue();
    expect(isBlogMediaUrl('https://firebasestorage.googleapis.com/story.webp')).toBeTrue();
    expect(isBlogMediaUrl('//example.com/story.webp')).toBeFalse();
  });

  it('allows safe internal author links without allowing active or protocol-relative URLs', () => {
    expect(isBlogNavigationUrl('/authors/colin-michaels')).toBeTrue();
    expect(isBlogNavigationUrl('https://example.com/authors/colin')).toBeTrue();
    expect(isBlogNavigationUrl('//example.com/authors/colin')).toBeFalse();
    expect(isBlogNavigationUrl('javascript:alert(1)')).toBeFalse();
  });

  it('detects active URL protocols inside rendered rich content', () => {
    expect(hasDisallowedInlineUrlProtocol('<a href="javascript:alert(1)">bad</a>')).toBeTrue();
    expect(hasDisallowedInlineUrlProtocol('<a href="https://example.com">good</a>')).toBeFalse();
  });
});
