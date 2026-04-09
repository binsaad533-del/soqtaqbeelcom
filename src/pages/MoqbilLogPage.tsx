import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { MessageSquare, Zap, Search, Download, Bot, User, CheckCircle, XCircle, Clock } from "lucide-react";
import { format } from "date-fns";

const ACTION_LABELS: Record<string, string> = {
  create_listing: "إنشاء إعلان",
  edit_my_listing: "تعديل إعلان",
  publish_my_listing: "نشر إعلان",
  delete_my_listing: "حذف إعلان",
  set_listing_location: "تحديد موقع",
  send_offer: "إرسال عرض",
  respond_to_offer: "الرد على عرض",
  show_interest: "إبداء اهتمام",
  search_listings: "بحث",
  get_listing_details: "عرض تفاصيل",
  track_my_listings: "تتبع إعلاناتي",
  tool_execution: "تنفيذ أداة",
};

export default function MoqbilLogPage() {
  const { user } = useAuth();
  const [search, setSearch] = useState("");
  const [actionFilter, setActionFilter] = useState("all");

  const { data: chatMessages = [], isLoading: loadingMessages } = useQuery({
    queryKey: ["moqbil-chat-log", user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("ai_chat_messages")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(200);
      return data || [];
    },
    enabled: !!user,
  });

  const { data: chatActions = [], isLoading: loadingActions } = useQuery({
    queryKey: ["moqbil-actions-log", user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("ai_chat_actions")
        .select("*")
        .order("executed_at", { ascending: false })
        .limit(200);
      return data || [];
    },
    enabled: !!user,
  });

  const filteredMessages = chatMessages.filter((m: any) => {
    if (search && !m.user_message?.includes(search) && !m.ai_response?.includes(search)) return false;
    if (actionFilter !== "all" && m.executed_action !== actionFilter && !m.executed_action?.includes(actionFilter)) return false;
    return true;
  });

  const filteredActions = chatActions.filter((a: any) => {
    if (search && !a.action_type?.includes(search)) return false;
    if (actionFilter !== "all" && a.action_type !== actionFilter) return false;
    return true;
  });

  const handleExportMessages = () => {
    const csvContent = [
      ["التاريخ", "الرسالة", "الرد", "النية", "الإجراء", "الحالة"].join(","),
      ...filteredMessages.map((m: any) =>
        [
          format(new Date(m.created_at), "yyyy-MM-dd HH:mm"),
          `"${(m.user_message || "").replace(/"/g, '""')}"`,
          `"${(m.ai_response || "").slice(0, 100).replace(/"/g, '""')}"`,
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
    a.download = `moqbil-log-${format(new Date(), "yyyy-MM-dd")}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (!user) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <p className="text-muted-foreground">يرجى تسجيل الدخول لعرض السجل</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 max-w-6xl" dir="rtl">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Bot className="w-7 h-7 text-primary" />
          <h1 className="text-2xl font-bold">سجل مقبل</h1>
        </div>
        <Button variant="outline" size="sm" onClick={handleExportMessages}>
          <Download className="w-4 h-4 ml-2" />
          تصدير
        </Button>
      </div>

      {/* Filters */}
      <Card className="mb-4">
        <CardContent className="pt-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="بحث في المحادثات..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pr-10"
              />
            </div>
            <Select value={actionFilter} onValueChange={setActionFilter}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="نوع العملية" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">الكل</SelectItem>
                <SelectItem value="create_listing">إنشاء إعلان</SelectItem>
                <SelectItem value="edit_my_listing">تعديل</SelectItem>
                <SelectItem value="publish_my_listing">نشر</SelectItem>
                <SelectItem value="search_listings">بحث</SelectItem>
                <SelectItem value="send_offer">عرض سعر</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
        <Card>
          <CardContent className="pt-4 text-center">
            <MessageSquare className="w-5 h-5 mx-auto mb-1 text-primary" />
            <p className="text-2xl font-bold">{chatMessages.length}</p>
            <p className="text-xs text-muted-foreground">محادثة</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 text-center">
            <Zap className="w-5 h-5 mx-auto mb-1 text-amber-500" />
            <p className="text-2xl font-bold">{chatActions.length}</p>
            <p className="text-xs text-muted-foreground">عملية</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 text-center">
            <CheckCircle className="w-5 h-5 mx-auto mb-1 text-green-500" />
            <p className="text-2xl font-bold">{chatActions.filter((a: any) => a.status === "success").length}</p>
            <p className="text-xs text-muted-foreground">ناجحة</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 text-center">
            <XCircle className="w-5 h-5 mx-auto mb-1 text-red-500" />
            <p className="text-2xl font-bold">{chatActions.filter((a: any) => a.status === "failed").length}</p>
            <p className="text-xs text-muted-foreground">فاشلة</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="messages" className="w-full">
        <TabsList className="w-full justify-start">
          <TabsTrigger value="messages" className="gap-2">
            <MessageSquare className="w-4 h-4" />
            المحادثات
          </TabsTrigger>
          <TabsTrigger value="actions" className="gap-2">
            <Zap className="w-4 h-4" />
            العمليات
          </TabsTrigger>
        </TabsList>

        <TabsContent value="messages">
          {loadingMessages ? (
            <div className="text-center py-10 text-muted-foreground">جاري التحميل...</div>
          ) : filteredMessages.length === 0 ? (
            <div className="text-center py-10 text-muted-foreground">لا توجد محادثات بعد</div>
          ) : (
            <ScrollArea className="h-[600px]">
              <div className="space-y-3">
                {filteredMessages.map((msg: any) => (
                  <Card key={msg.id} className="overflow-hidden">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <Clock className="w-3 h-3 text-muted-foreground" />
                          <span className="text-xs text-muted-foreground">
                            {format(new Date(msg.created_at), "yyyy/MM/dd - HH:mm")}
                          </span>
                        </div>
                        <div className="flex gap-1">
                          {msg.detected_intent && (
                            <Badge variant="secondary" className="text-xs">
                              {ACTION_LABELS[msg.detected_intent] || msg.detected_intent}
                            </Badge>
                          )}
                          <Badge variant={msg.status === "success" ? "default" : "destructive"} className="text-xs">
                            {msg.status === "success" ? "نجاح" : "فشل"}
                          </Badge>
                        </div>
                      </div>
                      {/* User message */}
                      <div className="flex items-start gap-2 mb-2">
                        <User className="w-4 h-4 mt-1 text-primary shrink-0" />
                        <p className="text-sm bg-muted/50 rounded-lg p-2 flex-1">{msg.user_message}</p>
                      </div>
                      {/* AI response */}
                      {msg.ai_response && (
                        <div className="flex items-start gap-2">
                          <Bot className="w-4 h-4 mt-1 text-amber-600 shrink-0" />
                          <p className="text-sm bg-primary/5 rounded-lg p-2 flex-1 line-clamp-3">{msg.ai_response}</p>
                        </div>
                      )}
                      {msg.executed_action && (
                        <div className="mt-2 pt-2 border-t">
                          <span className="text-xs text-muted-foreground">الإجراءات: </span>
                          {msg.executed_action.split(", ").map((a: string, i: number) => (
                            <Badge key={i} variant="outline" className="text-xs ml-1">
                              {ACTION_LABELS[a] || a}
                            </Badge>
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            </ScrollArea>
          )}
        </TabsContent>

        <TabsContent value="actions">
          {loadingActions ? (
            <div className="text-center py-10 text-muted-foreground">جاري التحميل...</div>
          ) : filteredActions.length === 0 ? (
            <div className="text-center py-10 text-muted-foreground">لا توجد عمليات بعد</div>
          ) : (
            <ScrollArea className="h-[600px]">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-right">التاريخ</TableHead>
                    <TableHead className="text-right">العملية</TableHead>
                    <TableHead className="text-right">المرجع</TableHead>
                    <TableHead className="text-right">الحالة</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredActions.map((action: any) => (
                    <TableRow key={action.id}>
                      <TableCell className="text-sm">
                        {format(new Date(action.executed_at), "MM/dd HH:mm")}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {ACTION_LABELS[action.action_type] || action.action_type}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {action.reference_type && (
                          <span>{action.reference_type}: {action.reference_id?.slice(0, 8)}...</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {action.status === "success" ? (
                          <Badge className="bg-green-100 text-green-700">نجاح</Badge>
                        ) : (
                          <Badge variant="destructive">فشل</Badge>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </ScrollArea>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
