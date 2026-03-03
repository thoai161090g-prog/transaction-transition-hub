import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabaseAdmin = createClient(supabaseUrl, serviceKey);

    // Get user from token
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: userError } = await userClient.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Invalid token" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const { package_id, price, label, days } = await req.json();
    if (!package_id || !price) {
      return new Response(JSON.stringify({ error: "Missing package_id or price" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Get current balance
    const { data: profile, error: profileErr } = await supabaseAdmin
      .from("profiles").select("balance").eq("user_id", user.id).single();
    if (profileErr || !profile) {
      return new Response(JSON.stringify({ error: "Profile not found" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    if (profile.balance < price) {
      return new Response(JSON.stringify({ error: "Insufficient balance", balance: profile.balance }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Deduct balance
    const newBalance = profile.balance - price;
    const { error: updateErr } = await supabaseAdmin
      .from("profiles").update({ balance: newBalance }).eq("user_id", user.id);
    if (updateErr) {
      return new Response(JSON.stringify({ error: "Failed to deduct balance" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Create license key
    const expiresAt = days ? new Date(Date.now() + days * 86400000).toISOString() : null;
    const { data: keyData, error: keyErr } = await supabaseAdmin
      .from("license_keys").insert({
        user_id: user.id,
        package: package_id,
        price: price,
        expires_at: expiresAt,
        is_active: true,
      }).select().single();

    if (keyErr) {
      // Rollback balance
      await supabaseAdmin.from("profiles").update({ balance: profile.balance }).eq("user_id", user.id);
      return new Response(JSON.stringify({ error: "Failed to create key" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Create transaction as approved
    await supabaseAdmin.from("transactions").insert({
      user_id: user.id,
      package: package_id,
      amount: price,
      status: "approved",
      transfer_content: `BALANCE_${user.id.slice(0, 8).toUpperCase()}_${package_id.toUpperCase()}`,
      license_key_id: keyData.id,
    });

    return new Response(JSON.stringify({
      success: true,
      new_balance: newBalance,
      key: keyData.key_string,
      expires_at: expiresAt,
    }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });

  } catch (e) {
    return new Response(JSON.stringify({ error: e.message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
