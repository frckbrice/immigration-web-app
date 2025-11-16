// Firebase client configuration for Patrick Travel Services

import { initializeApp, getApps, FirebaseApp } from 'firebase/app';
import { getAuth, Auth, setPersistence, browserLocalPersistence } from 'firebase/auth';
import { getDatabase, Database } from 'firebase/database';
import { logger } from '@/lib/utils/logger';

let app: FirebaseApp | null = null;
let auth: Auth | null = null;
let database: Database | null = null;

// Validate and initialize Firebase client configuration
const initializeFirebaseClient = () => {
  // Return early if already initialized
  if (getApps().length > 0) {
    app = getApps()[0];
    auth = getAuth(app);
    database = getDatabase(app);
    return;
  }

  // Validate required environment variables
  const missingVars: string[] = [];

  if (
    !process.env.NEXT_PUBLIC_FIREBASE_API_KEY ||
    process.env.NEXT_PUBLIC_FIREBASE_API_KEY.trim() === ''
  ) {
    missingVars.push('NEXT_PUBLIC_FIREBASE_API_KEY');
  }
  if (
    !process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN ||
    process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN.trim() === ''
  ) {
    missingVars.push('NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN');
  }
  if (
    !process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ||
    process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID.trim() === ''
  ) {
    missingVars.push('NEXT_PUBLIC_FIREBASE_PROJECT_ID');
  }
  if (
    !process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET ||
    process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET.trim() === ''
  ) {
    missingVars.push('NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET');
  }
  if (
    !process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID ||
    process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID.trim() === ''
  ) {
    missingVars.push('NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID');
  }
  if (
    !process.env.NEXT_PUBLIC_FIREBASE_APP_ID ||
    process.env.NEXT_PUBLIC_FIREBASE_APP_ID.trim() === ''
  ) {
    missingVars.push('NEXT_PUBLIC_FIREBASE_APP_ID');
  }

  if (missingVars.length > 0) {
    const errorMessage = `Missing or empty required Firebase client environment variable(s): ${missingVars.join(', ')}. Please check your .env file.`;
    logger.error(errorMessage);
    throw new Error(errorMessage);
  }

  try {
    const firebaseConfig = {
      apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY!,
      authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN!,
      projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID!,
      storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET!,
      messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID!,
      appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID!,
      databaseURL: process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL,
    };

    app = initializeApp(firebaseConfig);
    auth = getAuth(app);

    // Only initialize database if URL is provided (optional)
    if (process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL) {
      database = getDatabase(app);
    }

    // Explicitly set persistence to LOCAL to maintain sessions across page reloads
    // Only set persistence in browser environment
    if (typeof window !== 'undefined') {
      setPersistence(auth, browserLocalPersistence).catch((error) => {
        logger.error('Failed to set Firebase Auth persistence', error);
      });
    }

    logger.debug('Firebase client initialized successfully');
  } catch (error) {
    logger.error('Failed to initialize Firebase client', error);
    throw error;
  }
};

// Initialize on module load
// Throw error immediately if initialization fails to provide clear error messages
initializeFirebaseClient();

// Export Firebase instances (guaranteed to be non-null after successful initialization)
export { app, auth, database };
