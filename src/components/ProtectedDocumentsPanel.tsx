import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  FileText,
  Shield,
  Lock,
  Globe,
  Clock,
  CheckCircle2,
  XCircle,
  ExternalLink,
  Loader2,
  RefreshCw,
  LogIn,
  KeyRound,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useDocumentAccess } from "@/hooks/useDocumentAccess";
import { useFileClassifications, type FileClassification } from "@/hooks/useFileClassifications";
import RequestAccessDialog from "./RequestAccessDialog";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useTranslation } from "react-i18next";

interface LegacyDocItem {
  id: string;
  label: string;
  url?: string;
  type?: string;
}

interface Props {
  listingId: string;
  ownerId: string;
  /** Legacy fallback documents from listing.documents JSONB (used when no file_classifications exist). */
  legacyDocuments: LegacyDocItem[];
}

/** Friendly label for a single classification row. */
function fileLabel(c: FileClassification): string {
  if (c.final_subcategory) {
    const map: Record<string, string> = {
      commercial_register: "سجل تجاري",
      lease_contract: "عقد إيجار",
      municipality_license: "رخصة بلدية",
      civil_defense: "رخصة دفاع مدني",
      other: "وثيقة أخرى",
    };
    if (map[c.final_subcategory]) return map[c.final_subcategory];
  }
  if (c.final_category === "legal_document") return "وثيقة قانونية";
  if (c.final_category === "invoice_document") return "فاتورة / عرض سعر";
  return c.file_name || "مستند";
}

