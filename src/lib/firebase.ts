import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore, doc, getDocFromServer } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import { getAnalytics, isSupported } from "firebase/analytics";
import firebaseConfig from "../../firebase-applet-config.json";

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize services
export const auth = getAuth(app);
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
export const storage = getStorage(app);

// Connection test
if (typeof window !== 'undefined') {
  getDocFromServer(doc(db, '_connection_test_', 'test'))
    .then(() => console.log("Firestore connection successful"))
    .catch(err => {
      console.error("Firestore connection test failed:", err.message);
      if (err.message.includes("permission")) {
        console.error("This is a PERMISSION error. Rules might not be applied to the correct database.");
      }
    });
}

// Initialize Analytics lazily
export const analytics = typeof window !== 'undefined' ? isSupported().then(yes => yes ? getAnalytics(app) : null) : null;

export default app;
