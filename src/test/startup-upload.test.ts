import { describe, it, expect, vi } from "vitest";

const ALLOWED_MIME_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif", "image/avif"];
const ALLOWED_EXTENSIONS = ["jpg", "jpeg", "png", "webp", "gif", "avif"];

function validateImageFile(file: { name: string; type: string; size: number }) {
  const rawExt = file.name.split(".").pop()?.toLowerCase() ?? "";
  const isAllowed =
    (file.type && ALLOWED_MIME_TYPES.includes(file.type.toLowerCase())) ||
    ALLOWED_EXTENSIONS.includes(rawExt);

  if (!isAllowed) {
    return { valid: false, error: "Please choose a supported image format (JPG, JPEG, PNG, or WEBP)" };
  }
  if (file.size > 5 * 1024 * 1024) {
    return { valid: false, error: "Image must be under 5 MB" };
  }
  return { valid: true, error: null };
}

function resolveMimeType(file: { name: string; type: string }) {
  const rawExt = file.name.split(".").pop()?.toLowerCase() ?? "";
  let mimeType = file.type && ALLOWED_MIME_TYPES.includes(file.type.toLowerCase()) ? file.type.toLowerCase() : "";
  if (!mimeType) {
    switch (rawExt) {
      case "jpg":
      case "jpeg":
        mimeType = "image/jpeg";
        break;
      case "png":
        mimeType = "image/png";
        break;
      case "webp":
        mimeType = "image/webp";
        break;
      case "gif":
        mimeType = "image/gif";
        break;
      case "avif":
        mimeType = "image/avif";
        break;
      default:
        mimeType = "image/jpeg";
    }
  }
  return mimeType;
}

describe("Startup project image upload validation", () => {
  it("accepts valid JPG, PNG, and WEBP files with standard MIME types", () => {
    expect(validateImageFile({ name: "hero.jpg", type: "image/jpeg", size: 1024 })).toEqual({ valid: true, error: null });
    expect(validateImageFile({ name: "logo.png", type: "image/png", size: 2048 })).toEqual({ valid: true, error: null });
    expect(validateImageFile({ name: "banner.webp", type: "image/webp", size: 4096 })).toEqual({ valid: true, error: null });
  });

  it("accepts files where browser reports empty MIME type but extension is valid (common Windows quirk)", () => {
    expect(validateImageFile({ name: "startup.WEBP", type: "", size: 5000 })).toEqual({ valid: true, error: null });
    expect(validateImageFile({ name: "photo.JPG", type: "application/octet-stream", size: 5000 })).toEqual({ valid: true, error: null });
  });

  it("rejects non-image extensions and MIME types", () => {
    expect(validateImageFile({ name: "document.pdf", type: "application/pdf", size: 1024 })).toEqual({
      valid: false,
      error: "Please choose a supported image format (JPG, JPEG, PNG, or WEBP)",
    });
    expect(validateImageFile({ name: "script.exe", type: "", size: 1024 })).toEqual({
      valid: false,
      error: "Please choose a supported image format (JPG, JPEG, PNG, or WEBP)",
    });
  });

  it("rejects images larger than 5 MB", () => {
    const res = validateImageFile({ name: "large.png", type: "image/png", size: 6 * 1024 * 1024 });
    expect(res).toEqual({
      valid: false,
      error: "Image must be under 5 MB",
    });
  });

  it("correctly resolves MIME types for storage upload headers", () => {
    expect(resolveMimeType({ name: "photo.jpg", type: "" })).toBe("image/jpeg");
    expect(resolveMimeType({ name: "graphic.PNG", type: "" })).toBe("image/png");
    expect(resolveMimeType({ name: "screen.webp", type: "" })).toBe("image/webp");
    expect(resolveMimeType({ name: "custom.png", type: "image/png" })).toBe("image/png");
  });
});
