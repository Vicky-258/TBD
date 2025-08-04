document.addEventListener('DOMContentLoaded', () => {
  // Duration for loading screen animation
  const loadingAnimationDuration = 3000;
  const videoDuration = 5000;

    // Audio recording variables
  let mediaRecorder;
  let audioChunks = [];
  let isRecording = false;

  // Transition to video screen
  setTimeout(() => {
    document.getElementById('loading-screen').classList.add('hidden');
    document.getElementById('video-screen').classList.remove('hidden');

    const video = document.getElementById('intro-video');
    video.currentTime = 0;
    video.pause();
    video.play();

    video.onended = () => {
      document.getElementById('video-screen').classList.add('hidden');
      document.getElementById('mode-selection').classList.remove('hidden');
      startQuoteSlideshow();
    };

    setTimeout(() => {
      document.getElementById('video-screen').classList.add('hidden');
      document.getElementById('mode-selection').classList.remove('hidden');
      startQuoteSlideshow();
    }, videoDuration);
  }, loadingAnimationDuration);

  // Add Enter key support for chat input
  document.getElementById('chat-input').addEventListener('keypress', function(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  });

  // Feature box carousel
  let currentFeature = 0;
  let featureTimer;
  const featureBoxes = document.querySelectorAll('.feature-box');

  function rotateFeatures() {
    featureBoxes.forEach(box => box.classList.remove('active'));
    featureBoxes[currentFeature].classList.add('active');
    currentFeature = (currentFeature + 1) % featureBoxes.length;
    resetFeatureTimer();
  }

  function resetFeatureTimer() {
    clearTimeout(featureTimer);
    featureTimer = setTimeout(rotateFeatures, 5000);
  }

  featureBoxes.forEach((box, index) => {
    box.addEventListener('mouseenter', () => {
      clearTimeout(featureTimer);
      featureBoxes.forEach(b => b.classList.remove('active'));
      box.classList.add('active');
      currentFeature = index;
    });
    box.addEventListener('mouseleave', resetFeatureTimer);
  });

  rotateFeatures();

  // Quote slideshow
  let currentQuote = 0;
  const quotes = document.querySelectorAll('.quote');
  function rotateQuotes() {
    quotes.forEach(quote => quote.classList.remove('active'));
    quotes[currentQuote].classList.add('active');
    currentQuote = (currentQuote + 1) % quotes.length;
  }

  function startQuoteSlideshow() {
    rotateQuotes();
    setInterval(rotateQuotes, 4000);
  }
});

// Chat management
let chatHistory = [];
let currentChat = { id: null, messages: [] };
let soundContext = new (window.AudioContext || window.webkitAudioContext)();

// Play retro click sound
function playClickSound() {
  const oscillator = soundContext.createOscillator();
  oscillator.type = 'square';
  oscillator.frequency.setValueAtTime(800, soundContext.currentTime);
  oscillator.connect(soundContext.destination);
  oscillator.start();
  oscillator.stop(soundContext.currentTime + 0.05);
}

// Generate unique chat ID
function generateChatId() {
  return 'chat-' + Date.now();
}

/**
 * Backend placeholder for fetching AI response.
 * @param {string} message - The user's input message.
 * @returns {string} - The AI's response.
 */
function getAIResponse(message) {
  console.log('Placeholder: Fetching AI response for:', message);
  // Backend team to implement actual AI response logic
  return `AI: Processing "${message}"...`;
}

/**
 * Handles mode selection and transitions.
 * @param {string} mode - The selected mode.
 */
function selectMode(mode) {
  playClickSound();
  if (currentChat.messages.length && mode !== 'sailing') {
    saveCurrentChat();
  }
  document.getElementById('mode-selection').classList.add('hidden');
  if (mode === 'departure') {
    document.getElementById('departure-prep').classList.remove('hidden');
  } else if (mode === 'sailing') {
    document.getElementById('homepage').classList.remove('hidden');
    if (!currentChat.id) startNewChat();
    updateChatHistory();
  } else if (mode === 'voyage-history') {
    document.getElementById('voyage-history').classList.remove('hidden');
  }
  console.log(`Operating mode selected: ${mode}`);
}

/**
 * Toggles settings dashboard.
 */
function toggleSettings() {
  playClickSound();
  const dashboard = document.getElementById('settings-dashboard');
  dashboard.classList.toggle('active');
}

/**
 * Sends a message and fetches AI response.
 */
