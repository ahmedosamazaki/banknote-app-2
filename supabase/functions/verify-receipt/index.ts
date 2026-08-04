import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface ExtractedReceipt {
  amount: string | null;
  referenceNumber: string | null;
  bankName: string | null;
  date: string | null;
  transferType: "instapay" | "vodafone_cash" | null;
  isSuspicious: boolean;
  suspicionReason: string | null;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  try {
    const apiKey = Deno.env.get("ANTHROPIC_API_KEY");
    if (!apiKey) {
      // No AI key configured — caller falls back to manual entry.
      return json({ error: "ANTHROPIC_API_KEY غير مضبوط على السيرفر", configured: false }, 200);
    }

    const { imageBase64, mediaType } = await req.json();
    if (typeof imageBase64 !== "string" || typeof mediaType !== "string") {
      return json({ error: "صورة الإيصال مفقودة" }, 400);
    }

    const prompt = `أنت خبير في فحص إيصالات التحويلات المالية المصرية (InstaPay، فودافون كاش، اتصالات كاش، أورنج كاش، تحويلات بنكية).
افحص صورة الإيصال المرفقة واستخرج البيانات، وقيّم هل الإيصال يبدو حقيقياً أو معدّلاً/مزوّراً (تحقق من: خط غير متسق، أرقام متراكبة أو غير محاذية، عدم تطابق تنسيق التطبيق المعروف، آثار تعديل رقمي).

رد بصيغة JSON فقط بدون أي نص إضافي، بالشكل التالي بالضبط:
{
  "amount": "الرقم فقط بدون عملة أو null",
  "referenceNumber": "رقم العملية/المرجع أو null",
  "bankName": "اسم البنك أو المحفظة كما يظهر في الإيصال أو null",
  "date": "تاريخ التحويل كما يظهر أو null",
  "transferType": "instapay أو vodafone_cash أو null",
  "isSuspicious": true أو false,
  "suspicionReason": "سبب الشك بالعربي أو null إذا كان يبدو سليماً"
}`;

    const anthropicRes = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-5",
        max_tokens: 1024,
        messages: [
          {
            role: "user",
            content: [
              { type: "image", source: { type: "base64", media_type: mediaType, data: imageBase64 } },
              { type: "text", text: prompt },
            ],
          },
        ],
      }),
    });

    if (!anthropicRes.ok) {
      const body = await anthropicRes.text().catch(() => "");
      throw new Error(`Anthropic API returned ${anthropicRes.status}: ${body}`);
    }

    const result = await anthropicRes.json();
    const text: string = result?.content?.[0]?.text ?? "{}";
    const cleaned = text.trim().replace(/^```json\s*|\s*```$/g, "");

    let extracted: ExtractedReceipt;
    try {
      extracted = JSON.parse(cleaned);
    } catch {
      return json({ error: "تعذر تفسير رد الذكاء الاصطناعي", configured: true }, 200);
    }

    return json({ configured: true, ...extracted });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "حدث خطأ غير متوقع";
    return json({ error: message, configured: true }, 500);
  }
});