const ProtectedDocumentsPanel = ({ listingId, ownerId, legacyDocuments }: Props) => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { classifications, isLoading: classificationsLoading } =
    useFileClassifications(listingId);
  const {
    status,
    accessRequest,
    isLoading: accessLoading,
    isOwner,
    requestAccess,
    isRequesting,
    getSignedUrl,
  } = useDocumentAccess({ listingId, ownerId });

  const [dialogOpen, setDialogOpen] = useState(false);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  // Protected docs derived from file_classifications
  const protectedDocs = useMemo(
    () =>
      classifications.filter(
        (c) =>
          (c.final_category === "legal_document" ||
            c.final_category === "invoice_document") &&
          c.is_protected,
      ),
    [classifications],
  );

  // Public docs from classifications (asset lists, or unprotected legal/invoice)
  const publicClassifiedDocs = useMemo(
    () =>
      classifications.filter(
        (c) =>
          (c.final_category === "legal_document" ||
            c.final_category === "invoice_document" ||
            c.final_category === "asset_list") &&
          !c.is_protected,
      ),
    [classifications],
  );

  const summary = useMemo(
    () => ({
      legal: protectedDocs.filter((d) => d.final_category === "legal_document").length,
      invoice: protectedDocs.filter((d) => d.final_category === "invoice_document").length,
    }),
    [protectedDocs],
  );

  const totalProtected = protectedDocs.length;

  // ── No documents at all → render nothing (matches old behavior) ──
  const hasAnything =
    legacyDocuments.length > 0 ||
    classifications.length > 0 ||
    classificationsLoading;
  if (!hasAnything) return null;

  const handleDownload = async (fcId: string) => {
    setDownloadingId(fcId);
    try {
      const res = await getSignedUrl(fcId);
      window.open(res.url, "_blank", "noopener,noreferrer");
    } catch (err) {
      const e = err as Error;
      toast.error(e.message || t("protectedDocs.toasts.openFailed"));
    } finally {
      setDownloadingId(null);
    }
  };

  // ═══════════ Owner View ═══════════
  if (isOwner) {
    // Show every classified file + legacy fallback for non-classified listings
    const ownerDocs: Array<{ id: string; label: string; isProtected: boolean; url?: string }> = [];
    for (const c of classifications) {
      if (
        c.final_category === "legal_document" ||
        c.final_category === "invoice_document" ||
        c.final_category === "asset_list"
      ) {
        ownerDocs.push({ id: c.id, label: fileLabel(c, t), isProtected: c.is_protected });
      }
    }
    if (ownerDocs.length === 0 && legacyDocuments.length > 0) {
      legacyDocuments.forEach((d) =>
        ownerDocs.push({ id: d.id, label: d.label, isProtected: false, url: d.url }),
      );
    }

    if (ownerDocs.length === 0) return null;

    return (
      <div className="rounded-xl border border-border/40 bg-card p-4" dir="rtl">
        <div className="flex items-center gap-2 mb-2">
          <FileText size={16} strokeWidth={1.3} className="text-primary" />
          <span className="text-sm font-medium text-foreground">{t("listing.documents")}</span>
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground mb-3">
          <Shield size={12} />
          <span>{ownerDocs.length} {t("protectedDocs.ownerNote", { count: ownerDocs.length })}</span>
        </div>
        <div className="space-y-2">
          {ownerDocs.map((doc) => (
            <div
              key={doc.id}
              className="flex items-center justify-between gap-3 rounded-lg border border-border/50 bg-muted/20 px-3 py-2 text-xs text-foreground"
            >
              <div className="flex min-w-0 items-center gap-2">
                <FileText size={12} className="shrink-0 text-primary" />
                <span className="truncate">{doc.label}</span>
                {doc.isProtected ? (
                  <span className="inline-flex items-center gap-1 rounded-md bg-amber-500/10 px-1.5 py-0.5 text-[10px] text-amber-600">
                    <Lock size={9} strokeWidth={1.5} />
                    {t("protectedDocs.protected")}
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 rounded-md bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">
                    <Globe size={9} strokeWidth={1.5} />
                    {t("protectedDocs.public")}
                  </span>
                )}
              </div>
              {doc.url ? (
                <a
                  href={doc.url}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 text-primary shrink-0 hover:underline"
                >
                  {t("protectedDocs.open")}
                  <ExternalLink size={12} />
                </a>
              ) : (
                <button
                  onClick={() => handleDownload(doc.id)}
                  disabled={downloadingId === doc.id}
                  className="inline-flex items-center gap-1 text-primary shrink-0 hover:underline disabled:opacity-50"
                >
                  {downloadingId === doc.id ? (
                    <Loader2 size={12} className="animate-spin" />
                  ) : (
                    <>
                      {t("protectedDocs.open")}
                      <ExternalLink size={12} />
                    </>
                  )}
                </button>
              )}
            </div>
          ))}
        </div>
      </div>
    );
  }

  // ═══════════ Non-owner Views ═══════════
  // If no protected docs at all → behave like the old public-labels-only fallback
  // (or show legacy labels for old listings)
  const hasProtected = totalProtected > 0;
  const hasLegacyLabels = legacyDocuments.length > 0 && classifications.length === 0;

  if (!hasProtected && !hasLegacyLabels && publicClassifiedDocs.length === 0) {
    return null;
  }

  return (
    <>
      <div className="rounded-xl border border-border/40 bg-card p-4" dir="rtl">
        <div className="flex items-center justify-between gap-2 mb-3">
          <div className="flex items-center gap-2">
            <FileText size={16} strokeWidth={1.3} className="text-primary" />
            <span className="text-sm font-medium text-foreground">
              {t("listing.documents")}
              {hasProtected && (
                <span className="text-muted-foreground"> ({totalProtected} {t("protectedDocs.protectedSuffix")})</span>
              )}
            </span>
          </div>
          <StatusBadge status={status} />
        </div>

        {/* Public classified docs — always visible */}
        {publicClassifiedDocs.length > 0 && (
          <div className="space-y-2 mb-3">
            {publicClassifiedDocs.map((c) => (
              <button
                key={c.id}
                onClick={() => handleDownload(c.id)}
                disabled={downloadingId === c.id}
                className="w-full flex items-center justify-between gap-3 rounded-lg border border-border/50 bg-muted/20 px-3 py-2 text-xs text-foreground hover:bg-muted/40 transition-colors disabled:opacity-50"
              >
                <div className="flex min-w-0 items-center gap-2">
                  <Globe size={11} className="shrink-0 text-muted-foreground" />
                  <span className="truncate">{fileLabel(c, t)}</span>
                </div>
                {downloadingId === c.id ? (
                  <Loader2 size={12} className="animate-spin text-primary" />
                ) : (
                  <ExternalLink size={12} className="text-primary shrink-0" />
                )}
              </button>
            ))}
          </div>
        )}

        {/* Protected docs — labels only unless approved */}
        {(hasProtected || hasLegacyLabels) && (
          <>
            {status !== "approved" && (
              <div className="flex flex-wrap gap-2 mb-3">
                {hasProtected
                  ? protectedDocs.map((c) => (
                      <span
                        key={c.id}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-muted text-[11px] text-muted-foreground"
                      >
                        <Lock size={10} strokeWidth={1.5} />
                        {fileLabel(c, t)}
                      </span>
                    ))
                  : legacyDocuments.map((doc) => (
                      <span
                        key={doc.id}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-muted text-[11px] text-muted-foreground"
                      >
                        <Lock size={10} strokeWidth={1.5} />
                        {doc.type || doc.label}
                      </span>
                    ))}
              </div>
            )}

            {status === "approved" && hasProtected && (
              <div className="space-y-2 mb-3">
                {protectedDocs.map((c) => (
                  <button
                    key={c.id}
                    onClick={() => handleDownload(c.id)}
                    disabled={downloadingId === c.id}
                    className="w-full flex items-center justify-between gap-3 rounded-lg border border-emerald-500/30 bg-emerald-500/5 px-3 py-2 text-xs text-foreground hover:bg-emerald-500/10 transition-colors disabled:opacity-50"
                  >
                    <div className="flex min-w-0 items-center gap-2">
                      <FileText size={12} className="shrink-0 text-emerald-600" />
                      <span className="truncate">{fileLabel(c, t)}</span>
                    </div>
                    {downloadingId === c.id ? (
                      <Loader2 size={12} className="animate-spin text-emerald-600" />
                    ) : (
                      <ExternalLink size={12} className="text-emerald-600 shrink-0" />
                    )}
                  </button>
                ))}
              </div>
            )}

            {/* Action area per state */}
            <ActionArea
              status={status}
              accessRequest={accessRequest}
              loading={accessLoading || isRequesting}
              onRequestClick={() => setDialogOpen(true)}
              onLoginClick={() => navigate("/login")}
            />
          </>
        )}
      </div>

      <RequestAccessDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        summary={summary}
        isRequesting={isRequesting}
        onSubmit={async (msg) => requestAccess(msg)}
      />
    </>
  );
};

