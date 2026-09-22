export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  let body = req.body;
  if (typeof body === 'string') {
    try { body = JSON.parse(body); } catch (e) { body = {}; }
  }
  body = body || {};

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ 
      error: 'مفتاح GEMINI_API_KEY غير موجود في إعدادات Vercel Environment Variables.' 
    });
  }

  const { context, text, measurements, systemPrompt } = body;

  let queryText = (typeof text === 'string' && text.trim().length > 0) ? text.trim() : '';
  if (!queryText && context) {
    queryText = `Device: ${JSON.stringify(context)}, Measurements: ${JSON.stringify(measurements || [])}`;
  }
  if (!queryText) {
    queryText = 'فحص شامل للجهاز وتشخيص العطل المذكور';
  }

  const defaultPrompt = 'You are EvoTech AI, an elite smartphone hardware & firmware engineering workbench assistant. Respond strictly in valid RFC 8259 JSON in Arabic.';
  const activePrompt = (typeof systemPrompt === 'string' && systemPrompt.trim().length > 0)
    ? systemPrompt.trim()
    : defaultPrompt;

  // تنويع أجيال النماذج لتفادي مراكز البيانات المزدحمة في نفس اللحظة
  const candidateModels = [
    'gemini-2.5-flash',
    'gemini-2.0-flash',
    'gemini-1.5-flash',
    'gemini-3.5-flash'
  ];

  const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
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
          system_instruction: {
            parts: [{ text: activePrompt }]
          },
          generationConfig: {
            response_mime_type: 'application/json',
            temperature: 0.2
          }
        })
      });

      const data = await response.json();

      if (!response.ok) {
        lastError = data.error?.message || `HTTP ${response.status}`;
        console.warn(`[Model ${model}]:`, lastError);
        // تأخير ثانية ونصف قبل تجربة السيرفر التالي لتفريغ الضغط
        await sleep(1500);
        continue;
      }

      return res.status(200).json(data);
    } catch (err) {
      lastError = err.message;
      await sleep(1000);
    }
  }

  return res.status(500).json({ error: lastError || 'تعذر الاتصال بجميع خوادم الذكاء الاصطناعي حالياً.' });
}
