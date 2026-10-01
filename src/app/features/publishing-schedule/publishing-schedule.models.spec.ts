import {TEST_SCHEDULE, TEST_SCHEDULE_POST} from './publishing-schedule.testing';
import {parsePublishingSchedule, parseScheduledReader, publishingScheduleReadPath} from './publishing-schedule.models';

describe('Publishing schedule response boundary', () => {
  it('accepts metadata only and drops unknown fields including article bodies', () => {
    const parsed = parsePublishingSchedule({...TEST_SCHEDULE, entries: [{...TEST_SCHEDULE.entries[0], blocks: TEST_SCHEDULE_POST.blocks, privateNotes: 'editor-only'}]});
    expect(Object.keys(parsed.entries[0])).not.toContain('blocks');
    expect(Object.keys(parsed.entries[0])).not.toContain('privateNotes');
    expect(Object.isFrozen(parsed.entries)).toBeTrue();
  });
  it('fails closed on malformed, duplicate and oversized schedules', () => {
    expect(() => parsePublishingSchedule({...TEST_SCHEDULE, serverNow: 'wrong'})).toThrow();
    expect(() => parsePublishingSchedule({...TEST_SCHEDULE, entries: [TEST_SCHEDULE.entries[0], TEST_SCHEDULE.entries[0]]})).toThrow();
    expect(() => parsePublishingSchedule({...TEST_SCHEDULE, entries: Array.from({length: 201}, (_, i) => ({...TEST_SCHEDULE.entries[0], id: String(i)}))})).toThrow();
    expect(() => parsePublishingSchedule({...TEST_SCHEDULE, entries: [{...TEST_SCHEDULE.entries[0], slug: '../admin'}]})).toThrow();
  });
  it('never unlocks a past-due locked entry from the client clock', () => {
    const entry = parsePublishingSchedule(TEST_SCHEDULE).entries[0];
    expect(publishingScheduleReadPath({...entry, publishedAt: '2000-01-01T00:00:00.000Z'})).toBeNull();
    expect(publishingScheduleReadPath({...entry, access: 'early'})).toBe('/schedule/read/next-post');
    expect(publishingScheduleReadPath({...entry, access: 'public', status: 'published'})).toBe('/blog/next-post');
  });
  it('rejects mismatched access/status and body slugs', () => {
    expect(() => parsePublishingSchedule({...TEST_SCHEDULE, entries: [{...TEST_SCHEDULE.entries[0], access: 'public'}]})).toThrow();
    expect(() => parseScheduledReader({serverNow: TEST_SCHEDULE.serverNow, access: 'early', post: TEST_SCHEDULE_POST}, 'another-post')).toThrow();
    expect(() => parseScheduledReader({serverNow: TEST_SCHEDULE.serverNow, access: 'public', post: TEST_SCHEDULE_POST}, 'next-post')).toThrow();
    expect(parseScheduledReader({serverNow: TEST_SCHEDULE.serverNow, access: 'early', post: TEST_SCHEDULE_POST}, 'next-post').post.status).toBe('scheduled');
  });
});
