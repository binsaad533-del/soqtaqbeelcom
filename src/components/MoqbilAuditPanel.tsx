import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Search, Download, Bot, AlertTriangle, CheckCircle, XCircle, MessageSquare, Zap, ThumbsUp, ThumbsDown } from "lucide-react";
import { format } from "date-fns";

const ACTION_LABELS: Record<string, string> = {
  create_listing: "إنشاء إعلان",
  edit_my_listing: "تعديل إعلان",
  publish_my_listing: "نشر إعلان",
  delete_my_listing: "حذف إعلان",
  search_listings: "بحث",
  send_offer: "عرض سعر",
  respond_to_offer: "الرد على عرض",
  show_interest: "إبداء اهتمام",
};

export default function MoqbilAuditPanel() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [actionFilter, setActionFilter] = useState("all");

  const { data: allMessages = [], isLoading: loadingMsgs } = useQuery({
    queryKey: ["admin-moqbil-messages"],
    queryFn: async () => {
      const { data } = await supabase
        .from("ai_chat_messages")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(500);
      return data || [];
    },
  });

  const { data: allActions = [], isLoading: loadingActions } = useQuery({
    queryKey: ["admin-moqbil-actions"],
    queryFn: async () => {
      const { data } = await supabase
        .from("ai_chat_actions")
        .select("*")
        .order("executed_at", { ascending: false })
        .limit(500);
      return data || [];
    },
  });

  const { data: allFeedback = [] } = useQuery({
    queryKey: ["admin-moqbil-feedback"],
    queryFn: async () => {
      const { data } = await supabase
        .from("ai_chat_feedback" as any)
        .select("*")
        .order("created_at", { ascending: false })
        .limit(500);
      return (data || []) as any[];
    },
  });

  const failedActions = allActions.filter((a: any) => a.status === "failed");
  const successActions = allActions.filter((a: any) => a.status === "success");
  const uniqueUsers = new Set(allMessages.map((m: any) => m.user_id)).size;
  const positiveFeedback = allFeedback.filter((f: any) => f.rating === "positive");
  const negativeFeedback = allFeedback.filter((f: any) => f.rating === "negative");
  const satisfactionRate = allFeedback.length > 0 ? Math.round((positiveFeedback.length / allFeedback.length) * 100) : 0;

  const filtered = allMessages.filter((m: any) => {
    if (search && !m.user_message?.includes(search) && !m.ai_response?.includes(search) && !m.user_id?.includes(search)) return false;
    if (statusFilter !== "all" && m.status !== statusFilter) return false;
    if (actionFilter !== "all" && !m.executed_action?.includes(actionFilter)) return false;
    return true;
  });

  const handleExport = () => {
    const csvContent = [
      ["التاريخ", "المستخدم", "الرسالة", "النية", "الإجراء", "الحالة"].join(","),
      ...filtered.map((m: any) =>
        [
          format(new Date(m.created_at), "yyyy-MM-dd HH:mm"),
          m.user_id?.slice(0, 8),
          `"${(m.user_message || "").replace(/"/g, '""').slice(0, 80)}"`,
          m.detected_intent || "",
          m.executed_action || "",
          m.status,
        ].join(",")
      ),
    ].join("\n");
    const blob = new Blob(["\uFEFF" + csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `moqbil-audit-${format(new Date(), "yyyy-MM-dd")}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-4">
      {/* KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
        <Card>
          <CardContent className="pt-3 text-center">
            <MessageSquare className="w-4 h-4 mx-auto mb-1 text-primary" />
            <p className="text-xl font-bold">{allMessages.length}</p>
            <p className="text-xs text-muted-foreground">محادثة</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-3 text-center">
            <Zap className="w-4 h-4 mx-auto mb-1 text-amber-500" />
            <p className="text-xl font-bold">{allActions.length}</p>
            <p className="text-xs text-muted-foreground">عملية</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-3 text-center">
            <CheckCircle className="w-4 h-4 mx-auto mb-1 text-green-500" />
            <p className="text-xl font-bold">{successActions.length}</p>
            <p className="text-xs text-muted-foreground">ناجحة</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-3 text-center">
            <XCircle className="w-4 h-4 mx-auto mb-1 text-red-500" />
            <p className="text-xl font-bold">{failedActions.length}</p>
            <p className="text-xs text-muted-foreground">فاشلة</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-3 text-center">
            <Bot className="w-4 h-4 mx-auto mb-1 text-blue-500" />
            <p className="text-xl font-bold">{uniqueUsers}</p>
            <p className="text-xs text-muted-foreground">مستخدم</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-3 text-center">
            <ThumbsUp className="w-4 h-4 mx-auto mb-1 text-green-500" />
            <p className="text-xl font-bold">{positiveFeedback.length}</p>
            <p className="text-xs text-muted-foreground">👍 إيجابي</p>
          </CardContent>
        </Card>
        <Card className={negativeFeedback.length > 5 ? "border-destructive/30" : ""}>
          <CardContent className="pt-3 text-center">
            <ThumbsDown className="w-4 h-4 mx-auto mb-1 text-red-500" />
            <p className="text-xl font-bold">{negativeFeedback.length}</p>
            <p className="text-xs text-muted-foreground">👎 سلبي</p>
          </CardContent>
        </Card>
      </div>

      {/* Satisfaction Rate */}
      {allFeedback.length > 0 && (
        <Card>
          <CardContent className="pt-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">نسبة الرضا عن مقبل</span>
              <span className={`text-lg font-bold ${satisfactionRate >= 70 ? "text-green-600" : satisfactionRate >= 40 ? "text-amber-600" : "text-red-600"}`}>
                {satisfactionRate}%
              </span>
            </div>
            <div className="w-full h-2 bg-muted rounded-full mt-2 overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${satisfactionRate >= 70 ? "bg-green-500" : satisfactionRate >= 40 ? "bg-amber-500" : "bg-red-500"}`}
                style={{ width: `${satisfactionRate}%` }}
              />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Negative Feedback Details */}
      {negativeFeedback.length > 0 && (
        <Card className="border-amber-200 bg-amber-50 dark:bg-amber-950/20">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2 text-amber-700">
              <ThumbsDown className="w-4 h-4" />
              تقييمات سلبية تحتاج تحسين ({negativeFeedback.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {negativeFeedback.slice(0, 8).map((f: any) => (
                <div key={f.id} className="text-xs p-2 rounded-lg bg-background/50 border border-border/30">
                  <div className="flex justify-between mb-1">
                    <span className="font-medium truncate max-w-[60%]">{f.user_message_snapshot?.slice(0, 60)}</span>
                    <span className="text-muted-foreground shrink-0">{format(new Date(f.created_at), "MM/dd HH:mm")}</span>
                  </div>
                  {f.comment && <p className="text-destructive/80">💬 {f.comment}</p>}
                  {f.error_category && (
                    <Badge variant="outline" className="text-[9px] mt-1">{f.error_category}</Badge>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Failed Actions Alert */}
      {failedActions.length > 0 && (
        <Card className="border-red-200 bg-red-50 dark:bg-red-950/20">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2 text-red-700">
              <AlertTriangle className="w-4 h-4" />
              عمليات فاشلة ({failedActions.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-1">
              {failedActions.slice(0, 5).map((a: any) => (
                <div key={a.id} className="text-xs flex justify-between">
                  <span>{ACTION_LABELS[a.action_type] || a.action_type}</span>
                  <span className="text-muted-foreground">{a.error_message?.slice(0, 50)}</span>
                  <span>{format(new Date(a.executed_at), "MM/dd HH:mm")}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="بحث بالكلمات أو معرف المستخدم..." value={search} onChange={(e) => setSearch(e.target.value)} className="pr-10" />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">الكل</SelectItem>
            <SelectItem value="success">ناجحة</SelectItem>
            <SelectItem value="failed">فاشلة</SelectItem>
          </SelectContent>
        </Select>
        <Select value={actionFilter} onValueChange={setActionFilter}>
          <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">كل العمليات</SelectItem>
            <SelectItem value="create_listing">إنشاء إعلان</SelectItem>
            <SelectItem value="edit_my_listing">تعديل</SelectItem>
            <SelectItem value="publish_my_listing">نشر</SelectItem>
            <SelectItem value="search_listings">بحث</SelectItem>
          </SelectContent>
        </Select>
        <Button variant="outline" size="sm" onClick={handleExport}>
          <Download className="w-4 h-4 ml-1" />
          تصدير
        </Button>
      </div>

      {/* Table */}
      {loadingMsgs ? (
        <div className="text-center py-8 text-muted-foreground">جاري التحميل...</div>
      ) : (
        <ScrollArea className="h-[500px]">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-right">التاريخ</TableHead>
                <TableHead className="text-right">المستخدم</TableHead>
                <TableHead className="text-right">الرسالة</TableHead>
                <TableHead className="text-right">النية</TableHead>
                <TableHead className="text-right">الإجراء</TableHead>
                <TableHead className="text-right">الحالة</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((msg: any) => (
                <TableRow key={msg.id}>
                  <TableCell className="text-xs whitespace-nowrap">
                    {format(new Date(msg.created_at), "MM/dd HH:mm")}
                  </TableCell>
                  <TableCell className="text-xs font-mono">{msg.user_id?.slice(0, 8)}</TableCell>
                  <TableCell className="text-xs max-w-48 truncate">{msg.user_message}</TableCell>
                  <TableCell>
                    {msg.detected_intent && (
                      <Badge variant="secondary" className="text-xs">
                        {ACTION_LABELS[msg.detected_intent] || msg.detected_intent}
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    {msg.executed_action && (
                      <Badge variant="outline" className="text-xs">
                        {msg.executed_action.split(", ").map((a: string) => ACTION_LABELS[a] || a).join(", ")}
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    {msg.status === "success" ? (
                      <CheckCircle className="w-4 h-4 text-green-500" />
                    ) : (
                      <XCircle className="w-4 h-4 text-red-500" />
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </ScrollArea>
      )}
    </div>
  );
}
