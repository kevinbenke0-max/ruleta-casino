import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import {
    getDatabase,
    ref,
    get,
    set,
    remove,
    push,
    onValue,
    runTransaction,
    query,
    limitToLast
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js";

const firebaseConfig = {
    apiKey: "AIzaSyAi3z62zH5_zIR11qX0XBdTi49oKa5iRK8",
    authDomain: "tragamonedas-e7cbf.firebaseapp.com",
    databaseURL: "https://tragamonedas-e7cbf-default-rtdb.firebaseio.com",
    projectId: "tragamonedas-e7cbf",
    storageBucket: "tragamonedas-e7cbf.firebasestorage.app",
    messagingSenderId: "515899273964",
    appId: "1:515899273964:web:6908c0ce9807d8fffaabc9",
    measurementId: "G-S2TLWD3KYZ"
};

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

export const isConfigured = true;
export { db, ref, get, set, remove, push, onValue, runTransaction, query, limitToLast };

export function roundMoney(n) {
    return Math.round(Number(n) * 100) / 100;
}

export async function ensureAdminExists() {
    const adminRef = ref(db, "users/admin");
    const snap = await get(adminRef);
    if (!snap.exists()) {
        await set(adminRef, { pass: "1234", chips: 5000 });
    }
}
