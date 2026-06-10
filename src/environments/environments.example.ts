export const environment = {
  production: false,
  title: '<APP_TITLE>',
  apiUrl: '<APP_API_URL>', // your NestJS backend
  openAiApiKey: '<OPENAI_API_KEY>',
  openWeatherMapApiKey: '<OPEN_WEATHER_MAP_API_KEY>',
  firebaseConfig: {
    apiKey: "<FIREBASE_API_KEY>",
    authDomain: "<FIREBASE_AUTH_DOMAIN>",
    projectId: "<FIREBASE_PROJECT_ID>",
    databaseURL: "<FIREBASE_DATABASE_URL>",
    storageBucket: "<FIREBASE_STORAGE_BUCKET>",
    messagingSenderId: "<FIREBASE_MESSAGING_SENDER_ID>",
    appId: "<FIREBASE_APP_ID>",
    measurementId: "<FIREBASE_MEASUREMENT_ID>"
  },
  firebaseEmulators: undefined
};
