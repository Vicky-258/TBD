document.addEventListener('DOMContentLoaded', () => {
  // Duration for loading screen animation (grid and text)
  const loadingAnimationDuration = 3000; // 3 seconds for grid and text
  // Fallback duration for video screen
  const videoDuration = 5000; // 5 seconds as fallback if video duration unknown

  // After loading animation, transition to video screen
  setTimeout(() => {
    document.getElementById('loading-screen').classList.add('hidden');
    document.getElementById('video-screen').classList.remove('hidden');

    const video = document.getElementById('intro-video');
    video.currentTime = 0;
    video.pause();
    video.play();

    // Transition to mode selection after video ends
    video.onended = () => {
      document.getElementById('video-screen').classList.add('hidden');
      document.getElementById('mode-selection').classList.remove('hidden');
    };

    // Fallback in case video duration is unknown or video fails to play
    setTimeout(() => {
      document.getElementById('video-screen').classList.add('hidden');
      document.getElementById('mode-selection').classList.remove('hidden');
    }, videoDuration);
  }, loadingAnimationDuration);

  // Add Enter key support for sending messages
  document.getElementById('chat-input').addEventListener('keypress', function(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  });

  // Feature box carousel
  let currentFeature = 0;
  const featureBoxes = document.querySelectorAll('.feature-box');
  function rotateFeatures() {
    // Remove active class from previous feature and add to current
    featureBoxes.forEach(box => box.classList.remove('active'));
    featureBoxes[currentFeature].classList.add('active');
    
    // Move to the next feature, loop back to start if at the end
    currentFeature = (currentFeature + 1) % featureBoxes.length;
  }
  
  // Initial call to set the first active feature
  rotateFeatures(); 
  // Set interval for rotation - slowed down to 3 seconds for better user experience
  setInterval(rotateFeatures, 3000); // Rotates every 3 seconds
});

/**
 * Handles the selection of an operating mode and transitions to the homepage.
 * @param {string} mode - The selected operating mode (e.g., 'departure', 'sailing').
 */
function selectMode(mode) {
  document.getElementById('mode-selection').classList.add('hidden');
  document.getElementById('homepage').classList.remove('hidden');
  // In a real app, 'mode' could be used to initialize homepage differently
  console.log(`Operating mode selected: ${mode}`);
}

/**
 * Toggles the visibility of the settings dashboard.
 */
function toggleSettings() {
  const dashboard = document.getElementById('settings-dashboard');
  dashboard.classList.toggle('active');
}

/**
 * Sends a message from the chat input, displays a summary in history,
 * and a generic AI response.
 */
function sendMessage() {
  const input = document.getElementById('chat-input');
  const history = document.getElementById('chat-history');
  const response = document.getElementById('chat-response');
  
  // Only proceed if the input is not empty
  if (input.value.trim()) {
    // Create a summary for chat history
    // Takes the first 5 words of the input to form a summary
    const summary = `You: ${input.value.split(' ').slice(0, 5).join(' ')}${input.value.split(' ').length > 5 ? '...' : ''}`;
    const historyItem = document.createElement('div');
    historyItem.textContent = summary;
    history.appendChild(historyItem);
    
    // Create a generic AI response
    const aiResponse = document.createElement('div');
    aiResponse.textContent = `AI: Understood. Analyzing "${input.value}"...`;
    response.appendChild(aiResponse);
    
    // Clear the input field
    input.value = '';

    // Scroll chat history and response boxes to the bottom to show latest messages
    history.scrollTop = history.scrollHeight;
    response.scrollTop = response.scrollHeight;
  }
}