export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const { text, systemPrompt } = req.body;
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    return res.status(500).json({ 
      error: 'مفتاح GEMINI_API_KEY غير موجود في إعدادات Vercel Environment Variables.' 
    });
  }

  if (!text) {
    return res.status(400).json({ error: 'نص الفحص مطلوب.' });
  }

  const candidateModels = [
    'gemini-2.0-flash',
    'gemini-2.0-flash-lite',
    'gemini-flash-latest',
    'gemini-3.6-flash'
  ];

  let lastError = null;

  for (const model of candidateModels) {
    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-goog-api-key': apiKey
        },
        body: JSON.stringify({
          contents: [{ parts: [{ text }] }],
          system_instruction: { parts: [{ text: systemPrompt }] },
          generationConfig: {
            response_mime_type: 'application/json'
          }
        })
      });

      const data = await response.json();

      if (!response.ok) {
        lastError = data.error?.message || `HTTP ${response.status}`;
        continue;
      }

      return res.status(200).json(data);
    } catch (err) {
      lastError = err.message;
    }
  }

  return res.status(500).json({ error: lastError || 'تعذر الاتصال بخوادم الذكاء الاصطناعي.' });
}
