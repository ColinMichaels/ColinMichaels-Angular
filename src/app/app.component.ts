import {Component, ChangeDetectionStrategy, computed, inject} from '@angular/core';
import {NavigationEnd, Router, RouterOutlet} from '@angular/router';
import {toSignal} from '@angular/core/rxjs-interop';
import {filter, map, startWith} from 'rxjs/operators';

import {NotificationServerComponent} from './components/game/utils/notifications-server/notifications-server.component';
import {PATH_NAMES} from './app-route-paths';
import {ReaderPreferencesService} from './shared/reader-preferences/reader-preferences.service';
import {ReaderToolsComponent} from './shared/reader-preferences/reader-tools.component';
import {SeoService} from './shared/seo/seo.service';
import {SitePreloaderService} from './shared/site-loader/site-preloader.service';
import {SiteHeaderComponent} from './shared/site-header/site-header.component';
import {SiteThemeService} from './shared/theme/site-theme.service';
import {ShareAttributionService} from './features/blog/services/share-attribution.service';
import {PwaStatusComponent} from './shared/pwa/pwa-status.component';
import {PwaPushService} from './shared/pwa/pwa-push.service';
import {ScreenSaverLauncherComponent} from './features/screen-saver/screen-saver-launcher.component';
import {AuthService} from './services/auth.service';
import {UserViewBannerComponent} from './shared/user-view/user-view-banner.component';
import {
  BlogMembershipCampaignComponent
} from './features/blog/components/signup-campaign/blog-membership-campaign.component';

const OS_ROUTES: readonly string[] = [
  `/${PATH_NAMES.OS_MAIN}`,
  `/${PATH_NAMES.OS_LOGIN}`,
  `/${PATH_NAMES.OS_BOOT}`,
  `/${PATH_NAMES.OS_SLEEP}`,
  `/${PATH_NAMES.OS_EXTERNAL}`,
];
const SITE_HEADER_EXCLUDED_ROUTES: readonly string[] = [
  `/${PATH_NAMES.ADMIN}`,
  ...OS_ROUTES,
];
const READER_ROUTES: readonly string[] = [
  '/',
  `/${PATH_NAMES.BLOG}`,
  `/${PATH_NAMES.CAT_CORNER}`,
  `/${PATH_NAMES.SEARCH}`,
  `/${PATH_NAMES.TOPICS}`,
];

function routeMatchesPrefix(url: string, route: string): boolean {
  return url === route || url.startsWith(`${route}/`);
}

export function shouldShowSiteHeader(url: string): boolean {
  const currentUrl = url.split('?')[0].split('#')[0];
  return !SITE_HEADER_EXCLUDED_ROUTES.some(route => routeMatchesPrefix(currentUrl, route));
}

export function shouldShowOsNotifications(url: string): boolean {
  const currentUrl = url.split('?')[0].split('#')[0];
  return OS_ROUTES.some(route => routeMatchesPrefix(currentUrl, route));
}

export function shouldShowReaderTools(url: string): boolean {
  const currentUrl = url.split('?')[0].split('#')[0];
  return READER_ROUTES.some(route => currentUrl === route || (route !== '/' && routeMatchesPrefix(currentUrl, route)));
}

export function shouldShowBlogMembershipCampaign(url: string): boolean {
  const currentUrl = url.split('?')[0].split('#')[0];
  const blogRoute = `/${PATH_NAMES.BLOG}`;
  const previewRoute = `${blogRoute}/preview`;

  return routeMatchesPrefix(currentUrl, blogRoute)
    && !routeMatchesPrefix(currentUrl, previewRoute);
}

@Component({
  selector: 'app-root',
  imports: [
    RouterOutlet,
    NotificationServerComponent,
    PwaStatusComponent,
    ReaderToolsComponent,
    ScreenSaverLauncherComponent,
    SiteHeaderComponent,
    UserViewBannerComponent,
    BlogMembershipCampaignComponent,
  ],
  templateUrl: './app.component.html',
  styles: [],
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AppComponent {
  private readonly router = inject(Router);
  private readonly readerPreferences = inject(ReaderPreferencesService);
  private readonly seo = inject(SeoService);
  private readonly sitePreloader = inject(SitePreloaderService);
  private readonly shareAttribution = inject(ShareAttributionService);
  private readonly pushNotifications = inject(PwaPushService);
  private readonly theme = inject(SiteThemeService);
  private readonly authService = inject(AuthService);
  private readonly currentUrl = toSignal(
    this.router.events.pipe(
      filter((event): event is NavigationEnd => event instanceof NavigationEnd),
      map(event => event.urlAfterRedirects),
      startWith(this.router.url)
    ),
    {initialValue: this.router.url}
  );

  protected readonly showSiteHeader = computed(() => {
    return shouldShowSiteHeader(this.currentUrl());
  });
  protected readonly showOsNotifications = computed(() => {
    return shouldShowOsNotifications(this.currentUrl());
  });
  protected readonly showReaderTools = computed(() => {
    return shouldShowReaderTools(this.currentUrl());
  });
  protected readonly showBlogMembershipCampaign = computed(() => {
    return shouldShowBlogMembershipCampaign(this.currentUrl());
  });
  protected readonly activeUserView = toSignal(this.authService.userView$, {initialValue: null});

  constructor() {
    this.sitePreloader.start();
    this.shareAttribution.start();
    this.pushNotifications.start();
    this.seo.initializeRouteTracking();
    this.theme.mode();
    this.readerPreferences.preferences();
  }

}
