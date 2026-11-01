import { Page, expect } from "@playwright/test";
import path from "path";
import fs from "fs";

export const SCREENSHOTS_ROOT = path.resolve(process.cwd(), "artifacts/lab-03/screenshots");
export const LAB04_SCREENSHOTS_ROOT = path.resolve(process.cwd(), "artifacts/lab-04/screenshots");

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

export async function captureLab04Screenshot(
  page: Page,
  subfolder: "actions-taken" | "requester-dashboard" | "staff-dashboard" | "workflow-resolution" | "responsive",
  filename: string
): Promise<string> {
  const dir = path.join(LAB04_SCREENSHOTS_ROOT, subfolder);
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

/**
 * Reusable login helper that handles both standard accounts and accounts
 * requiring first-login password rotation.
 */
export async function loginUser(
  page: Page,
  user: {
    email: string;
    password?: string;
    initialPassword?: string;
    rotatedPassword?: string;
    name: string;
  }
): Promise<void> {
  await page.goto("/");
  await page.waitForLoadState("networkidle");

  const pwd = user.initialPassword || user.password || "Password123!";
  await page.locator("#email").fill(user.email);
  await page.locator("#password").fill(pwd);
  await page.locator('button[type="submit"]').click();

  // If initial password was already rotated in a previous run, retry with rotated password
  const errorAlert = page.locator('[data-testid="login-error"]');
  if (user.rotatedPassword && (await errorAlert.waitFor({ state: "visible", timeout: 1500 }).then(() => true).catch(() => false))) {
    await page.locator("#password").fill(user.rotatedPassword);
    await page.locator('button[type="submit"]').click();
  }

  // Handle first-login mandatory password change if prompted
  const changeHeading = page.locator("h1:has-text('Mandatory Password Change')");
  if (user.rotatedPassword && (await changeHeading.waitFor({ state: "visible", timeout: 2500 }).then(() => true).catch(() => false))) {
    const newPass = user.rotatedPassword;
    await page.locator("#currentPassword").fill(user.initialPassword || "Password123!");
    await page.locator("#newPassword").fill(newPass);
    await page.locator("#confirmPassword").fill(newPass);
    await page.locator('button[type="submit"]:has-text("Update Password")').click();
    await expect(changeHeading).toHaveCount(0, { timeout: 15000 });
  }

  // Verify successful authentication
  await expect(page.locator('[data-testid="active-user-name"]')).toContainText(user.name, { timeout: 15000 });
}

export async function logoutUser(page: Page): Promise<void> {
  const logoutBtn = page.locator('[data-testid="logout-button"]');
  if (await logoutBtn.isVisible()) {
    await logoutBtn.click();
    await expect(page.locator("#email")).toBeVisible({ timeout: 10000 });
  }
}
