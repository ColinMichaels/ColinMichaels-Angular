import {
  RecommendedLink,
  RecommendedLinkFeaturedSlot,
  RecommendedLinkStatus,
  RECOMMENDED_LINK_FEATURED_SLOTS,
  RECOMMENDED_LINK_STATUSES,
} from '../models/recommended-link.model';

const recommendedLinkStatusSet = new Set<string>(RECOMMENDED_LINK_STATUSES);
const recommendedLinkFeaturedSlotSet = new Set<number>(RECOMMENDED_LINK_FEATURED_SLOTS);

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

export function isRecommendedLinkStatus(value: unknown): value is RecommendedLinkStatus {
  return typeof value === 'string' && recommendedLinkStatusSet.has(value);
}

export function isRecommendedLinkFeaturedSlot(value: unknown): value is RecommendedLinkFeaturedSlot {
  return typeof value === 'number' && recommendedLinkFeaturedSlotSet.has(value);
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

function isFeaturedSlotValue(value: unknown): value is RecommendedLink['featuredSlot'] {
  return value === null || isRecommendedLinkFeaturedSlot(value);
}

export function isRecommendedLink(value: unknown): value is RecommendedLink {
  if (!isRecord(value)) {
    return false;
  }

  return typeof value['id'] === 'string'
    && typeof value['title'] === 'string'
    && typeof value['description'] === 'string'
    && typeof value['meta'] === 'string'
    && typeof value['href'] === 'string'
    && typeof value['host'] === 'string'
    && isRecommendedLinkStatus(value['status'])
    && isFeaturedSlotValue(value['featuredSlot'])
    && isFiniteNumber(value['displayOrder'])
    && typeof value['createdAt'] === 'string'
    && typeof value['updatedAt'] === 'string';
}
