import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import request from "supertest";
import { app } from "../../src/app.js";
import { getPrisma } from "../../src/prisma.js";
import { sessionService } from "../../src/services/session.service.js";
import bcryptjs from "bcryptjs";

describe("Issue 13: IT Staff Ticket Queue & List Queries API", () => {
  const prisma = getPrisma();

  let itStaffToken: string;
  let adminToken: string;
  let requesterToken: string;
  let unrotatedStaffToken: string;

  let sompongId: number;
  let wichaiId: number;
  let softwareCatId: number;

  beforeAll(async () => {
    // 1. Ensure Sompong IT and Admin have mustChangePassword = false for regular testing
    const sompong = await prisma.user.update({
      where: { email: "sompong.it@kmutt.ac.th" },
      data: {
        passwordHash: bcryptjs.hashSync("Password123!", 10),
        mustChangePassword: false,
        isActive: true,
      },
    });
    sompongId = sompong.id;

    const wichai = await prisma.user.update({
      where: { email: "wichai.sup@kmutt.ac.th" },
      data: {
        passwordHash: bcryptjs.hashSync("Password123!", 10),
        mustChangePassword: false,
        isActive: true,
      },
    });
    wichaiId = wichai.id;

    await prisma.user.update({
      where: { email: "admin@kmutt.ac.th" },
      data: {
        passwordHash: bcryptjs.hashSync("Password123!", 10),
        mustChangePassword: false,
        isActive: true,
      },
    });

    // Requester with mustChangePassword = false (use seeded test.requester)
    await prisma.user.update({
      where: { email: "sarah.johnson@kmutt.ac.th" },
      data: {
        passwordHash: bcryptjs.hashSync("Password123!", 10),
        mustChangePassword: true,
        isActive: true,
      },
    });

    // IT Staff with mustChangePassword = true for BR-02 test
    await prisma.user.update({
      where: { email: "anong.net@kmutt.ac.th" },
      data: {
        passwordHash: bcryptjs.hashSync("Password123!", 10),
        mustChangePassword: true,
        isActive: true,
      },
    });

    // Lookup category id for software
    const swCat = await prisma.category.findUnique({ where: { code: "SW" } });
    if (swCat) softwareCatId = swCat.id;
  });

  beforeEach(async () => {
    sessionService.clearAllSessions();

    // Acquire active session tokens for test roles
    const staffLogin = await request(app)
      .post("/api/v1/auth/login")
      .send({ email: "sompong.it@kmutt.ac.th", password: "Password123!" });
    itStaffToken = staffLogin.body.data.token;

    const adminLogin = await request(app)
      .post("/api/v1/auth/login")
      .send({ email: "admin@kmutt.ac.th", password: "Password123!" });
    adminToken = adminLogin.body.data.token;

    const reqLogin = await request(app)
      .post("/api/v1/auth/login")
      .send({ email: "test.requester@kmutt.ac.th", password: "Password123!" });
    requesterToken = reqLogin.body.data.token;

    const unrotatedLogin = await request(app)
      .post("/api/v1/auth/login")
      .send({ email: "anong.net@kmutt.ac.th", password: "Password123!" });
    unrotatedStaffToken = unrotatedLogin.body.data.token;
  });

  // =========================================================================
  // AC-13.1: Staff Shared Queue Retrieval & Metadata (API-06)
  // =========================================================================
  it("AC-13.1 / API-06: returns HTTP 200 with paginated queue and complete ticket metadata for IT Staff", async () => {
    const res = await request(app)
      .get("/api/v1/staff/tickets")
      .set("Authorization", `Bearer ${itStaffToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toBeDefined();
    expect(Array.isArray(res.body.data.items)).toBe(true);
    expect(res.body.data.items.length).toBeGreaterThan(0);
    expect(res.body.data.totalCount).toBeGreaterThan(0);
    expect(res.body.data.page).toBe(1);
    expect(res.body.data.pageSize).toBe(10);
    expect(res.body.data.totalPages).toBeGreaterThan(0);

    // Verify dual pagination envelope
    expect(res.body.data.pagination).toBeDefined();
    expect(res.body.data.pagination.totalCount).toBe(res.body.data.totalCount);

    // Verify ticket item attributes
    const item = res.body.data.items[0];
    expect(item.id).toBeDefined();
    expect(item.ticketNumber).toMatch(/^TKT-\d{4}-\d{5}$/);
    expect(item.summary).toBeDefined();
    expect(item.createdAt).toBeDefined();
    expect(item.category).toBeDefined();
    expect(item.category.name).toBeDefined();
    expect(item.relatedSystem).toBeDefined();
    expect(item.requestedPriority).toBeDefined();
    expect(item.itPriority).toBeDefined();
    expect(item.currentStatus).toBeDefined();
    expect(item.requester).toBeDefined();
    expect(item.requester.name).toBeDefined();
  });

  it("AC-13.1 / API-06: allows Administrator to retrieve shared staff queue", async () => {
    const res = await request(app)
      .get("/api/v1/staff/tickets")
      .set("Authorization", `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data.items)).toBe(true);
    expect(res.body.data.items.length).toBeGreaterThan(0);
  });

  // =========================================================================
  // AC-13.2: Authorization Rejections (API-08)
  // =========================================================================
  it("AC-13.2 / API-08: rejects Requester access with HTTP 403 Forbidden (BR-06)", async () => {
    const res = await request(app)
      .get("/api/v1/staff/tickets")
      .set("Authorization", `Bearer ${requesterToken}`);

    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
    expect(res.body.error).toBeDefined();
    expect(res.body.error.code).toBe("FORBIDDEN");
    expect(res.body.error.message).toMatch(/IT Staff or Administrator/i);
  });

  it("AC-13.2 / API-08: rejects unauthenticated requests with HTTP 401 Unauthorized", async () => {
    const res = await request(app).get("/api/v1/staff/tickets");

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe("UNAUTHORIZED");
  });

  it("AC-13.2 / API-08: blocks IT Staff requiring password change with HTTP 403 Forbidden (BR-02)", async () => {
    const res = await request(app)
      .get("/api/v1/staff/tickets")
      .set("Authorization", `Bearer ${unrotatedStaffToken}`);

    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe("PASSWORD_CHANGE_REQUIRED");
  });

  // =========================================================================
  // AC-13.3: Search & Multi-Field Filtering (API-07)
  // =========================================================================
  it("AC-13.3 / API-07: searches tickets by partial text match on summary and ticketNumber", async () => {
    const res = await request(app)
      .get("/api/v1/staff/tickets?search=Wi-Fi")
      .set("Authorization", `Bearer ${itStaffToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    for (const item of res.body.data.items) {
      const match =
        item.summary.toLowerCase().includes("wi-fi") ||
        item.ticketNumber.toLowerCase().includes("wi-fi");
      expect(match).toBe(true);
    }
  });

  it("AC-13.3 / API-07: filters tickets by status", async () => {
    const res = await request(app)
      .get("/api/v1/staff/tickets?status=IN_PROGRESS")
      .set("Authorization", `Bearer ${itStaffToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    for (const item of res.body.data.items) {
      expect(item.currentStatus).toBe("IN_PROGRESS");
    }
  });

  it("AC-13.3 / API-07: normalizes status aliases ASSIGNED and PENDING_REQUESTER", async () => {
    const resAssigned = await request(app)
      .get("/api/v1/staff/tickets?status=ASSIGNED")
      .set("Authorization", `Bearer ${itStaffToken}`);

    expect(resAssigned.status).toBe(200);
    for (const item of resAssigned.body.data.items) {
      expect(item.currentStatus).toBe("OPEN");
    }

    const resPending = await request(app)
      .get("/api/v1/staff/tickets?status=PENDING_REQUESTER")
      .set("Authorization", `Bearer ${itStaffToken}`);

    expect(resPending.status).toBe(200);
    for (const item of resPending.body.data.items) {
      expect(item.currentStatus).toBe("WAITING_FOR_REQUESTER");
    }
  });

  it("AC-13.3 / API-07: filters tickets by category and itPriority", async () => {
    if (!softwareCatId) return;

    const res = await request(app)
      .get(`/api/v1/staff/tickets?category=${softwareCatId}&itPriority=HIGH`)
      .set("Authorization", `Bearer ${itStaffToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    for (const item of res.body.data.items) {
      expect(item.category.id).toBe(softwareCatId);
      expect(item.itPriority).toBe("HIGH");
    }
  });

  it("AC-13.3 / API-07: filters unassigned tickets using owner=unassigned", async () => {
    const res = await request(app)
      .get("/api/v1/staff/tickets?owner=unassigned")
      .set("Authorization", `Bearer ${itStaffToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    for (const item of res.body.data.items) {
      expect(item.owner).toBeNull();
    }
  });

  it("AC-13.3 / API-07: filters tickets assigned to specific staff owner", async () => {
    const res = await request(app)
      .get(`/api/v1/staff/tickets?owner=${sompongId}`)
      .set("Authorization", `Bearer ${itStaffToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    for (const item of res.body.data.items) {
      expect(item.owner).not.toBeNull();
      expect(item.owner.id).toBe(sompongId);
    }
  });

  // =========================================================================
  // AC-13.1: Pagination and Sorting (API-06)
  // =========================================================================
  it("AC-13.1 / API-06: respects page and pageSize query parameters", async () => {
    const resPage1 = await request(app)
      .get("/api/v1/staff/tickets?page=1&pageSize=10")
      .set("Authorization", `Bearer ${itStaffToken}`);

    expect(resPage1.status).toBe(200);
    expect(resPage1.body.data.items.length).toBeLessThanOrEqual(10);
    expect(resPage1.body.data.page).toBe(1);
    expect(resPage1.body.data.pageSize).toBe(10);

    if (resPage1.body.data.totalPages > 1) {
      const resPage2 = await request(app)
        .get("/api/v1/staff/tickets?page=2&pageSize=10")
        .set("Authorization", `Bearer ${itStaffToken}`);

      expect(resPage2.status).toBe(200);
      expect(resPage2.body.data.page).toBe(2);
      expect(resPage2.body.data.items[0].id).not.toBe(resPage1.body.data.items[0].id);
    }
  });

  it("AC-13.1 / API-06: sorts tickets dynamically by ticketNumber ascending", async () => {
    const res = await request(app)
      .get("/api/v1/staff/tickets?sortBy=ticketNumber&sortOrder=asc&pageSize=25")
      .set("Authorization", `Bearer ${itStaffToken}`);

    expect(res.status).toBe(200);
    const items = res.body.data.items;
    for (let i = 1; i < items.length; i++) {
      expect(items[i].ticketNumber >= items[i - 1].ticketNumber).toBe(true);
    }
  });

  it("rejects invalid query parameters with HTTP 400 Bad Request", async () => {
    const res = await request(app)
      .get("/api/v1/staff/tickets?status=INVALID_STATUS&itPriority=SUPER_URGENT")
      .set("Authorization", `Bearer ${itStaffToken}`);

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe("INVALID_QUERY_PARAMETERS");
    expect(res.body.error.fieldErrors.length).toBe(2);
  });

  afterAll(async () => {
    // Restore sarah.johnson to mustChangePassword = true for auth tests
    await prisma.user.update({
      where: { email: "sarah.johnson@kmutt.ac.th" },
      data: {
        passwordHash: bcryptjs.hashSync("Password123!", 10),
        mustChangePassword: true,
        isActive: true,
      },
    });
  });
});
