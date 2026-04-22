import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const BHARAT_API = "https://api.bharat4ubiz.site/api/payin/v1/check-status";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { order_id } = await req.json();
    if (!order_id || typeof order_id !== "string") {
      return new Response(JSON.stringify({ error: "order_id required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const BHARAT_MID = Deno.env.get("BHARAT_MID")!;
    const BHARAT_KEY = Deno.env.get("BHARAT_KEY")!;

    const body = new URLSearchParams({
      bharat_mid: BHARAT_MID,
      bharat_key: BHARAT_KEY,
      order_id,
    });

    const apiRes = await fetch(BHARAT_API, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: body.toString(),
    });

    const data = await apiRes.json().catch(() => ({}));
    console.log("Bharat4u check-status response:", JSON.stringify(data));

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    let newStatus: string | null = null;
    let utr: string | null = null;

    if (data?.status && data?.result?.status) {
      const s = String(data.result.status).toUpperCase();
      if (["SUCCESS", "FAILED", "PENDING", "EXPIRED"].includes(s)) newStatus = s;
      if (data.result.utr) utr = String(data.result.utr);
    }

    if (newStatus) {
      const update: Record<string, unknown> = { status: newStatus };
      if (utr) update.utr = utr;
      await supabase.from("payments").update(update).eq("order_id", order_id);
    }

    const { data: row } = await supabase
      .from("payments")
      .select("order_id,email,amount,status,utr,created_at,updated_at")
      .eq("order_id", order_id)
      .maybeSingle();

    return new Response(JSON.stringify({ success: true, payment: row, gateway: data }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("check-payment error:", e);
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
