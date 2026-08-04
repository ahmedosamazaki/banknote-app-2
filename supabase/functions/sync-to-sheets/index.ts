import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const webhookUrl = Deno.env.get("GOOGLE_SHEETS_WEBHOOK_URL");

    if (!webhookUrl) {
      // Webhook not configured — graceful skip, data is safe in Supabase
      return new Response(
        JSON.stringify({ skipped: true, reason: "GOOGLE_SHEETS_WEBHOOK_URL not configured" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const transfer = await req.json();

    // Map to flat row format for Google Sheets
    const row = {
      id: transfer.id ?? "",
      representative_name: transfer.representative_name ?? "",
      branch_name: transfer.branch_name ?? "",
      transfer_amount: transfer.transfer_amount ?? "",
      sender_phone: transfer.sender_phone ?? "",
      reference_number: transfer.reference_number ?? "",
      transfer_type: transfer.transfer_type ?? "",
      bank_name: transfer.bank_name ?? "",
      transfer_date: transfer.transfer_date ?? "",
      notes: transfer.notes ?? "",
      receipt_image_url: transfer.receipt_image_url ?? "",
      status: transfer.status ?? "pending",
      created_at: transfer.created_at ?? new Date().toISOString(),
    };

    const response = await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(row),
    });

    if (!response.ok) {
      const body = await response.text().catch(() => "");
      throw new Error(`Webhook returned ${response.status}: ${body}`);
    }

    return new Response(
      JSON.stringify({ success: true }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
