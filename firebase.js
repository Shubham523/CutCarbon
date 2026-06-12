// Import the functions you need from the SDKs you need
import { initializeApp ,getApps, getApp} from "firebase/app";
import {getFirestore} from "firebase/firestore";
import { getAuth, GoogleAuthProvider } from "firebase/auth";

const firebaseConfig = {
  apiKey: "REDACTED",
  authDomain: "carbonemissionanalysis.firebaseapp.com",
  projectId: "carbonemissionanalysis",
  storageBucket: "carbonemissionanalysis.firebasestorage.app",
  messagingSenderId: "730536626392",
  appId: "1:730536626392:web:046cc4cf6b028a22efefad",
  measurementId: "G-399Q82YSN7"
};

// Initialize Firebase
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
const db = getFirestore(app);

// 2. Initialize Auth and the Google Provider
const auth = getAuth(app);
const provider = new GoogleAuthProvider();

// Request Google Fit activity read access during sign-in
provider.addScope('https://www.googleapis.com/auth/fitness.activity.read');

// 3. Make sure auth and provider are exported
export { app, db, auth, provider };