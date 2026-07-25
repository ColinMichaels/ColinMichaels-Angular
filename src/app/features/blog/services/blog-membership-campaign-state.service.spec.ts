import {parsePendingBlogMembershipPreferences} from './blog-membership-campaign-state.service';

describe('blog membership campaign state', () => {
  it('parses the three explicit communication choices', () => {
    expect(parsePendingBlogMembershipPreferences(JSON.stringify({
      browserNotifications: true,
      newPostEmails: false,
      newsletter: true,
      createdAt: '2026-07-25T12:00:00.000Z',
    }))).toEqual({
      browserNotifications: true,
      newPostEmails: false,
      newsletter: true,
      createdAt: '2026-07-25T12:00:00.000Z',
    });
  });

  it('rejects partial or malformed preference payloads', () => {
    expect(parsePendingBlogMembershipPreferences('not-json')).toBeNull();
    expect(parsePendingBlogMembershipPreferences(JSON.stringify({
      browserNotifications: true,
      newPostEmails: true,
      createdAt: '2026-07-25T12:00:00.000Z',
    }))).toBeNull();
  });
});
