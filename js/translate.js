// js/translate.js
// Language switching using hand-crafted devotional translations from pastime-data.js

const LANGUAGES = {
  en: 'English',
  hi: 'हिन्दी',
  te: 'తెలుగు',
  ta: 'தமிழ்',
  bn: 'বাংলা',
};

let currentLang = 'en';

document.addEventListener('DOMContentLoaded', () => {
  const saved = localStorage.getItem('iskcon-lang') || 'en';
  if (saved !== 'en') {
    const pill = document.querySelector(`.lang-pill[data-lang="${saved}"]`);
    setLanguage(saved, pill);
  }
});

function setLanguage(lang, pillEl) {
  if (lang === currentLang) return;

  const data = getPastimeData(lang);
  if (!data) {
    setStatus('Translation coming soon 🙏');
    setTimeout(() => setStatus(''), 2500);
    return;
  }

  document.querySelectorAll('.lang-pill').forEach(p => p.classList.remove('active'));
  if (pillEl) pillEl.classList.add('active');

  if (typeof stopNarration === 'function') stopNarration();

  document.documentElement.lang = lang;
  currentLang = lang;
  localStorage.setItem('iskcon-lang', lang);

  applyTranslation(data);
  setStatus(`Showing in ${LANGUAGES[lang]}`);
  setTimeout(() => setStatus(''), 2500);
}

function applyTranslation(data) {
  setText('[data-translate="title"]',         data.title);
  setText('[data-translate="subtitle"]',      data.subtitle);
  setText('[data-translate="story-heading"]', data.storyHeading);
  setText('[data-translate="number"]',        data.number);
  data.paragraphs.forEach((text, i) => {
    setText(`[data-translate="p${i + 1}"]`, text);
  });
  document.title = `${data.title} - ISKCON Dioramas`;
}

function setText(selector, text) {
  const el = document.querySelector(selector);
  if (el && text) el.innerText = text;
}

function getPastimeData(lang) {
  if (typeof PASTIME_DATA === 'undefined') return null;
  if (typeof PASTIME_ID === 'undefined') return null;
  return PASTIME_DATA[PASTIME_ID]?.[lang] || null;
}

function setStatus(msg) {
  const el = document.getElementById('lang-status');
  if (el) el.textContent = msg;
}

function getCurrentLang() { return currentLang; }

function getAudioPath() {
  if (typeof PASTIME_ID === 'undefined') return null;
  return `audio/${PASTIME_ID}-${currentLang}.mp3`;
}