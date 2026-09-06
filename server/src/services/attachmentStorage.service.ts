import fs from "fs";
import path from "path";
import crypto from "crypto";

// Default upload directory: server/uploads/attachments
const DEFAULT_STORAGE_DIR = path.resolve(process.cwd(), "uploads", "attachments");
const STORAGE_DIR = process.env.ATTACHMENT_STORAGE_DIR || DEFAULT_STORAGE_DIR;

export async function ensureStorageDirectory(): Promise<string> {
  await fs.promises.mkdir(STORAGE_DIR, { recursive: true });
  return STORAGE_DIR;
}

export async function saveAttachmentFile(
  originalFilename: string,
  buffer: Buffer
): Promise<{ storedFilename: string; filePath: string }> {
  await ensureStorageDirectory();
  const ext = path.extname(originalFilename).toLowerCase();
  const storedFilename = `${crypto.randomUUID()}${ext}`;
  const filePath = path.join(STORAGE_DIR, storedFilename);

  await fs.promises.writeFile(filePath, buffer);
  return { storedFilename, filePath };
}

export function getAttachmentFilePath(storedFilename: string): string {
  return path.join(STORAGE_DIR, storedFilename);
}

export async function attachmentFileExists(storedFilename: string): Promise<boolean> {
  const filePath = getAttachmentFilePath(storedFilename);
  try {
    await fs.promises.access(filePath, fs.constants.F_OK);
    return true;
  } catch {
    return false;
  }
}

export async function deleteAttachmentFile(storedFilename: string): Promise<boolean> {
  const filePath = getAttachmentFilePath(storedFilename);
  try {
    await fs.promises.unlink(filePath);
    return true;
  } catch (err: any) {
    if (err.code === "ENOENT") {
      return false; // File already deleted or does not exist
    }
    console.error(`Failed to delete physical attachment file: ${filePath}`, err);
    throw err;
  }
}
