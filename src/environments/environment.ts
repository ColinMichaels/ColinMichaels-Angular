export const environment = {
  production: true,
  title: process.env['APP_TITLE'] || 'Colin Michaels',
  apiUrl: process.env['API_URL'] || 'http://localhost:3000',
  openAiApiKey: process.env['OPENAI_API_KEY'] || '',
  openWeatherMapApiKey: process.env['OPEN_WEATHER_MAP_API_KEY'] || '',
  firebaseConfig: {
    apiKey: process.env['FIREBASE_API_KEY'] || '',
    authDomain: process.env['FIREBASE_AUTH_DOMAIN'] || '',
    databaseURL: process.env['FIREBASE_DATABASE_URL'] || '',
    projectId: process.env['FIREBASE_PROJECT_ID'] || '',
    storageBucket: process.env['FIREBASE_STORAGE_BUCKET'] || '',
    messagingSenderId: process.env['FIREBASE_MESSAGING_SENDER_ID'] || '',
    appId: process.env['FIREBASE_APP_ID'] || '',
    measurementId: process.env['FIREBASE_MEASUREMENT_ID'] || ''
  }
};
