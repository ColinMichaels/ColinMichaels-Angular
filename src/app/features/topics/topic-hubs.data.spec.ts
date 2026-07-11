import {
  createTopicHubSeoMetadata,
  findTopicHubBySlug,
  resolveTopicHubHeroImage,
  resolveTopicHubPageCopy,
  TOPIC_HUBS,
  type TopicHub,
} from './topic-hubs.data';

describe('topic hub presentation data', () => {
  it('provides distinct local artwork for every default topic', () => {
    const imagePaths = TOPIC_HUBS.map(topic => topic.heroImage?.src);

    expect(imagePaths.every(path => path?.startsWith('/assets/images/topics/'))).toBeTrue();
    expect(new Set(imagePaths).size).toBe(TOPIC_HUBS.length);
  });

  it('falls back to default presentation fields for legacy Firestore topics', () => {
    const defaultTopic = TOPIC_HUBS[0];
    const legacyTopic: TopicHub = {
      ...defaultTopic,
      slug: 'renamed-topic',
      heroImage: undefined,
      pageCopy: undefined,
    };

    expect(resolveTopicHubHeroImage(legacyTopic)).toEqual(defaultTopic.heroImage);
    expect(resolveTopicHubPageCopy(legacyTopic)).toEqual(defaultTopic.pageCopy!);
  });

  it('uses topic artwork in client SEO metadata', () => {
    const topic = TOPIC_HUBS[1];
    const metadata = createTopicHubSeoMetadata(topic);

    expect(metadata.image).toBe(topic.heroImage!.src);
    expect(metadata.imageAlt).toBe(topic.heroImage!.alt);
  });

  it('resolves a renamed CMS topic from its stable default ID', () => {
    const defaultTopic = TOPIC_HUBS[3];
    const renamedTopic: TopicHub = {...defaultTopic, slug: 'weekly-updates'};

    expect(findTopicHubBySlug('labs-projects', [renamedTopic])).toBe(renamedTopic);
    expect(findTopicHubBySlug('weekly-updates', [renamedTopic])).toBe(renamedTopic);
  });
});
