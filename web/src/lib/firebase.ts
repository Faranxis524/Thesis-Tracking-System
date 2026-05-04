// Firebase Configuration - src/lib/firebase.ts
import { initializeApp, getApps, getApp, type FirebaseApp } from 'firebase/app';
import { getAuth, type Auth } from 'firebase/auth';
import { getFirestore, type Firestore, enableIndexedDbPersistence } from 'firebase/firestore';
import { getFunctions, type Functions } from 'firebase/functions';

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID
};

let app: FirebaseApp;
let auth: Auth;
let db: Firestore;
let functions: Functions;

if (typeof window !== 'undefined') {
  if (getApps().length === 0) {
    app = initializeApp(firebaseConfig);
  } else {
    app = getApp();
  }
  
  auth = getAuth(app);
  db = getFirestore(app);
  functions = getFunctions(app);
  
  // Enable offline persistence only in production to avoid IndexedDB lock issues in dev
  if (process.env.NODE_ENV === 'production') {
    enableIndexedDbPersistence(db).catch((err: any) => {
      if (err.code === 'failed-precondition') {
        console.warn('Multiple tabs open, persistence disabled');
      } else if (err.code === 'unimplemented') {
        console.warn('Persistence not supported in this browser');
      } else {
        console.warn('Could not enable persistence:', err);
      }
    });
  } else {
    // In development, skip persistence to avoid persistence-layer exclusive access errors
    console.debug('Skipping IndexedDB persistence in development');
  }
} else {
  // Server-side - return dummy objects or initialize differently
  app = {} as FirebaseApp;
  auth = {} as Auth;
  db = {} as Firestore;
  functions = {} as Functions;
}

export { app, auth, db, functions };

// Re-export Firebase types and functions for convenience
export type {
  User,
  AuthError,
  UserCredential,
  NextOrObserver
} from 'firebase/auth';

export type {
  Firestore,
  CollectionReference,
  DocumentReference,
  Query,
  QuerySnapshot,
  DocumentSnapshot,
  Timestamp,
  GeoPoint,
  FieldValue
} from 'firebase/firestore';

export type {
  Functions
} from 'firebase/functions';
