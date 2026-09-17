import { test, expect, Page } from "@playwright/test";
import path from "path";
import { SCREENSHOTS_ROOT, ensureDir, captureScreenshot, TEST_USERS } from "../helpers.js";

async function loginStaff(page: Page) {
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto("/");
  await page.waitForLoadState("networkidle");

  await page.locator("#email").fill(TEST_USERS.STAFF_SOMPONG.email);
  await page.locator("#password").fill(TEST_USERS.STAFF_SOMPONG.initialPassword);
  await page.locator('button[type="submit"]').click();

  // If initial password was already rotated previously, retry with rotated password
  const errorAlert = page.locator('[data-testid="login-error"]');
  if (await errorAlert.waitFor({ state: "visible", timeout: 2000 }).then(() => true).catch(() => false)) {
    await page.locator("#password").fill(TEST_USERS.STAFF_SOMPONG.rotatedPassword);
    await page.locator('button[type="submit"]').click();
  }

  // Handle first-login mandatory password change if prompted
  const changeHeading = page.locator("h1:has-text('Mandatory Password Change')");
  if (await changeHeading.waitFor({ state: "visible", timeout: 4000 }).then(() => true).catch(() => false)) {
    const newPass = TEST_USERS.STAFF_SOMPONG.rotatedPassword;
    await page.locator("#currentPassword").fill(TEST_USERS.STAFF_SOMPONG.initialPassword);
    await page.locator("#newPassword").fill(newPass);
    await page.locator("#confirmPassword").fill(newPass);
    await page.locator('button[type="submit"]:has-text("Update Password")').click();
    await expect(changeHeading).toHaveCount(0, { timeout: 15000 });
  }

  await expect(page.locator('[data-testid="active-user-name"]')).toContainText(TEST_USERS.STAFF_SOMPONG.name, { timeout: 15000 });
}

