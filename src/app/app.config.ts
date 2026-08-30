import {ViewportScroller} from '@angular/common';
import {
  ApplicationConfig,
  inject,
  isDevMode,
  provideAppInitializer,
  provideExperimentalWebMcpTools,
  provideZoneChangeDetection,
} from '@angular/core';
import {provideRouter, withInMemoryScrolling, withViewTransitions} from '@angular/router';
import {provideServiceWorker} from '@angular/service-worker';

import {routes} from './app.routes';
import {provideHttpClient, withXhr} from '@angular/common/http';
import {environment} from '../environments/environment';
import {
  SOUND_SERVICE_CONFIG,
  SoundServiceConfig
} from './providers/sound/sound.module';
import {
  FirebaseAppCheckConfig,
  FIREBASE_APP_CHECK,
  provideFirebaseServices,
} from './services/firebase/firebase.tokens';
import {PUBLIC_CONTENT_WEB_MCP_TOOLS} from './features/search/webmcp-public-content.tools';

export const defaultSoundConfig: SoundServiceConfig = {
  debounceInterval: 60,
  maxCacheSize: 20,
  defaultVolume: 1.0,
  basePath: 'assets/audio/efx/'
};

const firebaseAppCheckConfig = (
  environment as typeof environment & { firebaseAppCheck?: FirebaseAppCheckConfig }
).firebaseAppCheck;

export const appConfig: ApplicationConfig = {
  providers: [

    provideHttpClient(withXhr()),
    provideZoneChangeDetection({eventCoalescing: true}),
    provideRouter(
      routes,
      withViewTransitions({skipInitialTransition: true}),
      withInMemoryScrolling({
        anchorScrolling: 'enabled',
        scrollPositionRestoration: 'top'
      })
    ),
    provideAppInitializer(() => {
      inject(ViewportScroller).setOffset([0, 80]);
      // Initialize before feature services can create Storage/Firestore clients.
      inject(FIREBASE_APP_CHECK);
    }),
    provideExperimentalWebMcpTools(PUBLIC_CONTENT_WEB_MCP_TOOLS),
    provideServiceWorker('pwa-worker.js', {
      enabled: !isDevMode(),
      registrationStrategy: 'registerWhenStable:30000',
      updateViaCache: 'none',
    }),
    {
      provide: SOUND_SERVICE_CONFIG,
      useValue: defaultSoundConfig
    },
    provideFirebaseServices(
      environment.firebaseConfig,
      environment.firebaseEmulators,
      firebaseAppCheckConfig,
    )

  ]
};
