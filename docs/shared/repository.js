import {
  doc,
  getDocFromServer,
} from "https://www.gstatic.com/firebasejs/12.10.0/firebase-firestore.js";

export function getUserDocRef(db, userId) {
  return doc(db, "users", userId);
}

export function getUserProfileDocRef(db, userId) {
  return doc(db, "userProfiles", userId);
}

export async function getUserProfileFromServer(db, userId) {
  const docRef = getUserProfileDocRef(db, userId);
  const doc = await getDocFromServer(docRef);
  return doc.data();
}

export function getPlaydataDocRef(db, userId, playside) {
  return doc(db, "playdata", `${userId}:${playside}`);
}
