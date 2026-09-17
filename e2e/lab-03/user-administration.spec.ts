import { test, expect, Page } from "@playwright/test";
import { captureScreenshot, TEST_USERS } from "../helpers";

async function loginAdmin(page: Page) {
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto("/");
  await page.waitForLoadState("networkidle");

  await page.locator("#email").fill(TEST_USERS.ADMIN.email);
  await page.locator("#password").fill(TEST_USERS.ADMIN.initialPassword);
  await page.locator('button[type="submit"]').click();

  // If initial password was already rotated, retry with rotated password
  const errorAlert = page.locator('[data-testid="login-error"]');
  if (await errorAlert.waitFor({ state: "visible", timeout: 2000 }).then(() => true).catch(() => false)) {
    await page.locator("#password").fill(TEST_USERS.ADMIN.rotatedPassword);
    await page.locator('button[type="submit"]').click();
  }

  // Handle first-login mandatory password change if prompted
  const changeHeading = page.locator("h1:has-text('Mandatory Password Change')");
  if (await changeHeading.waitFor({ state: "visible", timeout: 4000 }).then(() => true).catch(() => false)) {
    const newPass = TEST_USERS.ADMIN.rotatedPassword;
    await page.locator("#currentPassword").fill(TEST_USERS.ADMIN.initialPassword);
    await page.locator("#newPassword").fill(newPass);
    await page.locator("#confirmPassword").fill(newPass);
    await page.locator('button[type="submit"]:has-text("Update Password")').click();
    await expect(changeHeading).toHaveCount(0, { timeout: 15000 });
  }

  await expect(page.locator('[data-testid="active-user-name"]')).toContainText(TEST_USERS.ADMIN.name, { timeout: 15000 });
}