function sendMessage() {
  playClickSound();
  const input = document.getElementById('chat-input');
  const responseBox = document.getElementById('chat-response');

  if (input.value.trim()) {
    const userMessage = document.createElement('div');
    userMessage.classList.add('message', 'user-message');
    userMessage.textContent = `You: ${input.value}`;
    responseBox.appendChild(userMessage);
    currentChat.messages.push({ type: 'user', text: input.value });

    const aiResponseText = getAIResponse(input.value);
    const aiMessage = document.createElement('div');
    aiMessage.classList.add('message', 'ai-message');
    aiMessage.textContent = aiResponseText;
    responseBox.appendChild(aiMessage);
    currentChat.messages.push({ type: 'ai', text: aiResponseText });

    input.value = '';
    responseBox.scrollTop = responseBox.scrollHeight;
  }
}

/**
 * Updates chat history display.
 */
function updateChatHistory() {
  const historyBox = document.getElementById('chat-history');
  historyBox.innerHTML = '';

  chatHistory.forEach(chat => {
    const summary = chat.messages
      .filter(m => m.type === 'user')
      .map(m => m.text.split(' ').slice(0, 5).join(' ') + (m.text.split(' ').length > 5 ? '...' : ''))
      .join(' | ');
    if (summary) {
      const historyItem = document.createElement('div');
      historyItem.textContent = summary;
      historyItem.onclick = () => loadChat(chat.id);
      historyBox.appendChild(historyItem);
    }
  });

  historyBox.scrollTop = historyBox.scrollHeight;
}

/**
 * Loads a previous chat.
 * @param {string} chatId - The chat ID to load.
 */
function loadChat(chatId) {
  playClickSound();
  currentChat = chatHistory.find(c => c.id === chatId) || { id: chatId, messages: [] };
  const responseBox = document.getElementById('chat-response');
  responseBox.innerHTML = '';

  currentChat.messages.forEach(msg => {
    const messageDiv = document.createElement('div');
    messageDiv.classList.add('message', msg.type === 'user' ? 'user-message' : 'ai-message');
    messageDiv.textContent = `${msg.type === 'user' ? 'You' : 'AI'}: ${msg.text}`;
    responseBox.appendChild(messageDiv);
  });

  responseBox.scrollTop = responseBox.scrollHeight;
}

/**
 * Saves the current chat to history.
 */
function saveCurrentChat() {
  if (currentChat.messages.length) {
    const existingChat = chatHistory.find(c => c.id === currentChat.id);
    if (existingChat) {
      existingChat.messages = currentChat.messages;
    } else {
      chatHistory.push({ ...currentChat });
    }
    currentChat = { id: null, messages: [] };
  }
}

/**
 * Starts a new chat session.
 */
function startNewChat() {
  playClickSound();
  saveCurrentChat();
  currentChat = { id: generateChatId(), messages: [] };
  document.getElementById('chat-response').innerHTML = '';
  updateChatHistory();
}

/**
 * Navigates back to mode selection.
 */
function backToHome() {
  playClickSound();
  saveCurrentChat();
  document.getElementById('departure-prep').classList.add('hidden');
  document.getElementById('voyage-history').classList.add('hidden');
  document.getElementById('homepage').classList.add('hidden');
  document.getElementById('mode-selection').classList.remove('hidden');
}

/**
 * Placeholder for uploading documents.
 */
async function uploadDocuments() {
  const fileInput = document.getElementById("document-upload");
  const file = fileInput.files[0];

  if (!file) return;

  const formData = new FormData();
  formData.append("file", file);

  try {
    const res = await fetch("http://localhost:8000/upload-doc", {
      method: "POST",
      body: formData,
    });

    const result = await res.json();

    document.getElementById("upload-status").innerText =
      result.message || result.error || "Unknown response";
  } catch (err) {
    document.getElementById("upload-status").innerText =
      "❌ Upload failed: " + err.message;
  }
}


/**
 * Placeholder for uploading logistics.
 */
function uploadLogistics() {
  playClickSound();
  const fileInput = document.getElementById('logistics-upload');
  if (fileInput.files.length) {
    console.log('Placeholder: Uploading logistics:', fileInput.files[0].name);
    fileInput.value = '';
  }
}

/**
 * Placeholder for uploading crew logs.
 */
