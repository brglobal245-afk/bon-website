import { initializeApp, getApps, getApp } from 'firebase/app'
import { getFirestore } from 'firebase/firestore'
import { getAuth, signInAnonymously, onAuthStateChanged } from 'firebase/auth'
import { getFunctions } from 'firebase/functions'

// Firebase configuration using Vite environment variables
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || '',
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || '',
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || '',
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || '',
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '',
  appId: import.meta.env.VITE_FIREBASE_APP_ID || '',
}

let app
let db = null
let auth = null
let functions = null
let isFirebaseConfigured = false

if (firebaseConfig.projectId && firebaseConfig.apiKey) {
  try {
    app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp()
    db = getFirestore(app)
    auth = getAuth(app)
    functions = getFunctions(app)
    isFirebaseConfigured = true
    
    // Automatically log in session anonymously if no session exists
    onAuthStateChanged(auth, (user) => {
      if (!user) {
        signInAnonymously(auth)
          .then(() => console.log('Session-based anonymous authentication established.'))
          .catch((e) => console.error('Session-based authentication failed:', e))
      }
    })
    
    console.log('Firebase services initialized successfully.')
  } catch (error) {
    console.error('Firebase initialization failed:', error)
  }
} else {
  console.warn('Firebase environment variables not set. Swap and terminal pages will run in simulated demo mode.')
}

export { db, auth, functions, isFirebaseConfigured }
