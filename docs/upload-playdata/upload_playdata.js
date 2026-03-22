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
  getDocFromServer,
  getFirestore,
  serverTimestamp,
} from "https://www.gstatic.com/firebasejs/12.10.0/firebase-firestore.js";

import { CONFIG as FIREBASE_CONFIG } from "../shared/firebase_util.js";
import { upsertDocWithTs } from "../shared/firestore_util.js";
import {
  RuleJustLength,
  RuleMaxLength,
  RuleNumeric,
  RuleRequired,
} from "../shared/validation/rules.js";
import ValidatableField from "../shared/validation/validatable_field.js";
import {
  getUserDocRef,
  getUserProfileDocRef,
  getPlaydataDocRef,
} from "../shared/repository.js";

const areaMain = document.getElementById("areaMain");
const textLoginStatus = document.getElementById("textLoginStatus");
const buttonLogin = document.getElementById("buttonLogin");
const buttonLogout = document.getElementById("buttonLogout");
const formProfile = document.getElementById("formProfile");
const fieldsetProfile = document.getElementById("fieldsetProfile");
const profileTextUserName = document.getElementById("profileTextUserName");
const profileWarningCaptionUserName = document.getElementById(
  "profileWarningCaptionUserName",
);
const profileTextDjName = document.getElementById("profileTextDjName");
const profileWarningCaptionDjName = document.getElementById(
  "profileWarningCaptionDjName",
);
const profileTextIidxId = document.getElementById("profileTextIidxId");
const profileWarningCaptionIidxId = document.getElementById(
  "profileWarningCaptionIidxId",
);
const formPlaydataSp = document.getElementById("formPlaydataSp");
const fieldsetPlaydataSp = document.getElementById("fieldsetPlaydataSp");
const textPlaydataSp = document.getElementById("textPlaydataSp");
const warningCaptionPlaydataSp = document.getElementById(
  "warningCaptionPlaydataSp",
);
const formPlaydataDp = document.getElementById("formPlaydataDp");
const fieldsetPlaydataDp = document.getElementById("fieldsetPlaydataDp");
const textPlaydataDp = document.getElementById("textPlaydataDp");
const warningCaptionPlaydataDp = document.getElementById(
  "warningCaptionPlaydataDp",
);
const areaConsent = document.getElementById("areaConsent");
const checkAgree = document.getElementById("checkAgree");
const buttonAgree = document.getElementById("buttonAgree");

const allFields = [fieldsetProfile, fieldsetPlaydataSp, fieldsetPlaydataDp];

const app = initializeApp(FIREBASE_CONFIG);
const auth = getAuth(app);
const twitterProvider = new TwitterAuthProvider();
const db = getFirestore(app);

const validatableProfileUserName = new ValidatableField(
  profileTextUserName,
  profileWarningCaptionUserName,
  [new RuleRequired("表示名"), new RuleMaxLength(30)],
);
const validatableProfileDjName = new ValidatableField(
  profileTextDjName,
  profileWarningCaptionDjName,
  [new RuleMaxLength(6)],
);
const validatableProfileIidxId = new ValidatableField(
  profileTextIidxId,
  profileWarningCaptionIidxId,
  [new RuleNumeric(), new RuleJustLength(8)],
);
const validatableProfileFields = [
  validatableProfileUserName,
  validatableProfileDjName,
  validatableProfileIidxId,
];
const validatablePlaydataSp = new ValidatableField(
  textPlaydataSp,
  warningCaptionPlaydataSp,
  [new RuleMaxLength(500000)],
);
const validatablePlaydataDp = new ValidatableField(
  textPlaydataDp,
  warningCaptionPlaydataDp,
  [new RuleMaxLength(500000)],
);

onAuthStateChanged(auth, async (authUser) => {
  const userStatus = await getUserStatus(authUser);
  await renderForUserStatus(userStatus);
});

buttonLogin.addEventListener("click", async () => {
  try {
    const _result = await signInWithPopup(auth, twitterProvider);
    // const additionalUserInfo = getAdditionalUserInfo(result);
  } catch (e) {
    console.log(e);
  }
});

buttonLogout.addEventListener("click", () => {
  signOut(auth);
});

formProfile.addEventListener("submit", async (event) => {
  event.preventDefault();

  // バリデーションチェック
  validatableProfileFields.forEach((field) => {
    field.clearWarning();
  });
  const isInvalids = validatableProfileFields.map((field) =>
    field.warnIfInvalid(),
  );
  if (isInvalids.some((isInvalid) => isInvalid)) {
    return;
  }

  const userProfile = getDataFromFormUserProfile();
  const userProfileDocRef = getUserProfileDocRef(db, auth.currentUser.uid);
  await upsertDocWithTs(userProfileDocRef, userProfile);

  alert("更新完了");
});

