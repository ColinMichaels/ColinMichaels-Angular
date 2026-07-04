import {
  TopicHub,
  TopicHubAsset,
  TopicHubAssetItem,
  TopicHubFeaturedProject,
  TopicHubIcon,
  TopicHubLearningStep,
  TopicHubMapPlacement,
  TopicHubResource,
  TopicHubStatus,
  TopicHubTheme,
  TOPIC_HUB_ICONS,
  TOPIC_HUB_STATUSES,
} from '../topic-hubs.data';

const topicHubStatusSet = new Set<string>(TOPIC_HUB_STATUSES);
const topicHubIconSet = new Set<string>(TOPIC_HUB_ICONS);

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

export function isStringArray(value: unknown): value is readonly string[] {
  return Array.isArray(value) && value.every(item => typeof item === 'string');
}

export function isTopicHubStatus(value: unknown): value is TopicHubStatus {
  return typeof value === 'string' && topicHubStatusSet.has(value);
}

export function isTopicHubIcon(value: unknown): value is TopicHubIcon {
  return typeof value === 'string' && topicHubIconSet.has(value);
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

function isTopicHubMapPlacement(value: unknown): value is TopicHubMapPlacement {
  return isRecord(value)
    && isFiniteNumber(value['xPercent'])
    && isFiniteNumber(value['yPercent'])
    && isFiniteNumber(value['depth'])
    && isFiniteNumber(value['scale'])
    && isFiniteNumber(value['floatDelayMs']);
}

function isTopicHubTheme(value: unknown): value is TopicHubTheme {
  return isRecord(value)
    && typeof value['shortLabel'] === 'string'
    && typeof value['accent'] === 'string'
    && typeof value['accentStrong'] === 'string'
    && typeof value['accentRgb'] === 'string'
    && isTopicHubMapPlacement(value['mapPlacement'])
    && isTopicHubIcon(value['icon'])
    && isStringArray(value['heroMotifs']);
}

function isTopicHubAssetItem(value: unknown): value is TopicHubAssetItem {
  return isRecord(value)
    && typeof value['label'] === 'string'
    && typeof value['description'] === 'string';
}

function isTopicHubAsset(value: unknown): value is TopicHubAsset {
  return isRecord(value)
    && typeof value['title'] === 'string'
    && typeof value['intro'] === 'string'
    && Array.isArray(value['items'])
    && value['items'].every(isTopicHubAssetItem);
}

function isTopicHubFeaturedProject(value: unknown): value is TopicHubFeaturedProject {
  return isRecord(value)
    && typeof value['label'] === 'string'
    && typeof value['title'] === 'string'
    && typeof value['description'] === 'string'
    && typeof value['href'] === 'string'
    && typeof value['ctaLabel'] === 'string';
}

function isTopicHubLearningStep(value: unknown): value is TopicHubLearningStep {
  return isRecord(value)
    && typeof value['label'] === 'string'
    && typeof value['title'] === 'string'
    && typeof value['description'] === 'string';
}

function isTopicHubResource(value: unknown): value is TopicHubResource {
  return isRecord(value)
    && typeof value['label'] === 'string'
    && typeof value['description'] === 'string'
    && typeof value['href'] === 'string';
}

export function isTopicHub(value: unknown): value is TopicHub {
  if (!isRecord(value)) {
    return false;
  }

  return typeof value['id'] === 'string'
    && typeof value['slug'] === 'string'
    && typeof value['eyebrow'] === 'string'
    && typeof value['title'] === 'string'
    && typeof value['description'] === 'string'
    && typeof value['summary'] === 'string'
    && isTopicHubStatus(value['status'])
    && isFiniteNumber(value['displayOrder'])
    && isStringArray(value['terms'])
    && isTopicHubTheme(value['theme'])
    && isTopicHubAsset(value['asset'])
    && isTopicHubFeaturedProject(value['featuredProject'])
    && Array.isArray(value['learningPath'])
    && value['learningPath'].every(isTopicHubLearningStep)
    && isStringArray(value['checklist'])
    && Array.isArray(value['resources'])
    && value['resources'].every(isTopicHubResource)
    && typeof value['createdAt'] === 'string'
    && typeof value['updatedAt'] === 'string';
}
