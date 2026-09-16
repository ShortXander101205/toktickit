import { describe, it, expect, beforeAll, beforeEach } from "vitest";
import request from "supertest";
import { app } from "../../src/app.js";
import { getPrisma } from "../../src/prisma.js";
import { sessionService } from "../../src/services/session.service.js";
import { Priority, TicketStatus, Role } from "@prisma/client";
import bcryptjs from "bcryptjs";

describe("Issue 14: Comments & Internal Notes API", () => {
  const prisma = getPrisma();

  let staffToken: string;
  let adminToken: string;
  let requesterToken: string;
  let otherRequesterToken: string;

  let testTicketId: number;
  let requesterUserId: number;

  beforeAll(async () => {
    // 1. Prepare IT Staff user
    await prisma.user.upsert({
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

    // 2. Prepare Administrator user
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

    // 3. Prepare Requester 1 (Jennifer)
    const req = await prisma.user.upsert({
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
    requesterUserId = req.id;

    // 4. Prepare Requester 2 (Other Requester)
    await prisma.user.upsert({
      where: { email: "comments.req2@kmutt.ac.th" },
      update: {
        passwordHash: bcryptjs.hashSync("Password123!", 10),
        mustChangePassword: false,
        isActive: true,
        role: Role.REQUESTER,
      },
      create: {
        email: "comments.req2@kmutt.ac.th",
        name: "Comments Requester 2",
        passwordHash: bcryptjs.hashSync("Password123!", 10),
        mustChangePassword: false,
        isActive: true,
        role: Role.REQUESTER,
      },
    });

    // 5. Category & Related System
    const cat = await prisma.category.findFirst() || await prisma.category.create({
      data: { code: "HW", name: "Hardware", description: "Hardware" },
    });
    const relSys = await prisma.relatedSystem.findFirst() || await prisma.relatedSystem.create({
      data: { name: "Campus Network" },
    });

    // 6. Test ticket
    const ticket = await prisma.ticket.create({
      data: {
        ticketNumber: `TK-COMM-${Date.now()}`,
        summary: "Comments & Notes Verification Ticket",
        description: "Checking multi-role discussions and confidential notes lifecycle.",
        categoryId: cat.id,
        relatedSystemId: relSys.id,
        requestedPriority: Priority.HIGH,
        currentStatus: TicketStatus.OPEN,
        requesterId: requesterUserId,
      },
    });
    testTicketId = ticket.id;
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

    const reqLogin = await request(app)
      .post("/api/v1/auth/login")
      .send({ email: "jennifer.anderson@kmutt.ac.th", password: "Password123!" });
    requesterToken = reqLogin.body.data.token;

    const otherReqLogin = await request(app)
      .post("/api/v1/auth/login")
      .send({ email: "comments.req2@kmutt.ac.th", password: "Password123!" });
    otherRequesterToken = otherReqLogin.body.data.token;
  });

  // =========================================================================
  // 1. Public Comments (AC-14.2 / API-12)
  // =========================================================================
  describe("POST /api/v1/tickets/:id/comments", () => {
    it("AC-14.2 / API-12: owning requester posts public comment", async () => {
      const res = await request(app)
        .post(`/api/v1/tickets/${testTicketId}/comments`)
        .set("Authorization", `Bearer ${requesterToken}`)
        .send({ content: "Here is the error message screenshot description." });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.author.role).toBe("REQUESTER");
      expect(res.body.data.content).toBe("Here is the error message screenshot description.");
    });

    it("AC-14.2 / API-12: IT Staff posts public comment", async () => {
      const res = await request(app)
        .post(`/api/v1/tickets/${testTicketId}/comments`)
        .set("Authorization", `Bearer ${staffToken}`)
        .send({ content: "We are investigating the network router now." });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.author.role).toBe("IT_STAFF");
      expect(res.body.data.content).toBe("We are investigating the network router now.");
    });

    it("AC-14.2 / API-12: Administrator posts public comment", async () => {
      const res = await request(app)
        .post(`/api/v1/tickets/${testTicketId}/comments`)
        .set("Authorization", `Bearer ${adminToken}`)
        .send({ content: "Escalating ticket to tier 3 network team." });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.author.role).toBe("ADMINISTRATOR");
    });

    it("BR-04: non-owning requester receives 403 Forbidden", async () => {
      const res = await request(app)
        .post(`/api/v1/tickets/${testTicketId}/comments`)
        .set("Authorization", `Bearer ${otherRequesterToken}`)
        .send({ content: "Intruder attempting to comment on someone else's ticket." });

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
    });

    it("BR-08: rejects empty comment or whitespace with 422 Unprocessable Entity", async () => {
      const res = await request(app)
        .post(`/api/v1/tickets/${testTicketId}/comments`)
        .set("Authorization", `Bearer ${staffToken}`)
        .send({ content: "   " });

      expect(res.status).toBe(422);
      expect(res.body.success).toBe(false);
    });

    it("BR-08: rejects comment exceeding 2000 characters with 422 Unprocessable Entity", async () => {
      const res = await request(app)
        .post(`/api/v1/tickets/${testTicketId}/comments`)
        .set("Authorization", `Bearer ${staffToken}`)
        .send({ content: "A".repeat(2001) });

      expect(res.status).toBe(422);
      expect(res.body.success).toBe(false);
    });
  });

  // =========================================================================
  // 2. Confidential Internal Notes (AC-14.2 / API-13)
  // =========================================================================
  describe("POST /api/v1/tickets/:id/notes", () => {
    it("AC-14.2 / API-13: IT Staff posts confidential internal note", async () => {
      const res = await request(app)
        .post(`/api/v1/tickets/${testTicketId}/notes`)
        .set("Authorization", `Bearer ${staffToken}`)
        .send({ content: "Internal diagnostic: checking syslog on switch 10.0.4.1." });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.author.role).toBe("IT_STAFF");
      expect(res.body.data.content).toBe("Internal diagnostic: checking syslog on switch 10.0.4.1.");
    });

    it("AC-14.2 / API-13: Administrator posts confidential internal note", async () => {
      const res = await request(app)
        .post(`/api/v1/tickets/${testTicketId}/notes`)
        .set("Authorization", `Bearer ${adminToken}`)
        .send({ content: "Admin approval granted to reboot switch." });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.author.role).toBe("ADMINISTRATOR");
    });

    it("BR-04 / API-13: Requester receives 403 Forbidden when attempting to record internal note", async () => {
      const res = await request(app)
        .post(`/api/v1/tickets/${testTicketId}/notes`)
        .set("Authorization", `Bearer ${requesterToken}`)
        .send({ content: "Requester trying to write internal note." });

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe("FORBIDDEN_INTERNAL_NOTES");
    });

    it("BR-08: rejects empty internal note with 422 Unprocessable Entity", async () => {
      const res = await request(app)
        .post(`/api/v1/tickets/${testTicketId}/notes`)
        .set("Authorization", `Bearer ${staffToken}`)
        .send({ content: "" });

      expect(res.status).toBe(422);
      expect(res.body.success).toBe(false);
    });

    it("BR-08: rejects internal note exceeding 2000 characters with 422 Unprocessable Entity", async () => {
      const res = await request(app)
        .post(`/api/v1/tickets/${testTicketId}/notes`)
        .set("Authorization", `Bearer ${staffToken}`)
        .send({ content: "X".repeat(2001) });

      expect(res.status).toBe(422);
      expect(res.body.success).toBe(false);
    });
  });

  // =========================================================================
  // 3. Immutability & Append-Only Verification (BR-08)
  // =========================================================================
  describe("Immutability verification", () => {
    it("BR-08: verifies no update or delete routes exist for comments or notes", async () => {
      const patchRes = await request(app)
        .patch(`/api/v1/tickets/${testTicketId}/comments/1`)
        .set("Authorization", `Bearer ${staffToken}`)
        .send({ content: "Attempted edit" });
      expect([404, 405]).toContain(patchRes.status);

      const deleteRes = await request(app)
        .delete(`/api/v1/tickets/${testTicketId}/notes/1`)
        .set("Authorization", `Bearer ${staffToken}`);
      expect([404, 405]).toContain(deleteRes.status);
    });
  });
});
