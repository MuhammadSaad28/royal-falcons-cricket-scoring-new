import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

// Firebase configuration - Replace with your Firebase config
const firebaseConfig = {
  apiKey: "AIzaSyDL5QEebLu7f-BUrQwhPoOPkNevno3w4sE",
  authDomain: "royal-falcons-cricket-scoring.firebaseapp.com",
  projectId: "royal-falcons-cricket-scoring",
  storageBucket: "royal-falcons-cricket-scoring.firebasestorage.app",
  messagingSenderId: "500961170431",
  appId: "1:500961170431:web:d5eee4f0d27c534a9d0dca",
  measurementId: "G-HZTH03D1JP"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase Authentication and get a reference to the service
export const auth = getAuth(app);

// Initialize Cloud Firestore and get a reference to the service
export const db = getFirestore(app);

export default app;