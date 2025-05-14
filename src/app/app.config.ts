import {ApplicationConfig, provideZoneChangeDetection} from '@angular/core';
import {provideRouter, withHashLocation} from '@angular/router';

import { routes } from './app.routes';
import {provideHttpClient} from '@angular/common/http';
import {CLIPBOARD_OPTIONS, ClipboardButtonComponent, MARKED_OPTIONS, provideMarkdown} from 'ngx-markdown';


export const appConfig: ApplicationConfig = {
  providers: [
    provideHttpClient(),
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideRouter(routes, withHashLocation()),
    provideMarkdown({
        clipboardOptions: {
          provide: CLIPBOARD_OPTIONS,
          useValue: {
            buttonComponent: ClipboardButtonComponent,
          },
        },
      markedOptions: {
        provide: MARKED_OPTIONS,
        useValue: {
          gfm: true,
          breaks: true,
          pedantic: false,
        },
      },
      }
    )
  ]
};
