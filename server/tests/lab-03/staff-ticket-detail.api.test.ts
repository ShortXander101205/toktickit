import { describe, it, expect, beforeAll, beforeEach } from "vitest";
import request from "supertest";
import { app } from "../../src/app.js";
import { getPrisma } from "../../src/prisma.js";
import { sessionService } from "../../src/services/session.service.js";
import { Priority, TicketStatus, Role } from "@prisma/client";
import bcryptjs from "bcryptjs";

describe("Issue 14: IT Staff Ticket Detail & Operational Controls API", () => {
  const prisma = getPrisma();

  let staffToken: string;
  let adminToken: string;
  let requesterToken: string;
  let otherRequesterToken: string;

  let sompongStaffId: number;
  let wichaiStaffId: number;
  let adminUserId: number;
  let requesterUserId: number;
  let otherRequesterId: number;

  let testTicketId: number;

  beforeAll(async () => {
    // 1. Prepare IT Staff user (Sompong)
    const sompong = await prisma.user.upsert({
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
    sompongStaffId = sompong.id;

    // 2. Prepare second IT Staff user (Wichai)
    const wichai = await prisma.user.upsert({
      where: { email: "wichai.sup@kmutt.ac.th" },
      update: {
        passwordHash: bcryptjs.hashSync("Password123!", 10),
        mustChangePassword: false,
        isActive: true,
        role: Role.IT_STAFF,
      },
      create: {
        email: "wichai.sup@kmutt.ac.th",
        name: "Wichai Support",
        passwordHash: bcryptjs.hashSync("Password123!", 10),
        mustChangePassword: false,
        isActive: true,
        role: Role.IT_STAFF,
      },
    });
    wichaiStaffId = wichai.id;

    // 3. Prepare Administrator user
    const admin = await prisma.user.upsert({
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
    adminUserId = admin.id;

    // 4. Prepare Requester 1 (Jennifer)
    const requester = await prisma.user.upsert({
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
    requesterUserId = requester.id;

    // 5. Prepare Requester 2 (Other Requester)
    const otherRequester = await prisma.user.upsert({
      where: { email: "staffdetail.req2@kmutt.ac.th" },
      update: {
        passwordHash: bcryptjs.hashSync("Password123!", 10),
        mustChangePassword: false,
        isActive: true,
        role: Role.REQUESTER,
      },
      create: {
        email: "staffdetail.req2@kmutt.ac.th",
        name: "Other Requester",
        passwordHash: bcryptjs.hashSync("Password123!", 10),
        mustChangePassword: false,
        isActive: true,
        role: Role.REQUESTER,
      },
    });
    otherRequesterId = otherRequester.id;

    // 6. Ensure related system and category exist
    const cat = await prisma.category.findFirst() || await prisma.category.create({
      data: { code: "HW", name: "Hardware", description: "Hardware issues" },
    });
    const relSys = await prisma.relatedSystem.findFirst() || await prisma.relatedSystem.create({
      data: { name: "Campus Network" },
    });

    // 7. Seed test ticket owned by requesterUserId
    const ticket = await prisma.ticket.create({
      data: {
        ticketNumber: `TK-TEST-${Date.now()}`,
        summary: "Operational API Test Ticket",
        description: "Testing ownership assignment, priority updates, and status transitions.",
        categoryId: cat.id,
        relatedSystemId: relSys.id,
        requestedPriority: Priority.MEDIUM,
        itPriority: null,
        currentStatus: TicketStatus.NEW,
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
      .send({ email: "staffdetail.req2@kmutt.ac.th", password: "Password123!" });
    otherRequesterToken = otherReqLogin.body.data.token;
  });

  // =========================================================================
  // 1. Ticket Ownership Assignment & Reassignment (AC-14.1 / API-09)
  // =========================================================================
  describe("PATCH /api/v1/staff/tickets/:id/assignment", () => {
    it("AC-14.1 / API-09: successfully assigns ticket to active IT Staff member", async () => {
      const res = await request(app)
        .patch(`/api/v1/staff/tickets/${testTicketId}/assignment`)
        .set("Authorization", `Bearer ${staffToken}`)
        .send({ ownerId: sompongStaffId });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.id).toBe(testTicketId);
      expect(res.body.data.ownerId).toBe(sompongStaffId);
      expect(res.body.data.owner.name).toBe("Sompong IT");
    });

    it("AC-14.1 / API-09: successfully reassigns ticket to another IT Staff member", async () => {
      const res = await request(app)
        .patch(`/api/v1/staff/tickets/${testTicketId}/assignment`)
        .set("Authorization", `Bearer ${adminToken}`)
        .send({ ownerId: wichaiStaffId });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.ownerId).toBe(wichaiStaffId);
      expect(res.body.data.owner.name).toBe("Wichai Support");
    });

    it("AC-14.1 / API-09: successfully unassigns ticket when ownerId is null", async () => {
      const res = await request(app)
        .patch(`/api/v1/staff/tickets/${testTicketId}/assignment`)
        .set("Authorization", `Bearer ${staffToken}`)
        .send({ ownerId: null });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.ownerId).toBeNull();
      expect(res.body.data.owner).toBeNull();
    });

    it("BR-06 / API-09: rejects assignment to a user with role REQUESTER with 422 Unprocessable Entity", async () => {
      const res = await request(app)
        .patch(`/api/v1/staff/tickets/${testTicketId}/assignment`)
        .set("Authorization", `Bearer ${staffToken}`)
        .send({ ownerId: requesterUserId });

      expect(res.status).toBe(422);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe("INVALID_OWNER");
    });

    it("BR-06: rejects non-staff/admin caller with 403 Forbidden", async () => {
      const res = await request(app)
        .patch(`/api/v1/staff/tickets/${testTicketId}/assignment`)
        .set("Authorization", `Bearer ${requesterToken}`)
        .send({ ownerId: sompongStaffId });

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
    });
  });

  // =========================================================================
  // 2. IT Priority Management (AC-14.1 / API-10)
  // =========================================================================
  describe("PATCH /api/v1/staff/tickets/:id/priority", () => {
    it("AC-14.1 / API-10: updates IT priority to URGENT", async () => {
      const res = await request(app)
        .patch(`/api/v1/staff/tickets/${testTicketId}/priority`)
        .set("Authorization", `Bearer ${staffToken}`)
        .send({ itPriority: "URGENT" });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.itPriority).toBe("URGENT");
    });

    it("AC-14.1 / API-10: updates IT priority to LOW", async () => {
      const res = await request(app)
        .patch(`/api/v1/staff/tickets/${testTicketId}/priority`)
        .set("Authorization", `Bearer ${staffToken}`)
        .send({ itPriority: "LOW" });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.itPriority).toBe("LOW");
    });

    it("BR-07 / API-10: rejects invalid IT priority with 422 Unprocessable Entity", async () => {
      const res = await request(app)
        .patch(`/api/v1/staff/tickets/${testTicketId}/priority`)
        .set("Authorization", `Bearer ${staffToken}`)
        .send({ itPriority: "CRITICAL_INVALID" });

      expect(res.status).toBe(422);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe("INVALID_PRIORITY");
    });

    it("BR-07: rejects non-staff/admin caller with 403 Forbidden", async () => {
      const res = await request(app)
        .patch(`/api/v1/staff/tickets/${testTicketId}/priority`)
        .set("Authorization", `Bearer ${requesterToken}`)
        .send({ itPriority: "HIGH" });

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
    });
  });

  // =========================================================================
  // 3. Status Workflow Transitions Engine (AC-14.1 / API-11)
  // =========================================================================
  describe("PATCH /api/v1/staff/tickets/:id/status", () => {
    it("AC-14.1 / API-11: executes valid status transitions according to Status Transition Matrix", async () => {
      // 1. NEW -> OPEN
      let res = await request(app)
        .patch(`/api/v1/staff/tickets/${testTicketId}/status`)
        .set("Authorization", `Bearer ${staffToken}`)
        .send({ targetStatus: "OPEN" });
      expect(res.status).toBe(200);
      expect(res.body.data.currentStatus).toBe("OPEN");

      // 2. OPEN -> IN_PROGRESS
      res = await request(app)
        .patch(`/api/v1/staff/tickets/${testTicketId}/status`)
        .set("Authorization", `Bearer ${staffToken}`)
        .send({ targetStatus: "IN_PROGRESS" });
      expect(res.status).toBe(200);
      expect(res.body.data.currentStatus).toBe("IN_PROGRESS");

      // 3. IN_PROGRESS -> WAITING_FOR_REQUESTER
      res = await request(app)
        .patch(`/api/v1/staff/tickets/${testTicketId}/status`)
        .set("Authorization", `Bearer ${staffToken}`)
        .send({ targetStatus: "WAITING_FOR_REQUESTER" });
      expect(res.status).toBe(200);
      expect(res.body.data.currentStatus).toBe("WAITING_FOR_REQUESTER");

      // 4. WAITING_FOR_REQUESTER -> RESOLVED
      res = await request(app)
        .patch(`/api/v1/staff/tickets/${testTicketId}/status`)
        .set("Authorization", `Bearer ${staffToken}`)
        .send({ targetStatus: "RESOLVED" });
      expect(res.status).toBe(200);
      expect(res.body.data.currentStatus).toBe("RESOLVED");

      // 5. RESOLVED -> CLOSED
      res = await request(app)
        .patch(`/api/v1/staff/tickets/${testTicketId}/status`)
        .set("Authorization", `Bearer ${staffToken}`)
        .send({ targetStatus: "CLOSED" });
      expect(res.status).toBe(200);
      expect(res.body.data.currentStatus).toBe("CLOSED");

      // 6. CLOSED -> REOPENED
      res = await request(app)
        .patch(`/api/v1/staff/tickets/${testTicketId}/status`)
        .set("Authorization", `Bearer ${staffToken}`)
        .send({ targetStatus: "REOPENED" });
      expect(res.status).toBe(200);
      expect(res.body.data.currentStatus).toBe("REOPENED");
    });

    it("AC-14.1 / API-11: rejects invalid transition from CLOSED to IN_PROGRESS with 422", async () => {
      // Set ticket directly to CLOSED
      await prisma.ticket.update({
        where: { id: testTicketId },
        data: { currentStatus: TicketStatus.CLOSED },
      });

      const res = await request(app)
        .patch(`/api/v1/staff/tickets/${testTicketId}/status`)
        .set("Authorization", `Bearer ${staffToken}`)
        .send({ targetStatus: "IN_PROGRESS" });

      expect(res.status).toBe(422);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe("INVALID_STATUS_TRANSITION");
    });

    it("BR-02 / Matrix: rejects non-staff/admin caller with 403 Forbidden", async () => {
      const res = await request(app)
        .patch(`/api/v1/staff/tickets/${testTicketId}/status`)
        .set("Authorization", `Bearer ${requesterToken}`)
        .send({ targetStatus: "RESOLVED" });

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
    });
  });

  // =========================================================================
  // 4. Requester Problem Resolution Indication (AC-14.4 / API-14)
  // =========================================================================
  describe("POST /api/v1/tickets/:id/resolve-request", () => {
    it("AC-14.4 / API-14: owning requester indicates problem resolution and records timestamp without modifying status", async () => {
      // Ensure ticket is in IN_PROGRESS status
      await prisma.ticket.update({
        where: { id: testTicketId },
        data: {
          currentStatus: TicketStatus.IN_PROGRESS,
          requesterResolutionConfirmedAt: null,
        },
      });

      const res = await request(app)
        .post(`/api/v1/tickets/${testTicketId}/resolve-request`)
        .set("Authorization", `Bearer ${requesterToken}`)
        .send({});

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.requesterResolutionConfirmedAt).toBeTruthy();

      // INVARIANT (BR-05): Check that currentStatus remains IN_PROGRESS
      const updatedInDb = await prisma.ticket.findUnique({ where: { id: testTicketId } });
      expect(updatedInDb?.currentStatus).toBe(TicketStatus.IN_PROGRESS);
      expect(updatedInDb?.requesterResolutionConfirmedAt).not.toBeNull();
    });

    it("BR-05: non-owning requester receives 403 Forbidden", async () => {
      const res = await request(app)
        .post(`/api/v1/tickets/${testTicketId}/resolve-request`)
        .set("Authorization", `Bearer ${otherRequesterToken}`)
        .send({});

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe("FORBIDDEN_ACTION");
    });
  });
});
