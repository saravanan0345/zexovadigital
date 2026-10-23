import { beforeEach, describe, expect, it, vi } from "vitest";
import type { InquiryInput } from "@/lib/inquiries.functions";

const mocks = vi.hoisted(() => ({
  from: vi.fn(),
  insert: vi.fn(),
  notifyNewInquiry: vi.fn(),
}));

vi.mock("@/integrations/supabase/client.server", () => ({
  supabaseAdmin: { from: mocks.from },
}));

vi.mock("@/lib/inquiry-email.server", () => ({
  notifyNewInquiry: mocks.notifyNewInquiry,
}));

import { submitInquiryAndNotify } from "@/lib/inquiry-submission.server";

const inquiry: InquiryInput = {
  kind: "contact",
  name: "Alex Doe",
  email: "ALEX@EXAMPLE.COM",
  phone: "",
  company: "",
  service: "Website Design & Development",
  budget: "",
  timeline: "",
  message: "I would like to discuss a project.",
};

beforeEach(() => {
  vi.clearAllMocks();
  mocks.from.mockReturnValue({ insert: mocks.insert });
  mocks.insert.mockResolvedValue({ error: null });
  mocks.notifyNewInquiry.mockResolvedValue({ ok: true });
});

describe("inquiry submission", () => {
  it("saves the enquiry before sending its email notification", async () => {
    await expect(submitInquiryAndNotify(inquiry)).resolves.toEqual({ ok: true });

    expect(mocks.from).toHaveBeenCalledWith("inquiries");
    expect(mocks.insert).toHaveBeenCalledWith({
      kind: "contact",
      name: "Alex Doe",
      email: "alex@example.com",
      phone: null,
      company: null,
      service: "Website Design & Development",
      budget: null,
      timeline: null,
      message: inquiry.message,
    });
    expect(mocks.notifyNewInquiry).toHaveBeenCalledWith({
      ...inquiry,
      email: "alex@example.com",
    });
    expect(mocks.insert.mock.invocationCallOrder[0]).toBeLessThan(
      mocks.notifyNewInquiry.mock.invocationCallOrder[0],
    );
  });

  it("accepts a saved enquiry even if Resend rejects its API key", async () => {
    const errorMock = vi.spyOn(console, "error").mockImplementation(() => {});
    mocks.notifyNewInquiry.mockResolvedValue({ ok: false, reason: "unauthorized" });

    await expect(submitInquiryAndNotify(inquiry)).resolves.toEqual({ ok: true });

    expect(mocks.insert).toHaveBeenCalledOnce();
    expect(errorMock).toHaveBeenCalledWith(
      "inquiry saved but email notification failed: unauthorized",
    );
  });

  it("reports a database failure and does not send an email", async () => {
    const errorMock = vi.spyOn(console, "error").mockImplementation(() => {});
    const saveError = new Error("database unavailable");
    mocks.insert.mockResolvedValue({ error: saveError });

    await expect(submitInquiryAndNotify(inquiry)).resolves.toEqual({
      ok: false,
      error: "We couldn't save your message right now. Please try again later.",
    });

    expect(errorMock).toHaveBeenCalledWith("inquiry save failed", saveError);
    expect(mocks.notifyNewInquiry).not.toHaveBeenCalled();
  });
});
