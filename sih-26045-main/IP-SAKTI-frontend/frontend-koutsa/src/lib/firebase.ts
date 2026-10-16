import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";

// Firebase configuration for project: ip-sakti-sahayak-22b24
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "AIzaSyBkWKlgJ3R8HWLGyCTHR86durmEUaA5MXs",
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || "ip-sakti-sahayak-22b24.firebaseapp.com",
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "ip-sakti-sahayak-22b24",
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || "ip-sakti-sahayak-22b24.firebasestorage.app",
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "210880167989",
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || "1:210880167989:web:a6f5810545778e2ba1f17c",
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID || "G-Y93CWVQWE7"
};

// Initialize Firebase (singleton)
const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

// Customize Google Provider prompt to always allow account selection
googleProvider.setCustomParameters({
  prompt: "select_account"
});
