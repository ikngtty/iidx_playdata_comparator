import { initializeApp } from "https://www.gstatic.com/firebasejs/12.10.0/firebase-app.js";
import {
  collection,
  getDocFromServer,
  getDocsFromServer,
  getFirestore,
} from "https://www.gstatic.com/firebasejs/12.10.0/firebase-firestore.js";

import { CONFIG as FIREBASE_CONFIG } from "../shared/firebase_util.js";
import { getPlaydataDocRef } from "../shared/repository.js";
import { firestoreTimestampToString } from "../shared/util.js";

const buttonSearch = document.getElementById("buttonSearch");
const tableUsers = document.getElementById("tableUsers");

const app = initializeApp(FIREBASE_CONFIG);
const db = getFirestore(app);

buttonSearch.addEventListener("click", async () => {
  const tbody = tableUsers.tBodies[0];

  // テーブルのリセット
  tbody.replaceChildren();

  const userProfilesSnapshot = await getDocsFromServer(
    collection(db, "userProfiles"),
  );

  userProfilesSnapshot.forEach((userProfileDoc) => {
    const userProfile = userProfileDoc.data();
    const userId = userProfileDoc.id;

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
  });
});

async function handleButtonCompareClick(event) {
  const { userId, playside, playerIndex } = event.currentTarget.dataset;

  const playdataDocRef = getPlaydataDocRef(db, userId, playside);
  const playdataDoc = await getDocFromServer(playdataDocRef);
  const playdata = playdataDoc.data()?.data;

  localStorage.setItem(`iidxComparator.csv${playerIndex}`, playdata);
  location.href = "../compare-playdata/";
}
