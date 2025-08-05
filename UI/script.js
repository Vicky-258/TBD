// Global variables
const loadingAnimationDuration = 3000;
const videoDuration = 5000;
let currentMode = null; // Track active mode
let timeoutId = null; // Store timeout ID for cleanup
let mediaRecorder = null; // MediaRecorder instance
let audioChunks = []; // Store recorded audio data
let isRecording = false; // Track recording state
let chatHistory = [];
let currentChat = { id: null, messages: [] };
let soundContext = null;
let currentSlide = 0;

try {
  soundContext = new (window.AudioContext || window.webkitAudioContext)();
} catch (err) {
  console.error('Failed to initialize AudioContext:', err);
}

// Load chat history from localStorage
function loadChatHistory() {
  const savedHistory = localStorage.getItem('chatHistory');
  if (savedHistory) {
    chatHistory = JSON.parse(savedHistory);
    updateChatHistoryUI();
  }
}

// Save chat history to localStorage
function saveChatHistory() {
  localStorage.setItem('chatHistory', JSON.stringify(chatHistory));
}

// Clear any existing timeouts to prevent unintended navigation
function clearTimeouts() {
  if (timeoutId) {
    clearTimeout(timeoutId);
    timeoutId = null;
    console.log('Cleared timeout');
  }
}

// Check microphone permissions
async function checkMicrophonePermission() {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    stream.getTracks().forEach(track => track.stop()); // Release stream
    return true;
  } catch (err) {
    console.error('Microphone permission error:', err.name, err.message);
    alert(`Microphone access denied: ${err.message}. Please enable microphone permissions.`);
    return false;
  }
}

// Convert audio blob to WAV format
function convertToWav(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = function () {
      const audioContext = new (window.AudioContext || window.webkitAudioContext)();
      audioContext.decodeAudioData(reader.result, (buffer) => {
        const wavBuffer = audioBufferToWav(buffer);
        const wavBlob = new Blob([wavBuffer], { type: 'audio/wav' });
        resolve(wavBlob);
      }, (err) => reject(err));
    };
    reader.onerror = reject;
    reader.readAsArrayBuffer(blob);
  });
}

// Helper function to convert AudioBuffer to WAV
function audioBufferToWav(buffer) {
  const numChannels = buffer.numberOfChannels;
  const sampleRate = buffer.sampleRate;
  const format = 1; // PCM
  const bitDepth = 16;

  const result = new ArrayBuffer(44 + buffer.length * 2);
  const view = new DataView(result);

  // Write WAV header
  writeString(view, 0, 'RIFF');
  view.setUint32(4, 36 + buffer.length * 2, true);
  writeString(view, 8, 'WAVE');
  writeString(view, 12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, format, true);
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * numChannels * bitDepth / 8, true);
  view.setUint16(32, numChannels * bitDepth / 8, true);
  view.setUint16(34, bitDepth, true);
  writeString(view, 36, 'data');
  view.setUint32(40, buffer.length * 2, true);

  // Write PCM data
  const channelData = buffer.getChannelData(0);
  let offset = 44;
  for (let i = 0; i < channelData.length; i++, offset += 2) {
    const s = Math.max(-1, Math.min(1, channelData[i]));
    view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7FFF, true);
  }

  return result;
}

function writeString(view, offset, string) {
  for (let i = 0; i < string.length; i++) {
    view.setUint8(offset + i, string.charCodeAt(i));
  }
}

