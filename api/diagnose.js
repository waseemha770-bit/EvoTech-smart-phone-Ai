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

  const { context, text, measurements } = body;

  let queryText = (typeof text === 'string' && text.trim().length > 0) ? text.trim() : '';
  if (!queryText && context) {
    queryText = `Device: ${JSON.stringify(context)}, Measurements: ${JSON.stringify(measurements || [])}`;
  }
  if (!queryText) {
    queryText = 'فحص شامل للجهاز وتشخيص العطل المذكور';
  }

  const systemInstruction = `You are EvoTech Pro, an elite Master Level smartphone hardware & firmware engineer.
Analyze the target device and issue.
Output MUST be strictly valid RFC 8259 JSON in Arabic (technical terms in English allowed).
Do not fabricate pinouts or fake links.

Strict JSON Contract:
{
  "brand": "اسم الشركة",
  "model": "اسم الموديل والتسويقي",
  "model_code": "كود الموديل الدقيق SM-A125F etc",
  "chipset": "المعالج بالتفصيل SoC",
  "diagnostic_summary": "ملخص الفحص الهندسي",
  "hardware_diagnosis": {
    "boot_current_analysis": "تحليل سحب الباور سبلاي",
    "diode_readings": "قيم الممانعات المتوقعة بالأفوميتر",
    "power_rails": "مسارات التغذية المتأثرة VBAT / VBUS / VDD",
    "solution_steps": "خطوات الصيانة والمسارات"
  },
  "arabization": {
    "methods": "طريقة التعريب الرسمية والمعدلة (CSC تغيير، تعريب برامج عبر ADB بدون روت، أو فلاشة موجهة)",
    "commands_or_tools": "الأوامر أو الأدوات المطلوبة للتعريب"
  },
  "boot_modes": {
    "download_odin": "طريقة الدخول لوضع داونلود / فاست بوت",
    "recovery": "طريقة الدخول لوضع الريكفري والأزرار المطلوبة",
    "edl_testpoint": "طريقة الدخول لوضع EDL 9008 أو BROM (نقاط التيست بوينت أو كابل الـ EDL)",
    "safe_mode": "طريقة الدخول والخروج من الوضع الآمن Safe Mode",
    "diag_port_code": "أكواد فتح بورت الدياج وتصحيح USB (مثل *#0808#)"
  },
  "network_and_internet": {
    "sim_unlock": "طريقة فك شفرة الشبكة الرسمية ومفاتيح الـ SPC/MSL أو فك الباتش",
    "apn_activation": "طريقة ضبط وتفعيل الإنترنت والـ 4G/3G وإعدادات APN لشركات الاتصال",
    "diag_configuration": "توجيهات ضبط ملفات NV / QCN والشبكة إن لزم"
  },
  "frp_bypass": {
    "recommended_method": "طريقة تخطي حساب جوجل FRP الرسمية المضمونة (ثغرة المتصفح، *#0*#، Test Point، أو تفليش ملف مسح الحماية)",
    "security_warning": "تحذيرات تفادي إتلاف الحماية أو قفل Knox / KG Lock"
  },
  "disassembly_guide": {
    "heat_temp_and_time": "درجة حرارة الهوت إير أو السخان (مثال: 80°C لـ 5 دقائق)",
    "critical_precautions": "محاذير قاتلة يجب الانتباه لها (فلاتة البصمة، كابلات الهوائي، فلاتة الشاشة، نزع البطارية)",
    "step_by_step": "خطوات فك وتركيب الجهاز بالترتيب"
  },
  "tools_and_references": [
    { "name": "اسم الأداة / الموقع المرجعي", "purpose": "الغرض منه", "url": "https://..." }
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
            temperature: 0.15
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
