import {createCampaignUrl} from './campaign-url.util';

describe('createCampaignUrl', () => {
  it('preserves the destination while replacing stale campaign fields', () => {
    expect(createCampaignUrl(
      'https://colinmichaels.com/blog/a-story?view=full&utm_source=old&utm_content=old#summary',
      {
        source: 'Facebook',
        medium: 'Organic social',
        campaign: 'Article launch',
      }
    )).toBe(
      'https://colinmichaels.com/blog/a-story?view=full&utm_source=facebook&utm_medium=organic_social&utm_campaign=article_launch#summary'
    );
  });

  it('normalizes campaign values without putting personal data in the URL', () => {
    const url = new URL(createCampaignUrl('https://colinmichaels.com/blog/a-story', {
      source: 'LinkedIn',
      medium: 'social share',
      campaign: 'Reader Share',
      content: 'A Story 2026!',
    }));

    expect(url.searchParams.get('utm_source')).toBe('linkedin');
    expect(url.searchParams.get('utm_medium')).toBe('social_share');
    expect(url.searchParams.get('utm_campaign')).toBe('reader_share');
    expect(url.searchParams.get('utm_content')).toBe('a_story_2026');
  });
});
