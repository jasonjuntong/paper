import { initializeApp, cert, getApps } from 'firebase-admin/app'
import { getAuth } from 'firebase-admin/auth'
import { getFirestore } from 'firebase-admin/firestore'
import { getStorage } from 'firebase-admin/storage'

function parsePrivateKey(raw: string | undefined): string | undefined {
  if (!raw) return undefined
  // If the value was copied verbatim from the service account JSON it will be
  // a JSON string literal including surrounding quotes — parse it first.
  if (raw.startsWith('"')) {
    try { return JSON.parse(raw) } catch { /* fall through */ }
  }
  // Otherwise replace literal \n sequences (common in .env files and most
  // cloud providers like Vercel / Cloud Run).
  return raw.replace(/\\n/g, '\n')
}

const adminApp = getApps().length
  ? getApps()[0]
  : initializeApp({
      credential: cert({
        projectId: process.env.FIREBASE_PROJECT_ID!,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL!,
        privateKey: parsePrivateKey(process.env.FIREBASE_PRIVATE_KEY),
      }),
      storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    })

export const adminAuth = getAuth(adminApp)
export const adminFirestore = getFirestore(adminApp)
export const adminStorage = getStorage(adminApp)
