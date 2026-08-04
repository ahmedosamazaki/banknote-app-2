import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const ADMIN_EMAIL = "admin@banknote.internal";

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
    const adminPassword = Deno.env.get("ADMIN_PASSWORD");
    if (!adminPassword) {
      return json({ error: "ADMIN_PASSWORD غير مضبوط على السيرفر" }, 500);
    }

    const { password } = await req.json().catch(() => ({ password: "" }));
    if (typeof password !== "string" || password !== adminPassword) {
      return json({ error: "كلمة المرور غير صحيحة" }, 401);
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    const admin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
    const anon = createClient(supabaseUrl, anonKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // Try signing in with the current shared password first.
    let signIn = await anon.auth.signInWithPassword({
      email: ADMIN_EMAIL,
      password: adminPassword,
    });

    if (signIn.error) {
      // Admin auth user doesn't exist yet, or the shared password was
      // rotated — (re)provision it so it stays in sync with ADMIN_PASSWORD.
      const { data: list, error: listError } = await admin.auth.admin.listUsers();
      if (listError) throw listError;

      const existing = list.users.find((u) => u.email === ADMIN_EMAIL);
      if (existing) {
        const { error: updateError } = await admin.auth.admin.updateUserById(existing.id, {
          password: adminPassword,
        });
        if (updateError) throw updateError;
      } else {
        const { error: createError } = await admin.auth.admin.createUser({
          email: ADMIN_EMAIL,
          password: adminPassword,
          email_confirm: true,
          user_metadata: { role: "admin" },
        });
        if (createError) throw createError;
      }

      signIn = await anon.auth.signInWithPassword({
        email: ADMIN_EMAIL,
        password: adminPassword,
      });
      if (signIn.error) throw signIn.error;
    }

    const session = signIn.data.session;
    if (!session) return json({ error: "تعذر إنشاء جلسة الدخول" }, 500);

    return json({
      access_token: session.access_token,
      refresh_token: session.refresh_token,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "حدث خطأ غير متوقع";
    return json({ error: message }, 500);
  }
});
