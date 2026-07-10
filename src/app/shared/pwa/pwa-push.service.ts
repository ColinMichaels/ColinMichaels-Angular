import {DOCUMENT} from '@angular/common';
import {DestroyRef, Injectable, InjectionToken, computed, inject, signal} from '@angular/core';
import {takeUntilDestroyed, toSignal} from '@angular/core/rxjs-interop';
import {Router} from '@angular/router';
import {SwPush} from '@angular/service-worker';
import {combineLatest} from 'rxjs';

import {environment} from '../../../environments/environment';
import {AuthService} from '../../services/auth.service';
import {
  PwaPushRegistrationService,
  PwaPushSubscriptionPayload,
} from './pwa-push-registration.service';

export const PWA_PUSH_PUBLIC_KEY = new InjectionToken<string>('Web Push VAPID public key', {
  providedIn: 'root',
  factory: () => environment.webPushPublicKey,
});

type PwaNotificationPermission = NotificationPermission | 'unsupported';

@Injectable({
  providedIn: 'root',
})
/**
 * Adapts Angular Web Push to explicit, signed-in device preferences while
 * keeping backend subscription persistence behind PwaPushRegistrationService.
 */
export class PwaPushService {
  private readonly document = inject(DOCUMENT);
  private readonly destroyRef = inject(DestroyRef);
  private readonly router = inject(Router);
  private readonly swPush = inject(SwPush);
  private readonly auth = inject(AuthService);
  private readonly registration = inject(PwaPushRegistrationService);
  private readonly publicKey = inject(PWA_PUSH_PUBLIC_KEY).trim();
  private readonly browserWindow = this.document.defaultView;
  private readonly subscriptionState = toSignal(this.swPush.subscription, {initialValue: null});
  private readonly userState = toSignal(this.auth.user$, {initialValue: null});
  private readonly permissionState = signal<PwaNotificationPermission>(
    this.browserWindow?.Notification?.permission ?? 'unsupported'
  );
  private readonly busyState = signal(false);
  private readonly statusMessageState = signal<string | null>(null);
  private readonly unreadCountState = signal(0);
  private readonly registrationSyncs = new Map<string, Promise<void>>();
  private lastRegisteredOwnerKey: string | null = null;
  private started = false;

  readonly supported = signal(Boolean(
    this.browserWindow
    && this.swPush.isEnabled
    && typeof this.browserWindow.Notification === 'function'
  )).asReadonly();
  readonly configured = signal(this.publicKey.length > 0).asReadonly();
  readonly available = computed(() => this.supported() && this.configured());
  readonly signedIn = computed(() => Boolean(this.userState()));
  readonly subscribed = computed(() => Boolean(this.subscriptionState()));
  readonly permission = this.permissionState.asReadonly();
  readonly busy = this.busyState.asReadonly();
  readonly statusMessage = this.statusMessageState.asReadonly();
  readonly unreadCount = this.unreadCountState.asReadonly();
  readonly badgeSupported = signal(Boolean(
    this.browserWindow?.navigator.setAppBadge
  )).asReadonly();

  start(): void {
    if (this.started || !this.browserWindow || !this.swPush.isEnabled) {
      return;
    }

    this.started = true;

    this.swPush.messages
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(message => this.handlePushMessage(message));

    this.swPush.notificationClicks
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(event => {
        const target = resolvePwaNotificationTarget(
          event.notification.data,
          event.action,
          this.browserWindow!.location.origin
        );

        void this.clearBadge();

        if (target) {
          void this.router.navigateByUrl(target);
        }
      });

    this.swPush.pushSubscriptionChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(change => {
        if (change.newSubscription && this.userState()) {
          void this.registerSubscription(change.newSubscription);
        } else if (change.oldSubscription && !change.newSubscription && this.userState()) {
          void this.registration.unregister(change.oldSubscription.endpoint);
        }
      });

    combineLatest([this.auth.user$, this.swPush.subscription])
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(([user, subscription]) => {
        if (user && subscription) {
          void this.registerSubscription(subscription, user.uid).catch(() => {
            this.statusMessageState.set('This device notification subscription could not be synchronized.');
          });
        }
      });

    const handleVisibilityChange = (): void => {
      if (this.document.visibilityState === 'visible') {
        void this.clearBadge();
      }
    };

    this.document.addEventListener('visibilitychange', handleVisibilityChange);
    this.destroyRef.onDestroy(() => {
      this.document.removeEventListener('visibilitychange', handleVisibilityChange);
    });

    if (this.document.visibilityState === 'visible') {
      void this.clearBadge();
    }
  }

  async toggleSubscription(): Promise<boolean> {
    return this.subscribed() ? this.disableNotifications() : this.enableNotifications();
  }

  async enableNotifications(): Promise<boolean> {
    if (this.busyState()) {
      return false;
    }

    if (!this.available()) {
      this.statusMessageState.set('Push notifications are unavailable in this browser or app build.');
      return false;
    }

    if (!this.signedIn()) {
      this.statusMessageState.set('Sign in before enabling new-post notifications.');
      return false;
    }

    if (this.permissionState() === 'denied') {
      this.statusMessageState.set('Notifications are blocked. Allow them in the browser or system settings first.');
      return false;
    }

    this.busyState.set(true);
    this.statusMessageState.set(null);
    let subscription: PushSubscription | undefined;

    try {
      subscription = await this.swPush.requestSubscription({serverPublicKey: this.publicKey});
      this.permissionState.set(this.browserWindow?.Notification.permission ?? 'unsupported');
      await this.registerSubscription(subscription);
      this.statusMessageState.set('New-post notifications are enabled on this device.');
      return true;
    } catch (error) {
      if (subscription) {
        try {
          await this.swPush.unsubscribe();
        } catch {
          // The backend registration failed, so leaving an inert browser subscription is harmless.
        }
      }

      this.permissionState.set(this.browserWindow?.Notification.permission ?? 'unsupported');
      this.statusMessageState.set(describePushError(error));
      return false;
    } finally {
      this.busyState.set(false);
    }
  }

