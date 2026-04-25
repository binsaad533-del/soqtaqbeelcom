import { useParams, Link } from "react-router-dom";
import { safeJsonLd } from "@/lib/security";
import { ArrowRight, Calendar, Clock, Tag } from "lucide-react";
import { useSEO } from "@/hooks/useSEO";
import { useTranslation } from "react-i18next";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";
import ReactMarkdown from "react-markdown";

const BlogPostPage = () => {
  const { slug } = useParams<{ slug: string }>();
  const { t, i18n } = useTranslation();
  const lang = (i18n.resolvedLanguage || i18n.language || "ar").split("-")[0];

  const { data: post, isLoading } = useQuery({
    queryKey: ["blog-post", slug],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("blog_posts")
        .select("*")
        .eq("slug", slug!)
        .eq("status", "published")
        .single();
      if (error) {
        console.error("[BlogPostPage] Failed to load post:", error);
        return null;
      }
      return data;
    },
    enabled: !!slug,
  });

  useSEO({
    title: post ? (lang === "ar" ? post.title_ar : post.title_en || post.title_ar) : t("blog.title"),
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
        <p className="text-muted-foreground mb-4">{t("blog.notFound")}</p>
        <Link to="/blog" className="text-primary text-sm hover:underline">
          {t("blog.backToBlog")}
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
          {t("blog.backToBlog")}
        </Link>

        {/* Header */}
        <article
          dir={lang === "ar" ? "rtl" : "ltr"}
          className={`max-w-2xl mx-auto ${lang === "ar" ? "text-right" : "text-left"}`}
        >
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
              {t("blog.readTimeFull", { count: post.read_time_minutes })}
            </span>
          </div>

          <h1 className="text-xl md:text-2xl font-semibold mb-7 leading-[1.9]">{title}</h1>

          <div className="prose prose-sm dark:prose-invert max-w-none prose-headings:text-inherit prose-strong:text-inherit prose-a:text-primary">
            <ReactMarkdown
              components={{
                h2: ({ children }) => (
                  <h2 className="mt-12 mb-5 pb-3 text-lg md:text-xl font-semibold leading-[2] border-b border-border/15 text-start">
                    {children}
                  </h2>
                ),
                h3: ({ children }) => (
                  <h3 className="mt-10 mb-4 text-base md:text-lg font-semibold leading-[2] text-start">
                    {children}
                  </h3>
                ),
                p: ({ children }) => (
                  <p className="mb-7 text-[15px] leading-[2.45] text-foreground/80 font-normal text-start">
                    {children}
                  </p>
                ),
                ul: ({ children }) => (
                  <ul className="my-7 space-y-3 ps-7 text-start text-foreground/75 marker:text-muted-foreground">
                    {children}
                  </ul>
                ),
                ol: ({ children }) => (
                  <ol className="my-7 space-y-3 ps-7 text-start text-foreground/75 marker:text-foreground/70">
                    {children}
                  </ol>
                ),
                li: ({ children }) => (
                  <li className="text-[15px] leading-[2.3] ps-1 font-normal">{children}</li>
                ),
                strong: ({ children }) => <strong className="font-medium text-foreground/90">{children}</strong>,
              }}
            >
              {content}
            </ReactMarkdown>
          </div>

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
            {t("blog.ctaLooking")}
          </p>
          <Link
            to="/marketplace"
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity"
          >
            {t("blog.browseMarketplace")}
          </Link>
        </div>
      </div>
    </div>
  );
};

export default BlogPostPage;
