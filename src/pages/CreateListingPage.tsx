import { useState, useCallback, useRef, useEffect } from "react";
import { heicTo, isHeic } from "heic-to";
import { validateImageFile, validateDocFile, logAudit } from "@/lib/security";
import {
  Check,
  Upload,
  Camera,
  FileText,
  ClipboardList,
  Eye,
  ArrowLeft,
  ArrowRight,
  Plus,
  Trash2,
  Loader2,
  Shield,
  AlertTriangle,
  Minus,
  Image as ImageIcon,
  DoorOpen,
  Building2,
  MapPin,
  Tag,
  Wrench,
  Sparkles,
  Save,
} from "lucide-react";
import AiStar from "@/components/AiStar";
import AiInlineStar from "@/components/AiInlineStar";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

import { useListings } from "@/hooks/useListings";
import { useAuthContext } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import SarSymbol from "@/components/SarSymbol";
import DealStructureEngine, { type DealStructureSelection } from "@/components/DealStructureEngine";
import { DEAL_TYPE_MAP } from "@/lib/dealStructureConfig";
import { supabase } from "@/integrations/supabase/client";
import { calculateTransparency } from "@/lib/transparencyScore";
import TransparencyIndicator from "@/components/TransparencyIndicator";
import { getRules, isFieldVisible, validateDisclosure, validateImages, FIELD_LABELS as RULE_FIELD_LABELS } from "@/lib/dealTypeFieldRules";
import VerificationGate from "@/components/VerificationGate";
import GoogleMapPicker from "@/components/GoogleMapPicker";
import { toEnglishNumerals } from "@/lib/arabicNumerals";
import { useSEO } from "@/hooks/useSEO";

const steps = [
  { label: "هيكل الصفقة", icon: Shield, hint: "اختر نوع الصفقة — والباقي على الـAI ✦" },
  { label: "الصور والمستندات", icon: Camera, hint: "ارفع الصور والمستندات فقط — الـAI ✦ يتكفّل بالباقي" },
  { label: "التحليل الذكي", icon: Eye, hint: "الـAI ✦ يحلل ويجرد تلقائياً — فقط راجع وأكّد" },
  { label: "الإفصاح والنشر", icon: Check, hint: "أكمل البيانات وانشر بضغطة واحدة" },
];

const allPhotoGroups = [
  { id: "interior", label: "صور داخلية للمحل", min: 3, icon: "Camera", dealTypes: ["full_takeover", "transfer_no_liabilities", "assets_setup"] },
  { id: "exterior", label: "واجهة المحل", min: 2, icon: "DoorOpen", dealTypes: ["full_takeover", "transfer_no_liabilities", "assets_setup"] },
  { id: "building", label: "المبنى", min: 1, icon: "Building2", dealTypes: ["full_takeover", "transfer_no_liabilities"] },
  { id: "street", label: "الشارع المحيط", min: 1, icon: "MapPin", dealTypes: ["full_takeover", "transfer_no_liabilities"] },
  { id: "signage", label: "اللوحة / اللافتة", min: 1, icon: "Tag", dealTypes: ["full_takeover", "transfer_no_liabilities"] },
  { id: "equipment", label: "المعدات والأجهزة", min: 4, icon: "Wrench", dealTypes: ["full_takeover", "transfer_no_liabilities", "assets_setup", "assets_only"] },
];

// Image requirement now driven by central schema
function getImageRequirement(dealType: string): "required" | "optional" | "none" {
  const rules = getRules(dealType);
  if (rules.imageRequired) return "required";
  return "optional";
}

import type { InventoryItem, InventoryPricingMode, DedupAction, CrExtractionResult } from "./create-listing/types";
import { ConfirmationCard } from "./create-listing/ConfirmationCard";
import { FormField, SelectField } from "./create-listing/FormFields";

