import {ApplicationConfig, isDevMode, provideZoneChangeDetection} from '@angular/core';
import {provideRouter, withInMemoryScrolling, withViewTransitions} from '@angular/router';
import {provideServiceWorker} from '@angular/service-worker';

import {routes} from './app.routes';
import {provideHttpClient, withXhr} from '@angular/common/http';
import {environment} from '../environments/environment';
import {
  SOUND_SERVICE_CONFIG,
  SoundServiceConfig
} from './providers/sound/sound.module';
import {provideFirebaseServices} from './services/firebase/firebase.tokens';

export const defaultSoundConfig: SoundServiceConfig = {
  debounceInterval: 60,
  maxCacheSize: 20,
  defaultVolume: 1.0,
  basePath: 'assets/audio/efx/'
};

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
    provideServiceWorker('ngsw-worker.js', {
      enabled: !isDevMode(),
      registrationStrategy: 'registerWhenStable:30000',
      updateViaCache: 'none',
    }),
    {
      provide: SOUND_SERVICE_CONFIG,
      useValue: defaultSoundConfig
    },
    provideFirebaseServices(environment.firebaseConfig, environment.firebaseEmulators)

  ]
};
