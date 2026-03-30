module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { message } = req.body;

  if (!message) {
    return res.status(400).json({ error: 'No message provided' });
  }

  try {
    const apiKey = process.env.GEMINI_API_KEY;
    const url = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=' + apiKey;

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        system_instruction: {
          parts: [{ text: 'You are a knowledgeable and devotional guide at an ISKCON temple. You answer questions about Krishna pastimes, Bhagavad Gita, Srimad Bhagavatam, and ISKCON philosophy. Keep answers warm, respectful and concise. Always end with Hare Krishna 🙏' }]
        },
        contents: [{ parts: [{ text: message }] }]
      })
    });

    const data = await response.json();
    const reply = data?.candidates?.[0]?.content?.parts?.[0]?.text || 'Hare Krishna! Please try again 🙏';
    res.status(200).json({ reply });

  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'Failed to connect' });
  }
};