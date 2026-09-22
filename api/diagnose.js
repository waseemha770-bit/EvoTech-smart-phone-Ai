export default async function handler(req, res) {
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    return res.status(500).json({ error: 'مفتاح GEMINI_API_KEY غير موجود في إعدادات Vercel.' });
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  let body = req.body;
  if (typeof body === 'string') {
    try { body = JSON.parse(body); } catch (e) { body = {}; }
  }
  body = body || {};

  const { context, text, target_topic } = body;
  let queryText = (typeof text === 'string' && text.trim().length > 0) ? text.trim() : '';
  if (!queryText && context) {
    queryText = `Device: ${JSON.stringify(context)}, Topic: ${target_topic || 'all'}`;
  }

  const systemInstruction = `You are EvoTech Pro, an elite smartphone hardware & firmware engineer.
CRITICAL FOR SPEED: Respond strictly with concise, precise, valid RFC 8259 JSON in Arabic.
Target Topic: "${target_topic || 'all'}".
If target topic is specific (arabization, frp, boot_modes, network, disassembly, hardware), fill ONLY that specific field and set others to null.

JSON Schema:
{
  "brand": "اسم الشركة",
  "model": "الموديل",
  "model_code": "كود الموديل",
  "chipset": "المعالج",
  "requested_topic": "${target_topic || 'all'}",
  "diagnostic_summary": "ملخص فني مباشر وسريع",
  "hardware_diagnosis": null or {
    "boot_current_analysis": "تحليل سحب الباور",
    "diode_readings": "قيم الممانعات",
    "solution_steps": "خطوات الصيانة والمسارات"
  },
  "arabization": null or {
    "methods": "طريقة التعريب",
    "commands_or_tools": "الأداة أو الأمر"
  },
  "boot_modes": null or {
    "download_odin": "وضع الداونلود",
    "recovery": "وضع الريكفري",
    "edl_testpoint": "نقاط التيست بوينت",
    "diag_port_code": "كود الدياج"
  },
  "network_and_internet": null or {
    "sim_unlock": "فك الشفرة",
    "apn_activation": "ضبط الـ APN"
  },
  "frp_bypass": null or {
    "recommended_method": "طريقة تخطي FRP",
    "security_warning": "تحذير الحماية"
  },
  "disassembly_guide": null or {
    "heat_temp_and_time": "الحرارة والمدة",
    "critical_precautions": "محاذير قطع الفلاتات",
    "step_by_step": "خطوات الفك"
  }
}`;

  // تم تقديم النماذج الأسرع ذات زمن الاستجابة الأدنى
  const candidateModels = [
    'gemini-2.5-flash-lite',
    'gemini-flash-lite-latest',
    'gemini-2.5-flash',
    'gemini-3.1-flash-lite'
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
          system_instruction: { parts: [{ text: systemInstruction }] },
          generationConfig: {
            response_mime_type: 'application/json',
            temperature: 0.1
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

  return res.status(500).json({ error: lastError || 'تعذر الاتصال بالخادم السريع.' });
}
