import { useState, useRef, useEffect, useMemo } from "react";
import { Bell, Check, MessageCircle, DollarSign, FileText, Shield, Info, Filter } from "lucide-react";
import { useNotifications, type Notification } from "@/hooks/useNotifications";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";

type NotifFilter = "all" | "unread" | "deals" | "offers" | "messages";

const ICON_MAP: Record<string, { icon: typeof Bell; color: string }> = {
  deal: { icon: FileText, color: "text-primary" },
  offer: { icon: DollarSign, color: "text-emerald-500" },
  message: { icon: MessageCircle, color: "text-sky-500" },
  security: { icon: Shield, color: "text-destructive" },
  info: { icon: Info, color: "text-muted-foreground" },
};

function getNotifIcon(type: string, refType: string | null) {
  if (refType === "deal") return ICON_MAP.deal;
  if (type === "offer" || refType === "offer") return ICON_MAP.offer;
  if (type === "message" || refType === "message") return ICON_MAP.message;
  if (type === "security") return ICON_MAP.security;
  return ICON_MAP.info;
}

const NotificationBell = () => {
  const { notifications, unreadCount, markAsRead, markAllAsRead } = useNotifications();
  const [open, setOpen] = useState(false);
  const [filter, setFilter] = useState<NotifFilter>("all");
  const ref = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    if (open) document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const filtered = useMemo(() => {
    let items = notifications;
    if (filter === "unread") items = items.filter(n => !n.is_read);
    else if (filter === "deals") items = items.filter(n => n.reference_type === "deal" || n.type === "deal");
    else if (filter === "offers") items = items.filter(n => n.type === "offer" || n.reference_type === "offer");
    else if (filter === "messages") items = items.filter(n => n.type === "message" || n.reference_type === "message");
    return items.slice(0, 30);
  }, [notifications, filter]);

  // Group by date
  const grouped = useMemo(() => {
    const groups: { label: string; items: Notification[] }[] = [];
    const today = new Date();
    const todayStr = today.toDateString();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toDateString();

    let currentLabel = "";
    let currentItems: Notification[] = [];

    for (const n of filtered) {
      const dateStr = new Date(n.created_at).toDateString();
      let label: string;
      if (dateStr === todayStr) label = "اليوم";
      else if (dateStr === yesterdayStr) label = "أمس";
      else label = new Date(n.created_at).toLocaleDateString("ar-SA", { day: "numeric", month: "short" });

      if (label !== currentLabel) {
        if (currentItems.length > 0) groups.push({ label: currentLabel, items: currentItems });
        currentLabel = label;
        currentItems = [n];
      } else {
        currentItems.push(n);
      }
    }
    if (currentItems.length > 0) groups.push({ label: currentLabel, items: currentItems });
    return groups;
  }, [filtered]);

  const handleClick = (n: Notification) => {
    if (!n.is_read) markAsRead(n.id);
    if (n.reference_type === "deal" && n.reference_id) navigate(`/negotiate/${n.reference_id}`);
    else if (n.reference_type === "listing" && n.reference_id) navigate(`/listing/${n.reference_id}`);
    else if (n.reference_type === "agreement" && n.reference_id) navigate(`/agreement/${n.reference_id}`);
    else if (n.reference_type === "message" && n.reference_id) navigate(`/messages`);
    setOpen(false);
  };

  const timeAgo = (dateStr: string) => {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "الآن";
    if (mins < 60) return `${mins}د`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}س`;
    return `${Math.floor(hrs / 24)}ي`;
  };

  const filters: { key: NotifFilter; label: string }[] = [
    { key: "all", label: "الكل" },
    { key: "unread", label: "غير مقروء" },
    { key: "deals", label: "صفقات" },
    { key: "offers", label: "عروض" },
    { key: "messages", label: "رسائل" },
  ];

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="relative p-2 rounded-lg text-muted-foreground hover:text-foreground transition-colors"
      >
        <Bell size={17} strokeWidth={1.5} />
        {unreadCount > 0 && (
          <span className="absolute top-0.5 right-0.5 min-w-[16px] h-[16px] rounded-full bg-primary text-primary-foreground text-[9px] font-semibold flex items-center justify-center leading-none px-1 animate-in fade-in zoom-in-50 duration-200">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute left-0 top-full mt-2 w-[360px] bg-card rounded-2xl shadow-xl border border-border/30 overflow-hidden z-50 rtl:left-auto rtl:right-0 animate-in fade-in slide-in-from-top-2 duration-200">
          {/* Header */}
          <div className="px-4 pt-4 pb-2">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold">الإشعارات</span>
                {unreadCount > 0 && (
                  <span className="text-[10px] font-medium bg-primary/10 text-primary px-1.5 py-0.5 rounded-full">
                    {unreadCount} جديد
                  </span>
                )}
              </div>
              {unreadCount > 0 && (
                <button
                  onClick={markAllAsRead}
                  className="text-[11px] text-primary hover:text-primary/80 transition-colors flex items-center gap-1 font-medium"
                >
                  <Check size={12} />
                  قراءة الكل
                </button>
              )}
            </div>

            {/* Filter chips */}
            <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none pb-1">
              {filters.map((f) => (
                <button
                  key={f.key}
                  onClick={() => setFilter(f.key)}
                  className={cn(
                    "text-[10px] px-2.5 py-1 rounded-full whitespace-nowrap transition-colors font-medium",
                    filter === f.key
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted/50 text-muted-foreground hover:bg-muted"
                  )}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>

          {/* List */}
          <div className="max-h-[400px] overflow-y-auto">
            {filtered.length === 0 ? (
              <div className="py-12 text-center">
                <Bell size={24} className="mx-auto mb-2 text-muted-foreground/30" />
                <p className="text-xs text-muted-foreground">
                  {filter === "unread" ? "لا توجد إشعارات غير مقروءة" : "لا توجد إشعارات"}
                </p>
              </div>
            ) : (
              grouped.map((group) => (
                <div key={group.label}>
                  <div className="px-4 py-1.5 bg-muted/20">
                    <span className="text-[10px] font-medium text-muted-foreground">{group.label}</span>
                  </div>
                  {group.items.map((n) => {
                    const iconInfo = getNotifIcon(n.type, n.reference_type);
                    const Icon = iconInfo.icon;
                    return (
                      <button
                        key={n.id}
                        onClick={() => handleClick(n)}
                        className={cn(
                          "w-full text-right px-4 py-3 hover:bg-muted/30 transition-colors border-b border-border/5 last:border-0 group/item",
                          !n.is_read && "bg-primary/[0.03]"
                        )}
                      >
                        <div className="flex items-start gap-3">
                          <div className={cn(
                            "w-8 h-8 rounded-full flex items-center justify-center shrink-0 mt-0.5",
                            !n.is_read ? "bg-primary/10" : "bg-muted/40"
                          )}>
                            <Icon size={14} className={!n.is_read ? iconInfo.color : "text-muted-foreground/50"} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className={cn(
                              "text-xs leading-relaxed",
                              !n.is_read ? "font-medium text-foreground" : "text-muted-foreground"
                            )}>
                              {n.title}
                            </p>
                            {n.body && (
                              <p className="text-[11px] text-muted-foreground/70 mt-0.5 line-clamp-2">{n.body}</p>
                            )}
                            <p className="text-[10px] text-muted-foreground/50 mt-1 tabular-nums">{timeAgo(n.created_at)}</p>
                          </div>
                          {!n.is_read && (
                            <span className="mt-2 w-2 h-2 rounded-full bg-primary shrink-0 group-hover/item:ring-2 group-hover/item:ring-primary/20 transition-all" />
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default NotificationBell;
