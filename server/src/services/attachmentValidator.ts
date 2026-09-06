import path from "path";

export const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024; // 5,242,880 bytes (5 MB)
export const MAX_ACTIVE_ATTACHMENTS = 5;

export const ALLOWED_EXTENSIONS = new Set([".jpg", ".jpeg", ".png", ".webp", ".pdf"]);

export const ALLOWED_MIME_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "application/pdf",
]);

export interface FileValidationResult {
  valid: boolean;
  error?: string;
}

/**
 * Validates file extension, declared MIME type, and size limit.
 */
export function validateAttachmentFile(
  filename: string,
  mimeType: string,
  fileSize: number
): FileValidationResult {
  const ext = path.extname(filename).toLowerCase();

  if (!ALLOWED_EXTENSIONS.has(ext)) {
    return {
      valid: false,
      error: `File '${filename}' has an unsupported extension '${ext}'. Allowed extensions: .jpg, .jpeg, .png, .webp, .pdf.`,
    };
  }

  if (!ALLOWED_MIME_TYPES.has(mimeType.toLowerCase())) {
    return {
      valid: false,
      error: `File '${filename}' has an unsupported format/MIME type '${mimeType}'. Allowed formats: JPG, PNG, WEBP, PDF.`,
    };
  }

  if (fileSize > MAX_FILE_SIZE_BYTES) {
    return {
      valid: false,
      error: `File '${filename}' (${fileSize} bytes) exceeds the maximum allowed size of 5 MB (5,242,880 bytes).`,
    };
  }

  return { valid: true };
}

/**
 * Validates that adding incoming attachments will not exceed the 5 active attachments limit.
 */
export function validateAttachmentQuantity(
  currentCount: number,
  incomingCount: number
): FileValidationResult {
  if (currentCount + incomingCount > MAX_ACTIVE_ATTACHMENTS) {
    return {
      valid: false,
      error: `Total active attachments cannot exceed ${MAX_ACTIVE_ATTACHMENTS} files. Current: ${currentCount}, attempting to add: ${incomingCount}.`,
    };
  }
  return { valid: true };
}
