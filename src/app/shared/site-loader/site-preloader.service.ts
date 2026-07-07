import {DOCUMENT, isPlatformBrowser} from '@angular/common';
import {ApplicationRef, Injectable, PLATFORM_ID, inject} from '@angular/core';
import {NavigationEnd, Router} from '@angular/router';
import {firstValueFrom, of} from 'rxjs';
import {catchError, filter, take, timeout as rxTimeout} from 'rxjs/operators';

declare global {
  interface Window {
    __cmDismissInitialSiteLoader?: (reason?: string) => void;
  }
}

const MIN_VISIBLE_MS = 650;
const NORMAL_MAX_MS = 2500;
const ROUTE_WAIT_MS = 1200;
const FONT_WAIT_MS = 1200;
const IMAGE_MARKER_WAIT_MS = 350;
const IMAGE_DECODE_WAIT_MS = 900;

@Injectable({providedIn: 'root'})
export class SitePreloaderService {
  private readonly appRef = inject(ApplicationRef);
  private readonly document = inject(DOCUMENT);
  private readonly platformId = inject(PLATFORM_ID);
  private readonly router = inject(Router);
  private startedAt = 0;
  private started = false;

  start(): void {
    if (this.started || !isPlatformBrowser(this.platformId)) {
      return;
    }

    this.started = true;
    this.startedAt = this.now();
    void this.dismissWhenReady();
  }

  private async dismissWhenReady(): Promise<void> {
    const readyWork = this.waitForReadyPaint();
    const reason = await Promise.race([
      readyWork.then(() => 'ready'),
      this.wait(NORMAL_MAX_MS).then(() => 'timeout'),
    ]);

    await this.wait(Math.max(0, MIN_VISIBLE_MS - (this.now() - this.startedAt)));
    this.dismiss(reason);
  }

  private async waitForReadyPaint(): Promise<void> {
    await Promise.all([
      this.waitForInitialRoute(),
      this.waitForApplicationStability(),
      this.waitForFonts(),
    ]);
    await this.waitForAnimationFrames(2);
    await this.waitForPreloadImage();
  }

  private async waitForInitialRoute(): Promise<void> {
    if (this.router.navigated) {
      return;
    }

    await firstValueFrom(
      this.router.events.pipe(
        filter((event): event is NavigationEnd => event instanceof NavigationEnd),
        take(1),
        rxTimeout({first: ROUTE_WAIT_MS}),
        catchError(() => of(null))
      )
    );
  }

  private async waitForApplicationStability(): Promise<void> {
    await firstValueFrom(
      this.appRef.isStable.pipe(
        filter(Boolean),
        take(1),
        rxTimeout({first: ROUTE_WAIT_MS}),
        catchError(() => of(true))
      )
    );
  }

  private async waitForFonts(): Promise<void> {
    const fonts = this.document.fonts;

    if (!fonts?.ready) {
      return;
    }

    await Promise.race([
      fonts.ready.then(() => undefined).catch(() => undefined),
      this.wait(FONT_WAIT_MS),
    ]);
  }

  private async waitForPreloadImage(): Promise<void> {
    const image = await this.findPreloadImage();

    if (!image || (image.complete && image.naturalWidth > 0)) {
      return;
    }

    await Promise.race([
      this.decodeImage(image),
      this.wait(IMAGE_DECODE_WAIT_MS),
    ]);
  }

  private async findPreloadImage(): Promise<HTMLImageElement | null> {
    const existingImage = this.document.querySelector<HTMLImageElement>('[data-site-preload-image]');

    if (existingImage || !this.document.body) {
      return existingImage;
    }

    return new Promise(resolve => {
      const observer = new MutationObserver(() => {
        const image = this.document.querySelector<HTMLImageElement>('[data-site-preload-image]');

        if (image) {
          observer.disconnect();
          resolve(image);
        }
      });

      observer.observe(this.document.body, {childList: true, subtree: true});

      window.setTimeout(() => {
        observer.disconnect();
        resolve(null);
      }, IMAGE_MARKER_WAIT_MS);
    });
  }

  private async decodeImage(image: HTMLImageElement): Promise<void> {
    if (typeof image.decode === 'function') {
      await image.decode().catch(() => undefined);
      return;
    }

    await new Promise<void>(resolve => {
      const finalize = () => {
        image.removeEventListener('load', finalize);
        image.removeEventListener('error', finalize);
        resolve();
      };

      image.addEventListener('load', finalize, {once: true});
      image.addEventListener('error', finalize, {once: true});
    });
  }

  private async waitForAnimationFrames(count: number): Promise<void> {
    for (let i = 0; i < count; i += 1) {
      await new Promise<void>(resolve => window.requestAnimationFrame(() => resolve()));
    }
  }

  private dismiss(reason: string): void {
    if (window.__cmDismissInitialSiteLoader) {
      window.__cmDismissInitialSiteLoader(reason);
      return;
    }

    this.document.getElementById('cm-initial-loader')?.remove();
  }

  private wait(milliseconds: number): Promise<void> {
    return new Promise(resolve => window.setTimeout(resolve, milliseconds));
  }

  private now(): number {
    return window.performance?.now() ?? Date.now();
  }
}
