import { Page } from "@playwright/test";
import path from "path";
import fs from "fs";

export const SCREENSHOTS_ROOT = path.resolve(process.cwd(), "artifacts/lab-03/screenshots");

export function ensureDir(dirPath: string): void {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

export async function captureScreenshot(page: Page, subfolder: string, filename: string): Promise<string> {
  const dir = path.join(SCREENSHOTS_ROOT, subfolder);
  ensureDir(dir);
  const targetPath = path.join(dir, filename);
  await page.screenshot({ path: targetPath, fullPage: true });
  return targetPath;
}

// Common user test identities from USERS_SEED
export const TEST_USERS = {
  ADMIN: {
    email: "admin@kmutt.ac.th",
    initialPassword: "Password123!",
    rotatedPassword: "AdminPassword2026!",
    name: "System Administrator",
    role: "ADMINISTRATOR",
  },
  STAFF_SOMPONG: {
    email: "sompong.it@kmutt.ac.th",
    initialPassword: "Password123!",
    rotatedPassword: "SompongPassword2026!",
    name: "Sompong IT",
    role: "IT_STAFF",
  },
  STAFF_WICHAI: {
    email: "wichai.sup@kmutt.ac.th",
    initialPassword: "Password123!",
    rotatedPassword: "WichaiPassword2026!",
    name: "Wichai Support",
    role: "IT_STAFF",
  },
  REQUESTER_SARAH: {
    email: "sarah.johnson@kmutt.ac.th",
    initialPassword: "Password123!",
    rotatedPassword: "SarahPassword2026!",
    name: "Sarah Johnson",
    role: "REQUESTER",
  },
  REQUESTER_ACTIVE: {
    email: "test.requester@kmutt.ac.th",
    password: "Password123!",
    name: "Test Active Requester",
    role: "REQUESTER",
  },
  INACTIVE_USER: {
    email: "inactive.user@kmutt.ac.th",
    password: "Password123!",
    name: "Prasert Inactive",
    role: "REQUESTER",
  },
};
