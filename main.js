// main.js

// Import necessary modules from Electron and Node.js
const { app, BrowserWindow } = require('electron');
const path = require('path');
const { spawn } = require('child_process');

// A global variable to hold a reference to the backend server process
let pythonProcess = null;

/**
 * Creates the main application window and starts the backend server.
 */
function createWindow () {
  // Create the main browser window for the application.
  const mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      // The preload script is not used in this project, so it is commented out.
      // preload: path.join(__dirname, 'preload.js') 
    }
  });

  // --- Start the Python Backend Server ---
  let backendPath;
  
  // Check if the application is running as a packaged EXE file.
  if (app.isPackaged) {
    // If it's packaged, the backend executable will be in the 'resources/backend' folder.
    backendPath = path.join(process.resourcesPath, 'backend/app.exe');
  } else {
    // If we are in development, point to the executable we built with PyInstaller.
    backendPath = path.join(__dirname, 'dist/backend/app.exe');
  }

  console.log(`Attempting to start backend server at: ${backendPath}`);
  
  try {
    // Use 'spawn' to run the backend executable as a separate process.
    pythonProcess = spawn(backendPath);

    // Log any output from the backend server to the console for debugging.
    pythonProcess.stdout.on('data', (data) => {
      console.log(`Backend Log: ${data}`);
    });
    // Log any errors from the backend server.
    pythonProcess.stderr.on('data', (data) => {
      console.error(`Backend Error: ${data}`);
    });
    
    // Handle cases where the backend process fails to start.
    pythonProcess.on('error', (err) => {
      console.error('Failed to start backend process.', err);
    });
    // Log when the backend process closes.
    pythonProcess.on('close', (code) => {
      console.log(`Backend process exited with code ${code}`);
    });
  } catch (err) {
      console.error("Fatal error spawning backend process:", err);
  }


  // Load the index.html file from the 'frontend' folder into the main window.
  mainWindow.loadFile(path.join(__dirname, 'frontend/index.html'));
}

// This function is called when Electron has finished initializing.
app.whenReady().then(() => {
  createWindow();

  app.on('activate', function () {
    // On macOS, re-create a window if the dock icon is clicked and no other windows are open.
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

// --- Gracefully shut down the backend server when the app closes ---
app.on('window-all-closed', function () {
  // Quit the app when all windows are closed (except on macOS).
  if (process.platform !== 'darwin') app.quit();
});

app.on('quit', () => {
  // Before the application quits, make sure to stop the backend server process.
  if (pythonProcess) {
    console.log('Stopping backend server...');
    pythonProcess.kill();
  }
});
