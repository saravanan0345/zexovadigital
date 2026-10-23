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
    const { submitInquiryAndNotify } = await import("./inquiry-submission.server");
    return submitInquiryAndNotify(data);
  });