function uploadCrewLog() {
  playClickSound();
  const fileInput = document.getElementById('crew-log-upload');
  if (fileInput.files.length) {
    console.log('Placeholder: Uploading crew log:', fileInput.files[0].name);
    fileInput.value = '';
  }
}

/**
 * Placeholder for fetching weather.
 */
async function getWeather() {
  playClickSound();

  const outputBox = document.getElementById("weather-output");
  outputBox.innerText = "🌐 Fetching marine weather data...";

  try {
    // Step 1: Call backend to fetch + store the latest marine weather
    const fetchResp = await fetch(
      "http://localhost:8000/marine-weather?lat=13.08&lon=80.27"
    );
    const fetchData = await fetchResp.json();

    if (fetchData.error) {
      outputBox.innerText = "❌ Error fetching data: " + fetchData.error;
      return;
    }

    // Step 2: Call summary endpoint to read & summarize the saved JSON
    outputBox.innerText = "📦 Parsing latest weather summary...";
    const summaryResp = await fetch("http://localhost:8000/marine-summary");
    const summaryData = await summaryResp.json();

    if (summaryData.summary) {
      outputBox.innerText = summaryData.summary;
    } else if (summaryData.error) {
      outputBox.innerText = "❌ Summary error: " + summaryData.error;
    } else {
      outputBox.innerText = "😵 Unexpected response from summary API.";
    }
  } catch (err) {
    outputBox.innerText = "🚨 Network error: " + err.message;
    console.error(err);
  }
}

/**
 * Switches voyage tabs.
 * @param {string} tab - The tab to display.
 */
function showVoyageTab(tab) {
  playClickSound();
  const completedTab = document.getElementById('completed-voyages');
  const ongoingTab = document.getElementById('ongoing-voyages');
  const tabs = document.querySelectorAll('.voyage-tabs .tab');

  if (tab === 'completed') {
    completedTab.classList.remove('hidden');
    ongoingTab.classList.add('hidden');
    tabs[0].classList.add('active');
    tabs[1].classList.remove('active');
  } else {
    completedTab.classList.add('hidden');
    ongoingTab.classList.remove('hidden');
    tabs[0].classList.remove('active');
    tabs[1].classList.add('active');
  }
}

function exitApp() {
  playClickSound();
  // For Electron app, use the electron API to close the app
  if (typeof require !== 'undefined') {
    try {
      const { remote } = require('electron');
      if (remote) {
        remote.getCurrentWindow().close();
      } else {
        // If remote is not available, try the new way
        const { ipcRenderer } = require('electron');
        ipcRenderer.send('close-app');
      }
    } catch (error) {
      console.log('Electron API not available, using window.close()');
      window.close();
    }
  } else {
    // Fallback for web browsers
    if (confirm('Are you sure you want to exit the application?')) {
      window.close();
    }
  }
}

/**
 * Audio Recording Functionality
 */
let mediaRecorder;
let audioChunks = [];
let isRecording = false;

/**
 * Toggle audio recording on/off
 */
async function toggleRecording() {
  playClickSound();
  const micButton = document.getElementById('mic-button');
  
  if (!isRecording) {
    await startRecording();
    micButton.classList.add('recording');
    micButton.textContent = '⏹️'; // Stop icon
    micButton.title = 'Stop Recording';
  } else {
    stopRecording();
    micButton.classList.remove('recording');
    micButton.textContent = '🎤'; // Microphone icon
    micButton.title = 'Record Audio';
  }
}

/**
 * Start audio recording
 */
async function startRecording() {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ 
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
        sampleRate: 44100
      } 
    });
    
    // Use the best available format for recording - simplified approach
    let options = {};
    if (MediaRecorder.isTypeSupported('audio/webm')) {
      options.mimeType = 'audio/webm';
    } else if (MediaRecorder.isTypeSupported('audio/mp4')) {
      options.mimeType = 'audio/mp4';
    }
    
    console.log('Recording with format:', options.mimeType || 'default');
    
    mediaRecorder = new MediaRecorder(stream, options);
    audioChunks = [];
    
    mediaRecorder.ondataavailable = (event) => {
      if (event.data.size > 0) {
        audioChunks.push(event.data);
        console.log('Audio chunk received, size:', event.data.size);
      }
    };
    
    mediaRecorder.onstop = () => {
      const mimeType = mediaRecorder.mimeType || 'audio/webm';
      const audioBlob = new Blob(audioChunks, { type: mimeType });
      console.log('Recording stopped, blob size:', audioBlob.size, 'type:', audioBlob.type);
      
      // Convert to WAV and save
      convertAndSaveAsWAV(audioBlob);
      
      // Stop all tracks to free up the microphone
      stream.getTracks().forEach(track => track.stop());
    };
    
    mediaRecorder.start();
    isRecording = true;
    console.log('Recording started...');
    
  } catch (error) {
    console.error('Error accessing microphone:', error);
    alert('Error accessing microphone. Please ensure microphone permissions are granted.');
  }
}

