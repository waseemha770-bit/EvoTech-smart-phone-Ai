export default async function handler(req, res) {
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    return res.status(500).json({ 
      error: 'مفتاح GEMINI_API_KEY غير موجود في إعدادات Vercel Environment Variables.' 
    });
  }

  if (req.method === 'GET') {
    try {
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`);
      const data = await response.json();
      return res.status(response.status).json(data);
    } catch (e) {
      return res.status(500).json({ error: e.message });
    }
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
    queryText = `Device: ${JSON.stringify(context)}, Target Topic: ${target_topic || 'all'}`;
  }

  const systemInstruction = `You are EvoTech Pro, an elite smartphone hardware & firmware engineer.
CRITICAL INSTRUCTION:
- Analyze what the user is specifically searching for: "${target_topic || 'general'}".
- If the user searches for a specific topic (e.g. ONLY Arabization, ONLY FRP, ONLY Boot Modes, ONLY Network Unlock, ONLY Disassembly, or a specific Hardware Fault like Charging/Power), populate ONLY that specific section with deep, exhaustive technical details and leave all other unrelated sections as null.
- Only populate all sections if the user specifically requested a full/comprehensive report ("all").
- Output MUST be strictly valid RFC 8259 JSON in Arabic.

JSON Schema:
{
  "brand": "اسم الشركة",
  "model": "اسم الموديل",
  "model_code": "كود الموديل الدقيق",
  "chipset": "المعالج بالتفصيل",
  "requested_topic": "${target_topic || 'all'}",
  "diagnostic_summary": "ملخص فني مباشر لما تم البحث عنه حصراً",
  "hardware_diagnosis": null or {
    "boot_current_analysis": "تحليل سحب الباور سبلاي للعطل المطلوب",
    "diode_readings": "قيم الممانعات المتوقعة",
    "power_rails": "المسارات المتأثرة",
    "solution_steps": "خطوات الصيانة والمسارات"
  },
  "arabization": null or {
    "methods": "طريقة التعريب المعتمدة",
    "commands_or_tools": "الأوامر أو الأدوات المطلوبة"
  },
  "boot_modes": null or {
    "download_odin": "وضع الداونلود / فاست بوت",
    "recovery": "وضع الريكفري",
    "edl_testpoint": "نقاط التيست بوينت أو EDL 9008",
    "safe_mode": "الوضع الآمن",
    "diag_port_code": "أكواد فتح بورت الدياج"
  },
  "network_and_internet": null or {
    "sim_unlock": "فك الشفرة",
    "apn_activation": "ضبط الإنترنت و APN",
    "diag_configuration": "توجيهات ضبط ملفات الشبكة"
  },
  "frp_bypass": null or {
    "recommended_method": "طريقة التخطي المضمونة",
    "security_warning": "تحذيرات تفادي إتلاف الحماية"
  },
  "disassembly_guide": null or {
    "heat_temp_and_time": "حرارة السخان والمدة",
    "critical_precautions": "المحاذير الخطيرة لتفادي كسر الشاشة أو قطع الفلاتات",
    "step_by_step": "خطوات الفك والتركيب"
  },
  "tools_and_references": null or [
    { "name": "اسم الأداة أو المرجع", "purpose": "الغرض منه", "url": "https://..." }
  ]
}`;

  const candidateModels = [
    'gemini-2.5-flash-lite',
    'gemini-flash-lite-latest',
    'gemini-2.5-flash',
    'gemini-3.1-flash-lite',
    'gemini-flash-latest'
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

  return res.status(500).json({ error: lastError || 'تعذر الاتصال بخوادم الذكاء الاصطناعي.' });
}
