// js/main.js

// ─── NARRATION ────────────────────────────────────────────────────────────────

let isSpeaking = false;
let currentAudio = null;
let utterance    = null;

async function toggleAudio() {
  const btn     = document.querySelector('.audio-btn');
  const storyEl = document.getElementById('story-text');
  if (!btn || !storyEl) return;

  if (isSpeaking) { stopNarration(); return; }

  const storyText = storyEl.innerText.trim();
  btn.innerHTML = '⏳ Loading narration...';
  btn.disabled  = true;

  try {
    const response = await fetch('/api/narrate', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ text: storyText }),
    });

    const contentType = response.headers.get('Content-Type') || '';
    if (contentType.includes('application/json')) {
      const data = await response.json();
      if (data.fallback) { useBrowserTTS(storyText, btn); return; }
    }

    const blob = await response.blob();
    const url  = URL.createObjectURL(blob);
    currentAudio = new Audio(url);
    currentAudio.play();
    isSpeaking       = true;
    btn.innerHTML    = '⏹ Stop Narration';
    btn.disabled     = false;

    currentAudio.onended = () => {
      isSpeaking    = false;
      btn.innerHTML = '🔊 Listen to this Story';
      URL.revokeObjectURL(url);
    };
    currentAudio.onerror = () => {
      isSpeaking    = false;
      btn.innerHTML = '🔊 Listen to this Story';
      btn.disabled  = false;
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
  if (btn) { btn.innerHTML = '🔊 Listen to this Story'; btn.disabled = false; }
}

function useBrowserTTS(text, btn) {
  const voices    = window.speechSynthesis.getVoices();
  const preferred = voices.find(v =>
    v.lang === 'en-IN' || v.lang === 'en-GB' || v.name.includes('Google')
  ) || voices[0];

  utterance         = new SpeechSynthesisUtterance(text);
  utterance.rate    = 0.88;
  utterance.pitch   = 1.0;
  utterance.volume  = 1;
  if (preferred) utterance.voice = preferred;

  window.speechSynthesis.speak(utterance);
  isSpeaking    = true;
  if (btn) { btn.innerHTML = '⏹ Stop Narration'; btn.disabled = false; }

  utterance.onend = () => {
    isSpeaking = false;
    if (btn) btn.innerHTML = '🔊 Listen to this Story';
  };
}

// ─── XSS-SAFE DOM HELPERS ─────────────────────────────────────────────────────

// Creates a message bubble safely — never uses innerHTML for user content
function createMessageEl(text, type) {
  const div = document.createElement('div');
  div.className = `message ${type}`;

  // Bot replies may contain intentional <br> and <strong> from our greeting —
  // allow those only for bot messages; user text is always plain text
  if (type === 'bot-message') {
    div.innerHTML = text; // trusted: comes from our own server
  } else {
    div.textContent = text; // untrusted: comes from the user
  }
  return div;
}

function appendMessage(container, text, type, id) {
  const el = createMessageEl(text, type);
  if (id) el.id = id;
  container.appendChild(el);
  container.scrollTop = container.scrollHeight;
  return el;
}

// ─── CHATBOT ──────────────────────────────────────────────────────────────────

const conversationHistory = [];

const PASTIME_NAMES = {
  kaliya:    'Kaliya Daman',
  govardhan: 'Govardhan Puja',
  butter:    'Butter Thief',
  putana:    'Putana Moksha',
};

const currentPastimeId = (typeof PASTIME_ID !== 'undefined') ? PASTIME_ID : null;

function setInitialGreeting() {
  const messagesEl = document.getElementById('chat-messages');
  if (!messagesEl) return;

  let greeting;
  if (currentPastimeId && PASTIME_NAMES[currentPastimeId]) {
    const name = PASTIME_NAMES[currentPastimeId];
    greeting = `Hare Krishna! 🙏 You are exploring <strong>${name}</strong>.<br><br>I can tell you the full story, its spiritual significance, what the scriptures say, or answer any questions about this pastime. How may I serve you?`;
  } else {
    greeting = `Hare Krishna! 🙏 Welcome to ISKCON Abids.<br><br>I can help with temple timings, upcoming events, Krishna's divine pastimes, or anything about our dioramas. How may I serve you today?`;
  }

  messagesEl.innerHTML = '';
  appendMessage(messagesEl, greeting, 'bot-message');
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
  const input    = document.getElementById('chat-input');
  const messages = document.getElementById('chat-messages');
  if (!input || !messages) return;

  const userText = input.value.trim();
  if (!userText) return;

  // Enforce client-side length limit (mirrors server limit)
  if (userText.length > 1000) {
    appendMessage(messages, 'Please keep your message under 1000 characters 🙏', 'bot-message');
    return;
  }

  // Render user message safely via textContent (XSS-safe)
  appendMessage(messages, userText, 'user-message');
  input.value = '';

  // Push to history
  conversationHistory.push({ role: 'user', content: userText });

  // Typing indicator
  const typingId = 'typing-' + Date.now();
  appendMessage(messages, 'thinking... 🙏', 'bot-message', typingId);

  try {
    const response = await fetch('/api/chat', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        history: conversationHistory,
        context: currentPastimeId,
      }),
    });

    document.getElementById(typingId)?.remove();

    // Handle rate limiting gracefully
    if (response.status === 429) {
      const data = await response.json();
      appendMessage(messages, data.error || 'Too many messages. Please wait a moment 🙏', 'bot-message');
      conversationHistory.pop();
      return;
    }

    if (!response.ok) throw new Error('Server error: ' + response.status);

    const data  = await response.json();
    const reply = data.reply || 'Hare Krishna! Please try again 🙏';

    conversationHistory.push({ role: 'assistant', content: reply });
    appendMessage(messages, reply, 'bot-message');

  } catch (error) {
    document.getElementById(typingId)?.remove();
    appendMessage(messages, 'Sorry, something went wrong. Please try again 🙏', 'bot-message');
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

document.addEventListener('DOMContentLoaded', setInitialGreeting);