import { test, expect } from "@playwright/test";
import { loginUser, captureLab04Screenshot, TEST_USERS } from "../helpers";

test.describe("Sprint 4 — Optimistic Concurrency & Conflict Recovery (Scenario 2)", () => {
  test.setTimeout(120000);

  test("SC-2: Concurrent dual-session updates trigger 409 Conflict banner and recover non-destructively", async ({
    browser,
  }) => {
    // -------------------------------------------------------------------------
    // Step 0: Create a fresh open ticket to guarantee clean concurrency testing
    // -------------------------------------------------------------------------
    const requesterContext = await browser.newContext({ viewport: { width: 1280, height: 800 } });
    const reqPage = await requesterContext.newPage();
    await loginUser(reqPage, TEST_USERS.REQUESTER_ACTIVE);

    await reqPage.locator('header button:has-text("+ Create Ticket")').click();
    await expect(reqPage.locator("h1")).toContainText(/Create Support Ticket/i);

    const ticketSummary = `Network switch port packet loss - ${Date.now()}`;
    await reqPage.locator("#category-select").selectOption({ label: "Network" });
    await reqPage.locator("#system-select").selectOption({ label: "VPN" });
    await reqPage.locator("#summary-input").fill(ticketSummary);
    await reqPage.locator("#description-textarea").fill("Experiencing intermittent packet drops and timeout errors on switch port 2.");
    await reqPage.locator('button[type="submit"]:has-text("Submit Ticket")').click();

    const ticketNumberDisplay = reqPage.locator('[data-testid="ticket-number-display"]');
    await expect(ticketNumberDisplay).toBeVisible({ timeout: 15000 });
    const ticketNumber = (await ticketNumberDisplay.innerText()).trim();

    await requesterContext.close();

    // -------------------------------------------------------------------------
    // Step 1: Initialize two independent staff sessions (Staff A & Staff B)
    // -------------------------------------------------------------------------
    const contextA = await browser.newContext({ viewport: { width: 1280, height: 800 } });
    const contextB = await browser.newContext({ viewport: { width: 1280, height: 800 } });

    const pageA = await contextA.newPage();
    const pageB = await contextB.newPage();

    // Staff A logs in
    await loginUser(pageA, TEST_USERS.STAFF_SOMPONG);
    await pageA.locator('header button[data-testid="nav-ticket-queue"]').click();
    await pageA.locator('[data-testid="queue-search-input"]').fill(ticketNumber);
    await pageA.waitForTimeout(400);
    await pageA.locator(`tr:has-text("${ticketNumber}")`).first().click();
    await expect(pageA.locator(`text=${ticketNumber}`).first()).toBeVisible({ timeout: 10000 });

    // Staff B logs in
    await loginUser(pageB, TEST_USERS.STAFF_WICHAI);
    await pageB.locator('header button[data-testid="nav-ticket-queue"]').click();
    await pageB.locator('[data-testid="queue-search-input"]').fill(ticketNumber);
    await pageB.waitForTimeout(400);
    await pageB.locator(`tr:has-text("${ticketNumber}")`).first().click();
    await expect(pageB.locator(`text=${ticketNumber}`).first()).toBeVisible({ timeout: 10000 });

    // Both sessions now hold the identical initial ticket state and updatedAt token T0

    // -------------------------------------------------------------------------
    // Step 2: In Staff B's session, draft an internal note
    // -------------------------------------------------------------------------
    const draftNoteContent = "Diagnostic log trace captured on port 2. Analyzing dropped frame packets — do not reboot switch.";
    const noteTextarea = pageB.locator("#staff-internal-note-input");
    await expect(noteTextarea).toBeVisible({ timeout: 10000 });
    await noteTextarea.fill(draftNoteContent);

    // -------------------------------------------------------------------------
    // Step 3: Staff A updates ticket status to IN_PROGRESS (advances updatedAt to T1)
    // -------------------------------------------------------------------------
    // Staff A claims ticket
    const claimBtnA = pageA.locator('button:has-text("Claim Ticket")');
    if (await claimBtnA.isVisible()) {
      await claimBtnA.click();
      await pageA.waitForTimeout(500);
    }

    const statusSelectA = pageA.locator('[data-testid="status-select"]');
    await statusSelectA.selectOption("IN_PROGRESS");
    await pageA.locator('[data-testid="update-status-btn"]').click();
    await expect(pageA.locator('[data-testid="header-status-badge"]')).toContainText(/in[ _]?progress/i, { timeout: 10000 });

    // -------------------------------------------------------------------------
    // Step 4: Staff B attempts a status transition with stale updatedAt token T0
    // -------------------------------------------------------------------------
    // Staff B selects OPEN or CANCELLED from their stale dropdown
    const statusSelectB = pageB.locator('[data-testid="status-select"]');
    // Staff B selects available transition from NEW (e.g. CANCELLED or OPEN)
    const options = await statusSelectB.locator("option").allInnerTexts();
    const targetOption = options.find((opt) => opt.includes("OPEN") || opt.includes("CANCELLED")) || "OPEN";
    await statusSelectB.selectOption({ label: targetOption.trim() });

    // Staff B submits transition
    await pageB.locator('[data-testid="update-status-btn"]').click();

    // -------------------------------------------------------------------------
    // Step 5: Assert HTTP 409 Conflict Banner appears and draft text is preserved
    // -------------------------------------------------------------------------
    const conflictBanner = pageB.locator('[data-testid="status-conflict-banner"]');
    await expect(conflictBanner).toBeVisible({ timeout: 10000 });
    await expect(conflictBanner).toContainText(/Conflict \(409\)/i);

    // Assert that Staff B's draft note content is completely preserved in the textarea!
    expect(await noteTextarea.inputValue()).toBe(draftNoteContent);

    await captureLab04Screenshot(pageB, "workflow-resolution", "concurrency-409-conflict.png");

    // -------------------------------------------------------------------------
    // Step 6: Staff B clicks "Refresh" button on conflict banner and recovers
    // -------------------------------------------------------------------------
    const refreshBtn = pageB.locator('[data-testid="refresh-ticket-state-btn"]');
    await expect(refreshBtn).toBeVisible();
    await refreshBtn.click();

    // Verify conflict banner dismisses
    await expect(conflictBanner).toHaveCount(0, { timeout: 10000 });

    // Verify Staff B's view is synchronized with Staff A's update (status is now In Progress)
    await expect(pageB.locator('[data-testid="header-status-badge"]')).toContainText(/in[ _]?progress/i, { timeout: 10000 });

    // Verify draft note content remains intact even after in-place ticket refresh
    expect(await noteTextarea.inputValue()).toBe(draftNoteContent);

    // Clean up contexts
    await contextA.close();
    await contextB.close();
  });
});
