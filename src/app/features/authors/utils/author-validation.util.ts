import {AuthorProfile, AuthorStatus} from '../models/author.model';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}
function isAuthorStatus(value: unknown): value is AuthorStatus {
  return value === 'draft' || value === 'published';
}

export function isAuthorProfile(value: unknown): value is AuthorProfile {
  return isRecord(value)
    && typeof value['id'] === 'string'
    && typeof value['slug'] === 'string'
    && typeof value['name'] === 'string'
    && typeof value['title'] === 'string'
    && typeof value['shortBio'] === 'string'
    && typeof value['bio'] === 'string'
    && typeof value['avatarUrl'] === 'string'
    && typeof value['imageAlt'] === 'string'
    && (value['location'] === undefined || typeof value['location'] === 'string')
    && Array.isArray(value['externalProfiles'])
    && value['externalProfiles'].every(profile => (
      isRecord(profile)
      && typeof profile['label'] === 'string'
      && typeof profile['url'] === 'string'
    ))
    && (value['healthDisclaimer'] === undefined || typeof value['healthDisclaimer'] === 'string')
    && isAuthorStatus(value['status'])
    && typeof value['createdAt'] === 'string'
    && typeof value['updatedAt'] === 'string';
}