test.describe("Sprint 3 — IT Staff Ticket Queue, Detail & Confidentiality (E2E-02)", () => {
  test.setTimeout(120000);

  test.beforeAll(() => {
    ensureDir(path.join(SCREENSHOTS_ROOT, "staff-queue"));
    ensureDir(path.join(SCREENSHOTS_ROOT, "staff-ticket-detail"));
  });

  test("E2E-02.1: Staff Queue, Search, Filter, Sort, Viewports & Detail Operations", async ({ page }) => {
    // -------------------------------------------------------------------------
    // 0. Seed a fresh ticket from active requester to ensure deterministic queue state
    // -------------------------------------------------------------------------
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto("/");
    await page.waitForLoadState("networkidle");

    await page.locator("#email").fill(TEST_USERS.REQUESTER_ACTIVE.email);
    await page.locator("#password").fill(TEST_USERS.REQUESTER_ACTIVE.password);
    await page.locator('button[type="submit"]').click();
    await expect(page.locator('[data-testid="active-user-name"]')).toContainText(TEST_USERS.REQUESTER_ACTIVE.name, { timeout: 15000 });

    // Create a new support ticket
    await page.locator('header button:has-text("+ Create Ticket")').click();
    await expect(page.locator("h1")).toContainText(/Create Support Ticket/i);

    const ticketSummary = `Network latency spike in Building 4 - ${Date.now()}`;
    await page.locator("#category-select").selectOption({ label: "Network" });
    await page.locator("#system-select").selectOption({ label: "VPN" });
    await page.locator("#summary-input").fill(ticketSummary);
    await page.locator("#description-textarea").fill("High ping times and packet loss observed on 3rd floor switch.");
    await page.locator('button:has-text("Submit Ticket")').click();
    await expect(page.locator('[data-testid="ticket-number-display"]')).toBeVisible({ timeout: 15000 });

    // Log out requester
    await page.locator('[data-testid="logout-button"]').click();
    await expect(page.locator("#email")).toBeVisible({ timeout: 10000 });

    // -------------------------------------------------------------------------
    // 1. Authenticate as IT Staff (Sompong IT)
    // -------------------------------------------------------------------------
    await loginStaff(page);

    const roleBadge = page.locator('[data-testid="user-role-badge"]');
    await expect(roleBadge).toBeVisible();
    await expect(roleBadge).toHaveText("IT Staff");

    // Verify Ticket Queue is the active default view
    await expect(page.locator("h2")).toContainText(/IT Staff Ticket Queue/i);

    // -------------------------------------------------------------------------
    // 2. Queue Responsive Viewports & Zero Overflow Verification
    // -------------------------------------------------------------------------
    // Desktop (1280x800)
    await page.setViewportSize({ width: 1280, height: 800 });
    await captureScreenshot(page, "staff-queue", "desktop-queue.png");
    let hasOverflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
    expect(hasOverflow).toBe(false);

    // Tablet (768x1024)
    await page.setViewportSize({ width: 768, height: 1024 });
    await captureScreenshot(page, "staff-queue", "tablet-queue.png");
    hasOverflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
    expect(hasOverflow).toBe(false);

    // Mobile (375x667)
    await page.setViewportSize({ width: 375, height: 667 });
    await captureScreenshot(page, "staff-queue", "mobile-queue.png");
    hasOverflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
    expect(hasOverflow).toBe(false);

    // Reset to Desktop
    await page.setViewportSize({ width: 1280, height: 800 });

    // -------------------------------------------------------------------------
    // 3. Search, Filter & Empty State Verification
    // -------------------------------------------------------------------------
    const searchInput = page.locator('[data-testid="queue-search-input"]');
    await searchInput.fill("latency spike");
    await page.waitForTimeout(400); // await debounce
    await expect(page.locator('[data-testid="staff-queue-table"]')).toContainText("latency spike");
    await captureScreenshot(page, "staff-queue", "search-filter-active.png");

    // Test No-Results State
    await searchInput.fill("NonExistentSearchTokenXYZ999");
    await page.waitForTimeout(400);
    const noResultsCard = page.locator('[data-testid="queue-no-results"]');
    await expect(noResultsCard).toBeVisible({ timeout: 5000 });
    await captureScreenshot(page, "staff-queue", "no-results-state.png");

    // Reset search via Clear CTA
    await page.locator('[data-testid="queue-clear-filters-cta"]').click();
    await expect(page.locator('[data-testid="staff-queue-table"]')).toBeVisible({ timeout: 5000 });

    // Sort verification: toggle Ticket #
    await page.locator('[data-testid="sort-ticketNumber"]').click();
    await page.waitForTimeout(300);

    // -------------------------------------------------------------------------
    // 4. Ticket Detail Inspection & Ownership Claiming
    // -------------------------------------------------------------------------
    // Find the newly created ticket or click first row
    await searchInput.fill(ticketSummary);
    await page.waitForTimeout(400);
    const targetRow = page.locator('[data-testid^="queue-row-"]').first();
    await expect(targetRow).toBeVisible({ timeout: 5000 });
    await targetRow.click();

    // Verify Detail view loaded
    await expect(page.locator("h1.h5")).toBeVisible({ timeout: 10000 });
    await expect(page.locator("text=Operational Controls")).toBeVisible();

    // Desktop view capture
    await page.setViewportSize({ width: 1280, height: 800 });
    await captureScreenshot(page, "staff-ticket-detail", "desktop-ticket-detail.png");
    hasOverflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
    expect(hasOverflow).toBe(false);

    // Tablet view capture
    await page.setViewportSize({ width: 768, height: 1024 });
    await captureScreenshot(page, "staff-ticket-detail", "tablet-ticket-detail.png");
    hasOverflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
    expect(hasOverflow).toBe(false);

    // Mobile view capture
    await page.setViewportSize({ width: 375, height: 667 });
    await captureScreenshot(page, "staff-ticket-detail", "mobile-ticket-detail.png");
    hasOverflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
    expect(hasOverflow).toBe(false);

    // Reset to Desktop
    await page.setViewportSize({ width: 1280, height: 800 });

    // Claim ticket ownership (if not already claimed)
    const claimButton = page.locator('button:has-text("Claim Ticket")');
    if (await claimButton.isVisible()) {
      await claimButton.click();
      await expect(page.locator('button:has-text("Assigned to You")')).toBeVisible({ timeout: 10000 });
    }
    await captureScreenshot(page, "staff-ticket-detail", "claimed-ticket-state.png");

    // -------------------------------------------------------------------------
    // 5. IT Priority & Status Workflow Transition
    // -------------------------------------------------------------------------
    const prioritySelect = page.locator("#staff-priority-select");
    if (await prioritySelect.isVisible()) {
      await prioritySelect.selectOption("URGENT");
      await page.waitForTimeout(500);
    }

    // Status transition dropdown
    const statusSelect = page.locator("#staff-status-select");
    if (await statusSelect.isVisible()) {
      await captureScreenshot(page, "staff-ticket-detail", "status-transition-dropdown.png");
      const options = await statusSelect.locator("option").allInnerTexts();
      const validTarget = options.find((opt) => opt.includes("IN PROGRESS") || opt.includes("OPEN") || opt.includes("WAITING"));
      if (validTarget) {
        await statusSelect.selectOption({ label: validTarget });
        await page.locator('button:has-text("Update Status")').click();
        await page.waitForTimeout(800);
      }
    }

    // -------------------------------------------------------------------------
    // 6. Public Comment & Confidential Internal Note Posting
    // -------------------------------------------------------------------------
    // Post Public Comment
    const commentInput = page.locator("#staff-public-comment-input");
    await commentInput.fill("Diagnostic initiated by IT Staff. Please ensure the machine remains connected.");
    await page.locator('button[type="submit"]:has-text("Post Public Comment")').click();
    await expect(page.locator("text=Diagnostic initiated by IT Staff")).toBeVisible({ timeout: 10000 });
    await captureScreenshot(page, "staff-ticket-detail", "public-comment-posted.png");

    // Post Confidential Internal Note (amber styling, 🔒 lock icon)
    const noteInput = page.locator("#staff-internal-note-input");
    await noteInput.fill("Confidential staff note: Checked switch port 14 buffer overflows. Cable replacement scheduled.");
    await page.locator('button[type="submit"]:has-text("Post Internal Note")').click();
    await expect(page.locator("text=Cable replacement scheduled")).toBeVisible({ timeout: 10000 });
    await captureScreenshot(page, "staff-ticket-detail", "confidential-internal-notes.png");

    // -------------------------------------------------------------------------
    // 7. Requester View & Problem Appears Resolved Flow (BR-04, BR-05, BR-12)
    // -------------------------------------------------------------------------
    // Log out Sompong IT
    await page.locator('[data-testid="logout-button"]').click();
    await expect(page.locator("#email")).toBeVisible({ timeout: 10000 });

    // Log in as active requester (Test Requester)
    await page.locator("#email").fill(TEST_USERS.REQUESTER_ACTIVE.email);
    await page.locator("#password").fill(TEST_USERS.REQUESTER_ACTIVE.password);
    await page.locator('button[type="submit"]').click();
    await expect(page.locator('[data-testid="active-user-name"]')).toContainText(TEST_USERS.REQUESTER_ACTIVE.name, { timeout: 15000 });

    // Open newly created ticket in My Tickets
    await page.locator(`text=${ticketSummary}`).first().click();

    // Assert Public Comment is present
    await expect(page.locator("text=Diagnostic initiated by IT Staff")).toBeVisible({ timeout: 10000 });

    // Assert Internal Notes section is COMPLETELY ABSENT from Requester DOM
    await expect(page.locator("#staff-internal-note-input")).toHaveCount(0);
    await expect(page.locator("text=Confidential Internal Notes")).toHaveCount(0);
    await expect(page.locator("text=INTERNAL ONLY")).toHaveCount(0);
    await expect(page.locator("text=Cable replacement scheduled")).toHaveCount(0);

    // Click "Problem Appears Resolved" button
    const resolveButton = page.locator('button:has-text("Problem Appears Resolved")');
    if (await resolveButton.isVisible()) {
      await resolveButton.click();
      await expect(page.locator("text=Problem Appears Resolved:")).toBeVisible({ timeout: 10000 });
      await captureScreenshot(page, "staff-ticket-detail", "requester-resolution-indicator.png");
    }

    // -------------------------------------------------------------------------
    // 8. IT Staff Resolution Confirmation Banner Verification
    // -------------------------------------------------------------------------
    // Log out Requester
    await page.locator('[data-testid="logout-button"]').click();
    await expect(page.locator("#email")).toBeVisible({ timeout: 10000 });

    // Log in as Sompong IT again
    await loginStaff(page);

    // Open the ticket from queue
    await searchInput.fill(ticketSummary);
    await page.waitForTimeout(400);
    await page.locator('[data-testid^="queue-row-"]').first().click();

    // Verify Requester Confirmed Resolution banner is prominently displayed
    await expect(page.locator("text=Requester Confirmed Resolution")).toBeVisible({ timeout: 10000 });

    // Final clean up: logout
    await page.locator('[data-testid="logout-button"]').click();
    await expect(page.locator("#email")).toBeVisible({ timeout: 10000 });
  });
});
