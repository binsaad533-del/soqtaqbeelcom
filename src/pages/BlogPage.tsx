import { useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Calendar, Clock, Tag, Search, Loader2 } from "lucide-react";
import { useSEO } from "@/hooks/useSEO";
import { useLanguage } from "@/contexts/LanguageContext";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";

const BlogPage = () => {
  const { tx, lang } = useLanguage();
  const [searchParams] = useSearchParams();
  const activeTag = searchParams.get("tag");
  const [searchQuery, setSearchQuery] = useState("");

  useSEO({
    title: tx("المدونة", "Blog"),
    description: tx(
      "مقالات ونصائح حول تقبيل المشاريع التجارية والتقييم الذكي",
      "Articles and tips about business transfers and smart valuation"
    ),
    canonical: "/blog",
  });

  const { data: posts = [], isLoading } = useQuery({
    queryKey: ["blog-posts"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("blog_posts")
        .select("*")
        .eq("status", "published")
        .order("published_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  // Extract unique tags
  const allTags = Array.from(new Set(posts.flatMap((p) => (p.tags as string[]) || [])));

  // Filter
  const filtered = posts.filter((p) => {
    const matchTag = !activeTag || (p.tags as string[])?.includes(activeTag);
    const title = lang === "ar" ? p.title_ar : (p.title_en || p.title_ar);
    const matchSearch = !searchQuery || title.toLowerCase().includes(searchQuery.toLowerCase());
    return matchTag && matchSearch;
  });

  // JSON-LD for blog listing
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Blog",
    name: tx("مدونة سوق تقبيل", "Soq Taqbeel Blog"),
    description: tx(
      "مقالات متخصصة في سوق التقبيل التجاري السعودي",
      "Expert articles about Saudi business transfer market"
    ),
    url: "https://soqtaqbeelcom.lovable.app/blog",
    publisher: { "@type": "Organization", name: "سوق تقبيل" },
    blogPost: filtered.slice(0, 10).map((p) => ({
      "@type": "BlogPosting",
      headline: lang === "ar" ? p.title_ar : (p.title_en || p.title_ar),
      datePublished: p.published_at,
      url: `https://soqtaqbeelcom.lovable.app/blog/${p.slug}`,
    })),
  };

  return (
    <div className="py-10">
      <div className="container max-w-4xl">
        {/* JSON-LD */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />

        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-2xl md:text-3xl font-medium mb-3">
            {tx("المدونة والأخبار", "Blog & News")}
          </h1>
          <p className="text-muted-foreground max-w-lg mx-auto text-sm">
            {tx(
              "مقالات متخصصة، نصائح عملية، وآخر أخبار سوق التقبيل",
              "Expert articles, practical tips, and latest market news"
            )}
          </p>
        </div>

        {/* Search */}
        <div className="relative mb-6 max-w-md mx-auto">
          <Search size={14} className="absolute start-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder={tx("ابحث في المقالات...", "Search articles...")}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="ps-9 text-sm h-9 rounded-xl"
          />
        </div>

        {/* Tags */}
        {allTags.length > 0 && (
          <div className="flex items-center gap-2 flex-wrap mb-6 justify-center">
            <Link
              to="/blog"
              className={`text-[11px] px-2.5 py-1 rounded-lg transition-colors ${
                !activeTag ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-muted/80"
              }`}
            >
              {tx("الكل", "All")}
            </Link>
            {allTags.map((tag) => (
              <Link
                key={tag}
                to={`/blog?tag=${encodeURIComponent(tag)}`}
                className={`text-[11px] px-2.5 py-1 rounded-lg transition-colors ${
                  activeTag === tag
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground hover:bg-muted/80"
                }`}
              >
                {tag}
              </Link>
            ))}
          </div>
        )}

        {/* Loading */}
        {isLoading && (
          <div className="flex justify-center py-16">
            <Loader2 size={24} className="animate-spin text-primary" />
          </div>
        )}

        {/* Articles */}
        {!isLoading && filtered.length === 0 && (
          <div className="text-center py-16 text-sm text-muted-foreground">
            {tx("لا توجد مقالات بعد", "No articles yet")}
          </div>
        )}

        <div className="space-y-4">
          {filtered.map((post) => {
            const title = lang === "ar" ? post.title_ar : (post.title_en || post.title_ar);
            const excerpt = lang === "ar" ? post.excerpt_ar : (post.excerpt_en || post.excerpt_ar);
            const category = lang === "ar" ? post.category_ar : (post.category_en || post.category_ar);

            return (
              <Link key={post.id} to={`/blog/${post.slug}`}>
                <article className="group bg-card rounded-2xl p-5 shadow-soft hover:shadow-soft-lg hover:scale-[1.01] transition-all duration-300">
                  <div className="flex gap-4">
                    <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center shrink-0 group-hover:bg-primary/20 transition-colors">
                      <Tag size={20} className="text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                        {category && (
                          <span className="text-[10px] px-2 py-0.5 rounded-md bg-primary/10 text-primary font-medium">
                            {category}
                          </span>
                        )}
                        <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
                          <Calendar size={10} />
                          {post.published_at
                            ? new Date(post.published_at).toLocaleDateString(
                                lang === "ar" ? "ar-SA" : "en-US",
                                { year: "numeric", month: "short", day: "numeric" }
                              )
                            : ""}
                        </span>
                        <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
                          <Clock size={10} />
                          {tx(`${post.read_time_minutes} دقائق`, `${post.read_time_minutes} min read`)}
                        </span>
                      </div>
                      <h2 className="font-medium mb-1.5 group-hover:text-primary transition-colors">
                        {title}
                      </h2>
                      <p className="text-sm text-muted-foreground leading-relaxed line-clamp-2">
                        {excerpt}
                      </p>
                      {/* Tags */}
                      {post.tags && (post.tags as string[]).length > 0 && (
                        <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                          {(post.tags as string[]).slice(0, 4).map((tag) => (
                            <span
                              key={tag}
                              className="text-[9px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground"
                            >
                              {tag}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </article>
              </Link>
            );
          })}
        </div>

        {/* CTA */}
        <div className="text-center mt-10 p-6 rounded-2xl gradient-hero">
          <p className="text-sm text-muted-foreground mb-3">
            {tx("عندك خبرة في السوق؟ شاركنا مقالك!", "Have market expertise? Share your article!")}
          </p>
          <Link
            to="/contact"
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity"
          >
            {tx("تواصل معنا", "Contact Us")}
          </Link>
        </div>
      </div>
    </div>
  );
};

export default BlogPage;
