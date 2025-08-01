const { app, BrowserWindow } = require('electron');
  const path = require('path');

  function createWindow() {
    const win = new BrowserWindow({
      width: 1200,
      height: 800,
      webPreferences: {
        nodeIntegration: true,
        contextIsolation: false,
      },
      frame: false, // Remove the window frame
      backgroundColor: '#000000ff',
    });

    win.loadFile('index.html');
    win.maximize(); // Optional: Maximize the window to fill the screen
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