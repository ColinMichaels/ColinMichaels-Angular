import {
  parseBlogArchiveView,
  resolveBlogArchiveListingLayout,
} from './blog-archive-view.util';

describe('blog archive view utilities', () => {
  it('parses supported views and falls back for unknown values', () => {
    expect(parseBlogArchiveView('grid', 'list')).toBe('grid');
    expect(parseBlogArchiveView('unknown', 'image-title')).toBe('image-title');
    expect(parseBlogArchiveView(null, 'list')).toBe('list');
  });

  it('maps archive views to existing reusable listing layouts', () => {
    expect(resolveBlogArchiveListingLayout('list')).toBe('compact');
    expect(resolveBlogArchiveListingLayout('grid')).toBe('grid');
    expect(resolveBlogArchiveListingLayout('image-title')).toBe('editorial');
  });
});
