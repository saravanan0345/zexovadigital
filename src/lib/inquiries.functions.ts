import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

export const inquirySchema = z.object({
  kind: z.enum(["contact", "quote"]),
  name: z.string().trim().min(2, "Please enter your name").max(100),
  email: z.string().trim().email("Please enter a valid email").max(255),
  phone: z.string().trim().max(30).optional().or(z.literal("")),
  company: z.string().trim().max(120).optional().or(z.literal("")),
  service: z.string().trim().max(120).optional().or(z.literal("")),
  budget: z.string().trim().max(60).optional().or(z.literal("")),
  timeline: z.string().trim().max(60).optional().or(z.literal("")),
  message: z.string().trim().min(10, "Please tell us a little more (10+ characters)").max(3000),
  website: z.string().max(0).optional(), // honeypot
});

export type InquiryInput = z.infer<typeof inquirySchema>;

export const submitInquiry = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => inquirySchema.parse(data))
  .handler(async ({ data }) => {
    if (data.website) return { ok: true as const }; // silently drop bots
    const email = data.email.toLowerCase();
    const { notifyNewInquiry } = await import("./inquiry-email.server");
    const sent = await notifyNewInquiry({ ...data, email });
    if (!sent.ok) {
      if (sent.reason === "unauthorized") {
        return {
          ok: false as const,
          error: "Resend rejected the API key. Replace RESEND_API_KEY in your local .env with an active key, then restart the dev server.",
        };
      }
      if (sent.reason === "missing-config") {
        return {
          ok: false as const,
          error: "Email is not configured. Check RESEND_API_KEY and RESEND_FROM_EMAIL in your local .env.",
        };
      }
      return { ok: false as const, error: "We couldn't send your message right now. Please try again later." };
    }
    return { ok: true as const };
  });
