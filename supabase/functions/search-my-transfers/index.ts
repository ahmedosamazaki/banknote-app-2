import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

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

    if ((type !== "name" && type !== "phone") || typeof query !== "string" || query.trim().length < 3) {
      return json({ error: "أدخل 3 أحرف على الأقل" }, 400);
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const admin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const field = type === "name" ? "representative_name" : "sender_phone";
    const { data, error } = await admin
      .from("transfers")
      .select("*")
      .ilike(field, `%${query.trim()}%`)
      .order("created_at", { ascending: false })
      .limit(100);

    if (error) throw error;

    return json({ transfers: data ?? [] });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "حدث خطأ غير متوقع";
    return json({ error: message }, 500);
  }
});
