import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import request from "supertest";
import { app } from "../../src/app.js";
import { getPrisma } from "../../src/prisma.js";
import { sessionService } from "../../src/services/session.service.js";
import bcryptjs from "bcryptjs";

describe("Issue 15: Administrator User Management & Account Safety API", () => {
  const prisma = getPrisma();

  let adminToken: string;
  let adminId: number;
  let itStaffToken: string;
  let requesterToken: string;

  beforeAll(async () => {
    // Ensure primary admin has mustChangePassword = false so it can operate admin APIs
    const admin = await prisma.user.update({
      where: { email: "admin@kmutt.ac.th" },
      data: {
        passwordHash: bcryptjs.hashSync("Password123!", 10),
        mustChangePassword: false,
        isActive: true,
      },
    });
    adminId = admin.id;

    // Ensure IT staff has mustChangePassword = false
    await prisma.user.update({
      where: { email: "sompong.it@kmutt.ac.th" },
      data: {
        passwordHash: bcryptjs.hashSync("Password123!", 10),
        mustChangePassword: false,
        isActive: true,
      },
    });

    // Ensure test requester has mustChangePassword = false
    await prisma.user.update({
      where: { email: "test.requester@kmutt.ac.th" },
      data: {
        passwordHash: bcryptjs.hashSync("Password123!", 10),
        mustChangePassword: false,
        isActive: true,
      },
    });
  });

  beforeEach(async () => {
    sessionService.clearAllSessions();

    const adminLogin = await request(app)
      .post("/api/v1/auth/login")
      .send({ email: "admin@kmutt.ac.th", password: "Password123!" });
    adminToken = adminLogin.body.data.token;

    const staffLogin = await request(app)
      .post("/api/v1/auth/login")
      .send({ email: "sompong.it@kmutt.ac.th", password: "Password123!" });
    itStaffToken = staffLogin.body.data.token;

    const reqLogin = await request(app)
      .post("/api/v1/auth/login")
      .send({ email: "test.requester@kmutt.ac.th", password: "Password123!" });
    requesterToken = reqLogin.body.data.token;
  });

  // ===========================================================================
  // API-ADM-01: Unauthenticated request rejected (401)
  // ===========================================================================
  it("API-ADM-01: rejects unauthenticated requests with 401 Unauthorized", async () => {
    const res = await request(app).get("/api/v1/admin/users");
    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe("UNAUTHORIZED");
  });

  // ===========================================================================
  // API-ADM-02: Requester role rejected (403 Forbidden)
  // ===========================================================================
  it("API-ADM-02: rejects Requester role access with 403 Forbidden (AC-15.5)", async () => {
    const res = await request(app)
      .get("/api/v1/admin/users")
      .set("Authorization", `Bearer ${requesterToken}`);

    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe("FORBIDDEN");
  });

  // ===========================================================================
  // API-ADM-03: IT Staff role rejected (403 Forbidden)
  // ===========================================================================
  it("API-ADM-03: rejects IT Staff role access with 403 Forbidden (AC-15.5)", async () => {
    const res = await request(app)
      .get("/api/v1/admin/users")
      .set("Authorization", `Bearer ${itStaffToken}`);

    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe("FORBIDDEN");
  });

  // ===========================================================================
  // API-ADM-04: Admin lists all users & excludes passwordHash
  // ===========================================================================
  it("API-ADM-04: allows Administrator to list users without leaking password hashes (AC-15.1)", async () => {
    const res = await request(app)
      .get("/api/v1/admin/users")
      .set("Authorization", `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.data.length).toBeGreaterThanOrEqual(10);

    // Verify all user records omit passwordHash
    for (const u of res.body.data) {
      expect(u.passwordHash).toBeUndefined();
      expect(u.id).toBeDefined();
      expect(u.name).toBeDefined();
      expect(u.email).toBeDefined();
      expect(u.role).toBeDefined();
      expect(u.isActive).toBeDefined();
    }
  });

  // ===========================================================================
  // API-ADM-05: Search users by keyword (partial match on name or email)
  // ===========================================================================
  it("API-ADM-05: filters user list by keyword search (FR-06.2)", async () => {
    const res = await request(app)
      .get("/api/v1/admin/users?search=sompong")
      .set("Authorization", `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.length).toBeGreaterThanOrEqual(1);
    expect(res.body.data[0].email).toBe("sompong.it@kmutt.ac.th");
  });

  // ===========================================================================
  // API-ADM-06: Filter users by role
  // ===========================================================================
  it("API-ADM-06: filters user list by role (FR-06.2)", async () => {
    const res = await request(app)
      .get("/api/v1/admin/users?role=IT_STAFF")
      .set("Authorization", `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.length).toBeGreaterThanOrEqual(3);
    for (const u of res.body.data) {
      expect(u.role).toBe("IT_STAFF");
    }
  });

  // ===========================================================================
  // API-ADM-07: Create user success (mustChangePassword = true, single role)
  // ===========================================================================
  it("API-ADM-07: creates user with single role and flags mustChangePassword = true (AC-15.1, BR-09)", async () => {
    const res = await request(app)
      .post("/api/v1/admin/users")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({
        name: "New Requester User",
        email: "new.requester@kmutt.ac.th",
        department: "School of Architecture",
        role: "REQUESTER",
        isActive: true,
        initialPassword: "InitialPass123!",
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.id).toBeDefined();
    expect(res.body.data.email).toBe("new.requester@kmutt.ac.th");
    expect(res.body.data.role).toBe("REQUESTER");
    expect(res.body.data.mustChangePassword).toBe(true);
    expect(res.body.data.isActive).toBe(true);
    expect(res.body.data.passwordHash).toBeUndefined();
  });

  // ===========================================================================
  // API-ADM-08: Reject duplicate email on create (409 Conflict)
  // ===========================================================================
  it("API-ADM-08: rejects duplicate email with 409 Conflict (AC-15.2, BR-10)", async () => {
    const res = await request(app)
      .post("/api/v1/admin/users")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({
        name: "Duplicate User",
        email: "admin@kmutt.ac.th", // already taken
        role: "REQUESTER",
        initialPassword: "InitialPass123!",
      });

    expect(res.status).toBe(409);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe("EMAIL_ALREADY_EXISTS");
  });

  // ===========================================================================
  // API-ADM-09: Reject duplicate email case-insensitively
  // ===========================================================================
  it("API-ADM-09: rejects duplicate email case-insensitively (AC-15.2, BR-10)", async () => {
    const res = await request(app)
      .post("/api/v1/admin/users")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({
        name: "Duplicate User Upper",
        email: "ADMIN@KMUTT.AC.TH", // case variant
        role: "REQUESTER",
        initialPassword: "InitialPass123!",
      });

    expect(res.status).toBe(409);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe("EMAIL_ALREADY_EXISTS");
  });

  // ===========================================================================
  // API-ADM-10: Validate create inputs (short name, invalid email, short password)
  // ===========================================================================
  it("API-ADM-10: rejects invalid user creation payload with 400 Bad Request (FR-06.3)", async () => {
    // Short password (< 8 chars)
    const resShortPwd = await request(app)
      .post("/api/v1/admin/users")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({
        name: "Test Name",
        email: "valid.email@kmutt.ac.th",
        role: "REQUESTER",
        initialPassword: "short",
      });

    expect(resShortPwd.status).toBe(400);
    expect(resShortPwd.body.success).toBe(false);
    expect(resShortPwd.body.error.code).toBe("VALIDATION_ERROR");

    // Invalid email
    const resInvalidEmail = await request(app)
      .post("/api/v1/admin/users")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({
        name: "Test Name",
        email: "not-an-email",
        role: "REQUESTER",
        initialPassword: "ValidPassword123!",
      });

    expect(resInvalidEmail.status).toBe(400);
    expect(resInvalidEmail.body.error.code).toBe("VALIDATION_ERROR");

    // Invalid role
    const resInvalidRole = await request(app)
      .post("/api/v1/admin/users")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({
        name: "Test Name",
        email: "valid.role@kmutt.ac.th",
        role: "SUPER_ADMIN", // invalid
        initialPassword: "ValidPassword123!",
      });

    expect(resInvalidRole.status).toBe(400);
    expect(resInvalidRole.body.error.code).toBe("VALIDATION_ERROR");
  });

  // ===========================================================================
  // API-ADM-11: Update user details (name, department, role)
  // ===========================================================================
  it("API-ADM-11: updates user details successfully via PATCH (FR-06.4)", async () => {
    // Create dedicated user for PATCH update test
    const userToUpdate = await prisma.user.create({
      data: {
        name: "Initial Name",
        email: "user.to.update@kmutt.ac.th",
        department: "Initial Dept",
        role: "IT_STAFF",
        isActive: true,
        passwordHash: bcryptjs.hashSync("Password123!", 10),
      },
    });

    const res = await request(app)
      .patch(`/api/v1/admin/users/${userToUpdate.id}`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({
        name: "Updated Full Name",
        department: "Infrastructure & Network",
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.name).toBe("Updated Full Name");
    expect(res.body.data.department).toBe("Infrastructure & Network");
  });

  // ===========================================================================
  // API-ADM-12: Prevent self-deactivation (BR-11, AC-15.3)
  // ===========================================================================
  it("API-ADM-12: prevents Administrator from deactivating their own account with 400 (AC-15.3, BR-11)", async () => {
    const res = await request(app)
      .patch(`/api/v1/admin/users/${adminId}`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({
        isActive: false,
      });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe("CANNOT_DEACTIVATE_SELF");

    // Verify in database that admin is still active
    const check = await prisma.user.findUnique({ where: { id: adminId } });
    expect(check?.isActive).toBe(true);
  });

  // ===========================================================================
  // API-ADM-13: Prevent self-demotion (BR-11, AC-15.3)
  // ===========================================================================
  it("API-ADM-13: prevents Administrator from demoting their own role with 400 (AC-15.3, BR-11)", async () => {
    const res = await request(app)
      .patch(`/api/v1/admin/users/${adminId}`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({
        role: "IT_STAFF",
      });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe("CANNOT_DEMOTE_SELF");

    // Verify in database that admin is still ADMINISTRATOR
    const check = await prisma.user.findUnique({ where: { id: adminId } });
    expect(check?.role).toBe("ADMINISTRATOR");
  });

  // ===========================================================================
  // API-ADM-14: Protect last active administrator (BR-12, AC-15.4)
  // ===========================================================================
  it("API-ADM-14: rejects deactivation of the last active Administrator (AC-15.4, BR-12)", async () => {
    // Verify currently only 1 active admin exists in system
    const activeAdminCount = await prisma.user.count({
      where: { role: "ADMINISTRATOR", isActive: true },
    });
    expect(activeAdminCount).toBe(1);

    // Attempting to deactivate that single admin via another method or if id matched
    const res = await request(app)
      .patch(`/api/v1/admin/users/${adminId}`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({
        isActive: false,
      });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  // ===========================================================================
  // API-ADM-15: Allow deactivating second admin when another active admin exists
  // ===========================================================================
  it("API-ADM-15: allows deactivating an administrator when another active admin exists (BR-12)", async () => {
    // Create a second active administrator
    const secondAdmin = await prisma.user.create({
      data: {
        name: "Second Administrator",
        email: "second.admin@kmutt.ac.th",
        role: "ADMINISTRATOR",
        isActive: true,
        passwordHash: bcryptjs.hashSync("Password123!", 10),
        mustChangePassword: false,
      },
    });

    // Verify we now have 2 active admins
    const activeCount = await prisma.user.count({
      where: { role: "ADMINISTRATOR", isActive: true },
    });
    expect(activeCount).toBe(2);

    // Primary admin deactivates the second admin
    const res = await request(app)
      .patch(`/api/v1/admin/users/${secondAdmin.id}`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({
        isActive: false,
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.isActive).toBe(false);

    // Now try deactivating the second admin AGAIN or try demoting him when 1 active remains
    // Trying to demote the primary admin still fails because primary admin is now the only active admin
    const resDemoteLast = await request(app)
      .patch(`/api/v1/admin/users/${adminId}`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({
        role: "IT_STAFF",
      });

    expect(resDemoteLast.status).toBe(400);
  });

  // ===========================================================================
  // API-ADM-16: Reset user initial password (FR-06.5)
  // ===========================================================================
  it("API-ADM-16: resets user initial password and flags mustChangePassword = true (FR-06.5)", async () => {
    // Dedicated user for reset password test
    const resetUser = await prisma.user.create({
      data: {
        name: "Reset Target User",
        email: "reset.target@kmutt.ac.th",
        role: "IT_STAFF",
        isActive: true,
        passwordHash: bcryptjs.hashSync("OldPassword123!", 10),
        mustChangePassword: false,
      },
    });

    const res = await request(app)
      .post(`/api/v1/admin/users/${resetUser.id}/reset-password`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({
        newInitialPassword: "NewResetPassword2026!",
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.mustChangePassword).toBe(true);

    // Verify in database that mustChangePassword is true
    const check = await prisma.user.findUnique({ where: { id: resetUser.id } });
    expect(check?.mustChangePassword).toBe(true);
  });

  // ===========================================================================
  // API-ADM-17: User login after admin reset is forced to change password (BR-02)
  // ===========================================================================
  it("API-ADM-17: verifies user logging in with reset initial password is forced to change password (FR-02, BR-02)", async () => {
    // User reset.target logs in with the newly reset password
    const loginRes = await request(app)
      .post("/api/v1/auth/login")
      .send({
        email: "reset.target@kmutt.ac.th",
        password: "NewResetPassword2026!",
      });

    expect(loginRes.status).toBe(200);
    expect(loginRes.body.data.user.mustChangePassword).toBe(true);
    const resetUserToken = loginRes.body.data.token;

    // Trying to access operational route (e.g. staff queue) returns 403 PASSWORD_CHANGE_REQUIRED
    const queueRes = await request(app)
      .get("/api/v1/staff/tickets")
      .set("Authorization", `Bearer ${resetUserToken}`);

    expect(queueRes.status).toBe(403);
    expect(queueRes.body.error.code).toBe("PASSWORD_CHANGE_REQUIRED");
  });
});
