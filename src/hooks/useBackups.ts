import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuthContext } from "@/contexts/AuthContext";

export interface BackupLog {
  id: string;
  backup_type: string;
  status: string;
  started_at: string;
  completed_at: string | null;
  size_bytes: number | null;
  tables_included: string[];
  error_message: string | null;
  initiated_by: string | null;
  metadata: Record<string, any>;
}

export function useBackups() {
  const { user } = useAuthContext();
  const [logs, setLogs] = useState<BackupLog[]>([]);
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);

  const fetchLogs = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const { data } = await supabase
      .from("backup_logs" as any)
      .select("*")
      .order("started_at", { ascending: false })
      .limit(50);
    setLogs((data || []) as unknown as BackupLog[]);
    setLoading(false);
  }, [user]);

  useEffect(() => { fetchLogs(); }, [fetchLogs]);

  const exportData = useCallback(async (tables?: string[]) => {
    setExporting(true);
    try {
      const { data, error } = await supabase.functions.invoke("export-data", {
        body: { tables: tables || [] },
      });
      if (error) throw error;

      // Download as JSON file
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `backup-${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      await fetchLogs();
      return { success: true };
    } catch (e: any) {
      return { success: false, error: e.message };
    } finally {
      setExporting(false);
    }
  }, [fetchLogs]);

  return { logs, loading, exporting, exportData, fetchLogs };
}
