import { doc } from "https://www.gstatic.com/firebasejs/12.10.0/firebase-firestore.js";

export function getUserDocRef(db, userId) {
  return doc(db, "users", userId);
}

export function getUserProfileDocRef(db, userId) {
  return doc(db, "userProfiles", userId);
}

export function getPlaydataDocRef(db, userId, playside) {
  return doc(db, "playdata", `${userId}:${playside}`);
}
