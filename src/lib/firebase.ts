import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import firebaseConfigDefault from '../../firebase-applet-config.json';

// Vercel/GitHub 배포 시 환경변수를 통해 Firebase 설정을 오버라이드할 수 있도록 유연한 이중 폴백 구조 설계
const firebaseConfig = {
  projectId: (import.meta as any).env.VITE_FIREBASE_PROJECT_ID || firebaseConfigDefault.projectId,
  appId: (import.meta as any).env.VITE_FIREBASE_APP_ID || firebaseConfigDefault.appId,
  apiKey: (import.meta as any).env.VITE_FIREBASE_API_KEY || firebaseConfigDefault.apiKey,
  authDomain: (import.meta as any).env.VITE_FIREBASE_AUTH_DOMAIN || firebaseConfigDefault.authDomain,
  firestoreDatabaseId: (import.meta as any).env.VITE_FIREBASE_FIRESTORE_DATABASE_ID || firebaseConfigDefault.firestoreDatabaseId,
  storageBucket: (import.meta as any).env.VITE_FIREBASE_STORAGE_BUCKET || firebaseConfigDefault.storageBucket,
  messagingSenderId: (import.meta as any).env.VITE_FIREBASE_MESSAGING_SENDER_ID || firebaseConfigDefault.messagingSenderId,
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
export const auth = getAuth(app);
