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