const systemPrompt = require('./instructions');
const { PASTIME_REGISTRY_MAP } = require('../js/pastime-registry');

// ─── RATE LIMITER ─────────────────────────────────────────────────────────────
const rateLimitStore = new Map();
const WINDOW_MS    = 60 * 1000;
const MAX_REQUESTS = 15;

function isRateLimited(ip) {
  const now  = Date.now();
  const data = rateLimitStore.get(ip) || { count: 0, windowStart: now };

  if (now - data.windowStart > WINDOW_MS) {
    data.count       = 0;
    data.windowStart = now;
  }

  data.count += 1;
  rateLimitStore.set(ip, data);

  if (rateLimitStore.size > 500) {
    for (const [key, val] of rateLimitStore) {
      if (now - val.windowStart > 5 * 60 * 1000) rateLimitStore.delete(key);
    }
  }

  return data.count > MAX_REQUESTS;
}

// ─── ALLOWED ORIGINS ──────────────────────────────────────────────────────────
const ALLOWED_ORIGINS = [
  'https://iskcon-diorama.vercel.app',
  'http://localhost:3000',
  'http://127.0.0.1:3000',
  'http://localhost:5500',
  'http://127.0.0.1:5500',
];

function setCORSHeaders(req, res) {
  const origin = req.headers.origin || '';
  if (ALLOWED_ORIGINS.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  }
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
}

// ─── HANDLER ──────────────────────────────────────────────────────────────────
module.exports = async function handler(req, res) {
  setCORSHeaders(req, res);

  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST')   return res.status(405).json({ error: 'Method not allowed' });

  const contentLength = parseInt(req.headers['content-length'] || '0', 10);
  if (contentLength > 50 * 1024) {
    return res.status(413).json({ error: 'Request too large' });
  }

  const ip =
    req.headers['x-forwarded-for']?.split(',')[0].trim() ||
    req.socket?.remoteAddress ||
    'unknown';

  if (isRateLimited(ip)) {
    return res.status(429).json({
      error: 'Too many requests. Please wait a moment and try again 🙏',
    });
  }

  const { history, message, context } = req.body || {};

  let userMessages;

  if (Array.isArray(history) && history.length > 0) {
    userMessages = history
      .filter(m => m && typeof m.role === 'string' && typeof m.content === 'string')
      .slice(-20)
      .map(m => ({
        role:    m.role === 'assistant' ? 'assistant' : 'user',
        content: String(m.content).replace(/<[^>]*>/g, '').slice(0, 1000),
      }));
  } else if (typeof message === 'string' && message.trim()) {
    userMessages = [{
      role:    'user',
      content: message.replace(/<[^>]*>/g, '').trim().slice(0, 1000),
    }];
  } else {
    return res.status(400).json({ error: 'No message provided' });
  }

  if (userMessages.length === 0) {
    return res.status(400).json({ error: 'No message provided' });
  }

  // ── Context note — pulled from registry, never from user input ───────────
  // PASTIME_REGISTRY_MAP is keyed by id (e.g. 'kaliya', 'vasudeva').
  // Adding a new pastime to the registry automatically makes it valid here.
  const pastimeEntry = context && PASTIME_REGISTRY_MAP[context];

  const contextNote = pastimeEntry
    ? `\n\nThe visitor is currently viewing the diorama page for: ${pastimeEntry.chatCtx}. If they ask about "this page", "this story", "explain this", or anything related to this pastime, answer with full devotional detail — the story, characters, spiritual significance, and relevant scriptural references. Do not wait for them to specify the topic.`
    : `\n\nThe visitor is on the home page, browsing all the dioramas. They may ask about temple information, timings, events, or Krishna's pastimes in general.`;

  const finalSystemPrompt = systemPrompt + contextNote;

  try {
    const apiKey = process.env.GROQ_API_KEY;

    if (!apiKey) {
      console.error('GROQ_API_KEY is not set');
      return res.status(500).json({ error: 'Something went wrong. Please try again 🙏' });
    }

    const groqRes = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method:  'POST',
      headers: {
        'Content-Type':  'application/json',
        'Authorization': 'Bearer ' + apiKey,
      },
      body: JSON.stringify({
        model:       'llama-3.3-70b-versatile',
        messages:    [{ role: 'system', content: finalSystemPrompt }, ...userMessages],
        max_tokens:  300,
        temperature: 0.7,
      }),
    });

    if (!groqRes.ok) {
      console.error('Groq error:', groqRes.status, await groqRes.text());
      return res.status(500).json({ error: 'Something went wrong. Please try again 🙏' });
    }

    const data  = await groqRes.json();
    const reply = data?.choices?.[0]?.message?.content?.trim()
      || 'Hare Krishna! Please try again 🙏';

    return res.status(200).json({ reply });

  } catch (err) {
    console.error('Handler error:', err);
    return res.status(500).json({ error: 'Something went wrong. Please try again 🙏' });
  }
};