const CreateListingPage = () => {
  useSEO({ title: "أضف فرصة جديدة", description: "أنشئ إعلان تقبيل جديد على سوق تقبيل — أضف تفاصيل مشروعك واجذب المشترين", canonical: "/create-listing" });
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
  const [listingId, setListingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [locationLat, setLocationLat] = useState<number | null>(null);
  const [locationLng, setLocationLng] = useState<number | null>(null);
  const [sellerNote, setSellerNote] = useState("");
  const [areaSqm, setAreaSqm] = useState<string>("");
  const SELLER_NOTE_MAX = 300;
  const [inventoryPricingMode, setInventoryPricingMode] = useState<InventoryPricingMode>("per_item");
  const [bulkInventoryPrice, setBulkInventoryPrice] = useState<string>("");

  const [disclosure, setDisclosure] = useState({
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

  const { createListing, updateListing, uploadFile, getMyDraft, loading } = useListings();
  const { profile } = useAuthContext();
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

  // CR-only extraction state
  const [crExtraction, setCrExtraction] = useState<CrExtractionResult | null>(null);
  const [crExtracting, setCrExtracting] = useState(false);
  const [crExtractionDone, setCrExtractionDone] = useState(false);

  const isCrOnly = false; // cr_only deal type removed

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
        type_id: id,
        priority: i,
        is_primary: id === dealStructure.primaryType,
      })),
      status: "draft",
    } as never);

    if (error || !data) {
      toast.error("حدث خطأ أثناء حفظ المسودة");
      return null;
    }

    const id = (data as { id: string }).id;
    setListingId(id);
    return id;
  }, [listingId, dealStructure, createListing]);

  // ── Draft restore on mount ──
  useEffect(() => {
    const restoreDraft = async () => {
      try {
        const draft = await getMyDraft();
        if (draft) {
          setListingId(draft.id);
          if (draft.primary_deal_type) {
            const selectedTypes = Array.isArray(draft.deal_options)
              ? (draft.deal_options as Array<{ type_id: string; priority: number; is_primary: boolean }>).map((o) => o.type_id)
              : [draft.primary_deal_type];
            setDealStructure((prev) => ({
              ...prev,
              selectedTypes,
              primaryType: draft.primary_deal_type || selectedTypes[0] || "",
              isValid: selectedTypes.length > 0,
            }));
          }
          if (draft.photos && typeof draft.photos === "object") {
            setPhotos(draft.photos as Record<string, string[]>);
            setLocalPreviews(draft.photos as Record<string, string[]>);
          }
          if (Array.isArray(draft.inventory) && draft.inventory.length > 0) {
            setInventory(draft.inventory as InventoryItem[]);
            setAnalyzed(true);
          }
          if (Array.isArray(draft.documents) && draft.documents.length > 0) {
            // Restore docs grouped - keep as flat for now
          }
          setDisclosure((prev) => ({
            ...prev,
            business_activity: draft.business_activity || "",
            city: draft.city || "",
            district: draft.district || "",
            price: draft.price != null ? String(draft.price) : "",
            annual_rent: draft.annual_rent != null ? String(draft.annual_rent) : "",
            lease_duration: draft.lease_duration || "",
            lease_paid_period: draft.lease_paid_period || "",
            lease_remaining: draft.lease_remaining || "",
            liabilities: draft.liabilities || "",
            overdue_salaries: draft.overdue_salaries || "",
            overdue_rent: draft.overdue_rent || "",
            municipality_license: draft.municipality_license || "",
            civil_defense_license: draft.civil_defense_license || "",
            surveillance_cameras: draft.surveillance_cameras || "",
          }));
          // Restore location
          if ((draft as any).location_lat) setLocationLat((draft as any).location_lat);
          if ((draft as any).location_lng) setLocationLng((draft as any).location_lng);
          setDraftRestored(true);
          toast.success("تم استعادة مسودتك السابقة تلقائياً", { icon: "📋" });
        }
      } catch (err) {
        console.error("Draft restore failed", err);
      } finally {
        setDraftLoading(false);
      }
    };
    restoreDraft();
  }, [getMyDraft]);

  // ── Auto-save every 30 seconds ──
  const saveDraft = useCallback(async () => {
    if (!listingId || saving) return;
    setAutoSaveStatus("saving");
    try {
      await updateListing(listingId, {
        ...disclosure,
        price: disclosure.price ? Number(disclosure.price) : null,
        annual_rent: disclosure.annual_rent ? Number(disclosure.annual_rent) : null,
        inventory: inventory.filter((item) => item.included),
        deal_type: dealStructure.primaryType || "full_takeover",
        primary_deal_type: dealStructure.primaryType,
        deal_options: dealStructure.selectedTypes.map((id, i) => ({
          type_id: id,
          priority: i,
          is_primary: id === dealStructure.primaryType,
        })),
        deal_disclosures: dealStructure.requiredDisclosures,
        required_documents: dealStructure.requiredDocuments,
        location_lat: locationLat,
        location_lng: locationLng,
      } as never);
      setAutoSaveStatus("saved");
      setTimeout(() => setAutoSaveStatus("idle"), 3000);
    } catch (err) {
      console.error("Auto-save failed", err);
      setAutoSaveStatus("idle");
    }
  }, [listingId, saving, disclosure, inventory, dealStructure, updateListing, locationLat, locationLng]);

  useEffect(() => {
    autoSaveTimerRef.current = setInterval(() => {
      saveDraft();
    }, 30000);
    return () => {
      if (autoSaveTimerRef.current) clearInterval(autoSaveTimerRef.current);
    };
  }, [saveDraft]);

  const isHeicLikeFile = useCallback(async (file: File) => {
    const name = file.name.toLowerCase();
    if (file.type === "image/heic" || file.type === "image/heif" || name.endsWith(".heic") || name.endsWith(".heif")) {
      return true;
    }
    try {
      return await isHeic(file);
    } catch {
      return false;
    }
  }, []);

  const convertToJpeg = useCallback(async (file: File): Promise<File> => {
    const webFriendly = ["image/jpeg", "image/png", "image/webp", "image/gif"];
    if (webFriendly.includes(file.type)) return file;

    if (await isHeicLikeFile(file)) {
      const blob = await heicTo({
        blob: file,
        type: "image/jpeg",
        quality: 0.92,
      });
      const newName = file.name.replace(/\.[^.]+$/i, ".jpg");
      return new File([blob], newName, { type: "image/jpeg" });
    }

    try {
      const bitmap = await createImageBitmap(file);
      const canvas = document.createElement("canvas");
      canvas.width = bitmap.width;
      canvas.height = bitmap.height;
      const ctx = canvas.getContext("2d");
      if (!ctx) return file;
      ctx.drawImage(bitmap, 0, 0);
      bitmap.close();
      const blob = await new Promise<Blob | null>((resolve) => {
        canvas.toBlob(resolve, "image/jpeg", 0.92);
      });
      if (!blob) return file;
      const newName = file.name.replace(/\.[^.]+$/i, ".jpg");
      return new File([blob], newName, { type: "image/jpeg" });
    } catch {
      return file;
    }
  }, [isHeicLikeFile]);

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || !activePhotoGroup) return;

    const id = await ensureListing();
    if (!id) return;

    const group = activePhotoGroup;
    const rawFiles = Array.from(e.target.files);
    const uploadedUrls: string[] = [];

    setUploadingGroup(group);
    setUploadProgress({ current: 0, total: rawFiles.length });
    setSaving(true);

    try {
      for (let i = 0; i < rawFiles.length; i++) {
        const originalFile = rawFiles[i];
        setUploadProgress({ current: i + 1, total: rawFiles.length });

        const isPdf = originalFile.type === "application/pdf" || originalFile.name.toLowerCase().endsWith(".pdf");

        if (!isPdf) {
          const validation = validateImageFile(originalFile);
          if (!validation.valid) {
            toast.error(validation.error);
            continue;
          }
        }

        try {
          const preparedFile = isPdf ? originalFile : await convertToJpeg(originalFile);
          const previewUrl = isPdf ? "" : URL.createObjectURL(preparedFile);

          if (previewUrl) {
            setLocalPreviews((prev) => ({
              ...prev,
              [group]: [...(prev[group] || []), previewUrl],
            }));
          }

          const url = await uploadFile(id, preparedFile, `photos/${group}`);
          if (url) uploadedUrls.push(url);
        } catch (error) {
          console.error("photo preparation failed", error);
          toast.error(`تعذّر تجهيز الصورة ${originalFile.name}`);
        }
      }

      setPhotos((prev) => {
        const updatedPhotos = {
          ...prev,
          [group]: [...(prev[group] || []), ...uploadedUrls],
        };
        // Save to DB inside callback to guarantee latest state
        updateListing(id, { photos: updatedPhotos } as never).catch((err) =>
          console.error("Photo DB sync failed", err)
        );
        return updatedPhotos;
      });

      if (uploadedUrls.length > 0) {
        toast.success(`تم تجهيز ورفع ${uploadedUrls.length} ملف بنجاح`);

        // Auto-trigger CR extraction for CR-only listings
        if (isCrOnly && group === "cr_doc" && uploadedUrls.length > 0 && !crExtractionDone) {
          handleCrExtraction(uploadedUrls[0]);
        }
      }
    } finally {
      setSaving(false);
      setUploadingGroup(null);
      e.target.value = "";
    }
  };

  const handleDocUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || !activeDocType) return;
    const id = await ensureListing();
    if (!id) return;

    setSaving(true);
    const files = Array.from(e.target.files);
    const urls: string[] = [];

    for (const file of files) {
      const validation = validateDocFile(file);
      if (!validation.valid) {
        toast.error(validation.error);
        continue;
      }
      const url = await uploadFile(id, file, `docs/${activeDocType}`);
      if (url) urls.push(url);
    }

    setUploadedDocs((prev) => ({
      ...prev,
      [activeDocType]: [...(prev[activeDocType] || []), ...urls],
    }));

    const allDocs = { ...uploadedDocs, [activeDocType]: [...(uploadedDocs[activeDocType] || []), ...urls] };
    await updateListing(id, { documents: Object.entries(allDocs).map(([type, filesForType]) => ({ type, files: filesForType })) } as never);
    setSaving(false);
    e.target.value = "";
  };

  const handleBulkUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    const id = await ensureListing();
    if (!id) return;

    const allFiles = Array.from(e.target.files);
    const imageExts = ["jpg", "jpeg", "png", "webp", "heic", "heif", "gif", "bmp", "avif"];
    const imageFiles: File[] = [];
    const docFiles: File[] = [];

    for (const f of allFiles) {
      const ext = f.name.split(".").pop()?.toLowerCase() || "";
      const isImage = f.type.startsWith("image/") || imageExts.includes(ext);
      if (isImage) {
        if (imageFiles.length < 50) imageFiles.push(f);
      } else {
        if (docFiles.length < 50) docFiles.push(f);
      }
    }

    if (imageFiles.length === 0 && docFiles.length === 0) return;

    setSaving(true);
    const totalFiles = imageFiles.length + docFiles.length;
    setUploadProgress({ current: 0, total: totalFiles });
    setUploadingGroup("bulk");

    try {
      // Upload images
      const imageUrls: string[] = [];
      for (let i = 0; i < imageFiles.length; i++) {
        setUploadProgress({ current: i + 1, total: totalFiles });
        try {
          const validation = validateImageFile(imageFiles[i]);
          if (!validation.valid) { toast.error(`${imageFiles[i].name}: ${validation.error}`); continue; }
          const prepared = await convertToJpeg(imageFiles[i]);
          const previewUrl = URL.createObjectURL(prepared);
          setLocalPreviews(prev => ({ ...prev, all: [...(prev.all || []), previewUrl] }));
          const url = await uploadFile(id, prepared, "photos/all");
          if (url) imageUrls.push(url);
        } catch {
          toast.error(`تعذر تجهيز ${imageFiles[i].name}`);
        }
      }

      if (imageUrls.length > 0) {
        setPhotos(prev => {
          const updated = { ...prev, all: [...(prev.all || []), ...imageUrls] };
          updateListing(id, { photos: updated } as never).catch(console.error);
          return updated;
        });
      }

      // Upload documents
      const docUrls: string[] = [];
      for (let i = 0; i < docFiles.length; i++) {
        setUploadProgress({ current: imageFiles.length + i + 1, total: totalFiles });
        const validation = validateDocFile(docFiles[i]);
        if (!validation.valid) { toast.error(`${docFiles[i].name}: ${validation.error}`); continue; }
        const url = await uploadFile(id, docFiles[i], "docs/general");
        if (url) docUrls.push(url);
      }

      if (docUrls.length > 0) {
        setUploadedDocs(prev => {
          const updated = { ...prev, general: [...(prev.general || []), ...docUrls] };
          updateListing(id, { documents: Object.entries(updated).map(([type, files]) => ({ type, files })) } as never).catch(console.error);
          return updated;
        });

        // Auto-trigger CR extraction on first PDF document
        const firstPdfUrl = docUrls.find(url => url.toLowerCase().includes(".pdf"));
        if (firstPdfUrl && !crExtractionDone) {
          handleCrExtraction(firstPdfUrl);
        }
      }

      const uploadedTotal = imageUrls.length + docUrls.length;
      if (uploadedTotal > 0) {
        toast.success(`تم رفع ${uploadedTotal} ملف بنجاح — ${imageUrls.length} صورة و ${docUrls.length} مستند`);
      }
    } finally {
      setSaving(false);
      setUploadingGroup(null);
      e.target.value = "";
    }
  };

  // ── CR document extraction ──
  const handleCrExtraction = useCallback(async (documentUrl: string) => {
    setCrExtracting(true);
    try {
      const { data, error } = await supabase.functions.invoke("extract-cr-data", {
        body: { documentUrl },
      });

      if (error || !data || (data as { error?: string }).error) {
        throw new Error((data as { error?: string })?.error || error?.message || "فشل استخراج البيانات");
      }

      const result = data as CrExtractionResult;
      setCrExtraction(result);
      setCrExtractionDone(true);

      // Auto-fill disclosure fields from extraction (only if user hasn't typed yet)
      setDisclosure((prev) => ({
        ...prev,
        ...(result.business_activity && !prev.business_activity ? { business_activity: result.business_activity } : {}),
        ...(result.city && !prev.city ? { city: result.city } : {}),
        ...(result.district && !prev.district ? { district: result.district } : {}),
      }));

      if (result.extraction_confidence === "high") {
        toast.success("تم استخراج بيانات السجل التجاري بنجاح — راجع البيانات وأكّدها", { duration: 5000 });
      } else if (result.extraction_confidence === "medium") {
        toast.info("تم استخراج بعض البيانات — يرجى مراجعة وإكمال الحقول الناقصة", { duration: 5000 });
      } else {
        toast.warning("لم نتمكن من استخراج بيانات كافية من المستند — يرجى إكمال الحقول يدوياً", { duration: 6000 });
      }
    } catch (err) {
      console.error("CR extraction failed:", err);
      toast.error("تعذّر استخراج البيانات من السجل التجاري — يمكنك إكمال الحقول يدوياً");
      setCrExtractionDone(true);
    } finally {
      setCrExtracting(false);
    }
  }, []);

  const handleAnalyze = async () => {
    const allPhotoUrlsForAnalysis = Object.values(photos).flat();

    if (allPhotoUrlsForAnalysis.length === 0) {
      toast.error("يرجى رفع صور أولاً");
      return;
    }

    const unsupportedUrls = allPhotoUrlsForAnalysis.filter((url) => /\.(heic|heif)(\?|$)/i.test(url));
    if (unsupportedUrls.length > 0) {
      toast.error("هناك صور قديمة بصيغة HEIC غير قابلة للتحليل. أعد رفعها ليتم تحويلها تلقائياً.");
      return;
    }

    const MAX_ANALYSIS_IMAGES = 50;
    const totalImages = allPhotoUrlsForAnalysis.length;
    const limitedUrls = allPhotoUrlsForAnalysis.slice(0, MAX_ANALYSIS_IMAGES);

    if (totalImages > MAX_ANALYSIS_IMAGES) {
      toast.info(`لديك ${totalImages} صورة — سيتم تحليل أول ${MAX_ANALYSIS_IMAGES} صورة فقط. الصور المتبقية لن تُحلل.`, { duration: 6000 });
    }

    setAnalyzing(true);
    setAnalyzeProgress(10);

    const progressInterval = setInterval(() => {
      setAnalyzeProgress((prev) => Math.min(prev + 8, 85));
    }, 1500);

    try {
      // Collect document URLs for AI extraction
      const allDocUrls = Object.values(uploadedDocs).flat();

      const { data, error } = await supabase.functions.invoke("analyze-inventory", {
        body: { photoUrls: limitedUrls, photoGroups: photos, documentUrls: allDocUrls },
      });

      clearInterval(progressInterval);
      setAnalyzeProgress(100);

      if (error || !data || (data as { error?: string }).error) {
        throw new Error((data as { error?: string })?.error || error?.message || "فشل التحليل");
      }

      const assets: InventoryItem[] = (((data as { assets?: Array<Record<string, unknown>> }).assets) || []).map((asset, i) => ({
        id: String(i + 1),
        name: String(asset.name || "أصل غير مسمى"),
        qty: Number(asset.quantity || 1),
        condition: String(asset.condition || "غير واضح"),
        category: String(asset.category || "أخرى"),
        included: true,
        confidence: (asset.confidence as InventoryItem["confidence"]) || "medium",
        detectionNote: String(asset.detection_note || ""),
        photoIndices: Array.isArray(asset.photo_indices) ? (asset.photo_indices as number[]) : [],
        isSameAssetMultipleAngles: Boolean(asset.is_same_asset_multiple_angles),
        userConfirmed: asset.confidence === "high",
      }));

      setInventory(assets);
      setAnalysisSummary(String((data as { analysis_summary?: string }).analysis_summary || ""));
      setDedupActions((((data as { dedup_actions?: DedupAction[] }).dedup_actions) || []));
      setAnalyzed(true);

      // Auto-fill disclosure from extracted document info
      const extracted = (data as { extracted_info?: Record<string, string> }).extracted_info;
      if (extracted) {
        setDisclosure(prev => ({
          ...prev,
          ...(extracted.business_activity && !prev.business_activity ? { business_activity: extracted.business_activity } : {}),
          ...(extracted.city && !prev.city ? { city: extracted.city } : {}),
          ...(extracted.district && !prev.district ? { district: extracted.district } : {}),
          ...(extracted.annual_rent && !prev.annual_rent ? { annual_rent: extracted.annual_rent } : {}),
          ...(extracted.lease_duration && !prev.lease_duration ? { lease_duration: extracted.lease_duration } : {}),
        }));
        if (extracted.cr_number || extracted.entity_name) {
          setCrExtraction(prev => ({
            ...prev,
            ...(extracted.cr_number ? { cr_number: extracted.cr_number } : {}),
            ...(extracted.entity_name ? { entity_name: extracted.entity_name } : {}),
            ...(extracted.business_activity ? { business_activity: extracted.business_activity } : {}),
            ...(extracted.city ? { city: extracted.city } : {}),
          }));
          setCrExtractionDone(true);
        }
      }

      toast.success("تم تحليل الصور والمستندات وتحديد الأصول بدقة");
    } catch (err) {
      clearInterval(progressInterval);
      toast.error(err instanceof Error ? err.message : "حدث خطأ أثناء تحليل الصور");
    } finally {
      setAnalyzing(false);
    }
  };

  const handleNext = async () => {
    if (currentStep === 0) {
      if (!dealStructure.isValid) {
        toast.error("يرجى اختيار هيكل الصفقة أولاً");
        return;
      }
      const id = await ensureListing();
      if (id) {
        await updateListing(id, {
          deal_type: dealStructure.primaryType,
          primary_deal_type: dealStructure.primaryType,
          deal_options: dealStructure.selectedTypes.map((typeId, i) => ({
            type_id: typeId,
            priority: i,
            is_primary: typeId === dealStructure.primaryType,
          })),
        } as never);
      }
    }
    saveDraft();
    setStepDirection("next");
    // For CR-only, skip AI analysis step (step 2) entirely
    if (isCrOnly && currentStep === 1) {
      setCurrentStep(3); // Jump directly to disclosure
    } else {
      setCurrentStep((prev) => Math.min(steps.length - 1, prev + 1));
    }
  };

  const handleBack = () => {
    saveDraft();
    setStepDirection("prev");
    // For CR-only, skip AI analysis step when going back from disclosure
    if (isCrOnly && currentStep === 3) {
      setCurrentStep(1); // Jump back to photos/docs
    } else {
      setCurrentStep((prev) => Math.max(0, prev - 1));
    }
  };

  const [showPublishConfirm, setShowPublishConfirm] = useState(false);
  const [dealCheckLoading, setDealCheckLoading] = useState(false);
  const [dealCheckResult, setDealCheckResult] = useState<any>(null);
  const [dealCheckError, setDealCheckError] = useState("");
  const [dealCheckInputKey, setDealCheckInputKey] = useState<string | null>(null);

  const buildListingPayload = useCallback(() => ({
    ...disclosure,
    description: sellerNote || null,
    price: disclosure.price ? Number(disclosure.price) : null,
    annual_rent: disclosure.annual_rent ? Number(disclosure.annual_rent) : null,
    primary_deal_type: dealStructure.primaryType,
    deal_type: dealStructure.primaryType,
    inventory: inventory.filter((item) => item.included),
    inventory_pricing_mode: inventoryPricingMode,
    bulk_inventory_price: inventoryPricingMode === "bulk" && bulkInventoryPrice ? Number(bulkInventoryPrice) : null,
    photos,
    documents: Object.entries(uploadedDocs).map(([type, files]) => ({ type, files })),
    cr_extraction: crExtraction || undefined,
    deal_options: dealStructure.selectedTypes.map((id, i) => ({
      type_id: id,
      priority: i,
      is_primary: id === dealStructure.primaryType,
    })),
  }), [disclosure, dealStructure, inventory, photos, uploadedDocs, crExtraction, sellerNote, inventoryPricingMode, bulkInventoryPrice]);

  const getCurrentDealCheckInputKey = useCallback(() => JSON.stringify(buildListingPayload()), [buildListingPayload]);

  const handleRunInlineDealCheck = async () => {
    setPublishAttempted(true);
    const imgReq = getImageRequirement(dealStructure.primaryType);
    const hasPhotos = imgReq === "none" || imgReq === "optional" || totalPhotos > 0;
    const errors = validateDisclosure(dealStructure.primaryType || "full_takeover", disclosure);
    if (!hasPhotos || Object.keys(errors).length > 0) {
      toast.error("يرجى إكمال جميع الحقول المطلوبة أولاً");
      return;
    }

    const nextListingPayload = buildListingPayload();
    const nextInputKey = JSON.stringify(nextListingPayload);

    if (dealCheckResult && dealCheckInputKey === nextInputKey) {
      toast.info("التحليل الحالي ما زال مطابقاً لآخر بياناتك");
      return;
    }

    setDealCheckLoading(true);
    setDealCheckError("");

    try {
      const { data, error: fnError } = await supabase.functions.invoke("deal-check", {
        body: {
          listing: nextListingPayload,
          perspective: "seller",
          sellerName,
          mode: dealCheckResult ? "update" : "create",
          previousAnalysis: dealCheckResult || null,
        },
      });
      if (fnError) throw new Error(fnError.message);
      if (!data?.success) throw new Error(data?.error || "فشل التحليل");
      setDealCheckResult(data.analysis);
      setDealCheckInputKey(nextInputKey);
    } catch (e: any) {
      console.error("[DealCheck] Inline check failed:", e);
      setDealCheckError(e.message || "تعذّر إجراء الفحص");
    } finally {
      setDealCheckLoading(false);
    }
  };

  const handlePublishClick = async () => {
    if (!listingId) return;
    setPublishAttempted(true);

    const imgReq = getImageRequirement(dealStructure.primaryType);
    const hasPhotos = imgReq === "none" || imgReq === "optional" || totalPhotos > 0;
    const errors = validateDisclosure(dealStructure.primaryType || "full_takeover", disclosure);

    if (!hasPhotos || Object.keys(errors).length > 0) {
      toast.error("يرجى إكمال جميع الحقول المطلوبة قبل النشر");
      return;
    }

    const nextListingPayload = buildListingPayload();
    const nextInputKey = JSON.stringify(nextListingPayload);

    if (dealCheckResult && dealCheckInputKey === nextInputKey) {
      setShowPublishConfirm(true);
      return;
    }

    setShowPublishConfirm(true);
    setDealCheckLoading(true);
    setDealCheckError("");

    try {
      const { data, error: fnError } = await supabase.functions.invoke("deal-check", {
        body: {
          listing: nextListingPayload,
          perspective: "seller",
          sellerName,
          mode: dealCheckResult ? "update" : "create",
          previousAnalysis: dealCheckResult || null,
        },
      });
      if (fnError) throw new Error(fnError.message);
      if (!data?.success) throw new Error(data?.error || "فشل التحليل");
      setDealCheckResult(data.analysis);
      setDealCheckInputKey(nextInputKey);
    } catch (e: any) {
      console.error("[DealCheck] Pre-publish check failed:", e);
      setDealCheckError(e.message || "تعذّر إجراء الفحص — يمكنك المتابعة بالنشر");
    } finally {
      setDealCheckLoading(false);
    }
  };

  

  const handlePublish = async () => {
    if (!listingId) return;
    setShowPublishConfirm(false);

    setSaving(true);
    try {
      const transparencyForPublish = calculateTransparency({
        ...disclosure,
        price: disclosure.price ? Number(disclosure.price) : null,
        annual_rent: disclosure.annual_rent ? Number(disclosure.annual_rent) : null,
        primary_deal_type: dealStructure.primaryType || "full_takeover",
        inventory: inventory.filter((item) => item.included),
        photos,
      });

      const { error } = await updateListing(listingId, {
        ...disclosure,
        price: disclosure.price ? Number(disclosure.price) : null,
        annual_rent: disclosure.annual_rent ? Number(disclosure.annual_rent) : null,
        disclosure_score: transparencyForPublish.score,
        inventory: inventory.filter((item) => item.included),
        deal_disclosures: dealStructure.requiredDisclosures,
        required_documents: dealStructure.requiredDocuments,
        ai_structure_validation: dealCheckResult || null,
        location_lat: locationLat,
        location_lng: locationLng,
        status: "published",
        published_at: new Date().toISOString(),
        title: isCrOnly
          ? `سجل تجاري — ${crExtraction?.entity_name || disclosure.business_activity || "مشروع"}, ${disclosure.city || ""}`
          : `${disclosure.business_activity || "مشروع"} — ${disclosure.district || ""}, ${disclosure.city || ""}`,
      } as never);

      if (error) {
        console.error("Publish failed:", error);
        toast.error("فشل نشر الإعلان — يرجى المحاولة مرة أخرى");
        setSaving(false);
        return;
      }

      await logAudit("listing_published", "listing", listingId, { title: disclosure.business_activity }).catch(() => {});
      // Stop auto-save timer before navigating away
      if (autoSaveTimerRef.current) {
        clearInterval(autoSaveTimerRef.current);
        autoSaveTimerRef.current = null;
      }
      setSaving(false);
      toast.success("تم نشر الإعلان بنجاح! 🎉");
      navigate(`/listing/${listingId}`);
    } catch (err) {
      console.error("Publish error:", err);
      toast.error("حدث خطأ غير متوقع أثناء النشر — يرجى المحاولة مرة أخرى");
      setSaving(false);
    }
  };

  const getGroupDisplayUrls = useCallback((groupId: string) => {
    const previews = localPreviews[groupId] || [];
    const remoteUrls = photos[groupId] || [];
    return previews.length > 0 ? previews : remoteUrls;
  }, [localPreviews, photos]);

  const bulkPhotoCount = (localPreviews["all"] || photos["all"] || []).length;
  const totalPhotos = photoGroups.reduce((sum, group) => sum + getGroupDisplayUrls(group.id).length, 0) + bulkPhotoCount;
  const allPhotoUrls = Object.values(photos).flat();
  const dealTypeForTransparency = dealStructure.primaryType || "full_takeover";
  const transparencyResult = calculateTransparency({
    ...disclosure,
    price: disclosure.price ? Number(disclosure.price) : null,
    annual_rent: disclosure.annual_rent ? Number(disclosure.annual_rent) : null,
    primary_deal_type: dealTypeForTransparency,
    inventory,
    photos,
  });
  const disclosureScore = transparencyResult.score;

  // ── Completion percentage ──
  const completionPercent = (() => {
    let total = 0;
    let filled = 0;
    // Step 0: Deal structure
    total += 1;
    if (dealStructure.isValid) filled += 1;
    // Step 1: Photos
    total += 1;
    if (totalPhotos > 0) filled += 1;
    // Step 2: Analysis
    total += 1;
    if (analyzed) filled += 1;
    // Step 3: Required fields
    const rules = getRules(dealStructure.primaryType || "full_takeover");
    const reqFields = rules.requiredFields;
    total += reqFields.length;
    for (const f of reqFields) {
      if ((disclosure as Record<string, string>)[f]?.trim()) filled += 1;
    }
    // Price always required
    total += 1;
    if (disclosure.price?.trim()) filled += 1;
    return Math.round((filled / Math.max(total, 1)) * 100);
  })();

  // ── Drag & drop handler ──
  const handleDrop = useCallback(async (e: React.DragEvent<HTMLDivElement>, groupId: string) => {
    e.preventDefault();
    e.stopPropagation();
    setDraggingGroup(null);
    const files = e.dataTransfer?.files;
    if (!files || files.length === 0) return;
    setActivePhotoGroup(groupId);
    // Create a synthetic event-like object to reuse handlePhotoUpload logic
    const dt = new DataTransfer();
    Array.from(files).forEach(f => dt.items.add(f));
    if (fileInputRef.current) {
      fileInputRef.current.files = dt.files;
      fileInputRef.current.dispatchEvent(new Event("change", { bubbles: true }));
    }
  }, []);

  const dynamicDocTypes = dealStructure.requiredDocuments.length > 0
    ? dealStructure.requiredDocuments
    : ["عقد الإيجار", "السجل التجاري", "رخصة البلدية", "رخصة الدفاع المدني", "فواتير شراء المعدات", "مستندات أخرى"];

  const primaryDealLabel = DEAL_TYPE_MAP[dealStructure.primaryType]?.label || dealStructure.primaryType;
  const lowConfidenceItems = inventory.filter((item) => item.confidence === "low" && !item.userConfirmed);
  const medConfidenceItems = inventory.filter((item) => item.confidence === "medium" && !item.userConfirmed);

  // ── Publish validation — driven by deal-type schema ──
  const activeRules = getRules(dealStructure.primaryType || "full_takeover");
  const imageReq = getImageRequirement(dealStructure.primaryType);
  const photosOk = imageReq === "none" || imageReq === "optional" || totalPhotos > 0;
  const disclosureErrors = validateDisclosure(dealStructure.primaryType || "full_takeover", disclosure);
  const locationOk = locationLat != null && locationLng != null;
  const canPublish = photosOk && Object.keys(disclosureErrors).length === 0 && locationOk;
  const [publishAttempted, setPublishAttempted] = useState(false);

  // Debug logging for schema verification
  console.debug("[CreateListing] deal-type schema:", {
    dealType: dealStructure.primaryType,
    requiredFields: activeRules.requiredFields,
    optionalFields: activeRules.optionalFields,
    hiddenFields: activeRules.hiddenFields,
    imageRequired: activeRules.imageRequired,
    validationErrors: disclosureErrors,
    canPublish,
  });

  const getConfidenceBadge = (confidence: string) => {
    switch (confidence) {
      case "high":
        return <span className="text-[10px] px-1.5 py-0.5 rounded bg-success/10 text-success">ثقة عالية</span>;
      case "medium":
        return <span className="text-[10px] px-1.5 py-0.5 rounded bg-warning/10 text-warning">ثقة متوسطة</span>;
      case "low":
        return <span className="text-[10px] px-1.5 py-0.5 rounded bg-destructive/10 text-destructive">يحتاج تأكيد</span>;
      default:
        return null;
    }
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
        <input ref={bulkInputRef} type="file" accept="image/*,.heic,.heif,.raw,.cr2,.nef,.arw,.dng,.pdf,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" multiple className="hidden" onChange={handleBulkUpload} />

        {/* 4-step progress */}
        <div className="flex items-center justify-between mb-8 pb-2 gap-1">
          {steps.map((step, i) => (
            <div key={step.label} className="flex items-center gap-1 flex-1">
              <button
                type="button"
                onClick={() => {
                  if (i < currentStep) setCurrentStep(i);
                }}
                className={cn(
                  "flex items-center gap-1 px-2 py-2 rounded-xl text-[11px] whitespace-nowrap transition-all w-full justify-center",
                  i === currentStep ? "bg-primary/10 text-primary font-medium border border-primary/20" : i < currentStep ? "text-success cursor-pointer hover:bg-success/5" : "text-muted-foreground"
                )}
              >
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
              <div
                className="h-full rounded-full gradient-primary transition-all duration-500"
                style={{ width: `${completionPercent}%` }}
              />
            </div>
          </div>
          <div className="shrink-0">
            {autoSaveStatus === "saving" && (
              <div className="flex items-center gap-1.5 text-[10px] text-primary animate-fade-in">
                <Loader2 size={12} className="animate-spin" />
                جاري الحفظ...
              </div>
            )}
            {autoSaveStatus === "saved" && (
              <div className="flex items-center gap-1.5 text-[10px] text-success animate-fade-in">
                <Check size={12} strokeWidth={2} />
                تم الحفظ تلقائياً
              </div>
            )}
          </div>
        </div>

        <div className="bg-card rounded-2xl shadow-soft p-6 md:p-8 min-h-[400px]">

          {/* ── Step 0: Deal Structure ── */}
          {currentStep === 0 && (
            <div key="step-0" className={`space-y-6 ${stepDirection === "next" ? "animate-step-slide-in-next" : "animate-step-slide-in-prev"}`}>
              <div className="rounded-2xl bg-gradient-to-br from-primary/5 via-primary/10 to-accent/10 p-5 border border-primary/10 text-center">
                <Shield size={28} strokeWidth={1.5} className="text-primary mx-auto mb-3" />
                <h2 className="font-semibold text-sm mb-1">اختر هيكل الصفقة المناسب</h2>
                <p className="text-xs text-muted-foreground max-w-lg mx-auto leading-relaxed mb-2">
                  حدد نوع الصفقة وسيتم تخصيص المتطلبات تلقائياً حسب اختيارك
                </p>
                <p className="text-sm font-bold text-success animate-fade-in [animation-delay:0.4s] [animation-fill-mode:backwards]">
                  ✦ الـAI يحدد كل شيء لك تلقائياً ✦
                </p>
              </div>

              <DealStructureEngine
                value={dealStructure}
                onChange={(value) => setDealStructure(value)}
              />
            </div>
          )}

          {/* ── Step 1: Photos & Documents ── */}
          {currentStep === 1 && (
            <div key="step-1" className={`space-y-6 ${stepDirection === "next" ? "animate-step-slide-in-next" : "animate-step-slide-in-prev"}`}>
              <div className="rounded-2xl bg-gradient-to-br from-primary/5 via-primary/10 to-accent/10 p-5 border border-primary/10 text-center">
                <div className="flex items-center justify-center gap-2 mb-2">
                  <Sparkles size={20} strokeWidth={1.5} className="text-primary" />
                  {isCrOnly ? <FileText size={20} strokeWidth={1.5} className="text-primary" /> : <Camera size={20} strokeWidth={1.5} className="text-primary" />}
                </div>
                <h2 className="font-semibold text-sm mb-1">
                  {isCrOnly ? "ارفع صورة السجل التجاري — الـAI يستخرج البيانات تلقائياً!" : "فقط ارفع الصور والمستندات — الـAI يتولى الباقي!"}
                </h2>
                <p className="text-xs text-muted-foreground max-w-lg mx-auto leading-relaxed mb-1">
                  {isCrOnly ? "الذكاء الاصطناعي يقرأ السجل التجاري ويعبّئ البيانات نيابة عنك" : "الذكاء الاصطناعي يستخرج قائمة الأصول ويحلل حالتها تلقائياً"}
                </p>
                <p className="text-sm font-semibold text-primary animate-fade-in [animation-delay:0.4s] [animation-fill-mode:backwards]">
                  ✦ بدون أي إدخال يدوي منك ✦
                </p>
              </div>

              {/* CR Extraction Status */}
              {isCrOnly && crExtracting && (
                <div className="flex flex-col items-center justify-center py-4 gap-3 animate-fade-in">
                  <Loader2 size={28} className="animate-spin text-primary" />
                  <p className="text-sm font-medium text-primary">جاري استخراج بيانات السجل التجاري...</p>
                  <p className="text-xs text-muted-foreground">لا تحتاج تعمل شيء — الـAI يقرأ المستند</p>
                </div>
              )}

              {isCrOnly && crExtractionDone && crExtraction && (
                <div className={cn(
                  "rounded-xl border p-4 space-y-3 animate-fade-in",
                  crExtraction.extraction_confidence === "high" ? "bg-success/5 border-success/20" :
                  crExtraction.extraction_confidence === "medium" ? "bg-warning/5 border-warning/20" :
                  "bg-destructive/5 border-destructive/20"
                )}>
                  <div className="flex items-center gap-2">
                    {crExtraction.extraction_confidence === "high" ? (
                      <Check size={16} className="text-success" />
                    ) : crExtraction.extraction_confidence === "medium" ? (
                      <AlertTriangle size={14} className="text-warning" />
                    ) : (
                      <AlertTriangle size={14} className="text-destructive" />
                    )}
                    <p className="text-xs font-medium">
                      {crExtraction.extraction_confidence === "high"
                        ? "تم استخراج بيانات السجل التجاري بنجاح — راجع وأكّد"
                        : crExtraction.extraction_confidence === "medium"
                        ? "تم استخراج بعض البيانات — أكمل الحقول الناقصة"
                        : "لم نتمكن من استخراج بيانات كافية — أكمل الحقول يدوياً"}
                    </p>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    {crExtraction.cr_number && (
                      <div className="bg-background/50 rounded-lg p-2">
                        <span className="text-muted-foreground">رقم السجل: </span>
                        <span className="font-medium">{crExtraction.cr_number}</span>
                      </div>
                    )}
                    {crExtraction.entity_name && (
                      <div className="bg-background/50 rounded-lg p-2">
                        <span className="text-muted-foreground">الاسم: </span>
                        <span className="font-medium">{crExtraction.entity_name}</span>
                      </div>
                    )}
                    {crExtraction.business_activity && (
                      <div className="bg-background/50 rounded-lg p-2">
                        <span className="text-muted-foreground">النشاط: </span>
                        <span className="font-medium">{crExtraction.business_activity}</span>
                      </div>
                    )}
                    {crExtraction.city && (
                      <div className="bg-background/50 rounded-lg p-2">
                        <span className="text-muted-foreground">المدينة: </span>
                        <span className="font-medium">{crExtraction.city}</span>
                      </div>
                    )}
                    {crExtraction.status && (
                      <div className="bg-background/50 rounded-lg p-2">
                        <span className="text-muted-foreground">الحالة: </span>
                        <span className="font-medium">{crExtraction.status}</span>
                      </div>
                    )}
                    {crExtraction.expiry_date && (
                      <div className="bg-background/50 rounded-lg p-2">
                        <span className="text-muted-foreground">الانتهاء: </span>
                        <span className="font-medium">{crExtraction.expiry_date}</span>
                      </div>
                    )}
                  </div>
                  {crExtraction.extraction_notes && (
                    <p className="text-[10px] text-muted-foreground italic">{crExtraction.extraction_notes}</p>
                  )}
                </div>
              )}

              {isCrOnly && crExtractionDone && !crExtraction && (
                <div className="rounded-xl bg-destructive/5 border border-destructive/20 p-4 text-center animate-fade-in">
                  <AlertTriangle size={20} className="text-destructive mx-auto mb-2" />
                  <p className="text-xs font-medium text-destructive">تعذّر استخراج البيانات من المستند</p>
                  <p className="text-[10px] text-muted-foreground mt-1">يمكنك إكمال الحقول يدوياً في الخطوة التالية</p>
                </div>
              )}

              {/* ── Bulk Upload Zone ── */}
              <div
                className={cn(
                  "relative rounded-2xl border-2 border-dashed transition-all cursor-pointer p-8 text-center",
                  draggingGroup === "bulk" ? "border-primary bg-primary/5 scale-[1.01]" : "border-border/50 bg-muted/20 hover:border-primary/40 hover:bg-primary/5"
                )}
                onClick={() => bulkInputRef.current?.click()}
                onDragOver={(e) => { e.preventDefault(); setDraggingGroup("bulk"); }}
                onDragLeave={() => setDraggingGroup(null)}
                onDrop={(e) => {
                  e.preventDefault();
                  setDraggingGroup(null);
                  const dt = new DataTransfer();
                  Array.from(e.dataTransfer.files).forEach(f => dt.items.add(f));
                  if (bulkInputRef.current) {
                    bulkInputRef.current.files = dt.files;
                    bulkInputRef.current.dispatchEvent(new Event("change", { bubbles: true }));
                  }
                }}
              >
                {uploadingGroup === "bulk" ? (
                  <div className="space-y-3 animate-fade-in">
                    <Loader2 size={32} className="animate-spin text-primary mx-auto" />
                    <p className="text-sm font-medium text-primary">جاري رفع الملفات... {uploadProgress.current}/{uploadProgress.total}</p>
                    <div className="h-2 rounded-full bg-muted overflow-hidden max-w-xs mx-auto">
                      <div className="h-full rounded-full gradient-primary transition-all duration-500" style={{ width: `${(uploadProgress.current / uploadProgress.total) * 100}%` }} />
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="flex items-center justify-center gap-3 mb-3">
                      <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                        <Upload size={24} strokeWidth={1.5} className="text-primary" />
                      </div>
                    </div>
                    <h3 className="text-sm font-semibold mb-1">ارفع كل الصور والمستندات دفعة واحدة</h3>
                    <p className="text-xs text-muted-foreground mb-2">حتى 50 صورة و 50 مستند — اسحب وأفلت أو اضغط هنا</p>
                    <div className="flex items-center justify-center gap-4 text-[10px] text-muted-foreground">
                      <span className="flex items-center gap-1"><Camera size={11} /> صور المحل والمعدات</span>
                      <span className="flex items-center gap-1"><FileText size={11} /> عقود وسجلات ورخص</span>
                    </div>
                    <p className="text-xs font-medium text-primary mt-3 animate-fade-in">✦ الـAI يحلل كل شيء تلقائياً — بدون إدخال يدوي ✦</p>
                  </>
                )}
              </div>

              {/* Bulk uploaded previews */}
              {(localPreviews["all"] || photos["all"] || []).length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Camera size={14} strokeWidth={1.5} className="text-primary" />
                    <span className="text-xs font-medium">الصور المرفوعة ({(localPreviews["all"] || photos["all"] || []).length})</span>
                  </div>
                  <div className="flex gap-1.5 overflow-x-auto pb-1">
                    {(localPreviews["all"] || photos["all"] || []).map((url, i) => (
                      <div key={`all-${i}`} className="relative shrink-0 w-14 h-14 rounded-lg border border-border/30 overflow-hidden bg-muted/40">
                        <img src={url} alt="" loading="lazy" className="w-full h-full object-cover" />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Bulk uploaded docs */}
              {(uploadedDocs["general"] || []).length > 0 && (
                <div className="flex items-center gap-2">
                  <FileText size={14} strokeWidth={1.5} className="text-primary" />
                  <span className="text-xs font-medium">المستندات المرفوعة ({uploadedDocs["general"].length})</span>
                  <span className="text-[10px] text-success">✓</span>
                </div>
              )}

              {/* Photos by group (optional manual upload) */}
              <details className="group">
                <summary className="flex items-center gap-2 cursor-pointer text-xs text-muted-foreground hover:text-foreground transition-colors">
                  <Camera size={14} strokeWidth={1.5} />
                  <span>رفع يدوي حسب التصنيف (اختياري)</span>
                  <span className="text-[10px]">— إذا تفضل ترتيب الصور بنفسك</span>
                </summary>
                <div className="mt-3 space-y-4">
              <div className="flex items-center gap-2">
                <Camera size={16} strokeWidth={1.5} className="text-primary" />
                <h3 className="font-medium text-sm">الصور</h3>
                  <div className="h-2 flex-1 rounded-full bg-muted overflow-hidden">
                    <div className="h-full rounded-full gradient-primary transition-all duration-500" style={{ width: `${Math.min(100, (totalPhotos / 12) * 100)}%` }} />
                  </div>
                  <span className="text-xs font-medium text-primary">{totalPhotos} صورة</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {photoGroups.map((group) => {
                    const displayUrls = getGroupDisplayUrls(group.id);
                    const count = displayUrls.length;
                    const done = count >= group.min;
                    const iconMap: Record<string, typeof Camera> = { Camera, DoorOpen, Building2, MapPin, Tag, Wrench, FileText };
                    const Icon = iconMap[group.icon] || Camera;

                    return (
                      <div
                        key={group.id}
                        className={cn(
                          "p-3.5 rounded-xl border transition-all",
                          done ? "border-success/30 bg-success/5" : "border-border/50 bg-card hover:border-primary/30",
                          draggingGroup === group.id && "border-primary border-dashed bg-primary/5 scale-[1.01]"
                        )}
                        onDragOver={(e) => { e.preventDefault(); setDraggingGroup(group.id); }}
                        onDragLeave={() => setDraggingGroup(null)}
                        onDrop={(e) => handleDrop(e, group.id)}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2.5">
                            <Icon size={18} strokeWidth={1.5} className="text-primary" />
                            <div>
                              <div className="text-xs font-medium">{group.label}</div>
                              <div className="text-[10px] text-muted-foreground">{group.min} صور على الأقل</div>
                            </div>
                          </div>
                          <button
                            onClick={() => { setActivePhotoGroup(group.id); fileInputRef.current?.click(); }}
                            disabled={uploadingGroup === group.id}
                            className={cn(
                              "flex items-center gap-1 px-3 py-1.5 rounded-lg text-[11px] font-medium transition-all active:scale-[0.97]",
                              uploadingGroup === group.id ? "bg-primary/20 text-primary cursor-wait" : done ? "bg-success/10 text-success" : "bg-primary/10 text-primary hover:bg-primary/20"
                            )}
                          >
                            {uploadingGroup === group.id ? (
                              <><Loader2 size={12} className="animate-spin" />{uploadProgress.current}/{uploadProgress.total}</>
                            ) : (
                              <><Upload size={12} strokeWidth={1.5} />{count > 0 ? `${count} ✓` : "رفع"}</>
                            )}
                          </button>
                        </div>

                        {uploadingGroup === group.id && uploadProgress.total > 0 && (
                          <div className="mt-2.5 space-y-1.5 animate-fade-in">
                            <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                              <div className="h-full rounded-full gradient-primary transition-all duration-500 ease-out" style={{ width: `${(uploadProgress.current / uploadProgress.total) * 100}%` }} />
                            </div>
                            <p className="text-[10px] text-primary text-center">جاري تجهيز ورفع الصور بطريقة ذكية ولطيفة...</p>
                          </div>
                        )}

                        {displayUrls.length > 0 && (
                          <div className="flex gap-1.5 mt-2.5 overflow-x-auto pb-1">
                            {displayUrls.map((url, i) => (
                              <div key={`${group.id}-${i}`} className="relative shrink-0 w-12 h-12 rounded-lg border border-border/30 overflow-hidden bg-muted/40">
                                <img src={url} alt={`معاينة ${group.label}`} loading="lazy" className="w-full h-full object-cover" onError={(e) => { const target = e.currentTarget; target.style.display = "none"; const fallback = target.nextElementSibling as HTMLDivElement | null; if (fallback) fallback.style.display = "flex"; }} />
                                <div className="hidden absolute inset-0 items-center justify-center text-primary bg-primary/5"><ImageIcon size={16} /></div>
                                {uploadingGroup === group.id && i === displayUrls.length - 1 && (
                                  <div className="absolute inset-0 bg-background/55 flex items-center justify-center"><Loader2 size={14} className="animate-spin text-primary" /></div>
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                <div className="text-center pt-2 pb-1 space-y-2">
                  <div className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-primary/5 to-accent/10 border border-primary/10">
                    <Sparkles size={16} strokeWidth={1.5} className="text-primary" />
                    <p className="text-sm font-medium text-foreground">كلما زادت الصور، كان التحليل أدق والإعلان أقوى</p>
                  </div>
                  <p className="text-[10px] text-muted-foreground flex items-center justify-center gap-1">
                    <Upload size={10} strokeWidth={1.5} />
                    يمكنك سحب الصور وإفلاتها مباشرة على أي مجموعة
                  </p>
                </div>
                </div>
              </details>

              {/* Documents */}
              <div className="border-t border-border/50 pt-5 space-y-4">
                <div className="flex items-center gap-2">
                  <FileText size={16} strokeWidth={1.5} className="text-primary" />
                  <h3 className="font-medium text-sm">المستندات</h3>
                  <span className="text-[10px] text-muted-foreground">(اختياري — يعزز ثقة المشتري)</span>
                </div>
                <div className="space-y-2">
                  {dynamicDocTypes.map((doc) => (
                    <div key={doc} className="flex items-center justify-between p-3 rounded-xl border border-border/50 bg-card hover:border-primary/20 transition-all">
                      <div className="flex items-center gap-2.5">
                        <FileText size={14} strokeWidth={1.3} className="text-muted-foreground" />
                        <div>
                          <span className="text-xs">{doc}</span>
                          {uploadedDocs[doc]?.length > 0 && <span className="text-[10px] text-success mr-2">✓ {uploadedDocs[doc].length} ملف</span>}
                        </div>
                      </div>
                      <button onClick={() => { setActiveDocType(doc); docInputRef.current?.click(); }} className="flex items-center gap-1 text-xs text-primary hover:underline active:scale-[0.97]">
                        <Upload size={12} strokeWidth={1.3} /> رفع
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Location Map Picker */}
              <div className="border-t border-border/50 pt-5 space-y-3">
                <div className="flex items-center gap-2">
                  <MapPin size={16} strokeWidth={1.5} className="text-primary" />
                  <h3 className="font-medium text-sm">موقع المشروع على الخريطة</h3>
                  <span className="text-[10px] text-destructive font-medium">(مطلوب)</span>
                </div>
                <GoogleMapPicker
                  lat={locationLat}
                  lng={locationLng}
                  onLocationChange={(lat, lng, _address, placeDetails) => {
                    if (lat === 0 && lng === 0) {
                      setLocationLat(null);
                      setLocationLng(null);
                    } else {
                      setLocationLat(lat);
                      setLocationLng(lng);
                    }
                    if (placeDetails) {
                      setDisclosure((prev) => ({
                        ...prev,
                        ...(placeDetails.city ? { city: placeDetails.city } : {}),
                        ...(placeDetails.district ? { district: placeDetails.district } : {}),
                      }));
                    }
                  }}
                />
                {isFieldVisible(dealTypeForTransparency, "district") && (
                  <div className="mt-3">
                    <FormField
                      label="اسم الحي"
                      placeholder="مثال: حي النسيم"
                      value={disclosure.district}
                      onChange={(v) => setDisclosure((prev) => ({ ...prev, district: v }))}
                    />
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ── Step 2: AI Analysis ── */}
          {currentStep === 2 && (
            <div key="step-2" className={`space-y-6 ${stepDirection === "next" ? "animate-step-slide-in-next" : "animate-step-slide-in-prev"}`}>
              {!analyzed ? (
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  {analyzing ? (
                    <>
                      <AiStar size={56} className="mb-6" />
                      <h2 className="font-medium mb-2">الذكاء الاصطناعي يحلّل الصور...</h2>
                      <p className="text-sm text-muted-foreground max-w-sm">جاري اكتشاف الأصول وتمييز زوايا التصوير</p>
                      <p className="text-xs text-success mt-2 animate-fade-in">لا تحتاج تعمل شيء — الـAI يتكفّل</p>
                      <div className="mt-6 w-56">
                        <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                          <div className="h-full rounded-full gradient-primary transition-all duration-700" style={{ width: `${analyzeProgress}%` }} />
                        </div>
                        <p className="text-[10px] text-muted-foreground mt-2">{analyzeProgress}%</p>
                      </div>
                    </>
                  ) : (
                    <>
                      <AiStar size={48} className="mb-6" />
                      <h2 className="font-medium mb-2">تحليل الصور بالذكاء الاصطناعي</h2>
                      <p className="text-sm text-muted-foreground max-w-sm mb-1">سيقوم الـAI بتحليل صورك واكتشاف الأصول تلقائياً</p>
                      <p className="text-xs text-success mb-4 animate-fade-in">فقط اضغط الزر — والباقي علينا</p>
                      {allPhotoUrls.length === 0 && imageReq === "none" ? (
                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                          <Check size={14} className="text-success" />
                          هذا النوع من الصفقات لا يتطلب صوراً — يمكنك المتابعة للخطوة التالية
                        </div>
                      ) : allPhotoUrls.length === 0 ? (
                        <div className="flex items-center gap-1.5 text-xs text-warning">
                          <AlertTriangle size={14} />
                          {imageReq === "required" ? "يرجى رفع صور في الخطوة السابقة أولاً" : "لم يتم رفع صور — يمكنك المتابعة أو العودة لرفع صور"}
                        </div>
                      ) : (
                        <>
                          {allPhotoUrls.length > 50 && (
                            <div className="bg-warning/10 border border-warning/30 rounded-xl px-4 py-2.5 flex items-start gap-2 mb-4 max-w-sm text-right">
                              <AlertTriangle size={14} className="text-warning shrink-0 mt-0.5" />
                              <p className="text-xs text-warning">لديك {allPhotoUrls.length} صورة — سيتم تحليل أول 50 صورة فقط. الصور المتبقية ستُحفظ لكن لن تُحلل.</p>
                            </div>
                          )}
                          <Button onClick={handleAnalyze} className="gradient-primary text-primary-foreground rounded-xl">
                            <Eye size={16} strokeWidth={1.5} />
                            ابدأ التحليل الذكي ({Math.min(allPhotoUrls.length, 50)} من {allPhotoUrls.length} صورة)
                          </Button>
                        </>
                      )}
                    </>
                  )}
                </div>
              ) : (
                <>
                  <div className="rounded-xl bg-primary/5 border border-primary/20 p-4 text-center">
                    <div className="flex items-center justify-center gap-2 mb-2">
                      <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                        <Check size={18} strokeWidth={1.5} className="text-primary" />
                      </div>
                      <h2 className="font-medium text-sm">اكتمل التحليل — تم اكتشاف {inventory.length} أصل</h2>
                    </div>
                    {(() => {
                      const included = inventory.filter(i => i.included);
                      const excluded = inventory.filter(i => !i.included);
                      const totalQty = included.reduce((sum, i) => sum + (i.qty || 1), 0);
                      const categories = [...new Set(included.map(i => i.category).filter(Boolean))];
                      const parts: string[] = [];
                      if (included.length > 0) {
                        parts.push(`${included.length} أصل مشمول (إجمالي ${totalQty} قطعة)`);
                      }
                      if (excluded.length > 0) {
                        parts.push(`${excluded.length} مستثنى`);
                      }
                      if (categories.length > 0) {
                        parts.push(`الفئات: ${categories.join("، ")}`);
                      }
                      return parts.length > 0 ? (
                        <p className="text-xs text-muted-foreground">{parts.join(" · ")}</p>
                      ) : null;
                    })()}
                    <div className="grid grid-cols-3 gap-2 mt-3">
                      <div className="text-center px-2 py-2 rounded-lg bg-success/5 border border-success/20">
                        <div className="text-sm font-medium text-success">{inventory.filter((i) => i.confidence === "high").length}</div>
                        <div className="text-[10px] font-medium text-success">ثقة عالية</div>
                        <div className="text-[9px] text-muted-foreground mt-1 leading-tight">الـ AI تعرّف عليها بوضوح</div>
                      </div>
                      <div className="text-center px-2 py-2 rounded-lg bg-warning/5 border border-warning/20">
                        <div className="text-sm font-medium text-warning">{inventory.filter((i) => i.confidence === "medium").length}</div>
                        <div className="text-[10px] font-medium text-warning">ثقة متوسطة</div>
                        <div className="text-[9px] text-muted-foreground mt-1 leading-tight">الـ AI يقينه أقل، مغطاة جزئياً</div>
                      </div>
                      <div className="text-center px-2 py-2 rounded-lg bg-muted/30 border border-border">
                        <div className="text-sm font-medium text-muted-foreground">{inventory.filter((i) => i.confidence === "low").length}</div>
                        <div className="text-[10px] font-medium text-muted-foreground">يحتاج تأكيد</div>
                        <div className="text-[9px] text-muted-foreground/70 mt-1 leading-tight">الـ AI يحتاج تأكيدك اليدوي</div>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <ClipboardList size={16} strokeWidth={1.5} className="text-primary" />
                        <h3 className="font-medium text-sm">مراجعة الجرد</h3>
                        <span className="text-[10px] text-muted-foreground">{inventory.filter((i) => i.included).length} مشمول — {inventory.filter((i) => !i.included).length} مستثنى</span>
                      </div>
                      <button
                        onClick={() => setInventory((prev) => [...prev, {
                          id: String(Date.now()),
                          name: "عنصر جديد",
                          qty: 1,
                          condition: "جديد",
                          category: "أخرى",
                          included: true,
                          confidence: "high",
                          detectionNote: "مضاف يدوياً",
                          photoIndices: [],
                          isSameAssetMultipleAngles: false,
                          userConfirmed: true,
                          unitPrice: null,
                        }])}
                        className="flex items-center gap-1 text-xs text-primary hover:underline"
                      >
                        <Plus size={14} strokeWidth={1.3} /> أضف عنصراً
                      </button>
                    </div>

                    {/* ── Pricing Mode Toggle ── */}
                    <div className="bg-muted/30 border border-border/40 rounded-xl p-3">
                      <div className="mb-2">
                        <span className="text-xs font-medium text-foreground">تسعير الأصول</span>
                        <span className="text-[10px] text-muted-foreground mr-1">— اختياري، يمكنك تركه وسيقوم الذكاء الاصطناعي بتقديره في خطوة التحليل</span>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => setInventoryPricingMode("per_item")}
                          className={cn("flex-1 text-xs py-2 px-3 rounded-lg transition-all", inventoryPricingMode === "per_item" ? "bg-primary/15 text-primary border border-primary/40 font-medium shadow-sm" : "bg-destructive/10 text-destructive border border-destructive/30 hover:bg-destructive/15")}
                        >
                          تسعير لكل قطعة
                        </button>
                        <button
                          onClick={() => setInventoryPricingMode("bulk")}
                          className={cn("flex-1 text-xs py-2 px-3 rounded-lg transition-all", inventoryPricingMode === "bulk" ? "bg-primary/15 text-primary border border-primary/40 font-medium shadow-sm" : "bg-destructive/10 text-destructive border border-destructive/30 hover:bg-destructive/15")}
                        >
                          سعر إجمالي للأصول
                        </button>
                      </div>
                      {inventoryPricingMode === "bulk" && (
                        <div className="mt-3">
                          <label className="text-[11px] text-muted-foreground mb-1 block">السعر الإجمالي لجميع الأصول (<SarSymbol size={9} />)</label>
                          <input
                            type="text"
                            inputMode="numeric"
                            lang="en"
                            dir="ltr"
                            placeholder="ضع القيمة التقديرية لجميع الأصول مجتمعة — إذا ما ودك تسعّر كل قطعة"
                            value={bulkInventoryPrice}
                            onChange={(e) => setBulkInventoryPrice(toEnglishNumerals(e.target.value).replace(/[^\d]/g, ""))}
                            className="w-full text-sm bg-background border border-border/50 rounded-lg px-3 py-2 outline-none focus:border-primary/50 transition-colors [direction:ltr] text-left"
                          />
                          {bulkInventoryPrice && (
                            <div className="text-[11px] text-primary mt-1 font-medium">
                              {Number(bulkInventoryPrice).toLocaleString("en-US")} <SarSymbol size={9} />
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    {lowConfidenceItems.length > 0 && (
                      <div className="bg-destructive/5 border border-destructive/20 rounded-xl p-4 space-y-3">
                        <div className="flex items-center gap-1.5 text-xs font-medium text-destructive">
                          <AlertTriangle size={14} />
                          عناصر تحتاج تأكيدك ({lowConfidenceItems.length})
                        </div>
                        {lowConfidenceItems.map((item) => (
                          <ConfirmationCard
                            key={item.id}
                            item={item}
                            allPhotoUrls={allPhotoUrls}
                            onConfirmSame={() => setInventory((prev) => prev.map((entry) => entry.id === item.id ? { ...entry, qty: 1, userConfirmed: true } : entry))}
                            onConfirmMultiple={(qty) => setInventory((prev) => prev.map((entry) => entry.id === item.id ? { ...entry, qty, userConfirmed: true } : entry))}
                          />
                        ))}
                      </div>
                    )}

                    {medConfidenceItems.length > 0 && (
                      <div className="bg-warning/5 border border-warning/20 rounded-xl p-4 space-y-3">
                        <div className="flex items-center gap-1.5 text-xs font-medium text-warning">
                          <AlertTriangle size={14} />
                          عناصر يُنصح بتأكيدها ({medConfidenceItems.length})
                        </div>
                        {medConfidenceItems.map((item) => (
                          <ConfirmationCard
                            key={item.id}
                            item={item}
                            allPhotoUrls={allPhotoUrls}
                            onConfirmSame={() => setInventory((prev) => prev.map((entry) => entry.id === item.id ? { ...entry, qty: 1, userConfirmed: true } : entry))}
                            onConfirmMultiple={(qty) => setInventory((prev) => prev.map((entry) => entry.id === item.id ? { ...entry, qty, userConfirmed: true } : entry))}
                          />
                        ))}
                      </div>
                    )}

                    <div className="space-y-2">
                      {inventory.map((item) => {
                        const itemTotal = (item.unitPrice || 0) * item.qty;
                        return (
                        <div key={item.id} className={cn("p-2.5 rounded-xl border transition-all", item.included ? "border-border/50 bg-card" : "border-border/30 bg-muted/30 opacity-60")}>
                          <div className="flex items-start gap-2">
                            {/* Right side: info */}
                            <div className="flex-1 min-w-0">
                              {editingItemId === item.id ? (
                                <input
                                  type="text"
                                  value={item.name}
                                  onChange={(e) => setInventory((prev) => prev.map((entry) => entry.id === item.id ? { ...entry, name: e.target.value } : entry))}
                                  onBlur={() => setEditingItemId(null)}
                                  onKeyDown={(e) => e.key === "Enter" && setEditingItemId(null)}
                                  autoFocus
                                  className="text-xs bg-transparent border-b border-primary/30 outline-none w-full"
                                />
                              ) : (
                                <div className="text-xs font-medium cursor-pointer hover:text-primary transition-colors truncate" onClick={() => setEditingItemId(item.id)}>{item.name}</div>
                              )}
                              <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                                <span className="text-[10px] text-muted-foreground">{item.category}</span>
                                <select
                                  value={item.condition}
                                  onChange={(e) => setInventory((prev) => prev.map((entry) => entry.id === item.id ? { ...entry, condition: e.target.value } : entry))}
                                  className={cn(
                                    "text-[10px] px-1.5 py-0.5 rounded border outline-none cursor-pointer transition-colors",
                                    item.condition === "جديد" && "bg-success/10 border-success/30 text-success",
                                    item.condition === "شبه جديد" && "bg-primary/10 border-primary/30 text-primary",
                                    item.condition === "جيد" && "bg-accent border-accent-foreground/20 text-accent-foreground",
                                    item.condition === "تالف" && "bg-destructive/10 border-destructive/30 text-destructive",
                                    !["جديد", "شبه جديد", "جيد", "تالف"].includes(item.condition) && "bg-muted/50 border-border/30 text-muted-foreground"
                                  )}
                                >
                                  <option value="جديد">جديد</option>
                                  <option value="شبه جديد">شبه جديد</option>
                                  <option value="جيد">جيد</option>
                                  <option value="تالف">تالف</option>
                                  {!["جديد", "شبه جديد", "جيد", "تالف"].includes(item.condition) && (
                                    <option value={item.condition}>{item.condition}</option>
                                  )}
                                </select>
                                {getConfidenceBadge(item.confidence)}
                                {item.isSameAssetMultipleAngles && <span className="text-[10px] px-1 py-0.5 rounded bg-primary/10 text-primary">زوايا متعددة</span>}
                              </div>
                              {item.detectionNote && <div className="text-[10px] text-muted-foreground mt-0.5 italic leading-tight">{item.detectionNote}</div>}
                            </div>
                            {/* Left side: controls — compact aligned */}
                            <div className="flex items-center gap-1.5 shrink-0">
                              {/* Qty control */}
                              <div className="flex items-center bg-muted/50 rounded-md h-7">
                                <button onClick={() => setInventory((prev) => prev.map((entry) => entry.id === item.id ? { ...entry, qty: Math.max(1, entry.qty - 1) } : entry))} className="px-1 h-full text-muted-foreground hover:text-foreground transition-colors"><Minus size={10} /></button>
                                <input type="text" inputMode="numeric" lang="en" dir="ltr" value={item.qty} onChange={(e) => { const val = toEnglishNumerals(e.target.value); const num = parseInt(val.replace(/[^\d]/g, "")) || 1; setInventory((prev) => prev.map((entry) => entry.id === item.id ? { ...entry, qty: Math.max(1, num) } : entry)); }} className="w-6 text-center text-[11px] bg-transparent border-none outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none" />
                                <button onClick={() => setInventory((prev) => prev.map((entry) => entry.id === item.id ? { ...entry, qty: entry.qty + 1 } : entry))} className="px-1 h-full text-muted-foreground hover:text-foreground transition-colors"><Plus size={10} /></button>
                              </div>
                              {/* Price input — fixed width to keep alignment */}
                              {inventoryPricingMode === "per_item" && (
                                <div className="flex items-center gap-1 w-32">
                                  {item.included ? (
                                    <>
                                      <input
                                        type="text"
                                        inputMode="numeric"
                                        lang="en"
                                        dir="ltr"
                                        placeholder="السعر"
                                        value={item.unitPrice ? String(item.unitPrice) : ""}
                                        onChange={(e) => {
                                          const val = toEnglishNumerals(e.target.value).replace(/[^\d]/g, "");
                                          setInventory((prev) => prev.map((entry) => entry.id === item.id ? { ...entry, unitPrice: val ? Number(val) : null } : entry));
                                        }}
                                        className="w-16 h-7 text-[11px] bg-muted/50 border border-border/30 rounded-md px-1.5 outline-none focus:border-primary/50 transition-colors text-center [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                      />
                                      <span className="text-[10px] text-primary font-medium whitespace-nowrap w-14 text-start">
                                        {item.unitPrice && item.unitPrice > 0 ? `= ${itemTotal.toLocaleString("en-US")}` : ""}
                                      </span>
                                    </>
                                  ) : <div className="w-full" />}
                                </div>
                              )}
                              {/* Delete */}
                              <button onClick={() => setInventory((prev) => prev.filter((entry) => entry.id !== item.id))} className="text-muted-foreground hover:text-destructive transition-colors p-0.5"><Trash2 size={12} /></button>
                            </div>
                          </div>
                        </div>
                        );
                      })}
                    </div>

                    {/* ── Inventory Total ── */}
                    {inventory.filter(i => i.included).length > 0 && (
                      <div className="bg-primary/5 border border-primary/15 rounded-xl p-3">
                        {inventoryPricingMode === "per_item" ? (() => {
                          const includedItems = inventory.filter(i => i.included);
                          const totalQty = includedItems.reduce((sum, i) => sum + i.qty, 0);
                          const pricedItems = includedItems.filter(i => i.unitPrice && i.unitPrice > 0);
                          const totalPrice = pricedItems.reduce((sum, i) => sum + (i.unitPrice || 0) * i.qty, 0);
                          const categories = [...new Set(pricedItems.map(i => i.category))];
                          return (
                            <div className="space-y-2">
                              {categories.length > 1 && categories.map(cat => {
                                const catTotal = pricedItems.filter(i => i.category === cat).reduce((s, i) => s + (i.unitPrice || 0) * i.qty, 0);
                                return catTotal > 0 ? (
                                  <div key={cat} className="flex items-center justify-between text-[11px]">
                                    <span className="text-muted-foreground">{cat}</span>
                                    <span className="text-foreground">{catTotal.toLocaleString("en-US")} <SarSymbol size={9} /></span>
                                  </div>
                                ) : null;
                              })}
                              <div className="flex items-center justify-between text-sm font-medium border-t border-primary/10 pt-2">
                                <span className="text-foreground">إجمالي الأصول المسعّرة ({pricedItems.length} من {includedItems.length}) — {totalQty} قطعة</span>
                                <span className="text-primary">{totalPrice > 0 ? <>{totalPrice.toLocaleString("en-US")} <SarSymbol size={10} /></> : "لم يتم تحديد أسعار"}</span>
                              </div>
                              {pricedItems.length < includedItems.length && pricedItems.length > 0 && (
                                <p className="text-[10px] text-muted-foreground">{includedItems.length - pricedItems.length} عنصر بدون سعر — يمكنك إضافته لاحقاً</p>
                              )}
                            </div>
                          );
                        })() : (
                          <div className="flex items-center justify-between text-sm font-medium">
                            <span className="text-foreground">السعر الإجمالي للأصول</span>
                            <span className="text-primary">{bulkInventoryPrice ? <>{Number(bulkInventoryPrice).toLocaleString("en-US")} <SarSymbol size={10} /></> : "لم يتم التحديد"}</span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
          )}

          {/* ── Step 3: Disclosure & Publish ── */}
          {currentStep === 3 && (
            <div key="step-3" className={`space-y-6 ${stepDirection === "next" ? "animate-step-slide-in-next" : "animate-step-slide-in-prev"}`}>
              <div className="space-y-4">
                <div className="flex items-center gap-2 mb-1">
                  <ClipboardList size={16} strokeWidth={1.5} className="text-primary" />
                  <h2 className="font-medium text-sm">بيانات الإفصاح</h2>
                </div>

                {/* CR extraction auto-fill notice */}
                {isCrOnly && crExtractionDone && crExtraction && (
                  <div className="bg-success/5 border border-success/20 rounded-xl p-3 flex items-start gap-2 animate-fade-in">
                    <Check size={14} className="text-success shrink-0 mt-0.5" />
                    <div>
                      <p className="text-xs font-medium text-success">تم تعبئة الحقول تلقائياً من السجل التجاري</p>
                      <p className="text-[10px] text-muted-foreground mt-0.5">راجع البيانات وعدّلها إن لزم الأمر — ثم حدد السعر المطلوب</p>
                    </div>
                  </div>
                )}

                {dealStructure.requiredDisclosures.length > 0 && (
                  <div className="bg-warning/5 border border-warning/20 rounded-xl p-3">
                    <div className="text-xs font-medium text-warning mb-1.5 flex items-center gap-1">
                      <Shield size={12} /> الإفصاحات المطلوبة
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {dealStructure.requiredDisclosures.map((item) => (
                        <span key={item} className="text-[10px] px-2 py-0.5 rounded-md bg-warning/10 text-warning">{item}</span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Validation error banner */}
                {publishAttempted && !canPublish && (
                  <div className="bg-destructive/10 border border-destructive/30 rounded-xl p-3 flex items-start gap-2">
                    <AlertTriangle size={16} className="text-destructive shrink-0 mt-0.5" />
                    <div>
                      <p className="text-xs font-medium text-destructive">يرجى إكمال الحقول المطلوبة قبل النشر</p>
                      <ul className="text-[11px] text-destructive/80 mt-1 space-y-0.5 list-disc list-inside">
                        {!photosOk && imageReq === "required" && <li>يجب رفع صورة واحدة على الأقل</li>}
                        {Object.entries(disclosureErrors).map(([field, msg]) => (
                          <li key={field}>{msg}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                )}

                <div className="space-y-3">
                  {/* Editable fields — always visible */}
                  {isFieldVisible(dealTypeForTransparency, "business_activity") && (
                    <FormField
                      label={`نوع النشاط${activeRules.requiredFields.includes("business_activity") ? " *" : ""}`}
                      placeholder="مثال: مطعم وجبات سريعة"
                      value={disclosure.business_activity}
                      onChange={(v) => setDisclosure((prev) => ({ ...prev, business_activity: v }))}
                      error={publishAttempted && disclosureErrors["business_activity"]}
                    />
                  )}
                  {isFieldVisible(dealTypeForTransparency, "city") && (
                    <FormField
                      label={`المدينة${activeRules.requiredFields.includes("city") ? " *" : ""}`}
                      placeholder="الرياض"
                      value={disclosure.city}
                      onChange={(v) => setDisclosure((prev) => ({ ...prev, city: v }))}
                      error={publishAttempted && disclosureErrors["city"]}
                    />
                  )}
                  <FormField
                    label="الحي"
                    placeholder="حي النسيم"
                    value={disclosure.district}
                    onChange={(v) => setDisclosure((prev) => ({ ...prev, district: v }))}
                  />
                  <FormField
                    label="السعر المطلوب *"
                    placeholder="180000"
                    suffix={<SarSymbol size={11} />}
                    value={disclosure.price}
                    onChange={(v) => setDisclosure((prev) => ({ ...prev, price: v }))}
                    error={publishAttempted && disclosureErrors["price"]}
                  />
                  {isFieldVisible(dealTypeForTransparency, "annual_rent") && (
                    <div className="grid grid-cols-2 gap-3">
                      <FormField label="الإيجار السنوي" placeholder="45000" suffix={<SarSymbol size={11} />} value={disclosure.annual_rent} onChange={(v) => setDisclosure((prev) => ({ ...prev, annual_rent: v }))} />
                      {isFieldVisible(dealTypeForTransparency, "lease_duration") && (
                        <FormField label="مدة العقد" placeholder="3 سنوات" value={disclosure.lease_duration} onChange={(v) => setDisclosure((prev) => ({ ...prev, lease_duration: v }))} />
                      )}
                    </div>
                  )}
                  {isFieldVisible(dealTypeForTransparency, "lease_remaining") && (
                    <div className="grid grid-cols-2 gap-3">
                      <FormField label="الفترة المدفوعة" placeholder="1.5 سنة" value={disclosure.lease_paid_period} onChange={(v) => setDisclosure((prev) => ({ ...prev, lease_paid_period: v }))} />
                      <FormField label="المتبقي من العقد" placeholder="1.5 سنة" value={disclosure.lease_remaining} onChange={(v) => setDisclosure((prev) => ({ ...prev, lease_remaining: v }))} />
                    </div>
                  )}
                  {isFieldVisible(dealTypeForTransparency, "liabilities") && (
                    <>
                      <FormField label="الالتزامات المالية" placeholder="لا توجد" value={disclosure.liabilities} onChange={(v) => setDisclosure((prev) => ({ ...prev, liabilities: v }))} />
                      <FormField label="رواتب متأخرة" placeholder="لا يوجد" value={disclosure.overdue_salaries} onChange={(v) => setDisclosure((prev) => ({ ...prev, overdue_salaries: v }))} />
                      <FormField label="إيجار متأخر" placeholder="لا يوجد" value={disclosure.overdue_rent} onChange={(v) => setDisclosure((prev) => ({ ...prev, overdue_rent: v }))} />
                    </>
                  )}
                  {isFieldVisible(dealTypeForTransparency, "municipality_license") && (
                    <div className="grid grid-cols-2 gap-3">
                      <SelectField label="رخصة البلدية" options={["سارية", "منتهية", "غير متوفرة"]} value={disclosure.municipality_license} onChange={(v) => setDisclosure((prev) => ({ ...prev, municipality_license: v }))} />
                      <SelectField label="الدفاع المدني" options={["سارية", "منتهية", "غير متوفرة"]} value={disclosure.civil_defense_license} onChange={(v) => setDisclosure((prev) => ({ ...prev, civil_defense_license: v }))} />
                    </div>
                  )}
                  {isFieldVisible(dealTypeForTransparency, "surveillance_cameras") && (
                    <SelectField label="كاميرات مراقبة" options={["متوفرة ومطابقة", "متوفرة غير مطابقة", "غير متوفرة"]} value={disclosure.surveillance_cameras} onChange={(v) => setDisclosure((prev) => ({ ...prev, surveillance_cameras: v }))} />
                  )}
                </div>
              </div>


              {/* ── Inline Deal Check / Market Analysis ── */}
              <div className="border-t border-border/50 pt-6 space-y-5">
                <div className="flex items-center gap-3">
                  <AiStar size={24} />
                  <div>
                    <h2 className="font-medium text-sm">تحليل السوق وفحص الصفقة</h2>
                    <p className="text-[10px] text-muted-foreground">الـAI يحلل صفقتك ويعطيك توصية — راجع النتائج وعدّل قبل النشر</p>
                  </div>
                </div>

                {!dealCheckResult && !dealCheckLoading && !dealCheckError && (
                  <div className="bg-primary/5 border border-primary/15 rounded-xl p-5 text-center space-y-3">
                    <AiStar size={32} className="mx-auto" />
                    <p className="text-sm font-medium">ابدأ فحص الصفقة لمعرفة تقييم السوق والتوصيات</p>
                    <p className="text-xs text-muted-foreground max-w-sm mx-auto">سيتم تحليل بياناتك ومقارنتها بالسوق — يمكنك تعديل البيانات بناءً على النتائج قبل النشر</p>
                    <Button
                      onClick={handleRunInlineDealCheck}
                      disabled={!canPublish}
                      className="gradient-primary text-primary-foreground rounded-xl"
                    >
                      <Eye size={16} strokeWidth={1.5} />
                      ابدأ فحص الصفقة
                    </Button>
                    {!canPublish && publishAttempted && (
                      <p className="text-[11px] text-destructive">أكمل الحقول المطلوبة أعلاه أولاً</p>
                    )}
                  </div>
                )}

                {dealCheckLoading && (
                  <div className="py-10 flex flex-col items-center gap-3 animate-fade-in">
                    <div className="relative">
                      <AiStar size={32} />
                      <Loader2 size={48} strokeWidth={1} className="absolute -top-2 -left-2 text-primary/30 animate-spin" />
                    </div>
                    <p className="text-sm font-medium">جاري تحليل الصفقة ومقارنتها بالسوق...</p>
                    <p className="text-xs text-muted-foreground">يتم فحص البيانات والأصول والموقع والسوق</p>
                  </div>
                )}

                {dealCheckError && !dealCheckLoading && (
                  <div className="bg-warning/10 border border-warning/30 rounded-xl p-4 space-y-3">
                    <div className="flex items-start gap-2">
                      <AlertTriangle size={16} className="text-warning shrink-0 mt-0.5" />
                      <div>
                        <p className="text-xs font-medium text-warning">تعذّر إجراء الفحص التلقائي</p>
                        <p className="text-[10px] text-muted-foreground mt-0.5">{dealCheckError}</p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" onClick={handleRunInlineDealCheck} className="rounded-xl text-xs">
                        <Loader2 size={12} strokeWidth={1.5} className="ml-1" />
                        إعادة المحاولة
                      </Button>
                      <p className="text-[10px] text-muted-foreground self-center">يمكنك المتابعة بالنشر بدون الفحص</p>
                    </div>
                  </div>
                )}

                {dealCheckResult && !dealCheckLoading && (
                  <div className="space-y-4 animate-fade-in">
                    {/* Rating Banner */}
                    <div className={cn("rounded-xl p-4 border",
                      dealCheckResult.ratingColor === "green" ? "bg-emerald-50 border-emerald-200" :
                      dealCheckResult.ratingColor === "yellow" ? "bg-amber-50 border-amber-200" :
                      dealCheckResult.ratingColor === "red" ? "bg-red-50 border-red-200" :
                      dealCheckResult.ratingColor === "blue" ? "bg-blue-50 border-blue-200" :
                      "bg-muted border-border"
                    )}>
                      <div className="flex items-center justify-between mb-1">
                        <span className={cn("text-sm font-medium",
                          dealCheckResult.ratingColor === "green" ? "text-emerald-700" :
                          dealCheckResult.ratingColor === "yellow" ? "text-amber-700" :
                          dealCheckResult.ratingColor === "red" ? "text-red-700" :
                          dealCheckResult.ratingColor === "blue" ? "text-blue-700" :
                          "text-foreground"
                        )}>{dealCheckResult.rating}</span>
                        <span className="text-[11px] font-semibold text-muted-foreground">عدالة السعر: {dealCheckResult.fairnessVerdict}</span>
                      </div>
                    </div>

                    {/* Recommendation */}
                    <div className="bg-primary/5 rounded-xl p-3 border border-primary/10">
                      <div className="flex items-center gap-1.5 mb-1">
                        <AiStar size={12} animate={false} />
                        <span className="text-[11px] font-medium text-primary">التوصية</span>
                      </div>
                      <p className="text-xs leading-relaxed">{dealCheckResult.recommendation}</p>
                    </div>

                    {/* Risks */}
                    {dealCheckResult.risks?.length > 0 && (
                      <div>
                        <h4 className="text-xs font-medium flex items-center gap-1.5 mb-2">
                          <AlertTriangle size={12} strokeWidth={1.3} className="text-red-500/70" />
                          المخاطر الرئيسية
                        </h4>
                        <ul className="space-y-1">
                          {dealCheckResult.risks.slice(0, 4).map((risk: string, i: number) => (
                            <li key={i} className="text-xs text-muted-foreground flex items-start gap-1.5">
                              <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-red-500/50 shrink-0" />
                              {risk}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* Strengths */}
                    {dealCheckResult.strengths?.length > 0 && (
                      <div>
                        <h4 className="text-xs font-medium flex items-center gap-1.5 mb-2">
                          <Check size={12} strokeWidth={1.3} className="text-emerald-600" />
                          نقاط القوة
                        </h4>
                        <ul className="space-y-1">
                          {dealCheckResult.strengths.slice(0, 4).map((s: string, i: number) => (
                            <li key={i} className="text-xs text-muted-foreground flex items-start gap-1.5">
                              <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-emerald-500/60 shrink-0" />
                              {s}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* Missing Info */}
                    {dealCheckResult.missingInfo?.length > 0 && (
                      <div>
                        <h4 className="text-xs font-medium flex items-center gap-1.5 mb-2">
                          <AlertTriangle size={12} strokeWidth={1.3} className="text-amber-500" />
                          معلومات ناقصة
                        </h4>
                        <ul className="space-y-1">
                          {dealCheckResult.missingInfo.map((info: string, i: number) => (
                            <li key={i} className="text-xs text-muted-foreground flex items-start gap-1.5">
                              <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-amber-500/50 shrink-0" />
                              {info}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* Action hint */}
                    <div className="bg-accent/30 rounded-xl p-3 flex items-start gap-2">
                      <AiStar size={16} animate className="shrink-0 mt-0.5" />
                      <p className="text-xs text-muted-foreground leading-relaxed">
                        يمكنك تعديل البيانات أعلاه بناءً على هذا التحليل (مثل السعر أو بيانات الإفصاح) ثم إعادة الفحص — أو المتابعة للنشر مباشرة.
                      </p>
                    </div>

                    {/* Re-run button */}
                    <div className="flex justify-center">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={handleRunInlineDealCheck}
                        className="text-xs text-muted-foreground hover:text-foreground rounded-xl"
                      >
                        <Loader2 size={12} strokeWidth={1.5} className="ml-1" />
                        إعادة التحليل بعد التعديل
                      </Button>
                    </div>
                  </div>
                )}
              </div>

              {/* ── Listing Summary & Publish ── */}
              <div className="border-t border-border/50 pt-6 space-y-5">
                <div className="flex items-center gap-3">
                  <Eye size={20} strokeWidth={1.5} className="text-primary" />
                  <div>
                    <h2 className="font-medium text-sm">ملخص الإعلان</h2>
                    <p className="text-[10px] text-muted-foreground">راجع البيانات قبل النشر</p>
                  </div>
                </div>

                <div className="bg-primary/5 border border-primary/20 rounded-xl p-4 space-y-2">
                  <div className="text-xs font-medium text-primary mb-1">هيكل الصفقة</div>
                  {dealStructure.selectedTypes.map((typeId, idx) => {
                    const type = DEAL_TYPE_MAP[typeId];
                    if (!type) return null;
                    return (
                      <div key={typeId} className="flex items-center gap-2 text-xs">
                        <span className={cn("px-1.5 py-0.5 rounded font-medium", typeId === dealStructure.primaryType ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground")}>
                          {typeId === dealStructure.primaryType ? "رئيسي" : `بديل ${idx}`}
                        </span>
                        <span>{type.label}</span>
                      </div>
                    );
                  })}
                </div>

                <div className="bg-accent/30 rounded-xl p-5">
                  <p className="text-sm leading-relaxed text-foreground">
                    {disclosure.business_activity || "مشروع"} في {disclosure.district || "—"}, {disclosure.city || "—"}.
                    {` هيكل الصفقة: ${primaryDealLabel}.`}
                    {" "}عدد الأصول المؤكّدة: {inventory.filter((item) => item.included).length} عنصر ({inventory.filter((item) => item.included).reduce((sum, item) => sum + item.qty, 0)} قطعة).
                    {disclosure.annual_rent && ` الإيجار السنوي ${disclosure.annual_rent} ريال.`}
                    {disclosure.lease_remaining && ` متبقي من العقد ${disclosure.lease_remaining}.`}
                    {disclosure.price && ` السعر المطلوب ${Number(disclosure.price).toLocaleString()} ريال.`}
                  </p>
                </div>

                <TransparencyIndicator listing={{
                  ...disclosure,
                  price: disclosure.price ? Number(disclosure.price) : null,
                  annual_rent: disclosure.annual_rent ? Number(disclosure.annual_rent) : null,
                  primary_deal_type: dealTypeForTransparency,
                  inventory,
                  photos,
                }} />

                <div className="grid grid-cols-3 gap-3 text-center">
                  <div className="p-3 rounded-xl bg-muted/50">
                    <div className="text-lg font-medium text-foreground">{totalPhotos}</div>
                    <div className="text-[10px] text-muted-foreground">صورة</div>
                  </div>
                  <div className="p-3 rounded-xl bg-muted/50">
                    <div className="text-lg font-medium text-foreground">{inventory.filter((item) => item.included).length}</div>
                    <div className="text-[10px] text-muted-foreground">أصل مشمول</div>
                  </div>
                  <div className="p-3 rounded-xl bg-muted/50">
                    <div className="text-lg font-medium text-foreground">{Object.values(uploadedDocs).flat().length}</div>
                    <div className="text-[10px] text-muted-foreground">مستند</div>
                  </div>
                </div>

                {/* Photo validation warning */}
                {publishAttempted && !photosOk && imageReq === "required" && (
                  <div className="bg-destructive/10 border border-destructive/30 rounded-xl p-3 flex items-center gap-2">
                    <AlertTriangle size={14} className="text-destructive shrink-0" />
                    <p className="text-xs text-destructive">يجب رفع صورة واحدة على الأقل — عد إلى خطوة الصور والمستندات</p>
                  </div>
                )}

                {/* ── Live Preview — How listing will appear in marketplace ── */}
                <div className="border border-border/50 rounded-2xl overflow-hidden bg-card transition-all duration-500 ease-out">
                  <div className="px-4 py-2.5 bg-muted/30 border-b border-border/30 flex items-center gap-2">
                    <Eye size={14} strokeWidth={1.5} className="text-primary" />
                    <span className="text-[11px] font-medium text-muted-foreground">معاينة الإعلان كما سيظهر للمشترين</span>
                  </div>
                  <div className="p-4">
                    {/* Preview card mimicking marketplace listing card */}
                    <div className="rounded-xl border border-border/40 overflow-hidden bg-background shadow-soft transition-shadow duration-300 hover:shadow-soft-lg">
                      {/* Image */}
                      <div className="h-36 overflow-hidden bg-muted/30 transition-all duration-500">
                        {allPhotoUrls.length > 0 ? (
                          <img src={allPhotoUrls[0]} alt="صورة الإعلان" loading="lazy" className="w-full h-full object-cover transition-transform duration-700 hover:scale-105" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <ImageIcon size={32} strokeWidth={1} className="text-muted-foreground/30" />
                          </div>
                        )}
                      </div>
                      <div className="p-4 space-y-2">
                        <div className="flex items-center justify-between">
                          <h3 className="text-sm font-medium text-foreground truncate transition-all duration-300" key={disclosure.business_activity || "empty"}>
                            <span className="inline-block animate-fade-in">{disclosure.business_activity || "اسم النشاط"}</span>
                          </h3>
                          <span className="text-[10px] px-2 py-0.5 rounded-md bg-primary/10 text-primary font-medium shrink-0 mr-2 transition-all duration-300">
                            {primaryDealLabel}
                          </span>
                        </div>
                        <div className="flex items-center gap-1 text-[11px] text-muted-foreground transition-all duration-300" key={`${disclosure.district}-${disclosure.city}`}>
                          <MapPin size={11} strokeWidth={1.5} />
                          <span className="inline-block animate-fade-in">{disclosure.district || "الحي"}, {disclosure.city || "المدينة"}</span>
                        </div>
                        <div className="flex items-center justify-between pt-1 border-t border-border/30">
                          <span className="text-base font-semibold text-primary transition-all duration-300" key={disclosure.price || "no-price"}>
                            <span className="inline-block animate-fade-in">{disclosure.price ? <>{Number(disclosure.price).toLocaleString()} <SarSymbol size={12} /></> : "—"}</span>
                          </span>
                          <div className="flex items-center gap-2 text-[10px] text-muted-foreground transition-all duration-300">
                            <span>{totalPhotos} صورة</span>
                            <span>·</span>
                            <span>{inventory.filter(i => i.included).length} أصل</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* ── Seller Note ── */}
                <div className="border-t border-border/50 pt-4 mt-2">
                  <label className="block text-sm font-medium mb-2">رسالة للمشترين (اختياري)</label>
                  <div className="relative">
                    <textarea
                      value={sellerNote}
                      onChange={(e) => {
                        if (e.target.value.length <= SELLER_NOTE_MAX) setSellerNote(e.target.value);
                      }}
                      placeholder={`إذا في خاطرك شي ودّك تقوله عن المشروع يا ${sellerName || "صاحب الإعلان"}... ✍️`}
                      rows={3}
                      maxLength={SELLER_NOTE_MAX}
                      className="w-full rounded-xl border border-border bg-background px-4 py-3 text-sm leading-relaxed resize-none focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/40 placeholder:text-muted-foreground/50"
                    />
                    <span className={cn(
                      "absolute bottom-2 left-3 text-[10px]",
                      sellerNote.length > SELLER_NOTE_MAX * 0.9 ? "text-destructive" : "text-muted-foreground/40"
                    )}>
                      {sellerNote.length}/{SELLER_NOTE_MAX}
                    </span>
                  </div>
                </div>

                <Button onClick={handlePublishClick} disabled={saving || loading || (!canPublish && publishAttempted)} className="w-full gradient-primary text-primary-foreground rounded-xl active:scale-[0.98]">
                  {saving ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} strokeWidth={1.5} />}
                  نشر الإعلان
                </Button>
              </div>
            </div>
          )}
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
            <Button
              variant="ghost"
              onClick={async () => {
                await saveDraft();
                toast.success("تم حفظ المسودة — يمكنك إكمالها لاحقاً من لوحة التحكم", { icon: "💾", duration: 4000 });
                navigate("/dashboard");
              }}
              disabled={saving || !listingId}
              className="rounded-xl text-muted-foreground hover:text-foreground active:scale-[0.98]"
            >
              <Save size={15} strokeWidth={1.5} />
              حفظ والمتابعة لاحقاً
            </Button>
            {currentStep < steps.length - 1 && (
              <Button onClick={handleNext} disabled={(currentStep === 0 && !dealStructure.isValid) || saving || (currentStep === 2 && analyzing)} className="gradient-primary text-primary-foreground rounded-xl active:scale-[0.98]">
                التالي
                <ArrowLeft size={16} strokeWidth={1.5} />
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Publish Confirmation Modal with Deal Check */}
      {showPublishConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm animate-fade-in" onClick={() => !dealCheckLoading && setShowPublishConfirm(false)}>
          <div className="bg-card border border-border/50 rounded-2xl shadow-2xl w-full max-w-lg mx-4 p-6 space-y-5 animate-scale-in max-h-[85vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="text-center">
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-3">
                {dealCheckResult ? <Check size={24} strokeWidth={1.5} className="text-primary" /> : <AiStar size={24} />}
              </div>
              <h3 className="font-semibold text-lg mb-1">
                {dealCheckResult ? "تأكيد نشر الإعلان" : "فحص الصفقة قبل النشر"}
              </h3>
              <p className="text-xs text-muted-foreground">
                {dealCheckResult ? "تمت مراجعة الصفقة — هل تريد المتابعة بالنشر؟" : "الـAI يحلل صفقتك ويعطيك توصية قبل النشر"}
              </p>
            </div>

            {/* Listing Summary */}
            <div className="space-y-2 bg-muted/30 rounded-xl p-4 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">العنوان</span>
                <span className="font-medium text-foreground">{disclosure.business_activity || "—"}</span>
              </div>
              <div className="border-t border-border/30" />
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">المدينة</span>
                <span className="font-medium text-foreground">{disclosure.city || "—"}</span>
              </div>
              <div className="border-t border-border/30" />
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">السعر</span>
                <span className="font-medium text-foreground">{disclosure.price ? <>{Number(disclosure.price).toLocaleString()} <SarSymbol size={10} /></> : "—"}</span>
              </div>
            </div>

            {/* Deal Check Loading (only if not already done inline) */}
            {dealCheckLoading && (
              <div className="py-8 flex flex-col items-center gap-3">
                <div className="relative">
                  <AiStar size={28} />
                  <Loader2 size={44} strokeWidth={1} className="absolute -top-2 -left-2 text-primary/30 animate-spin" />
                </div>
                <p className="text-sm font-medium">جاري فحص الصفقة...</p>
                <p className="text-xs text-muted-foreground">يتم تحليل البيانات والأصول والسوق</p>
              </div>
            )}

            {/* Deal Check Error */}
            {dealCheckError && !dealCheckLoading && (
              <div className="bg-warning/10 border border-warning/30 rounded-xl p-3 flex items-start gap-2">
                <AlertTriangle size={14} className="text-warning shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs font-medium text-warning">تعذّر إجراء الفحص التلقائي</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">{dealCheckError}</p>
                  <p className="text-[10px] text-muted-foreground mt-1">يمكنك المتابعة بالنشر بدون الفحص</p>
                </div>
              </div>
            )}

            {/* Deal Check Result Summary */}
            {dealCheckResult && !dealCheckLoading && (
              <div className={cn("rounded-xl p-3 border",
                dealCheckResult.ratingColor === "green" ? "bg-emerald-50 border-emerald-200" :
                dealCheckResult.ratingColor === "yellow" ? "bg-amber-50 border-amber-200" :
                dealCheckResult.ratingColor === "red" ? "bg-red-50 border-red-200" :
                dealCheckResult.ratingColor === "blue" ? "bg-blue-50 border-blue-200" :
                "bg-muted border-border"
              )}>
                <div className="flex items-center justify-between">
                  <span className={cn("text-sm font-medium",
                    dealCheckResult.ratingColor === "green" ? "text-emerald-700" :
                    dealCheckResult.ratingColor === "yellow" ? "text-amber-700" :
                    dealCheckResult.ratingColor === "red" ? "text-red-700" :
                    dealCheckResult.ratingColor === "blue" ? "text-blue-700" :
                    "text-foreground"
                  )}>{dealCheckResult.rating}</span>
                  <span className="text-[11px] text-muted-foreground">عدالة السعر: {dealCheckResult.fairnessVerdict}</span>
                </div>
              </div>
            )}

            <div className="flex gap-3">
              <Button variant="outline" onClick={() => setShowPublishConfirm(false)} disabled={dealCheckLoading} className="flex-1 rounded-xl">
                إلغاء
              </Button>
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
