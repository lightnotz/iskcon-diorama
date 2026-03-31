const systemPrompt = require('./instructions');

// ─── RATE LIMITER ─────────────────────────────────────────────────────────────
// In-memory store — resets when the function cold-starts, which is fine for
// hobby use. Gives each IP a sliding window of MAX_REQUESTS per WINDOW_MS.
const rateLimitStore = new Map();
const WINDOW_MS    = 60 * 1000; // 1 minute window
const MAX_REQUESTS = 15;        // max 15 messages per IP per minute

function isRateLimited(ip) {
  const now  = Date.now();
  const data = rateLimitStore.get(ip) || { count: 0, windowStart: now };

  // Reset window if it has expired
  if (now - data.windowStart > WINDOW_MS) {
    data.count       = 0;
    data.windowStart = now;
  }

  data.count += 1;
  rateLimitStore.set(ip, data);

  // Prune IPs older than 5 minutes to prevent memory bloat
  if (rateLimitStore.size > 500) {
    for (const [key, val] of rateLimitStore) {
      if (now - val.windowStart > 5 * 60 * 1000) rateLimitStore.delete(key);
    }
  }

  return data.count > MAX_REQUESTS;
}

// ─── ALLOWED ORIGINS ─────────────────────────────────────────────────────────
// Add your Vercel production URL here. localhost is allowed for local dev.
const ALLOWED_ORIGINS = [
  'https://iskcon-diorama.vercel.app', // ← your production domain
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

// ─── PASTIME WHITELIST ───────────────────────────────────────────────────────
const PASTIME_NAMES = {
  kaliya:    'Kaliya Daman — Krishna subduing the serpent Kaliya in the Yamuna river',
  govardhan: 'Govardhan Puja — Krishna lifting Govardhan hill to protect the villagers',
  butter:    'Butter Thief — Young Krishna stealing butter from the Gopis of Vrindavan',
  putana:    'Putana Moksha — Krishna liberating the demoness Putana through his divine touch',
};

// ─── HANDLER ─────────────────────────────────────────────────────────────────
module.exports = async function handler(req, res) {
  setCORSHeaders(req, res);

  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // ── Body size guard (reject anything over 50 KB) ──
  const contentLength = parseInt(req.headers['content-length'] || '0', 10);
  if (contentLength > 50 * 1024) {
    return res.status(413).json({ error: 'Request too large' });
  }

  // ── Rate limiting ──
  const ip =
    req.headers['x-forwarded-for']?.split(',')[0].trim() ||
    req.socket?.remoteAddress ||
    'unknown';

  if (isRateLimited(ip)) {
    return res.status(429).json({
      error: 'Too many requests. Please wait a moment and try again 🙏',
    });
  }

  // ── Parse and validate body ──
  const { history, message, context } = req.body || {};

  let userMessages;

  if (Array.isArray(history) && history.length > 0) {
    userMessages = history
      .filter(m => m && typeof m.role === 'string' && typeof m.content === 'string')
      .slice(-20)
      .map(m => ({
        role: m.role === 'assistant' ? 'assistant' : 'user',
        // Strip HTML tags and cap length to prevent prompt injection
        content: String(m.content)
          .replace(/<[^>]*>/g, '')
          .slice(0, 1000),
      }));
  } else if (typeof message === 'string' && message.trim()) {
    userMessages = [{
      role: 'user',
      content: message.replace(/<[^>]*>/g, '').trim().slice(0, 1000),
    }];
  } else {
    return res.status(400).json({ error: 'No message provided' });
  }

  if (userMessages.length === 0) {
    return res.status(400).json({ error: 'No message provided' });
  }

  // ── Build context note (only from whitelist — no user input injected) ──
  const contextNote = context && PASTIME_NAMES[context]
    ? `\n\nThe visitor is currently viewing the diorama page for: ${PASTIME_NAMES[context]}. If they ask about "this page", "this story", "explain this", or anything related to this pastime, answer with full devotional detail — the story, characters, spiritual significance, and relevant scriptural references. Do not wait for them to specify the topic.`
    : `\n\nThe visitor is on the home page, browsing all the dioramas. They may ask about temple information, timings, events, or Krishna's pastimes in general.`;

  const finalSystemPrompt = systemPrompt + contextNote;

  // ── Call Groq ──
  try {
    const apiKey = process.env.GROQ_API_KEY;

    if (!apiKey) {
      console.error('GROQ_API_KEY is not set');
      return res.status(500).json({ error: 'Something went wrong. Please try again 🙏' });
    }

    const groqRes = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + apiKey,
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages: [
          { role: 'system', content: finalSystemPrompt },
          ...userMessages,
        ],
        max_tokens: 300,
        temperature: 0.7,
      }),
    });

    if (!groqRes.ok) {
      // Log internally but never expose upstream details to the client
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