// Toggle recording for mic button
async function toggleRecording() {
  const micButton = document.querySelector('#mic-button');
  if (!micButton) {
    console.error('Mic button not found');
    alert('Microphone button not found.');
    return;
  }

  if (!isRecording) {
    // Check permissions before starting
    const hasPermission = await checkMicrophonePermission();
    if (!hasPermission) {
      console.error('Recording aborted due to lack of microphone permission');
      return;
    }

    // Start recording
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          sampleRate: 44100
        } 
      });
      
      const mimeType = 'audio/webm';
      mediaRecorder = new MediaRecorder(stream, { mimeType });
      audioChunks = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunks.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        stream.getTracks().forEach(track => track.stop());
        isRecording = false;
        micButton.classList.remove('recording');
        micButton.textContent = '🎤';

        if (audioChunks.length > 0) {
          let audioBlob = new Blob(audioChunks, { type: mimeType });
          audioBlob = await convertToWav(audioBlob);

          try {
            const formData = new FormData();
            formData.append('audio', audioBlob, 'ship-audio-recording.wav');

            const response = await fetch('http://localhost:3001/upload-audio', {
              method: 'POST',
              body: formData
            });

            if (!response.ok) {
              console.error('Audio upload failed:', await response.text());
            }
          } catch (err) {
            console.error('Error uploading audio:', err.message);
          }
        } else {
          console.error('No audio chunks recorded');
        }
      };

      mediaRecorder.onerror = (event) => {
        console.error('MediaRecorder error:', event.error);
        isRecording = false;
        micButton.classList.remove('recording');
        micButton.textContent = '🎤';
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      isRecording = true;
      micButton.classList.add('recording');
      micButton.textContent = '🔴';
      
      // Auto-stop after 30 seconds
      setTimeout(() => {
        if (isRecording && mediaRecorder && mediaRecorder.state === 'recording') {
          mediaRecorder.stop();
        }
      }, 30000);
      
    } catch (error) {
      console.error('Recording setup error:', error);
      isRecording = false;
      micButton.classList.remove('recording');
      micButton.textContent = '🎤';
    }
  } else {
    if (mediaRecorder && mediaRecorder.state === 'recording') {
      mediaRecorder.stop();
    } else {
      console.error('MediaRecorder not in recording state');
      isRecording = false;
      micButton.classList.remove('recording');
      micButton.textContent = '🎤';
    }
  }
}

// DOM loaded logic
document.addEventListener('DOMContentLoaded', () => {
  console.log('DOM fully loaded, initializing app');
  const loadingScreen = document.getElementById('loading-screen');
  const videoScreen = document.getElementById('video-screen');
  const modeSelection = document.getElementById('mode-selection');

  if (!loadingScreen || !videoScreen || !modeSelection) {
    console.error('Required DOM elements missing:', { loadingScreen, videoScreen, modeSelection });
    return;
  }

  // Load chat history
  loadChatHistory();

  // Show loading screen, then video, then mode selection
  timeoutId = setTimeout(() => {
    loadingScreen.classList.add('hidden');
    videoScreen.classList.remove('hidden');

    const video = document.getElementById('intro-video');
    if (video) {
      video.currentTime = 0;
      video.play().catch(err => console.error('Video playback error:', err));

      video.onended = () => {
        if (currentMode === null) {
          videoScreen.classList.add('hidden');
          modeSelection.classList.remove('hidden');
          currentMode = 'mode-selection';
          startQuoteSlideshow();
        }
      };

      timeoutId = setTimeout(() => {
        if (currentMode === null) {
          videoScreen.classList.add('hidden');
          modeSelection.classList.remove('hidden');
          currentMode = 'mode-selection';
          startQuoteSlideshow();
        }
      }, videoDuration);
    } else {
      console.error('Intro video element not found');
      videoScreen.classList.add('hidden');
      modeSelection.classList.remove('hidden');
      currentMode = 'mode-selection';
      startQuoteSlideshow();
    }
  }, loadingAnimationDuration);

  const chatInput = document.getElementById('chat-input');
  if (chatInput) {
    chatInput.addEventListener('keypress', function(e) {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        sendMessage();
      }
    });
  } else {
    console.error('Chat input element not found');
  }

  initializeCarousel();
});

// Chat system
function playClickSound() {
  if (soundContext) {
    try {
      const oscillator = soundContext.createOscillator();
      oscillator.type = 'square';
      oscillator.frequency.setValueAtTime(800, soundContext.currentTime);
      oscillator.connect(soundContext.destination);
      oscillator.start();
      oscillator.stop(soundContext.currentTime + 0.05);
    } catch (err) {
      console.error('Error playing click sound:', err);
    }
  }
}

function generateChatId() {
  return 'chat-' + Date.now();
}

function getAIResponse(message) {
  console.log('Fetching AI response for:', message);
  return `AI: Processing "${message}"...`;
}

function formatTimestamp(timestamp) {
  const date = new Date(timestamp);
  const today = new Date();
  const isToday = date.toDateString() === today.toDateString();
  if (isToday) {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  } else {
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  }
}

