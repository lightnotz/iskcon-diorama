// js/main.js

// ─── NARRATION ────────────────────────────────────────────────────────────────

let isSpeaking = false;
let currentAudio = null;   // ElevenLabs Audio object
let utterance = null;      // Browser TTS fallback

async function toggleAudio() {
  const btn = document.querySelector('.audio-btn');
  const storyEl = document.getElementById('story-text');
  if (!btn || !storyEl) return;

  if (isSpeaking) {
    stopNarration();
    return;
  }

  const storyText = storyEl.innerText.trim();
  btn.innerHTML = '⏳ Loading narration...';
  btn.disabled = true;

  try {
    const response = await fetch('/api/narrate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: storyText }),
    });

    const contentType = response.headers.get('Content-Type') || '';

    if (contentType.includes('application/json')) {
      const data = await response.json();
      if (data.fallback) {
        useBrowserTTS(storyText, btn);
        return;
      }
    }

    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    currentAudio = new Audio(url);

    currentAudio.play();
    isSpeaking = true;
    btn.innerHTML = '⏹ Stop Narration';
    btn.disabled = false;

    currentAudio.onended = () => {
      isSpeaking = false;
      btn.innerHTML = '🔊 Listen to this Story';
      URL.revokeObjectURL(url);
    };

    currentAudio.onerror = () => {
      isSpeaking = false;
      btn.innerHTML = '🔊 Listen to this Story';
      btn.disabled = false;
    };

  } catch (err) {
    console.warn('ElevenLabs failed, using browser TTS:', err);
    useBrowserTTS(storyText, btn);
  }
}

function stopNarration() {
  const btn = document.querySelector('.audio-btn');
  if (currentAudio) {
    currentAudio.pause();
    currentAudio.currentTime = 0;
    currentAudio = null;
  }
  window.speechSynthesis.cancel();
  isSpeaking = false;
  if (btn) {
    btn.innerHTML = '🔊 Listen to this Story';
    btn.disabled = false;
  }
}

function useBrowserTTS(text, btn) {
  const voices = window.speechSynthesis.getVoices();
  const preferred = voices.find(v =>
    v.lang === 'en-IN' || v.lang === 'en-GB' || v.name.includes('Google')
  ) || voices[0];

  utterance = new SpeechSynthesisUtterance(text);
  utterance.rate = 0.88;
  utterance.pitch = 1.0;
  utterance.volume = 1;
  if (preferred) utterance.voice = preferred;

  window.speechSynthesis.speak(utterance);
  isSpeaking = true;
  if (btn) {
    btn.innerHTML = '⏹ Stop Narration';
    btn.disabled = false;
  }

  utterance.onend = () => {
    isSpeaking = false;
    if (btn) btn.innerHTML = '🔊 Listen to this Story';
  };
}

// ─── CHATBOT ──────────────────────────────────────────────────────────────────

// Conversation history — persists for the whole session
const conversationHistory = [];

// Human-readable names for each pastime, used in the greeting
const PASTIME_NAMES = {
  kaliya:     'Kaliya Daman',
  govardhan:  'Govardhan Puja',
  butter:     'Butter Thief',
  putana:     'Putana Moksha',
};

// Detect which page we're on
const currentPastimeId = (typeof PASTIME_ID !== 'undefined') ? PASTIME_ID : null;

// ── Set the correct greeting when the page loads ──
function setInitialGreeting() {
  const messagesEl = document.getElementById('chat-messages');
  if (!messagesEl) return;

  let greeting;

  if (currentPastimeId && PASTIME_NAMES[currentPastimeId]) {
    const name = PASTIME_NAMES[currentPastimeId];
    greeting = `Hare Krishna! 🙏 You are exploring <strong>${name}</strong>.<br><br>
I can tell you the full story, its spiritual significance, what the scriptures say about it, or answer any questions you have about this pastime. How may I serve you?`;
  } else {
    greeting = `Hare Krishna! 🙏 Welcome to ISKCON Abids.<br><br>
I can help you with temple timings, upcoming events, Krishna's divine pastimes, or anything about our dioramas. How may I serve you today?`;
  }

  messagesEl.innerHTML = `<div class="message bot-message">${greeting}</div>`;
}

function toggleChat() {
  const chatWindow = document.getElementById('chat-window');
  if (!chatWindow) return;
  chatWindow.classList.toggle('open');
}

function handleKey(event) {
  if (event.key === 'Enter') sendMessage();
}

async function sendMessage() {
  const input = document.getElementById('chat-input');
  const messages = document.getElementById('chat-messages');
  if (!input || !messages) return;

  const userText = input.value.trim();
  if (!userText) return;

  // Show user message
  messages.innerHTML += `<div class="message user-message">${userText}</div>`;
  input.value = '';
  messages.scrollTop = messages.scrollHeight;

  // Push to history
  conversationHistory.push({ role: 'user', content: userText });

  // Typing indicator with unique id so we can remove it safely
  const typingId = 'typing-' + Date.now();
  messages.innerHTML += `<div class="message bot-message" id="${typingId}">thinking... 🙏</div>`;
  messages.scrollTop = messages.scrollHeight;

  try {
    const response = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        history: conversationHistory,
        context: currentPastimeId,   // tells the server which page we're on
      }),
    });

    if (!response.ok) throw new Error('Server error: ' + response.status);

    const data = await response.json();
    document.getElementById(typingId)?.remove();

    const reply = data.reply || 'Hare Krishna! Please try again 🙏';

    // Save assistant reply so next turn has full context
    conversationHistory.push({ role: 'assistant', content: reply });

    messages.innerHTML += `<div class="message bot-message">${reply}</div>`;
    messages.scrollTop = messages.scrollHeight;

  } catch (error) {
    document.getElementById(typingId)?.remove();
    messages.innerHTML += `<div class="message bot-message">Sorry, something went wrong. Please try again 🙏</div>`;
    // Pop the failed user message so history stays clean
    conversationHistory.pop();
  }
}

// ─── SCROLL ANIMATIONS ────────────────────────────────────────────────────────

const observer = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) entry.target.classList.add('visible');
  });
}, { threshold: 0.1 });

document.querySelectorAll('.diorama-card, .section-title, .section-subtitle').forEach(el => {
  el.classList.add('fade-in');
  observer.observe(el);
});

// ─── INIT ─────────────────────────────────────────────────────────────────────

// Set the greeting once DOM is ready
document.addEventListener('DOMContentLoaded', setInitialGreeting);