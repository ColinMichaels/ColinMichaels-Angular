import {inject, Injectable} from '@angular/core';
import {httpsCallable} from 'firebase/functions';
import {FIREBASE_FUNCTIONS} from '../../services/firebase/firebase.tokens';
import {isScheduleSlug, parsePublishingSchedule, parseScheduledReader, PublishingScheduleResponse, ScheduledReaderResponse} from './publishing-schedule.models';

@Injectable({providedIn: 'root'})
export class PublishingScheduleApiService {
  private readonly functions = inject(FIREBASE_FUNCTIONS, {optional: true});

  async getSchedule(): Promise<PublishingScheduleResponse> {
    if (!this.functions) throw new Error('Publishing schedule is unavailable.');
    const result = await httpsCallable<Record<string, never>, unknown>(this.functions, 'getPublicPublishingSchedule')({});
    return parsePublishingSchedule(result.data);
  }

  async getPost(slug: string): Promise<ScheduledReaderResponse> {
    if (!this.functions || !isScheduleSlug(slug)) throw new Error('Article is unavailable.');
    const result = await httpsCallable<{slug: string}, unknown>(this.functions, 'getScheduledPostForReader')({slug});
    return parseScheduledReader(result.data, slug);
  }
}
