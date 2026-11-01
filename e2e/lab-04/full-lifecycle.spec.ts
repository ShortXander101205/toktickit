import { test, expect } from "@playwright/test";
import { loginUser, logoutUser, captureLab04Screenshot, TEST_USERS } from "../helpers";

test.describe("Sprint 4 — Full Ticket Lifecycle & Resolution Gate (Scenario 1)", () => {
  test.setTimeout(120000);

  test("SC-1: Complete multi-role journey from intake through resolution gate block, action logging, resolution, advisory confirm, and closure", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1280, height: 800 });

    // -------------------------------------------------------------------------
    // Step 1: Requester submits a new service desk ticket
    // -------------------------------------------------------------------------
    await loginUser(page, TEST_USERS.REQUESTER_ACTIVE);

    // Open ticket creation interface
    const createNavBtn = page.locator('header button:has-text("+ Create Ticket")');
    await expect(createNavBtn).toBeVisible({ timeout: 15000 });
    await createNavBtn.click();
    await expect(page.locator("h1")).toContainText(/Create Support Ticket/i);

    const ticketSummary = `Workstation thermal throttling under heavy load - ${Date.now()}`;
    await page.locator("#category-select").selectOption({ label: "Hardware" });
    await page.locator("#system-select").selectOption({ label: "Corporate Laptop" });
    await page.locator("#summary-input").fill(ticketSummary);
    await page.locator("#description-textarea").fill("Chassis fans spinning at 100% RPM continuously and thermal throttling observed during simulation runs.");
    await page.locator('button[type="submit"]:has-text("Submit Ticket")').click();

    // Verify ticket creation success and capture ticket number
    const ticketNumberDisplay = page.locator('[data-testid="ticket-number-display"]');
    await expect(ticketNumberDisplay).toBeVisible({ timeout: 15000 });
    const ticketNumber = (await ticketNumberDisplay.innerText()).trim();
    expect(ticketNumber).toMatch(/^TKT-2026-\d{5}$/);

    await captureLab04Screenshot(page, "workflow-resolution", "01-ticket-created.png");

    // Requester logs out
    await logoutUser(page);

    // -------------------------------------------------------------------------
    // Step 2: IT Staff claims ticket, sets Priority = HIGH, and moves to IN_PROGRESS
    // -------------------------------------------------------------------------
    await loginUser(page, TEST_USERS.STAFF_SOMPONG);

    // Navigate to Staff Ticket Queue
    const queueNavBtn = page.locator('header button[data-testid="nav-ticket-queue"]');
    await expect(queueNavBtn).toBeVisible({ timeout: 15000 });
    await queueNavBtn.click();
    await expect(page.locator("h2")).toContainText(/IT Staff Ticket Queue/i);

    // Search and locate newly created ticket in queue
    const searchInput = page.locator('[data-testid="queue-search-input"]');
    await searchInput.fill(ticketNumber);
    await page.waitForTimeout(400); // debounce

    const ticketRow = page.locator(`tr:has-text("${ticketNumber}")`).first();
    await expect(ticketRow).toBeVisible({ timeout: 15000 });
    await ticketRow.click();

    // Verify Staff Ticket Detail view loaded
    await expect(page.locator(`text=${ticketNumber}`).first()).toBeVisible({ timeout: 10000 });
    await expect(page.locator('[data-testid="header-status-badge"]')).toContainText(/New/i);

    // Claim ticket ownership if not assigned
    const claimBtn = page.locator('button:has-text("Claim Ticket")');
    if (await claimBtn.isVisible()) {
      await claimBtn.click();
      await expect(page.locator('button:has-text("Assigned to You")')).toBeVisible({ timeout: 10000 });
    }

    // Set IT Priority to High
    const prioritySelect = page.locator("#staff-priority-select");
    await prioritySelect.selectOption("HIGH");
    await page.waitForTimeout(500);

    // Transition status to IN_PROGRESS
    const statusSelect = page.locator('[data-testid="status-select"]');
    await statusSelect.selectOption("IN_PROGRESS");
    await page.locator('[data-testid="update-status-btn"]').click();

    // Verify status updated to In Progress
    await expect(page.locator('[data-testid="header-status-badge"]')).toContainText(/in[ _]?progress/i, { timeout: 10000 });

    // -------------------------------------------------------------------------
    // Step 3: Attempt premature resolution (0 Actions Taken) -> Blocked by Resolution Gate
    // -------------------------------------------------------------------------
    await statusSelect.selectOption("RESOLVED");

    // Assert UI Resolution Gate warning alert appears immediately
    const gateAlert = page.locator('[data-testid="resolution-gate-alert"]');
    await expect(gateAlert).toBeVisible({ timeout: 5000 });
    await expect(gateAlert).toContainText(/Cannot resolve ticket without at least one recorded Action Taken/i);

    // Click Update Status anyway to verify backend rejection (HTTP 400 Bad Request)
    await page.locator('[data-testid="update-status-btn"]').click();
    await page.waitForTimeout(600);

    // Verify status remains In Progress and alert persists
    await expect(page.locator('[data-testid="header-status-badge"]')).toContainText(/in[ _]?progress/i);
    await expect(gateAlert).toBeVisible();

    await captureLab04Screenshot(page, "workflow-resolution", "02-resolution-gate-blocked.png");

    // -------------------------------------------------------------------------
    // Step 4: Record technical work via Action Taken with follow-up required
    // -------------------------------------------------------------------------
    const addActionBtn = page.locator('button:has-text("+ Add Action")');
    await expect(addActionBtn).toBeVisible({ timeout: 10000 });
    await addActionBtn.click();

    // Verify Create Action form container is displayed
    const actionForm = page.locator('[data-testid="actions-taken-form"]');
    await expect(actionForm).toBeVisible({ timeout: 10000 });

    await captureLab04Screenshot(page, "actions-taken", "actions-taken-modal.png");

    // Fill Action Taken fields
    await page.locator("#action-description").fill("Disassembled cooling assembly, cleaned exhaust vents with compressed air, and reapplied Arctic MX-4 thermal paste.");
    await page.locator("#action-result").fill("Idle temperatures dropped from 85C to 41C. Stress test peak temperature stable at 68C.");

    // Check Follow-Up Required
    const followUpCheckbox = page.locator("#action-followup-required");
    await followUpCheckbox.check();

    // Verify conditional follow-up note field expanded and fill note
    const followUpNoteField = page.locator("#action-followup-note");
    await expect(followUpNoteField).toBeVisible({ timeout: 5000 });
    await followUpNoteField.fill("Perform 48-hour continuous thermal logging benchmark under simulation load next Monday.");

    // Submit Action Taken
    await page.locator('button[type="submit"]:has-text("Save Action")').click();

    // Assert action item appears in Actions Taken list with No. 1 and auto-performer badge
    const actionItem = page.locator('[data-testid="actions-taken-section"]').locator('.at-row-card, tr[data-testid*="action-row"]').first();
    await expect(actionItem).toBeVisible({ timeout: 15000 });
    await expect(actionItem).toContainText(/Sompong IT/i);
    await expect(actionItem).toContainText(/Follow-up required/i);

    await captureLab04Screenshot(page, "actions-taken", "actions-taken-desktop.png");

    // -------------------------------------------------------------------------
    // Step 5: Transition ticket to RESOLVED (Resolution Gate now unblocked)
    // -------------------------------------------------------------------------
    await statusSelect.selectOption("RESOLVED");
    // Assert gate alert is no longer blocking
    await expect(gateAlert).toHaveCount(0);

    await page.locator('[data-testid="update-status-btn"]').click();
    await expect(page.locator('[data-testid="header-status-badge"]')).toContainText(/Resolved/i, { timeout: 10000 });

    await captureLab04Screenshot(page, "workflow-resolution", "03-ticket-resolved.png");

    // IT Staff logs out
    await logoutUser(page);

    // -------------------------------------------------------------------------
    // Step 6: Requester inspects ticket, verifies read-only actions & marks advisory resolved
    // -------------------------------------------------------------------------
    await loginUser(page, TEST_USERS.REQUESTER_ACTIVE);

    // Navigate to My Tickets and select newly resolved ticket
    const myTicketsNav = page.locator('header button:has-text("My Tickets")');
    await expect(myTicketsNav).toBeVisible({ timeout: 15000 });
    await myTicketsNav.click();

    const myTicketRow = page.locator(`tr:has-text("${ticketNumber}")`).first();
    await expect(myTicketRow).toBeVisible({ timeout: 15000 });
    await myTicketRow.click();

    // Verify Requester Ticket Detail view
    await expect(page.locator(`text=${ticketNumber}`).first()).toBeVisible({ timeout: 10000 });

    // Verify Actions Taken section is rendered in read-only mode for Requester
    const reqActionsSection = page.locator('[data-testid="actions-taken-section"]');
    await expect(reqActionsSection).toBeVisible({ timeout: 10000 });
    await expect(reqActionsSection.locator('button:has-text("+ Add Action")')).toHaveCount(0);
    await expect(reqActionsSection.locator('button:has-text("Edit")')).toHaveCount(0);

    // Click "Problem Appears Resolved" advisory confirmation
    const advisoryBtn = page.locator('button:has-text("Problem Appears Resolved")');
    await expect(advisoryBtn).toBeVisible({ timeout: 10000 });
    await advisoryBtn.click();

    // Verify advisory confirmation banner is visible
    const advisoryBanner = page.locator('text=/Problem Appears Resolved: You indicated resolution on/i');
    await expect(advisoryBanner).toBeVisible({ timeout: 10000 });

    // Assert status remains Resolved (not closed)
    await expect(page.locator(".badge:has-text('Resolved')")).toBeVisible();

    await captureLab04Screenshot(page, "workflow-resolution", "04-requester-advisory-confirmed.png");

    // Requester logs out
    await logoutUser(page);

    // -------------------------------------------------------------------------
    // Step 7: IT Staff opens ticket with advisory indication and formally CLOSES ticket
    // -------------------------------------------------------------------------
    await loginUser(page, TEST_USERS.STAFF_SOMPONG);

    await queueNavBtn.click();
    await searchInput.fill(ticketNumber);
    await page.waitForTimeout(400);

    const resolvedTicketRow = page.locator(`tr:has-text("${ticketNumber}")`).first();
    await expect(resolvedTicketRow).toBeVisible({ timeout: 15000 });
    await resolvedTicketRow.click();

    // Verify advisory indicator banner is visible to IT Staff
    await expect(page.locator('[data-testid="requester-resolved-advisory"]')).toBeVisible({ timeout: 10000 });

    // Transition to CLOSED
    await statusSelect.selectOption("CLOSED");
    await page.locator('[data-testid="update-status-btn"]').click();

    // Verify ticket enters terminal status CLOSED
    await expect(page.locator('[data-testid="header-status-badge"]')).toContainText(/Closed/i, { timeout: 10000 });

    // Verify further status transition controls are disabled/hidden
    await expect(page.locator('[data-testid="terminal-status-notice"]')).toBeVisible();

    await captureLab04Screenshot(page, "workflow-resolution", "05-ticket-closed-terminal.png");
  });
});
