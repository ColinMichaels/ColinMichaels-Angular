import {
  CAT_CORNER_SEO_METADATA,
  CAT_CORNER_UNLOCK_SEO_METADATA,
  CREATOR_PROFILE_URLS,
  GADGET_USEFULNESS_SCORECARD_SEO_METADATA,
  HOME_SEO_METADATA,
  PERSON_AWARDS,
  PERSON_KNOWS_ABOUT,
  PERSON_OCCUPATIONS,
  PERSON_PROFILE_DESCRIPTION,
  NOT_FOUND_SEO_METADATA,
  PERSON_SAME_AS,
  PERSONAL_AIRCRAFT_BUYER_VERIFICATION_SEO_METADATA,
  TAG_INDEX_MIN_POSTS,
  TAXONOMY_INDEX_MIN_POSTS,
  createBlogCategorySeoMetadata,
  createBlogTagSeoMetadata,
  createMissingBlogPostSeoMetadata,
} from './seo.metadata';
import {
  CALLE_13_AWARD_ALBUM,
  LATIN_GRAMMY_2006_BEST_URBAN_MUSIC_ALBUM_URL,
  MUSIC_CREDITS_ITEM_LIST,
} from './site-identity';

describe('SEO metadata policy', () => {
  it('uses one verified creator-profile contract in the homepage Person graph', () => {
    const graph = (HOME_SEO_METADATA.structuredData as {
      '@graph'?: readonly {
        '@type'?: string;
        award?: readonly string[];
        description?: string;
        hasOccupation?: typeof PERSON_OCCUPATIONS;
        knowsAbout?: readonly string[];
        sameAs?: readonly string[];
      }[];
    })['@graph'];
    const person = graph?.find(node => node['@type'] === 'Person');

    expect(CREATOR_PROFILE_URLS.instagram).toBe('https://www.instagram.com/colinmichaels/');
    expect(person?.sameAs).toEqual(PERSON_SAME_AS);
    expect(person?.sameAs).not.toContain('https://www.instagram.com/captaincolinfpv');
    expect(person?.award).toEqual(PERSON_AWARDS);
    expect(person?.description).toBe(PERSON_PROFILE_DESCRIPTION);
    expect(person?.description).toContain('recording and mixing engineer');
    expect(person?.hasOccupation).toEqual(PERSON_OCCUPATIONS);
    expect(person?.knowsAbout).toEqual(PERSON_KNOWS_ABOUT);
    expect(person?.knowsAbout).toContain(
      'Recording engineering, mixing, album production, and music production workflows',
    );
  });

  it('connects the award-winning Calle 13 album and the visible studio credits to the profile graph', () => {
    const graph = (HOME_SEO_METADATA.structuredData as {
      '@graph'?: readonly {
        '@id'?: string;
        '@type'?: string | readonly string[];
        creditText?: string;
        itemListElement?: readonly unknown[];
        numberOfItems?: number;
        subjectOf?: {url?: string};
      }[];
    })['@graph'];
    const calle13Album = graph?.find(node => node['@id'] === CALLE_13_AWARD_ALBUM['@id']);
    const credits = graph?.find(node => node['@id'] === MUSIC_CREDITS_ITEM_LIST['@id']);

    expect(calle13Album?.['@type']).toBe('MusicAlbum');
    expect(calle13Album?.creditText).toBe('Colin Michaels — Mixing Engineer');
    expect(calle13Album?.subjectOf?.url).toBe(LATIN_GRAMMY_2006_BEST_URBAN_MUSIC_ALBUM_URL);
    expect(credits?.['@type']).toBe('ItemList');
    expect(credits?.numberOfItems).toBe(33);
    expect(credits?.itemListElement?.length).toBe(33);
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
