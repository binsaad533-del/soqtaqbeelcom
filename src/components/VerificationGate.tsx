interface VerificationGateProps {
  children: React.ReactNode;
  /** Message shown when blocked (kept for API compatibility) */
  message?: string;
}

/**
 * ⚠️ تم تعطيل اشتراط توثيق رقم الجوال نهائياً (مؤقتاً) بسبب قيود مزود SMS.
 * المكوّن الآن يعرض المحتوى مباشرة دون أي فحص.
 * لإعادة التفعيل لاحقاً: استرجع المنطق السابق من History.
 */
const VerificationGate = ({ children }: VerificationGateProps) => {
  return <>{children}</>;
};

export default VerificationGate;
