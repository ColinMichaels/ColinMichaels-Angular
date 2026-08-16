import {
  BLOG_EVIDENCE_BASES,
  BlogEditorialMetadata,
  BlogEvidenceBasis,
} from '../models/blog-post.model';

export const BLOG_EVIDENCE_BASIS_LABELS: Readonly<Record<BlogEvidenceBasis, string>> = {
  'hands-on': 'Hands-on test',
  'first-person': 'First-person field notes',
  'researched': 'Researched analysis',
  'manufacturer-supplied': 'Manufacturer-supplied evidence',
  'mixed': 'Mixed evidence',
};

export const BLOG_EVIDENCE_BASIS_DESCRIPTIONS: Readonly<Record<BlogEvidenceBasis, string>> = {
  'hands-on': 'Colin personally used the product, process, aircraft, software, or location described.',
  'first-person': 'The article is based on Colin’s own project, flight, recovery experience, media, or documented workflow.',
  'researched': 'The article compares public evidence and does not claim hands-on testing unless a section says otherwise.',
  'manufacturer-supplied': 'Material claims or demonstrations came from the company responsible for the product and are not independent results.',
  'mixed': 'The article combines more than one evidence type; the evidence summary identifies which claims come from which basis.',
};

export function isBlogEvidenceBasis(value: unknown): value is BlogEvidenceBasis {
  return typeof value === 'string'
    && BLOG_EVIDENCE_BASES.includes(value as BlogEvidenceBasis);
}

export function isBlogEditorialSourceDate(value: unknown): value is string {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false;
  }

  const [year, month, day] = value.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));

  return date.getUTCFullYear() === year
    && date.getUTCMonth() === month - 1
    && date.getUTCDate() === day;
}

export function normalizeBlogEditorialMetadata(value: unknown): BlogEditorialMetadata | undefined {
  if (!isRecord(value)) {
    return undefined;
  }

  const evidenceBasis = isBlogEvidenceBasis(value['evidenceBasis'])
    ? value['evidenceBasis']
    : undefined;
  const evidenceSummary = normalizeOptionalText(value['evidenceSummary']);
  const sourceReviewedAt = isBlogEditorialSourceDate(value['sourceReviewedAt'])
    ? value['sourceReviewedAt']
    : undefined;
  const relationshipDisclosure = normalizeOptionalText(value['relationshipDisclosure']);
  const aiAssistanceDisclosure = normalizeOptionalText(value['aiAssistanceDisclosure']);
  const syntheticMediaDisclosure = normalizeOptionalText(value['syntheticMediaDisclosure']);
  const updateNote = normalizeOptionalText(value['updateNote']);

  if (!evidenceBasis
    && !evidenceSummary
    && !sourceReviewedAt
    && !relationshipDisclosure
    && !aiAssistanceDisclosure
    && !syntheticMediaDisclosure
    && !updateNote) {
    return undefined;
  }

  return {
    ...(evidenceBasis ? {evidenceBasis} : {}),
    ...(evidenceSummary ? {evidenceSummary} : {}),
    ...(sourceReviewedAt ? {sourceReviewedAt} : {}),
    ...(relationshipDisclosure ? {relationshipDisclosure} : {}),
    ...(aiAssistanceDisclosure ? {aiAssistanceDisclosure} : {}),
    ...(syntheticMediaDisclosure ? {syntheticMediaDisclosure} : {}),
    ...(updateNote ? {updateNote} : {}),
  };
}

function normalizeOptionalText(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() ? value.trim() : undefined;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
