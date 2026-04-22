import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const BHARAT_API = "https://api.bharat4ubiz.site/api/payin/v1/create-order";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { email, amount, customer_mobile } = await req.json();

    // Validate
    if (!email || typeof email !== "string" || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return new Response(JSON.stringify({ error: "Invalid email" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const amt = Number(amount);
    if (!Number.isFinite(amt) || amt < 1 || amt > 200000) {
      return new Response(JSON.stringify({ error: "Invalid amount (1–200000)" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const mobile = String(customer_mobile || "").replace(/\D/g, "");
    if (!/^\d{10}$/.test(mobile)) {
      return new Response(JSON.stringify({ error: "Invalid 10-digit mobile" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const BHARAT_MID = Deno.env.get("BHARAT_MID");
    const BHARAT_KEY = Deno.env.get("BHARAT_KEY");
    if (!BHARAT_MID || !BHARAT_KEY) {
      return new Response(JSON.stringify({ error: "Gateway not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const order_id = `ORD${Date.now()}${Math.floor(Math.random() * 1000)}`;

    const body = new URLSearchParams({
      bharat_mid: BHARAT_MID,
      bharat_key: BHARAT_KEY,
      order_id,
      amount: String(amt),
      customer_mobile: mobile,
    });

    const apiRes = await fetch(BHARAT_API, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: body.toString(),
    });

    const data = await apiRes.json().catch(() => ({}));
    console.log("Bharat4u create-order response:", JSON.stringify(data));

    if (!apiRes.ok || !data?.status || !data?.result?.payment_url) {
      return new Response(
        JSON.stringify({ error: data?.message || "Gateway error", details: data }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const payment_url: string = data.result.payment_url;

    // Save to DB with service role
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { error: dbErr } = await supabase.from("payments").insert({
      order_id,
      email,
      customer_mobile: mobile,
      amount: amt,
      status: "PENDING",
      payment_url,
      raw_response: data,
    });

    if (dbErr) {
      console.error("DB insert error:", dbErr);
      return new Response(JSON.stringify({ error: "Database error" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(
      JSON.stringify({ success: true, order_id, amount: amt, payment_url }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    console.error("create-payment error:", e);
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
