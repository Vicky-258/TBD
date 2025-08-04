const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');

function createWindow() {
  // Create audio-recordings folder if it doesn't exist
  const audioDir = path.join(__dirname, 'audio-recordings');
  if (!fs.existsSync(audioDir)) {
    fs.mkdirSync(audioDir);
    console.log('Created audio-recordings folder:', audioDir);
  }

  const win = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
    },
    frame: false,
    backgroundColor: '#1C2526',
  });

  win.loadFile('index.html');
  win.maximize();

  // Handle close-app IPC message
  ipcMain.on('close-app', () => {
    win.close();
  });
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});