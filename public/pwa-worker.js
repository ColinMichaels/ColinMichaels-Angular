/* Import Angular's worker first so its cache, update, and notification behavior remains authoritative. */
importScripts('./ngsw-worker.js');

(function configurePwaBadgeEvents() {
  'use strict';

  self.addEventListener('push', event => {
    if (typeof self.navigator.setAppBadge !== 'function') {
      return;
    }

    let badgeCount;

    try {
      const payload = event.data?.json();
      const candidate = payload?.notification?.data?.badgeCount;
      badgeCount = Number.isInteger(candidate) && candidate > 0 ? candidate : undefined;
    } catch {
      badgeCount = undefined;
    }

    event.waitUntil(
      badgeCount === undefined
        ? self.navigator.setAppBadge()
        : self.navigator.setAppBadge(badgeCount)
    );
  });

  self.addEventListener('notificationclick', event => {
    if (typeof self.navigator.clearAppBadge === 'function') {
      event.waitUntil(self.navigator.clearAppBadge());
    }
  });
}());
