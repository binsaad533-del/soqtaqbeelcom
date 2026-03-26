import { supabase } from "@/integrations/supabase/client";

type NotificationCategory = "deals" | "offers" | "messages" | "marketing";

/**
 * Sends a notification email to a user by their ID.
 * The server looks up the email and checks notification preferences.
 */
export async function sendNotificationEmail({
  userId,
  category,
  templateName,
  idempotencyKey,
  templateData,
}: {
  userId: string;
  category: NotificationCategory;
  templateName: string;
  idempotencyKey: string;
  templateData?: Record<string, any>;
}) {
  try {
    const { error } = await supabase.functions.invoke("notify-user", {
      body: { userId, category, templateName, idempotencyKey, templateData },
    });

    if (error) {
      console.error("Failed to send notification email:", error);
      return { success: false, error };
    }

    return { success: true };
  } catch (e) {
    console.error("sendNotificationEmail error:", e);
    return { success: false, error: e };
  }
}