/**
 * Stop audio recording
 */
function stopRecording() {
  if (mediaRecorder && isRecording) {
    mediaRecorder.stop();
    isRecording = false;
    console.log('Recording stopped.');
  }
}

/**
 * Convert audio blob to WAV format and save
 */
function convertAndSaveAsWAV(audioBlob) {
  const fs = require('fs');
  const path = require('path');
  
  // Define the audio file path in the project directory
  const audioDir = path.join(__dirname, 'audio-recordings');
  const audioFilePath = path.join(audioDir, 'ship-audio-recording.wav');
  
  // Create directory if it doesn't exist
  if (!fs.existsSync(audioDir)) {
    fs.mkdirSync(audioDir, { recursive: true });
  }
  
  console.log('Converting and saving audio as WAV:', audioBlob.size, 'bytes');
  
  // Convert the recorded audio to WAV format
  audioBlob.arrayBuffer().then(arrayBuffer => {
    // Create an audio context to decode the audio
    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
    
    audioContext.decodeAudioData(arrayBuffer).then(audioBuffer => {
      // Convert AudioBuffer to WAV
      const wavArrayBuffer = audioBufferToWav(audioBuffer);
      const buffer = Buffer.from(wavArrayBuffer);
      
      try {
        // Write the WAV file (this will replace any existing file with the same name)
        fs.writeFileSync(audioFilePath, buffer);
        console.log('WAV audio saved to:', audioFilePath);
        
      } catch (error) {
        console.error('Error saving WAV file:', error);
      }
    }).catch(error => {
      console.error('Error decoding audio data:', error);
    });
  }).catch(error => {
    console.error('Error converting audio blob:', error);
  });
}

/**
 * Convert AudioBuffer to WAV format
 */
function audioBufferToWav(audioBuffer) {
  const length = audioBuffer.length;
  const sampleRate = audioBuffer.sampleRate;
  const numberOfChannels = audioBuffer.numberOfChannels;
  const bytesPerSample = 2;
  const blockAlign = numberOfChannels * bytesPerSample;
  const byteRate = sampleRate * blockAlign;
  const dataSize = length * blockAlign;
  const bufferSize = 44 + dataSize;
  
  const arrayBuffer = new ArrayBuffer(bufferSize);
  const view = new DataView(arrayBuffer);
  
  // WAV header
  const writeString = (offset, string) => {
    for (let i = 0; i < string.length; i++) {
      view.setUint8(offset + i, string.charCodeAt(i));
    }
  };
  
  let offset = 0;
  writeString(offset, 'RIFF'); offset += 4;
  view.setUint32(offset, bufferSize - 8, true); offset += 4;
  writeString(offset, 'WAVE'); offset += 4;
  writeString(offset, 'fmt '); offset += 4;
  view.setUint32(offset, 16, true); offset += 4;
  view.setUint16(offset, 1, true); offset += 2;
  view.setUint16(offset, numberOfChannels, true); offset += 2;
  view.setUint32(offset, sampleRate, true); offset += 4;
  view.setUint32(offset, byteRate, true); offset += 4;
  view.setUint16(offset, blockAlign, true); offset += 2;
  view.setUint16(offset, 16, true); offset += 2;
  writeString(offset, 'data'); offset += 4;
  view.setUint32(offset, dataSize, true); offset += 4;
  
  // Convert audio samples to 16-bit PCM
  const channels = [];
  for (let i = 0; i < numberOfChannels; i++) {
    channels.push(audioBuffer.getChannelData(i));
  }
  
  for (let i = 0; i < length; i++) {
    for (let channel = 0; channel < numberOfChannels; channel++) {
      const sample = Math.max(-1, Math.min(1, channels[channel][i]));
      const int16 = sample < 0 ? sample * 0x8000 : sample * 0x7FFF;
      view.setInt16(offset, int16, true);
      offset += 2;
    }
  }
  
  return arrayBuffer;
}