const { contextBridge, ipcRenderer } = require('electron');

// Expose protected methods to the renderer process
contextBridge.exposeInMainWorld('electronAPI', {
    // Allows the renderer to listen for events from the main process (like update status)
    onUpdateStatus: (callback) => ipcRenderer.on('update-status', (event, status) => callback(status)),
    
    // Allows the renderer to request a full application restart
    restartApp: () => ipcRenderer.send('restart-app')
});