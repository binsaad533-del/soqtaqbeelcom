import { useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuthContext } from "@/contexts/AuthContext";

export const VAT_RATE = 0.15;

export interface Commission {
  id: string;
  deal_id: string;
  seller_id: string;
  deal_amount: number;
  commission_rate: number;
  commission_amount: number;
  vat_rate: number;
  vat_amount: number;
  total_with_vat: number;
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
  | "paid_proof_uploaded"
  | "verified";

export const COMMISSION_STATUS_LABELS: Record<CommissionStatus, string> = {
  unpaid: "غير مدفوعة",
  reminder_sent: "تم التذكير",
  paid_proof_uploaded: "تم الدفع (مع إثبات)",
  verified: "تم التحقق ✓",
};

export const COMMISSION_STATUS_COLORS: Record<CommissionStatus, string> = {
  unpaid: "text-amber-600",
  reminder_sent: "text-amber-500",
  paid_proof_uploaded: "text-indigo-600",
  verified: "text-emerald-600",
};

export const COMMISSION_RATE = 0.01; // flat 1%

export const BANK_DETAILS = {
  beneficiary: "شركة عين جساس",
  legalName: "شركة عين جساس",
  bank: "مصرف الراجحي (Al Rajhi Bank)",
  accountNumber: "611000010006086026222",
  iban: "SA4180000611608016026222",
  nationalId: "7017628152",
  taxNumber: "310661528400003",
  email: "a.almalki@soqtaqbeel.com",
  phone: "0500668089",
} as const;

export const COMMISSION_ACKNOWLEDGMENT_KEY = "commission_acknowledged";

export function getCommissionRate(_amount?: number): number {
  return COMMISSION_RATE;
}

export function calculateCommission(amount: number): number {
  return Math.round(amount * COMMISSION_RATE * 100) / 100;
}

export function calculateVat(commissionAmount: number): number {
  return Math.round(commissionAmount * VAT_RATE * 100) / 100;
}

export function calculateTotalWithVat(commissionAmount: number): number {
  return Math.round(commissionAmount * (1 + VAT_RATE) * 100) / 100;
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

  const markAsPaid = useCallback(async (commissionId: string, receiptPath: string) => {
    const now = new Date().toISOString();
    const { error } = await supabase
      .from("deal_commissions")
      .update({
        payment_status: "paid_proof_uploaded" as any,
        marked_paid_at: now,
        receipt_path: receiptPath,
      } as any)
      .eq("id", commissionId);

    // Audit log
    if (user) {
      await supabase.from("audit_logs").insert({
        user_id: user.id,
        action: "commission_proof_uploaded",
        resource_type: "commission",
        resource_id: commissionId,
        details: { receipt_path: receiptPath },
      });
    }

    return { error };
  }, [user]);

  const verifyCommission = useCallback(async (commissionId: string) => {
    const now = new Date().toISOString();
    const { error } = await supabase
      .from("deal_commissions")
      .update({
        payment_status: "verified",
        paid_at: now,
      } as any)
      .eq("id", commissionId);

    // Audit log
    if (user) {
      await supabase.from("audit_logs").insert({
        user_id: user.id,
        action: "commission_verified",
        resource_type: "commission",
        resource_id: commissionId,
        details: { verified_by: user.id },
      });
    }

    // Send notification to seller
    if (!error) {
      const { data: comm } = await supabase
        .from("deal_commissions")
        .select("seller_id, deal_id, commission_amount")
        .eq("id", commissionId)
        .maybeSingle();
      if (comm) {
        // Internal notification
        await supabase.from("notifications").insert({
          user_id: comm.seller_id,
          title: "تم تأكيد سداد عمولتك ✓",
          body: `تم تأكيد سداد عمولتك. شكراً لالتزامك.`,
          type: "commission_verified",
          reference_type: "deal",
          reference_id: comm.deal_id,
        });

        // SMS notification
        const { data: deal } = await supabase
          .from("deals")
          .select("listing_id")
          .eq("id", comm.deal_id)
          .maybeSingle();
        const { data: listing } = deal?.listing_id
          ? await supabase.from("listings").select("title").eq("id", deal.listing_id).maybeSingle()
          : { data: null };
        const title = listing?.title || "صفقتك";

        await supabase.functions.invoke("notify-sms", {
          body: {
            user_id: comm.seller_id,
            event_type: "commission_verified",
            data: { title, price: comm.commission_amount },
          },
        });

        // Auto-unsuspend seller if they were suspended
        await supabase
          .from("profiles")
          .update({ is_commission_suspended: false } as any)
          .eq("user_id", comm.seller_id)
          .eq("is_commission_suspended", true);
      }
    }

    return { error };
  }, [user]);

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
