// Temporary one-shot function to sync SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY
// from edge runtime env into vault.secrets so DB triggers can read them.
// Delete after successful execution.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY");

    if (!SUPABASE_URL || !SERVICE_KEY) {
      return new Response(
        JSON.stringify({
          ok: false,
          error: "Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in edge env",
          url_present: !!SUPABASE_URL,
          key_present: !!SERVICE_KEY,
        }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const admin = createClient(SUPABASE_URL, SERVICE_KEY, {
      auth: { persistSession: false },
    });

    const results: Record<string, unknown> = {};

    const upsertSecret = async (name: string, value: string, description: string) => {
      // Check if exists
      const { data: existing, error: selErr } = await admin
        .schema("vault" as never)
        .from("secrets" as never)
        .select("id, name")
        .eq("name", name)
        .maybeSingle();

      if (selErr) {
        // Fallback: try via RPC since vault schema may not be exposed via PostgREST
        const { data: rpcData, error: rpcErr } = await admin.rpc("vault_upsert_secret" as never, {
          p_name: name,
          p_value: value,
          p_description: description,
        });
        return {
          method: "rpc_fallback",
          error: rpcErr?.message ?? null,
          data: rpcData ?? null,
          select_error: selErr.message,
        };
      }

      if (existing && (existing as { id: string }).id) {
        const { error: updErr } = await admin.rpc("vault_update_secret" as never, {
          p_id: (existing as { id: string }).id,
          p_value: value,
        });
        return { method: "update", id: (existing as { id: string }).id, error: updErr?.message ?? null };
      }

      const { data: newId, error: insErr } = await admin.rpc("vault_create_secret" as never, {
        p_value: value,
        p_name: name,
        p_description: description,
      });
      return { method: "create", id: newId ?? null, error: insErr?.message ?? null };
    };

    results.SUPABASE_URL = await upsertSecret(
      "SUPABASE_URL",
      SUPABASE_URL,
      "Supabase project URL for server-side HTTP calls from triggers"
    );
    results.SUPABASE_SERVICE_ROLE_KEY = await upsertSecret(
      "SUPABASE_SERVICE_ROLE_KEY",
      SERVICE_KEY,
      "Service role key for trigger-initiated edge function calls"
    );
    if (ANON_KEY) {
      results.SUPABASE_ANON_KEY = await upsertSecret(
        "SUPABASE_ANON_KEY",
        ANON_KEY,
        "Anon key for trigger-initiated edge function calls (apikey header)"
      );
    }

    // Verify (length only, never expose values)
    const { data: verify, error: verifyErr } = await admin.rpc("vault_verify_secrets" as never);

    return new Response(
      JSON.stringify({
        ok: true,
        results,
        verify: verify ?? null,
        verifyError: verifyErr?.message ?? null,
        env_lengths: {
          SUPABASE_URL: SUPABASE_URL.length,
          SUPABASE_SERVICE_ROLE_KEY: SERVICE_KEY.length,
          SUPABASE_ANON_KEY: ANON_KEY?.length ?? 0,
        },
      }, null, 2),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    return new Response(
      JSON.stringify({ ok: false, error: (e as Error).message, stack: (e as Error).stack }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
