import { test, expect } from "@playwright/test";
import path from "path";
import fs from "fs";

// Helper to ensure artifact screenshot directory exists
function ensureDir(dirPath: string) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

// Ensure screenshots target directory structure exists
const SCREENSHOTS_ROOT = path.resolve(process.cwd(), "artifacts/lab-02/screenshots");
ensureDir(path.join(SCREENSHOTS_ROOT, "create-ticket"));
ensureDir(path.join(SCREENSHOTS_ROOT, "my-tickets"));
ensureDir(path.join(SCREENSHOTS_ROOT, "ticket-detail"));

const sampleImagePath = path.resolve(process.cwd(), "e2e/fixtures/battery_diagnostic.png");
const samplePdfPath = path.resolve(process.cwd(), "e2e/fixtures/system_specs.pdf");

test.describe("Feature 10: Requester Ticket Flow & Multi-Viewport E2E Verification", () => {
  test.setTimeout(90000);

  test("completes end-to-end requester lifecycle, captures screenshots, and verifies isolation", async ({ page }) => {
    // -------------------------------------------------------------------------
    // Step 1: Select simulated Requester (Sompong IT) and confirm identity
    // -------------------------------------------------------------------------
    await page.goto("/");
    await page.waitForLoadState("networkidle");

    // Check if initial blocking selector or switch modal is open
    const modalSelector = page.locator('[data-testid="requester-select"], #requester-select');
    if (await modalSelector.isVisible()) {
      await modalSelector.selectOption({ label: "Sompong IT (sompong.it@kmutt.ac.th)" });
      await page.locator('button:has-text("Continue")').click();
    } else {
      // If persona already cached, verify or switch to Sompong IT
      const activeUser = page.locator('[data-testid="active-user-name"]');
      if ((await activeUser.innerText()).indexOf("Sompong IT") === -1) {
        await page.locator('button:has-text("Change")').click();
        await page.locator('#requester-select, [data-testid="requester-select"]').selectOption({
          label: "Sompong IT (sompong.it@kmutt.ac.th)",
        });
        await page.locator('button:has-text("Continue")').click();
      }
    }

    // Verify identity established in header
    await expect(page.locator('[data-testid="active-user-name"]')).toHaveText(/Sompong IT/);

    // -------------------------------------------------------------------------
    // Step 2: Click "+ Create Ticket", fill form, attach file, and submit
    // -------------------------------------------------------------------------
    await page.locator('button:has-text("+ Create Ticket")').first().click();
    await expect(page.locator("h1")).toContainText(/Create Support Ticket/i);

    // Fill form fields
    await page.locator("#category-select").selectOption({ label: "Hardware" });
    await page.locator("#system-select").selectOption({ label: "Corporate Laptop" });
    await page.locator("#priority-High").check();
    await page.locator("#summary-input").fill("Battery draining extremely fast under normal load");
    await page
      .locator("#description-textarea")
      .fill("The laptop battery drops from 100% to 15% within 40 minutes of normal office use.");

    // Attach valid file (battery_diagnostic.png)
    await page.locator("#attachment-input").setInputFiles(sampleImagePath);
    await expect(page.locator("text=battery_diagnostic.png")).toBeVisible();

    // Capture Create Ticket Screenshots across viewports
    // 1. Desktop (1280x800)
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.screenshot({
      path: path.join(SCREENSHOTS_ROOT, "create-ticket/desktop-form.png"),
      fullPage: true,
    });

    // 2. Tablet (768x1024)
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.screenshot({
      path: path.join(SCREENSHOTS_ROOT, "create-ticket/tablet-form.png"),
      fullPage: true,
    });

    // 3. Mobile (375x667)
    await page.setViewportSize({ width: 375, height: 667 });
    await page.screenshot({
      path: path.join(SCREENSHOTS_ROOT, "create-ticket/mobile-form.png"),
      fullPage: true,
    });

    // Reset to Desktop for submission
    await page.setViewportSize({ width: 1280, height: 800 });

    // Submit form and assert busy state
    const submitButton = page.locator('button:has-text("Submit Ticket")');
    await submitButton.click();

    // Assert official Ticket Number generated
    const ticketNumberDisplay = page.locator('[data-testid="ticket-number-display"]');
    await expect(ticketNumberDisplay).toBeVisible({ timeout: 15000 });
    const ticketNumber = (await ticketNumberDisplay.innerText()).trim();
    expect(ticketNumber).toMatch(/^TKT-\d{4}-\d{5}$/);

    // -------------------------------------------------------------------------
    // Step 3: Navigate to "My Tickets", verify metadata and search
    // -------------------------------------------------------------------------
    await page.locator('button:has-text("View in My Tickets")').click();
    await expect(page.locator("h1")).toContainText(/My Tickets/i);

    // Assert that the new ticket is visible in the list (using first to accommodate desktop + mobile DOM elements)
    await expect(page.locator(`text=${ticketNumber}`).first()).toBeVisible();
    await expect(page.locator("text=Battery draining extremely fast under normal load").first()).toBeVisible();

    // Exercise search input with debounced querying
    const searchInput = page.locator('input[aria-label="Search tickets"]');
    await searchInput.fill(ticketNumber);
    await page.waitForTimeout(400); // allow 300ms debounce
    await expect(page.locator(`text=${ticketNumber}`).first()).toBeVisible();

    // Clear search filter
    await searchInput.fill("");
    await page.waitForTimeout(400);

    // Capture My Tickets Screenshots across viewports
    // 1. Desktop (1280x800)
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.screenshot({
      path: path.join(SCREENSHOTS_ROOT, "my-tickets/desktop-table.png"),
      fullPage: true,
    });

    // 2. Tablet (768x1024)
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.screenshot({
      path: path.join(SCREENSHOTS_ROOT, "my-tickets/tablet-table.png"),
      fullPage: true,
    });

    // 3. Mobile (375x667)
    await page.setViewportSize({ width: 375, height: 667 });
    await page.screenshot({
      path: path.join(SCREENSHOTS_ROOT, "my-tickets/mobile-cards.png"),
      fullPage: true,
    });

    // Reset to Desktop
    await page.setViewportSize({ width: 1280, height: 800 });

    // -------------------------------------------------------------------------
    // Step 4: Click on new ticket to open "Ticket Detail" view
    // -------------------------------------------------------------------------
    await page.locator(`[data-testid="ticket-desktop-row"]`).filter({ hasText: ticketNumber }).click();
    await expect(page.locator(`.ticket-detail-view`).filter({ hasText: ticketNumber })).toBeVisible();
    await expect(page.locator("text=Unassigned")).toBeVisible();
    await expect(page.locator("text=battery_diagnostic.png")).toBeVisible();

    // Confirm read-only presentation (absence of comments/notes/status transition buttons)
    await expect(page.locator('button:has-text("Resolve Ticket")')).toHaveCount(0);
    await expect(page.locator('button:has-text("Close Ticket")')).toHaveCount(0);
    await expect(page.locator('textarea[placeholder*="comment" i]')).toHaveCount(0);

    // Capture Ticket Detail Desktop Active Screenshot
    await page.screenshot({
      path: path.join(SCREENSHOTS_ROOT, "ticket-detail/desktop-detail-active.png"),
      fullPage: true,
    });

    // -------------------------------------------------------------------------
    // Step 5: Upload 2nd file, download active file, and soft-remove
    // -------------------------------------------------------------------------
    // Upload 2nd attachment
    const addAttachmentInput = page.locator('input[aria-label="Upload attachment"], input[type="file"]').last();
    await addAttachmentInput.setInputFiles(samplePdfPath);
    await expect(page.locator('[data-testid^="attachment-row"]').filter({ hasText: "system_specs.pdf" })).toBeVisible();

    // Download active attachment stream assertion
    const downloadPromise = page.waitForEvent("download");
    await page.locator('[data-testid^="attachment-row"]').filter({ hasText: "battery_diagnostic.png" }).locator('button:has-text("Download")').click();
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toBeTruthy();

    // Trigger soft-removal modal on 2nd file
    await page.locator('[data-testid^="attachment-row"]').filter({ hasText: "system_specs.pdf" }).locator('button:has-text("Remove")').click();

    // Verify modal validation rules: reason must be >= 5 chars
    const modalConfirmBtn = page.locator('button:has-text("Remove Attachment")');
    await expect(modalConfirmBtn).toBeDisabled();

    const reasonInput = page.locator('textarea[placeholder*="explain why" i]');
    await reasonInput.fill("err");
    await expect(modalConfirmBtn).toBeDisabled();

    await reasonInput.fill("Uploaded wrong specification document");
    await expect(modalConfirmBtn).toBeEnabled();

    // Confirm soft-removal
    await modalConfirmBtn.click();

    // Assert soft-removed tombstone in removed section
    await expect(page.locator("text=Removed Attachments (Audit Log)")).toBeVisible();
    await expect(page.locator('[data-testid^="removed-attachment"]').filter({ hasText: "system_specs.pdf" })).toBeVisible();
    await expect(page.locator("text=Uploaded wrong specification document")).toBeVisible();

    // Capture Ticket Detail Screenshots (showing soft-removed metadata state)
    // 1. Desktop (1280x800)
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.screenshot({
      path: path.join(SCREENSHOTS_ROOT, "ticket-detail/desktop-detail-removed.png"),
      fullPage: true,
    });

    // 2. Tablet (768x1024)
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.screenshot({
      path: path.join(SCREENSHOTS_ROOT, "ticket-detail/tablet-detail.png"),
      fullPage: true,
    });

    // 3. Mobile (375x667)
    await page.setViewportSize({ width: 375, height: 667 });
    await page.screenshot({
      path: path.join(SCREENSHOTS_ROOT, "ticket-detail/mobile-detail.png"),
      fullPage: true,
    });

    // Reset to Desktop
    await page.setViewportSize({ width: 1280, height: 800 });

    // -------------------------------------------------------------------------
    // Step 6: Switch active Requester and assert strict requester isolation
    // -------------------------------------------------------------------------
    await page.locator('button:has-text("Change")').click();
    await page.locator('#requester-select, [data-testid="requester-select"]').selectOption({
      label: "Jennifer Anderson (jennifer.anderson@kmutt.ac.th)",
    });
    await page.locator('button:has-text("Continue")').click();

    // Verify persona switched
    await expect(page.locator('[data-testid="active-user-name"]')).toHaveText(/Jennifer Anderson/);

    // Navigate to My Tickets if not already there
    const myTicketsTab = page.locator('button:has-text("My Tickets")').first();
    await myTicketsTab.click();

    // Assert Sompong's ticket is NOT visible to Jennifer (strict multi-tenant isolation)
    await expect(page.locator(`text=${ticketNumber}`)).toHaveCount(0);
  });
});
