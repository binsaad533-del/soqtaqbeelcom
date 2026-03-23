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
  payment_status: string;
  receipt_path: string | null;
  paid_at: string | null;
  marked_paid_at: string | null;
  reminder_count: number;
  last_reminder_at: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export const COMMISSION_RATE = 0.01; // 1%

export const BANK_DETAILS = {
  beneficiary: "شركة عين جساس",
  bank: "مصرف الراجحي",
  iban: "SA4180000611608016026222",
} as const;

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
    const { error } = await supabase
      .from("deal_commissions")
      .update({
        payment_status: "paid",
        marked_paid_at: now,
        paid_at: now,
        ...(receiptPath ? { receipt_path: receiptPath } : {}),
      } as any)
      .eq("id", commissionId);
    return { error };
  }, []);

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
    uploadReceipt,
  };
}
