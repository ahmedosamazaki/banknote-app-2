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
    const authHeader = req.headers.get("Authorization") || "";
    const callerToken = authHeader.replace(/^Bearer\s+/i, "");
    if (!callerToken) return json({ error: "غير مصرح" }, 401);

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const admin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const { data: callerData, error: callerError } = await admin.auth.getUser(callerToken);
    if (callerError || !callerData.user) return json({ error: "غير مصرح" }, 401);

    // Only the super admin (no branch_managers row) may reset another
    // manager's password.
    const { data: existingManagerRow } = await admin
      .from("branch_managers")
      .select("user_id")
      .eq("user_id", callerData.user.id)
      .maybeSingle();
    if (existingManagerRow) {
      return json({ error: "غير مصرح لك بهذا الإجراء" }, 403);
    }

    const { user_id, new_password } = await req.json().catch(() => ({}));
    if (typeof user_id !== "string" || !user_id || typeof new_password !== "string" || new_password.length < 6) {
      return json({ error: "بيانات ناقصة أو كلمة المرور أقل من 6 أحرف" }, 400);
    }

    const { error: updateError } = await admin.auth.admin.updateUserById(user_id, {
      password: new_password,
    });
    if (updateError) throw updateError;

    return json({ success: true });
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
