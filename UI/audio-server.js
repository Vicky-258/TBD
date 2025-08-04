const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const app = express();
const port = 3001;

// Create audio folder if it doesn't exist
const audioFolder = path.join(__dirname, 'audio-recordings');
if (!fs.existsSync(audioFolder)) {
  fs.mkdirSync(audioFolder);
}

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, audioFolder);
  },
  filename: function (req, file, cb) {
    // Always use the same filename to replace the previous recording
    cb(null, 'ship-audio-recording.wav');
  }
});

const upload = multer({ storage: storage });

// Enable CORS
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
  next();
});

// Serve static files
app.use(express.static(__dirname));

// Handle audio upload
app.post('/upload-audio', upload.single('audio'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No audio file uploaded' });
  }
  
  console.log('Audio file saved:', req.file.filename);
  res.json({ 
    message: 'Audio uploaded successfully',
    filename: req.file.filename,
    path: req.file.path
  });
});

// Get current audio file
app.get('/current-audio', (req, res) => {
  const audioFile = path.join(audioFolder, 'ship-audio-recording.wav');
  
  if (fs.existsSync(audioFile)) {
    res.sendFile(audioFile);
  } else {
    res.status(404).json({ error: 'No audio recording found' });
  }
});

app.listen(port, () => {
  console.log(`Audio server running at http://localhost:${port}`);
  console.log(`Audio files will be saved to: ${audioFolder}`);
});
