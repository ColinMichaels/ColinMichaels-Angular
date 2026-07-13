import {AuthorProfile} from './models/author.model';

export const DEFAULT_AUTHOR_ID = 'colin-michaels';
export const DEFAULT_AUTHOR_SLUG = 'colin-michaels';

export const DEFAULT_AUTHOR_PROFILE: AuthorProfile = {
  id: DEFAULT_AUTHOR_ID,
  slug: DEFAULT_AUTHOR_SLUG,
  name: 'Colin Michaels',
  title: 'Application developer, creative problem solver, FPV drone pilot, and photographer',
  shortBio: 'Colin Michaels is an application developer, creative problem solver, FPV drone pilot, photographer, and builder sharing software, creative projects, and personal lessons.',
  bio: 'Colin Michaels is an application developer, creative problem solver, FPV drone pilot, photographer, and someone who is always building something. He shares software, AI workflows, websites, drones, videos, creative experiments, and the lessons learned along the way.\n\nColinMichaels.com is his personal portfolio, publishing home, media archive, recovery notebook, and project lab.',
  avatarUrl: 'https://firebasestorage.googleapis.com/v0/b/colinmichaels.firebasestorage.app/o/cms%2Fblog-media%2Fmedia-library%2Flibrary%2F1781710307542-26de032d-9418-4c44-8953-d5f4efdadeec.webp?alt=media&token=03c80fbe-8339-48cb-a150-0dbcf9cadff6',
  imageAlt: 'Colin Michaels portrait',
  location: 'Florida',
  externalProfiles: [
    {label: 'GitHub', url: 'https://github.com/ColinMichaels'},
    {label: 'LinkedIn', url: 'https://www.linkedin.com/in/colinmichaels'},
  ],
  healthDisclaimer: 'Anything health-related on this site is personal experience only and should not be taken as medical advice.',
  status: 'published',
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-07-12T00:00:00.000Z',
};

export function createAuthorSlug(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/['"]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'author';
}
