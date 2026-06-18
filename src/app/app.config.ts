import {ApplicationConfig, provideZoneChangeDetection} from '@angular/core';
import {PreloadAllModules, provideRouter, withInMemoryScrolling, withPreloading} from '@angular/router';

import {routes} from './app.routes';
import {provideHttpClient, withXhr} from '@angular/common/http';
import {provideMarkdown} from 'ngx-markdown';
import {provideAnimations} from '@angular/platform-browser/animations';
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
      withPreloading(PreloadAllModules),
      withInMemoryScrolling({
        anchorScrolling: 'enabled',
        scrollPositionRestoration: 'top'
      })
    ),
    provideMarkdown(),
    provideAnimations(),
    {
      provide: SOUND_SERVICE_CONFIG,
      useValue: defaultSoundConfig
    },
    provideFirebaseServices(environment.firebaseConfig, environment.firebaseEmulators)

  ]
};
