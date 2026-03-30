import { useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuthContext } from "@/contexts/AuthContext";

export interface Commission {
  id: string;
  deal_id: string;
  seller_id: string;
  deal_amount: number;
  commission_rate: number;
  commission_amount: number;
  payment_status: CommissionStatus;
  receipt_path: string | null;
  paid_at: string | null;
  marked_paid_at: string | null;
  reminder_count: number;
  last_reminder_at: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export type CommissionStatus =
  | "unpaid"
  | "reminder_sent"
  | "paid_unverified"
  | "paid_proof_uploaded"
  | "verified";

export const COMMISSION_STATUS_LABELS: Record<CommissionStatus, string> = {
  unpaid: "غير مدفوعة",
  reminder_sent: "تم التذكير",
  paid_unverified: "تم الدفع (بدون إثبات)",
  paid_proof_uploaded: "تم الدفع (مع إثبات)",
  verified: "تم التحقق ✓",
};

export const COMMISSION_STATUS_COLORS: Record<CommissionStatus, string> = {
  unpaid: "text-amber-600",
  reminder_sent: "text-amber-500",
  paid_unverified: "text-blue-600",
  paid_proof_uploaded: "text-indigo-600",
  verified: "text-emerald-600",
};

export const COMMISSION_RATE = 0.01; // flat 1%

export function getCommissionRate(_amount?: number): number {
  return COMMISSION_RATE;
}

export function calculateCommission(amount: number): number {
  return Math.round(amount * COMMISSION_RATE * 100) / 100;
}

export function useCommissions() {
  const { user } = useAuthContext();

  const getCommission = useCallback(async (dealId: string): Promise<Commission | null> => {
    const { data } = await supabase
      .from("deal_commissions")
      .select("*")
      .eq("deal_id", dealId)
      .maybeSingle();
    return data as unknown as Commission | null;
  }, []);

  const getMyCommissions = useCallback(async (): Promise<Commission[]> => {
    if (!user) return [];
    const { data } = await supabase
      .from("deal_commissions")
      .select("*")
      .eq("seller_id", user.id)
      .order("created_at", { ascending: false });
    return (data || []) as unknown as Commission[];
  }, [user]);

  const getAllCommissions = useCallback(async (): Promise<Commission[]> => {
    const { data } = await supabase
      .from("deal_commissions")
      .select("*")
      .order("created_at", { ascending: false });
    return (data || []) as unknown as Commission[];
  }, []);

  const markAsPaid = useCallback(async (commissionId: string, receiptPath?: string) => {
    const now = new Date().toISOString();
    const status: CommissionStatus = receiptPath ? "paid_proof_uploaded" : "paid_unverified";
    const { error } = await supabase
      .from("deal_commissions")
      .update({
        payment_status: status,
        marked_paid_at: now,
        ...(receiptPath ? { receipt_path: receiptPath } : {}),
      } as any)
      .eq("id", commissionId);
    return { error };
  }, []);

  const verifyCommission = useCallback(async (commissionId: string) => {
    const now = new Date().toISOString();
    const { error } = await supabase
      .from("deal_commissions")
      .update({
        payment_status: "verified",
        paid_at: now,
      } as any)
      .eq("id", commissionId);
    return { error };
  }, []);

  const sendReminder = useCallback(async (commission: Commission) => {
    if (!user) return;
    // Insert notification for seller
    await supabase.from("notifications").insert({
      user_id: commission.seller_id,
      title: "تذكير ودي بسداد العمولة 🤍",
      body: `نأمل التكرم بسداد عمولة المنصة (1%) الخاصة بهذه الصفقة. مبلغ العمولة: ${commission.commission_amount.toLocaleString("en-US")} ﷼. ثقتكم وأمانتكم محل تقديرنا 🙏`,
      type: "commission_reminder",
      reference_type: "deal",
      reference_id: commission.deal_id,
    });
    // Update reminder count
    await supabase
      .from("deal_commissions")
      .update({
        reminder_count: commission.reminder_count + 1,
        last_reminder_at: new Date().toISOString(),
        payment_status: commission.payment_status === "unpaid" ? "reminder_sent" : commission.payment_status,
      } as any)
      .eq("id", commission.id);
  }, [user]);

  const uploadReceipt = useCallback(async (commissionId: string, file: File): Promise<string | null> => {
    if (!user) return null;
    const ext = file.name.split(".").pop();
    const path = `${user.id}/${commissionId}.${ext}`;
    const { error } = await supabase.storage
      .from("commission-receipts")
      .upload(path, file, { upsert: true });
    if (error) return null;
    return path;
  }, [user]);

  return {
    getCommission,
    getMyCommissions,
    getAllCommissions,
    markAsPaid,
    verifyCommission,
    sendReminder,
    uploadReceipt,
  };
}
