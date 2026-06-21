/**
 * Firebase initialization for Rounds.
 * Uses Expo public env vars so config is available in client bundle.
 */

import { Platform } from 'react-native';
import { initializeApp } from 'firebase/app';
import { initializeAuth, getReactNativePersistence, browserLocalPersistence, connectAuthEmulator } from 'firebase/auth';
import { getFirestore, connectFirestoreEmulator } from 'firebase/firestore';
import { getFunctions, connectFunctionsEmulator } from 'firebase/functions';
import { getStorage, connectStorageEmulator } from 'firebase/storage';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { connectFirebaseEmulators } = require('./firebase-emulators');

const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.EXPO_PUBLIC_FIREBASE_MEASUREMENT_ID,
};

const app = initializeApp(firebaseConfig);

// Persistence is platform-conditional: React Native uses AsyncStorage, but web has no
// getReactNativePersistence (native-only export) so it uses browser local storage.
// Without this split the web bundle throws `getReactNativePersistence is not a function`
// on boot and renders blank — which also blocks headless screenshot verification.
export const auth = initializeAuth(app, {
  persistence:
    Platform.OS === 'web'
      ? browserLocalPersistence
      : getReactNativePersistence(AsyncStorage),
});
export const db = getFirestore(app);
export const functions = getFunctions(app);
export const storage = getStorage(app);

export const firebaseEmulatorConfig = connectFirebaseEmulators(
  { auth, db, functions, storage },
  {
    connectAuthEmulator,
    connectFirestoreEmulator,
    connectFunctionsEmulator,
    connectStorageEmulator,
  },
  {
    useFirebaseEmulators: process.env.EXPO_PUBLIC_USE_FIREBASE_EMULATORS,
    host: process.env.EXPO_PUBLIC_FIREBASE_EMULATOR_HOST,
    authPort: process.env.EXPO_PUBLIC_FIREBASE_AUTH_EMULATOR_PORT,
    firestorePort: process.env.EXPO_PUBLIC_FIREBASE_FIRESTORE_EMULATOR_PORT,
    functionsPort: process.env.EXPO_PUBLIC_FIREBASE_FUNCTIONS_EMULATOR_PORT,
    storagePort: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_EMULATOR_PORT,
  }
);

export default app;
