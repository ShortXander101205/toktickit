import { describe, it, expect, beforeAll, beforeEach } from "vitest";
import request from "supertest";
import { app } from "../../src/app.js";
import { getPrisma } from "../../src/prisma.js";
import { sessionService } from "../../src/services/session.service.js";
import { Priority, TicketStatus, Role } from "@prisma/client";
import bcryptjs from "bcryptjs";

describe("Issue 14: Authorization & Internal Notes Confidentiality API", () => {
  const prisma = getPrisma();

  let staffToken: string;
  let adminToken: string;
  let requester1Token: string;
  let requester2Token: string;

  let requester1Id: number;
  let requester2Id: number;
  let staffId: number;

  let ticket1Id: number;

  beforeAll(async () => {
    // 1. Prepare Requester 1 (Jennifer)
    const req1 = await prisma.user.upsert({
      where: { email: "jennifer.anderson@kmutt.ac.th" },
      update: {
        passwordHash: bcryptjs.hashSync("Password123!", 10),
        mustChangePassword: false,
        isActive: true,
        role: Role.REQUESTER,
      },
      create: {
        email: "jennifer.anderson@kmutt.ac.th",
        name: "Jennifer Anderson",
        passwordHash: bcryptjs.hashSync("Password123!", 10),
        mustChangePassword: false,
        isActive: true,
        role: Role.REQUESTER,
      },
    });
    requester1Id = req1.id;

    // 2. Prepare Requester 2 (Other Requester)
    const req2 = await prisma.user.upsert({
      where: { email: "auth.req2@kmutt.ac.th" },
      update: {
        passwordHash: bcryptjs.hashSync("Password123!", 10),
        mustChangePassword: false,
        isActive: true,
        role: Role.REQUESTER,
      },
      create: {
        email: "auth.req2@kmutt.ac.th",
        name: "Auth Requester 2",
        passwordHash: bcryptjs.hashSync("Password123!", 10),
        mustChangePassword: false,
        isActive: true,
        role: Role.REQUESTER,
      },
    });
    requester2Id = req2.id;

    // 3. Prepare IT Staff
    const staff = await prisma.user.upsert({
      where: { email: "sompong.it@kmutt.ac.th" },
      update: {
        passwordHash: bcryptjs.hashSync("Password123!", 10),
        mustChangePassword: false,
        isActive: true,
        role: Role.IT_STAFF,
      },
      create: {
        email: "sompong.it@kmutt.ac.th",
        name: "Sompong IT",
        passwordHash: bcryptjs.hashSync("Password123!", 10),
        mustChangePassword: false,
        isActive: true,
        role: Role.IT_STAFF,
      },
    });
    staffId = staff.id;

    // 4. Prepare Administrator
    await prisma.user.upsert({
      where: { email: "admin@kmutt.ac.th" },
      update: {
        passwordHash: bcryptjs.hashSync("Password123!", 10),
        mustChangePassword: false,
        isActive: true,
        role: Role.ADMINISTRATOR,
      },
      create: {
        email: "admin@kmutt.ac.th",
        name: "System Admin",
        passwordHash: bcryptjs.hashSync("Password123!", 10),
        mustChangePassword: false,
        isActive: true,
        role: Role.ADMINISTRATOR,
      },
    });

    // 5. Category & Related System
    const cat = await prisma.category.findFirst() || await prisma.category.create({
      data: { code: "HW", name: "Hardware", description: "Hardware" },
    });
    const relSys = await prisma.relatedSystem.findFirst() || await prisma.relatedSystem.create({
      data: { name: "Campus Network" },
    });

    // 6. Create Ticket owned by Requester 1 with both Public Comment and Internal Note
    const ticket1 = await prisma.ticket.create({
      data: {
        ticketNumber: `TK-AUTH-${Date.now()}`,
        summary: "Confidentiality Audit Ticket",
        description: "Verify that internal notes are strictly stripped for requesters.",
        categoryId: cat.id,
        relatedSystemId: relSys.id,
        requestedPriority: Priority.MEDIUM,
        currentStatus: TicketStatus.IN_PROGRESS,
        requesterId: requester1Id,
        publicComments: {
          create: {
            authorId: requester1Id,
            content: "This is a public comment from requester 1.",
          },
        },
        internalNotes: {
          create: {
            authorId: staffId,
            content: "CONFIDENTIAL_PASSWORD_RESET_TOKEN_12345",
          },
        },
      },
    });
    ticket1Id = ticket1.id;
  });

  beforeEach(async () => {
    sessionService.clearAllSessions();

    const staffLogin = await request(app)
      .post("/api/v1/auth/login")
      .send({ email: "sompong.it@kmutt.ac.th", password: "Password123!" });
    staffToken = staffLogin.body.data.token;

    const adminLogin = await request(app)
      .post("/api/v1/auth/login")
      .send({ email: "admin@kmutt.ac.th", password: "Password123!" });
    adminToken = adminLogin.body.data.token;

    const req1Login = await request(app)
      .post("/api/v1/auth/login")
      .send({ email: "jennifer.anderson@kmutt.ac.th", password: "Password123!" });
    requester1Token = req1Login.body.data.token;

    const req2Login = await request(app)
      .post("/api/v1/auth/login")
      .send({ email: "auth.req2@kmutt.ac.th", password: "Password123!" });
    requester2Token = req2Login.body.data.token;
  });

  // =========================================================================
  // 1. Internal Notes Confidentiality & Redaction (AC-14.3 / BR-04)
  // =========================================================================
  describe("GET /api/v1/tickets/:id - Confidentiality Redaction", () => {
    it("BR-04 / AC-14.3: strictly strips internalNotes from payload for owning Requester", async () => {
      const res = await request(app)
        .get(`/api/v1/tickets/${ticket1Id}`)
        .set("Authorization", `Bearer ${requester1Token}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);

      // Verify publicComments are present
      expect(res.body.data.publicComments).toBeDefined();
      expect(res.body.data.publicComments.length).toBeGreaterThanOrEqual(1);

      // STRICT INVARIANT (BR-04): internalNotes must NOT exist in the JSON payload
      expect(res.body.data.internalNotes).toBeUndefined();
      expect(JSON.stringify(res.body)).not.toContain("CONFIDENTIAL_PASSWORD_RESET_TOKEN_12345");
    });

    it("BR-04 / AC-14.3: includes internalNotes in payload for IT Staff", async () => {
      const res = await request(app)
        .get(`/api/v1/tickets/${ticket1Id}`)
        .set("Authorization", `Bearer ${staffToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.internalNotes).toBeDefined();
      expect(res.body.data.internalNotes.length).toBeGreaterThanOrEqual(1);
      expect(res.body.data.internalNotes[0].content).toContain("CONFIDENTIAL_PASSWORD_RESET_TOKEN_12345");
    });

    it("BR-04 / AC-14.3: includes internalNotes in payload for Administrator", async () => {
      const res = await request(app)
        .get(`/api/v1/tickets/${ticket1Id}`)
        .set("Authorization", `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.internalNotes).toBeDefined();
      expect(res.body.data.internalNotes[0].content).toContain("CONFIDENTIAL_PASSWORD_RESET_TOKEN_12345");
    });
  });

  // =========================================================================
  // 2. Cross-Requester Ticket Isolation (AC-14.3 / BR-04)
  // =========================================================================
  describe("Cross-Requester Ticket Isolation", () => {
    it("BR-04: blocks Requester 2 from accessing Requester 1's ticket with 403 Forbidden", async () => {
      const res = await request(app)
        .get(`/api/v1/tickets/${ticket1Id}`)
        .set("Authorization", `Bearer ${requester2Token}`);

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe("FORBIDDEN_TICKET_ACCESS");
    });
  });

  // =========================================================================
  // 3. Unauthenticated Route Guards
  // =========================================================================
  describe("Unauthenticated Access Protection", () => {
    it("returns 401 Unauthorized when unauthenticated user accesses staff routes", async () => {
      const res = await request(app)
        .get("/api/v1/staff/tickets");

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });

    it("returns 401 Unauthorized when unauthenticated user attempts assignment", async () => {
      const res = await request(app)
        .patch(`/api/v1/staff/tickets/${ticket1Id}/assignment`)
        .send({ ownerId: staffId });

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });
  });
});
