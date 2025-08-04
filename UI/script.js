document.addEventListener('DOMContentLoaded', () => {
  // Duration for loading screen animation
  const loadingAnimationDuration = 3000;
  const videoDuration = 5000;

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