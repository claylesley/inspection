import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const ok  = (body: object) => new Response(JSON.stringify(body), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
const err = (msg: string)  => new Response(JSON.stringify({ error: msg }),  { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const { email, full_name, org_id, role, password } = await req.json();
    if (!email)    return err("Email is required");
    if (!password) return err("Password is required");
    if (!org_id)   return err("org_id is required");

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { autoRefreshToken: false, persistSession: false } },
    );

    // Create confirmed account directly — no email redirect needed
    const { data, error: createErr } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { org_id, role: role || "inspector", full_name: full_name || "" },
    });

    if (createErr) return err(createErr.message);

    const { error: profErr } = await supabaseAdmin.from("profiles").upsert({
      id:        data.user.id,
      email,
      full_name: full_name || "",
      org_id,
      role:      role || "inspector",
      active:    true,
    }, { onConflict: "id" });

    if (profErr) console.error("Profile upsert error:", profErr.message);

    return ok({ success: true });
  } catch (e) {
    console.error("invite-user error:", e.message);
    return err(e.message);
  }
});
