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
