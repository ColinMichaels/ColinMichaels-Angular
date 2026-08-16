import {readdir, readFile} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const REPOSITORY_ROOT = fileURLToPath(new URL('..', import.meta.url));
const CONTENT_PACKAGES_ROOT = path.join(REPOSITORY_ROOT, 'docs', 'CONTENT_PACKAGES');

const EVIDENCE_BASES = new Set([
  'hands-on',
  'first-person',
  'researched',
  'manufacturer-supplied',
  'mixed',
]);
const EDITORIAL_KEYS = new Set([
  'evidenceBasis',
  'evidenceSummary',
  'sourceReviewedAt',
  'relationshipDisclosure',
  'aiAssistanceDisclosure',
  'syntheticMediaDisclosure',
  'updateNote',
]);
const MEDIA_BLOCK_TYPES = new Set(['embed', 'gallery', 'image']);
const TEXT_LIMITS = {
  evidenceSummary: 1200,
  relationshipDisclosure: 1200,
  aiAssistanceDisclosure: 1200,
  syntheticMediaDisclosure: 1200,
  updateNote: 1000,
};

function isRecord(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function isRealDateOnly(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false;
  }

  const [year, month, day] = value.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year
    && date.getUTCMonth() === month - 1
    && date.getUTCDate() === day;
}

function isVideoUploadDate(value) {
  if (isRealDateOnly(value)) {
    return true;
  }

  return typeof value === 'string'
    && /^\d{4}-\d{2}-\d{2}T.+(?:Z|[+-]\d{2}:\d{2})$/.test(value.trim())
    && Number.isFinite(Date.parse(value));
}

function validateCompanionVideos(post, label) {
  const errors = [];
  const companions = (Array.isArray(post?.blocks) ? post.blocks : []).filter(block => (
    isRecord(block)
    && block.type === 'embed'
    && isRecord(block.data)
    && block.data.isCompanionVideo === true
  ));

  if (companions.length > 1) {
    errors.push(`${label}: exactly one YouTube companion may be selected`);
  }

  for (const companion of companions) {
    const data = companion.data;
    if (data.provider !== 'youtube') {
      errors.push(`${label}: selected companion must use the YouTube provider`);
    }
    if (typeof data.videoTitle !== 'string' || !data.videoTitle.trim()) {
      errors.push(`${label}: selected companion needs an exact public videoTitle`);
    }
    if (typeof data.videoDescription !== 'string' || !data.videoDescription.trim()) {
      errors.push(`${label}: selected companion needs a factual videoDescription`);
    }
    if (!isVideoUploadDate(data.videoUploadDate)) {
      errors.push(`${label}: selected companion needs a real ISO videoUploadDate`);
    }
    if (typeof data.videoDurationSeconds !== 'number'
      || !Number.isFinite(data.videoDurationSeconds)
      || data.videoDurationSeconds <= 0) {
      errors.push(`${label}: selected companion needs a positive videoDurationSeconds runtime`);
    }
  }

  return errors;
}

function collectStrings(value, output) {
  if (typeof value === 'string') {
    output.push(value);
    return;
  }

  if (Array.isArray(value)) {
    for (const item of value) {
      collectStrings(item, output);
    }
    return;
  }

  if (isRecord(value)) {
    for (const item of Object.values(value)) {
      collectStrings(item, output);
    }
  }
}

function normalizeExternalUrl(candidate) {
  try {
    const url = new URL(candidate.replaceAll('&amp;', '&'));
    if (url.protocol !== 'http:' && url.protocol !== 'https:') {
      return null;
    }

    const hostname = url.hostname.toLowerCase().replace(/^www\./, '');
    if (hostname === 'colinmichaels.com') {
      return null;
    }

    url.hash = '';
    return url.toString();
  } catch {
    return null;
  }
}

