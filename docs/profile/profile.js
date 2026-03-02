import { initializeApp } from "https://www.gstatic.com/firebasejs/12.10.0/firebase-app.js";
import {
  getAdditionalUserInfo,
  getAuth,
  onAuthStateChanged,
  signInWithPopup,
  signOut,
  TwitterAuthProvider,
} from "https://www.gstatic.com/firebasejs/12.10.0/firebase-auth.js";
import {
  doc,
  getDocFromServer,
  getFirestore,
  setDoc,
} from "https://www.gstatic.com/firebasejs/12.10.0/firebase-firestore.js";

const textLoginStatus = document.getElementById("textLoginStatus");
const buttonLogin = document.getElementById("buttonLogin");
const buttonLogout = document.getElementById("buttonLogout");
const formProfile = document.getElementById("formProfile");
const fieldsetProfile = document.getElementById("fieldsetProfile");

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
const db = getFirestore(app);

onAuthStateChanged(auth, async (user) => {
  if (user) {
    textLoginStatus.innerText = `${user.uid}でログイン中。`;

    const userProfileDocRef = getUserProfileDocRef(db, user.uid);
    const userProfileDoc = await getDocFromServer(userProfileDocRef);
    const userProfile = userProfileDoc.data();
    setUserProfileToForm(formProfile, userProfile);

    fieldsetProfile.disabled = false;
  } else {
    textLoginStatus.innerText = "ログインしていません。";

    clearUserProfileForm(formProfile);

    fieldsetProfile.disabled = true;
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

formProfile.addEventListener("submit", async (event) => {
  event.preventDefault();

  // TODO: validate
  // TODO: 更新日時の管理
  const userProfile = getUserProfileFromForm(formProfile);
  const userProfileDocRef = getUserProfileDocRef(db, auth.currentUser.uid);
  await setDoc(userProfileDocRef, userProfile, { merge: true });

  alert("更新完了");
});

function getUserProfileFromForm(form) {
  const userName = form.elements["userName"].value.trim();
  const djName = form.elements["djName"].value.trim();
  const iidxId = form.elements["iidxId"].value.trim();
  const csv = form.elements["csv"].value.trim();
  return { userName, djName, iidxId, csv };
}

function setUserProfileToForm(form, userProfile) {
  if (userProfile == null) {
    userProfile = makeEmptyUserProfile();
  }
  form.elements["userName"].value = userProfile.userName;
  form.elements["djName"].value = userProfile.djName;
  form.elements["iidxId"].value = userProfile.iidxId;
  form.elements["csv"].value = userProfile.csv;
}

function clearUserProfileForm(form) {
  setUserProfileToForm(form, makeEmptyUserProfile());
}

function getUserProfileDocRef(db, userId) {
  return doc(db, "userProfiles", userId);
}

function makeEmptyUserProfile() {
  return {
    userName: "",
    djName: "",
    iidxId: "",
    csv: "",
  };
}
