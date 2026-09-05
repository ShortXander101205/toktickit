import { describe, it, expect } from "vitest";
import {
  validateAttachmentFile,
  validateAttachmentQuantity,
  MAX_FILE_SIZE_BYTES,
} from "../../src/services/attachmentValidator.js";

describe("Unit: Attachment Validation Utility (UNIT-03)", () => {
  it("accepts permitted MIME types and extensions (JPG, PNG, WEBP, PDF)", () => {
    expect(validateAttachmentFile("test.jpg", "image/jpeg", 1024).valid).toBe(true);
    expect(validateAttachmentFile("photo.png", "image/png", 2048).valid).toBe(true);
    expect(validateAttachmentFile("graphic.webp", "image/webp", 5000).valid).toBe(true);
    expect(validateAttachmentFile("doc.pdf", "application/pdf", 1048576).valid).toBe(true);
  });

  it("rejects forbidden file extensions (e.g. .txt, .exe, .docx, .zip)", () => {
    const txtResult = validateAttachmentFile("logs.txt", "text/plain", 500);
    expect(txtResult.valid).toBe(false);
    expect(txtResult.error).toMatch(/unsupported/i);

    const exeResult = validateAttachmentFile("virus.exe", "application/x-msdownload", 500);
    expect(exeResult.valid).toBe(false);
    expect(exeResult.error).toMatch(/unsupported/i);

    const docxResult = validateAttachmentFile("report.docx", "application/vnd.openxmlformats-officedocument.wordprocessingml.document", 500);
    expect(docxResult.valid).toBe(false);
  });

  it("rejects files exceeding 5 MB (5,242,880 bytes)", () => {
    expect(validateAttachmentFile("exact_limit.pdf", "application/pdf", MAX_FILE_SIZE_BYTES).valid).toBe(true);

    const overLimit = MAX_FILE_SIZE_BYTES + 1; // 5,242,881
    const res = validateAttachmentFile("oversized.png", "image/png", overLimit);
    expect(res.valid).toBe(false);
    expect(res.error).toMatch(/exceeds/i);
  });

  it("enforces maximum 5 active attachments limit", () => {
    expect(validateAttachmentQuantity(0, 5).valid).toBe(true);
    expect(validateAttachmentQuantity(4, 1).valid).toBe(true);
    expect(validateAttachmentQuantity(5, 1).valid).toBe(false);
    expect(validateAttachmentQuantity(3, 3).valid).toBe(false);
  });
});
