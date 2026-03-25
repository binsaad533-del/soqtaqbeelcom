import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

interface UsePhoneVerificationReturn {
  sendOtp: (phone: string) => Promise<{ success: boolean; error?: string; channel?: "sms" | "call" }>;
  verifyOtp: (phone: string, code: string) => Promise<{ success: boolean; verified?: boolean; error?: string }>;
  sending: boolean;
  verifying: boolean;
}

export function usePhoneVerification(): UsePhoneVerificationReturn {
  const [sending, setSending] = useState(false);
  const [verifying, setVerifying] = useState(false);

  const sendOtp = useCallback(async (phone: string) => {
    setSending(true);
    try {
      const { data, error } = await supabase.functions.invoke("send-otp", {
        body: { phone },
      });
      if (error) return { success: false, error: "فشل إرسال رمز التحقق" };
      if (data?.error) return { success: false, error: data.error };
      return { success: true, channel: data?.channel };
    } catch {
      return { success: false, error: "حدث خطأ، حاول مرة أخرى" };
    } finally {
      setSending(false);
    }
  }, []);

  const verifyOtp = useCallback(async (phone: string, code: string) => {
    setVerifying(true);
    try {
      const { data, error } = await supabase.functions.invoke("verify-otp", {
        body: { phone, code },
      });
      if (error) return { success: false, error: "فشل التحقق" };
      if (data?.error) return { success: false, error: data.error, verified: false };
      return { success: true, verified: data?.verified ?? true };
    } catch {
      return { success: false, error: "حدث خطأ، حاول مرة أخرى" };
    } finally {
      setVerifying(false);
    }
  }, []);

  return { sendOtp, verifyOtp, sending, verifying };
}
