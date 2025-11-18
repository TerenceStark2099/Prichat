import { initializeApp } from "https://www.gstatic.com/firebasejs/12.6.0/firebase-app.js";
import { getFirestore, collection, addDoc, onSnapshot, query, orderBy, deleteDoc, doc, getDocs } from "https://www.gstatic.com/firebasejs/12.6.0/firebase-firestore.js";

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

let roomCode = "";
let roomKey;
const chatInput = document.getElementById("chat-input");
const chatBox = document.getElementById("chat-box");
const joinBtn = document.getElementById("join-btn");
const roomInput = document.getElementById("room-code");
const joinSection = document.querySelector(".join-room");
const chatSection = document.querySelector(".chat-room");

async function generateRoomKey() {
  const cryptoKey = await window.crypto.subtle.generateKey(
    { name: "AES-GCM", length: 256 },
    true,
    ["encrypt", "decrypt"]
  );
  const iv = window.crypto.getRandomValues(new Uint8Array(12));
  return { cryptoKey, iv };
}

async function encryptMessage(text, key) {
  const enc = new TextEncoder();
  const encoded = enc.encode(text);
  return await window.crypto.subtle.encrypt({ name: "AES-GCM", iv: key.iv }, key.cryptoKey, encoded);
}

async function decryptMessage(cipher, key) {
  const dec = await window.crypto.subtle.decrypt({ name: "AES-GCM", iv: key.iv }, key.cryptoKey, cipher);
  return new TextDecoder().decode(cipher instanceof ArrayBuffer ? cipher : new Uint8Array(cipher));
}

function arrayBufferToBase64(buffer) {
  let binary = '';
  const bytes = new Uint8Array(buffer);
  for (let b of bytes) binary += String.fromCharCode(b);
  return btoa(binary);
}

function base64ToArrayBuffer(base64) {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes.buffer;
}

async function joinRoom(code) {
  roomCode = code;
  roomKey = await generateRoomKey();
  joinSection.hidden = true;
  chatSection.hidden = false;

  const messagesRef = collection(db, "rooms", roomCode, "messages");
  const q = query(messagesRef, orderBy("timestamp"));

  onSnapshot(q, async (snapshot) => {
    chatBox.innerHTML = "";
    for (let docChange of snapshot.docs) {
      const data = docChange.data();
      const decrypted = await decryptMessage(base64ToArrayBuffer(data.text), roomKey);
      displayMessage(decrypted);
    }
    cleanupEmptyRoom(); // remove room if no messages
  });
}

async function sendMessage() {
  const text = chatInput.value.trim();
  if (!text) return;
  const messagesRef = collection(db, "rooms", roomCode, "messages");
  const encrypted = await encryptMessage(text, roomKey);
  await addDoc(messagesRef, { text: arrayBufferToBase64(encrypted), timestamp: Date.now() });
  chatInput.value = "";
}

function displayMessage(msg) {
  const msgEl = document.createElement("div");
  msgEl.textContent = msg;
  chatBox.appendChild(msgEl);
  chatBox.scrollTop = chatBox.scrollHeight;
}

// Automatically delete room if no messages
async function cleanupEmptyRoom() {
  const messagesRef = collection(db, "rooms", roomCode, "messages");
  const snapshot = await getDocs(messagesRef);
  if (snapshot.empty) {
    for (let docSnap of snapshot.docs) {
      await deleteDoc(doc(db, "rooms", roomCode, "messages", docSnap.id));
    }
  }
}

joinBtn.addEventListener("click", async () => {
  const code = roomInput.value.trim();
  if (!code) return alert("Enter a room code!");
  await joinRoom(code);
});

chatInput.addEventListener("keypress", (e) => {
  if (e.key === "Enter") sendMessage();
});
