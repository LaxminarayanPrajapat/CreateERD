import { initializeApp, getApps, getApp } from 'firebase/app'
import { getAuth } from 'firebase/auth'
import { getFirestore } from 'firebase/firestore'

/**
 * Firebase SDK v10 modular initialisation.
 * All configuration values are read from Vite environment variables
 * (VITE_ prefixed so they are exposed to the client bundle).
 *
 * Required environment variables (set in .env.local):
 *   VITE_FIREBASE_API_KEY
 *   VITE_FIREBASE_AUTH_DOMAIN
 *   VITE_FIREBASE_PROJECT_ID
 *   VITE_FIREBASE_STORAGE_BUCKET
 *   VITE_FIREBASE_MESSAGING_SENDER_ID
 *   VITE_FIREBASE_APP_ID
 */
const firebaseConfig = {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
    storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
    appId: import.meta.env.VITE_FIREBASE_APP_ID,
}

// Avoid re-initialising the app during hot-module replacement in development.
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp()

/** Firebase Auth instance (supports Google OAuth and Email/Password). */
export const auth = getAuth(app)

/** Firestore database instance for diagram persistence. */
export const db = getFirestore(app)

export default app
