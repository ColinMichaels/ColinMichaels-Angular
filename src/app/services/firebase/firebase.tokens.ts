import {InjectionToken, Provider} from '@angular/core';
import {FirebaseApp, FirebaseOptions, getApp, getApps, initializeApp} from 'firebase/app';
import {Auth, connectAuthEmulator, getAuth} from 'firebase/auth';
import type {Database} from 'firebase/database';
import {Firestore, connectFirestoreEmulator, getFirestore} from 'firebase/firestore';
import {Functions, connectFunctionsEmulator, getFunctions} from 'firebase/functions';
import type {FirebaseStorage} from 'firebase/storage';

export const FIREBASE_APP = new InjectionToken<FirebaseApp>('Firebase app');
export const FIREBASE_AUTH = new InjectionToken<Auth>('Firebase auth');
export const FIREBASE_DATABASE = new InjectionToken<Database>('Firebase realtime database');
export const FIREBASE_FIRESTORE = new InjectionToken<Firestore>('Firebase firestore');
export const FIREBASE_FUNCTIONS = new InjectionToken<Functions>('Firebase functions');
export const FIREBASE_STORAGE = new InjectionToken<FirebaseStorage>('Firebase storage');

export interface FirebaseServiceEmulatorConfig {
  auth?: {
    host: string;
    port: number;
  };
  functions?: {
    host: string;
    port: number;
  };
  firestore?: {
    host: string;
    port: number;
  };
}

export function provideFirebaseServices(options: FirebaseOptions, emulators?: FirebaseServiceEmulatorConfig): Provider[] {
  return [
    {
      provide: FIREBASE_APP,
      useFactory: () => getApps().length > 0 ? getApp() : initializeApp(options),
    },
    {
      provide: FIREBASE_AUTH,
      useFactory: (app: FirebaseApp) => {
        const auth = getAuth(app);

        if (emulators?.auth) {
          connectAuthEmulator(
            auth,
            `http://${emulators.auth.host}:${emulators.auth.port}`,
            {disableWarnings: true}
          );
        }

        return auth;
      },
      deps: [FIREBASE_APP],
    },
    {
      provide: FIREBASE_FIRESTORE,
      useFactory: (app: FirebaseApp) => {
        const firestore = getFirestore(app);

        if (emulators?.firestore) {
          connectFirestoreEmulator(firestore, emulators.firestore.host, emulators.firestore.port);
        }

        return firestore;
      },
      deps: [FIREBASE_APP],
    },
    {
      provide: FIREBASE_FUNCTIONS,
      useFactory: (app: FirebaseApp) => {
        const functions = getFunctions(app, 'us-east1');

        if (emulators?.functions) {
          connectFunctionsEmulator(functions, emulators.functions.host, emulators.functions.port);
        }

        return functions;
      },
      deps: [FIREBASE_APP],
    },
  ];
}
