import {TOPIC_HUBS} from '../topic-hubs.data';
import {isTopicHub} from './topic-hub-validation.util';

describe('topic hub validation', () => {
  it('accepts legacy documents without optional presentation fields', () => {
    const legacyTopic = {...TOPIC_HUBS[0]} as Record<string, unknown>;
    delete legacyTopic['heroImage'];
    delete legacyTopic['pageCopy'];

    expect(isTopicHub(legacyTopic)).toBeTrue();
  });

  it('accepts the new image and page-copy fields', () => {
    expect(isTopicHub(TOPIC_HUBS[0])).toBeTrue();
  });

  it('rejects malformed optional presentation data', () => {
    const malformedTopic = {
      ...TOPIC_HUBS[0],
      heroImage: {
        src: '/assets/images/topics/example.webp',
        alt: 'Example',
        width: '1600',
        height: 900,
      },
    };

    expect(isTopicHub(malformedTopic)).toBeFalse();
  });
});
