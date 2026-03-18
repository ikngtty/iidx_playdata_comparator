import { initializeApp } from "https://www.gstatic.com/firebasejs/12.10.0/firebase-app.js";
import {
  collection,
  getDocFromServer,
  getDocsFromServer,
  getFirestore,
} from "https://www.gstatic.com/firebasejs/12.10.0/firebase-firestore.js";

import { CONFIG as FIREBASE_CONFIG } from "../shared/firebase_util.js";
import { getPlaydataDocRef } from "../shared/repository.js";

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
    // TODO: CSVのアップロード更新日時を出す
    row.insertCell().textContent = userProfile.updatedAt
      .toDate()
      .toLocaleString();
    const buttonsToCompareCell = row.insertCell();
    [
      ["sp", "SP"],
      ["dp", "DP"],
    ].forEach(([playside, playsideLabel]) => {
      [1, 2].forEach((iPlayer) => {
        const button = document.createElement("button");
        button.textContent = `${playsideLabel}のデータをPlayer${iPlayer}にセット`;
        button.addEventListener("click", async () => {
          const playdataDocRef = getPlaydataDocRef(db, userId, playside);
          const playdataDoc = await getDocFromServer(playdataDocRef);
          // TODO: データがない時はそもそも押せなくする
          if (!playdataDoc.exists()) {
            alert("データがありません。");
            return;
          }
          const playdata = playdataDoc.data().data;

          localStorage.setItem(`iidxComparator.csv${iPlayer}`, playdata);
          location.href = "../compare-playdata/";
        });
        buttonsToCompareCell.appendChild(button);
      });
      buttonsToCompareCell.appendChild(document.createElement("br"));
    });
  });
});
