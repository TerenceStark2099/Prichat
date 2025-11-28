// UI elements
const container = document.querySelector('.container');
const logo = document.querySelector('.logo');
const typingText = document.querySelector('.typing');
const roomInput = document.getElementById('roomCode');
const enterRoomBtn = document.getElementById('enterRoom');

const chatContainer = document.querySelector('.chat-container');
const chatTitle = document.getElementById('roomTitle');
const chatMessages = document.getElementById('chatMessages');
const messageInput = document.getElementById('messageInput');
const sendBtn = document.getElementById('sendBtn');

let roomCode = '';
import { getDatabase, ref, push, onChildAdded, remove } from "https://www.gstatic.com/firebasejs/12.6.0/firebase-database.js";
import { app } from './firebase-config.js';

const db = getDatabase(app);

enterRoomBtn.addEventListener('click', () => {
  if (!roomInput.value) return alert('Please enter a room code!');
  roomCode = roomInput.value;
  container.classList.add('hidden');
  chatContainer.classList.remove('hidden');
  chatTitle.textContent = `Room: ${roomCode}`;

  listenMessages();
});
sendBtn.addEventListener('click', () => {
  const msg = messageInput.value.trim();
  if (!msg) return;
  const encrypted = btoa(msg); // simple base64 for now, can replace with AES later
  push(ref(db, `rooms/${roomCode}`), {
    message: encrypted,
    timestamp: Date.now()
  });
  messageInput.value = '';
});

function listenMessages() {
  const roomRef = ref(db, `rooms/${roomCode}`);
  onChildAdded(roomRef, (snapshot) => {
    const data = snapshot.val();
    const decrypted = atob(data.message);
    const msgEl = document.createElement('div');
    msgEl.textContent = decrypted;
    chatMessages.appendChild(msgEl);
    chatMessages.scrollTop = chatMessages.scrollHeight;
  });
}
window.addEventListener('beforeunload', () => {
  if (roomCode) {
    const roomRef = ref(db, `rooms/${roomCode}`);
    remove(roomRef);
  }
});