// ─────────────────────────────────────────────────────────────
// Helper components
// ─────────────────────────────────────────────────────────────

const StatusBadge = ({ status }: { status: string }) => {
  const { t } = useTranslation();
  const config: Record<
    string,
    { labelKey: string; className: string; Icon: typeof Lock } | null
  > = {
    approved: {
      labelKey: "protectedDocs.status.approved",
      className: "bg-emerald-500/10 text-emerald-600",
      Icon: CheckCircle2,
    },
    pending: {
      labelKey: "protectedDocs.status.pending",
      className: "bg-amber-500/10 text-amber-600",
      Icon: Clock,
    },
    rejected: {
      labelKey: "protectedDocs.status.rejected",
      className: "bg-destructive/10 text-destructive",
      Icon: XCircle,
    },
    expired: {
      labelKey: "protectedDocs.status.expired",
      className: "bg-muted text-muted-foreground",
      Icon: Clock,
    },
    no_request: null,
    guest: null,
    owner: null,
  };
  const c = config[status];
  if (!c) return null;
  const Icon = c.Icon;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px]",
        c.className,
      )}
    >
      <Icon size={10} strokeWidth={1.5} />
      {t(c.labelKey)}
    </span>
  );
};

interface ActionAreaProps {
  status: string;
  accessRequest: { created_at: string; rejection_reason: string | null } | null;
  loading: boolean;
  onRequestClick: () => void;
  onLoginClick: () => void;
}

