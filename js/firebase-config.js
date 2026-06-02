import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getDatabase }   from "https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js";

const firebaseConfig = {
  apiKey:            "AIzaSyBlAM-OILysMt1RnPQkzWjEWUAhmHTHW2E",
  authDomain:        "sistemamatematica-50eff.firebaseapp.com",
  projectId:         "sistemamatematica-50eff",
  storageBucket:     "sistemamatematica-50eff.firebasestorage.app",
  messagingSenderId: "29610901805",
  appId:             "1:29610901805:web:f01f7516fa2d19942753a4",
  databaseURL:       "https://sistemamatematica-50eff-default-rtdb.firebaseio.com"
};

export const app = initializeApp(firebaseConfig);
export const db = getDatabase(app);
