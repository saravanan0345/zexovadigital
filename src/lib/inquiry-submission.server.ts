import { supabaseAdmin } from "@/integrations/supabase/client.server";
import type { InquiryInput } from "./inquiries.functions";
import { notifyNewInquiry } from "./inquiry-email.server";

export async function submitInquiryAndNotify(data: InquiryInput) {
  const email = data.email.toLowerCase();

  try {
    const { error } = await supabaseAdmin.from("inquiries").insert({
      kind: data.kind,
      name: data.name,
      email,
      phone: data.phone || null,
      company: data.company || null,
      service: data.service || null,
      budget: data.budget || null,
      timeline: data.timeline || null,
      message: data.message,
    });
    if (error) {
      console.error("inquiry save failed", error);
      return {
        ok: false as const,
        error: "We couldn't save your message right now. Please try again later.",
      };
    }
  } catch (error) {
    console.error("inquiry save failed", error);
    return {
      ok: false as const,
      error: "We couldn't save your message right now. Please try again later.",
    };
  }

  const notification = await notifyNewInquiry({ ...data, email });
  if (!notification.ok) {
    console.error(`inquiry saved but email notification failed: ${notification.reason}`);
  }

  return { ok: true as const };
}
