import {
  createTopicHubSeoMetadata,
  findTopicHubBySlug,
  getMissingDefaultTopicHubs,
  getPublishedTopicHubs,
  lockDefaultTopicHubIdentity,
  mergeMissingDefaultTopicHubs,
  resolveTopicHubHeroImage,
  resolveTopicHubHeroImages,
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

  it('pairs every default topic with a distinct local companion scene', () => {
    const imageSets = TOPIC_HUBS.map(topic => resolveTopicHubHeroImages(topic));
    const companionPaths = imageSets.map(images => images[1]?.src);

    expect(imageSets.every(images => images.length === 2)).toBeTrue();
    expect(companionPaths.every(path => path?.endsWith('-companion.webp'))).toBeTrue();
    expect(new Set(companionPaths).size).toBe(TOPIC_HUBS.length);
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
    expect(topic?.pageCopy?.featuredHeading).toBe('Is it actually useful?');
    expect(topic?.featuredProject.href).toBe('/resources/gadget-usefulness-scorecard');
    expect(topic?.resources).toContain(jasmine.objectContaining({
      label: 'Printable Gadget Usefulness Scorecard',
      href: '/resources/gadget-usefulness-scorecard',
    }));
    expect(createTopicHubSeoMetadata(topic!).path).toBe('/topics/gadgets-toys');
  });

  it('defines a distinct Drones and FPV discovery hub', () => {
    const topic = TOPIC_HUBS.find(defaultTopic => defaultTopic.id === 'topic-drones-fpv');

    expect(topic?.slug).toBe('drones-fpv');
    expect(topic?.status).toBe('published');
    expect(topic?.terms).toContain('fpv');
    expect(topic?.terms).toContain('drone');
    expect(topic?.theme.icon).toBe('flight');
    expect(topic?.heroImage?.src).toBe('/assets/images/topics/drones-fpv.webp');
    expect(topic?.resources).toContain(jasmine.objectContaining({
      label: 'Printable Drone Flight Field Notes',
      href: '/downloads/captain-colin-drone-flight-field-notes.pdf',
    }));
    expect(topic?.resources).toContain(jasmine.objectContaining({
      label: 'Personal Aircraft Buyer Verification',
      href: '/resources/personal-aircraft-buyer-verification',
    }));
    expect(topic?.resources).toContain(jasmine.objectContaining({
      label: 'FAA Recreational Flyers',
      href: 'https://www.faa.gov/uas/recreational_flyers',
    }));
    expect(topic?.resources).toContain(jasmine.objectContaining({
      label: 'FAA Remote ID',
      href: 'https://www.faa.gov/uas/getting_started/remote_id',
    }));
    expect(createTopicHubSeoMetadata(topic!).path).toBe('/topics/drones-fpv');
  });

  it('merges missing defaults and locks existing default IDs to their public identities', () => {
    const gadgetsTopic = TOPIC_HUBS.find(topic => topic.id === 'topic-gadgets-toys')!;
    const existingTopics = TOPIC_HUBS.filter(topic => topic.id !== gadgetsTopic.id);
    const renamedGadgetsTopic: TopicHub = {...gadgetsTopic, slug: 'my-gadget-shelf'};

    expect(getMissingDefaultTopicHubs(existingTopics)).toEqual([gadgetsTopic]);
    expect(mergeMissingDefaultTopicHubs(existingTopics)).toContain(gadgetsTopic);
    expect(getMissingDefaultTopicHubs([...existingTopics, renamedGadgetsTopic])).toEqual([]);
    expect(mergeMissingDefaultTopicHubs([...existingTopics, renamedGadgetsTopic]))
      .toContain(jasmine.objectContaining({id: gadgetsTopic.id, slug: gadgetsTopic.slug, title: gadgetsTopic.title}));
  });

  it('does not let a Firestore rename replace a crawlable default route', () => {
    const defaultTopic = TOPIC_HUBS[3];
    const renamedTopic: TopicHub = {
      ...defaultTopic,
      slug: 'weekly-updates',
      title: 'Weekly Updates',
      description: 'A conflicting topic description.',
      summary: 'A conflicting topic summary.',
      terms: ['weekly'],
      theme: {
        ...defaultTopic.theme,
        shortLabel: 'Updates',
      },
      status: 'archived',
    };
    const lockedTopic = lockDefaultTopicHubIdentity(renamedTopic);
    const mergedTopics = mergeMissingDefaultTopicHubs([renamedTopic]);

    expect(lockedTopic).toEqual(jasmine.objectContaining({
      id: defaultTopic.id,
      slug: defaultTopic.slug,
      title: defaultTopic.title,
      description: defaultTopic.description,
      summary: defaultTopic.summary,
      terms: defaultTopic.terms,
      theme: jasmine.objectContaining({
        shortLabel: defaultTopic.theme.shortLabel,
      }),
      status: defaultTopic.status,
    }));
    expect(findTopicHubBySlug('labs-projects', mergedTopics)?.id).toBe(defaultTopic.id);
    expect(findTopicHubBySlug('weekly-updates', mergedTopics)).toBeUndefined();
    expect(getPublishedTopicHubs(mergedTopics)).toContain(jasmine.objectContaining({
      id: defaultTopic.id,
      slug: defaultTopic.slug,
      status: 'published',
    }));
  });

  it('locks every bootstrap topic identity and public publication state', () => {
    for (const defaultTopic of TOPIC_HUBS) {
      const storedTopic: TopicHub = {
        ...defaultTopic,
        slug: `${defaultTopic.slug}-renamed`,
        eyebrow: 'Conflicting eyebrow',
        title: 'Conflicting public title',
        description: 'Conflicting public description.',
        summary: 'Conflicting public summary.',
        terms: ['conflicting-match-term'],
        theme: {
          ...defaultTopic.theme,
          shortLabel: 'Conflicting short label',
        },
        status: 'archived',
      };
      const lockedTopic = lockDefaultTopicHubIdentity(storedTopic);

      expect(lockedTopic).toEqual(jasmine.objectContaining({
        id: defaultTopic.id,
        slug: defaultTopic.slug,
        eyebrow: defaultTopic.eyebrow,
        title: defaultTopic.title,
        description: defaultTopic.description,
        summary: defaultTopic.summary,
        terms: defaultTopic.terms,
        theme: jasmine.objectContaining({
          shortLabel: defaultTopic.theme.shortLabel,
        }),
        status: defaultTopic.status,
      }));
    }
  });

  it('keeps code-defined public resources while preserving additive Firestore links', () => {
    const defaultTopic = TOPIC_HUBS.find(topic => topic.id === 'topic-gadgets-toys')!;
    const storedTopic: TopicHub = {
      ...defaultTopic,
      resources: [
        {
          label: 'Custom gadget archive',
          description: 'A CMS-managed supporting collection.',
          href: '/blog/tag/custom-gadgets',
        },
      ],
    };
    const lockedTopic = lockDefaultTopicHubIdentity(storedTopic);

    expect(lockedTopic.resources).toContain(jasmine.objectContaining({
      href: '/resources/gadget-usefulness-scorecard',
    }));
    expect(lockedTopic.resources).toContain(jasmine.objectContaining({
      href: '/blog/tag/custom-gadgets',
    }));
  });
});
