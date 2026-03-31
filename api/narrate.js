// api/narrate.js
// Vercel serverless function — proxies ElevenLabs TTS so the API key stays server-side

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { text, lang = 'en' } = req.body;

  if (!text) {
    return res.status(400).json({ error: 'No text provided' });
  }

  // Sanitise — strip HTML tags and limit length to protect API quota
  const clean = text.replace(/<[^>]*>/g, '').trim().slice(0, 3000);

  const apiKey = process.env.ELEVENLABS_API_KEY;

  // If no ElevenLabs key is set, tell the client to fall back to browser TTS
  if (!apiKey) {
    return res.status(200).json({ fallback: true });
  }

  // ElevenLabs voice IDs — warm, calm voices
  // "Rachel" (en) is soft and clear; swap voice_id for other languages as needed
  const VOICE_ID = process.env.ELEVENLABS_VOICE_ID || 'Rachel';

  try {
    const elResponse = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${VOICE_ID}`,
      {
        method: 'POST',
        headers: {
          'xi-api-key': apiKey,
          'Content-Type': 'application/json',
          Accept: 'audio/mpeg',
        },
        body: JSON.stringify({
          text: clean,
          model_id: 'eleven_multilingual_v2',  // supports Hindi, Telugu, Tamil etc.
          voice_settings: {
            stability: 0.55,        // slight variation = more natural
            similarity_boost: 0.80,
            style: 0.25,            // gentle expressiveness
            use_speaker_boost: true,
          },
        }),
      }
    );

    if (!elResponse.ok) {
      const err = await elResponse.text();
      console.error('ElevenLabs error:', err);
      // Graceful fallback — client will use browser TTS
      return res.status(200).json({ fallback: true });
    }

    // Stream audio bytes back to client
    const audioBuffer = await elResponse.arrayBuffer();
    res.setHeader('Content-Type', 'audio/mpeg');
    res.setHeader('Cache-Control', 'public, max-age=3600'); // cache same text for 1hr
    return res.send(Buffer.from(audioBuffer));

  } catch (error) {
    console.error('Narration error:', error);
    return res.status(200).json({ fallback: true });
  }
};