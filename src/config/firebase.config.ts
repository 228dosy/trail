import { deleteApp, initializeApp, type FirebaseApp } from 'firebase/app';
import { getAuth, type Auth } from 'firebase/auth';
import { getDatabase, type Database } from 'firebase/database';

export const FIREBASE_CONFIG = {
  apiKey: 'AIzaSyDJMzcq783vwt2VEKIeg47Mc1JEJD0M4Ig',
  authDomain: 'points-tables-95864.firebaseapp.com',
  databaseURL: 'https://points-tables-95864-default-rtdb.firebaseio.com',
  projectId: 'points-tables-95864',
  storageBucket: 'points-tables-95864.firebasestorage.app',
  messagingSenderId: '233581412654',
  appId: '1:233581412654:web:eab98db0c4db6f4e70fabf',
} as const;

export const app: FirebaseApp = initializeApp(FIREBASE_CONFIG);
export const db: Database = getDatabase(app);
export const auth: Auth = getAuth(app);

export function createSecondaryAuthApp(): { secondaryApp: FirebaseApp; secondaryAuth: Auth } {
  const secondaryApp = initializeApp(FIREBASE_CONFIG, `helper-create-${Date.now()}`);
  const secondaryAuth = getAuth(secondaryApp);
  return { secondaryApp, secondaryAuth };
}

export async function destroySecondaryApp(secondaryApp: FirebaseApp | null): Promise<void> {
  if (!secondaryApp) return;
  try {
    await deleteApp(secondaryApp);
  } catch {
    // Ignore cleanup errors on already-disposed secondary instances
  }
}
