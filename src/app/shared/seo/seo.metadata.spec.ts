import {
  CAT_CORNER_SEO_METADATA,
  CAT_CORNER_UNLOCK_SEO_METADATA,
  CREATOR_PROFILE_URLS,
  GADGET_USEFULNESS_SCORECARD_SEO_METADATA,
  HOME_SEO_METADATA,
  PERSON_AWARDS,
  PERSON_KNOWS_ABOUT,
  NOT_FOUND_SEO_METADATA,
  PERSON_SAME_AS,
  PERSONAL_AIRCRAFT_BUYER_VERIFICATION_SEO_METADATA,
  TAG_INDEX_MIN_POSTS,
  TAXONOMY_INDEX_MIN_POSTS,
  createBlogCategorySeoMetadata,
  createBlogTagSeoMetadata,
  createMissingBlogPostSeoMetadata,
} from './seo.metadata';

describe('SEO metadata policy', () => {
  it('uses one verified creator-profile contract in the homepage Person graph', () => {
    const graph = (HOME_SEO_METADATA.structuredData as {
      '@graph'?: readonly {
        '@type'?: string;
        award?: readonly string[];
        knowsAbout?: readonly string[];
        sameAs?: readonly string[];
      }[];
    })['@graph'];
    const person = graph?.find(node => node['@type'] === 'Person');

    expect(CREATOR_PROFILE_URLS.instagram).toBe('https://www.instagram.com/colinmichaels/');
    expect(person?.sameAs).toEqual(PERSON_SAME_AS);
    expect(person?.sameAs).not.toContain('https://www.instagram.com/captaincolinfpv');
    expect(person?.award).toEqual(PERSON_AWARDS);
    expect(person?.knowsAbout).toEqual(PERSON_KNOWS_ABOUT);
    expect(person?.knowsAbout).toContain(
      'Recording engineering, mixing, album production, and music production workflows',
    );
  });

  it('marks low-count category pages noindex while preserving higher-count category canonicals', () => {
    const lowCountMetadata = createBlogCategorySeoMetadata('Angular Firebase', TAXONOMY_INDEX_MIN_POSTS - 1);
    const indexableMetadata = createBlogCategorySeoMetadata('Angular Firebase', TAXONOMY_INDEX_MIN_POSTS);

    expect(lowCountMetadata.path).toBe('/blog/category/angular-firebase');
    expect(lowCountMetadata.robots).toBe('noindex,follow');
    expect(indexableMetadata.robots).toBeUndefined();
  });

  it('marks low-count tag pages noindex while preserving higher-count tag canonicals', () => {
    const lowCountMetadata = createBlogTagSeoMetadata('AI Workflow', TAG_INDEX_MIN_POSTS - 1);
    const indexableMetadata = createBlogTagSeoMetadata('AI Workflow', TAG_INDEX_MIN_POSTS);

    expect(lowCountMetadata.path).toBe('/blog/tag/ai-workflow');
    expect(lowCountMetadata.robots).toBe('noindex,follow');
    expect(indexableMetadata.robots).toBeUndefined();
  });

  it('keeps missing blog posts out of the index', () => {
    const metadata = createMissingBlogPostSeoMetadata('missing-post');

    expect(metadata.path).toBe('/blog/missing-post');
    expect(metadata.robots).toBe('noindex,nofollow');
  });

  it('keeps the client-side not-found route out of the index', () => {
    expect(NOT_FOUND_SEO_METADATA.title).toBe('Page not found | ColinMichaels.com');
    expect(NOT_FOUND_SEO_METADATA.path).toBe('/404');
    expect(NOT_FOUND_SEO_METADATA.robots).toBe('noindex,follow');
  });

  it('keeps both Cat Corner membership routes out of the index', () => {
    expect(CAT_CORNER_SEO_METADATA.path).toBe('/cat-corner');
    expect(CAT_CORNER_SEO_METADATA.robots).toBe('noindex,nofollow');
    expect(CAT_CORNER_UNLOCK_SEO_METADATA.path).toBe('/cat-corner/unlock');
    expect(CAT_CORNER_UNLOCK_SEO_METADATA.robots).toBe('noindex,nofollow');
  });

  it('publishes the buyer verification worksheet as a canonical WebPage', () => {
    expect(PERSONAL_AIRCRAFT_BUYER_VERIFICATION_SEO_METADATA.path)
      .toBe('/resources/personal-aircraft-buyer-verification');
    expect(PERSONAL_AIRCRAFT_BUYER_VERIFICATION_SEO_METADATA.title)
      .toBe('Personal Aircraft Buyer Verification | ColinMichaels.com');
    expect(PERSONAL_AIRCRAFT_BUYER_VERIFICATION_SEO_METADATA.robots).toBeUndefined();
    const structuredData = PERSONAL_AIRCRAFT_BUYER_VERIFICATION_SEO_METADATA.structuredData as { '@type'?: string };
    expect(structuredData['@type']).toBe('WebPage');
  });

  it('publishes the gadget usefulness scorecard as a canonical WebPage', () => {
    expect(GADGET_USEFULNESS_SCORECARD_SEO_METADATA.path)
      .toBe('/resources/gadget-usefulness-scorecard');
    expect(GADGET_USEFULNESS_SCORECARD_SEO_METADATA.title)
      .toBe('Gadget Usefulness Scorecard | ColinMichaels.com');
    expect(GADGET_USEFULNESS_SCORECARD_SEO_METADATA.robots).toBeUndefined();
    const structuredData = GADGET_USEFULNESS_SCORECARD_SEO_METADATA.structuredData as { '@type'?: string };
    expect(structuredData['@type']).toBe('WebPage');
  });
});
