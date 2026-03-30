const systemPrompt = require('./instructions');

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { message } = req.body;

  if (!message) {
    return res.status(400).json({ error: 'No message provided' });
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
          { role: 'user', content: message }
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