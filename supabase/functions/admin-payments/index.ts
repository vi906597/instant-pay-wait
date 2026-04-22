import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-admin-password",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const adminPassword = req.headers.get("x-admin-password");
    const expected = Deno.env.get("ADMIN_PASSWORD");
    if (!expected || adminPassword !== expected) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const url = new URL(req.url);
    const status = url.searchParams.get("status");
    const search = url.searchParams.get("search");

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    let query = supabase
      .from("payments")
      .select("id,order_id,email,customer_mobile,amount,status,utr,created_at,updated_at,payment_url")
      .order("created_at", { ascending: false })
      .limit(500);

    if (status && status !== "ALL") query = query.eq("status", status);
    if (search) query = query.or(`email.ilike.%${search}%,order_id.ilike.%${search}%,utr.ilike.%${search}%`);

    const { data, error } = await query;
    if (error) {
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Stats
    const { data: stats } = await supabase
      .from("payments")
      .select("status,amount");

    const totals = { total: 0, success: 0, pending: 0, failed: 0, sumSuccess: 0, sumAll: 0 };
    (stats || []).forEach((r: any) => {
      totals.total++;
      totals.sumAll += Number(r.amount || 0);
      const s = String(r.status).toUpperCase();
      if (s === "SUCCESS") {
        totals.success++;
        totals.sumSuccess += Number(r.amount || 0);
      } else if (s === "FAILED" || s === "EXPIRED") totals.failed++;
      else totals.pending++;
    });

    return new Response(JSON.stringify({ payments: data, stats: totals }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
