import {InjectionToken, Provider} from '@angular/core';
import {FirebaseApp, FirebaseOptions, getApp, getApps, initializeApp} from 'firebase/app';
import {AppCheck, initializeAppCheck, ReCaptchaEnterpriseProvider} from 'firebase/app-check';
import {Auth, connectAuthEmulator, getAuth} from 'firebase/auth';
import type {Database} from 'firebase/database';
import {Firestore, connectFirestoreEmulator, getFirestore} from 'firebase/firestore';
import {Functions, connectFunctionsEmulator, getFunctions} from 'firebase/functions';
import type {FirebaseStorage} from 'firebase/storage';

export const FIREBASE_APP = new InjectionToken<FirebaseApp>('Firebase app');
export const FIREBASE_APP_CHECK = new InjectionToken<AppCheck | null>('Firebase App Check');
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

/**
 * The reCAPTCHA site key is public browser configuration. The local-only debug
 * token must never be committed or placed in a deployed environment.
 */
export interface FirebaseAppCheckConfig {
  recaptchaEnterpriseSiteKey?: string;
  /**
   * Set to true on a local first run to have the SDK create and print a debug
   * token. Use a previously registered token string only for a second browser,
   * another machine, or CI.
   */
  debugToken?: true | string;
}

type AppCheckDebugGlobal = typeof globalThis & {
  FIREBASE_APPCHECK_DEBUG_TOKEN?: true | string;
};

export function provideFirebaseServices(
  options: FirebaseOptions,
  emulators?: FirebaseServiceEmulatorConfig,
  appCheckConfig?: FirebaseAppCheckConfig,
): Provider[] {
  return [
    {
      provide: FIREBASE_APP,
      useFactory: () => getApps().length > 0 ? getApp() : initializeApp(options),
    },
    {
      provide: FIREBASE_APP_CHECK,
      useFactory: (app: FirebaseApp) => {
        const siteKey = appCheckConfig?.recaptchaEnterpriseSiteKey?.trim();

        // App Check remains inert until its Console provider and matching
        // public site key are configured for the deployed domain.
        if (!siteKey) {
          return null;
        }

        const debugToken = appCheckConfig?.debugToken;
        if (debugToken === true) {
          (globalThis as AppCheckDebugGlobal).FIREBASE_APPCHECK_DEBUG_TOKEN = true;
        } else if (debugToken?.trim()) {
          (globalThis as AppCheckDebugGlobal).FIREBASE_APPCHECK_DEBUG_TOKEN = debugToken.trim();
        }

        return initializeAppCheck(app, {
          provider: new ReCaptchaEnterpriseProvider(siteKey),
          isTokenAutoRefreshEnabled: true,
        });
      },
      deps: [FIREBASE_APP],
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