const ActionArea = ({
  status,
  accessRequest,
  loading,
  onRequestClick,
  onLoginClick,
}: ActionAreaProps) => {
  const { t } = useTranslation();
  if (status === "guest") {
    return (
      <div className="flex flex-col gap-2 rounded-lg bg-muted/30 p-3">
        <p className="text-xs text-muted-foreground flex items-center gap-1.5">
          <Lock size={11} strokeWidth={1.5} />
          {t("listing.loginToViewDocs")}
        </p>
        <Button size="sm" variant="outline" onClick={onLoginClick} className="w-fit">
          <LogIn size={13} className="ml-1.5" strokeWidth={1.5} />
          {t("common.login")}
        </Button>
      </div>
    );
  }

  if (status === "no_request") {
    return (
      <div className="flex flex-col gap-2 rounded-lg bg-muted/30 p-3">
        <p className="text-xs text-muted-foreground flex items-center gap-1.5">
          <Lock size={11} strokeWidth={1.5} />
          {t("listing.docsProtectedAskSeller")}
        </p>
        <Button
          size="sm"
          onClick={onRequestClick}
          disabled={loading}
          className="w-fit"
        >
          <KeyRound size={13} className="ml-1.5" strokeWidth={1.5} />
          {t("listing.requestAccess")}
        </Button>
      </div>
    );
  }

  if (status === "pending" && accessRequest) {
    const sentAt = formatRelative(accessRequest.created_at, t);
    return (
      <div className="rounded-lg bg-amber-500/5 border border-amber-500/20 p-3">
        <p className="text-xs text-amber-700 dark:text-amber-400 flex items-center gap-1.5">
          <Clock size={11} strokeWidth={1.5} />
          {t("protectedDocs.action.pendingReview")}
        </p>
        <p className="text-[11px] text-muted-foreground mt-1">{t("protectedDocs.action.sentAt", { time: sentAt })}</p>
      </div>
    );
  }

  if (status === "rejected" && accessRequest) {
    return (
      <div className="rounded-lg bg-destructive/5 border border-destructive/20 p-3 space-y-2">
        <p className="text-xs text-destructive flex items-center gap-1.5">
          <XCircle size={11} strokeWidth={1.5} />
          {t("protectedDocs.action.rejected")}
        </p>
        {accessRequest.rejection_reason && (
          <p className="text-[11px] text-muted-foreground">
            {t("protectedDocs.action.reason")}: {accessRequest.rejection_reason}
          </p>
        )}
        <Button size="sm" variant="outline" onClick={onRequestClick} disabled={loading}>
          <RefreshCw size={12} className="ml-1.5" strokeWidth={1.5} />
          {t("protectedDocs.action.resubmit")}
        </Button>
      </div>
    );
  }

  if (status === "expired") {
    return (
      <div className="rounded-lg bg-muted/30 p-3 space-y-2">
        <p className="text-xs text-muted-foreground flex items-center gap-1.5">
          <Clock size={11} strokeWidth={1.5} />
          {t("protectedDocs.action.expired")}
        </p>
        <Button size="sm" variant="outline" onClick={onRequestClick} disabled={loading}>
          <RefreshCw size={12} className="ml-1.5" strokeWidth={1.5} />
          {t("protectedDocs.action.requestNew")}
        </Button>
      </div>
    );
  }

  return null;
};

// Lightweight i18n-aware relative time
function formatRelative(iso: string, t: (k: string, v?: any) => string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return t("protectedDocs.relative.now");
  if (mins < 60) return t("protectedDocs.relative.minutes", { count: mins });
  const hours = Math.floor(mins / 60);
  if (hours < 24) return t("protectedDocs.relative.hours", { count: hours });
  const days = Math.floor(hours / 24);
  return t("protectedDocs.relative.days", { count: days });
}

export default ProtectedDocumentsPanel;
