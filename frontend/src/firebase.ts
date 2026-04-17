import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyD4ks3tA9JiODgBmLggZWpIZAUIFR7yUhU",
  authDomain: "mbll-rotation-manager.firebaseapp.com",
  projectId: "mbll-rotation-manager",
  storageBucket: "mbll-rotation-manager.firebasestorage.app",
  messagingSenderId: "83714175790",
  appId: "1:83714175790:web:648687e88004d165a800bf",
  measurementId: "G-GCVCWG0JXE"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const googleProvider = new GoogleAuthProvider();

export const loginWithGoogle = () => signInWithPopup(auth, googleProvider);
export const logout = () => signOut(auth);
