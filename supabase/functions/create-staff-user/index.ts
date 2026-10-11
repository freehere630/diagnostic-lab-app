// supabase/functions/create-staff-user/index.ts
import { serve } from "https://deno.land/std@0.208.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(obj: unknown, status = 200) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "Missing Authorization header" }, 401);

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey     = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceKey  = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Client scoped to caller's JWT (respects RLS)
    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: userData, error: userErr } = await userClient.auth.getUser();
    if (userErr || !userData?.user) return json({ error: "Invalid session" }, 401);

    const { data: callerProfile } = await userClient
      .from("staff_profiles")
      .select("role")
      .eq("user_id", userData.user.id)
      .maybeSingle();

    if (!callerProfile || !["admin", "manager", "developer"].includes(callerProfile.role)) {
      return json({ error: "Insufficient privileges" }, 403);
    }

    const body = await req.json().catch(() => ({}));
    const { email, password, fullName, role, designation, signatureData } = body || {};

    if (!email || !password || !fullName || !role) {
      return json({ error: "Missing required fields" }, 400);
    }

    const validRoles = [
      "developer", "manager", "admin", "verifier",
      "biochemist", "technologist", "receptionist",
    ];
    if (!validRoles.includes(role)) {
      return json({ error: "Invalid role" }, 400);
    }

    // Service-role client — creates auth user without touching caller's session
    const adminClient = createClient(supabaseUrl, serviceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const { data: created, error: createErr } =
      await adminClient.auth.admin.createUser({
        email: String(email).trim().toLowerCase(),
        password: String(password),
        email_confirm: true,
        user_metadata: { full_name: String(fullName).trim() },
      });

    if (createErr || !created?.user) {
      return json({ error: createErr?.message || "User creation failed" }, 400);
    }

    const { error: insertErr } = await adminClient
      .from("staff_profiles")
      .insert({
        user_id: created.user.id,
        full_name: String(fullName).trim(),
        role,
        designation: (designation || "").trim(),
        signature_data: signatureData || String(fullName).trim(),
        is_active: true,
      });

    if (insertErr) {
      // Roll back auth user so we don't leave an orphan
      await adminClient.auth.admin.deleteUser(created.user.id);
      return json({ error: insertErr.message }, 500);
    }

    return json({
      ok: true,
      userId: created.user.id,
      email: created.user.email,
    });
  } catch (err) {
    return json({ error: (err as Error).message }, 500);
  }
});