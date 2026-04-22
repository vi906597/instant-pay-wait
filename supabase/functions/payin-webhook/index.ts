import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Bharat4u Payin Webhook: { "order_id": "...", "amount": "...", "status": "SUCCESS", "utr": "..." }
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    let payload: any = {};
    const ct = req.headers.get("content-type") || "";
    if (ct.includes("application/json")) {
      payload = await req.json();
    } else {
      const txt = await req.text();
      try {
        payload = JSON.parse(txt);
      } catch {
        const params = new URLSearchParams(txt);
        payload = Object.fromEntries(params.entries());
      }
    }

    console.log("payin-webhook payload:", JSON.stringify(payload));

    const order_id = payload.order_id;
    const status = String(payload.status || "").toUpperCase();
    const utr = payload.utr ? String(payload.utr) : null;

    if (!order_id || !status) {
      return new Response(JSON.stringify({ error: "missing fields" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const update: Record<string, unknown> = { status, raw_response: payload };
    if (utr) update.utr = utr;

    const { error } = await supabase.from("payments").update(update).eq("order_id", order_id);
    if (error) {
      console.error("webhook db update error:", error);
      return new Response(JSON.stringify({ error: "db error" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("payin-webhook error:", e);
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
