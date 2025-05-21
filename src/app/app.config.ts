import {ApplicationConfig, provideZoneChangeDetection} from '@angular/core';
import {provideRouter, withHashLocation} from '@angular/router';

import { routes } from './app.routes';
import {provideHttpClient} from '@angular/common/http';
import {provideMarkdown} from 'ngx-markdown';
import {provideAnimations} from '@angular/platform-browser/animations';
import {defaultSoundConfig, SOUND_SERVICE_CONFIG} from './components/game/services/sound.service';


export const appConfig: ApplicationConfig = {
  providers: [
    provideHttpClient(),
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideRouter(routes, withHashLocation()),
    provideMarkdown(),
    provideAnimations(),
    {
      provide: SOUND_SERVICE_CONFIG,
      useValue: defaultSoundConfig
    }
  ]
};
