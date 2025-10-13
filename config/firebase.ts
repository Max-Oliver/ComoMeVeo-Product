import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, connectAuthEmulator } from 'firebase/auth';
import { getFirestore, connectFirestoreEmulator } from 'firebase/firestore';
import { getDatabase } from 'firebase/database';
import { getStorage } from 'firebase/storage';

const firebaseConfig = {
  apiKey: "AIzaSyC_eZ3Q_Qtd5MONfJGdoBoULz3sqBaHxZk",
  authDomain: "como-me-veo-mvp.firebaseapp.com",
  projectId: "como-me-veo-mvp",
  storageBucket: "como-me-veo-mvp.firebasestorage.app",
  messagingSenderId: "936013154795",
  appId: "1:936013154795:web:47901a3ce528df459071ae",
  measurementId: "G-MSMHCK5JZH"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase services
export const auth = getAuth(app);
export const db = getFirestore(app);
export const database = getDatabase(app);
export const storage = getStorage(app);
export const googleProvider = new GoogleAuthProvider();

// Enable persistence for better offline support
if (typeof window !== 'undefined') {
  console.log('Firebase initialized with config:', {
    projectId: firebaseConfig.projectId,
    authDomain: firebaseConfig.authDomain
  });
}

export default app;
