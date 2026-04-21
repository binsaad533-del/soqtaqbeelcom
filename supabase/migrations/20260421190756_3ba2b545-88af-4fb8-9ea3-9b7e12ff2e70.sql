-- Helpers to manage vault.secrets via RPC (vault schema is not exposed to PostgREST)

CREATE OR REPLACE FUNCTION public.vault_create_secret(
  p_value text,
  p_name text,
  p_description text DEFAULT ''
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, vault, extensions
AS $$
DECLARE
  _id uuid;
BEGIN
  SELECT vault.create_secret(p_value, p_name, p_description) INTO _id;
  RETURN _id;
END;
$$;

CREATE OR REPLACE FUNCTION public.vault_update_secret(
  p_id uuid,
  p_value text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, vault, extensions
AS $$
BEGIN
  PERFORM vault.update_secret(p_id, p_value);
END;
$$;

CREATE OR REPLACE FUNCTION public.vault_upsert_secret(
  p_name text,
  p_value text,
  p_description text DEFAULT ''
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, vault, extensions
AS $$
DECLARE
  _id uuid;
BEGIN
  SELECT id INTO _id FROM vault.secrets WHERE name = p_name LIMIT 1;
  IF _id IS NOT NULL THEN
    PERFORM vault.update_secret(_id, p_value);
    RETURN _id;
  END IF;
  SELECT vault.create_secret(p_value, p_name, p_description) INTO _id;
  RETURN _id;
END;
$$;

CREATE OR REPLACE FUNCTION public.vault_verify_secrets()
RETURNS TABLE(name text, length integer)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, vault, extensions
AS $$
  SELECT name::text,
         CASE WHEN decrypted_secret IS NOT NULL THEN length(decrypted_secret) ELSE 0 END
  FROM vault.decrypted_secrets
  WHERE name IN ('SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY', 'SUPABASE_ANON_KEY')
  ORDER BY name;
$$;

-- Restrict execution to service_role only (these touch secrets)
REVOKE ALL ON FUNCTION public.vault_create_secret(text, text, text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.vault_update_secret(uuid, text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.vault_upsert_secret(text, text, text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.vault_verify_secrets() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.vault_create_secret(text, text, text) TO service_role;
GRANT EXECUTE ON FUNCTION public.vault_update_secret(uuid, text) TO service_role;
GRANT EXECUTE ON FUNCTION public.vault_upsert_secret(text, text, text) TO service_role;
GRANT EXECUTE ON FUNCTION public.vault_verify_secrets() TO service_role;