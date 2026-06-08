import {ApplicationConfig, provideZoneChangeDetection} from '@angular/core';
import {provideRouter, withHashLocation} from '@angular/router';

import {routes} from './app.routes';
import {provideHttpClient} from '@angular/common/http';
import {provideMarkdown} from 'ngx-markdown';
import {provideAnimations} from '@angular/platform-browser/animations';
import {initializeApp, provideFirebaseApp} from '@angular/fire/app';
import {environment} from '../environments/environment';
import {getAuth, provideAuth} from '@angular/fire/auth';
import {getFirestore, provideFirestore} from '@angular/fire/firestore';
import {getFunctions, provideFunctions} from '@angular/fire/functions';
import {getStorage, provideStorage} from '@angular/fire/storage';
import {
  SOUND_SERVICE_CONFIG,
  SoundServiceConfig
} from './providers/sound/sound.module';
import {getDatabase, provideDatabase} from '@angular/fire/database';

export const defaultSoundConfig: SoundServiceConfig = {
  debounceInterval: 60,
  maxCacheSize: 20,
  defaultVolume: 1.0,
  basePath: 'assets/audio/efx/'
};

export const appConfig: ApplicationConfig = {
  providers: [

    provideHttpClient(),
    provideZoneChangeDetection({eventCoalescing: true}),
    provideRouter(routes, withHashLocation()),
    provideMarkdown(),
    provideAnimations(),
    {
      provide: SOUND_SERVICE_CONFIG,
      useValue: defaultSoundConfig
    },
    provideFirebaseApp(() => {
      try {
        const app = initializeApp(environment.firebaseConfig);
        console.log('Firebase app initialized successfully');
        return app;
      } catch (error) {
        console.error('Error initializing Firebase app:', error);
        throw error;
      }
    }),
    provideAuth(() => {
      try {
        const auth = getAuth();
        console.log('Auth initialized successfully');
        return auth;
      } catch (error) {
        console.error('Error initializing Auth:', error);
        throw error;
      }
    }),
    provideDatabase(() => {
      try {
        const app = initializeApp(environment.firebaseConfig);
        const db = getDatabase(app); // Pass the app instance explicitly
        console.log('Database initialized successfully');
        return db;
      } catch (error) {
        console.error('Error initializing Database:', error);
        throw error;
      }

    }),
    provideFirestore(() => {
      try {
        const firestore = getFirestore();
        console.log('Firestore initialized successfully');
        return firestore;
      } catch (error) {
        console.error('Error initializing Firestore:', error);
        throw error;
      }
    }),
    provideFunctions(() => {
      try {
        const functions = getFunctions(undefined, 'us-east1');
        console.log('Functions initialized successfully');
        return functions;
      } catch (error) {
        console.error('Error initializing Functions:', error);
        throw error;
      }
    }),
    provideStorage(() => {
      try {
        const storage = getStorage();
        console.log('Storage initialized successfully');
        return storage;
      } catch (error) {
        console.error('Error initializing Storage:', error);
        throw error;
      }
    })

  ]
};
