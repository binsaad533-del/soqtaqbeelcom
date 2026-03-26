
-- Blog posts table
CREATE TABLE public.blog_posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title_ar text NOT NULL,
  title_en text,
  content_ar text NOT NULL,
  content_en text,
  excerpt_ar text,
  excerpt_en text,
  slug text UNIQUE NOT NULL,
  tags text[] DEFAULT '{}',
  category_ar text,
  category_en text,
  meta_description_ar text,
  meta_description_en text,
  read_time_minutes integer DEFAULT 5,
  status text NOT NULL DEFAULT 'draft',
  featured boolean DEFAULT false,
  generated_by_ai boolean DEFAULT false,
  published_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.blog_posts ENABLE ROW LEVEL SECURITY;

-- Public can read published posts
CREATE POLICY "Anyone can view published posts"
  ON public.blog_posts FOR SELECT
  TO anon, authenticated
  USING (status = 'published');

-- Platform owner full access
CREATE POLICY "Owner full access blog"
  ON public.blog_posts FOR ALL
  TO authenticated
  USING (has_role(auth.uid(), 'platform_owner'))
  WITH CHECK (has_role(auth.uid(), 'platform_owner'));

-- Supervisors can view all
CREATE POLICY "Supervisors view all blog posts"
  ON public.blog_posts FOR SELECT
  TO authenticated
  USING (has_role(auth.uid(), 'supervisor'));

-- Service role can insert (for AI generation)
CREATE POLICY "Service role can insert blog posts"
  ON public.blog_posts FOR INSERT
  TO public
  WITH CHECK (auth.role() = 'service_role');

-- Updated at trigger
CREATE TRIGGER update_blog_posts_updated_at
  BEFORE UPDATE ON public.blog_posts
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
