import { useState, useCallback, useRef, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { heicTo, isHeic } from "heic-to";
import { validateImageFile, validateDocFile, logAudit } from "@/lib/security";
import {
  Check,
  ArrowLeft,
  ArrowRight,
  Loader2,
  Shield,
  Camera,
  Eye,
  Sparkles,
  Save,
  AlertTriangle,
} from "lucide-react";
import AiStar from "@/components/AiStar";
import AiInlineStar from "@/components/AiInlineStar";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

import { useListings, type Listing } from "@/hooks/useListings";
import { useAuthContext } from "@/contexts/AuthContext";
import { useNavigate, useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import SarSymbol from "@/components/SarSymbol";
import { type DealStructureSelection } from "@/components/DealStructureEngine";
import { DEAL_TYPE_MAP, detectConflicts, getRequiredDisclosures, getRequiredDocuments } from "@/lib/dealStructureConfig";
import { supabase } from "@/integrations/supabase/client";
import { calculateTransparency } from "@/lib/transparencyScore";
import { parseArabicPrice } from "@/lib/price-parser";
import { buildTitle } from "@/lib/title-utils";
import { getRules, validateDisclosure } from "@/lib/dealTypeFieldRules";
import VerificationGate from "@/components/VerificationGate";
import { useSEO } from "@/hooks/useSEO";

import type { InventoryItem, InventoryPricingMode, DedupAction, CrExtractionResult } from "./create-listing/types";
import type { FileUploadStatus, CreateListingSharedState } from "./create-listing/sharedState";
import { useFileClassifications } from "@/hooks/useFileClassifications";
import CreateListingStep1 from "./create-listing/CreateListingStep1";
import CreateListingStep2 from "./create-listing/CreateListingStep2";
import CreateListingStep3 from "./create-listing/CreateListingStep3";
import CreateListingStep4 from "./create-listing/CreateListingStep4";

const STEP_DEFS = [
  { key: "dealStructure", icon: Shield },
  { key: "media", icon: Camera },
  { key: "analysis", icon: Eye },
  { key: "disclosure", icon: Check },
] as const;

const allPhotoGroups = [
  { id: "interior", label: "صور داخلية للمحل", min: 3, icon: "Camera", dealTypes: ["full_takeover", "transfer_no_liabilities", "assets_setup"] as readonly string[] },
  { id: "exterior", label: "واجهة المحل", min: 2, icon: "DoorOpen", dealTypes: ["full_takeover", "transfer_no_liabilities", "assets_setup"] as readonly string[] },
  { id: "building", label: "المبنى", min: 1, icon: "Building2", dealTypes: ["full_takeover", "transfer_no_liabilities"] as readonly string[] },
  { id: "street", label: "الشارع المحيط", min: 1, icon: "MapPin", dealTypes: ["full_takeover", "transfer_no_liabilities"] as readonly string[] },
  { id: "signage", label: "اللوحة / اللافتة", min: 1, icon: "Tag", dealTypes: ["full_takeover", "transfer_no_liabilities"] as readonly string[] },
  { id: "equipment", label: "المعدات والأجهزة", min: 4, icon: "Wrench", dealTypes: ["full_takeover", "transfer_no_liabilities", "assets_setup", "assets_only"] as readonly string[] },
];

function getImageRequirement(dealType: string): "required" | "optional" | "none" {
  const rules = getRules(dealType);
  if (rules.imageRequired) return "required";
  return "optional";
}

const CreateListingPage = () => {
  const { t } = useTranslation();
  useSEO({ title: t("createListing.seoTitle"), description: t("createListing.seoDescription"), canonical: "/create-listing" });
  const steps = STEP_DEFS.map((s) => ({
    label: t(`createListing.steps.${s.key}`),
    icon: s.icon,
    hint: t(`createListing.steps.hints.${s.key}`),
  }));
  const [currentStep, setCurrentStep] = useState(0);
  const [dealStructure, setDealStructure] = useState<DealStructureSelection>({
    selectedTypes: [],
    primaryType: "",
    conflicts: [],
    requiredDisclosures: [],
    requiredDocuments: [],
    isValid: false,
  });
  const [photos, setPhotos] = useState<Record<string, string[]>>({});
  const [localPreviews, setLocalPreviews] = useState<Record<string, string[]>>({});
  const [uploadingGroup, setUploadingGroup] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState<{ current: number; total: number }>({ current: 0, total: 0 });
  const [analyzing, setAnalyzing] = useState(false);
  const [stepDirection, setStepDirection] = useState<"next" | "prev">("next");
  const [analyzed, setAnalyzed] = useState(false);
  const [analyzeProgress, setAnalyzeProgress] = useState(0);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [analysisSummary, setAnalysisSummary] = useState("");
  const [dedupActions, setDedupActions] = useState<DedupAction[]>([]);
  const [uploadedDocs, setUploadedDocs] = useState<Record<string, string[]>>({});
  const [docConfidence, setDocConfidence] = useState<Record<string, "high" | "medium">>({});
  const [listingId, setListingId] = useState<string | null>(null);
  const [fileStatuses, setFileStatuses] = useState<FileUploadStatus[]>([]);
  const [saving, setSaving] = useState(false);
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [locationLat, setLocationLat] = useState<number | null>(null);
  const [locationLng, setLocationLng] = useState<number | null>(null);
  const [sellerNote, setSellerNote] = useState("");
  const [areaSqm, setAreaSqm] = useState<string>("");
  const [inventoryPricingMode, setInventoryPricingMode] = useState<InventoryPricingMode>("per_item");
  const [bulkInventoryPrice, setBulkInventoryPrice] = useState<string>("");
  const [disclosure, setDisclosure] = useState<Record<string, string>>({
    business_activity: "",
    city: "",
    district: "",
    price: "",
    annual_rent: "",
    lease_duration: "",
    lease_paid_period: "",
    lease_remaining: "",
    liabilities: "",
    overdue_salaries: "",
    overdue_rent: "",
    municipality_license: "",
    civil_defense_license: "",
    surveillance_cameras: "",
  });

  const { createListing, updateListing, uploadFile, getMyDraft, getListing, loading } = useListings();
  const { profile, user } = useAuthContext();
  const sellerName = profile?.full_name || "";
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const docInputRef = useRef<HTMLInputElement>(null);
  const bulkInputRef = useRef<HTMLInputElement>(null);
  const [activePhotoGroup, setActivePhotoGroup] = useState<string | null>(null);
  const [activeDocType, setActiveDocType] = useState<string | null>(null);
  const [draftRestored, setDraftRestored] = useState(false);
  const [draftLoading, setDraftLoading] = useState(true);
  const autoSaveTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [autoSaveStatus, setAutoSaveStatus] = useState<"idle" | "saving" | "saved">("idle");
  const [draggingGroup, setDraggingGroup] = useState<string | null>(null);

  const [crExtraction, setCrExtraction] = useState<CrExtractionResult | null>(null);
  const [crExtracting, setCrExtracting] = useState(false);
  const [crExtractionDone, setCrExtractionDone] = useState(false);

  // ═══════════ Unified Upload (Commit 4) ═══════════
  // Default true for new listings, set to false when restoring legacy drafts
  const [usesUnifiedUpload, setUsesUnifiedUpload] = useState(true);
  const [classifyProgress, setClassifyProgress] = useState({ current: 0, total: 0 });
  const [classifyingFiles, setClassifyingFiles] = useState(false);
  const [reviewDialogOpen, setReviewDialogOpen] = useState(false);
  const [unifiedFileCount, setUnifiedFileCount] = useState(0);
  const [unifiedUnconfirmedCount, setUnifiedUnconfirmedCount] = useState(0);

  // Realtime classifications hook (Commit 4 — counts + auto-refresh)
  const { classifications: unifiedClassifications } = useFileClassifications(listingId);
  useEffect(() => {
    setUnifiedFileCount(unifiedClassifications.length);
    setUnifiedUnconfirmedCount(unifiedClassifications.filter((c) => !c.is_confirmed).length);
  }, [unifiedClassifications]);

  const isCrOnly = false;

  const photoGroups = allPhotoGroups.filter((group) => {
    if (dealStructure.selectedTypes.length === 0) return true;
    return dealStructure.selectedTypes.some((dt) => group.dealTypes.includes(dt));
  });

  const ensureListing = useCallback(async () => {
    if (listingId) return listingId;
    const { data, error } = await createListing({
      deal_type: dealStructure.primaryType || "full_takeover",
      primary_deal_type: dealStructure.primaryType,
      deal_options: dealStructure.selectedTypes.map((id, i) => ({
        type_id: id, priority: i, is_primary: id === dealStructure.primaryType,
      })),
      status: "draft",
      uses_unified_upload: true,
    } as never);
    if (error || !data) { toast.error(t("createListing.toasts.draftSaveError")); return null; }
    const id = (data as { id: string }).id;
    setListingId(id);
    setUsesUnifiedUpload(true);
    return id;
  }, [listingId, dealStructure, createListing]);

  // Draft restore
  const [searchParams] = useSearchParams();
  const isForceNew = searchParams.get("new") === "1";
  const requestedDraftId = searchParams.get("draft");

  const applyDraftToState = useCallback((draft: Listing) => {
    setListingId(draft.id);
    // Read flag from DB; older drafts default to false (legacy behavior)
    setUsesUnifiedUpload(Boolean((draft as unknown as { uses_unified_upload?: boolean }).uses_unified_upload));
    const primaryType = draft.primary_deal_type || draft.deal_type || "";
    const selectedTypes = Array.isArray(draft.deal_options) && draft.deal_options.length > 0
      ? (draft.deal_options as Array<{ type_id: string; priority: number; is_primary: boolean }>).map((o) => o.type_id).filter(Boolean)
      : primaryType ? [primaryType] : [];
    setDealStructure({
      selectedTypes, primaryType: primaryType || selectedTypes[0] || "",
      conflicts: detectConflicts(selectedTypes), requiredDisclosures: getRequiredDisclosures(selectedTypes),
      requiredDocuments: getRequiredDocuments(selectedTypes), isValid: selectedTypes.length > 0,
    });
    if (draft.photos && typeof draft.photos === "object") { setPhotos(draft.photos as Record<string, string[]>); setLocalPreviews(draft.photos as Record<string, string[]>); }
    if (Array.isArray(draft.inventory) && draft.inventory.length > 0) { setInventory(draft.inventory as InventoryItem[]); setAnalyzed(true); }
    if (Array.isArray(draft.documents) && draft.documents.length > 0) {
      const restoredDocs: Record<string, string[]> = {};
      for (const doc of draft.documents as Array<{ type?: string; files?: string[] }>) {
        if (doc?.type && Array.isArray(doc.files)) restoredDocs[doc.type] = doc.files;
      }
      if (Object.keys(restoredDocs).length > 0) setUploadedDocs(restoredDocs);
    }
    setDisclosure((prev) => ({
      ...prev,
      business_activity: draft.business_activity || "", city: draft.city || "", district: draft.district || "",
      price: draft.price != null ? String(draft.price) : "", annual_rent: draft.annual_rent != null ? String(draft.annual_rent) : "",
      lease_duration: draft.lease_duration || "", lease_paid_period: draft.lease_paid_period || "",
      lease_remaining: draft.lease_remaining || "", liabilities: draft.liabilities || "",
      overdue_salaries: draft.overdue_salaries || "", overdue_rent: draft.overdue_rent || "",
      municipality_license: draft.municipality_license || "", civil_defense_license: draft.civil_defense_license || "",
      surveillance_cameras: draft.surveillance_cameras || "",
    }));
    setLocationLat(draft.location_lat ?? null);
    setLocationLng(draft.location_lng ?? null);
    setAreaSqm(draft.area_sqm != null ? String(draft.area_sqm) : "");
    setDraftRestored(true);
  }, []);

  useEffect(() => {
    if (isForceNew) { setDraftLoading(false); return; }
    const restoreDraft = async () => {
      try {
        const draft = requestedDraftId ? await getListing(requestedDraftId) : await getMyDraft();
        if (draft) { applyDraftToState(draft as Listing); toast.success(requestedDraftId ? t("createListing.toasts.draftOpened") : t("createListing.toasts.draftRestoredAuto"), { icon: "📋" }); }
        else if (requestedDraftId) toast.error(t("createListing.toasts.draftNotFound"));
      } catch (err) { console.error("Draft restore failed", err); }
      finally { setDraftLoading(false); }
    };
    restoreDraft();
  }, [applyDraftToState, getListing, getMyDraft, isForceNew, requestedDraftId]);

  // Auto-save
  const saveDraft = useCallback(async () => {
    if (!listingId || saving) return;
    setAutoSaveStatus("saving");
    try {
      await updateListing(listingId, {
        ...disclosure, price: disclosure.price ? Number(disclosure.price) : null,
        annual_rent: disclosure.annual_rent ? Number(disclosure.annual_rent) : null,
        inventory: inventory.filter((item) => item.included),
        deal_type: dealStructure.primaryType || "full_takeover",
        primary_deal_type: dealStructure.primaryType,
        deal_options: dealStructure.selectedTypes.map((id, i) => ({ type_id: id, priority: i, is_primary: id === dealStructure.primaryType })),
        deal_disclosures: dealStructure.requiredDisclosures,
        required_documents: dealStructure.requiredDocuments,
        location_lat: locationLat, location_lng: locationLng,
        area_sqm: areaSqm ? Number(areaSqm) : null,
      } as never);
      setAutoSaveStatus("saved");
      setTimeout(() => setAutoSaveStatus("idle"), 3000);
    } catch (err) { console.error("Auto-save failed", err); setAutoSaveStatus("idle"); }
  }, [listingId, saving, disclosure, inventory, dealStructure, updateListing, locationLat, locationLng, areaSqm]);

  useEffect(() => {
    autoSaveTimerRef.current = setInterval(() => saveDraft(), 30000);
    return () => { if (autoSaveTimerRef.current) clearInterval(autoSaveTimerRef.current); };
  }, [saveDraft]);

  // File processing helpers
  const isHeicLikeFile = useCallback(async (file: File) => {
    const name = file.name.toLowerCase();
    if (file.type === "image/heic" || file.type === "image/heif" || name.endsWith(".heic") || name.endsWith(".heif")) return true;
    try { return await isHeic(file); } catch { return false; }
  }, []);

  const convertToJpeg = useCallback(async (file: File): Promise<File> => {
    const webFriendly = ["image/jpeg", "image/png", "image/webp", "image/gif"];
    if (webFriendly.includes(file.type)) return file;
    if (await isHeicLikeFile(file)) {
      const blob = await heicTo({ blob: file, type: "image/jpeg", quality: 0.92 });
      return new File([blob], file.name.replace(/\.[^.]+$/i, ".jpg"), { type: "image/jpeg" });
    }
    try {
      const bitmap = await createImageBitmap(file);
      const canvas = document.createElement("canvas");
      canvas.width = bitmap.width; canvas.height = bitmap.height;
      const ctx = canvas.getContext("2d");
      if (!ctx) return file;
      ctx.drawImage(bitmap, 0, 0); bitmap.close();
      const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.92));
      if (!blob) return file;
      return new File([blob], file.name.replace(/\.[^.]+$/i, ".jpg"), { type: "image/jpeg" });
    } catch { return file; }
  }, [isHeicLikeFile]);

  // Upload handlers
  const handlePhotoUploadForGroup = async (files: FileList, group: string) => {
    if (!files || files.length === 0 || !group) return;
    const id = await ensureListing();
    if (!id) return;
    const rawFiles = Array.from(files);
    const uploadedUrls: string[] = [];
    setUploadingGroup(group);
    setUploadProgress({ current: 0, total: rawFiles.length });
    setSaving(true);
    try {
      for (let i = 0; i < rawFiles.length; i++) {
        const originalFile = rawFiles[i];
        setUploadProgress({ current: i + 1, total: rawFiles.length });
        const isPdf = originalFile.type === "application/pdf" || originalFile.name.toLowerCase().endsWith(".pdf");
        if (!isPdf) { const validation = validateImageFile(originalFile); if (!validation.valid) { toast.error(validation.error); continue; } }
        try {
          const preparedFile = isPdf ? originalFile : await convertToJpeg(originalFile);
          const previewUrl = isPdf ? "" : URL.createObjectURL(preparedFile);
          if (previewUrl) setLocalPreviews((prev) => ({ ...prev, [group]: [...(prev[group] || []), previewUrl] }));
          const result = await uploadFile(id, preparedFile, `photos/${group}`);
          if (result.url) uploadedUrls.push(result.url);
          else toast.error(`${originalFile.name}: ${result.error || "فشل الرفع"}`);
        } catch (error) { console.error("photo preparation failed", error); toast.error(`تعذّر تجهيز الصورة ${originalFile.name}`); }
      }
      setPhotos((prev) => {
        const updatedPhotos = { ...prev, [group]: [...(prev[group] || []), ...uploadedUrls] };
        updateListing(id, { photos: updatedPhotos } as never).catch(() => toast.error("تعذّر حفظ الصور."));
        return updatedPhotos;
      });
      if (uploadedUrls.length > 0) {
        toast.success(`تم تجهيز ورفع ${uploadedUrls.length} ملف بنجاح`);
        if (isCrOnly && group === "cr_doc" && uploadedUrls.length > 0 && !crExtractionDone) handleCrExtraction(uploadedUrls[0]);
      }
    } finally { setSaving(false); setUploadingGroup(null); }
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || !activePhotoGroup) return;
    await handlePhotoUploadForGroup(e.target.files, activePhotoGroup);
    e.target.value = "";
  };

  // Map field labels (Arabic) to AI verifier types
  const getVerifierType = (docLabel: string): string | null => {
    if (/قائمة\s*الأصول/.test(docLabel)) return "asset_list";
    if (/صور\s*المعدات/.test(docLabel)) return "equipment_photos";
    if (/إثبات\s*ملكية/.test(docLabel)) return "ownership_proof";
    return null;
  };

  // Document types that must be PDF only — images uploaded here are real-world
  // misclassifications (e.g., equipment photos placed under "السجل التجاري")
  const PDF_ONLY_TYPES = new Set([
    "السجل التجاري",
    "عقد الإيجار",
    "رخصة البلدية",
    "رخصة الدفاع المدني",
    "إفصاح الالتزامات",
    "التراخيص ذات الصلة",
    "إقرار البائع بشأن الالتزامات",
  ]);

  const isImageFile = (file: File): boolean => {
    if (file.type.startsWith("image/")) return true;
    const ext = file.name.split(".").pop()?.toLowerCase() || "";
    return ["jpg", "jpeg", "png", "heic", "heif", "webp", "gif", "bmp", "avif"].includes(ext);
  };

  const handleDocUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || !activeDocType) return;
    const id = await ensureListing();
    if (!id) return;
    setSaving(true);
    const files = Array.from(e.target.files);
    const urls: string[] = [];
    const verifierType = getVerifierType(activeDocType);
    const isPdfOnlyField = PDF_ONLY_TYPES.has(activeDocType);
    const imagesToReroute: File[] = [];
    for (const file of files) {
      // Block images on PDF-only fields & queue them for auto-routing
      if (isPdfOnlyField && isImageFile(file)) {
        imagesToReroute.push(file);
        continue;
      }
      const validation = validateDocFile(file);
      if (!validation.valid) { toast.error(validation.error); continue; }
      const safeFolder = activeDocType.replace(/[^a-zA-Z0-9_-]/g, "_").replace(/_+/g, "_").replace(/^_|_$/g, "") || "general";
      const result = await uploadFile(id, file, `docs/${safeFolder}`);
      if (!result.url) {
        toast.error(`${file.name}: ${result.error || "فشل الرفع"}`);
        continue;
      }
      // AI content verification for the three critical doc types
      if (verifierType) {
        const verifyToast = toast.loading(`🔍 جاري التحقق من "${file.name}" عبر الذكاء الاصطناعي...`);
        try {
          const { data, error } = await supabase.functions.invoke("verify-document", {
            body: { documentUrl: result.url, expectedType: verifierType },
          });
          toast.dismiss(verifyToast);
          const payload = (data || {}) as {
            is_valid?: boolean;
            document_type_detected?: string;
            rejection_reason?: string;
            confidence?: "high" | "medium" | "low";
            notes?: string;
            error?: string;
          };
          if (error || payload.is_valid === false || payload.error) {
            const reason = payload.rejection_reason || payload.error || "الملف لا يطابق نوع الحقل.";
            toast.error(
              `❌ تم رفض "${file.name}"\n${reason}`,
              { duration: 9000 }
            );
            continue;
          }
          // Accepted — branch on confidence
          if (verifierType === "equipment_photos" && payload.confidence === "medium") {
            toast(
              `⚠ تم قبول "${file.name}" — قد تحتاج معاينة من جساس`,
              {
                duration: 7000,
                description: payload.notes || "الصورة مقبولة لكن قد تحتاج معاينة ميدانية للتأكد من حالة المعدة.",
                style: { background: "hsl(var(--warning) / 0.12)", borderColor: "hsl(var(--warning))" },
              }
            );
            setDocConfidence((prev) => ({ ...prev, [result.url!]: "medium" }));
          } else {
            toast.success(`✓ تم التحقق من "${file.name}"`);
            setDocConfidence((prev) => ({ ...prev, [result.url!]: "high" }));
          }
        } catch (err) {
          toast.dismiss(verifyToast);
          console.error("verify-document failed", err);
          toast.error(`تعذّر التحقق من "${file.name}". تم رفض الملف للأمان.`);
          continue;
        }
      }
      urls.push(result.url);
    }

    // Notify user about rejected images & offer auto-routing
    if (imagesToReroute.length > 0) {
      toast.error(
        `حقل "${activeDocType}" يقبل PDF فقط. تم رفض ${imagesToReroute.length} صورة.\nلرفع صور المعدات استخدم حقل "صور المعدات" أو الرفع الجماعي.`,
        {
          duration: 10000,
          action: {
            label: "نقل تلقائي إلى صور المعدات",
            onClick: async () => {
              try {
                const dt = new DataTransfer();
                imagesToReroute.forEach((f) => dt.items.add(f));
                await handlePhotoUploadForGroup(dt.files, "equipment");
              } catch (err) {
                console.error("auto-reroute failed", err);
                toast.error("تعذّر نقل الصور تلقائياً.");
              }
            },
          },
        }
      );
    }

    if (urls.length === 0) { setSaving(false); e.target.value = ""; return; }
    setUploadedDocs((prev) => ({ ...prev, [activeDocType]: [...(prev[activeDocType] || []), ...urls] }));
    const allDocs = { ...uploadedDocs, [activeDocType]: [...(uploadedDocs[activeDocType] || []), ...urls] };
    await updateListing(id, { documents: Object.entries(allDocs).map(([type, filesForType]) => ({ type, files: filesForType })) } as never);
    setSaving(false);
    e.target.value = "";
  };

  const handleBulkUploadFiles = async (files: FileList | File[]) => {
    const fileArray = Array.from(files);
    if (fileArray.length === 0) return;
    const id = await ensureListing();
    if (!id) return;
    const imageExts = ["jpg", "jpeg", "png", "webp", "heic", "heif", "gif", "bmp", "avif"];
    const imageFiles: File[] = [];
    const docFiles: File[] = [];
    const existingKeys = new Set(fileStatuses.map(f => `${f.name}-${f.size}`));
    for (const f of fileArray) {
      const key = `${f.name}-${f.size}`;
      if (existingKeys.has(key)) continue;
      existingKeys.add(key);
      const ext = f.name.split(".").pop()?.toLowerCase() || "";
      const isImage = f.type.startsWith("image/") || imageExts.includes(ext);
      if (isImage) { if (imageFiles.length < 200) imageFiles.push(f); }
      else { if (docFiles.length < 100) docFiles.push(f); }
    }
    if (imageFiles.length === 0 && docFiles.length === 0) return;
    setSaving(true);
    const totalFiles = imageFiles.length + docFiles.length;
    let completedCount = 0;
    setUploadProgress({ current: 0, total: totalFiles });
    setUploadingGroup("bulk");
    const newStatuses: FileUploadStatus[] = [
      ...imageFiles.map((f, i) => ({ id: `img-${Date.now()}-${i}`, name: f.name, size: f.size, type: "image" as const, status: "uploading" as const })),
      ...docFiles.map((f, i) => ({ id: `doc-${Date.now()}-${i}`, name: f.name, size: f.size, type: "document" as const, status: "uploading" as const })),
    ];
    setFileStatuses(prev => [...prev, ...newStatuses]);

    const BATCH_SIZE = 5;

    const processBatch = async <T,>(items: T[], handler: (item: T, index: number) => Promise<void>) => {
      for (let start = 0; start < items.length; start += BATCH_SIZE) {
        const batch = items.slice(start, start + BATCH_SIZE);
        await Promise.all(batch.map((item, bi) => handler(item, start + bi)));
      }
    };

    try {
      const imageUrls: string[] = [];
      await processBatch(imageFiles, async (file, i) => {
        const statusId = newStatuses[i].id;
        try {
          const validation = validateImageFile(file);
          if (!validation.valid) { setFileStatuses(prev => prev.map(f => f.id === statusId ? { ...f, status: "failed", error: validation.error } : f)); return; }
          const prepared = await convertToJpeg(file);
          const previewUrl = URL.createObjectURL(prepared);
          setLocalPreviews(prev => ({ ...prev, all: [...(prev.all || []), previewUrl] }));
          const result = await uploadFile(id, prepared, "photos/all");
          if (result.url) { imageUrls.push(result.url); setFileStatuses(prev => prev.map(f => f.id === statusId ? { ...f, status: "uploaded", url: result.url!, previewUrl } : f)); }
          else { setFileStatuses(prev => prev.map(f => f.id === statusId ? { ...f, status: "failed", error: result.error || "فشل الرفع" } : f)); }
        } catch (err) { console.error(`[BulkUpload] Image failed: ${file.name}`, err); setFileStatuses(prev => prev.map(f => f.id === statusId ? { ...f, status: "failed", error: "تعذر تجهيز الملف" } : f)); }
        finally { completedCount++; setUploadProgress({ current: completedCount, total: totalFiles }); }
      });
      if (imageUrls.length > 0) {
        setPhotos(prev => {
          const updated = { ...prev, all: [...(prev.all || []), ...imageUrls] };
          updateListing(id, { photos: updated } as never).catch(() => toast.error("تعذّر حفظ الصور."));
          return updated;
        });
      }
      const docUrls: string[] = [];
      await processBatch(docFiles, async (file, i) => {
        const statusId = newStatuses[imageFiles.length + i].id;
        const validation = validateDocFile(file);
        if (!validation.valid) { setFileStatuses(prev => prev.map(f => f.id === statusId ? { ...f, status: "failed", error: validation.error } : f)); completedCount++; setUploadProgress({ current: completedCount, total: totalFiles }); return; }
        try {
          const result = await uploadFile(id, file, "docs/general");
          if (result.url) { docUrls.push(result.url); setFileStatuses(prev => prev.map(f => f.id === statusId ? { ...f, status: "uploaded", url: result.url! } : f)); }
          else { setFileStatuses(prev => prev.map(f => f.id === statusId ? { ...f, status: "failed", error: result.error || "فشل الرفع" } : f)); }
        } catch (err) { console.error(`[BulkUpload] Doc failed: ${file.name}`, err); setFileStatuses(prev => prev.map(f => f.id === statusId ? { ...f, status: "failed", error: "خطأ غير متوقع" } : f)); }
        finally { completedCount++; setUploadProgress({ current: completedCount, total: totalFiles }); }
      });
      if (docUrls.length > 0) {
        setUploadedDocs(prev => {
          const updated = { ...prev, general: [...(prev.general || []), ...docUrls] };
          updateListing(id, { documents: Object.entries(updated).map(([type, files]) => ({ type, files })) } as never).catch(() => toast.error("تعذّر حفظ المستندات."));
          return updated;
        });
        const firstPdfUrl = docUrls.find(url => url.toLowerCase().includes(".pdf"));
        if (firstPdfUrl && !crExtractionDone) handleCrExtraction(firstPdfUrl);
      }
      const uploadedTotal = imageUrls.length + docUrls.length;
      const failedTotal = totalFiles - uploadedTotal;
      if (uploadedTotal > 0 && failedTotal === 0) toast.success(`تم رفع ${uploadedTotal} ملف بنجاح`);
      else if (uploadedTotal > 0 && failedTotal > 0) toast.warning(`تم رفع ${uploadedTotal} ملف — فشل ${failedTotal}`);
      else if (failedTotal > 0) toast.error(`فشل رفع جميع الملفات (${failedTotal})`);
    } finally { setSaving(false); setUploadingGroup(null); }
  };

  const handleBulkUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    await handleBulkUploadFiles(e.target.files);
    e.target.value = "";
  };

  const removeRejectedDoc = useCallback((documentUrl: string) => {
    setUploadedDocs((prev) => {
      const updated: Record<string, string[]> = {};
      for (const [k, v] of Object.entries(prev)) updated[k] = (v as string[]).filter((u) => u !== documentUrl);
      if (listingId) {
        updateListing(listingId, { documents: Object.entries(updated).map(([type, files]) => ({ type, files })) } as never).catch(() => {});
      }
      return updated;
    });
    setFileStatuses((prev) => prev.filter((f) => f.url !== documentUrl));
  }, [listingId, updateListing]);

  const handleCrExtraction = useCallback(async (documentUrl: string) => {
    setCrExtracting(true);
    try {
      const { data, error } = await supabase.functions.invoke("extract-cr-data", { body: { documentUrl } });
      // Detect explicit validation rejection from edge function (data carries is_valid_cr=false)
      const payload = (data || {}) as CrExtractionResult & { error?: string };
      if (payload.is_valid_cr === false) {
        const detected = payload.document_type_detected || "غير معروف";
        const reason = payload.rejection_reason || "هذا الملف ليس سجلاً تجارياً سعودياً.";
        toast.error(`❌ الملف مرفوض — ليس سجلاً تجارياً\nنوع المستند: ${detected}\n${reason}`, { duration: 9000 });
        removeRejectedDoc(documentUrl);
        setCrExtraction(null);
        setCrExtractionDone(false);
        return;
      }
      if (error || !data || payload.error) {
        throw new Error(payload.error || error?.message || "فشل استخراج البيانات");
      }
      const result = payload as CrExtractionResult;
      setCrExtraction(result);
      setCrExtractionDone(true);
      setDisclosure((prev) => ({
        ...prev,
        ...(result.business_activity && !prev.business_activity ? { business_activity: result.business_activity } : {}),
        ...(result.city && !prev.city ? { city: result.city } : {}),
        ...(result.district && !prev.district ? { district: result.district } : {}),
      }));
      if (result.extraction_confidence === "high") toast.success("تم التحقق من السجل التجاري واستخراج البيانات بنجاح ✓", { duration: 5000 });
      else if (result.extraction_confidence === "medium") toast.info("تم التحقق — استُخرجت بعض البيانات، يرجى المراجعة", { duration: 5000 });
      else toast.warning("تم التحقق لكن جودة الصورة منخفضة — قد تحتاج لرفع صورة أوضح", { duration: 6000 });
    } catch (err) {
      console.error("CR extraction failed:", err);
      const msg = err instanceof Error ? err.message : "تعذّر استخراج البيانات من السجل التجاري";
      toast.error(msg, { duration: 7000 });
      setCrExtractionDone(true);
    } finally { setCrExtracting(false); }
  }, [removeRejectedDoc]);

  const handleAnalyze = async () => {
    const allPhotoUrlsForAnalysis = Object.values(photos).flat();
    const allDocUrls = Object.values(uploadedDocs).flat();
    if (allPhotoUrlsForAnalysis.length === 0 && allDocUrls.length === 0) { toast.error("يرجى رفع صور أو ملف Excel/مستند أولاً"); return; }
    const unsupportedUrls = allPhotoUrlsForAnalysis.filter((url) => /\.(heic|heif)(\?|$)/i.test(url));
    if (unsupportedUrls.length > 0) { toast.error("هناك صور قديمة بصيغة HEIC غير قابلة للتحليل"); return; }
    const limitedUrls = allPhotoUrlsForAnalysis.slice(0, 30);
    if (allPhotoUrlsForAnalysis.length > 30) toast.info(`لديك ${allPhotoUrlsForAnalysis.length} صورة — سيتم تحليل أول 30`);
    setAnalyzing(true);
    setAnalyzeProgress(10);
    const progressInterval = setInterval(() => setAnalyzeProgress((prev) => Math.min(prev + 8, 85)), 1500);
    try {
      const { data, error } = await supabase.functions.invoke("analyze-inventory", { body: { photoUrls: limitedUrls, photoGroups: photos, documentUrls: allDocUrls } });
      clearInterval(progressInterval);
      setAnalyzeProgress(100);
      if (error || !data || (data as { error?: string }).error) throw new Error((data as { error?: string })?.error || error?.message || "فشل التحليل");
      const assets: InventoryItem[] = (((data as any).assets) || []).map((asset: any, i: number) => ({
        id: String(i + 1), name: String(asset.name || "أصل غير مسمى"), qty: Number(asset.quantity || 1),
        condition: String(asset.condition || "غير واضح"), category: String(asset.category || "أخرى"),
        included: true, confidence: (asset.confidence as InventoryItem["confidence"]) || "medium",
        detectionNote: String(asset.detection_note || ""), photoIndices: Array.isArray(asset.photo_indices) ? (asset.photo_indices as number[]) : [],
        isSameAssetMultipleAngles: Boolean(asset.is_same_asset_multiple_angles), userConfirmed: asset.confidence === "high",
      }));
      const extracted = (data as any).extracted_info;
      if (extracted?.inventory_from_files && Array.isArray(extracted.inventory_from_files)) {
        const fileItems: InventoryItem[] = extracted.inventory_from_files.map((item: any, i: number) => ({
          id: `file-${i + 1}`, name: String(item.item_name || "عنصر من الملفات"), qty: Number(item.quantity || 1),
          condition: "غير واضح", category: "مخزون", included: true, confidence: "medium" as const,
          detectionNote: `مستخرج من ملف مرفق${item.unit_price ? ` — سعر الوحدة: ${item.unit_price} ر.س` : ""}`,
          photoIndices: [], isSameAssetMultipleAngles: false, userConfirmed: false,
        }));
        assets.push(...fileItems);
      }
      setInventory(assets);
      setAnalysisSummary(String((data as any).analysis_summary || ""));
      setDedupActions(((data as any).dedup_actions || []));
      setAnalyzed(true);
      const docPhotoIndices = (data as any).document_photo_indices;
      if (docPhotoIndices && docPhotoIndices.length > 0) {
        const allPhotoUrlsFlat = Object.values(photos).flat();
        const docPhotoUrls = new Set(docPhotoIndices.map((i: number) => allPhotoUrlsFlat[i]).filter(Boolean));
        if (docPhotoUrls.size > 0) {
          setPhotos(prev => {
            const updated: Record<string, string[]> = {};
            for (const [group, urls] of Object.entries(prev)) {
              if (group === "document_photos") continue;
              const filtered = urls.filter(u => !docPhotoUrls.has(u));
              if (filtered.length > 0) updated[group] = filtered;
            }
            updated.document_photos = [...(prev.document_photos || []), ...Array.from(docPhotoUrls) as string[]];
            if (listingId) updateListing(listingId, { photos: updated } as never).catch(() => {});
            return updated;
          });
        }
      }
      const generatedDesc = (data as any).generated_description;
      if (generatedDesc && !sellerNote) setSellerNote(generatedDesc.replace(/#{1,6}\s?/g, "").replace(/\*{1,2}/g, "").trim().slice(0, 2000));
      if (extracted) {
        setDisclosure(prev => ({
          ...prev,
          ...(extracted.business_activity && !prev.business_activity ? { business_activity: extracted.business_activity } : {}),
          ...(extracted.city && !prev.city ? { city: extracted.city } : {}),
          ...(extracted.district && !prev.district ? { district: extracted.district } : {}),
          ...(extracted.annual_rent && !prev.annual_rent ? { annual_rent: extracted.annual_rent } : {}),
          ...(extracted.lease_duration && !prev.lease_duration ? { lease_duration: extracted.lease_duration } : {}),
          ...(extracted.asking_price && !prev.price ? (() => { const p = parseArabicPrice(extracted.asking_price as string | number); return p ? { price: String(p) } : {}; })() : {}),
        }));
        if (extracted.area_sqm && !areaSqm) setAreaSqm(extracted.area_sqm);
        if (extracted.cr_number || extracted.entity_name) {
          setCrExtraction(prev => ({ ...prev, ...(extracted.cr_number ? { cr_number: extracted.cr_number } : {}), ...(extracted.entity_name ? { entity_name: extracted.entity_name } : {}), ...(extracted.business_activity ? { business_activity: extracted.business_activity } : {}), ...(extracted.city ? { city: extracted.city } : {}) }));
          setCrExtractionDone(true);
        }
      }
      toast.success("تم تحليل الملفات المرفوعة واستخراج البيانات بنجاح ✦");
    } catch (err) { clearInterval(progressInterval); toast.error(err instanceof Error ? err.message : "حدث خطأ أثناء تحليل الملفات"); }
    finally { setAnalyzing(false); }
  };

  // Navigation
  const handleNext = async () => {
    if (currentStep === 0) {
      if (!dealStructure.isValid) { toast.error(t("createListing.toasts.selectDealStructure")); return; }
      const id = await ensureListing();
      if (id) await updateListing(id, { deal_type: dealStructure.primaryType, primary_deal_type: dealStructure.primaryType, deal_options: dealStructure.selectedTypes.map((typeId, i) => ({ type_id: typeId, priority: i, is_primary: typeId === dealStructure.primaryType })) } as never);
    }
    saveDraft();
    setStepDirection("next");
    if (currentStep === 2) {
      if (!disclosure.price && bulkInventoryPrice) setDisclosure(prev => ({ ...prev, price: bulkInventoryPrice }));
      if (!disclosure.business_activity) {
        if (analysisSummary) { const m = analysisSummary.match(/نشاط[:\s]*([^\n.،]+)/); if (m) setDisclosure(prev => ({ ...prev, business_activity: m[1].trim() })); }
        if (!disclosure.business_activity && inventory.length > 0) {
          const categories = [...new Set(inventory.filter(i => i.included).map(i => i.category).filter(Boolean))];
          const topItems = inventory.filter(i => i.included).slice(0, 3).map(i => i.name);
          const autoName = categories.length > 0 ? `${categories.join(" و ")} — ${topItems.join("، ")}` : topItems.join("، ");
          if (autoName) setDisclosure(prev => ({ ...prev, business_activity: autoName.slice(0, 100) }));
        }
      }
    }
    if (isCrOnly && currentStep === 1) setCurrentStep(3);
    else setCurrentStep((prev) => Math.min(steps.length - 1, prev + 1));
  };

  const handleBack = () => {
    saveDraft();
    setStepDirection("prev");
    if (isCrOnly && currentStep === 3) setCurrentStep(1);
    else setCurrentStep((prev) => Math.max(0, prev - 1));
  };

  // Publish logic
  const [showPublishConfirm, setShowPublishConfirm] = useState(false);
  const [dealCheckLoading, setDealCheckLoading] = useState(false);
  const [dealCheckResult, setDealCheckResult] = useState<any>(null);
  const [dealCheckError, setDealCheckError] = useState("");
  const [dealCheckInputKey, setDealCheckInputKey] = useState<string | null>(null);
  const [publishAttempted, setPublishAttempted] = useState(false);
  const [duplicateCandidate, setDuplicateCandidate] = useState<{ id: string; title: string; price: number | null; city: string | null } | null>(null);
  const [duplicateAcknowledged, setDuplicateAcknowledged] = useState(false);

  // Detect potential duplicate listing among user's published listings
  const checkForDuplicateListing = useCallback(async () => {
    if (!user?.id || !listingId) return null;
    try {
      const { data, error } = await supabase
        .from("listings")
        .select("id, title, business_activity, city, deal_type, primary_deal_type, price")
        .eq("owner_id", user.id)
        .eq("status", "published")
        .is("deleted_at", null);
      if (error || !data) return null;
      const currentCity = (disclosure.city || "").trim().toLowerCase();
      const currentActivity = (disclosure.business_activity || "").trim().toLowerCase();
      const currentDealType = (dealStructure.primaryType || "").trim().toLowerCase();
      const titleSim = (a: string, b: string) => {
        if (!a || !b) return 0;
        const aw = new Set(a.toLowerCase().split(/\s+/).filter(w => w.length > 2));
        const bw = new Set(b.toLowerCase().split(/\s+/).filter(w => w.length > 2));
        if (aw.size === 0 || bw.size === 0) return 0;
        let common = 0;
        aw.forEach(w => { if (bw.has(w)) common++; });
        return common / Math.max(aw.size, bw.size);
      };
      for (const row of data as any[]) {
        if (row.id === listingId) continue;
        const sameCity = currentCity && (row.city || "").trim().toLowerCase() === currentCity;
        const rowActivity = (row.business_activity || "").trim().toLowerCase();
        const sameActivity = currentActivity && rowActivity && (rowActivity === currentActivity || titleSim(currentActivity, row.title || "") >= 0.5);
        const rowDealType = (row.primary_deal_type || row.deal_type || "").trim().toLowerCase();
        const sameDealType = currentDealType && rowDealType === currentDealType;
        const matches = [sameCity, sameActivity, sameDealType].filter(Boolean).length;
        if (matches >= 2) {
          return { id: row.id as string, title: (row.title || row.business_activity || "إعلان") as string, price: row.price ?? null, city: row.city ?? null };
        }
      }
      return null;
    } catch (e) {
      console.warn("[duplicateCheck] failed:", e);
      return null;
    }
  }, [user?.id, listingId, disclosure.city, disclosure.business_activity, dealStructure.primaryType]);

  const buildListingPayload = useCallback(() => ({
    ...disclosure, description: sellerNote || null,
    price: disclosure.price ? Number(disclosure.price) : null,
    annual_rent: disclosure.annual_rent ? Number(disclosure.annual_rent) : null,
    primary_deal_type: dealStructure.primaryType, deal_type: dealStructure.primaryType,
    inventory: inventory.filter((item) => item.included),
    inventory_pricing_mode: inventoryPricingMode,
    bulk_inventory_price: inventoryPricingMode === "bulk" && bulkInventoryPrice ? Number(bulkInventoryPrice) : null,
    photos, documents: Object.entries(uploadedDocs).map(([type, files]) => ({ type, files })),
    cr_extraction: crExtraction || undefined,
    deal_options: dealStructure.selectedTypes.map((id, i) => ({ type_id: id, priority: i, is_primary: id === dealStructure.primaryType })),
  }), [disclosure, dealStructure, inventory, photos, uploadedDocs, crExtraction, sellerNote, inventoryPricingMode, bulkInventoryPrice]);

  const handleRunInlineDealCheck = async () => {
    setPublishAttempted(true);
    const imgReq = getImageRequirement(dealStructure.primaryType);
    const hasPhotos = imgReq === "none" || imgReq === "optional" || totalPhotos > 0;
    const errors = validateDisclosure(dealStructure.primaryType || "full_takeover", disclosure);
    if (!hasPhotos || Object.keys(errors).length > 0) { toast.error("يرجى إكمال جميع الحقول المطلوبة أولاً"); return; }
    const nextListingPayload = buildListingPayload();
    const nextInputKey = JSON.stringify(nextListingPayload);
    if (dealCheckResult && dealCheckInputKey === nextInputKey) { toast.info("التحليل الحالي ما زال مطابقاً"); return; }
    setDealCheckLoading(true);
    setDealCheckError("");
    try {
      const { invokeWithRetry } = await import("@/lib/invokeWithRetry");
      const { data, error: fnError } = await invokeWithRetry("deal-check", { listing: nextListingPayload, perspective: "seller", sellerName, mode: dealCheckResult ? "update" : "create", previousAnalysis: dealCheckResult || null });
      if (fnError) throw new Error(fnError.message);
      if (!data?.success) throw new Error(data?.error || "فشل التحليل");
      setDealCheckResult(data.analysis);
      setDealCheckInputKey(nextInputKey);
    } catch (e: any) { console.error("[DealCheck] failed:", e); setDealCheckError(e.message || t("createListing.toasts.analysisFailed")); }
    finally { setDealCheckLoading(false); }
  };

  const handlePublishClick = async () => {
    if (!listingId) return;
    setPublishAttempted(true);
    const imgReq = getImageRequirement(dealStructure.primaryType);
    const hasPhotos = imgReq === "none" || imgReq === "optional" || totalPhotos > 0;
    const errors = validateDisclosure(dealStructure.primaryType || "full_takeover", disclosure);
    if (!hasPhotos || Object.keys(errors).length > 0) { toast.error(t("createListing.toasts.completeBeforePublish")); return; }
    if (locationLat == null || locationLng == null) { toast.error(t("createListing.toasts.locationRequired")); return; }

    // Duplicate detection — only if not yet acknowledged
    if (!duplicateAcknowledged) {
      const dup = await checkForDuplicateListing();
      if (dup) {
        setDuplicateCandidate(dup);
        return;
      }
    }

    setShowPublishConfirm(true);
    setDealCheckLoading(true);
    setDealCheckError("");
    try {
      const { invokeWithRetry } = await import("@/lib/invokeWithRetry");
      const nextListingPayload = buildListingPayload();
      const { data, error: fnError } = await invokeWithRetry("deal-check", { listing: nextListingPayload, perspective: "seller", sellerName, mode: dealCheckResult ? "update" : "create", previousAnalysis: dealCheckResult || null });
      if (fnError) throw new Error(fnError.message);
      if (!data?.success) throw new Error(data?.error || "فشل التحليل");
      setDealCheckResult(data.analysis);
      setDealCheckInputKey(JSON.stringify(nextListingPayload));
    } catch (e: any) { console.error("[DealCheck] Pre-publish failed:", e); setDealCheckError(e.message || t("createListing.toasts.analysisFailed")); }
    finally { setDealCheckLoading(false); }
  };

  const handlePublish = async () => {
    if (!listingId) return;
    if (profile && (profile as any).is_commission_suspended) { toast.error(t("createListing.toasts.commissionSuspended")); return; }
    setShowPublishConfirm(false);
    setSaving(true);
    try {
      const transparencyForPublish = calculateTransparency({ ...disclosure, price: disclosure.price ? Number(disclosure.price) : null, annual_rent: disclosure.annual_rent ? Number(disclosure.annual_rent) : null, primary_deal_type: dealStructure.primaryType || "full_takeover", inventory: inventory.filter((item) => item.included), photos });
      const { error } = await updateListing(listingId, {
        ...disclosure, price: disclosure.price ? Number(disclosure.price) : null, annual_rent: disclosure.annual_rent ? Number(disclosure.annual_rent) : null,
        disclosure_score: transparencyForPublish.score, inventory: inventory.filter((item) => item.included),
        deal_disclosures: dealStructure.requiredDisclosures, required_documents: dealStructure.requiredDocuments,
        ai_structure_validation: dealCheckResult || null, location_lat: locationLat, location_lng: locationLng,
        area_sqm: areaSqm ? Number(areaSqm) : null, status: "published", published_at: new Date().toISOString(),
        title: isCrOnly
          ? buildTitle([
              "سجل تجاري",
              crExtraction?.entity_name || disclosure.business_activity || "مشروع",
              disclosure.city,
            ])
          : buildTitle([
              disclosure.business_activity || "مشروع",
              disclosure.district,
              disclosure.city,
            ]),
      } as never);
      if (error) { console.error("Publish failed:", error); toast.error(t("createListing.toasts.publishFailed")); setSaving(false); return; }
      await logAudit("listing_published", "listing", listingId, { title: disclosure.business_activity }).catch(() => {});
      import("@/lib/invokeWithRetry").then(({ invokeWithRetry }) => { invokeWithRetry("auto-analyze-listing", { listingId }).catch(() => {}); });
      if (autoSaveTimerRef.current) { clearInterval(autoSaveTimerRef.current); autoSaveTimerRef.current = null; }
      setSaving(false);
      toast.success(t("createListing.toasts.publishSuccess"));
      navigate(`/listing/${listingId}`);
    } catch (err) { console.error("Publish error:", err); toast.error(t("createListing.toasts.publishUnexpected")); setSaving(false); }
  };

  // Computed values
  const getGroupDisplayUrls = useCallback((groupId: string) => {
    const previews = localPreviews[groupId] || [];
    const remoteUrls = photos[groupId] || [];
    return previews.length > 0 ? previews : remoteUrls;
  }, [localPreviews, photos]);

  const bulkPhotoCount = (localPreviews["all"] || photos["all"] || []).length;
  const totalPhotos = photoGroups.reduce((sum, group) => sum + getGroupDisplayUrls(group.id).length, 0) + bulkPhotoCount;
  const allPhotoUrls = Object.values(photos).flat();
  const dealTypeForTransparency = dealStructure.primaryType || "full_takeover";
  const transparencyResult = calculateTransparency({ ...disclosure, price: disclosure.price ? Number(disclosure.price) : null, annual_rent: disclosure.annual_rent ? Number(disclosure.annual_rent) : null, primary_deal_type: dealTypeForTransparency, inventory, photos });
  const disclosureScore = transparencyResult.score;
  const imageReq = getImageRequirement(dealStructure.primaryType);
  const photosOk = imageReq === "none" || imageReq === "optional" || totalPhotos > 0;
  const disclosureErrors = validateDisclosure(dealStructure.primaryType || "full_takeover", disclosure);
  const locationOk = locationLat != null && locationLng != null;
  // Commit 5: Block publishing for unified listings if files need review
  const unifiedReviewBlocking = usesUnifiedUpload && unifiedUnconfirmedCount > 0;
  const canPublish = photosOk && Object.keys(disclosureErrors).length === 0 && locationOk && !unifiedReviewBlocking;
  const primaryDealLabel = DEAL_TYPE_MAP[dealStructure.primaryType]?.label || dealStructure.primaryType;
  const dynamicDocTypes = dealStructure.requiredDocuments.length > 0
    ? dealStructure.requiredDocuments
    : ["عقد الإيجار", "السجل التجاري", "رخصة البلدية", "رخصة الدفاع المدني", "فواتير شراء المعدات", "مستندات أخرى"];

  const completionPercent = (() => {
    let total = 0, filled = 0;
    total += 1; if (dealStructure.isValid) filled += 1;
    total += 1; if (totalPhotos > 0) filled += 1;
    total += 1; if (analyzed) filled += 1;
    const rules = getRules(dealStructure.primaryType || "full_takeover");
    total += rules.requiredFields.length;
    for (const f of rules.requiredFields) { if ((disclosure as Record<string, string>)[f]?.trim()) filled += 1; }
    total += 1; if (disclosure.price?.trim()) filled += 1;
    return Math.round((filled / Math.max(total, 1)) * 100);
  })();

  const handleDrop = useCallback((e: React.DragEvent<HTMLDivElement>, groupId: string) => {
    e.preventDefault();
    e.stopPropagation();
    setDraggingGroup(null);
    const files = e.dataTransfer?.files;
    if (!files || files.length === 0) return;
    handlePhotoUploadForGroup(files, groupId);
  }, [handlePhotoUploadForGroup]);

  // ═══════════ Unified Upload Helpers (Commit 4 — Step E) ═══════════

  // Helper: upload files to listing-files bucket and return URL list
  const uploadFilesToStorage = useCallback(async (
    id: string,
    files: FileList | File[],
  ): Promise<Array<{ url: string; name: string; type: string }>> => {
    const fileArray = Array.from(files);
    const out: Array<{ url: string; name: string; type: string }> = [];
    const imageExts = ["jpg", "jpeg", "png", "webp", "heic", "heif", "gif", "bmp", "avif"];

    for (const file of fileArray) {
      const ext = file.name.split(".").pop()?.toLowerCase() || "";
      const isImage = file.type.startsWith("image/") || imageExts.includes(ext);
      const folder = isImage ? "photos/all" : "docs/general";
      try {
        let prepared: File = file;
        if (isImage) {
          const validation = validateImageFile(file);
          if (!validation.valid) { console.warn(`[unified] skip ${file.name}: ${validation.error}`); continue; }
          prepared = await convertToJpeg(file);
        } else {
          const validation = validateDocFile(file);
          if (!validation.valid) { console.warn(`[unified] skip ${file.name}: ${validation.error}`); continue; }
        }
        const result = await uploadFile(id, prepared, folder);
        if (result.url) {
          out.push({ url: result.url, name: file.name, type: file.type || (isImage ? "image/jpeg" : "application/octet-stream") });
        }
      } catch (err) {
        console.error(`[unified] upload failed: ${file.name}`, err);
      }
    }
    return out;
  }, [uploadFile]);

  // Helper: re-trigger CR extraction for a given doc URL
  const triggerCrExtraction = useCallback(async (documentUrl: string) => {
    setCrExtracting(true);
    try {
      const { data, error } = await supabase.functions.invoke("extract-cr-data", { body: { documentUrl } });
      const payload = (data || {}) as CrExtractionResult & { error?: string };
      if (error || payload.error || payload.is_valid_cr === false) {
        toast.error("تعذّر استخراج بيانات السجل — يمكنك الاستخراج يدوياً لاحقاً", { duration: 7000 });
        return;
      }
      const result = payload as CrExtractionResult;
      setCrExtraction(result);
      setCrExtractionDone(true);
      setDisclosure((prev) => ({
        ...prev,
        ...(result.business_activity && !prev.business_activity ? { business_activity: result.business_activity } : {}),
        ...(result.city && !prev.city ? { city: result.city } : {}),
        ...(result.district && !prev.district ? { district: result.district } : {}),
      }));
      toast.success("✨ تم اكتشاف سجلك التجاري واستخراج بياناته تلقائياً");
    } catch (err) {
      console.error("[unified] CR extraction failed:", err);
      toast.error("تعذّر استخراج بيانات السجل — يمكنك الاستخراج يدوياً لاحقاً", { duration: 7000 });
    } finally {
      setCrExtracting(false);
    }
  }, []);

  // Helper: classify uploaded files in batches of 3 with 1s delay
  const classifyAfterUpload = useCallback(async (
    id: string,
    uploaded: Array<{ url: string; name: string; type: string }>,
  ) => {
    if (uploaded.length === 0) return;
    setClassifyingFiles(true);
    setClassifyProgress({ current: 0, total: uploaded.length });

    const BATCH_SIZE = 3;
    const DELAY_MS = 1000;
    let done = 0;

    for (let i = 0; i < uploaded.length; i += BATCH_SIZE) {
      const batch = uploaded.slice(i, i + BATCH_SIZE);
      await Promise.all(batch.map(async (f) => {
        try {
          await supabase.functions.invoke("classify-uploaded-file", {
            body: {
              listing_id: id,
              file_url: f.url,
              file_name: f.name,
              file_type: f.type,
            },
          });
        } catch (err) {
          console.error(`[unified] classify failed: ${f.name}`, err);
        } finally {
          done += 1;
          setClassifyProgress({ current: done, total: uploaded.length });
        }
      }));
      if (i + BATCH_SIZE < uploaded.length) {
        await new Promise((r) => setTimeout(r, DELAY_MS));
      }
    }

    setClassifyingFiles(false);
    toast.success(`تم تصنيف ${uploaded.length} ملف — راجعها قبل النشر`);
  }, []);

  // Public handler: unified upload entry point
  const handleUnifiedUpload = useCallback(async (files: FileList) => {
    if (!files || files.length === 0) return;
    const id = await ensureListing();
    if (!id) return;
    setSaving(true);
    try {
      const uploaded = await uploadFilesToStorage(id, files);
      if (uploaded.length === 0) {
        toast.error("تعذّر رفع الملفات");
        return;
      }
      await classifyAfterUpload(id, uploaded);
    } finally {
      setSaving(false);
    }
  }, [ensureListing, uploadFilesToStorage, classifyAfterUpload]);

  // Public handler: confirm classifications → map to photos/documents and save
  const handleConfirmClassifications = useCallback(async () => {
    if (!listingId) return;

    const { data, error } = await supabase
      .from("file_classifications")
      .select("*")
      .eq("listing_id", listingId);

    if (error || !data) {
      toast.error("تعذّر قراءة التصنيفات");
      return;
    }

    // ─── Move sensitive files (legal/invoice) to private bucket ───
    // Path: {owner_id}/{listing_id}/{classification_id}.{ext}
    const ownerIdForPath = user?.id;
    const sensitiveCategories = new Set(["legal_document", "invoice_document"]);
    const PRIVATE_BUCKET = "listing-documents";
    const LEGACY_BUCKET = "listings";

    const parseLegacyPath = (url: string): string | null => {
      const m = url.match(/\/storage\/v1\/object\/public\/([^/]+)\/(.+)$/);
      if (!m) return null;
      if (m[1] !== LEGACY_BUCKET) return null;
      return decodeURIComponent(m[2]);
    };

    if (ownerIdForPath) {
      for (const c of data) {
        if (!sensitiveCategories.has(c.final_category)) continue;
        const legacyPath = parseLegacyPath(c.file_url || "");
        if (!legacyPath) continue; // already in new bucket or unknown shape
        try {
          const ext = (c.file_name?.split(".").pop() || "bin").toLowerCase().slice(0, 8);
          const newPath = `${ownerIdForPath}/${listingId}/${c.id}.${ext}`;

          // Cross-bucket transfer: download from public → upload to private → delete original

          // Download then upload to new bucket (cross-bucket transfer)
          const { data: blob, error: dlErr } = await supabase
            .storage
            .from(LEGACY_BUCKET)
            .download(legacyPath);
          if (dlErr || !blob) {
            console.warn(`[migrate] download failed for ${c.file_name}`, dlErr);
            continue;
          }
          const { error: upErr } = await supabase
            .storage
            .from(PRIVATE_BUCKET)
            .upload(newPath, blob, {
              contentType: c.file_type || "application/octet-stream",
              upsert: true,
            });
          if (upErr) {
            console.warn(`[migrate] upload failed for ${c.file_name}`, upErr);
            continue;
          }
          // Best-effort delete from legacy bucket
          await supabase.storage.from(LEGACY_BUCKET).remove([legacyPath]).catch(() => {});

          // Update file_classifications.file_url to the new bucket path reference
          const newRefUrl = `${PRIVATE_BUCKET}/${newPath}`;
          const { error: updErr } = await supabase
            .from("file_classifications")
            .update({ file_url: newRefUrl })
            .eq("id", c.id);
          if (updErr) {
            console.warn(`[migrate] db update failed for ${c.file_name}`, updErr);
            continue;
          }
          c.file_url = newRefUrl; // reflect locally for the mapping below
        } catch (err) {
          console.warn(`[migrate] unexpected error for ${c.file_name}`, err);
          // graceful: keep original URL
        }
      }
    }

    const photosByGroup: Record<string, string[]> = {
      interior: [], exterior: [], equipment: [], signage: [], building: [], street: [],
    };
    const invoiceUrls: string[] = [];
    const legalUrls: string[] = [];
    const assetListUrls: string[] = [];
    let crRegisterUrl: string | null = null;

    const validPhotoSubs = new Set(["interior", "exterior", "equipment", "signage", "building", "street"]);

    for (const c of data) {
      switch (c.final_category) {
        case "equipment_photo":
          photosByGroup.equipment.push(c.file_url);
          break;
        case "property_photo": {
          const sub = c.final_subcategory || "exterior";
          if (validPhotoSubs.has(sub)) {
            photosByGroup[sub].push(c.file_url);
          } else {
            console.warn(`[unified] unexpected photo subcategory "${sub}" — falling back to exterior`, c);
            photosByGroup.exterior.push(c.file_url);
          }
          break;
        }
        case "invoice_document":
          invoiceUrls.push(c.file_url);
          break;
        case "legal_document":
          legalUrls.push(c.file_url);
          if (c.final_subcategory === "commercial_register" && !crRegisterUrl) {
            crRegisterUrl = c.file_url;
          }
          break;
        case "asset_list":
          assetListUrls.push(c.file_url);
          break;
        // rejected, unclassified → skip
      }
    }

    const newDocuments: Array<{ type: string; files: string[] }> = [];
    if (invoiceUrls.length > 0) newDocuments.push({ type: "invoice", files: invoiceUrls });
    if (legalUrls.length > 0) newDocuments.push({ type: "legal", files: legalUrls });
    if (assetListUrls.length > 0) newDocuments.push({ type: "asset_list", files: assetListUrls });

    setPhotos(photosByGroup);
    setUploadedDocs({
      ...(invoiceUrls.length > 0 ? { invoice: invoiceUrls } : {}),
      ...(legalUrls.length > 0 ? { legal: legalUrls } : {}),
      ...(assetListUrls.length > 0 ? { asset_list: assetListUrls } : {}),
    });

    try {
      await updateListing(listingId, { photos: photosByGroup, documents: newDocuments } as never);
    } catch (err) {
      console.error("[unified] save listing failed", err);
      toast.error("تعذّر حفظ التصنيفات");
      return;
    }

    setReviewDialogOpen(false);
    toast.success("تم حفظ تصنيفات ملفاتك");

    if (crRegisterUrl && !crExtractionDone) {
      await triggerCrExtraction(crRegisterUrl);
    }
  }, [listingId, updateListing, crExtractionDone, triggerCrExtraction, user?.id]);

  // Public handler: manual CR re-extraction
  const handleManualCrExtract = useCallback(async () => {
    if (!listingId) return;
    const { data, error } = await supabase
      .from("file_classifications")
      .select("file_url")
      .eq("listing_id", listingId)
      .eq("final_category", "legal_document")
      .eq("final_subcategory", "commercial_register")
      .limit(1)
      .maybeSingle();

    if (error || !data?.file_url) {
      toast.error("لم يتم العثور على سجل تجاري — ارفع سجلك التجاري أولاً");
      return;
    }
    await triggerCrExtraction(data.file_url);
  }, [listingId, triggerCrExtraction]);

  // Shared state for step components
  const sharedState: CreateListingSharedState = {
    dealStructure, setDealStructure, photos, setPhotos, localPreviews, setLocalPreviews,
    uploadingGroup, setUploadingGroup, uploadProgress, setUploadProgress, uploadedDocs, setUploadedDocs, docConfidence,
    activePhotoGroup, setActivePhotoGroup, activeDocType, setActiveDocType,
    fileInputRef: fileInputRef as React.RefObject<HTMLInputElement>, docInputRef: docInputRef as React.RefObject<HTMLInputElement>, bulkInputRef: bulkInputRef as React.RefObject<HTMLInputElement>,
    draggingGroup, setDraggingGroup, fileStatuses, setFileStatuses,
    analyzing, analyzed, analyzeProgress, inventory, setInventory, analysisSummary, dedupActions, handleAnalyze,
    crExtraction, crExtracting, crExtractionDone, isCrOnly,
    disclosure, setDisclosure, locationLat, locationLng, setLocationLat, setLocationLng, areaSqm, setAreaSqm,
    sellerNote, setSellerNote, sellerName, inventoryPricingMode, setInventoryPricingMode, bulkInventoryPrice, setBulkInventoryPrice,
    listingId, saving, loading, updateListing,
    publishAttempted, setPublishAttempted, canPublish, photosOk, disclosureErrors, locationOk,
    dealCheckLoading, dealCheckResult, dealCheckError, handleRunInlineDealCheck, handlePublishClick,
    stepDirection, totalPhotos, allPhotoUrls, imageReq, primaryDealLabel, disclosureScore,
    editingItemId, setEditingItemId, photoGroups, getGroupDisplayUrls, handleDrop, dynamicDocTypes,
    handleBulkDrop: (files: FileList) => handleBulkUploadFiles(files),
    // ═══════════ Unified Upload (Commit 4 — Step E) ═══════════
    usesUnifiedUpload,
    classifyProgress,
    classifyingFiles,
    reviewDialogOpen,
    setReviewDialogOpen,
    handleUnifiedUpload,
    handleConfirmClassifications,
    handleManualCrExtract,
    unifiedFileCount,
    unifiedUnconfirmedCount,
  };

  if (draftLoading) {
    return (
      <div className="py-20 flex flex-col items-center justify-center gap-3">
        <Loader2 size={28} className="animate-spin text-primary" />
        <p className="text-sm text-muted-foreground">جارٍ التحقق من المسودات السابقة...</p>
      </div>
    );
  }

  return (
    <VerificationGate message="يجب توثيق رقم جوالك قبل إضافة إعلان">
    <div className="py-8">
      <div className="container max-w-3xl">
        <h1 className="text-2xl font-medium mb-2">إضافة فرصة تقبيل</h1>
        <p className="text-sm text-muted-foreground">أنشئ إعلان تقبيل احترافي بمساعدة الذكاء الاصطناعي <AiInlineStar size={12} /></p>
        <p className="text-sm font-bold text-primary animate-fade-in [animation-delay:0.5s] [animation-fill-mode:backwards] mb-2">
          <Sparkles size={14} className="inline-block ml-1" />
          بدون ما تكتب سطر واحد
        </p>

        {draftRestored && (
          <div className="mb-4 bg-success/10 border border-success/30 rounded-xl px-4 py-2.5 flex items-center gap-2 animate-fade-in">
            <Check size={16} className="text-success shrink-0" />
            <p className="text-xs text-success font-medium">تم استعادة مسودتك السابقة — يمكنك المتابعة من حيث توقفت</p>
            <button onClick={() => setDraftRestored(false)} className="mr-auto text-success/60 hover:text-success text-xs">✕</button>
          </div>
        )}

        <input ref={fileInputRef} type="file" accept="image/*,.heic,.heif,.raw,.cr2,.nef,.arw,.dng,.pdf" multiple className="hidden" onChange={handlePhotoUpload} />
        <input ref={docInputRef} type="file" accept="*/*" multiple className="hidden" onChange={handleDocUpload} />
        <input ref={bulkInputRef} type="file" accept="image/*,.heic,.heif,.raw,.cr2,.nef,.arw,.dng,.pdf,.doc,.docx,.xls,.xlsx,.txt,.csv,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,text/plain,text/csv" multiple className="hidden" onChange={handleBulkUpload} />

        {/* 4-step progress */}
        <div className="flex items-center justify-between mb-8 pb-2 gap-1">
          {steps.map((step, i) => (
            <div key={step.label} className="flex items-center gap-1 flex-1">
              <button type="button" onClick={() => { if (i < currentStep) setCurrentStep(i); }}
                className={cn("flex items-center gap-1 px-2 py-2 rounded-xl text-[11px] whitespace-nowrap transition-all w-full justify-center",
                  i === currentStep ? "bg-primary/10 text-primary font-medium border border-primary/20" : i < currentStep ? "text-success cursor-pointer hover:bg-success/5" : "text-muted-foreground"
                )}>
                {i < currentStep ? <Check size={12} strokeWidth={2} /> : <step.icon size={12} strokeWidth={1.3} />}
                <span className="hidden sm:inline">{step.label}</span>
                <span className="sm:hidden">{i + 1}</span>
              </button>
              {i < steps.length - 1 && <div className="w-4 h-px bg-border shrink-0" />}
            </div>
          ))}
        </div>

        {/* Step hint */}
        <div className="flex items-center justify-center gap-2 mb-6 animate-fade-in" key={currentStep}>
          <Sparkles size={14} strokeWidth={1.5} className="text-primary shrink-0" />
          <span className="text-sm font-medium text-primary">{steps[currentStep].hint}</span>
        </div>

        {/* Auto-save status + Completion bar */}
        <div className="flex items-center justify-between mb-4 gap-3">
          <div className="flex-1">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[10px] text-muted-foreground">اكتمال البيانات</span>
              <span className="text-[10px] font-medium text-primary">{completionPercent}%</span>
            </div>
            <div className="h-1.5 rounded-full bg-muted overflow-hidden">
              <div className="h-full rounded-full gradient-primary transition-all duration-500" style={{ width: `${completionPercent}%` }} />
            </div>
          </div>
          <div className="shrink-0">
            {autoSaveStatus === "saving" && (
              <div className="flex items-center gap-1.5 text-[10px] text-primary animate-fade-in">
                <Loader2 size={12} className="animate-spin" /> جاري الحفظ...
              </div>
            )}
            {autoSaveStatus === "saved" && (
              <div className="flex items-center gap-1.5 text-[10px] text-success animate-fade-in">
                <Check size={12} strokeWidth={2} /> تم الحفظ تلقائياً
              </div>
            )}
          </div>
        </div>

        <div className="bg-card rounded-2xl shadow-soft p-6 md:p-8 min-h-[400px]">
          {currentStep === 0 && <CreateListingStep1 dealStructure={dealStructure} setDealStructure={setDealStructure} stepDirection={stepDirection} />}
          {currentStep === 1 && <CreateListingStep2 state={sharedState} />}
          {currentStep === 2 && <CreateListingStep3 state={sharedState} />}
          {currentStep === 3 && <CreateListingStep4 state={sharedState} />}
        </div>

        {/* Navigation */}
        <div className="flex items-center justify-between mt-6">
          <div className="flex items-center gap-2">
            {currentStep > 0 && (
              <Button variant="outline" onClick={handleBack} className="rounded-xl active:scale-[0.98]">
                <ArrowRight size={16} strokeWidth={1.5} /> السابق
              </Button>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" onClick={async () => { await saveDraft(); toast.success("تم حفظ المسودة", { icon: "💾", duration: 4000 }); navigate("/dashboard"); }} disabled={saving || !listingId} className="rounded-xl text-muted-foreground hover:text-foreground active:scale-[0.98]">
              <Save size={15} strokeWidth={1.5} /> حفظ والمتابعة لاحقاً
            </Button>
            {currentStep < steps.length - 1 && (
              <Button onClick={handleNext} disabled={(currentStep === 0 && !dealStructure.isValid) || saving || (currentStep === 2 && analyzing)} className="gradient-primary text-primary-foreground rounded-xl active:scale-[0.98]">
                {t("common.next")} <ArrowLeft size={16} strokeWidth={1.5} />
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Duplicate Listing Warning Modal */}
      {duplicateCandidate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm animate-fade-in" onClick={() => setDuplicateCandidate(null)}>
          <div className="bg-card border border-border/50 rounded-2xl shadow-2xl w-full max-w-md mx-4 p-6 space-y-5 animate-scale-in" onClick={(e) => e.stopPropagation()}>
            <div className="text-center">
              <div className="w-12 h-12 rounded-full bg-amber-100 flex items-center justify-center mx-auto mb-3">
                <AlertTriangle size={24} strokeWidth={1.5} className="text-amber-600" />
              </div>
              <h3 className="font-semibold text-lg mb-1">إعلان مشابه منشور بالفعل</h3>
              <p className="text-sm text-muted-foreground">يبدو أن لديك إعلاناً مشابهاً منشوراً. هل تريد تعديله بدلاً من إنشاء إعلان جديد؟</p>
            </div>
            <div className="bg-muted/40 rounded-xl p-4 space-y-2 text-sm">
              <div className="flex items-center justify-between"><span className="text-muted-foreground">الإعلان</span><span className="font-medium text-foreground truncate max-w-[60%] text-end">{duplicateCandidate.title}</span></div>
              {duplicateCandidate.city && (<><div className="border-t border-border/30" /><div className="flex items-center justify-between"><span className="text-muted-foreground">المدينة</span><span className="font-medium text-foreground">{duplicateCandidate.city}</span></div></>)}
              {duplicateCandidate.price != null && (<><div className="border-t border-border/30" /><div className="flex items-center justify-between"><span className="text-muted-foreground">السعر</span><span className="font-medium text-foreground">{Number(duplicateCandidate.price).toLocaleString()} <SarSymbol size={10} /></span></div></>)}
            </div>
            <div className="flex flex-col gap-2">
              <Button onClick={() => { const id = duplicateCandidate.id; setDuplicateCandidate(null); navigate(`/listing/${id}`); }} className="rounded-xl gradient-primary text-primary-foreground">
                تعديل الإعلان الحالي
              </Button>
              <Button variant="outline" onClick={() => { setDuplicateCandidate(null); setDuplicateAcknowledged(true); setTimeout(() => handlePublishClick(), 0); }} className="rounded-xl">
                نشر كإعلان جديد
              </Button>
              <Button variant="ghost" onClick={() => setDuplicateCandidate(null)} className="rounded-xl text-muted-foreground">
                إلغاء
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Publish Confirmation Modal */}
      {showPublishConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm animate-fade-in" onClick={() => !dealCheckLoading && setShowPublishConfirm(false)}>
          <div className="bg-card border border-border/50 rounded-2xl shadow-2xl w-full max-w-lg mx-4 p-6 space-y-5 animate-scale-in max-h-[85vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="text-center">
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-3">
                {dealCheckResult ? <Check size={24} strokeWidth={1.5} className="text-primary" /> : <AiStar size={24} />}
              </div>
              <h3 className="font-semibold text-lg mb-1">{dealCheckResult ? "تأكيد نشر الإعلان" : "فحص الصفقة قبل النشر"}</h3>
              <p className="text-xs text-muted-foreground">{dealCheckResult ? "تمت مراجعة الصفقة — هل تريد المتابعة بالنشر؟" : "الـAI يحلل صفقتك ويعطيك توصية قبل النشر"}</p>
            </div>
            <div className="space-y-2 bg-muted/30 rounded-xl p-4 text-sm">
              <div className="flex items-center justify-between"><span className="text-muted-foreground">العنوان</span><span className="font-medium text-foreground">{disclosure.business_activity || "—"}</span></div>
              <div className="border-t border-border/30" />
              <div className="flex items-center justify-between"><span className="text-muted-foreground">المدينة</span><span className="font-medium text-foreground">{disclosure.city || "—"}</span></div>
              <div className="border-t border-border/30" />
              <div className="flex items-center justify-between"><span className="text-muted-foreground">السعر</span><span className="font-medium text-foreground">{disclosure.price ? <>{Number(disclosure.price).toLocaleString()} <SarSymbol size={10} /></> : "—"}</span></div>
            </div>
            {dealCheckLoading && (
              <div className="py-8 flex flex-col items-center gap-3">
                <div className="relative"><AiStar size={28} /><Loader2 size={44} strokeWidth={1} className="absolute -top-2 -left-2 text-primary/30 animate-spin" /></div>
                <p className="text-sm font-medium">جاري فحص الصفقة...</p>
              </div>
            )}
            {dealCheckError && !dealCheckLoading && (
              <div className="bg-warning/10 border border-warning/30 rounded-xl p-3 flex items-start gap-2">
                <AlertTriangle size={14} className="text-warning shrink-0 mt-0.5" />
                <div><p className="text-xs font-medium text-warning">تعذّر إجراء الفحص التلقائي</p><p className="text-[10px] text-muted-foreground mt-0.5">{dealCheckError}</p></div>
              </div>
            )}
            {dealCheckResult && !dealCheckLoading && (
              <div className={cn("rounded-xl p-3 border",
                dealCheckResult.ratingColor === "green" ? "bg-emerald-50 border-emerald-200" :
                dealCheckResult.ratingColor === "yellow" ? "bg-amber-50 border-amber-200" :
                dealCheckResult.ratingColor === "red" ? "bg-red-50 border-red-200" :
                "bg-muted border-border"
              )}>
                <div className="flex items-center justify-between">
                  <span className={cn("text-sm font-medium",
                    dealCheckResult.ratingColor === "green" ? "text-emerald-700" :
                    dealCheckResult.ratingColor === "yellow" ? "text-amber-700" :
                    dealCheckResult.ratingColor === "red" ? "text-red-700" : "text-foreground"
                  )}>{dealCheckResult.rating}</span>
                  <span className="text-[11px] text-muted-foreground">عدالة السعر: {dealCheckResult.fairnessVerdict}</span>
                </div>
              </div>
            )}
            <div className="flex gap-3">
              <Button variant="outline" onClick={() => setShowPublishConfirm(false)} disabled={dealCheckLoading} className="flex-1 rounded-xl">إلغاء</Button>
              <Button onClick={handlePublish} disabled={saving || dealCheckLoading} className="flex-1 gradient-primary text-primary-foreground rounded-xl">
                {saving ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} strokeWidth={1.5} />}
                {dealCheckResult ? "موافق — انشر الإعلان" : "تأكيد النشر"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
    </VerificationGate>
  );
};

export default CreateListingPage;
