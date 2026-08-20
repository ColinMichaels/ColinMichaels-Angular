import {BlogPost} from '../../../features/blog/models/blog-post.model';
import {
  getEmbeddedBlogPostMediaPackageManifest,
  getUnresolvedBlogPostMediaPackageReferences,
  matchBlogPostPackageImageFiles,
  parseBlogPostMediaPackageManifest,
  replaceBlogPostMediaPackageReferences,
} from './blog-post-media-package.util';

function createPost(): BlogPost {
  return {
    id: 'package-post',
    slug: 'package-post',
    title: 'Package post',
    excerpt: 'A packaged post.',
    coverImage: 'media://images/cover.webp',
    backgroundImage: 'media://images/background.webp',
    thumbnailImage: 'media://images/thumb.webp',
    author: {name: 'Colin Michaels'},
    categories: ['Projects'],
    tags: ['Import'],
    status: 'draft',
    seo: {
      title: 'Package post',
      description: 'A packaged post.',
      openGraphImage: 'media://images/og.jpg',
    },
    og: {image: 'media://images/og.jpg'},
    contentFormat: 'editorjs',
    blocks: [
      {id: 'photo', type: 'image', data: {url: 'media://images/inline.webp', alt: 'Inline image'}},
      {
        id: 'gallery',
        type: 'gallery',
        data: {
          galleryImages: [
            {url: 'media://images/gallery.webp', alt: 'Gallery image'},
          ],
        },
      },
      {id: 'text', type: 'paragraph', data: {text: 'Keep media://images/inline.webp literal prose untouched.'}},
    ],
    createdAt: '2026-08-20T00:00:00.000Z',
    updatedAt: '2026-08-20T00:00:00.000Z',
    publishedAt: null,
  };
}

describe('blog post media package utilities', () => {
  const manifest = parseBlogPostMediaPackageManifest({
    images: [
      {file: 'images/cover.webp', role: 'cover', altText: 'Cover'},
      {file: 'images/background.webp', role: 'post-background'},
      {file: 'images/thumb.webp', role: 'thumbnail'},
      {file: 'images/og.jpg', role: 'open-graph'},
      {file: 'images/inline.webp', role: 'inline-image', alt: 'Inline'},
      {file: 'images/gallery.webp', role: 'inline-image'},
    ],
  });

  it('parses an inline manifest and provides stable media placeholders', () => {
    expect(getEmbeddedBlogPostMediaPackageManifest({imageManifest: {images: [{file: 'images/cover.webp'}]}}))
      .toEqual({
        images: [{
          file: 'images/cover.webp',
          reference: 'media://images/cover.webp',
          role: 'inline-image',
          altText: '',
        }],
      });
    expect(manifest.images[0].reference).toBe('media://images/cover.webp');
    expect(manifest.images[0].role).toBe('cover');
  });

  it('rejects unsafe and ambiguous manifest definitions', () => {
    expect(() => parseBlogPostMediaPackageManifest({images: [{file: '../cover.webp'}]}))
      .toThrowError(/safe relative package path/i);
    expect(() => parseBlogPostMediaPackageManifest({images: [
      {file: 'cover.webp'},
      {file: 'different.webp', reference: 'media://cover.webp'},
    ]})).toThrowError(/same media reference/i);
  });

  it('matches directory-picked files to manifest-relative paths', () => {
    const cover = new File(['cover'], 'cover.webp', {type: 'image/webp'});
    Object.defineProperty(cover, 'webkitRelativePath', {value: 'my-package/images/cover.webp'});

    const matches = matchBlogPostPackageImageFiles(
      parseBlogPostMediaPackageManifest({images: [{file: 'images/cover.webp'}]}),
      [cover]
    );

    expect(matches[0].file).toBe(cover);
  });

  it('fails before upload when a manifest-declared image is absent', () => {
    expect(() => matchBlogPostPackageImageFiles(manifest, [])).toThrowError(/missing the image/i);
  });

  it('replaces known media fields without rewriting article prose', () => {
    const post = createPost();
    const replacements = new Map(manifest.images.map(entry => [
      entry.reference,
      `https://storage.example/${entry.file}`,
    ]));

    const resolved = replaceBlogPostMediaPackageReferences(post, replacements);

    expect(resolved.coverImage).toBe('https://storage.example/images/cover.webp');
    expect(resolved.seo.openGraphImage).toBe('https://storage.example/images/og.jpg');
    expect(resolved.blocks[0].data.url).toBe('https://storage.example/images/inline.webp');
    expect(resolved.blocks[1].data.galleryImages?.[0].url).toBe('https://storage.example/images/gallery.webp');
    expect(resolved.blocks[2].data.text).toContain('media://images/inline.webp');
    expect(getUnresolvedBlogPostMediaPackageReferences(resolved)).toEqual([]);
  });
});
