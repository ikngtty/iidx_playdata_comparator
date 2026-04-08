import { initializeApp } from "https://www.gstatic.com/firebasejs/12.10.0/firebase-app.js";
import {
  collection,
  getDocFromServer,
  getDocsFromServer,
  getFirestore,
  limit,
  orderBy,
  startAt,
  query,
  where,
} from "https://www.gstatic.com/firebasejs/12.10.0/firebase-firestore.js";

import { CONFIG as FIREBASE_CONFIG } from "../shared/firebase_util.js";
import { getPlaydataDocRef } from "../shared/repository.js";
import { firestoreTimestampToString } from "../shared/util.js";
import ValidatableField from "../shared/validation/validatable_field.js";
import {
  RuleJustLength,
  RuleMaxLength,
  RuleNumeric,
} from "../shared/validation/rules/common.js";

const USER_PROFILE_COUNT_PER_PAGE = 10;

const inputDisplayName = document.getElementById("inputDisplayName");
const warningCaptionDisplayName = document.getElementById(
  "warningCaptionDisplayName",
);
const inputIidxId = document.getElementById("inputIidxId");
const warningCaptionIidxId = document.getElementById("warningCaptionIidxId");
const buttonSearch = document.getElementById("buttonSearch");
const tableUsers = document.getElementById("tableUsers");
const buttonSearchNext = document.getElementById("buttonSearchNext");

const validatableFieldDisplayName = new ValidatableField(
  inputDisplayName,
  warningCaptionDisplayName,
  [new RuleMaxLength(30)],
);
const validatableFieldIidxId = new ValidatableField(
  inputIidxId,
  warningCaptionIidxId,
  [new RuleJustLength(8), new RuleNumeric()],
);

const filterAreas = {
  displayName: {
    validatableFields: [validatableFieldDisplayName],
    clear() {
      inputDisplayName.value = "";
    },
    enable() {
      inputDisplayName.disabled = false;
    },
    disable() {
      inputDisplayName.disabled = true;
    },
  },
  iidxId: {
    validatableFields: [validatableFieldIidxId],
    clear() {
      inputIidxId.value = "";
    },
    enable() {
      inputIidxId.disabled = false;
    },
    disable() {
      inputIidxId.disabled = true;
    },
  },
};

const app = initializeApp(FIREBASE_CONFIG);
const db = getFirestore(app);

let lastSearch = {
  query: null,
  nextDoc: null,
};

buttonSearch.addEventListener("click", async () => {
  const filterChoice = getSelectedFilterChoice();
  const selectedFilterArea = filterAreas[filterChoice];

  // バリデーションチェック
  const validatableFields = selectedFilterArea.validatableFields;
  validatableFields.forEach((field) => {
    field.clearWarning();
  });
  const isInvalids = validatableFields.map((field) => field.warnIfInvalid());
  if (isInvalids.some((isInvalid) => isInvalid)) {
    return;
  }

  // テーブルのリセット
  const tbody = tableUsers.tBodies[0];
  tbody.replaceChildren();

  // クエリの組み立て
  const constraints = [];
  switch (filterChoice) {
    case "displayName": {
      const displayNameFilter = inputDisplayName.value.trim();
      if (!displayNameFilter) break;

      constraints.push(where("userName", ">=", displayNameFilter));
      constraints.push(
        where("userName", "<=", displayNameFilter + "\u{10FFFF}"),
      );
      break;
    }

    case "iidxId": {
      const iidxIdFilter = inputIidxId.value.trim();
      if (!iidxIdFilter) break;

      constraints.push(where("iidxId", "==", iidxIdFilter));
      break;
    }

    default:
      throw new Error(`Unknown filter choice: ${filterChoice}`);
  }
  if (constraints.length === 0) {
    // NOTE: where句がある場合はそれがorderByの基準となる。
    // 複合インデックスをむやみに増やしたくないので、それで良いとする。
    // TODO: そもそも全件検索をさせたくない（無料枠を超えにくいようにするため）。
    constraints.push(orderBy("createdAt", "desc"));
  }
  const searchQuery = query(
    collection(db, "userProfiles"),
    limit(USER_PROFILE_COUNT_PER_PAGE + 1),
    ...constraints,
  );

  const userProfilesSnapshot = await getDocsFromServer(searchQuery);

  lastSearch.query = searchQuery;
  if (userProfilesSnapshot.size > USER_PROFILE_COUNT_PER_PAGE) {
    lastSearch.nextDoc = userProfilesSnapshot.docs[USER_PROFILE_COUNT_PER_PAGE];
  } else {
    lastSearch.nextDoc = null;
  }
  renderForLastSearch(lastSearch);

  userProfilesSnapshot.docs
    .slice(0, USER_PROFILE_COUNT_PER_PAGE)
    .forEach((userProfileDoc) => {
      addUserRow(tbody, userProfileDoc.id, userProfileDoc.data());
    });
});