function collectExternalReferenceUrls(blocks) {
  const candidates = [];

  for (const block of Array.isArray(blocks) ? blocks : []) {
    if (!isRecord(block) || MEDIA_BLOCK_TYPES.has(block.type)) {
      continue;
    }

    const strings = [];
    collectStrings(block.data, strings);
    for (const value of strings) {
      for (const match of value.matchAll(/https?:\/\/[^\s<>"')\]]+/giu)) {
        candidates.push(match[0]);
      }
    }
  }

  return [...new Set(candidates.map(normalizeExternalUrl).filter(Boolean))];
}

function validateEditorial(post, filePath) {
  const errors = [];
  const label = `${path.relative(REPOSITORY_ROOT, filePath)} :: ${post?.slug ?? 'unknown post'}`;
  const editorial = post?.editorial;

  if (!isRecord(editorial)) {
    return [`${label}: missing editorial evidence metadata`];
  }

  for (const key of Object.keys(editorial)) {
    if (!EDITORIAL_KEYS.has(key)) {
      errors.push(`${label}: unsupported editorial field ${key}`);
    }
  }

  if (!EVIDENCE_BASES.has(editorial.evidenceBasis)) {
    errors.push(`${label}: unsupported evidenceBasis ${String(editorial.evidenceBasis)}`);
  }

  if (typeof editorial.evidenceSummary !== 'string' || editorial.evidenceSummary.trim().length < 80) {
    errors.push(`${label}: evidenceSummary must explain the article-specific boundary in at least 80 characters`);
  }

  if (!isRealDateOnly(editorial.sourceReviewedAt)) {
    errors.push(`${label}: sourceReviewedAt must be a real YYYY-MM-DD date`);
  }

  if (
    typeof editorial.relationshipDisclosure !== 'string'
    || editorial.relationshipDisclosure.trim().length < 20
  ) {
    errors.push(`${label}: relationshipDisclosure must state the supported relationship boundary`);
  }

  for (const [key, maximum] of Object.entries(TEXT_LIMITS)) {
    const value = editorial[key];
    if (value !== undefined && (typeof value !== 'string' || value.trim().length === 0 || value.length > maximum)) {
      errors.push(`${label}: ${key} must be non-empty and no longer than ${maximum} characters`);
    }
  }

  if (
    editorial.evidenceBasis === 'researched'
    && !/\b(?:has not|have not|did not|no hands-on|not a hands-on)\b/i.test(editorial.evidenceSummary ?? '')
  ) {
    errors.push(`${label}: researched evidenceSummary must state the no-hands-on boundary`);
  }

  const serializedBlocks = JSON.stringify(post?.blocks ?? []);
  if (
    /AI-generated editorial illustration/i.test(serializedBlocks)
    && typeof editorial.syntheticMediaDisclosure !== 'string'
  ) {
    errors.push(`${label}: AI-generated article visuals require syntheticMediaDisclosure`);
  }

  if (post?.status === 'published' && typeof editorial.updateNote !== 'string') {
    errors.push(`${label}: a published exact-record refresh requires updateNote`);
  }

  const externalReferences = collectExternalReferenceUrls(post?.blocks);
  errors.push(...validateCompanionVideos(post, label));
  if (editorial.evidenceBasis === 'researched' && externalReferences.length < 2) {
    errors.push(`${label}: researched package needs at least two explicit non-media external references`);
  }

  return {errors, externalReferenceCount: externalReferences.length};
}

async function findImportFiles(directory) {
  const entries = await readdir(directory, {withFileTypes: true});
  const files = [];

  for (const entry of entries) {
    const entryPath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      files.push(...await findImportFiles(entryPath));
    } else if (entry.isFile() && entry.name.endsWith('-import.json')) {
      files.push(entryPath);
    }
  }

  return files.sort();
}

const importFiles = await findImportFiles(CONTENT_PACKAGES_ROOT);
const errors = [];
const results = [];

if (importFiles.length === 0) {
  errors.push('No content-package import files were found.');
}

for (const filePath of importFiles) {
  let document;
  try {
    document = JSON.parse(await readFile(filePath, 'utf8'));
  } catch (error) {
    errors.push(`${path.relative(REPOSITORY_ROOT, filePath)}: ${error.message}`);
    continue;
  }

  if (document.source !== 'colinmichaels-cms' || document.collection !== 'posts') {
    errors.push(`${path.relative(REPOSITORY_ROOT, filePath)}: unsupported CMS import envelope`);
    continue;
  }

  if (!Array.isArray(document.posts) || document.posts.length === 0) {
    errors.push(`${path.relative(REPOSITORY_ROOT, filePath)}: posts must be a non-empty array`);
    continue;
  }

  for (const post of document.posts) {
    const result = validateEditorial(post, filePath);
    if (Array.isArray(result)) {
      errors.push(...result);
      continue;
    }

    errors.push(...result.errors);
    results.push({
      file: path.relative(REPOSITORY_ROOT, filePath),
      slug: post.slug,
      evidenceBasis: post.editorial.evidenceBasis,
      externalReferenceCount: result.externalReferenceCount,
    });
  }
}

if (errors.length > 0) {
  console.error(`Content-package evidence validation failed with ${errors.length} error(s):`);
  for (const error of errors) {
    console.error(`- ${error}`);
  }
  process.exitCode = 1;
} else {
  console.log(`Validated ${results.length} evidence-ready content package(s):`);
  for (const result of results) {
    console.log(`- ${result.slug}: ${result.evidenceBasis}, ${result.externalReferenceCount} explicit external references`);
  }
}
