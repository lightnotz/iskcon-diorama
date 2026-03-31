// js/main.js

// ─── NARRATION ────────────────────────────────────────────────────────────────

let isSpeaking = false;
let currentAudio = null;   // ElevenLabs Audio object
let utterance = null;      // Browser TTS fallback

async function toggleAudio() {
  const btn = document.querySelector('.audio-btn');
  const storyEl = document.getElementById('story-text');
  if (!btn || !storyEl) return;

  // ── Stop if already speaking ──
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

    // Check if server said to fallback (no API key set)
    const contentType = response.headers.get('Content-Type') || '';

    if (contentType.includes('application/json')) {
      const data = await response.json();
      if (data.fallback) {
        useBrowserTTS(storyText, btn);
        return;
      }
    }

    // ── ElevenLabs audio blob ──
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

// ── Browser TTS fallback (used when no ElevenLabs key, or on error) ──
function useBrowserTTS(text, btn) {
  // Pick the best available voice for en-IN
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

  messages.innerHTML += `<div class="message user-message">${userText}</div>`;
  input.value = '';
  messages.scrollTop = messages.scrollHeight;

  messages.innerHTML += `<div class="message bot-message" id="typing">thinking... 🙏</div>`;
  messages.scrollTop = messages.scrollHeight;

  try {
    const response = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: userText }),
    });

    if (!response.ok) throw new Error('Server error: ' + response.status);

    const data = await response.json();
    document.getElementById('typing').remove();
    const reply = data.reply || 'Hare Krishna! Please try again 🙏';
    messages.innerHTML += `<div class="message bot-message">${reply}</div>`;
    messages.scrollTop = messages.scrollHeight;

  } catch (error) {
    document.getElementById('typing').remove();
    messages.innerHTML += `<div class="message bot-message">Sorry, something went wrong 🙏</div>`;
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