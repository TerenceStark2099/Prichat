import { initializeApp } from "https://www.gstatic.com/firebasejs/12.6.0/firebase-app.js";
import { getFirestore, collection, addDoc, onSnapshot, query, orderBy, getDocs, deleteDoc, doc } from "https://www.gstatic.com/firebasejs/12.6.0/firebase-firestore.js";

// Firebase config
const firebaseConfig = {
  apiKey: "AIzaSyDX8yqKPp-X6hjkYiPWkE9sxYdFY4KxVK4",
  authDomain: "prichat-2f245.firebaseapp.com",
  projectId: "prichat-2f245",
  storageBucket: "prichat-2f245.firebasestorage.app",
  messagingSenderId: "125882416830",
  appId: "1:125882416830:web:f57c9970c044ea809ee8ef",
  measurementId: "G-XGLT8TN83Z"
};
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// DOM elements
const roomInput = document.getElementById("room-code");
const joinBtn = document.getElementById("join-btn");
const chatSection = document.querySelector(".chat-room");
const joinSection = document.querySelector(".join-room");
const chatBox = document.getElementById("chat-box");
const chatInput = document.getElementById("chat-input");
const sendBtn = document.getElementById("send-btn");

let roomCode;

// --- Encryption helpers ---
async function getRoomKeyFromCode(code) {
  const enc = new TextEncoder();
  const hash = await crypto.subtle.digest("SHA-256", enc.encode(code));
  const iv = new Uint8Array(12); // fixed IV
  const cryptoKey = await crypto.subtle.importKey(
    "raw",
    hash,
    { name: "AES-GCM" },
    false,
    ["encrypt", "decrypt"]
  );
  return { cryptoKey, iv };
}

async function encryptMessage(text, key) {
  const enc = new TextEncoder();
  const encoded = enc.encode(text);
  const cipher = await crypto.subtle.encrypt({ name: "AES-GCM", iv: key.iv }, key.cryptoKey, encoded);
  return btoa(String.fromCharCode(...new Uint8Array(cipher)));
}

async function decryptMessage(cipherText, key) {
  const bytes = Uint8Array.from(atob(cipherText), c => c.charCodeAt(0));
  const decrypted = await crypto.subtle.decrypt({ name: "AES-GCM", iv: key.iv }, key.cryptoKey, bytes);
  return new TextDecoder().decode(decrypted);
}

// --- Display ---
function displayMessage(msg) {
  const msgEl = document.createElement("div");
  msgEl.textContent = msg;
  chatBox.appendChild(msgEl);
  chatBox.scrollTop = chatBox.scrollHeight;
}

// --- Room join ---
joinBtn.addEventListener("click", async () => {
  const code = roomInput.value.trim();
  if (!code) return alert("Enter a room code!");
  roomCode = code;
  const roomKey = await getRoomKeyFromCode(roomCode);

  joinSection.hidden = true;
  chatSection.hidden = false;

  const messagesRef = collection(db, "rooms", roomCode, "messages");
  const q = query(messagesRef, orderBy("timestamp"));

  onSnapshot(q, async (snapshot) => {
    chatBox.innerHTML = "";
    for (let docChange of snapshot.docs) {
      const data = docChange.data();
      const decrypted = await decryptMessage(data.text, roomKey);
      displayMessage(decrypted);
    }
    cleanupEmptyRoom();
  });

  sendBtn.onclick = () => sendMessage(roomKey);
  chatInput.onkeypress = (e) => { if (e.key === "Enter") sendMessage(roomKey); };
});

// --- Send message ---
async function sendMessage(roomKey) {
  const text = chatInput.value.trim();
  if (!text) return;
  const messagesRef = collection(db, "rooms", roomCode, "messages");
  const encrypted = await encryptMessage(text, roomKey);
  await addDoc(messagesRef, { text: encrypted, timestamp: Date.now() });
  chatInput.value = "";
}

// --- Auto cleanup ---
async function cleanupEmptyRoom() {
  const messagesRef = collection(db, "rooms", roomCode, "messages");
  const snapshot = await getDocs(messagesRef);
  if (snapshot.empty) {
    for (let docSnap of snapshot.docs) {
      await deleteDoc(doc(db, "rooms", roomCode, "messages", docSnap.id));
    }
  }
}
