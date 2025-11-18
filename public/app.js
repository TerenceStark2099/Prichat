import { initializeApp } from "https://www.gstatic.com/firebasejs/12.6.0/firebase-app.js";
import {
  getFirestore,
  collection,
  addDoc,
  onSnapshot,
  query,
  orderBy,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/12.6.0/firebase-firestore.js";

// --- Firebase config ---
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

// --- DOM Elements ---
const roomInput = document.getElementById("room-code");
const joinBtn = document.getElementById("join-btn");
const chatSection = document.querySelector(".chat-room");
const joinSection = document.querySelector(".join-room");
const chatBox = document.getElementById("chat-box");
const chatInput = document.getElementById("chat-input");
const sendBtn = document.getElementById("send-btn");
const typingIndicator = document.getElementById("typing-indicator");

let roomCode, roomKey;
let displayedMessages = new Set();

// --- AES-GCM Encryption Helpers ---
async function getRoomKeyFromCode(code) {
  const enc = new TextEncoder();
  const hash = await crypto.subtle.digest("SHA-256", enc.encode(code));
  const cryptoKey = await crypto.subtle.importKey(
    "raw",
    hash,
    { name: "AES-GCM" },
    false,
    ["encrypt", "decrypt"]
  );
  return cryptoKey;
}

async function encryptMessage(text, key) {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encoded = new TextEncoder().encode(text);
  const cipher = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv: iv },
    key,
    encoded
  );
  return { cipher: btoa(String.fromCharCode(...new Uint8Array(cipher))), iv: btoa(String.fromCharCode(...iv)) };
}

async function decryptMessage(cipherText, ivB64, key) {
  try {
    const cipherBytes = Uint8Array.from(atob(cipherText), c => c.charCodeAt(0));
    const iv = Uint8Array.from(atob(ivB64), c => c.charCodeAt(0));
    const decrypted = await crypto.subtle.decrypt(
      { name: "AES-GCM", iv: iv },
      key,
      cipherBytes
    );
    return new TextDecoder().decode(decrypted);
  } catch (e) {
    console.error("Decryption failed:", e);
    return "[Unreadable]";
  }
}

// --- Display message ---
function displayMessage(msg, type="other") {
  const msgId = msg.id || Math.random();
  if (displayedMessages.has(msgId)) return;
  displayedMessages.add(msgId);

  const msgEl = document.createElement("div");
  msgEl.textContent = msg.text || msg;
  msgEl.className = type === "self" ? "self-msg" : "other-msg";
  chatBox.appendChild(msgEl);
  chatBox.scrollTop = chatBox.scrollHeight;
}

// --- Join room ---
joinBtn.addEventListener("click", async () => {
  const code = roomInput.value.trim();
  if (!code) return alert("Enter a room code!");
  roomCode = code;
  roomKey = await getRoomKeyFromCode(roomCode);

  joinSection.hidden = true;
  chatSection.hidden = false;

  const messagesRef = collection(db, "rooms", roomCode, "messages");
  const q = query(messagesRef, orderBy("timestamp"));

  // Listen for new messages
  onSnapshot(q, async snapshot => {
    for (let doc of snapshot.docs) {
      const data = doc.data();
      const decrypted = await decryptMessage(data.text, data.iv, roomKey);
      displayMessage({ text: decrypted, id: doc.id }, "other");
    }
  });

  // Typing indicator
  const typingRef = collection(db, "rooms", roomCode, "typing");
  onSnapshot(typingRef, snapshot => {
    const othersTyping = snapshot.docs.some(doc => doc.data().user !== "me");
    typingIndicator.textContent = othersTyping ? "Someone is typing..." : "";
  });

  // Input typing
  chatInput.addEventListener("input", async () => {
    await addDoc(typingRef, { user: "me", timestamp: Date.now() });
  });

  // Send message
  sendBtn.onclick = () => sendMessage();
  chatInput.onkeypress = (e) => { if (e.key === "Enter") sendMessage(); };
});

// --- Send message ---
async function sendMessage() {
  const text = chatInput.value.trim();
  if (!text) return;
  chatInput.value = "";

  // Display immediately
  displayMessage(text, "self");

  const messagesRef = collection(db, "rooms", roomCode, "messages");
  const encrypted = await encryptMessage(text, roomKey);
  await addDoc(messagesRef, {
    text: encrypted.cipher,
    iv: encrypted.iv,
    timestamp: serverTimestamp()
  });
}
