import { initializeApp, getApps } from 'firebase/app'
import { connectAuthEmulator, getAuth } from 'firebase/auth'
import { connectFirestoreEmulator, getFirestore } from 'firebase/firestore'

const config = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY!,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN!,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID!,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET!,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID!,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID!,
}

const useEmulator = process.env.NEXT_PUBLIC_FIREBASE_EMULATOR === 'true'
const firstInit = getApps().length === 0
const app = firstInit ? initializeApp(config) : getApps()[0]

export const auth = getAuth(app)

// Client Firestore is used ONLY for the deliberate `/handles` read exception
// (live handle-availability feedback at registration); see handles.client.ts
// and firestore.rules. All other Firestore access stays server-side (admin SDK).
export const db = getFirestore(app)

// E2E only: route the client SDK to the local Firebase emulators. Gated on
// NEXT_PUBLIC_FIREBASE_EMULATOR so production builds never connect locally.
// Guarded by `firstInit` because connect* must run once, before any use.
if (useEmulator && firstInit) {
  connectAuthEmulator(auth, 'http://127.0.0.1:9099', { disableWarnings: true })
  connectFirestoreEmulator(db, '127.0.0.1', 8080)
}
