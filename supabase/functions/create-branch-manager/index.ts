import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const MANAGER_EMAIL_DOMAIN = "banknote-manager.internal";

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

    // Identify the caller from their access token.
    const { data: callerData, error: callerError } = await admin.auth.getUser(callerToken);
    if (callerError || !callerData.user) return json({ error: "غير مصرح" }, 401);

    // Only the super admin (an authenticated account with NO branch_managers
    // row) may create manager accounts — a branch manager can't create others.
    const { data: existingManagerRow } = await admin
      .from("branch_managers")
      .select("user_id")
      .eq("user_id", callerData.user.id)
      .maybeSingle();
    if (existingManagerRow) {
      return json({ error: "هذا الحساب غير مصرح له بإنشاء حسابات مديرين" }, 403);
    }

    const { username, password, branch_name, full_name } = await req.json().catch(() => ({}));
    if (
      typeof username !== "string" || !username.trim() ||
      typeof password !== "string" || password.length < 6 ||
      typeof branch_name !== "string" || !branch_name.trim()
    ) {
      return json({ error: "بيانات ناقصة أو كلمة المرور أقل من 6 أحرف" }, 400);
    }

    const cleanUsername = username.trim().toLowerCase().replace(/[^a-z0-9._-]/g, "");
    if (!cleanUsername) return json({ error: "اسم مستخدم غير صالح" }, 400);
    const email = `${cleanUsername}@${MANAGER_EMAIL_DOMAIN}`;

    const { data: created, error: createError } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { role: "branch_manager", branch_name },
    });
    if (createError) throw createError;

    const { error: insertError } = await admin.from("branch_managers").insert({
      user_id: created.user.id,
      branch_name,
      username: cleanUsername,
      full_name: typeof full_name === "string" ? full_name.trim() || null : null,
    });
    if (insertError) {
      // Without a branch_managers row this account would be treated as the
      // super admin (full access) instead of being rejected — never leave
      // a half-created account behind.
      await admin.auth.admin.deleteUser(created.user.id).catch(() => {});
      throw insertError;
    }

    return json({ success: true, username: cleanUsername });
  } catch (err: unknown) {
    let message = "حدث خطأ غير متوقع";
    if (err instanceof Error) {
      message = err.message;
    } else if (err && typeof err === "object" && "message" in err) {
      message = String((err as { message: unknown }).message);
    } else {
      try {
        message = JSON.stringify(err);
      } catch {
        message = String(err);
      }
    }
    console.error("create-branch-manager error:", err);
    return json({ error: message }, 500);
  }
});
