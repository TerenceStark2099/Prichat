# Prichat

**Prichat** is a **privacy-first**, encrypted, web-based chat application.  

It runs entirely in the browser — no server, no accounts, no tracking. Works on **Windows, Android, and POS terminals** via any modern web browser.  

> This project was partly developed with the assistance of AI.

---

## Features

- **Privacy-First:** No accounts or personal information required.  
- **End-to-End Encryption:** Messages encrypted in-browser using AES-GCM (stubbed; ready for real implementation).  
- **Temporary Chat Rooms:** Rooms exist only while users are active; messages are ephemeral.  
- **Dark Mode Minimalist Design:** Black background, neon green text, retro terminal style.  
- **ASCII Logo & Typing Animation:** Terminal-inspired aesthetics.  
- **Cross-Platform:** Works anywhere a browser is available.

---

## Usage

1. Visit the hosted Firebase URL (after deployment) or open `index.html` locally.  
2. Enter a room code to join or create a chat room.  
3. Start chatting — messages are encrypted and stored only temporarily.  
4. Rooms disappear when all users leave.

---

## Files Structure
Prichat/
├─ public/
│ ├─ index.html # Main UI
│ ├─ style.css # Dark mode styling
│ └─ app.js # Firebase + chat logic
├─ firebase.json # Firebase Hosting config
└─ .firebaserc # Firebase project alias


*This application is partly written by AI