function sendMessage() {
  playClickSound();
  const input = document.getElementById('chat-input');
  const historyDiv = document.getElementById('chat-history');

  if (!input || !historyDiv) {
    console.error('Chat input or history div not found:', { input, historyDiv });
    return;
  }

  if (input.value.trim()) {
    const userText = input.value;

    const userMsg = document.createElement('div');
    userMsg.classList.add('message', 'user-message');
    userMsg.textContent = `You: ${userText}`;
    historyDiv.appendChild(userMsg);
    currentChat.messages.push({ type: 'user', text: userText });

    const aiResponseText = getAIResponse(userText);
    const aiMsg = document.createElement('div');
    aiMsg.classList.add('message', 'ai-message');
    aiMsg.textContent = aiResponseText;
    historyDiv.appendChild(aiMsg);
    currentChat.messages.push({ type: 'ai', text: aiResponseText });

    input.value = '';
    historyDiv.scrollTop = historyDiv.scrollHeight;
  }
}

function saveCurrentChat() {
  if (currentChat.messages.length) {
    const existing = chatHistory.find(c => c.id === currentChat.id);
    const summary = currentChat.messages.length > 0 ? currentChat.messages[0].text.substring(0, 50) : 'No messages';
    const timestamp = Date.now();
    if (existing) {
      existing.messages = currentChat.messages;
      existing.summary = summary;
      existing.timestamp = timestamp;
    } else {
      chatHistory.push({ id: currentChat.id, messages: currentChat.messages, summary, timestamp });
    }
    saveChatHistory();
    updateChatHistoryUI();
  }
}

function updateChatHistoryUI() {
  const settingsMenu = document.querySelector('.settings-dashboard ul');
  if (settingsMenu) {
    settingsMenu.innerHTML = '';
    // Sort chats by timestamp (oldest first)
    chatHistory.sort((a, b) => a.timestamp - b.timestamp);
    chatHistory.forEach(chat => {
      const li = document.createElement('li');
      li.classList.add('retro-menu-item');
      li.style.fontFamily = "'Press Start 2P', monospace";
      li.textContent = `${formatTimestamp(chat.timestamp)}: ${chat.summary}`;
      li.onclick = () => loadChat(chat.id);
      settingsMenu.appendChild(li);
    });
  }
}

function startNewChat() {
  playClickSound();
  saveCurrentChat();
  currentChat = { id: generateChatId(), messages: [] };
  const historyDiv = document.getElementById('chat-history');
  if (historyDiv) {
    historyDiv.innerHTML = '';
    updateChatHistoryUI();
  } else {
    console.error('Chat history div not found');
  }
}

function newChat() {
  startNewChat();
}

function loadChat(chatId) {
  playClickSound();
  currentChat = chatHistory.find(c => c.id === chatId) || { id: chatId, messages: [] };
  const responseBox = document.getElementById('chat-history');
  if (responseBox) {
    responseBox.innerHTML = '';

    currentChat.messages.forEach(msg => {
      const msgDiv = document.createElement('div');
      msgDiv.classList.add('message', msg.type === 'user' ? 'user-message' : 'ai-message');
      msgDiv.textContent = `${msg.type === 'user' ? 'You' : 'AI'}: ${msg.text}`;
      responseBox.appendChild(msgDiv);
    });

    responseBox.scrollTop = responseBox.scrollHeight;
  } else {
    console.error('Chat history div not found');
  }
}

// UI and navigation
function selectMode(mode) {
  playClickSound();
  clearTimeouts();
  if (currentChat.messages.length && mode !== 'sailing') {
    saveCurrentChat();
  }

  const modeSelection = document.getElementById('mode-selection');
  const departurePrep = document.getElementById('departure-prep');
  const homepage = document.getElementById('homepage');
  const voyageHistory = document.getElementById('voyage-history');

  if (!modeSelection || !departurePrep || !homepage || !voyageHistory) {
    console.error('Navigation elements missing:', { modeSelection, departurePrep, homepage, voyageHistory });
    return;
  }

  modeSelection.classList.add('hidden');
  currentMode = mode;

  if (mode === 'departure') {
    departurePrep.classList.remove('hidden');
  } else if (mode === 'sailing') {
    homepage.classList.remove('hidden');
    currentSlide = 0;
    setTimeout(() => {
      updateCarousel();
      console.log('Carousel updated in sailing mode');
    }, 0);
    if (!currentChat.id) startNewChat();
    updateChatHistoryUI();
  } else if (mode === 'voyage-history') {
    voyageHistory.classList.remove('hidden');
  }

  console.log(`Mode selected: ${mode}`);
}

