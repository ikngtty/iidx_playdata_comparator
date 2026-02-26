import { initializeApp } from "https://www.gstatic.com/firebasejs/12.10.0/firebase-app.js";
import {
  getAdditionalUserInfo,
  getAuth,
  onAuthStateChanged,
  signInWithPopup,
  signOut,
  TwitterAuthProvider,
} from "https://www.gstatic.com/firebasejs/12.10.0/firebase-auth.js";

const textLoginStatus = document.getElementById("textLoginStatus");
const buttonLogin = document.getElementById("buttonLogin");
const buttonLogout = document.getElementById("buttonLogout");

const firebaseConfig = {
  apiKey: "AIzaSyAm4Yb7EfBoXXgtp-rilAkjy7XxeeA-1GU",
  authDomain: "iidx-csv-comparator.firebaseapp.com",
  projectId: "iidx-csv-comparator",
  storageBucket: "iidx-csv-comparator.firebasestorage.app",
  messagingSenderId: "118248646396",
  appId: "1:118248646396:web:3081651fe9fa33c62ed979",
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const twitterProvider = new TwitterAuthProvider();

onAuthStateChanged(auth, (user) => {
  if (user) {
    textLoginStatus.innerText = `${user.uid}でログイン中。`;
  } else {
    textLoginStatus.innerText = "ログインしていません。";
  }
});

buttonLogin.addEventListener("click", async () => {
  try {
    const result = await signInWithPopup(auth, twitterProvider);
    // console.log("result", result);
    const additionalUserInfo = getAdditionalUserInfo(result);
    // console.log("additional", additionalUserInfo);
  } catch (e) {
    console.log(e);
  }
});

buttonLogout.addEventListener("click", () => {
  signOut(auth);
});
