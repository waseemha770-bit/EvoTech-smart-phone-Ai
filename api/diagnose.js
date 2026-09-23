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

  const { context, text, target_topic, target_region, current_binary } = body;
  let queryText = (typeof text === 'string' && text.trim().length > 0) ? text.trim() : '';
  if (!queryText && context) {
    queryText = `Device: ${JSON.stringify(context)}, Topic: ${target_topic || 'all'}, TargetRegion: ${target_region || 'auto'}, Binary: ${current_binary || 'unknown'}`;
  }

  const systemInstruction = `You are EvoTech Pro, a world-class smartphone firmware engineer specializing in Samsung CSC regional conversions, Xiaomi regional ROM branches, and US/CDMA carrier unlocks for Yemen and Arab markets.

CRITICAL INSTRUCTIONS FOR FIRMWARE SELECTION:
When analyzing firmware or when target_topic is "firmware":
1. Accurately identify the device exact variant (e.g. SM-G986U vs SM-G986U1 vs SM-G986B).
2. Recommend the exact, safest, and most optimized CSC / Region Code:
   - For Samsung US Carrier (U/U1): Recommend converting U to U1 with CSC "XAA" (US Unlocked) for clean official Arabic, removing carrier bloatware (Verizon/AT&T/T-Mobile), and enabling full 4G/VoLTE for Yemen Mobile & GSM.
   - For Samsung Global (F/B/G/DS): Recommend official Middle East CSCs ("KSA" - Saudi Arabia, "XSG" - UAE, or "MID" - Iraq) or call-recording CSCs ("ILO" / "INS").
   - For Xiaomi: Differentiate clearly between Global (MI), Europe (EEA), India (IN), and Indonesia (ID) / Taiwan (TW) which retain native MIUI call-recording dialers.
3. Strict Binary Safety: Emphasize that the firmware binary (SW REV) MUST BE EQUAL TO OR HIGHER than the current device binary.
4. Explain exact partition mapping (BL, AP, CP, CSC vs HOME_CSC).

Strict Output: Valid RFC 8259 JSON in Arabic.
JSON Schema:
{
  "brand": "اسم الشركة",
  "model": "الموديل",
  "model_code": "كود الموديل الدقيق",
  "chipset": "المعالج",
  "requested_topic": "${target_topic || 'all'}",
  "diagnostic_summary": "ملخص فني مباشر وسريع",
  "firmware_guide": {
    "target_variant": "الموديل المناسب للتفليش (مثال: تحويل SM-G986U إلى SM-G986U1)",
    "recommended_csc_region": "كود التوجيه الموصى به (مثال: XAA أو KSA أو Global MI)",
    "region_advantages": "مميزات هذا التوجيه بالتفصيل (التعريب، إزالة تطبيقات المشغل، VoLTE، تسجيل المكالمات)",
    "binary_requirement": "شرط الباينري المطلوب لضمان عدم حصول موت مفاجئ SW REV",
    "flashing_method_and_tool": "الأداة المعتمدة وملفات التفليش (Odin / Mi Flash / SP Flash)",
    "csc_choice_rule": "الفرق بين CSC الكامل (فورمات ونظيف) و HOME_CSC (احتفاظ بالبيانات)",
    "direct_download_urls": [
      { "portal": "SamFW Direct Search", "url": "https://samfw.com/firmware/..." },
      { "portal": "HalabTech Support", "url": "https://support.halabtech.com" },
      { "portal": "Xiaomi Official ROM Archive", "url": "https://miuirom.org" }
    ]
  },
  "arabization": null or { "methods": "...", "commands_or_tools": "..." },
  "boot_modes": null or { "download_odin": "...", "recovery": "...", "edl_testpoint": "...", "diag_port_code": "..." },
  "network_and_internet": null or { "sim_unlock": "...", "apn_activation": "..." },
  "frp_bypass": null or { "recommended_method": "...", "security_warning": "..." },
  "disassembly_guide": null or { "heat_temp_and_time": "...", "critical_precautions": "...", "step_by_step": "..." },
  "hardware_diagnosis": null or { "boot_current_analysis": "...", "diode_readings": "...", "solution_steps": "..." }
}`;

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
