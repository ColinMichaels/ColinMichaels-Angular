import {Component, ChangeDetectionStrategy, computed, inject} from '@angular/core';
import {NavigationEnd, Router, RouterOutlet} from '@angular/router';
import {toSignal} from '@angular/core/rxjs-interop';
import {filter, map, startWith} from 'rxjs/operators';

import {NotificationServerComponent} from './components/game/utils/notifications-server/notifications-server.component';
import {PATH_NAMES} from './app-route-paths';
import {fadeToBlackAnimation} from './route-animations';
import {SeoService} from './shared/seo/seo.service';
import {SiteHeaderComponent} from './shared/site-header/site-header.component';
import {SiteThemeService} from './shared/theme/site-theme.service';

const SITE_HEADER_EXCLUDED_ROUTES: readonly string[] = [
  `/${PATH_NAMES.OS_MAIN}`,
  `/${PATH_NAMES.OS_LOGIN}`,
  `/${PATH_NAMES.OS_BOOT}`,
  `/${PATH_NAMES.OS_SLEEP}`,
  `/${PATH_NAMES.OS_EXTERNAL}`,
];

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, NotificationServerComponent, SiteHeaderComponent],
  templateUrl: './app.component.html',
  styles: [],
  standalone: true,
  changeDetection: ChangeDetectionStrategy.Eager,
  animations: [fadeToBlackAnimation]

})
export class AppComponent {
  private readonly router = inject(Router);
  private readonly seo = inject(SeoService);
  private readonly theme = inject(SiteThemeService);
  private readonly currentUrl = toSignal(
    this.router.events.pipe(
      filter((event): event is NavigationEnd => event instanceof NavigationEnd),
      map(event => event.urlAfterRedirects),
      startWith(this.router.url)
    ),
    {initialValue: this.router.url}
  );

  protected readonly showSiteHeader = computed(() => {
    const currentUrl = this.currentUrl().split('?')[0].split('#')[0];

    return !SITE_HEADER_EXCLUDED_ROUTES.some(route => currentUrl === route || currentUrl.startsWith(`${route}/`));
  });
  protected readonly showOsNotifications = computed(() => {
    const currentUrl = this.currentUrl().split('?')[0].split('#')[0];

    return SITE_HEADER_EXCLUDED_ROUTES.some(route => currentUrl === route || currentUrl.startsWith(`${route}/`));
  });

  constructor() {
    this.seo.initializeRouteTracking();
    this.theme.mode();
  }

  prepareRoute(outlet: RouterOutlet): string | null {
    return outlet?.activatedRouteData['animation'] ?? null;
  }

}
