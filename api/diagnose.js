export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const { context, text, measurements, systemPrompt } = req.body || {};
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    return res.status(500).json({ 
      error: 'مفتاح GEMINI_API_KEY غير موجود في إعدادات Vercel Environment Variables.' 
    });
  }

  // بناء نص الاستفسار حتى لو أُرسل عبر كائن context أو measurements
  let queryText = text || '';
  if (!queryText && context) {
    queryText = `Device: ${JSON.stringify(context)}, Measurements: ${JSON.stringify(measurements || [])}`;
  }

  if (!queryText.trim()) {
    return res.status(400).json({ error: 'نص الفحص أو بيانات الجهاز مطلوبة.' });
  }

  // تعليمات افتراضية تلزم النموذج بالرد بصيغة JSON دائماً حتى لو لم يُرسل systemPrompt
  const DEFAULT_SYSTEM_PROMPT = `You are EvoTech AI, an elite smartphone hardware & firmware engineering workbench assistant.
Analyze technical measurements, diode mode values, boot currents, and device symptoms.
Never hallucinate unverified schematics or fake pinouts.
All technical reasoning in English, final response strictly in valid RFC 8259 JSON in Arabic.`;

  const activeSystemPrompt = (typeof systemPrompt === 'string' && systemPrompt.trim().length > 0)
    ? systemPrompt.trim()
    : DEFAULT_SYSTEM_PROMPT;

  const candidateModels = [
    'gemini-3.5-flash-lite',
    'gemini-3.1-flash-lite',
    'gemini-3.5-flash',
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
          contents: [{ parts: [{ text: queryText }] }],
          system_instruction: { parts: [{ text: activeSystemPrompt }] },
          generationConfig: {
            response_mime_type: 'application/json',
            temperature: 0.2
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

  return res.status(500).json({ error: lastError || 'تعذر الاتصال بجميع خوادم الذكاء الاصطناعي.' });
}
