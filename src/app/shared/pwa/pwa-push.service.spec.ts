import {TestBed} from '@angular/core/testing';
import {Router} from '@angular/router';
import {SwPush} from '@angular/service-worker';
import {Subject, of} from 'rxjs';

import {AuthService} from '../../services/auth.service';
import {PwaPushRegistrationService} from './pwa-push-registration.service';
import {
  PWA_PUSH_PUBLIC_KEY,
  PwaPushService,
  createPwaPushSubscriptionPayload,
  resolvePwaNotificationTarget,
} from './pwa-push.service';

describe('PwaPushService', () => {
  let subscription: Subject<PushSubscription | null>;
  let messages: Subject<object>;
  let notificationClicks: Subject<{
    action: string;
    notification: NotificationOptions & {title: string};
  }>;
  let pushSubscriptionChanges: Subject<{
    oldSubscription: PushSubscription | null;
    newSubscription: PushSubscription | null;
  }>;
  let requestSubscription: jasmine.Spy;
  let unsubscribe: jasmine.Spy;
  let register: jasmine.Spy;
  let unregister: jasmine.Spy;
  let navigateByUrl: jasmine.Spy;
  let pushSubscription: PushSubscription;

  beforeEach(() => {
    subscription = new Subject<PushSubscription | null>();
    messages = new Subject<object>();
    notificationClicks = new Subject();
    pushSubscriptionChanges = new Subject();
    pushSubscription = {
      endpoint: 'https://push.example.com/subscription/device-1',
      expirationTime: null,
      options: {} as PushSubscriptionOptions,
      getKey: () => null,
      unsubscribe: () => Promise.resolve(true),
      toJSON: () => ({
        endpoint: 'https://push.example.com/subscription/device-1',
        expirationTime: null,
        keys: {auth: 'auth-key', p256dh: 'p256dh-key'},
      }),
    };
    requestSubscription = jasmine.createSpy('requestSubscription').and.resolveTo(pushSubscription);
    unsubscribe = jasmine.createSpy('unsubscribe').and.resolveTo();
    register = jasmine.createSpy('register').and.resolveTo({registered: true, updatedAt: '2026-07-10'});
    unregister = jasmine.createSpy('unregister').and.resolveTo({removed: true});
    navigateByUrl = jasmine.createSpy('navigateByUrl').and.resolveTo(true);

    TestBed.configureTestingModule({
      providers: [
        {provide: PWA_PUSH_PUBLIC_KEY, useValue: 'test-vapid-public-key'},
        {
          provide: SwPush,
          useValue: {
            isEnabled: true,
            subscription,
            messages,
            notificationClicks,
            pushSubscriptionChanges,
            requestSubscription,
            unsubscribe,
          },
        },
        {provide: AuthService, useValue: {user$: of({uid: 'reader-1'})}},
        {provide: Router, useValue: {navigateByUrl}},
        {provide: PwaPushRegistrationService, useValue: {register, unregister}},
      ],
    });
  });

  it('registers a complete browser subscription after explicit opt in', async () => {
    const service = TestBed.inject(PwaPushService);

    await expectAsync(service.enableNotifications()).toBeResolvedTo(true);

    expect(requestSubscription).toHaveBeenCalledOnceWith({serverPublicKey: 'test-vapid-public-key'});
    expect(register).toHaveBeenCalledWith({
      endpoint: pushSubscription.endpoint,
      expirationTime: null,
      keys: {auth: 'auth-key', p256dh: 'p256dh-key'},
    }, document.documentElement.lang || navigator.language || 'en-US');
    expect(service.statusMessage()).toContain('enabled');
  });

  it('routes notification clicks only to allowlisted same-origin public paths', () => {
    const service = TestBed.inject(PwaPushService);
    service.start();

    notificationClicks.next({
      action: '',
      notification: {
        title: 'New post',
        data: {
          url: '/blog/new-post?source=push',
          onActionClick: {
            default: {operation: 'navigateLastFocusedOrOpen', url: '/blog/new-post?source=push'},
          },
        },
      },
    });

    expect(navigateByUrl).toHaveBeenCalledOnceWith('/blog/new-post?source=push');
    expect(resolvePwaNotificationTarget({url: 'https://attacker.example/admin'}, '', location.origin)).toBeNull();
    expect(resolvePwaNotificationTarget({url: '/admin'}, '', location.origin)).toBeNull();
  });

  it('rejects incomplete push subscription data', () => {
    const incomplete = {
      ...pushSubscription,
      toJSON: () => ({endpoint: pushSubscription.endpoint}),
    } as PushSubscription;

    expect(() => createPwaPushSubscriptionPayload(incomplete))
      .toThrowError('The browser returned an incomplete push subscription.');
  });
});
