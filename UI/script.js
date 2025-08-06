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
            // Optional: still upload if needed
            await fetch("http://localhost:3001/upload-audio", {
              method: "POST",
              body: (() => {
                const form = new FormData();
                form.append("audio", audioBlob, "ship-audio-recording.wav");
                return form;
              })(),
            });

            // 👇🔥 New: call the chat API with it!
            await sendVoiceToChatAPI(audioBlob);
          } catch (err) {
            console.error(
              "Error during audio upload or chat API:",
              err.message
            );
          }
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

function appendMessage(type, text) {
  const historyDiv = document.getElementById("chat-history");
  const msg = document.createElement("div");
  msg.classList.add("message", `${type}-message`);
  msg.textContent = `${type === "user" ? "You" : "AI"}: ${text}`;
  historyDiv.appendChild(msg);
  historyDiv.scrollTop = historyDiv.scrollHeight;
}

function createAIMessageBox() {
  const historyDiv = document.getElementById("chat-history");
  const aiMsg = document.createElement("div");
  aiMsg.classList.add("message", "ai-message");
  aiMsg.innerHTML = `<strong>AI:</strong> <span class="streamed-text"></span>`;
  historyDiv.appendChild(aiMsg);
  historyDiv.scrollTop = historyDiv.scrollHeight;
  return aiMsg.querySelector(".streamed-text");
}

async function streamAPI(endpoint, formData, onChunk) {
  const response = await fetch(endpoint, {
    method: "POST",
    body: formData,
  });

  if (!response.ok || !response.body)
    throw new Error(`API Error! status: ${response.status}`);

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let fullText = "";

  while (true) {
    const { value, done } = await reader.read();
    if (done) break;

    const chunk = decoder.decode(value, { stream: true });
    fullText += chunk;
    if (onChunk) onChunk(chunk);
  }

  return fullText;
}

async function sendTextToChatAPI(userText) {
  appendMessage("user", userText);

  const span = createAIMessageBox();
  let rawMarkdown = "";

  const formData = new FormData();
  formData.append("user_input", userText);

  try {
    await streamAPI("http://localhost:8000/text-chat", formData, (chunk) => {
      rawMarkdown += chunk;
      span.innerHTML = marked.parse(rawMarkdown); // Render markdown
    });

    currentChat.messages.push({ type: "user", text: userText });
    currentChat.messages.push({ type: "ai", text: rawMarkdown });
  } catch (error) {
    console.error("Text chat failed:", error);
    span.innerHTML = `<i>AI: Sorry, something broke 🧨</i>`;
  }
}

async function sendVoiceToChatAPI(audioBlob) {
  const formData = new FormData();
  formData.append("audio", audioBlob, "recording.wav");

  const historyDiv = document.getElementById("chat-history");
  const span = createAIMessageBox();
  let rawMarkdown = "";

  try {
    const transcriptHeader = await fetch("http://localhost:8000/voice-chat", {
      method: "POST",
      body: formData,
    });

    const transcript =
      transcriptHeader.headers.get("x-user-transcript") || "🎤 Voice message";
    appendMessage("user", transcript);

    const reader = transcriptHeader.body.getReader();
    const decoder = new TextDecoder();

    while (true) {
      const { value, done } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value, { stream: true });
      rawMarkdown += chunk;
      span.innerHTML = marked.parse(rawMarkdown);
      historyDiv.scrollTop = historyDiv.scrollHeight;
    }

    currentChat.messages.push({ type: "user", text: transcript });
    currentChat.messages.push({ type: "ai", text: rawMarkdown });
  } catch (err) {
    console.error("Voice chat failed:", err);
    span.innerHTML = `<i>AI: I tripped over the audio wire 🎧💥</i>`;
  }
}

async function sendImageToChatAPI(imageFile, userText) {
  appendMessage("user", userText || "🖼️ Image uploaded");

  const span = createAIMessageBox();
  let rawMarkdown = "";

  const formData = new FormData();
  formData.append("image", imageFile);
  formData.append("user_input", userText);

  try {
    await streamAPI("http://localhost:8000/image-chat", formData, (chunk) => {
      rawMarkdown += chunk;
      span.innerHTML = marked.parse(rawMarkdown);
    });

    currentChat.messages.push({ type: "user", text: userText });
    currentChat.messages.push({ type: "ai", text: rawMarkdown });
  } catch (error) {
    console.error("Image chat failed:", error);
    span.innerHTML = `<i>AI: My pixels got scrambled 🖼️🧨</i>`;
  }
}


async function sendMessage() {
  playClickSound();
  const input = document.getElementById("chat-input");
  const imageInput = document.getElementById("image-upload");

  if (!input || !imageInput) return;

  const userText = input.value.trim();
  const imageFile = imageInput.files[0];

  if (!userText && !imageFile) return;

  // clear input
  input.value = "";
  imageInput.value = "";

  if (imageFile) {
    await sendImageToChatAPI(imageFile, userText);
  } else {
    await sendTextToChatAPI(userText);
  }

  clearImage();
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

function handleImageUpload(event) {
  const file = event.target.files[0];
  if (file && file.type.startsWith("image/")) {
    const reader = new FileReader();
    reader.onload = function (e) {
      const preview = document.getElementById("image-preview");
      preview.src = e.target.result;
      document.getElementById("image-preview-container").style.display = "flex";
    };
    reader.readAsDataURL(file);
  }
}

function clearImage() {
  const input = document.getElementById("image-upload");
  const preview = document.getElementById("image-preview");
  input.value = ""; // Reset file input
  preview.src = "";
  document.getElementById("image-preview-container").style.display = "none";
}

const chatInput = document.getElementById("chat-input");
const chatInputContainer = document.querySelector(".chat-input");

chatInput.addEventListener("focus", () => {
  chatInputContainer.classList.add("focus-mode");
});

chatInput.addEventListener("blur", () => {
  setTimeout(() => {
    // Delay allows clicking SEND if needed before reset
    chatInputContainer.classList.remove("focus-mode");
  }, 200);
});

document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") {
    chatInput.blur(); // exit focus mode
    chatInputContainer.classList.remove("focus-mode");
  }
});


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
  const wrapper = document.querySelector(".feature-carousel-wrapper");
  const box = document.querySelector(".feature-box");

  if (!wrapper || !box) return 1; // Fallback to 1 if something goes wrong

  const wrapperWidth = wrapper.offsetWidth;
  const boxStyle = getComputedStyle(box);
  const boxWidth =
    box.offsetWidth +
    parseFloat(boxStyle.marginLeft || 0) +
    parseFloat(boxStyle.marginRight || 0);

  return Math.floor(wrapperWidth / boxWidth);
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

  const boxWidth =
    featureBoxes[0].offsetWidth +
    parseFloat(getComputedStyle(featureBoxes[0]).marginRight || 0);
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

function formatTimestamp(timestamp) {
  const date = new Date(timestamp);
  const today = new Date();
  const isToday = date.toDateString() === today.toDateString();
  if (isToday) {
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  } else {
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  }
}

window.addEventListener("DOMContentLoaded", () => {
  fetch("http://localhost:8000/reset-session", {
    method: "POST",
  }).then((res) => {
    if (res.ok) console.log("✅ Session reset on page load");
    else console.error("❌ Failed to reset session");
  });
});
