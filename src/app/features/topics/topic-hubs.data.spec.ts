import {
  createTopicHubSeoMetadata,
  findTopicHubBySlug,
  getMissingDefaultTopicHubs,
  mergeMissingDefaultTopicHubs,
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

  it('defines Gadgets & Toys as a published default topic with dedicated presentation data', () => {
    const topic = TOPIC_HUBS.find(defaultTopic => defaultTopic.id === 'topic-gadgets-toys');

    expect(topic?.slug).toBe('gadgets-toys');
    expect(topic?.title).toBe('Gadgets & Toys');
    expect(topic?.status).toBe('published');
    expect(topic?.theme.icon).toBe('gamepad');
    expect(topic?.heroImage?.src).toBe('/assets/images/topics/gadgets-toys.webp');
    expect(topic?.pageCopy?.featuredHeading).toBe('Gadgets worth a closer look');
    expect(createTopicHubSeoMetadata(topic!).path).toBe('/topics/gadgets-toys');
  });

  it('merges code defaults missing from an existing Firestore topic set without replacing matches', () => {
    const gadgetsTopic = TOPIC_HUBS.find(topic => topic.id === 'topic-gadgets-toys')!;
    const existingTopics = TOPIC_HUBS.filter(topic => topic.id !== gadgetsTopic.id);
    const renamedGadgetsTopic: TopicHub = {...gadgetsTopic, slug: 'my-gadget-shelf'};

    expect(getMissingDefaultTopicHubs(existingTopics)).toEqual([gadgetsTopic]);
    expect(mergeMissingDefaultTopicHubs(existingTopics)).toContain(gadgetsTopic);
    expect(getMissingDefaultTopicHubs([...existingTopics, renamedGadgetsTopic])).toEqual([]);
    expect(mergeMissingDefaultTopicHubs([...existingTopics, renamedGadgetsTopic]))
      .toContain(renamedGadgetsTopic);
  });

  it('resolves a renamed CMS topic from its stable default ID', () => {
    const defaultTopic = TOPIC_HUBS[3];
    const renamedTopic: TopicHub = {...defaultTopic, slug: 'weekly-updates'};

    expect(findTopicHubBySlug('labs-projects', [renamedTopic])).toBe(renamedTopic);
    expect(findTopicHubBySlug('weekly-updates', [renamedTopic])).toBe(renamedTopic);
  });
});
