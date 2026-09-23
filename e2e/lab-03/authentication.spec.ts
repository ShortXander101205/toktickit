import { test, expect } from "@playwright/test";
import { captureScreenshot, TEST_USERS } from "../helpers";

test.describe("Sprint 3 — Authentication, Password Rotation & App Shell (E2E-01)", () => {
  test.setTimeout(90000);

  test("E2E-01.1: Valid login, App Shell header verification, responsive viewports & zero overflow", async ({ page }) => {
    // 1. Navigate to root -> Login page
    await page.goto("/");
    await page.waitForLoadState("networkidle");

    // Verify Login card is present
    await expect(page.locator("h1")).toContainText(/Sign In/i);
    await expect(page.locator("#email")).toBeVisible();
    await expect(page.locator("#password")).toBeVisible();

    // 2. Capture Desktop Login view
    await page.setViewportSize({ width: 1280, height: 800 });
    await captureScreenshot(page, "authentication", "desktop-login.png");

    // Verify zero horizontal scroll on Desktop
    let hasOverflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
    expect(hasOverflow).toBe(false);

    // 3. Capture Tablet Login view
    await page.setViewportSize({ width: 768, height: 1024 });
    await captureScreenshot(page, "authentication", "tablet-login.png");
    hasOverflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
    expect(hasOverflow).toBe(false);

    // 4. Capture Mobile Login view
    await page.setViewportSize({ width: 375, height: 667 });
    await captureScreenshot(page, "authentication", "mobile-login.png");
    hasOverflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
    expect(hasOverflow).toBe(false);

    // Reset to Desktop for login action
    await page.setViewportSize({ width: 1280, height: 800 });

    // 5. Submit valid login credentials for active requester
    await page.locator("#email").fill(TEST_USERS.REQUESTER_ACTIVE.email);
    await page.locator("#password").fill(TEST_USERS.REQUESTER_ACTIVE.password);
    await page.locator('button[type="submit"]').click();

    // 6. Assert successful entry into App Shell
    const activeUser = page.locator('[data-testid="active-user-name"]');
    await expect(activeUser).toBeVisible({ timeout: 15000 });
    await expect(activeUser).toContainText(TEST_USERS.REQUESTER_ACTIVE.name);

    // Assert Role Badge has text "Requester" with Zen Green styling
    const roleBadge = page.locator('[data-testid="user-role-badge"]');
    await expect(roleBadge).toBeVisible();
    await expect(roleBadge).toHaveText("Requester");

    // Assert Requester navigation is visible in header and Staff/Admin tabs are hidden
    await expect(page.locator('header button:has-text("My Tickets")')).toBeVisible();
    await expect(page.locator('header button:has-text("+ Create Ticket")')).toBeVisible();
    await expect(page.locator('[data-testid="nav-ticket-queue"]')).toHaveCount(0);
    await expect(page.locator('[data-testid="nav-user-management"]')).toHaveCount(0);

    // 7. Clean up: Log out
    await page.locator('[data-testid="logout-button"]').click();
    await expect(page.locator("#email")).toBeVisible({ timeout: 10000 });
  });

  test("E2E-01.2: Invalid password and unseeded account safe rejection without existence leak", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");

    // 1. Submit invalid password for existing account
    await page.locator("#email").fill(TEST_USERS.REQUESTER_ACTIVE.email);
    await page.locator("#password").fill("CompletelyWrongPassword123!");
    await page.locator('button[type="submit"]').click();

    // Verify error banner
    const errorAlert = page.locator('[data-testid="login-error"]');
    await expect(errorAlert).toBeVisible({ timeout: 10000 });
    await expect(errorAlert).toContainText("Invalid email address or password");
    await captureScreenshot(page, "authentication", "invalid-login-alert.png");

    // 2. Submit non-existent email
    await page.locator("#email").fill("unregistered.ghost@kmutt.ac.th");
    await page.locator("#password").fill("SomePassword123!");
    await page.locator('button[type="submit"]').click();

    // Verify identical error message (no username enumeration leak)
    await expect(errorAlert).toBeVisible();
    await expect(errorAlert).toContainText("Invalid email address or password");
  });

  test("E2E-01.3: Inactive account rejection without leaking account inactive status", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");

    // Attempt login with deactivated user
    await page.locator("#email").fill(TEST_USERS.INACTIVE_USER.email);
    await page.locator("#password").fill(TEST_USERS.INACTIVE_USER.password);
    await page.locator('button[type="submit"]').click();

    // Assert same safe error message
    const errorAlert = page.locator('[data-testid="login-error"]');
    await expect(errorAlert).toBeVisible({ timeout: 10000 });
    await expect(errorAlert).toContainText("Invalid email address or password");
    await captureScreenshot(page, "authentication", "inactive-account-alert.png");
  });

  test("E2E-01.4: Mandatory first-login password change flow with live checklist & rotation", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");

    // 1. Log in as Sarah Johnson (mustChangePassword: true)
    await page.locator("#email").fill(TEST_USERS.REQUESTER_SARAH.email);
    await page.locator("#password").fill(TEST_USERS.REQUESTER_SARAH.initialPassword);
    await page.locator('button[type="submit"]').click();

    // 2. Assert intercept: Mandatory Password Change view is presented
    await expect(page.locator("h1")).toContainText(/Mandatory Password Change/i, { timeout: 15000 });
    await expect(page.locator("#currentPassword")).toBeVisible();
    await expect(page.locator("#newPassword")).toBeVisible();
    await expect(page.locator("#confirmPassword")).toBeVisible();

    // Assert normal operational views are blocked; clicking header navigation does not leave change password screen
    await expect(page.locator('[data-testid="staff-queue-table"]')).toHaveCount(0);
    await page.locator('header button:has-text("My Tickets")').click();
    await expect(page.locator("h1")).toContainText(/Mandatory Password Change/i);

    // 3. Test Partial Checklist indicators
    await page.locator("#newPassword").fill("weak");
    // Assert min length is NOT satisfied
    const minLengthRule = page.locator('[data-testid="rule-min-length"]');
    await expect(minLengthRule).toContainText("At least 8 characters");
    await expect(minLengthRule).not.toContainText("✓");
    await captureScreenshot(page, "authentication", "checklist-partial.png");

    // 4. Fill valid strong password satisfying all 6 criteria
    const newPass = TEST_USERS.REQUESTER_SARAH.rotatedPassword;
    await page.locator("#newPassword").fill(newPass);
    await page.locator("#confirmPassword").fill(newPass);

    // Assert all 6 rules show success checkmarks
    await expect(page.locator('[data-testid="rule-min-length"]')).toContainText("✓");
    await expect(page.locator('[data-testid="rule-upper"]')).toContainText("✓");
    await expect(page.locator('[data-testid="rule-lower"]')).toContainText("✓");
    await expect(page.locator('[data-testid="rule-digit"]')).toContainText("✓");
    await expect(page.locator('[data-testid="rule-special"]')).toContainText("✓");
    await expect(page.locator('[data-testid="rule-match"]')).toContainText("✓");
    await captureScreenshot(page, "authentication", "checklist-satisfied.png");

    // Capture Change Password view across viewports
    await page.setViewportSize({ width: 1280, height: 800 });
    await captureScreenshot(page, "authentication", "desktop-change-password.png");
    let hasOverflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
    expect(hasOverflow).toBe(false);

    await page.setViewportSize({ width: 768, height: 1024 });
    await captureScreenshot(page, "authentication", "tablet-change-password.png");
    hasOverflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
    expect(hasOverflow).toBe(false);

    await page.setViewportSize({ width: 375, height: 667 });
    await captureScreenshot(page, "authentication", "mobile-change-password.png");
    hasOverflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
    expect(hasOverflow).toBe(false);

    // Reset to Desktop
    await page.setViewportSize({ width: 1280, height: 800 });

    // 5. Submit form with Current Password
    await page.locator("#currentPassword").fill(TEST_USERS.REQUESTER_SARAH.initialPassword);
    const updateButton = page.locator('button[type="submit"]:has-text("Update Password")');
    await expect(updateButton).toBeEnabled();
    await updateButton.click();

    // 6. Assert success redirect into main workspace
    await expect(page.locator("h1:has-text('Mandatory Password Change')")).toHaveCount(0, { timeout: 15000 });
    const activeUser = page.locator('[data-testid="active-user-name"]');
    await expect(activeUser).toBeVisible({ timeout: 15000 });
    await expect(activeUser).toContainText(TEST_USERS.REQUESTER_SARAH.name);
    await captureScreenshot(page, "authentication", "post-change-redirect.png");

    // 7. Log out
    await page.locator('[data-testid="logout-button"]').click();
    await expect(page.locator("#email")).toBeVisible({ timeout: 10000 });

    // 8. Log in with the newly updated password directly into workspace
    await page.locator("#email").fill(TEST_USERS.REQUESTER_SARAH.email);
    await page.locator("#password").fill(newPass);
    await page.locator('button[type="submit"]').click();

    await expect(page.locator('[data-testid="active-user-name"]')).toContainText(TEST_USERS.REQUESTER_SARAH.name, { timeout: 15000 });
    // Verify no mandatory password change redirect occurs
    await expect(page.locator("h1")).not.toContainText(/Mandatory Password Change/i);

    // Final logout
    await page.locator('[data-testid="logout-button"]').click();
    await expect(page.locator("#email")).toBeVisible({ timeout: 10000 });
  });

  test("E2E-01.5: Logout session invalidation and navigation block", async ({ page }) => {
    // 1. Log in as active requester
    await page.goto("/");
    await page.locator("#email").fill(TEST_USERS.REQUESTER_ACTIVE.email);
    await page.locator("#password").fill(TEST_USERS.REQUESTER_ACTIVE.password);
    await page.locator('button[type="submit"]').click();

    await expect(page.locator('[data-testid="active-user-name"]')).toBeVisible({ timeout: 15000 });

    // 2. Click Logout
    await page.locator('[data-testid="logout-button"]').click();

    // Assert redirect to Login and user pill is gone
    await expect(page.locator("#email")).toBeVisible({ timeout: 10000 });
    await expect(page.locator('[data-testid="active-user-name"]')).toHaveCount(0);
    await captureScreenshot(page, "authentication", "logged-out-state.png");

    // 3. Reload page: Assert user remains unauthenticated on Login screen
    await page.reload();
    await page.waitForLoadState("networkidle");
    await expect(page.locator("#email")).toBeVisible();
    await expect(page.locator('[data-testid="active-user-name"]')).toHaveCount(0);
  });
});
