// Test script to verify Firebase connection
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, addDoc, getDocs } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyC_eZ3Q_Qtd5MONfJGdoBoULz3sqBaHxZk",
  authDomain: "como-me-veo-mvp.firebaseapp.com",
  projectId: "como-me-veo-mvp",
  storageBucket: "como-me-veo-mvp.firebasestorage.app",
  messagingSenderId: "936013154795",
  appId: "1:936013154795:web:47901a3ce528df459071ae",
  measurementId: "G-MSMHCK5JZH"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function testFirebaseConnection() {
  try {
    console.log('Testing Firebase connection...');
    
    // Test read access
    const testCollection = collection(db, 'test');
    const snapshot = await getDocs(testCollection);
    console.log('✅ Firebase connection successful!');
    console.log('Test collection documents:', snapshot.docs.length);
    
    // Test write access
    const docRef = await addDoc(collection(db, 'test'), {
      message: 'Hello Firebase!',
      timestamp: new Date()
    });
    console.log('✅ Write test successful! Document ID:', docRef.id);
    
  } catch (error) {
    console.error('❌ Firebase connection failed:', error);
    console.error('Error code:', error.code);
    console.error('Error message:', error.message);
  }
}

testFirebaseConnection();

