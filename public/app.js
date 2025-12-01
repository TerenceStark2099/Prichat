// --- CRITICAL CRYPTOGRAPHY CONSTANTS ---
const SALT = new TextEncoder().encode("prichat-incognito-salt"); 
const IV_LENGTH = 12; 
let secureAESKey = null; 

// --- CRYPTOGRAPHY UTILITY FUNCTIONS ---

/**
 * Derives a symmetric AES key from the room code (passphrase) using PBKDF2.
 */
async function getKeyFromPassphrase(passphrase) {
    const passwordBytes = new TextEncoder().encode(passphrase);
    
    const importedKey = await crypto.subtle.importKey(
        'raw', 
        passwordBytes, 
        { name: 'PBKDF2' }, 
        false, 
        ['deriveKey']
    );

    return crypto.subtle.deriveKey(
        {
            name: 'PBKDF2',
            salt: SALT,
            iterations: 100000, 
            hash: 'SHA-256'
        },
        importedKey,
        { name: 'AES-GCM', length: 256 },
        true, 
        ['encrypt', 'decrypt']
    );
}

/**
 * Encrypts plaintext. Returns a Base64 string of the IV + Ciphertext.
 */
async function encryptMessage(plaintext, key) {
    const iv = crypto.getRandomValues(new Uint8Array(IV_LENGTH));
    const encoded = new TextEncoder().encode(plaintext);

    const ciphertext = await crypto.subtle.encrypt(
        { name: "AES-GCM", iv: iv },
        key,
        encoded
    );

    // Combine IV and Ciphertext
    const combined = new Uint8Array(iv.length + ciphertext.byteLength);
    combined.set(iv, 0);
    combined.set(new Uint8Array(ciphertext), iv.length);

    // Convert to Base64
    return btoa(String.fromCharCode.apply(null, combined));
}

/**
 * Decrypts a Base64-encoded message.
 */
async function decryptMessage(combinedBase64, key) {
    const raw = atob(combinedBase64);
    const combined = new Uint8Array(raw.length);
    for (let i = 0; i < raw.length; i++) {
        combined[i] = raw.charCodeAt(i);
    }
    
    const iv = combined.slice(0, IV_LENGTH);
    const ciphertext = combined.slice(IV_LENGTH);

    const plaintext = await crypto.subtle.decrypt(
        { name: "AES-GCM", iv: iv },
        key,
        ciphertext
    );

    return new TextDecoder().decode(plaintext);
}


// --- FIREBASE AND GLOBAL STATE ---

// UI Elements (Updated to include leaveRoomBtn)
const [container, roomInput, enterRoomBtn, chatContainer, chatTitle, chatMessages, messageInput, sendBtn, leaveRoomBtn] = [
    document.querySelector('.container'),
    document.getElementById('roomCode'),
    document.getElementById('enterRoom'),
    document.querySelector('.chat-container'),
    document.getElementById('roomTitle'),
    document.getElementById('chatMessages'),
    document.getElementById('messageInput'),
    document.getElementById('sendBtn'),
    document.getElementById('leaveRoom') 
];

let roomCode = '';
// Temporary ID for message styling/alignment
const currentUserID = `GUEST-${Math.floor(Math.random() * 10000)}`; 

// Firebase Modular SDK Imports
import { getDatabase, ref, push, onChildAdded, remove } from "https://www.gstatic.com/firebasejs/12.6.0/firebase-database.js";
import { app } from './firebase-config.js'; 

const db = getDatabase(app);

// --- UTILITY FUNCTIONS ---

function generateRandomCode() {
    return Math.random().toString(36).substring(2, 8).toUpperCase();
}

/**
 * Deletes the room from Firebase and resets the application state.
 * FIXED: UI reset now happens synchronously before the asynchronous Firebase call.
 */