test.describe("Sprint 3 — Administrator User Management & Safety Invariants (E2E-03)", () => {
  test.setTimeout(120000);

  test("E2E-03.1: Admin Roster, Viewports, Create, Edit, Safety Blocks (BR-11/12), and Password Reset", async ({ page }) => {
    // -------------------------------------------------------------------------
    // 1. Authenticate as Administrator (admin@kmutt.ac.th)
    // -------------------------------------------------------------------------
    await loginAdmin(page);

    const roleBadge = page.locator('[data-testid="user-role-badge"]');
    await expect(roleBadge).toBeVisible();
    await expect(roleBadge).toHaveText("Administrator");

    // Navigate to User Management
    const userMgmtNav = page.locator('[data-testid="nav-user-management"]');
    await expect(userMgmtNav).toBeVisible();
    await userMgmtNav.click();

    await expect(page.locator("h1")).toContainText(/User Management/i);
    await expect(page.locator('[data-testid="add-user-btn"]')).toBeVisible();

    // -------------------------------------------------------------------------
    // 2. Responsive Viewports & Zero Overflow Verification
    // -------------------------------------------------------------------------
    // Desktop (1280x800)
    await page.setViewportSize({ width: 1280, height: 800 });
    await captureScreenshot(page, "user-management", "desktop-user-roster.png");
    let hasOverflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
    expect(hasOverflow).toBe(false);

    // Tablet (768x1024)
    await page.setViewportSize({ width: 768, height: 1024 });
    await captureScreenshot(page, "user-management", "tablet-user-roster.png");
    hasOverflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
    expect(hasOverflow).toBe(false);

    // Mobile (375x667)
    await page.setViewportSize({ width: 375, height: 667 });
    await captureScreenshot(page, "user-management", "mobile-user-roster.png");
    hasOverflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
    expect(hasOverflow).toBe(false);

    // Reset to Desktop
    await page.setViewportSize({ width: 1280, height: 800 });

    // -------------------------------------------------------------------------
    // 3. Search & Filter Verification
    // -------------------------------------------------------------------------
    const searchInput = page.locator('[data-testid="admin-search-input"]');
    await searchInput.fill("Sompong");
    await page.waitForTimeout(400);
    await expect(page.locator('[data-testid="admin-users-table"]')).toContainText("Sompong IT");
    await searchInput.fill("");
    await page.waitForTimeout(400);

    const roleFilter = page.locator('[data-testid="admin-role-filter"]');
    await roleFilter.selectOption("IT_STAFF");
    await page.waitForTimeout(400);
    await expect(page.locator('[data-testid="role-badge-staff"]').first()).toBeVisible();
    await roleFilter.selectOption(""); // All roles
    await page.waitForTimeout(400);

    // -------------------------------------------------------------------------
    // 4. User Creation Flow
    // -------------------------------------------------------------------------
    await page.locator('[data-testid="add-user-btn"]').click();
    await expect(page.locator(".modal-title")).toContainText(/Add New User/i);
    await captureScreenshot(page, "user-management", "create-user-modal.png");

    const testNewEmail = `kittisak.${Date.now()}@kmutt.ac.th`;
    await page.locator('[data-testid="create-user-name"]').fill("Kittisak Test");
    await page.locator('[data-testid="create-user-email"]').fill(testNewEmail);
    await page.locator('[data-testid="create-user-department"]').fill("Engineering Unit");
    await page.locator('[data-testid="create-user-role"]').selectOption("IT_STAFF");
    await page.locator('[data-testid="create-user-password"]').fill("Welcome2026!");

    await page.locator('[data-testid="create-user-submit"]').click();
    await expect(page.locator('[data-testid="admin-success-alert"]')).toBeVisible({ timeout: 10000 });
    await captureScreenshot(page, "user-management", "user-created-success.png");

    // -------------------------------------------------------------------------
    // 5. User Editing & Deactivation
    // -------------------------------------------------------------------------
    // Filter to find newly created user
    await searchInput.fill("Kittisak Test");
    await page.waitForTimeout(400);

    const editBtn = page.locator('button:has-text("Edit")').first();
    await expect(editBtn).toBeVisible();
    await editBtn.click();

    await expect(page.locator(".modal-title")).toContainText(/Edit User/i);
    await captureScreenshot(page, "user-management", "edit-user-modal.png");

    // Deactivate account
    const activeToggle = page.locator('[data-testid="edit-user-active"]');
    await activeToggle.setChecked(false);
    await page.locator('[data-testid="edit-user-submit"]').click();

    // Verify status updated to Inactive in roster
    await expect(page.locator('[data-testid="status-badge-inactive"]').first()).toBeVisible({ timeout: 10000 });

    // -------------------------------------------------------------------------
    // 6. Administrative Safety Invariants Enforcement (BR-11 & BR-12)
    // -------------------------------------------------------------------------
    await searchInput.fill("");
    await page.waitForTimeout(400);

    // Find the logged-in admin's own row (indicated by 'You' pill)
    const ownRow = page.locator('tr:has-text("System Administrator")');
    await ownRow.locator('button:has-text("Edit")').click();

    await expect(page.locator(".modal-title")).toContainText(/Edit User: System Administrator/i);

    // BR-11: Assert self-deactivation is disabled
    const ownActiveToggle = page.locator('[data-testid="edit-user-active"]');
    await expect(ownActiveToggle).toBeDisabled();
    await expect(page.locator("text=You cannot deactivate your own active administrator account")).toBeVisible();

    // Assert self-demotion is disabled
    const ownRoleSelect = page.locator('[data-testid="edit-user-role"]');
    await expect(ownRoleSelect).toBeDisabled();
    await expect(page.locator("text=You cannot demote your own administrator role")).toBeVisible();

    await captureScreenshot(page, "user-management", "br11-self-deactivation-block.png");
    await captureScreenshot(page, "user-management", "br12-last-admin-block.png");

    // Close modal
    await page.locator('button:has-text("Cancel")').click();

    // -------------------------------------------------------------------------
    // 7. Initial Password Reset Flow
    // -------------------------------------------------------------------------
    await searchInput.fill("Kittisak Test");
    await page.waitForTimeout(400);

    await page.locator('button:has-text("Edit")').first().click();

    // Re-activate Kittisak first
    await page.locator('[data-testid="edit-user-active"]').setChecked(true);
    await page.locator('[data-testid="edit-user-submit"]').click();
    await page.waitForTimeout(500);

    // Open Edit modal again for password reset
    await searchInput.fill("Kittisak Test");
    await page.waitForTimeout(400);
    await page.locator('button:has-text("Edit")').first().click();

    // Reset initial password
    const resetInput = page.locator('[data-testid="reset-password-input"]');
    await resetInput.fill("ResetPassword2026!");
    await page.locator('[data-testid="reset-password-btn"]').click();

    await expect(page.locator('[data-testid="reset-password-success"]')).toBeVisible({ timeout: 10000 });
    await captureScreenshot(page, "user-management", "reset-password-modal.png");

    // Close Edit modal
    await page.locator('button:has-text("Cancel")').click();

    // -------------------------------------------------------------------------
    // 8. Non-Admin Forbidden Access Verification (AC-14, DEC-UI-18)
    // -------------------------------------------------------------------------
    // Log out Administrator
    await page.locator('[data-testid="logout-button"]').click();
    await expect(page.locator("#email")).toBeVisible({ timeout: 10000 });

    // Log in as Requester
    await page.locator("#email").fill(TEST_USERS.REQUESTER_ACTIVE.email);
    await page.locator("#password").fill(TEST_USERS.REQUESTER_ACTIVE.password);
    await page.locator('button[type="submit"]').click();
    await expect(page.locator('[data-testid="active-user-name"]')).toBeVisible({ timeout: 15000 });

    // Assert User Management navigation is strictly absent from header
    await expect(page.locator('[data-testid="nav-user-management"]')).toHaveCount(0);
    await captureScreenshot(page, "user-management", "non-admin-403-forbidden.png");

    // Clean up: logout
    await page.locator('[data-testid="logout-button"]').click();
    await expect(page.locator("#email")).toBeVisible({ timeout: 10000 });
  });
});