  async disableNotifications(): Promise<boolean> {
    if (this.busyState()) {
      return false;
    }

    const subscription = this.subscriptionState();

    if (!subscription) {
      this.statusMessageState.set('New-post notifications are already off on this device.');
      return true;
    }

    this.busyState.set(true);
    this.statusMessageState.set(null);

    try {
      await this.registration.unregister(subscription.endpoint);
      await this.swPush.unsubscribe();
      this.lastRegisteredOwnerKey = null;
      await this.clearBadge();
      this.statusMessageState.set('New-post notifications are off on this device.');
      return true;
    } catch (error) {
      this.statusMessageState.set(describePushError(error));
      return false;
    } finally {
      this.busyState.set(false);
    }
  }

  async clearBadge(): Promise<void> {
    this.unreadCountState.set(0);
    const navigator = this.browserWindow?.navigator;

    if (typeof navigator?.clearAppBadge === 'function') {
      try {
        await navigator.clearAppBadge();
      } catch {
        // Badging is progressive and may be denied outside an installed-app context.
      }
    }
  }

  private registerSubscription(
    subscription: PushSubscription,
    ownerUid = this.userState()?.uid
  ): Promise<void> {
    if (!ownerUid) {
      return Promise.reject(new Error('Sign in before enabling new-post notifications.'));
    }

    const ownerKey = `${ownerUid}:${subscription.endpoint}`;

    if (this.lastRegisteredOwnerKey === ownerKey) {
      return Promise.resolve();
    }

    const existingSync = this.registrationSyncs.get(ownerKey);

    if (existingSync) {
      return existingSync;
    }

    const locale = this.document.documentElement.lang
      || this.browserWindow?.navigator.language
      || 'en-US';
    const sync = this.registration
      .register(createPwaPushSubscriptionPayload(subscription), locale)
      .then(() => {
        this.lastRegisteredOwnerKey = ownerKey;
      })
      .finally(() => {
        this.registrationSyncs.delete(ownerKey);
      });

    this.registrationSyncs.set(ownerKey, sync);
    return sync;
  }

  private handlePushMessage(message: object): void {
    const data = getNotificationData(message);
    const requestedCount = getPositiveInteger(data?.['badgeCount']);
    const nextCount = requestedCount ?? this.unreadCountState() + 1;
    this.unreadCountState.set(nextCount);
    this.statusMessageState.set('A new site update was received.');

    if (this.document.visibilityState === 'visible') {
      void this.clearBadge();
      return;
    }

    const navigator = this.browserWindow?.navigator;

    if (typeof navigator?.setAppBadge === 'function') {
      void navigator.setAppBadge(nextCount).catch(() => {
        // Installed-app and operating-system support varies by platform.
      });
    }
  }
}

export function createPwaPushSubscriptionPayload(
  subscription: PushSubscription
): PwaPushSubscriptionPayload {
  const value = subscription.toJSON();
  const endpoint = (value.endpoint ?? subscription.endpoint).trim();
  const auth = value.keys?.['auth']?.trim() ?? '';
  const p256dh = value.keys?.['p256dh']?.trim() ?? '';

  if (!endpoint || !auth || !p256dh) {
    throw new Error('The browser returned an incomplete push subscription.');
  }

  return {
    endpoint,
    expirationTime: value.expirationTime ?? null,
    keys: {auth, p256dh},
  };
}

export function resolvePwaNotificationTarget(
  data: unknown,
  action: string,
  origin: string
): string | null {
  if (!isRecord(data)) {
    return null;
  }

  const actionClicks = isRecord(data['onActionClick']) ? data['onActionClick'] : undefined;
  const rawActionDefinition = actionClicks?.[action || 'default'];
  const actionDefinition: Record<string, unknown> | undefined = isRecord(rawActionDefinition)
    ? rawActionDefinition
    : undefined;
  const candidate = typeof actionDefinition?.['url'] === 'string'
    ? actionDefinition['url']
    : typeof data['url'] === 'string'
      ? data['url']
      : '';

  if (!candidate) {
    return null;
  }

  try {
    const url = new URL(candidate, origin);

    if (url.origin !== origin || !isSafePublicNotificationPath(url.pathname)) {
      return null;
    }

    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return null;
  }
}

function isSafePublicNotificationPath(pathname: string): boolean {
  return pathname === '/'
    || pathname === '/blog'
    || pathname.startsWith('/blog/')
    || pathname === '/topics'
    || pathname.startsWith('/topics/')
    || pathname === '/search';
}

function getNotificationData(message: unknown): Record<string, unknown> | undefined {
  if (!isRecord(message)) {
    return undefined;
  }

  const notification = isRecord(message['notification']) ? message['notification'] : undefined;
  return notification && isRecord(notification['data']) ? notification['data'] : undefined;
}

function getPositiveInteger(value: unknown): number | undefined {
  return typeof value === 'number' && Number.isInteger(value) && value > 0 ? value : undefined;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function describePushError(error: unknown): string {
  if (error instanceof DOMException && error.name === 'NotAllowedError') {
    return 'Notification permission was not granted. You can enable it later in browser settings.';
  }

  if (error instanceof Error && /unauthenticated|sign.?in/i.test(error.message)) {
    return 'Sign in before enabling new-post notifications.';
  }

  return error instanceof Error
    ? error.message
    : 'New-post notifications could not be updated.';
}