function deleteRoomCleanup() {
    // 1. Reset UI State (Synchronous and immediate for user experience)
    chatMessages.innerHTML = '';
    
    // Hide the chat interface
    chatContainer.classList.add('hidden'); 
    
    // Show the initial room entry page <-- THIS IS THE FIX
    container.classList.remove('hidden'); 
    
    roomInput.value = ''; 
    
    // 2. Clear application state
    const codeToDelete = roomCode; // Capture code before clearing global variable
    roomCode = '';
    secureAESKey = null;

    // 3. Delete the room node from Firebase (Asynchronous)
    if (codeToDelete) {
        remove(ref(db, `rooms/${codeToDelete}`))
            .then(() => console.log(`Room ${codeToDelete} self-destructed successfully.`))
            .catch(error => console.error("Error during room self-destruct:", error));
    }
}


// Function to handle the room setup after key generation
function setupChatRoom() {
    chatContainer.classList.remove('hidden');
    chatTitle.textContent = `Room: ${roomCode}`;

    // 🛑 INCOGNITO CLEANUP: Calls the unified cleanup function on tab/browser close.
    window.addEventListener('beforeunload', deleteRoomCleanup);

    // 🚀 NEW: Listener for the manual "Leave Room" button
    leaveRoomBtn.addEventListener('click', () => {
        // Remove the 'beforeunload' listener temporarily to prevent double execution
        window.removeEventListener('beforeunload', deleteRoomCleanup); 
        deleteRoomCleanup();
    });

    listenMessages();
}

// --- MESSAGE LISTENING FUNCTION (Reads and decrypts messages) ---

function listenMessages() {
    const roomRef = ref(db, `rooms/${roomCode}`);
    
    // onChildAdded provides real-time updates for new messages
    onChildAdded(roomRef, async (snapshot) => {
        const data = snapshot.val();
        
        // 4. 🔓 DECRYPT the message after receiving
        let decrypted = "--- Decrypting ---";
        const isCurrentUser = data.senderID === currentUserID; 

        if (secureAESKey) {
            try {
                decrypted = await decryptMessage(data.message, secureAESKey);
            } catch (error) {
                console.error("Decryption failed:", error);
                decrypted = "--- DECRYPTION FAILED ---";
            }
        }
        
        // UI Rendering (Clean, Incognito-friendly)
        const msgEl = document.createElement('div');
        msgEl.textContent = decrypted;
        
        msgEl.style.cssText = `
            text-align: ${isCurrentUser ? 'right' : 'left'};
            padding: 8px 12px;
            margin: 5px;
            background-color: ${isCurrentUser ? '#00A86B' : 'rgba(255, 255, 255, 0.1)'};
            color: ${isCurrentUser ? 'white' : '#F0F0F0'};
            border-radius: 18px;
            max-width: 80%;
            word-wrap: break-word; 
            align-self: ${isCurrentUser ? 'flex-end' : 'flex-start'};
            box-shadow: 0 0 2px rgba(0,0,0,0.1);
            line-height: 1.4;
        `;

        chatMessages.appendChild(msgEl);
        chatMessages.scrollTop = chatMessages.scrollHeight; // Auto-scroll
    });
}


// --- EVENT LISTENERS ---

enterRoomBtn.addEventListener('click', async () => {
    // 1. Get/Generate Room Code
    let code = roomInput.value.trim();
    if (!code) {
        code = generateRandomCode();
        alert(`No code entered. Starting a new incognito room with ID: ${code}`);
    }
    roomCode = code;
    
    container.classList.add('hidden');

    // 2. 🔑 Generate the secure key
    try {
        secureAESKey = await getKeyFromPassphrase(roomCode);
        console.log("Encryption key successfully derived.");
        setupChatRoom();
    } catch (error) {
        alert("CRITICAL ERROR: Failed to generate encryption key.");
        console.error(error);
        container.classList.remove('hidden'); 
    }
});


sendBtn.addEventListener('click', async () => {
    const msg = messageInput.value.trim();
    if (!msg || !secureAESKey) return;

    // 3. 🔒 ENCRYPT the message before sending
    try {
        const encrypted = await encryptMessage(msg, secureAESKey); 

        await push(ref(db, `rooms/${roomCode}`), {
            message: encrypted, // Secure Ciphertext
            timestamp: Date.now(),
            senderID: currentUserID 
        });
        messageInput.value = '';
    } catch (error) {
        console.error("Error sending or encrypting message:", error);
        alert("Failed to send message. Check connection or console.");
    }
});