import { describe, it, expect, beforeEach, beforeAll } from "vitest";
import request from "supertest";
import { app } from "../../src/app.js";
import { getPrisma } from "../../src/prisma.js";
import { sessionService } from "../../src/services/session.service.js";
import bcryptjs from "bcryptjs";

describe("Issue 12: Authentication & Security Protocols API", () => {
  const prisma = getPrisma();

  beforeAll(async () => {
    const currentYear = new Date().getUTCFullYear();
    await prisma.ticketNumberSequence.upsert({
      where: { year: currentYear },
      update: { nextVal: 500 },
      create: { year: currentYear, nextVal: 500 },
    });
  });

  beforeEach(() => {
    sessionService.clearAllSessions();
  });

  // =========================================================================
  // API-01: Valid User Login
  // =========================================================================
  it("API-01: logs in successfully with valid credentials and sets session cookie", async () => {
    const res = await request(app)
      .post("/api/v1/auth/login")
      .send({
        email: "sarah.johnson@kmutt.ac.th",
        password: "Password123!",
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.user).toBeDefined();
    expect(res.body.data.user.email).toBe("sarah.johnson@kmutt.ac.th");
    expect(res.body.data.user.name).toBe("Sarah Johnson");
    expect(res.body.data.user.role).toBe("REQUESTER");
    expect(res.body.data.user.mustChangePassword).toBe(true);
    expect(res.body.data.token).toBeDefined();

    // Verify Set-Cookie header
    const cookies = res.headers["set-cookie"];
    expect(cookies).toBeDefined();
    expect(cookies[0]).toMatch(/toktickit_session=/);
  });

  // =========================================================================
  // API-02: Safe Rejection of Invalid Password & Inactive Account
  // =========================================================================
  it("API-02: rejects invalid password with safe generic error envelope without enumeration leak", async () => {
    const res = await request(app)
      .post("/api/v1/auth/login")
      .send({
        email: "sarah.johnson@kmutt.ac.th",
        password: "WrongPassword999!",
      });

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe("INVALID_CREDENTIALS");
    expect(res.body.error.message).toBe("Invalid email address or password.");
  });

  it("API-02: rejects deactivated account with identical safe generic error envelope", async () => {
    const res = await request(app)
      .post("/api/v1/auth/login")
      .send({
        email: "inactive.user@kmutt.ac.th",
        password: "Password123!",
      });

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe("INVALID_CREDENTIALS");
    expect(res.body.error.message).toBe("Invalid email address or password.");
  });

  it("API-02: rejects non-existent email with identical safe generic error envelope", async () => {
    const res = await request(app)
      .post("/api/v1/auth/login")
      .send({
        email: "nobody.exists@kmutt.ac.th",
        password: "Password123!",
      });

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe("INVALID_CREDENTIALS");
    expect(res.body.error.message).toBe("Invalid email address or password.");
  });

  // =========================================================================
  // API-03: Mandatory Password Change Route Gating & Execution
  // =========================================================================
  it("API-03: blocks operational routes with 403 when mustChangePassword is true", async () => {
    // 1. Log in as user with mustChangePassword = true
    const loginRes = await request(app)
      .post("/api/v1/auth/login")
      .send({
        email: "sarah.johnson@kmutt.ac.th",
        password: "Password123!",
      });

    const token = loginRes.body.data.token;

    // 2. Attempt to access operational tickets route
    const ticketsRes = await request(app)
      .get("/api/v1/tickets")
      .set("Authorization", `Bearer ${token}`);

    expect(ticketsRes.status).toBe(403);
    expect(ticketsRes.body.success).toBe(false);
    expect(ticketsRes.body.error.code).toBe("PASSWORD_CHANGE_REQUIRED");
  });

  it("API-03: rejects password change if new password does not meet complexity rules", async () => {
    const loginRes = await request(app)
      .post("/api/v1/auth/login")
      .send({
        email: "sarah.johnson@kmutt.ac.th",
        password: "Password123!",
      });

    const token = loginRes.body.data.token;

    // Too short, no uppercase, no special char
    const weakRes = await request(app)
      .post("/api/v1/auth/change-password")
      .set("Authorization", `Bearer ${token}`)
      .send({
        currentPassword: "Password123!",
        newPassword: "short",
        confirmPassword: "short",
      });

    expect(weakRes.status).toBe(422);
    expect(weakRes.body.success).toBe(false);
    expect(weakRes.body.error.code).toBe("WEAK_PASSWORD");

    // Identical to current password
    const sameRes = await request(app)
      .post("/api/v1/auth/change-password")
      .set("Authorization", `Bearer ${token}`)
      .send({
        currentPassword: "Password123!",
        newPassword: "Password123!",
        confirmPassword: "Password123!",
      });

    expect(sameRes.status).toBe(422);
    expect(sameRes.body.success).toBe(false);
    expect(sameRes.body.error.code).toBe("WEAK_PASSWORD");
  });

  it("API-03: successfully changes password, clears mustChangePassword flag, and unblocks operational routes", async () => {
    // 1. Reset user state before test
    await prisma.user.update({
      where: { email: "sarah.johnson@kmutt.ac.th" },
      data: {
        passwordHash: bcryptjs.hashSync("Password123!", 10),
        mustChangePassword: true,
      },
    });

    // 2. Log in
    const loginRes = await request(app)
      .post("/api/v1/auth/login")
      .send({
        email: "sarah.johnson@kmutt.ac.th",
        password: "Password123!",
      });

    const token = loginRes.body.data.token;

    // 3. Change password
    const changeRes = await request(app)
      .post("/api/v1/auth/change-password")
      .set("Authorization", `Bearer ${token}`)
      .send({
        currentPassword: "Password123!",
        newPassword: "SecureZenPass2026!",
        confirmPassword: "SecureZenPass2026!",
      });

    expect(changeRes.status).toBe(200);
    expect(changeRes.body.success).toBe(true);
    expect(changeRes.body.data.message).toBe("Password updated successfully.");

    // 4. Verify /me now reflects mustChangePassword = false
    const meRes = await request(app)
      .get("/api/v1/auth/me")
      .set("Authorization", `Bearer ${token}`);

    expect(meRes.status).toBe(200);
    expect(meRes.body.data.mustChangePassword).toBe(false);

    // 5. Verify operational route access now succeeds
    const ticketsRes = await request(app)
      .get("/api/v1/tickets")
      .set("Authorization", `Bearer ${token}`);

    expect(ticketsRes.status).toBe(200);
    expect(ticketsRes.body.success).toBe(true);

    // Restore initial password for repeatability
    await prisma.user.update({
      where: { email: "sarah.johnson@kmutt.ac.th" },
      data: {
        passwordHash: bcryptjs.hashSync("Password123!", 10),
        mustChangePassword: true,
      },
    });
  });

  // =========================================================================
  // API-04: Logout Session Invalidation
  // =========================================================================
  it("API-04: invalidates session and clears cookie on logout", async () => {
    // 1. Log in
    const loginRes = await request(app)
      .post("/api/v1/auth/login")
      .send({
        email: "jennifer.anderson@kmutt.ac.th",
        password: "Password123!",
      });

    const token = loginRes.body.data.token;

    // 2. Call logout
    const logoutRes = await request(app)
      .post("/api/v1/auth/logout")
      .set("Authorization", `Bearer ${token}`);

    expect(logoutRes.status).toBe(200);
    expect(logoutRes.body.success).toBe(true);

    // Verify cookie cleared
    const cookies = logoutRes.headers["set-cookie"];
    expect(cookies).toBeDefined();
    expect(cookies[0]).toMatch(/toktickit_session=;/);

    // 3. Subsequent call to /me returns 401 Unauthorized
    const meRes = await request(app)
      .get("/api/v1/auth/me")
      .set("Authorization", `Bearer ${token}`);

    expect(meRes.status).toBe(401);
  });

  // =========================================================================
  // API-05: Server-Side Requester ID Derivation (BR-03)
  // =========================================================================
  it("API-05: derives requesterId strictly from session context and ignores spoofed client IDs", async () => {
    // 1. Log in as Sarah Johnson (ID 4)
    const loginRes = await request(app)
      .post("/api/v1/auth/login")
      .send({
        email: "sarah.johnson@kmutt.ac.th",
        password: "Password123!",
      });

    const token = loginRes.body.data.token;
    const sarahId = loginRes.body.data.user.id;

    // First temporarily bypass password change for this test
    await prisma.user.update({
      where: { id: sarahId },
      data: { mustChangePassword: false },
    });

    const currentYear = new Date().getUTCFullYear();
    await prisma.ticketNumberSequence.upsert({
      where: { year: currentYear },
      update: { nextVal: 800 },
      create: { year: currentYear, nextVal: 800 },
    });

    // 2. Create ticket while attempting to spoof requesterId = 999 or x-requester-id: 999
    const createRes = await request(app)
      .post("/api/v1/tickets")
      .set("Authorization", `Bearer ${token}`)
      .set("x-requester-id", "999")
      .send({
        summary: "Intermittent VPN drops during remote work",
        description: "VPN client disconnects every 15 minutes while accessing internal resources.",
        categoryId: 1,
        relatedSystemId: 3,
        requestedPriority: "High",
        requesterId: 999, // Attempted spoof
      });

    expect(createRes.status).toBe(201);
    expect(createRes.body.success).toBe(true);
    expect(createRes.body.data.requesterId).toBe(sarahId);

    // Clean up created test ticket
    if (createRes.body.data.id) {
      await prisma.ticket.delete({
        where: { id: createRes.body.data.id },
      });
    }

    // Restore mustChangePassword
    await prisma.user.update({
      where: { id: sarahId },
      data: { mustChangePassword: true },
    });
  });
});
