// js/firebase-config.js - REAL FIREBASE CONFIGURATION

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getFirestore }   from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

// TODO: Replace with your actual Firebase project configuration
const firebaseConfig = {
    apiKey: "AIzaSyAONyQ-NzS4b40Bqeu7AqIWbelPKg9k_wo",
  authDomain: "sofix-8957d.firebaseapp.com",
  projectId: "sofix-8957d",
  storageBucket: "sofix-8957d.firebasestorage.app",
  messagingSenderId: "156447440286",
  appId: "1:156447440286:web:e3ebbbf9b52ce7e4b4aa8f"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firestore
const db = getFirestore(app);

console.log('🔥 Real Firebase initialized');

export { db };