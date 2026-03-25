
CREATE POLICY "Public can view seller profiles"
ON public.profiles
FOR SELECT
TO anon, authenticated
USING (true);
