import {DOCUMENT} from '@angular/common';
import {inject} from '@angular/core';
import {CanActivateFn, Router} from '@angular/router';

import {PATH_NAMES} from '../../app-route-paths';

export const OS_MIN_VIEWPORT_WIDTH = 1024;
export const OS_MIN_VIEWPORT_HEIGHT = 640;

export interface OsDeviceCapabilities {
  width: number;
  height: number;
  hasHover: boolean;
  hasFinePointer: boolean;
}

export function supportsDesktopOs(capabilities: OsDeviceCapabilities): boolean {
  return capabilities.width >= OS_MIN_VIEWPORT_WIDTH
    && capabilities.height >= OS_MIN_VIEWPORT_HEIGHT
    && capabilities.hasHover
    && capabilities.hasFinePointer;
}

export const osDeviceGuard: CanActivateFn = (_route, state) => {
  const document = inject(DOCUMENT);
  const router = inject(Router);
  const browserWindow = document.defaultView;

  if (!browserWindow) {
    return true;
  }

  const isSupported = supportsDesktopOs({
    width: browserWindow.innerWidth,
    height: browserWindow.innerHeight,
    hasHover: browserWindow.matchMedia('(hover: hover)').matches,
    hasFinePointer: browserWindow.matchMedia('(pointer: fine)').matches,
  });

  return isSupported
    ? true
    : router.createUrlTree(['/', PATH_NAMES.OS_DEVICE_REQUIRED], {
      queryParams: {returnUrl: state.url},
    });
};