buttonSearchNext.addEventListener("click", async () => {
  const searchQuery = query(lastSearch.query, startAt(lastSearch.nextDoc));
  const userProfilesSnapshot = await getDocsFromServer(searchQuery);

  if (userProfilesSnapshot.size > USER_PROFILE_COUNT_PER_PAGE) {
    lastSearch.nextDoc = userProfilesSnapshot.docs[USER_PROFILE_COUNT_PER_PAGE];
  } else {
    lastSearch.nextDoc = null;
  }
  renderForLastSearch(lastSearch);

  const tbody = tableUsers.tBodies[0];
  userProfilesSnapshot.docs
    .slice(0, USER_PROFILE_COUNT_PER_PAGE)
    .forEach((userProfileDoc) => {
      addUserRow(tbody, userProfileDoc.id, userProfileDoc.data());
    });
});

document
  .getElementsByName("filterChoice")
  .forEach((radio) =>
    radio.addEventListener("change", handleFilterChoiceChecked),
  );

function handleFilterChoiceChecked(event) {
  const filterChoice = event.currentTarget.value;
  renderForFilterChoice(filterChoice);
}

async function handleButtonCompareClick(event) {
  const { userId, playside, playerIndex } = event.currentTarget.dataset;

  const playdataDocRef = getPlaydataDocRef(db, userId, playside);
  const playdataDoc = await getDocFromServer(playdataDocRef);
  const playdata = playdataDoc.data()?.data;

  localStorage.setItem(`iidxComparator.csv${playerIndex}`, playdata);
  location.href = "../compare-playdata/";
}

function renderForFilterChoice(filterChoice) {
  Object.values(filterAreas).forEach((area) => {
    area.validatableFields.forEach((field) => field.clearWarning());
    area.clear();
    area.disable();
  });
  filterAreas[filterChoice].enable();
}

function renderForLastSearch(lastSearch) {
  buttonSearchNext.disabled = lastSearch.nextDoc == null;
}

function addUserRow(tbody, userId, userProfile) {
  const row = tbody.insertRow();
  row.insertCell().textContent = userProfile.userName;
  row.insertCell().textContent = userProfile.djName;
  row.insertCell().textContent = userProfile.iidxId;

  const uploadedAtCell = row.insertCell();
  uploadedAtCell.appendChild(
    document.createTextNode(
      firestoreTimestampToString(userProfile.playdataSpUploadedAt),
    ),
  );
  uploadedAtCell.appendChild(document.createElement("br"));
  uploadedAtCell.appendChild(
    document.createTextNode(
      firestoreTimestampToString(userProfile.playdataDpUploadedAt),
    ),
  );

  const buttonsToCompareCell = row.insertCell();
  [
    ["sp", "SP", userProfile.playdataSpUploadedAt],
    ["dp", "DP", userProfile.playdataDpUploadedAt],
  ].forEach(([playside, playsideLabel, uploadedAt]) => {
    [1, 2].forEach((playerIndex) => {
      const button = document.createElement("button");
      button.textContent = `${playsideLabel}のデータをPlayer${playerIndex}にセット`;
      if (uploadedAt == null) {
        button.disabled = true;
      } else {
        button.dataset.userId = userId;
        button.dataset.playside = playside;
        button.dataset.playerIndex = playerIndex;
        button.addEventListener("click", handleButtonCompareClick);
      }
      buttonsToCompareCell.appendChild(button);
    });
    buttonsToCompareCell.appendChild(document.createElement("br"));
  });
}

function getSelectedFilterChoice() {
  return document.querySelector("input[name='filterChoice']:checked").value;
}
