import { supabase } from "@/integrations/supabase/client";

type NotificationCategory = "deals" | "offers" | "messages" | "marketing";

/**
 * Checks user's notification preferences, then sends a transactional email
 * if the user has email enabled for the given category.
 */
export async function sendNotificationEmail({
  userId,
  category,
  templateName,
  recipientEmail,
  idempotencyKey,
  templateData,
}: {
  userId: string;
  category: NotificationCategory;
  templateName: string;
  recipientEmail: string;
  idempotencyKey: string;
  templateData?: Record<string, any>;
}) {
  try {
    // Check notification preferences
    const { data: prefs } = await supabase
      .from("notification_preferences")
      .select("*")
      .eq("user_id", userId)
      .maybeSingle();

    const emailKey = `${category}_email` as const;

    // Default: email enabled for deals/offers/messages, check prefs if they exist
    const emailEnabled = prefs ? (prefs as any)[emailKey] !== false : true;

    if (!emailEnabled) {
      console.log(`Email notification skipped: ${category} disabled for user ${userId}`);
      return { skipped: true, reason: "preference_disabled" };
    }

    const { error } = await supabase.functions.invoke("send-transactional-email", {
      body: {
        templateName,
        recipientEmail,
        idempotencyKey,
        templateData,
      },
    });

    if (error) {
      console.error("Failed to send notification email:", error);
      return { skipped: false, error };
    }

    return { skipped: false, success: true };
  } catch (e) {
    console.error("sendNotificationEmail error:", e);
    return { skipped: false, error: e };
  }
}
