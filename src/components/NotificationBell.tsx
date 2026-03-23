import { useState, useRef, useEffect } from "react";
import { Bell, Check } from "lucide-react";
import { useNotifications, type Notification } from "@/hooks/useNotifications";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";

const NotificationBell = () => {
  const { notifications, unreadCount, markAsRead, markAllAsRead } = useNotifications();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    if (open) document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const handleClick = (n: Notification) => {
    if (!n.is_read) markAsRead(n.id);
    if (n.reference_type === "deal" && n.reference_id) {
      navigate(`/negotiate/${n.reference_id}`);
    } else if (n.reference_type === "listing" && n.reference_id) {
      navigate(`/listing/${n.reference_id}`);
    } else if (n.reference_type === "agreement" && n.reference_id) {
      navigate(`/agreement/${n.reference_id}`);
    }
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

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="relative p-2 rounded-lg text-muted-foreground hover:text-foreground transition-colors"
      >
        <Bell size={17} strokeWidth={1.5} />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 w-[14px] h-[14px] rounded-full bg-primary text-primary-foreground text-[9px] font-medium flex items-center justify-center leading-none">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute left-0 top-full mt-2 w-[320px] bg-card rounded-xl shadow-lg border border-border/40 overflow-hidden z-50 rtl:left-auto rtl:right-0">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-border/20">
            <span className="text-sm font-medium">الإشعارات</span>
            {unreadCount > 0 && (
              <button
                onClick={markAllAsRead}
                className="text-[11px] text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1"
              >
                <Check size={12} />
                قراءة الكل
              </button>
            )}
          </div>

          {/* List */}
          <div className="max-h-[360px] overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="py-10 text-center">
                <Bell size={20} className="mx-auto mb-2 text-muted-foreground/40" />
                <p className="text-xs text-muted-foreground">لا توجد إشعارات</p>
              </div>
            ) : (
              notifications.slice(0, 20).map((n) => (
                <button
                  key={n.id}
                  onClick={() => handleClick(n)}
                  className={cn(
                    "w-full text-right px-4 py-3 hover:bg-muted/30 transition-colors border-b border-border/10 last:border-0",
                    !n.is_read && "bg-primary/[0.03]"
                  )}
                >
                  <div className="flex items-start gap-2.5">
                    {!n.is_read && (
                      <span className="mt-1.5 w-2 h-2 rounded-full bg-primary shrink-0" />
                    )}
                    <div className="flex-1 min-w-0">
                      <p className={cn("text-xs leading-relaxed", !n.is_read ? "font-medium text-foreground" : "text-muted-foreground")}>
                        {n.title}
                      </p>
                      {n.body && (
                        <p className="text-[11px] text-muted-foreground mt-0.5 line-clamp-2">{n.body}</p>
                      )}
                      <p className="text-[10px] text-muted-foreground/60 mt-1">{timeAgo(n.created_at)}</p>
                    </div>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default NotificationBell;
