import { initializeApp } from "https://www.gstatic.com/firebasejs/12.10.0/firebase-app.js";
import {
  collection,
  getDocsFromServer,
  getFirestore,
} from "https://www.gstatic.com/firebasejs/12.10.0/firebase-firestore.js";

import { CONFIG as FIREBASE_CONFIG } from "../shared/firebase_util.js";

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

  userProfilesSnapshot.forEach((doc) => {
    const userProfile = doc.data();

    const row = tbody.insertRow();
    row.insertCell().textContent = userProfile.userName;
    row.insertCell().textContent = userProfile.djName;
    row.insertCell().textContent = userProfile.iidxId;
    row.insertCell().textContent = userProfile.updatedAt
      .toDate()
      .toLocaleString();
    const buttonsToCompareCell = row.insertCell();
    [
      ["SP", userProfile.playdataSp],
      ["DP", userProfile.playdataDp],
    ].forEach(([playside, playdata]) => {
      [1, 2].forEach((iPlayer) => {
        const button = document.createElement("button");
        button.textContent = `${playside}のデータをPlayer${iPlayer}にセット`;
        button.addEventListener("click", () => {
          localStorage.setItem(`iidxComparator.csv${iPlayer}`, playdata);
          location.href = "../compare-playdata/";
        });
        buttonsToCompareCell.appendChild(button);
      });
      buttonsToCompareCell.appendChild(document.createElement("br"));
    });
  });
});
