// ===================
// Firebase Setup
// ===================
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.6.0/firebase-app.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/12.6.0/firebase-analytics.js";
import { getDatabase, ref, push, onChildAdded, onDisconnect } from "https://www.gstatic.com/firebasejs/12.6.0/firebase-database.js";

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
const analytics = getAnalytics(app);
const database = getDatabase(app);

// ===================
// Elements
// ===================
const joinBtn = document.getElementById('joinBtn');
const roomInput = document.getElementById('roomCode');
const chatbox = document.getElementById('chatbox');
const messagesDiv = document.getElementById('messages');
const sendBtn = document.getElementById('sendBtn');
const messageInput = document.getElementById('messageInput');

let roomRef = null;
let username = "User" + Math.floor(Math.random()*1000);

// ===================
// AES-GCM Encryption
// ===================
async function getKeyFromCode(code) {
  const enc = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    'raw', enc.encode(code), { name: 'PBKDF2' }, false, ['deriveKey']
  );
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt: enc.encode('prichat-salt'), iterations: 100000, hash: 'SHA-256' },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt','decrypt']
  );
}

async function encryptMessage(message, code) {
  const key = await getKeyFromCode(code);
  const enc = new TextEncoder();
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ciphertext = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv: iv },
    key,
    enc.encode(message)
  );
  return ivToBase64(iv) + ':' + arrayBufferToBase64(ciphertext);
}

async function decryptMessage(ciphertextCombined, code) {
  const key = await getKeyFromCode(code);
  const [ivStr, ctStr] = ciphertextCombined.split(':');
  const iv = base64ToArrayBuffer(ivStr);
  const ct = base64ToArrayBuffer(ctStr);
  const dec = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: iv }, key, ct);
  return new TextDecoder().decode(dec);
}

// ===================
// Helper functions
// ===================
function arrayBufferToBase64(buffer) {
  let binary = '';
  const bytes = new Uint8Array(buffer);
  bytes.forEach(b => binary += String.fromCharCode(b));
  return btoa(binary);
}

function base64ToArrayBuffer(base64) {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes.buffer;
}

function ivToBase64(iv) {
  return arrayBufferToBase64(iv);
}

// ===================
// Chat Functions
// ===================
joinBtn.addEventListener('click', () => {
  const code = roomInput.value.trim();
  if (!code) return alert("Enter a room code");
  
  roomRef = ref(database, 'rooms/' + code);

  // Listen for messages
  onChildAdded(roomRef, async (snapshot) => {
    const data = snapshot.val();
    const decrypted = await decryptMessage(data.message, code);
    displayMessage(data.user, decrypted);
  });

  // Clear room when users disconnect
  onDisconnect(roomRef).remove();
  
  chatbox.classList.remove('hidden');
});

sendBtn.addEventListener('click', async () => {
  const text = messageInput.value.trim();
  const code = roomInput.value.trim();
  if (!text || !roomRef || !code) return;
  const encrypted = await encryptMessage(text, code);
  push(roomRef, { user: username, message: encrypted, timestamp: Date.now() });
  messageInput.value = '';
});

function displayMessage(user, message) {
  const div = document.createElement('div');
  div.textContent = `${user}: ${message}`;
  messagesDiv.appendChild(div);
  messagesDiv.scrollTop = messagesDiv.scrollHeight;
}

// ===================
// Matrix Background
// ===================
const canvas = document.getElementById('matrix');
canvas.width = window.innerWidth;
canvas.height = window.innerHeight;
const ctx = canvas.getContext('2d');

const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
const fontSize = 16;
const columns = canvas.width / fontSize;
const drops = Array(Math.floor(columns)).fill(1);

function drawMatrix() {
  ctx.fillStyle = 'rgba(0,0,0,0.05)';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = '#00ff00';
  ctx.font = fontSize + "px monospace";

  for (let i = 0; i < drops.length; i++) {
    const text = letters.charAt(Math.floor(Math.random() * letters.length));
    ctx.fillText(text, i * fontSize, drops[i] * fontSize);
    drops[i]++;
    if (drops[i] * fontSize > canvas.height && Math.random() > 0.975) drops[i] = 0;
  }
}

setInterval(drawMatrix, 50);
