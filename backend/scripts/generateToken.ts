import * as admin from "firebase-admin";
import { initializeApp } from "firebase/app";
import { signInWithCustomToken, getAuth } from "firebase/auth";

// Load Firebase service account key (Download from Firebase Console)
const serviceAccount = require("../config/firebase/firebase-service-account.json");

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const firebaseConfig = {
  apiKey: "AIzaSyDL4JTBbPzJmtHWw4toD2BuMsVEkHC3d6s",
  authDomain: "memento-rpl.firebaseapp.com",
  projectId: "memento-rpl",
  storageBucket: "memento-rpl.firebasestorage.app",
  messagingSenderId: "550630397646",
  appId: "1:550630397646:web:a97745787fa0131809229f",
  measurementId: "G-36HEG45HGH"
};

const clientApp = initializeApp(firebaseConfig);
const auth = getAuth(clientApp);

async function generateAndUseToken(uid: string) {
  try {
    // Generate custom token with admin SDK
    const customToken = await admin.auth().createCustomToken(uid);
    console.log("Generated Custom Token:", customToken);
    
    // Use the token to sign in
    const userCredential = await signInWithCustomToken(auth, customToken);
    
    // Get the ID token
    const idToken = await userCredential.user.getIdToken();
    console.log("Generated ID Token:", idToken);
    
    return idToken;
  } catch (error) {
    console.error("Error:", error);
    throw error;
  }
}

// Call the function
generateAndUseToken("Mz1cLtTsl4dLDccIQcUOm1s4UfA3").catch(console.error);