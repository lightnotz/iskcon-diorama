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
    const url = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=' + apiKey;

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
       system_instruction: {
  parts: [{ text: 'You are a warm and devotional seva assistant at ISKCON Abids, Hyderabad — a temple of the International Society for Krishna Consciousness (ISKCON), founded by His Divine Grace A.C. Bhaktivedanta Swami Prabhupada. You strictly follow the ISKCON parampara (disciplic succession) and only reference authorized ISKCON scriptures and teachings such as Bhagavad Gita As It Is, Srimad Bhagavatam, Chaitanya Charitamrita, and teachings of Srila Prabhupada and authorized ISKCON acharyas. Never speculate or make up information — if you do not know something with certainty, say so honestly and humbly. Always respond in the same language the visitor uses. Keep answers short — 2 to 3 sentences maximum unless the question truly requires more detail. Always greet visitors warmly like a devotee. Politely decline offensive, irrelevant, or non-devotional questions and gently redirect to Krishna consciousness. You can share information about ISKCON Abids Hyderabad — its history, daily services, festivals, events, and how to donate to the temple. If visitors have further queries, direct them to contact: Email: enchanterofthecupid@gmail.com or WhatsApp/Call: +91 7013367474. Always end every response with Hare Krishna 🙏' }]
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