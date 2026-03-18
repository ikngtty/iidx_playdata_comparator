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
const profileTextPlaydataSp = document.getElementById("profileTextPlaydataSp");
const profileWarningCaptionPlaydataSp = document.getElementById(
  "profileWarningCaptionPlaydataSp",
);
const profileTextPlaydataDp = document.getElementById("profileTextPlaydataDp");
const profileWarningCaptionPlaydataDp = document.getElementById(
  "profileWarningCaptionPlaydataDp",
);
const areaConsent = document.getElementById("areaConsent");
const checkAgree = document.getElementById("checkAgree");
const buttonAgree = document.getElementById("buttonAgree");

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
const validatableProfilePlaydataSp = new ValidatableField(
  profileTextPlaydataSp,
  profileWarningCaptionPlaydataSp,
  [new RuleMaxLength(1000000)],
);
const validatableProfilePlaydataDp = new ValidatableField(
  profileTextPlaydataDp,
  profileWarningCaptionPlaydataDp,
  [new RuleMaxLength(1000000)],
);
const validatableProfileFields = [
  validatableProfileUserName,
  validatableProfileDjName,
  validatableProfileIidxId,
  validatableProfilePlaydataSp,
  validatableProfilePlaydataDp,
];

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

// TODO: プロフィールの登録とCSVのアップロードは別々にしたい。
// （明らかに更新するタイミングの違うデータなので。）
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

  const { userProfile, playdataSp, playdataDp } =
    getDataFromUserProfileForm(formProfile);
  // TODO: 登録が一部だけ成功すると画面の状態が意味不明になる
  const userProfileDocRef = getUserProfileDocRef(db, auth.currentUser.uid);
  await upsertDocWithTs(userProfileDocRef, userProfile);
  // TODO: テキストが空ならデータを削除したい
  const playdataSpDocRef = getPlaydataDocRef(db, auth.currentUser.uid, "sp");
  await upsertDocWithTs(playdataSpDocRef, playdataSp);
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
        // TODO: 取得に失敗したら更新ボタン押せなくする（空白データで上書き更新する事故の防止）
        // TODO: いちいちawaitしないでまとめてawaitしたい。
        {
          const userProfileDocRef = getUserProfileDocRef(db, uid);
          const userProfileDoc = await getDocFromServer(userProfileDocRef);
          const userProfile = userProfileDoc.data();

          const playdataSpDocRef = getPlaydataDocRef(db, uid, "sp");
          const playdataSpDoc = await getDocFromServer(playdataSpDocRef);
          const playdataSp = playdataSpDoc.data();

          const playdataDpDocRef = getPlaydataDocRef(db, uid, "dp");
          const playdataDpDoc = await getDocFromServer(playdataDpDocRef);
          const playdataDp = playdataDpDoc.data();

          setDataToUserProfileForm(formProfile, {
            userProfile,
            playdataSp,
            playdataDp,
          });
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

function getDataFromUserProfileForm(form) {
  const userName = form.elements["userName"].value.trim();
  const djName = form.elements["djName"].value.trim();
  const iidxId = form.elements["iidxId"].value.trim();
  const playdataSp = form.elements["playdataSp"].value.trim();
  const playdataDp = form.elements["playdataDp"].value.trim();
  return {
    userProfile: { userName, djName, iidxId },
    playdataSp: { data: playdataSp },
    playdataDp: { data: playdataDp },
  };
}

function setDataToUserProfileForm(form, formData) {
  const empty = makeEmptyUserProfileFormData();
  const {
    userProfile = empty.userProfile,
    playdataSp = empty.playdataSp,
    playdataDp = empty.playdataDp,
  } = formData;

  form.elements["userName"].value = userProfile.userName;
  form.elements["djName"].value = userProfile.djName;
  form.elements["iidxId"].value = userProfile.iidxId;
  form.elements["playdataSp"].value = playdataSp.data;
  form.elements["playdataDp"].value = playdataDp.data;
}

function clearUserProfileForm(form) {
  setDataToUserProfileForm(form, makeEmptyUserProfileFormData());
}

function makeEmptyUserProfileFormData() {
  return {
    userProfile: {
      userName: "",
      djName: "",
      iidxId: "",
    },
    playdataSp: { data: "" },
    playdataDp: { data: "" },
  };
}
