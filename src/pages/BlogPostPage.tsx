import { useParams, Link } from "react-router-dom";
import { safeJsonLd } from "@/lib/security";
import { ArrowRight, Calendar, Clock, Tag } from "lucide-react";
import { useSEO } from "@/hooks/useSEO";
import { useLanguage } from "@/contexts/LanguageContext";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";
import ReactMarkdown from "react-markdown";

const BlogPostPage = () => {
  const { slug } = useParams<{ slug: string }>();
  const { tx, lang } = useLanguage();

  const { data: post, isLoading } = useQuery({
    queryKey: ["blog-post", slug],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("blog_posts")
        .select("*")
        .eq("slug", slug!)
        .eq("status", "published")
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!slug,
  });

  useSEO({
    title: post ? (lang === "ar" ? post.title_ar : post.title_en || post.title_ar) : tx("المدونة", "Blog"),
    description: post
      ? (lang === "ar" ? post.meta_description_ar : post.meta_description_en || post.meta_description_ar) || ""
      : "",
    canonical: `/blog/${slug}`,
  });

  if (isLoading) {
    return (
      <div className="py-10 container max-w-3xl">
        <Skeleton className="h-8 w-3/4 mb-4" />
        <Skeleton className="h-4 w-1/2 mb-8" />
        <div className="space-y-3">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-4 w-full" />
          ))}
        </div>
      </div>
    );
  }

  if (!post) {
    return (
      <div className="py-20 text-center">
        <p className="text-muted-foreground mb-4">{tx("المقال غير موجود", "Article not found")}</p>
        <Link to="/blog" className="text-primary text-sm hover:underline">
          {tx("العودة للمدونة", "Back to Blog")}
        </Link>
      </div>
    );
  }

  const title = lang === "ar" ? post.title_ar : (post.title_en || post.title_ar);
  const content = lang === "ar" ? post.content_ar : (post.content_en || post.content_ar);
  const category = lang === "ar" ? post.category_ar : (post.category_en || post.category_ar);

  // JSON-LD structured data
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: title,
    description: lang === "ar" ? post.meta_description_ar : (post.meta_description_en || post.meta_description_ar),
    datePublished: post.published_at,
    dateModified: post.updated_at,
    author: { "@type": "Organization", name: "سوق تقبيل" },
    publisher: { "@type": "Organization", name: "سوق تقبيل", url: "https://soqtaqbeel.com" },
    mainEntityOfPage: { "@type": "WebPage", "@id": `https://soqtaqbeel.com/blog/${post.slug}` },
    keywords: post.tags?.join(", "),
  };

  return (
    <div className="py-10">
      <div className="container max-w-3xl">
        {/* JSON-LD */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: safeJsonLd(jsonLd) }}
        />

        {/* Back link */}
        <Link
          to="/blog"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-6 transition-colors"
        >
          <ArrowRight size={14} />
          {tx("العودة للمدونة", "Back to Blog")}
        </Link>

        {/* Header */}
        <article dir={lang === "ar" ? "rtl" : "ltr"}>
          <div className="flex items-center gap-3 mb-4 flex-wrap">
            {category && (
              <span className="text-xs px-2.5 py-1 rounded-md bg-primary/10 text-primary font-medium">
                {category}
              </span>
            )}
            <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Calendar size={12} />
              {post.published_at
                ? new Date(post.published_at).toLocaleDateString(lang === "ar" ? "ar-SA-u-nu-latn" : "en-US", {
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  })
                : ""}
            </span>
            <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Clock size={12} />
              {tx(`${post.read_time_minutes} دقائق قراءة`, `${post.read_time_minutes} min read`)}
            </span>
          </div>

          <h1 className="text-2xl md:text-3xl font-bold mb-8 leading-relaxed">{title}</h1>

          {/* Content */}
          <div className="prose prose-base dark:prose-invert max-w-none
            prose-headings:font-bold prose-headings:leading-snug prose-headings:mb-4 prose-headings:mt-8
            prose-h2:text-xl prose-h2:border-b prose-h2:border-border/20 prose-h2:pb-2
            prose-h3:text-lg
            prose-p:text-base prose-p:leading-[1.9] prose-p:mb-5 prose-p:text-foreground/85
            prose-li:text-base prose-li:leading-[1.8] prose-li:mb-1.5 prose-li:text-foreground/80
            prose-ul:my-4 prose-ul:ps-6
            prose-ol:my-4 prose-ol:ps-6
            prose-strong:text-foreground prose-strong:font-semibold
            prose-a:text-primary prose-a:no-underline hover:prose-a:underline
          ">
            <ReactMarkdown>{content}</ReactMarkdown>
          </div>

          {/* Tags */}
          {post.tags && post.tags.length > 0 && (
            <div className="flex items-center gap-2 flex-wrap mt-10 pt-6 border-t border-border/30">
              <Tag size={14} className="text-muted-foreground" />
              {post.tags.map((tag: string) => (
                <Link
                  key={tag}
                  to={`/blog?tag=${encodeURIComponent(tag)}`}
                  className="text-xs px-3 py-1.5 rounded-lg bg-muted hover:bg-muted/80 text-muted-foreground transition-colors"
                >
                  {tag}
                </Link>
              ))}
            </div>
          )}
        </article>

        {/* CTA */}
        <div className="text-center mt-12 p-6 rounded-2xl gradient-hero">
          <p className="text-sm text-muted-foreground mb-3">
            {tx("هل تبحث عن مشروع للتقبيل؟", "Looking for a business to acquire?")}
          </p>
          <Link
            to="/marketplace"
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity"
          >
            {tx("تصفح السوق", "Browse Marketplace")}
          </Link>
        </div>
      </div>
    </div>
  );
};

export default BlogPostPage;
