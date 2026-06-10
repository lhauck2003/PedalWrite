// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  //onAuthStateChanged,
  signOut,
} from "firebase/auth";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyC0CtZS3wykuqHZEfdaH6O7-mLql6a5KEM",
  authDomain: "bike-first.firebaseapp.com",
  projectId: "bike-first",
  storageBucket: "bike-first.firebasestorage.app",
  messagingSenderId: "139824602372",
  appId: "1:139824602372:web:a9e9edba1c4fe3d84a0451",
  measurementId: "G-TYBZR5N4E6"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
// const analytics = getAnalytics(app);
export const auth = getAuth();
const provider = new GoogleAuthProvider();
provider.setCustomParameters({
  prompt: "select_account", // This forces the browser to ask "Which account?"
});

// Pure Firebase functions
export const loginWithGoogle = async () => {
  const result = await signInWithPopup(auth, provider);

  const user = result.user;
  const idToken = await user.getIdToken();
  const uid = user.uid;

  return { uid, idToken, user };
};
export const logoutFromFirebase = () => signOut(auth);
export const googleProvider = provider;
export default app;