
DROP FUNCTION IF EXISTS public.get_public_profile(uuid);

CREATE FUNCTION public.get_public_profile(target_user_id uuid)
RETURNS TABLE(
  user_id uuid,
  full_name text,
  city text,
  is_verified boolean,
  trust_score integer,
  avatar_url text,
  completed_deals integer,
  cancelled_deals integer,
  verification_level text
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT p.user_id, p.full_name, p.city, p.is_verified, p.trust_score, p.avatar_url, 
         p.completed_deals, p.cancelled_deals, p.verification_level
  FROM public.profiles p
  WHERE p.user_id = target_user_id;
$$;
