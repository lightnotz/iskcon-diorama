const systemPrompt = require('./instructions');

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Accept either the new `history` array or old `message` string for compatibility
  const { history, message } = req.body;

  // Build messages: prefer history array; fall back to single message
  let userMessages;
  if (Array.isArray(history) && history.length > 0) {
    // Validate: only allow role/content keys, cap at 20 turns to control cost
    userMessages = history
      .filter(m => m && typeof m.role === 'string' && typeof m.content === 'string')
      .slice(-20)
      .map(m => ({ role: m.role === 'assistant' ? 'assistant' : 'user', content: m.content }));
  } else if (message) {
    userMessages = [{ role: 'user', content: message }];
  } else {
    return res.status(400).json({ error: 'No message provided' });
  }

  if (userMessages.length === 0) {
    return res.status(400).json({ error: 'Empty conversation' });
  }

  try {
    const apiKey = process.env.GROQ_API_KEY;
    const url = 'https://api.groq.com/openai/v1/chat/completions';

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + apiKey
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages: [
          { role: 'system', content: systemPrompt },
          ...userMessages          // full history injected here
        ],
        max_tokens: 200
      })
    });

    const data = await response.json();
    const reply = data?.choices?.[0]?.message?.content || 'Hare Krishna! Please try again 🙏';
    res.status(200).json({ reply });

  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'Failed to connect' });
  }
};