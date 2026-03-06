import {
  serverTimestamp,
  setDoc,
  updateDoc,
} from "https://www.gstatic.com/firebasejs/12.10.0/firebase-firestore.js";

export function withCreatTimestamp(data) {
  return {
    ...data,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };
}

export function withUpdateTimestamp(data) {
  return {
    ...data,
    updatedAt: serverTimestamp(),
  };
}

// WARN: 既存データがあると上書きしてしまうので、新規であることが確定な状況で使う。
export async function createDocWithTs(docRef, data) {
  await setDoc(docRef, withCreatTimestamp(data));
}

export async function updateDocWithTs(docRef, data) {
  await updateDoc(docRef, withUpdateTimestamp(data));
}

export async function upsertDocWithTs(docRef, data) {
  try {
    await updateDocWithTs(docRef, data);
  } catch (e) {
    if (e.code === "not-found") {
      await createDocWithTs(docRef, data);
    } else {
      throw e;
    }
  }
}
