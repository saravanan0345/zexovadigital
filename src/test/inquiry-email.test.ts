import { afterEach, describe, expect, it, vi } from "vitest";
import { buildInquiryEmail, ENQUIRY_NOTIFY_EMAIL, notifyNewInquiry } from "@/lib/inquiry-email.server";

const inquiry = {
  kind: "contact",
  name: "Alex Doe",
  email: "alex@example.com",
  message: "I would like to discuss a project.",
};

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("enquiry notification email", () => {
  it("goes to the official business inbox", () => {
    expect(ENQUIRY_NOTIFY_EMAIL).toBe("zexovadigital@gmail.com");
  });
  it("escapes customer text so it cannot inject HTML", () => {
    const { html } = buildInquiryEmail({ kind: "contact", name: "<b>x</b>", email: "a@b.co", message: "<script>hi</script> long msg" });
    expect(html).not.toContain("<script>");
    expect(html).toContain("&lt;script&gt;");
  });

  it("sends enquiries directly through Resend with the configured verified sender", async () => {
    vi.stubEnv("RESEND_API_KEY", "resend-test-key");
    vi.stubEnv("RESEND_FROM_EMAIL", "enquiries@example.com");
    const fetchMock = vi.fn().mockResolvedValue(new Response(null, { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);

    await expect(notifyNewInquiry(inquiry)).resolves.toEqual({ ok: true });

    expect(fetchMock).toHaveBeenCalledOnce();
    const [url, request] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("https://api.resend.com/emails");
    expect(request.method).toBe("POST");
    expect(new Headers(request.headers).get("Authorization")).toBe("Bearer resend-test-key");
    expect(JSON.parse(String(request.body))).toMatchObject({
      from: "ZEXOVA DIGITAL Website <enquiries@example.com>",
      to: [ENQUIRY_NOTIFY_EMAIL],
      reply_to: inquiry.email,
    });
  });

  it("logs missing credentials and skips sending when the connector is not configured", async () => {
    vi.stubEnv("RESEND_API_KEY", "");
    vi.stubEnv("RESEND_FROM_EMAIL", "");
    const fetchMock = vi.fn();
    const errorMock = vi.spyOn(console, "error").mockImplementation(() => {});
    vi.stubGlobal("fetch", fetchMock);

    await expect(notifyNewInquiry(inquiry)).resolves.toEqual({ ok: false, reason: "missing-config" });

    expect(fetchMock).not.toHaveBeenCalled();
    expect(errorMock).toHaveBeenCalledWith(
      "enquiry email skipped: missing RESEND_API_KEY",
    );
  });

  it("logs connector failures without throwing", async () => {
    vi.stubEnv("RESEND_API_KEY", "resend-test-key");
    vi.stubEnv("RESEND_FROM_EMAIL", "enquiries@example.com");
    const errorMock = vi.spyOn(console, "error").mockImplementation(() => {});
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("network unavailable")));

    await expect(notifyNewInquiry(inquiry)).resolves.toEqual({ ok: false, reason: "network-error" });
    expect(errorMock).toHaveBeenCalledWith("enquiry email error", expect.any(Error));
  });

  it("reports an unsuccessful Resend response", async () => {
    vi.stubEnv("RESEND_API_KEY", "resend-test-key");
    vi.stubEnv("RESEND_FROM_EMAIL", "enquiries@example.com");
    const errorMock = vi.spyOn(console, "error").mockImplementation(() => {});
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("sender not verified", { status: 403 })));

    await expect(notifyNewInquiry(inquiry)).resolves.toEqual({ ok: false, reason: "rejected" });
    expect(errorMock).toHaveBeenCalledWith("enquiry email failed [403]: sender not verified");
  });

  it("identifies rejected Resend API keys", async () => {
    vi.stubEnv("RESEND_API_KEY", "resend-test-key");
    vi.stubEnv("RESEND_FROM_EMAIL", "enquiries@example.com");
    vi.spyOn(console, "error").mockImplementation(() => {});
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("invalid api key", { status: 401 })));

    await expect(notifyNewInquiry(inquiry)).resolves.toEqual({ ok: false, reason: "unauthorized" });
  });
});
