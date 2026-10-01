import {getReaderReleaseDateError, isBlogReaderRelease, normalizeBlogReaderRelease} from './blog-reader-release.util';
import {isBlogPost} from './blog-validation.util';
import {TEST_SCHEDULE_POST} from '../../publishing-schedule/publishing-schedule.testing';

describe('Reader release metadata', () => {
  it('preserves legacy posts without announcing or granting early access', () => {
    expect(isBlogPost(TEST_SCHEDULE_POST)).toBeTrue();
    expect(normalizeBlogReaderRelease(undefined)).toBeUndefined();
  });
  it('normalizes the optional configuration without inventing a time or announcement', () => {
    expect(normalizeBlogReaderRelease({announceInSchedule: true, earlyAccessAt: null})).toEqual({announceInSchedule: true, earlyAccessAt: null});
    expect(normalizeBlogReaderRelease({announceInSchedule: false, earlyAccessAt: '2026-10-01T08:00:00-04:00'}))
      .toEqual({announceInSchedule: false, earlyAccessAt: '2026-10-01T12:00:00.000Z'});
  });
  it('rejects malformed release settings and requires early access before publication', () => {
    expect(isBlogReaderRelease({announceInSchedule: 'yes', earlyAccessAt: null})).toBeFalse();
    expect(isBlogReaderRelease({announceInSchedule: true, earlyAccessAt: '2026-02-30T12:00:00Z'})).toBeFalse();
    expect(isBlogReaderRelease({announceInSchedule: true, earlyAccessAt: null, extra: true})).toBeFalse();
    expect(isBlogPost({...TEST_SCHEDULE_POST, readerRelease: {announceInSchedule: true, earlyAccessAt: 'soon'}})).toBeFalse();
    expect(getReaderReleaseDateError('', '')).toBeNull();
    expect(getReaderReleaseDateError('broken', TEST_SCHEDULE_POST.publishedAt!)).toContain('valid');
    expect(getReaderReleaseDateError(TEST_SCHEDULE_POST.publishedAt!, TEST_SCHEDULE_POST.publishedAt!)).toContain('before');
    expect(getReaderReleaseDateError('2026-10-01T12:00:00Z', TEST_SCHEDULE_POST.publishedAt!)).toBeNull();
  });
});