formPlaydataSp.addEventListener("submit", async (event) => {
  event.preventDefault();

  // バリデーションチェック
  validatablePlaydataSp.clearWarning();
  if (validatablePlaydataSp.warnIfInvalid()) {
    return;
  }

  // TODO: テキストが空ならデータを削除したい
  const playdataSp = getDataFromFormPlaydataSp();
  const playdataSpDocRef = getPlaydataDocRef(db, auth.currentUser.uid, "sp");
  await upsertDocWithTs(playdataSpDocRef, playdataSp);

  alert("更新完了");
});

formPlaydataDp.addEventListener("submit", async (event) => {
  event.preventDefault();

  // バリデーションチェック
  validatablePlaydataDp.clearWarning();
  if (validatablePlaydataDp.warnIfInvalid()) {
    return;
  }

  // TODO: テキストが空ならデータを削除したい
  const playdataDp = getDataFromFormPlaydataDp();
  const playdataDpDocRef = getPlaydataDocRef(db, auth.currentUser.uid, "dp");
  await upsertDocWithTs(playdataDpDocRef, playdataDp);

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

  const userDocRef = getUserDocRef(db, authUser.uid);
  const userDoc = await getDocFromServer(userDocRef);
  const user = userDoc.data();

  const userInfo = {
    uid: authUser.uid,
    displayName: authUser.displayName,
  };

  if (user == null || user.agreeAt == null) {
    return { status: "NotAgreed", userInfo };
  }
  return { status: "Agreed", userInfo };
}

async function renderForUserStatus(userStatus) {
  if (userStatus.userInfo == null) {
    textLoginStatus.innerText = "ログインしていません。";
  } else {
    const { displayName } = userStatus.userInfo;

    textLoginStatus.innerText = `${displayName}でログイン中。`;
  }

  switch (userStatus.status) {
    case "NotLoggedIn":
      {
        areaConsent.style.display = "none";

        allFields.forEach((field) => (field.disabled = true));
        clearAllForms();
        areaMain.style.display = "block";
      }
      break;

    case "Agreed":
      {
        const {
          userInfo: { uid },
        } = userStatus;

        areaConsent.style.display = "none";

        allFields.forEach((field) => (field.disabled = false));
        // TODO: 取得に失敗したら更新ボタン押せなくする（空白データで上書き更新する事故の防止）
        // TODO: いちいちawaitしないでまとめてawaitしたい。
        {
          const userProfileDocRef = getUserProfileDocRef(db, uid);
          const userProfileDoc = await getDocFromServer(userProfileDocRef);
          const userProfile = userProfileDoc.data() ?? makeEmptyUserProfile();
          setDataToFormUserProfile(userProfile);
        }
        {
          const playdataSpDocRef = getPlaydataDocRef(db, uid, "sp");
          const playdataSpDoc = await getDocFromServer(playdataSpDocRef);
          const playdataSp = playdataSpDoc.data() ?? makeEmptyPlaydataSp();
          setDataToFormPlaydataSp(playdataSp);
        }
        {
          const playdataDpDocRef = getPlaydataDocRef(db, uid, "dp");
          const playdataDpDoc = await getDocFromServer(playdataDpDocRef);
          const playdataDp = playdataDpDoc.data() ?? makeEmptyPlaydataDp();
          setDataToFormPlaydataDp(playdataDp);
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

function getDataFromFormUserProfile() {
  const userName = formProfile.elements["userName"].value.trim();
  const djName = formProfile.elements["djName"].value.trim();
  const iidxId = formProfile.elements["iidxId"].value.trim();
  return { userName, djName, iidxId };
}

function setDataToFormUserProfile(userProfile) {
  formProfile.elements["userName"].value = userProfile.userName;
  formProfile.elements["djName"].value = userProfile.djName;
  formProfile.elements["iidxId"].value = userProfile.iidxId;
}

function getDataFromFormPlaydataSp() {
  const data = formPlaydataSp.elements["playdataSp"].value.trim();
  return { data };
}

function setDataToFormPlaydataSp(playdataSp) {
  formPlaydataSp.elements["playdataSp"].value = playdataSp.data;
}

function getDataFromFormPlaydataDp() {
  const data = formPlaydataDp.elements["playdataDp"].value.trim();
  return { data };
}

function setDataToFormPlaydataDp(playdataDp) {
  formPlaydataDp.elements["playdataDp"].value = playdataDp.data;
}

function clearAllForms() {
  clearFormUserProfile();
  clearFormPlaydataSp();
  clearFormPlaydataDp();
}

function clearFormUserProfile() {
  setDataToFormUserProfile(makeEmptyUserProfile());
}

function clearFormPlaydataSp() {
  setDataToFormPlaydataSp(makeEmptyPlaydataSp());
}

function clearFormPlaydataDp() {
  setDataToFormPlaydataDp(makeEmptyPlaydataDp());
}

function makeEmptyUserProfile() {
  return { userName: "", djName: "", iidxId: "" };
}

function makeEmptyPlaydataSp() {
  return { data: "" };
}

function makeEmptyPlaydataDp() {
  return { data: "" };
}
