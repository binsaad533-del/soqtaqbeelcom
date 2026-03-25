import { Link } from "react-router-dom";
import { ArrowLeft, Calendar, Clock, TrendingUp, Shield, Lightbulb, BookOpen } from "lucide-react";
import { useSEO } from "@/hooks/useSEO";
import { useLanguage } from "@/contexts/LanguageContext";

const articles = [
  {
    id: "smart-valuation",
    icon: <TrendingUp size={20} className="text-primary" />,
    title_ar: "كيف يساعدك الذكاء الاصطناعي في تقييم مشروعك؟",
    title_en: "How AI Helps You Value Your Business",
    excerpt_ar: "تعرّف على كيف تستخدم منصة سوق تقبيل الذكاء الاصطناعي لتحليل بيانات المشروع وتقديم تقييم واقعي بناءً على السوق الفعلي.",
    excerpt_en: "Learn how Taqbeel uses AI to analyze business data and provide realistic valuations based on actual market conditions.",
    date: "2026-03-20",
    readTime_ar: "5 دقائق",
    readTime_en: "5 min read",
    category_ar: "تقييم",
    category_en: "Valuation",
  },
  {
    id: "safe-deals",
    icon: <Shield size={20} className="text-primary" />,
    title_ar: "5 نصائح لضمان صفقة آمنة عند تقبيل مشروع",
    title_en: "5 Tips for a Safe Business Transfer Deal",
    excerpt_ar: "من التحقق من السجل التجاري إلى مراجعة العقود — خطوات أساسية لحمايتك كمشتري أو بائع في عملية التقبيل.",
    excerpt_en: "From verifying commercial records to reviewing contracts — essential steps to protect yourself as a buyer or seller.",
    date: "2026-03-15",
    readTime_ar: "4 دقائق",
    readTime_en: "4 min read",
    category_ar: "نصائح",
    category_en: "Tips",
  },
  {
    id: "market-trends",
    icon: <TrendingUp size={20} className="text-primary" />,
    title_ar: "اتجاهات سوق التقبيل في السعودية 2026",
    title_en: "Business Transfer Market Trends in Saudi Arabia 2026",
    excerpt_ar: "نظرة شاملة على أكثر القطاعات طلباً وأعلى المدن نشاطاً في سوق تقبيل المشاريع التجارية.",
    excerpt_en: "A comprehensive look at the most in-demand sectors and most active cities in the business transfer market.",
    date: "2026-03-10",
    readTime_ar: "6 دقائق",
    readTime_en: "6 min read",
    category_ar: "تحليل السوق",
    category_en: "Market Analysis",
  },
  {
    id: "inventory-ai",
    icon: <Lightbulb size={20} className="text-primary" />,
    title_ar: "جرد المخزون بالذكاء الاصطناعي — كيف يعمل؟",
    title_en: "AI Inventory Management — How It Works",
    excerpt_ar: "اكتشف كيف تقوم المنصة بجرد أصول المشروع تلقائياً من الصور المرفوعة باستخدام تقنيات الرؤية الحاسوبية.",
    excerpt_en: "Discover how the platform automatically inventories business assets from uploaded photos using computer vision technology.",
    date: "2026-03-05",
    readTime_ar: "3 دقائق",
    readTime_en: "3 min read",
    category_ar: "تقنية",
    category_en: "Technology",
  },
  {
    id: "legal-steps",
    icon: <BookOpen size={20} className="text-primary" />,
    title_ar: "الخطوات القانونية لنقل ملكية مشروع تجاري",
    title_en: "Legal Steps for Transferring Business Ownership",
    excerpt_ar: "دليل مبسّط للإجراءات القانونية المطلوبة لإتمام عملية تقبيل المشروع بشكل رسمي ومعتمد.",
    excerpt_en: "A simplified guide to the legal procedures required to complete an official business transfer.",
    date: "2026-02-28",
    readTime_ar: "7 دقائق",
    readTime_en: "7 min read",
    category_ar: "قانوني",
    category_en: "Legal",
  },
];

const BlogPage = () => {
  const { tx, lang } = useLanguage();
  useSEO({
    title: tx("المدونة", "Blog"),
    description: tx(
      "مقالات ونصائح حول تقبيل المشاريع التجارية والتقييم الذكي",
      "Articles and tips about business transfers and smart valuation"
    ),
    canonical: "/blog",
  });

  return (
    <div className="py-10">
      <div className="container max-w-4xl">
        {/* Header */}
        <div className="text-center mb-10">
          <h1 className="text-2xl md:text-3xl font-medium mb-3">
            {tx("المدونة والأخبار", "Blog & News")}
          </h1>
          <p className="text-muted-foreground max-w-lg mx-auto">
            {tx(
              "مقالات متخصصة، نصائح عملية، وآخر أخبار سوق التقبيل",
              "Expert articles, practical tips, and latest market news"
            )}
          </p>
        </div>

        {/* Articles Grid */}
        <div className="space-y-4">
          {articles.map((article) => (
            <article
              key={article.id}
              className="group bg-card rounded-2xl p-5 shadow-soft hover:shadow-soft-lg hover:scale-[1.01] transition-all duration-300 cursor-pointer"
            >
              <div className="flex gap-4">
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center shrink-0 group-hover:bg-primary/20 transition-colors">
                  {article.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1.5">
                    <span className="text-[10px] px-2 py-0.5 rounded-md bg-primary/10 text-primary font-medium">
                      {lang === "ar" ? article.category_ar : article.category_en}
                    </span>
                    <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
                      <Calendar size={10} />
                      {new Date(article.date).toLocaleDateString(lang === "ar" ? "ar-SA" : "en-US", {
                        year: "numeric",
                        month: "short",
                        day: "numeric",
                      })}
                    </span>
                    <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
                      <Clock size={10} />
                      {lang === "ar" ? article.readTime_ar : article.readTime_en}
                    </span>
                  </div>
                  <h2 className="font-medium mb-1.5 group-hover:text-primary transition-colors">
                    {lang === "ar" ? article.title_ar : article.title_en}
                  </h2>
                  <p className="text-sm text-muted-foreground leading-relaxed line-clamp-2">
                    {lang === "ar" ? article.excerpt_ar : article.excerpt_en}
                  </p>
                </div>
              </div>
            </article>
          ))}
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
            <ArrowLeft size={14} />
          </Link>
        </div>
      </div>
    </div>
  );
};

export default BlogPage;
