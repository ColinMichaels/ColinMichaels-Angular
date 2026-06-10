import {InjectionToken, Provider} from '@angular/core';
import {FirebaseApp, FirebaseOptions, getApp, getApps, initializeApp} from 'firebase/app';
import {Auth, getAuth} from 'firebase/auth';
import {Database, getDatabase} from 'firebase/database';
import {Firestore, getFirestore} from 'firebase/firestore';
import {Functions, getFunctions} from 'firebase/functions';
import {FirebaseStorage, getStorage} from 'firebase/storage';

export const FIREBASE_APP = new InjectionToken<FirebaseApp>('Firebase app');
export const FIREBASE_AUTH = new InjectionToken<Auth>('Firebase auth');
export const FIREBASE_DATABASE = new InjectionToken<Database>('Firebase realtime database');
export const FIREBASE_FIRESTORE = new InjectionToken<Firestore>('Firebase firestore');
export const FIREBASE_FUNCTIONS = new InjectionToken<Functions>('Firebase functions');
export const FIREBASE_STORAGE = new InjectionToken<FirebaseStorage>('Firebase storage');

export function provideFirebaseServices(options: FirebaseOptions): Provider[] {
  return [
    {
      provide: FIREBASE_APP,
      useFactory: () => getApps().length > 0 ? getApp() : initializeApp(options),
    },
    {
      provide: FIREBASE_AUTH,
      useFactory: (app: FirebaseApp) => getAuth(app),
      deps: [FIREBASE_APP],
    },
    {
      provide: FIREBASE_DATABASE,
      useFactory: (app: FirebaseApp) => getDatabase(app),
      deps: [FIREBASE_APP],
    },
    {
      provide: FIREBASE_FIRESTORE,
      useFactory: (app: FirebaseApp) => getFirestore(app),
      deps: [FIREBASE_APP],
    },
    {
      provide: FIREBASE_FUNCTIONS,
      useFactory: (app: FirebaseApp) => getFunctions(app, 'us-east1'),
      deps: [FIREBASE_APP],
    },
    {
      provide: FIREBASE_STORAGE,
      useFactory: (app: FirebaseApp) => getStorage(app),
      deps: [FIREBASE_APP],
    },
  ];
}
