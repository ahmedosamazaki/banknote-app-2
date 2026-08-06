import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const EGYPT_PHONE_REGEX = /^01[0125]\d{8}$/;

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
    const { type, query } = await req.json().catch(() => ({}));

    if (type !== "name" && type !== "phone") {
      return json({ error: "بيانات غير صالحة" }, 400);
    }

    const value = typeof query === "string" ? query.trim() : "";
    if (type === "name" && value.length < 3) {
      return json({ error: "اكتب الاسم كامل" }, 400);
    }
    if (type === "phone" && !EGYPT_PHONE_REGEX.test(value)) {
      return json({ error: "اكتب رقم موبايل مصري صحيح كامل" }, 400);
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const admin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // Exact match only — a partial/ilike search on a public, unauthenticated
    // endpoint let anyone brute-force a few common letters and pull back
    // other reps' full transfer records (amounts, phone numbers, receipt
    // images). A rep already knows their own exact name or phone number.
    const field = type === "name" ? "representative_name" : "sender_phone";
    const { data, error } = await admin
      .from("transfers")
      .select("*")
      .eq(field, value)
      .order("created_at", { ascending: false })
      .limit(100);

    if (error) throw error;

    return json({ transfers: data ?? [] });
  } catch (err: unknown) {
    let message = "حدث خطأ غير متوقع";
    if (err instanceof Error) {
      message = err.message;
    } else if (err && typeof err === "object" && "message" in err) {
      message = String((err as { message: unknown }).message);
    }
    return json({ error: message }, 500);
  }
});
