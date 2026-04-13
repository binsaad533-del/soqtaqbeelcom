import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Eye, EyeOff, Trash2, Sparkles, Loader2, FileText, Calendar } from "lucide-react";

const BlogAdminPanel = () => {
  const queryClient = useQueryClient();
  const [generating, setGenerating] = useState(false);

  const { data: posts = [], isLoading } = useQuery({
    queryKey: ["admin-blog-posts"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("blog_posts")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) {
        console.error("[BlogAdmin] Load failed:", error);
        return [];
      }
      return data;
    },
  });

  const toggleStatus = useMutation({
    mutationFn: async ({ id, newStatus }: { id: string; newStatus: string }) => {
      const updates: any = { status: newStatus };
      if (newStatus === "published") updates.published_at = new Date().toISOString();
      const { error } = await supabase.from("blog_posts").update(updates).eq("id", id);
      if (error) {
        console.error("[BlogAdmin] Toggle status failed:", error);
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-blog-posts"] });
      toast.success("تم تحديث حالة المقال");
    },
    onError: () => {
      toast.error("تعذّر تحديث حالة المقال");
    },
  });

  const deletePost = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("blog_posts").delete().eq("id", id);
      if (error) {
        console.error("[BlogAdmin] Delete failed:", error);
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-blog-posts"] });
      toast.success("تم حذف المقال");
    },
    onError: () => {
      toast.error("تعذّر حذف المقال");
    },
  });

  const generatePost = async () => {
    setGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke("generate-blog-post");
      if (error) throw error;
      queryClient.invalidateQueries({ queryKey: ["admin-blog-posts"] });
      toast.success("تم توليد مقال جديد بنجاح!");
    } catch (e: any) {
      toast.error(e.message || "فشل توليد المقال");
    } finally {
      setGenerating(false);
    }
  };

  const published = posts.filter(p => p.status === "published").length;
  const drafts = posts.filter(p => p.status === "draft").length;

  return (
    <div className="space-y-4">
      {/* Stats + Generate */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 text-sm">
            <FileText size={14} className="text-primary" />
            <span className="text-muted-foreground">إجمالي:</span>
            <span className="font-medium">{posts.length}</span>
          </div>
          <div className="flex items-center gap-1.5 text-sm">
            <Eye size={14} className="text-emerald-500" />
            <span className="text-muted-foreground">منشور:</span>
            <span className="font-medium">{published}</span>
          </div>
          <div className="flex items-center gap-1.5 text-sm">
            <EyeOff size={14} className="text-amber-500" />
            <span className="text-muted-foreground">مسودة:</span>
            <span className="font-medium">{drafts}</span>
          </div>
        </div>
        <Button
          size="sm"
          onClick={generatePost}
          disabled={generating}
          className="gap-1.5"
        >
          {generating ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
          {generating ? "جاري التوليد..." : "توليد مقال بالذكاء"}
        </Button>
      </div>

      {/* Posts list */}
      {isLoading ? (
        <div className="flex justify-center py-8">
          <Loader2 size={20} className="animate-spin text-muted-foreground" />
        </div>
      ) : posts.length === 0 ? (
        <div className="text-center py-12 text-sm text-muted-foreground">
          <FileText size={28} className="mx-auto mb-3 opacity-30" />
          <p>لا توجد مقالات بعد</p>
          <p className="text-xs mt-1">اضغط "توليد مقال بالذكاء" لإنشاء أول مقال</p>
        </div>
      ) : (
        <div className="space-y-2">
          {posts.map((post) => (
            <div
              key={post.id}
              className="flex items-center justify-between p-3 rounded-xl border border-border/50 bg-card"
            >
              <div className="flex-1 min-w-0 ltr:mr-3 rtl:ml-3">
                <div className="flex items-center gap-2 mb-1">
                  <Badge
                    variant={post.status === "published" ? "default" : "secondary"}
                    className="text-[9px] px-1.5 py-0"
                  >
                    {post.status === "published" ? "منشور" : "مسودة"}
                  </Badge>
                  {post.generated_by_ai && (
                    <Badge variant="outline" className="text-[9px] px-1.5 py-0 gap-0.5">
                      <Sparkles size={8} /> AI
                    </Badge>
                  )}
                  {post.category_ar && (
                    <span className="text-[9px] text-muted-foreground">{post.category_ar}</span>
                  )}
                </div>
                <p className="text-sm font-medium truncate">{post.title_ar}</p>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
                    <Calendar size={9} />
                    {new Date(post.created_at).toLocaleDateString("ar-SA")}
                  </span>
                  {post.tags && post.tags.length > 0 && (
                    <span className="text-[10px] text-muted-foreground">
                      {(post.tags as string[]).slice(0, 3).join(" · ")}
                    </span>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-1">
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-7 w-7"
                  onClick={() =>
                    toggleStatus.mutate({
                      id: post.id,
                      newStatus: post.status === "published" ? "draft" : "published",
                    })
                  }
                  title={post.status === "published" ? "إخفاء" : "نشر"}
                >
                  {post.status === "published" ? <EyeOff size={13} /> : <Eye size={13} />}
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-7 w-7 text-destructive hover:text-destructive"
                  onClick={() => {
                    if (confirm("هل أنت متأكد من حذف هذا المقال؟")) {
                      deletePost.mutate(post.id);
                    }
                  }}
                  title="حذف"
                >
                  <Trash2 size={13} />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default BlogAdminPanel;
