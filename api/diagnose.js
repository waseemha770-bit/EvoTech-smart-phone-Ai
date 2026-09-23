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

  const systemInstruction = `You are EvoTech Pro, an elite Master Level smartphone hardware & firmware engineer.
You specialize in:
1. Samsung CSC regional conversions, Binary / SW REV protection.
2. LG smartphones (CDMA/GSM, Sprint/Verizon/T-Mobile US variants widely used in Yemen, KDZ/TOT flashing with LGUP Dual Mode, Hidden Menus, APN & VoLTE provisioning).
3. Chinese smartphones:
   - Transsion (Infinix, Tecno, Itel) with MTK Helio / Unisoc (Spreadtrum) PAC files & ResearchDownload / SP Flash Tool.
   - Oppo / Realme / OnePlus (OFP/OPS, Auth Bypass, MSM Download Tool).
   - Vivo / iQOO (Qualcomm EDL 9008 Test Points, Fastboot).
   - Huawei / Honor (Kirin Test points, USB COM 1.0, Board Firmware, HarmonyOS downgrades).
   - Xiaomi / Redmi / POCO (Anti-Rollback ARB index, MIUI / HyperOS regional ROMs, BROM bypass).

Strict JSON Contract (RFC 8259 in Arabic):
{
  "brand": "اسم الشركة (Samsung, LG, Infinix, Tecno, Xiaomi, etc.)",
  "model": "اسم الموديل",
  "model_code": "كود الموديل الدقيق",
  "chipset": "المعالج بالتفصيل (MTK, Qualcomm Snapdragon, Unisoc/SPD, Exynos, Kirin)",
  "requested_topic": "${target_topic || 'all'}",
  "diagnostic_summary": "ملخص فني رسمي ومباشر",
  "firmware_guide": {
    "target_variant": "اسم ونوع الفلاشة المعتمدة (KDZ, PAC, Scatter, AP/4-Files, OFP)",
    "recommended_csc_region": "كود التوجيه الموصى به (XAA, KSA, Global, ID Call-Recording)",
    "binary_requirement": "تحليل باينري الحماية وشرط عدم تخفيضه (Binary / ARB)",
    "flashing_method_and_tool": "الأداة الرسمية وطريقة التفليش (LGUP, Odin, SP Flash Tool, ResearchDownload)",
    "csc_choice_rule": "تعليمات الفورمات وحفظ البيانات",
    "direct_download_urls": [
      { "portal": "SamFW / LG-Firmwares / HalabTech", "url": "https://..." }
    ]
  },
  "arabization": null or { "methods": "طريقة التعريب", "commands_or_tools": "الأدوات" },
  "boot_modes": null or { "download_odin": "طريقة وضع الداونلود / فاست بوت", "recovery": "الريكفري", "edl_testpoint": "التيست بوينت / BROM", "diag_port_code": "كود الدياج" },
  "network_and_internet": null or { "sim_unlock": "فك الشفرة", "apn_activation": "ضبط APN و VoLTE يمن موبايل / سبأفون" },
  "frp_bypass": null or { "recommended_method": "طريقة تخطي FRP", "security_warning": "تحذيرات تفادي القفل" },
  "disassembly_guide": null or { "heat_temp_and_time": "الحرارة والمدة", "critical_precautions": "محاذير الفلاتات", "step_by_step": "خطوات الفك" },
  "hardware_diagnosis": null or { "boot_current_analysis": "تحليل سحب الباور", "diode_readings": "ممانعات القياس", "solution_steps": "خطوات الصيانة" }
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
