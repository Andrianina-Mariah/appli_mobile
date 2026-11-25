import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyC-jyTRBP4MjOBeDCCtvz5tghYQujIg2U8",
  authDomain: "plantes-app-71b64.firebaseapp.com",
  projectId: "plantes-app-71b64",
  storageBucket: "plantes-app-71b64.firebasestorage.app",
  messagingSenderId: "627136695994",
  appId: "1:627136695994:web:e1137663bd9a6d929bbc83",
  measurementId: "G-EHHTJNCDSK"
};


const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);