function backToHome() {
  playClickSound();
  clearTimeouts();
  saveCurrentChat();
  const departurePrep = document.getElementById('departure-prep');
  const voyageHistory = document.getElementById('voyage-history');
  const homepage = document.getElementById('homepage');
  const modeSelection = document.getElementById('mode-selection');

  if (!departurePrep || !voyageHistory || !homepage || !modeSelection) {
    console.error('Navigation elements missing:', { departurePrep, voyageHistory, homepage, modeSelection });
    return;
  }

  departurePrep.classList.add('hidden');
  voyageHistory.classList.add('hidden');
  homepage.classList.add('hidden');
  modeSelection.classList.remove('hidden');
  currentMode = 'mode-selection';
  console.log('Returned to mode selection');
}

function toggleSettings() {
  playClickSound();
  const dash = document.getElementById('settings-dashboard');
  if (dash) {
    dash.classList.toggle('active');
  } else {
    console.error('Settings dashboard not found');
  }
}

// Carousel
function getVisibleBoxes() {
  const width = window.innerWidth;
  if (width <= 480) return 1;
  if (width <= 768) return 2;
  return 3;
}

function initializeCarousel() {
  console.log('Initializing carousel');
  currentSlide = 0;
  setTimeout(() => {
    updateCarousel();
    console.log('Carousel initialized with first slide');
  }, 0);
}

function updateCarousel() {
  const carousel = document.querySelector('.feature-carousel');
  const featureBoxes = document.querySelectorAll('.feature-box');
  const totalBoxes = featureBoxes.length;
  const visibleBoxes = getVisibleBoxes();
  const maxSlide = Math.max(0, totalBoxes - visibleBoxes);

  if (!carousel || totalBoxes === 0) {
    console.error('Carousel or feature boxes not found:', { carousel, totalBoxes });
    return;
  }

  if (currentSlide > maxSlide) {
    currentSlide = maxSlide;
    console.log(`Adjusted currentSlide to maxSlide: ${currentSlide}`);
  }

  const boxWidth = 295;
  const translateX = -(currentSlide * boxWidth);

  carousel.style.transform = `translateX(${translateX}px)`;
  const prevBtn = document.querySelector('.prev-btn');
  const nextBtn = document.querySelector('.next-btn');
  if (prevBtn && nextBtn) {
    prevBtn.disabled = currentSlide === 0;
    nextBtn.disabled = currentSlide >= maxSlide;
    prevBtn.style.pointerEvents = currentSlide === 0 ? 'none' : 'auto';
    nextBtn.style.pointerEvents = currentSlide >= maxSlide ? 'none' : 'auto';
    prevBtn.onclick = prevSlide;
    nextBtn.onclick = nextSlide;
  }
}

function nextSlide() {
  const totalBoxes = document.querySelectorAll('.feature-box').length;
  const visibleBoxes = getVisibleBoxes();
  const maxSlide = Math.max(0, totalBoxes - visibleBoxes);

  if (currentSlide < maxSlide) {
    currentSlide++;
    updateCarousel();
    playClickSound();
  }
}

function prevSlide() {
  if (currentSlide > 0) {
    currentSlide--;
    updateCarousel();
    playClickSound();
  }
}

function exitApp() {
  playClickSound();
  if (confirm('Are you sure you want to exit the Ship Assistant?')) {
    window.close();
    setTimeout(() => {
      window.location.href = 'about:blank';
    }, 100);
  }
}

// Window control functions
function minimizeWindow() {
  playClickSound();
  const { ipcRenderer } = require('electron');
  ipcRenderer.send('minimize-window');
}

function toggleMaximize() {
  playClickSound();
  const { ipcRenderer } = require('electron');
  ipcRenderer.send('toggle-maximize');
}

// Quote slideshow with dynamic timing
function startQuoteSlideshow() {
  const quotes = document.querySelectorAll('.quote');
  if (quotes.length === 0) {
    console.error('No quotes found for slideshow');
    return;
  }

  let currentQuoteIndex = 0;

  function showNextQuote() {
    quotes.forEach((quote, index) => {
      quote.classList.toggle('active', index === currentQuoteIndex);
    });

    const currentQuote = quotes[currentQuoteIndex].textContent;
    const duration = Math.min(Math.max(currentQuote.length * 100, 3000), 10000);

    currentQuoteIndex = (currentQuoteIndex + 1) % quotes.length;

    setTimeout(showNextQuote, duration);
  }

  showNextQuote();
}

// Update carousel on window resize
window.addEventListener('resize', () => {
  updateCarousel();
});