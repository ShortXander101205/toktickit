import { describe, it, expect, beforeAll } from "vitest";
import request from "supertest";
import { PrismaClient } from "@prisma/client";
import app from "../../src/app.js";
import { seed } from "../../prisma/seed.js";

const prisma = new PrismaClient();

describe("Lab 3 Auth & Identity API Suites (Issue 12: API-01 .. API-05)", () => {
  beforeAll(async () => {
    // Reset database to known seed state
    await prisma.attachment.deleteMany();
    await prisma.ticket.deleteMany();
    await seed(prisma);
  });

  describe("API-01: Valid User Login & Session Establishment", () => {
    it("authenticates active user with valid credentials, sets session cookie and returns profile", async () => {
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

      // Verify Set-Cookie header contains toktickit_session
      const cookies = res.headers["set-cookie"];
      expect(cookies).toBeDefined();
      const cookieStr = Array.isArray(cookies) ? cookies.join(";") : String(cookies);
      expect(cookieStr).toContain("toktickit_session=");
      expect(cookieStr.toLowerCase()).toContain("httponly");
    });
  });

  describe("API-02: Safe Rejection & Anti-Enumeration (BR-01)", () => {
    it("rejects invalid password with generic 401 error envelope without leaking account existence", async () => {
      const res = await request(app)
        .post("/api/v1/auth/login")
        .send({
          email: "sarah.johnson@kmutt.ac.th",
          password: "WrongPassword999!",
        });

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.error).toBeDefined();
      expect(res.body.error.code).toBe("INVALID_CREDENTIALS");
      expect(res.body.error.message).toBe("Invalid email address or password.");
    });

    it("rejects non-existent email with identical generic 401 error envelope", async () => {
      const res = await request(app)
        .post("/api/v1/auth/login")
        .send({
          email: "nonexistent.person@kmutt.ac.th",
          password: "Password123!",
        });

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe("INVALID_CREDENTIALS");
      expect(res.body.error.message).toBe("Invalid email address or password.");
    });

    it("rejects inactive account with identical generic 401 error envelope", async () => {
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
  });

  describe("API-03: Mandatory Password Change & Complexity Gating (FR-02, BR-02)", () => {
    it("blocks operational endpoints with 403 when user has mustChangePassword === true", async () => {
      // 1. Login to get session
      const loginRes = await request(app)
        .post("/api/v1/auth/login")
        .send({
          email: "david.lee@kmutt.ac.th",
          password: "Password123!",
        });

      expect(loginRes.status).toBe(200);
      const token = loginRes.body.data.token;

      // 2. Attempt to access operational tickets route
      const ticketsRes = await request(app)
        .get("/api/v1/tickets")
        .set("Authorization", `Bearer ${token}`);

      expect(ticketsRes.status).toBe(403);
      expect(ticketsRes.body.success).toBe(false);
      expect(ticketsRes.body.error.code).toBe("PASSWORD_CHANGE_REQUIRED");
    });

    it("rejects weak new passwords or mismatch with 422 Unprocessable Entity", async () => {
      const loginRes = await request(app)
        .post("/api/v1/auth/login")
        .send({
          email: "david.lee@kmutt.ac.th",
          password: "Password123!",
        });
      const token = loginRes.body.data.token;

      // Confirmation mismatch
      const mismatchRes = await request(app)
        .post("/api/v1/auth/change-password")
        .set("Authorization", `Bearer ${token}`)
        .send({
          currentPassword: "Password123!",
          newPassword: "SecurePassword2026!",
          confirmPassword: "DifferentPassword2026!",
        });
      expect(mismatchRes.status).toBe(422);
      expect(mismatchRes.body.error.code).toBe("VALIDATION_FAILED");

      // Complexity failure: missing special character
      const weakRes = await request(app)
        .post("/api/v1/auth/change-password")
        .set("Authorization", `Bearer ${token}`)
        .send({
          currentPassword: "Password123!",
          newPassword: "SimplePassword2026",
          confirmPassword: "SimplePassword2026",
        });
      expect(weakRes.status).toBe(422);
      expect(weakRes.body.error.code).toBe("VALIDATION_FAILED");

      // Same as current password
      const sameRes = await request(app)
        .post("/api/v1/auth/change-password")
        .set("Authorization", `Bearer ${token}`)
        .send({
          currentPassword: "Password123!",
          newPassword: "Password123!",
          confirmPassword: "Password123!",
        });
      expect(sameRes.status).toBe(422);
      expect(sameRes.body.error.code).toBe("VALIDATION_FAILED");
    });

    it("successfully updates password, clears mustChangePassword flag, and unblocks operational routes", async () => {
      const loginRes = await request(app)
        .post("/api/v1/auth/login")
        .send({
          email: "david.lee@kmutt.ac.th",
          password: "Password123!",
        });
      const token = loginRes.body.data.token;

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

      // Verify GET /api/v1/auth/me reflects mustChangePassword: false
      const meRes = await request(app)
        .get("/api/v1/auth/me")
        .set("Authorization", `Bearer ${token}`);
      expect(meRes.status).toBe(200);
      expect(meRes.body.data.mustChangePassword).toBe(false);

      // Verify operational route access now succeeds (not 403)
      const ticketsRes = await request(app)
        .get("/api/v1/tickets")
        .set("Authorization", `Bearer ${token}`);
      expect(ticketsRes.status).toBe(200);
      expect(ticketsRes.body.success).toBe(true);
    });
  });

  describe("API-04: User Logout & Session Invalidation", () => {
    it("invalidates session on logout so subsequent protected calls return 401", async () => {
      const loginRes = await request(app)
        .post("/api/v1/auth/login")
        .send({
          email: "jennifer.anderson@kmutt.ac.th",
          password: "Password123!",
        });
      const token = loginRes.body.data.token;

      // Verify authenticated before logout
      const beforeMe = await request(app)
        .get("/api/v1/auth/me")
        .set("Authorization", `Bearer ${token}`);
      expect(beforeMe.status).toBe(200);

      // Logout
      const logoutRes = await request(app)
        .post("/api/v1/auth/logout")
        .set("Authorization", `Bearer ${token}`);
      expect(logoutRes.status).toBe(200);
      expect(logoutRes.body.success).toBe(true);

      // Subsequent call with token must return 401 Unauthorized
      const afterMe = await request(app)
        .get("/api/v1/auth/me")
        .set("Authorization", `Bearer ${token}`);
      expect(afterMe.status).toBe(401);
      expect(afterMe.body.error.code).toBe("UNAUTHORIZED");
    });
  });

  describe("API-05: Session-Derived Requester Ownership (BR-03)", () => {
    it("derives requesterId strictly from authenticated session user ID and ignores spoofed client IDs", async () => {
      // Login as Jennifer Anderson (requester)
      const loginRes = await request(app)
        .post("/api/v1/auth/login")
        .send({
          email: "jennifer.anderson@kmutt.ac.th",
          password: "Password123!",
        });
      const token = loginRes.body.data.token;
      const jenniferId = loginRes.body.data.user.id;

      // Update password first so we can access operational route
      await request(app)
        .post("/api/v1/auth/change-password")
        .set("Authorization", `Bearer ${token}`)
        .send({
          currentPassword: "Password123!",
          newPassword: "NewZenPass2026!",
          confirmPassword: "NewZenPass2026!",
        });

      // Attempt to submit ticket spoofing requesterId 999 in body and header
      const createRes = await request(app)
        .post("/api/v1/tickets")
        .set("Authorization", `Bearer ${token}`)
        .set("x-requester-id", "999")
        .send({
          summary: "Session ownership test ticket",
          description: "This ticket tests whether session user ID takes precedence over spoofed client ID.",
          categoryId: 1,
          relatedSystemId: 1,
          requestedPriority: "Medium",
          requesterId: 999,
        });

      expect(createRes.status).toBe(201);
      expect(createRes.body.success).toBe(true);

      const createdTicket = await prisma.ticket.findUnique({
        where: { id: createRes.body.data.id },
      });

      expect(createdTicket).toBeDefined();
      expect(createdTicket!.requesterId).toBe(jenniferId);
      expect(createdTicket!.requesterId).not.toBe(999);
    });
  });
});
