import {DOCUMENT} from '@angular/common';
import {fakeAsync, flushMicrotasks, TestBed, tick} from '@angular/core/testing';
import {User} from 'firebase/auth';
import {BehaviorSubject} from 'rxjs';
import {AuthService, AuthState} from '../../services/auth.service';
import {PublishingScheduleApiService} from './publishing-schedule-api.service';
import {parsePublishingSchedule, ScheduledReaderResponse} from './publishing-schedule.models';
import {TEST_SCHEDULE, TEST_SCHEDULE_POST} from './publishing-schedule.testing';
import {PublishingScheduleService} from './publishing-schedule.service';

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((yes, no) => { resolve = yes; reject = no; });
  return {promise, resolve, reject};
}
const member: AuthState = {status: 'authenticated', user: {uid: 'member'} as User};
const anonymous: AuthState = {status: 'unauthenticated', user: null};
const early: ScheduledReaderResponse = {serverNow: TEST_SCHEDULE.serverNow, access: 'early', post: TEST_SCHEDULE_POST};

describe('PublishingScheduleService', () => {
  let auth: BehaviorSubject<AuthState>;
  let api: jasmine.SpyObj<PublishingScheduleApiService>;
  let service: PublishingScheduleService;
  beforeEach(() => {
    auth = new BehaviorSubject<AuthState>(anonymous);
    api = jasmine.createSpyObj('PublishingScheduleApiService', ['getSchedule', 'getPost']);
    api.getSchedule.and.resolveTo(parsePublishingSchedule(TEST_SCHEDULE));
    api.getPost.and.resolveTo(early);
    TestBed.configureTestingModule({providers: [PublishingScheduleService,
      {provide: AuthService, useValue: {authState$: auth}}, {provide: PublishingScheduleApiService, useValue: api}]});
  });
  afterEach(() => TestBed.resetTestingModule());
  const run = (body: () => void) => fakeAsync(() => {
    service = TestBed.inject(PublishingScheduleService);
    try { body(); } finally { TestBed.resetTestingModule(); }
  });

  it('waits for real auth initialization before requesting a schedule', run(() => {
    auth.next({status: 'initializing', user: null});
    service.loadSchedule();
    expect(api.getSchedule).not.toHaveBeenCalled();
    auth.next(anonymous); flushMicrotasks();
    expect(service.entries()[0].access).toBe('locked');
  }));
  it('clears the body immediately on sign-out and rejects stale member responses', run(() => {
    auth.next(member);
    const pendingMember = deferred<ScheduledReaderResponse>();
    const pendingAnonymous = deferred<ScheduledReaderResponse>();
    api.getPost.and.returnValues(pendingMember.promise, pendingAnonymous.promise);
    service.loadPost('next-post');
    auth.next(anonymous);
    expect(service.post()).toBeNull();
    pendingMember.resolve(early); flushMicrotasks();
    expect(service.post()).toBeNull();
    pendingAnonymous.reject({code: 'functions/permission-denied'}); flushMicrotasks();
    expect(service.error()).toContain('not available');
    expect(service.access()).toBeNull();
  }));
  it('coalesces pending refreshes without blocking a new auth context', run(() => {
    auth.next(member);
    const pending = deferred<ScheduledReaderResponse>();
    const guest = deferred<ScheduledReaderResponse>();
    api.getPost.and.returnValues(pending.promise, guest.promise);
    service.loadPost('next-post');
    void service.refresh();
    void service.refresh();
    expect(api.getPost).toHaveBeenCalledTimes(1);
    auth.next(anonymous);
    expect(api.getPost).toHaveBeenCalledTimes(2);
    pending.resolve(early); flushMicrotasks();
    expect(service.post()).toBeNull();
    guest.reject({code: 'functions/permission-denied'}); flushMicrotasks();
    expect(service.loading()).toBeFalse();
    expect(service.post()).toBeNull();
  }));
  it('removes an already rendered body before the anonymous request finishes', run(() => {
    auth.next(member); service.loadPost('next-post'); flushMicrotasks();
    expect(service.post()?.blocks.length).toBe(1);
    api.getPost.and.returnValue(deferred<ScheduledReaderResponse>().promise);
    auth.next(anonymous);
    expect(service.post()).toBeNull();
    expect(service.access()).toBeNull();
  }));
  it('discards a previous slug response after navigating to another article', run(() => {
    const old = deferred<ScheduledReaderResponse>();
    api.getPost.and.returnValues(old.promise, Promise.resolve({...early, post: {...TEST_SCHEDULE_POST, slug: 'other-post'}}));
    service.loadPost('next-post'); service.loadPost('other-post'); flushMicrotasks();
    old.resolve(early); flushMicrotasks();
    expect(service.post()?.slug).toBe('other-post');
  }));
  it('refreshes metadata every minute and on a visible-tab return', run(() => {
    const doc = TestBed.inject(DOCUMENT);
    spyOnProperty(doc, 'visibilityState', 'get').and.returnValue('visible');
    service.loadSchedule(); flushMicrotasks();
    tick(60_000); flushMicrotasks();
    doc.dispatchEvent(new Event('visibilitychange')); flushMicrotasks();
    expect(api.getSchedule).toHaveBeenCalledTimes(3);
    expect(service.entries()[0].access).toBe('locked');
  }));
  it('fails closed on reader revocation and exposes a recoverable schedule failure', run(() => {
    service.loadPost('next-post'); flushMicrotasks();
    api.getPost.and.rejectWith({code: 'functions/permission-denied'});
    void service.refresh(); flushMicrotasks();
    expect(service.post()).toBeNull();
    api.getSchedule.and.rejectWith(new Error('unavailable'));
    service.loadSchedule(); flushMicrotasks();
    expect(service.entries()).toEqual([]);
    expect(service.error()).toContain('try again');
    api.getSchedule.and.resolveTo(parsePublishingSchedule(TEST_SCHEDULE));
    void service.refresh(); flushMicrotasks();
    expect(service.error()).toBeNull();
  }));
  it('does not request invalid slugs and invalidates private state on destruction', run(() => {
    service.loadPost('../admin'); expect(api.getPost).not.toHaveBeenCalled();
    service.loadPost('next-post'); flushMicrotasks();
    TestBed.resetTestingModule();
    expect(service.post()).toBeNull();
    void service.refresh(); expect(api.getPost).toHaveBeenCalledTimes(1);
  }));
});
