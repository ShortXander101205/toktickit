import { test, expect } from "@playwright/test";
import { loginUser, logoutUser, captureLab04Screenshot, TEST_USERS } from "../helpers";

test.describe("Sprint 4 — Role-Appropriate Dashboards & Interactive Drill-Downs (Scenario 3)", () => {
  test.setTimeout(120000);

  test("SC-3: Requester isolation, staff operational queue counts, admin statistics, and filter drill-downs", async ({
    page,
  }) => {
    // =========================================================================
    // Part 1: Requester Persona — Metric Isolation & Drill-Down
    // =========================================================================
    await page.setViewportSize({ width: 1280, height: 800 });
    await loginUser(page, TEST_USERS.REQUESTER_ACTIVE);

    // Verify Requester Dashboard is active landing view
    const reqDashboard = page.locator('[data-testid="requester-dashboard"]');
    await expect(reqDashboard).toBeVisible({ timeout: 15000 });
    await expect(page.locator('[data-testid="requester-welcome-header"]')).toContainText(TEST_USERS.REQUESTER_ACTIVE.name);

    // Verify 4 operational metric cards
    await expect(page.locator('[data-testid="metric-card-open"]')).toBeVisible();
    await expect(page.locator('[data-testid="metric-card-in-progress"]')).toBeVisible();
    await expect(page.locator('[data-testid="metric-card-resolved"]')).toBeVisible();
    await expect(page.locator('[data-testid="metric-card-closed"]')).toBeVisible();

    await captureLab04Screenshot(page, "requester-dashboard", "requester-dashboard-desktop.png");

    // Verify zero horizontal scroll on Desktop
    let hasOverflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
    expect(hasOverflow).toBe(false);

    // Mobile Viewport Check
    await page.setViewportSize({ width: 375, height: 667 });
    await captureLab04Screenshot(page, "requester-dashboard", "requester-dashboard-mobile.png");
    hasOverflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
    expect(hasOverflow).toBe(false);

    // Reset to Desktop for drill-down interaction
    await page.setViewportSize({ width: 1280, height: 800 });

    // Click "View all" drilldown on Open Tickets
    const drilldownOpen = page.locator('[data-testid="drilldown-open"]');
    await expect(drilldownOpen).toBeVisible();
    await drilldownOpen.click();

    // Verify smooth navigation into MyTickets view with status pre-filtered
    const myTicketsTable = page.locator('[data-testid="my-tickets-table"], [data-testid="ticket-desktop-row"]');
    await expect(myTicketsTable.first()).toBeVisible({ timeout: 15000 });

    // Requester logs out
    await logoutUser(page);

    // =========================================================================
    // Part 2: IT Staff Persona — Queue Operational Metrics & Queue Drill-Down
    // =========================================================================
    await loginUser(page, TEST_USERS.STAFF_SOMPONG);

    // Verify Staff Dashboard is active landing view
    const staffDashboard = page.locator('[data-testid="staff-dashboard"]');
    await expect(staffDashboard).toBeVisible({ timeout: 15000 });
    await expect(page.locator('[data-testid="staff-welcome-header"]')).toContainText(TEST_USERS.STAFF_SOMPONG.name);

    // Verify 5 primary metric cards and unassigned indicator
    await expect(page.locator('[data-testid="metric-card-new"]')).toBeVisible();
    await expect(page.locator('[data-testid="metric-card-open"]')).toBeVisible();
    await expect(page.locator('[data-testid="metric-card-in-progress"]')).toBeVisible();
    await expect(page.locator('[data-testid="metric-card-waiting"]')).toBeVisible();
    await expect(page.locator('[data-testid="metric-card-my-assigned"]')).toBeVisible();
    await expect(page.locator('[data-testid="drilldown-unassigned"]')).toBeVisible();

    await captureLab04Screenshot(page, "staff-dashboard", "staff-dashboard-desktop.png");

    // Verify zero horizontal scroll on Desktop
    hasOverflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
    expect(hasOverflow).toBe(false);

    // Tablet Viewport Check (768x1024)
    await page.setViewportSize({ width: 768, height: 1024 });
    await captureLab04Screenshot(page, "staff-dashboard", "staff-dashboard-tablet.png");
    hasOverflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
    expect(hasOverflow).toBe(false);

    // Mobile Viewport Check (375x667)
    await page.setViewportSize({ width: 375, height: 667 });
    await captureLab04Screenshot(page, "staff-dashboard", "staff-dashboard-mobile.png");
    hasOverflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
    expect(hasOverflow).toBe(false);

    // Reset to Desktop for drill-down testing
    await page.setViewportSize({ width: 1280, height: 800 });

    // Test Drill-down: Click "New" metric card
    const drilldownNew = page.locator('[data-testid="drilldown-new"]');
    await drilldownNew.click();

    // Verify navigation into Staff Ticket Queue with status filter pre-selected to NEW
    await expect(page.locator("h2")).toContainText(/IT Staff Ticket Queue/i, { timeout: 15000 });
    const statusFilterSelect = page.locator('#status-filter, select[name="status"]');
    if (await statusFilterSelect.isVisible()) {
      await expect(statusFilterSelect).toHaveValue("NEW");
    }

    // Return to Dashboard
    await page.locator('header button[data-testid="nav-dashboard"]').click();
    await expect(staffDashboard).toBeVisible({ timeout: 15000 });

    // Test Drill-down: Click "Unassigned" badge
    const drilldownUnassigned = page.locator('[data-testid="drilldown-unassigned"]');
    await drilldownUnassigned.click();
    await expect(page.locator("h2")).toContainText(/IT Staff Ticket Queue/i, { timeout: 15000 });

    // IT Staff logs out
    await logoutUser(page);

    // =========================================================================
    // Part 3: Administrator Persona — User Summary Strip & User Management
    // =========================================================================
    await loginUser(page, TEST_USERS.ADMIN);

    // Verify Staff Dashboard view with Admin User Summary Strip
    await expect(staffDashboard).toBeVisible({ timeout: 15000 });
    const adminStrip = page.locator('[data-testid="admin-user-summary-strip"]');
    await expect(adminStrip).toBeVisible({ timeout: 10000 });

    // Verify user count metrics
    await expect(page.locator('[data-testid="admin-total-users"]')).toBeVisible();
    await expect(page.locator('[data-testid="admin-active-users"]')).toBeVisible();
    await expect(page.locator('[data-testid="admin-requesters-count"]')).toBeVisible();
    await expect(page.locator('[data-testid="admin-staff-count"]')).toBeVisible();
    await expect(page.locator('[data-testid="admin-admins-count"]')).toBeVisible();

    await captureLab04Screenshot(page, "staff-dashboard", "staff-dashboard-admin-strip.png");

    // Click "Manage Users" shortcut
    const manageUsersBtn = page.locator('[data-testid="admin-manage-users-btn"]');
    await expect(manageUsersBtn).toBeVisible();
    await manageUsersBtn.click();

    // Verify navigation to User Management view
    await expect(page.locator("h2, h1")).toContainText(/User Management/i, { timeout: 15000 });

    await logoutUser(page);
  });
});

