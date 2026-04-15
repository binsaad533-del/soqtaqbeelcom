import type { DealStructureSelection } from "@/components/DealStructureEngine";
import type { InventoryItem, InventoryPricingMode, CrExtractionResult } from "./types";

export interface CreateListingSharedState {
  // Deal structure
  dealStructure: DealStructureSelection;
  setDealStructure: (value: DealStructureSelection) => void;

  // Photos & files
  photos: Record<string, string[]>;
  setPhotos: React.Dispatch<React.SetStateAction<Record<string, string[]>>>;
  localPreviews: Record<string, string[]>;
  setLocalPreviews: React.Dispatch<React.SetStateAction<Record<string, string[]>>>;
  uploadingGroup: string | null;
  setUploadingGroup: (v: string | null) => void;
  uploadProgress: { current: number; total: number };
  setUploadProgress: (v: { current: number; total: number }) => void;
  uploadedDocs: Record<string, string[]>;
  setUploadedDocs: React.Dispatch<React.SetStateAction<Record<string, string[]>>>;
  activePhotoGroup: string | null;
  setActivePhotoGroup: (v: string | null) => void;
  activeDocType: string | null;
  setActiveDocType: (v: string | null) => void;
  fileInputRef: React.RefObject<HTMLInputElement>;
  docInputRef: React.RefObject<HTMLInputElement>;
  bulkInputRef: React.RefObject<HTMLInputElement>;
  draggingGroup: string | null;
  setDraggingGroup: (v: string | null) => void;
  
  // File statuses
  fileStatuses: FileUploadStatus[];
  setFileStatuses: React.Dispatch<React.SetStateAction<FileUploadStatus[]>>;

  // Analysis
  analyzing: boolean;
  analyzed: boolean;
  analyzeProgress: number;
  inventory: InventoryItem[];
  setInventory: React.Dispatch<React.SetStateAction<InventoryItem[]>>;
  analysisSummary: string;
  dedupActions: import("./types").DedupAction[];
  handleAnalyze: () => Promise<void>;

  // CR extraction
  crExtraction: CrExtractionResult | null;
  crExtracting: boolean;
  crExtractionDone: boolean;
  isCrOnly: boolean;

  // Disclosure
  disclosure: Record<string, string>;
  setDisclosure: React.Dispatch<React.SetStateAction<Record<string, string>>>;

  // Location
  locationLat: number | null;
  locationLng: number | null;
  setLocationLat: (v: number | null) => void;
  setLocationLng: (v: number | null) => void;
  areaSqm: string;
  setAreaSqm: (v: string) => void;

  // Seller note
  sellerNote: string;
  setSellerNote: (v: string) => void;
  sellerName: string;

  // Pricing
  inventoryPricingMode: InventoryPricingMode;
  setInventoryPricingMode: (v: InventoryPricingMode) => void;
  bulkInventoryPrice: string;
  setBulkInventoryPrice: (v: string) => void;

  // Listing
  listingId: string | null;
  saving: boolean;
  loading: boolean;
  updateListing: (id: string, data: any) => Promise<any>;

  // Publish
  publishAttempted: boolean;
  setPublishAttempted: (v: boolean) => void;
  canPublish: boolean;
  photosOk: boolean;
  disclosureErrors: Record<string, string>;
  locationOk: boolean;
  
  // Deal check
  dealCheckLoading: boolean;
  dealCheckResult: any;
  dealCheckError: string;
  handleRunInlineDealCheck: () => Promise<void>;
  handlePublishClick: () => Promise<void>;
  
  // Display helpers
  stepDirection: "next" | "prev";
  totalPhotos: number;
  allPhotoUrls: string[];
  imageReq: "required" | "optional" | "none";
  primaryDealLabel: string;
  disclosureScore: number;
  editingItemId: string | null;
  setEditingItemId: (v: string | null) => void;

  // Photo group helpers
  photoGroups: Array<{ id: string; label: string; min: number; icon: string; dealTypes: readonly string[] }>;
  getGroupDisplayUrls: (groupId: string) => string[];
  handleDrop: (e: React.DragEvent<HTMLDivElement>, groupId: string) => void;
  handleBulkDrop: (files: FileList) => void;
}

export interface FileUploadStatus {
  id: string;
  name: string;
  size: number;
  type: "image" | "document";
  status: "uploading" | "uploaded" | "failed";
  error?: string;
  url?: string;
  previewUrl?: string;
}
