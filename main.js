const { app, BrowserWindow, dialog, ipcMain } = require('electron');
const { autoUpdater } = require('electron-updater');
const path = require('path');

// --- Configuration ---
// Set log level for auto-updater
autoUpdater.logger = require('electron-log');
autoUpdater.logger.transports.file.level = 'info';

let mainWindow;

function createWindow() {
    // Create the browser window.
    mainWindow = new BrowserWindow({
        width: 1000,
        height: 700,
        minWidth: 800,
        minHeight: 600,
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
        }
    });

    // IMPORTANT: Load the main HTML file from the 'public' subdirectory
    mainWindow.loadFile(path.join(__dirname, 'public', 'chat.html')); 

    mainWindow.on('closed', function () {
        mainWindow = null;
    });

    // Start checking for updates after a brief delay
    mainWindow.webContents.once('did-finish-load', () => {
        setTimeout(checkUpdate, 5000); 
    });
}

app.on('ready', createWindow);

app.on('window-all-closed', function () {
    if (process.platform !== 'darwin') app.quit();
});

app.on('activate', function () {
    if (mainWindow === null) createWindow();
});

// --- Auto-Updater Logic ---

function checkUpdate() {
    console.log("Checking for updates...");
    autoUpdater.checkForUpdatesAndNotify();
}

autoUpdater.on('checking-for-update', () => {
    console.log('Checking for update...');
});

autoUpdater.on('update-available', (info) => {
    console.log('Update available. Downloading...');
    dialog.showMessageBox({
        type: 'info',
        title: 'Prichat Update Available',
        message: `A new version (${info.version}) is available and downloading in the background.`,
        buttons: ['OK']
    });
});

autoUpdater.on('update-downloaded', (info) => {
    dialog.showMessageBox({
        type: 'info',
        title: 'Update Ready to Install',
        message: 'The new Prichat update has been downloaded. Restart now to apply changes.',
        buttons: ['Restart', 'Later']
    }).then((result) => {
        if (result.response === 0) {
            autoUpdater.quitAndInstall();
        }
    });
});

autoUpdater.on('error', (err) => {
    console.error('Update error:', err);
});
