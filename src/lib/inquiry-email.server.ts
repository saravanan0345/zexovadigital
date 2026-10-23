const RESEND_API_URL = "https://api.resend.com/emails";

/** Where new website enquiries are emailed. */
export const ENQUIRY_NOTIFY_EMAIL = "zexovadigital@gmail.com";

export type InquiryEmailData = {
  kind: string; name: string; email: string; phone?: string | null | undefined; company?: string | null | undefined;
  service?: string | null | undefined; budget?: string | null | undefined; timeline?: string | null | undefined; message: string;
};

export type InquiryEmailResult =
  | { ok: true }
  | { ok: false; reason: "missing-config" | "unauthorized" | "rejected" | "network-error" };

const esc = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");

export function buildInquiryEmail(d: InquiryEmailData) {
  const label = d.kind === "quote" ? "Quote request" : "Contact enquiry";
  const rows: [string, string | null | undefined][] = [
    ["Name", d.name], ["Email", d.email], ["Phone", d.phone], ["Company", d.company],
    ["Service", d.service], ["Budget", d.budget], ["Timeline", d.timeline],
  ];
  const tr = rows.filter(([, v]) => v).map(([k, v]) =>
    `<tr><td style="padding:6px 12px 6px 0;color:#64748b;vertical-align:top">${k}</td><td style="padding:6px 0;color:#07152B;font-weight:600">${esc(String(v))}</td></tr>`).join("");
  const html = `<div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto;padding:24px;background:#ffffff">
  <h2 style="margin:0 0 4px;color:#07152B">New ${label.toLowerCase()}</h2>
  <p style="margin:0 0 16px;color:#1769E8;font-weight:600">ZEXOVA DIGITAL website</p>
  <table style="border-collapse:collapse;font-size:14px">${tr}</table>
  <h3 style="margin:20px 0 6px;color:#07152B;font-size:15px">Message</h3>
  <p style="margin:0;white-space:pre-wrap;font-size:14px;color:#07152B;line-height:1.5">${esc(d.message)}</p>
  <p style="margin:24px 0 0;font-size:12px;color:#64748b">Reply to this email to answer ${esc(d.name)} directly.</p>
</div>`;
  const subject = `${label}${d.service ? ` – ${d.service}` : ""} from ${d.name}`;
  return { subject, html };
}

/** Emails the enquiry to the business inbox and reports whether delivery was accepted. */
export async function notifyNewInquiry(d: InquiryEmailData): Promise<InquiryEmailResult> {
  const resendKey = process.env["RESEND_API_KEY"];
  const fromEmail =
    process.env["RESEND_FROM_EMAIL"] || (import.meta.env.DEV ? "onboarding@resend.dev" : undefined);
  const missing = [
    ...(!resendKey ? ["RESEND_API_KEY"] : []),
    ...(!fromEmail ? ["RESEND_FROM_EMAIL (verified Resend sender)"] : []),
  ];
  if (missing.length > 0) {
    console.error(`enquiry email skipped: missing ${missing.join(", ")}`);
    return { ok: false, reason: "missing-config" };
  }
  const { subject, html } = buildInquiryEmail(d);
  try {
    const res = await fetch(RESEND_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${resendKey}`,
      },
      body: JSON.stringify({
        from: `ZEXOVA DIGITAL Website <${fromEmail}>`,
        to: [ENQUIRY_NOTIFY_EMAIL],
        reply_to: d.email,
        subject, html,
      }),
    });
    if (!res.ok) {
      console.error(`enquiry email failed [${res.status}]: ${await res.text()}`);
      return { ok: false, reason: res.status === 401 ? "unauthorized" : "rejected" };
    }
    return { ok: true };
  } catch (e) {
    console.error("enquiry email error", e);
    return { ok: false, reason: "network-error" };
  }
}
