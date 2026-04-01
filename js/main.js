// ─── STATE ────────────────────────────────────────────────────────────────────

let isSpeaking   = false;
let currentAudio = null;
let utterance    = null;

// NOTE: currentLang lives in translate.js — read it via getCurrentLang().
// Do NOT declare it here; a duplicate declaration would shadow translate.js's
// copy and language switching would stop working.

// ─── NARRATION ────────────────────────────────────────────────────────────────

function toggleAudio() {
  const btn     = document.querySelector('.audio-btn');
  const storyEl = document.getElementById('story-text');
  if (!btn || !storyEl) return;

  if (isSpeaking) {
    stopNarration();
    return;
  }

  const pastimeId = (typeof PASTIME_ID !== 'undefined') ? PASTIME_ID : null;
  // Use translate.js's getter so we always have the currently selected language
  const lang = (typeof getCurrentLang === 'function') ? getCurrentLang() : 'en';

  // If we have a PASTIME_ID, try to play the pre-recorded MP3 first
  if (pastimeId) {
    const audioPath = `/audio/${pastimeId}-${lang}.mp3`;

    btn.innerHTML = '⏳ Loading...';
    btn.disabled  = true;

    currentAudio = new Audio(audioPath);

    currentAudio.play()
      .then(() => {
        isSpeaking    = true;
        btn.innerHTML = '⏹ Stop Narration';
        btn.disabled  = false;
      })
      .catch(() => {
        // MP3 not found or can't play — fall back to browser TTS
        currentAudio = null;
        useBrowserTTS(storyEl.innerText.trim(), btn);
      });

    currentAudio.onended = () => {
      isSpeaking    = false;
      currentAudio  = null;
      btn.innerHTML = '🔊 Listen to this Story';
    };

  } else {
    // No PASTIME_ID (e.g. index page) — use browser TTS directly
    useBrowserTTS(storyEl.innerText.trim(), btn);
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
    btn.disabled  = false;
  }
}

function useBrowserTTS(text, btn) {
  const voices    = window.speechSynthesis.getVoices();
  const preferred = voices.find(v =>
    v.lang === 'en-IN' || v.lang === 'en-GB' || v.name.includes('Google')
  ) || voices[0];

  utterance        = new SpeechSynthesisUtterance(text);
  utterance.rate   = 0.88;
  utterance.pitch  = 1.0;
  utterance.volume = 1;
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

function createMessageEl(text, type) {
  const div = document.createElement('div');
  div.className = `message ${type}`;

  if (type === 'bot-message') {
    div.innerHTML = text; // trusted: comes from our own server
  } else {
    div.textContent = text; // untrusted: user input — never use innerHTML here
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

const conversationHistory = []; // keeps full back-and-forth for continuity

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

  // Client-side length guard (mirrors any server-side limit)
  if (userText.length > 1000) {
    appendMessage(messages, 'Please keep your message under 1000 characters 🙏', 'bot-message');
    return;
  }

  appendMessage(messages, userText, 'user-message'); // XSS-safe via textContent
  input.value = '';

  conversationHistory.push({ role: 'user', content: userText });

  const typingId = 'typing-' + Date.now();
  appendMessage(messages, 'thinking... 🙏', 'bot-message', typingId);

  try {
    const response = await fetch('/api/chat', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        history: conversationHistory,  // full history for continuity
        context: currentPastimeId,     // tells the bot which pastime page we're on
      }),
    });

    document.getElementById(typingId)?.remove();

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
    conversationHistory.pop(); // remove failed message from history
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