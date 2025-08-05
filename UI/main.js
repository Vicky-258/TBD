require('electron-reload')(__dirname, {
  electron: require(`${__dirname}/node_modules/electron`),
  ignored: /node_modules|audio-recordings|\.git/
});

const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');
const { fork } = require('child_process');

let audioServerProcess = null;

function startAudioServer() {
  if (audioServerProcess) {
    console.log('Audio server already running');
    return;
  }
  const audioServerPath = path.join(__dirname, 'audio-server.js');
  audioServerProcess = fork(audioServerPath, [], {
    silent: true,
    stdio: ['ignore', 'ignore', 'ignore', 'ipc'] // Suppress console output
  });
  audioServerProcess.on('error', (err) => {
    console.error('Audio server error:', err);
  });
  audioServerProcess.on('exit', (code) => {
    console.log(`Audio server exited with code ${code}`);
    audioServerProcess = null;
  });
}

function createWindow() {
  // Create audio-recordings folder if it doesn't exist
  const audioDir = path.join(__dirname, 'audio-recordings');
  if (!fs.existsSync(audioDir)) {
    fs.mkdirSync(audioDir, { recursive: true });
  }

  // Start audio server
  startAudioServer();

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
    if (audioServerProcess) {
      audioServerProcess.kill();
    }
    win.close();
  });

  // Handle window control IPC messages
  ipcMain.on('minimize-window', () => {
    win.minimize();
  });

  ipcMain.on('toggle-maximize', () => {
    if (win.isMaximized()) {
      win.unmaximize();
    } else {
      win.maximize();
    }
  });
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (audioServerProcess) {
    audioServerProcess.kill();
  }
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});