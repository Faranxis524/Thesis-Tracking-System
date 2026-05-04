// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyA2lJf1nu5bAC-sX7_Ln-ZO5mFULCIyk5w",
  authDomain: "thesistracker-1fed1.firebaseapp.com",
  projectId: "thesistracker-1fed1",
  storageBucket: "thesistracker-1fed1.firebasestorage.app",
  messagingSenderId: "881922438498",
  appId: "1:881922438498:web:57d2450443b6d6211ea83b",
  measurementId: "G-9LYVYLHB3K"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);