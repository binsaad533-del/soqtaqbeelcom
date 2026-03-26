CREATE OR REPLACE FUNCTION public.get_profile_name_by_email(_email text)
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT p.full_name
  FROM public.profiles p
  JOIN auth.users u ON u.id = p.user_id
  WHERE u.email = _email
  LIMIT 1
$$;