let isSpeaking = false;
let utterance = null;

function toggleAudio() {
  const btn = document.querySelector('.audio-btn');
  const storyText = document.getElementById('story-text').innerText;

  if (isSpeaking) {
    window.speechSynthesis.cancel();
    isSpeaking = false;
    btn.innerHTML = '🔊 Listen to this Story';
  } else {
    utterance = new SpeechSynthesisUtterance(storyText);
    utterance.rate = 0.9;
    utterance.pitch = 1;
    utterance.lang = 'en-IN';
    window.speechSynthesis.speak(utterance);
    isSpeaking = true;
    btn.innerHTML = '⏹ Stop Narration';

    utterance.onend = function () {
      isSpeaking = false;
      btn.innerHTML = '🔊 Listen to this Story';
    };
  }
}

// Chatbot


function toggleChat() {
  const chatWindow = document.getElementById('chat-window');
  chatWindow.classList.toggle('open');
}

function handleKey(event) {
  if (event.key === 'Enter') {
    sendMessage();
  }
}

async function sendMessage() {
  const input = document.getElementById('chat-input');
  const messages = document.getElementById('chat-messages');
  const userText = input.value.trim();

  if (!userText) return;

  // Show user message
  messages.innerHTML += `<div class="message user-message">${userText}</div>`;
  input.value = '';
  messages.scrollTop = messages.scrollHeight;

  // Show typing indicator
  messages.innerHTML += `<div class="message bot-message" id="typing">thinking... 🙏</div>`;
  messages.scrollTop = messages.scrollHeight;

  try {
    const response = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: userText })
    });

   const data = await response.json();
console.log('Response from server:', data);
document.getElementById('typing').remove();
messages.innerHTML += `<div class="message bot-message">${data.reply}</div>`;
    messages.scrollTop = messages.scrollHeight;

  } catch (error) {
    document.getElementById('typing').remove();
    messages.innerHTML += `<div class="message bot-message">Sorry, I couldn't connect. Please try again 🙏</div>`;
  }
}