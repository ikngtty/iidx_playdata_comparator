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
  serverTimestamp,
} from "https://www.gstatic.com/firebasejs/12.10.0/firebase-firestore.js";

import { upsertDocWithTs } from "../shared/firestore_util.js";

const areaMain = document.getElementById("areaMain");
const textLoginStatus = document.getElementById("textLoginStatus");
const buttonLogin = document.getElementById("buttonLogin");
const buttonLogout = document.getElementById("buttonLogout");
const formProfile = document.getElementById("formProfile");
const fieldsetProfile = document.getElementById("fieldsetProfile");
const areaConsent = document.getElementById("areaConsent");
const checkAgree = document.getElementById("checkAgree");
const buttonAgree = document.getElementById("buttonAgree");

const firebaseConfig = {
  apiKey: "AIzaSyArJqsfRgtG3Fj0q2ZqBSdqpxwkzCbffMM",
  authDomain: "iidx-playdata-comparator.firebaseapp.com",
  projectId: "iidx-playdata-comparator",
  storageBucket: "iidx-playdata-comparator.firebasestorage.app",
  messagingSenderId: "185685035183",
  appId: "1:185685035183:web:d39ec9abdfb6f39096ac5a",
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const twitterProvider = new TwitterAuthProvider();
const db = getFirestore(app);

onAuthStateChanged(auth, async (authUser) => {
  const userStatus = await getUserStatus(authUser);
  await renderForUserStatus(userStatus);
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
  const userProfile = getUserProfileFromForm(formProfile);
  const userProfileDocRef = getUserProfileDocRef(db, auth.currentUser.uid);
  await upsertDocWithTs(userProfileDocRef, userProfile);

  alert("更新完了");
});

checkAgree.addEventListener("change", (event) => {
  buttonAgree.disabled = !checkAgree.checked;
});

buttonAgree.addEventListener("click", async (event) => {
  const userDocRef = getUserDocRef(db, auth.currentUser.uid);
  await upsertDocWithTs(userDocRef, { agreeAt: serverTimestamp() });

  const userStatus = await getUserStatus(auth.currentUser);
  await renderForUserStatus(userStatus);
});

async function getUserStatus(authUser) {
  if (authUser == null) {
    return { status: "NotLoggedIn", userInfo: null };
  }

  const uid = authUser.uid;

  const userDocRef = getUserDocRef(db, uid);
  const userDoc = await getDocFromServer(userDocRef);
  const user = userDoc.data();

  const userInfo = { uid };

  if (user == null || user.agreeAt == null) {
    return { status: "NotAgreed", userInfo };
  }
  return { status: "Agreed", userInfo };
}

async function renderForUserStatus(userStatus) {
  if (userStatus.userInfo == null) {
    textLoginStatus.innerText = "ログインしていません。";
  } else {
    const { uid } = userStatus.userInfo;

    textLoginStatus.innerText = `${uid}でログイン中。`;
  }

  switch (userStatus.status) {
    case "NotLoggedIn":
      {
        areaConsent.style.display = "none";

        fieldsetProfile.disabled = true;
        clearUserProfileForm(formProfile);
        areaMain.style.display = "block";
      }
      break;

    case "Agreed":
      {
        const {
          userInfo: { uid },
        } = userStatus;

        areaConsent.style.display = "none";

        fieldsetProfile.disabled = false;
        {
          const userProfileDocRef = getUserProfileDocRef(db, uid);
          const userProfileDoc = await getDocFromServer(userProfileDocRef);
          const userProfile = userProfileDoc.data();
          setUserProfileToForm(formProfile, userProfile);
        }
        areaMain.style.display = "block";
      }
      break;

    case "NotAgreed":
      {
        areaMain.style.display = "none";

        checkAgree.checked = false;
        buttonAgree.disabled = true;
        areaConsent.style.display = "block";
      }
      break;

    default:
      throw new Error(`unexpected user status: ${userStatus}`);
  }
}

function getUserProfileFromForm(form) {
  const userName = form.elements["userName"].value.trim();
  const djName = form.elements["djName"].value.trim();
  const iidxId = form.elements["iidxId"].value.trim();
  const playdataSp = form.elements["playdataSp"].value.trim();
  const playdataDp = form.elements["playdataDp"].value.trim();
  return { userName, djName, iidxId, playdataSp, playdataDp };
}

function setUserProfileToForm(form, userProfile) {
  if (userProfile == null) {
    userProfile = makeEmptyUserProfile();
  }
  form.elements["userName"].value = userProfile.userName;
  form.elements["djName"].value = userProfile.djName;
  form.elements["iidxId"].value = userProfile.iidxId;
  form.elements["playdataSp"].value = userProfile.playdataSp;
  form.elements["playdataDp"].value = userProfile.playdataDp;
}

function clearUserProfileForm(form) {
  setUserProfileToForm(form, makeEmptyUserProfile());
}

function getUserDocRef(db, userId) {
  return doc(db, "users", userId);
}

function getUserProfileDocRef(db, userId) {
  return doc(db, "userProfiles", userId);
}

function makeEmptyUserProfile() {
  return {
    userName: "",
    djName: "",
    iidxId: "",
    playdataSp: "",
    playdataDp: "",
  };
}
