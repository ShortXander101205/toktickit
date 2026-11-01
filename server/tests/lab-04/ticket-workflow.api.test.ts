import { describe, it, expect, beforeAll, beforeEach, afterAll } from "vitest";
import request from "supertest";
import { app } from "../../src/app.js";
import { getPrisma } from "../../src/prisma.js";
import { sessionService } from "../../src/services/session.service.js";
import { Priority, TicketStatus, Role } from "@prisma/client";
import bcryptjs from "bcryptjs";

describe("Issue 20: Ticket Status Lifecycle, Concurrency & Resolution Gate API (BR-06, BR-07, BR-08, BR-09)", () => {
  const prisma = getPrisma();

  let staffUser: { id: number; email: string };
  let adminUser: { id: number; email: string };
  let requesterUser: { id: number; email: string };
  let otherRequesterUser: { id: number; email: string };

  let staffToken: string;
  let adminToken: string;
  let requesterToken: string;
  let otherRequesterToken: string;

  let categoryId: number;
  let relatedSystemId: number;
  const createdTicketIds: number[] = [];

  async function createTestTicket(
    initialStatus: TicketStatus = TicketStatus.NEW,
    withActionTaken = false
  ) {
    const ticket = await prisma.ticket.create({
      data: {
        ticketNumber: `TKT-WF-${Date.now()}-${Math.floor(Math.random() * 10000)}`,
        summary: "Workflow & Concurrency Verification Ticket",
        description: "Testing BR-06 transition matrix, BR-07 resolution gate, BR-08 advisory resolution, and BR-09 optimistic locking.",
        categoryId,
        relatedSystemId,
        requestedPriority: Priority.HIGH,
        itPriority: Priority.HIGH,
        currentStatus: initialStatus,
        requesterId: requesterUser.id,
        ownerId: staffUser.id,
      },
    });
    createdTicketIds.push(ticket.id);

    if (withActionTaken) {
      await prisma.actionTaken.create({
        data: {
          ticketId: ticket.id,
          performedById: staffUser.id,
          actionDateTime: new Date(),
          actionDescription: "Replaced faulty network switch port and verified VLAN tagging.",
          result: "Connectivity restored and verified with ping test.",
          followUpRequired: false,
        },
      });
    }

    return ticket;
  }

  beforeAll(async () => {
    const passwordHash = bcryptjs.hashSync("Password123!", 10);

    const staff = await prisma.user.upsert({
      where: { email: "workflow.staff@kmutt.ac.th" },
      update: { passwordHash, mustChangePassword: false, isActive: true, role: Role.IT_STAFF },
      create: {
        email: "workflow.staff@kmutt.ac.th",
        name: "Workflow IT Staff",
        passwordHash,
        mustChangePassword: false,
        isActive: true,
        role: Role.IT_STAFF,
      },
    });
    staffUser = { id: staff.id, email: staff.email };

    const admin = await prisma.user.upsert({
      where: { email: "admin@kmutt.ac.th" },
      update: { passwordHash, mustChangePassword: false, isActive: true, role: Role.ADMINISTRATOR },
      create: {
        email: "admin@kmutt.ac.th",
        name: "System Administrator",
        passwordHash,
        mustChangePassword: false,
        isActive: true,
        role: Role.ADMINISTRATOR,
      },
    });
    adminUser = { id: admin.id, email: admin.email };

    const req1 = await prisma.user.upsert({
      where: { email: "workflow.req1@kmutt.ac.th" },
      update: { passwordHash, mustChangePassword: false, isActive: true, role: Role.REQUESTER },
      create: {
        email: "workflow.req1@kmutt.ac.th",
        name: "Workflow Requester One",
        passwordHash,
        mustChangePassword: false,
        isActive: true,
        role: Role.REQUESTER,
      },
    });
    requesterUser = { id: req1.id, email: req1.email };

    const req2 = await prisma.user.upsert({
      where: { email: "workflow.req2@kmutt.ac.th" },
      update: { passwordHash, mustChangePassword: false, isActive: true, role: Role.REQUESTER },
      create: {
        email: "workflow.req2@kmutt.ac.th",
        name: "Workflow Requester Two",
        passwordHash,
        mustChangePassword: false,
        isActive: true,
        role: Role.REQUESTER,
      },
    });
    otherRequesterUser = { id: req2.id, email: req2.email };

    const cat =
      (await prisma.category.findFirst()) ||
      (await prisma.category.create({
        data: { code: "NET", name: "Network", description: "Campus network issues" },
      }));
    categoryId = cat.id;

    const relSys =
      (await prisma.relatedSystem.findFirst()) ||
      (await prisma.relatedSystem.create({
        data: { name: "Campus Wi-Fi" },
      }));
    relatedSystemId = relSys.id;
  });

  beforeEach(async () => {
    sessionService.clearAllSessions();

    const staffLogin = await request(app)
      .post("/api/v1/auth/login")
      .send({ email: staffUser.email, password: "Password123!" });
    staffToken = staffLogin.body.data.token;

    const adminLogin = await request(app)
      .post("/api/v1/auth/login")
      .send({ email: adminUser.email, password: "Password123!" });
    adminToken = adminLogin.body.data.token;

    const req1Login = await request(app)
      .post("/api/v1/auth/login")
      .send({ email: requesterUser.email, password: "Password123!" });
    requesterToken = req1Login.body.data.token;

    const req2Login = await request(app)
      .post("/api/v1/auth/login")
      .send({ email: otherRequesterUser.email, password: "Password123!" });
    otherRequesterToken = req2Login.body.data.token;
  });

  afterAll(async () => {
    if (createdTicketIds.length > 0) {
      await prisma.actionTaken.deleteMany({
        where: { ticketId: { in: createdTicketIds } },
      });
      await prisma.ticket.deleteMany({
        where: { id: { in: createdTicketIds } },
      });
    }
  });

  // ===========================================================================
  // 1. Status Transition Matrix Enforcement (BR-06, AC-20.1)
  // ===========================================================================
  describe("BR-06 / AC-20.1: Status Transition Matrix Enforcement", () => {
    it("permits valid lifecycle transitions (NEW -> OPEN -> IN_PROGRESS -> WAITING_FOR_REQUESTER -> RESOLVED -> REOPENED -> RESOLVED -> CLOSED)", async () => {
      const ticket = await createTestTicket(TicketStatus.NEW, true);

      // 1. NEW -> OPEN
      let res = await request(app)
        .patch(`/api/v1/staff/tickets/${ticket.id}/status`)
        .set("Authorization", `Bearer ${staffToken}`)
        .send({ status: "OPEN", updatedAt: ticket.updatedAt.toISOString() });
      expect(res.status).toBe(200);
      expect(res.body.currentStatus).toBe("OPEN");

      // 2. OPEN -> IN_PROGRESS
      res = await request(app)
        .patch(`/api/v1/staff/tickets/${ticket.id}/status`)
        .set("Authorization", `Bearer ${staffToken}`)
        .send({ status: "IN_PROGRESS", updatedAt: res.body.updatedAt });
      expect(res.status).toBe(200);
      expect(res.body.currentStatus).toBe("IN_PROGRESS");

      // 3. IN_PROGRESS -> WAITING_FOR_REQUESTER
      res = await request(app)
        .patch(`/api/v1/staff/tickets/${ticket.id}/status`)
        .set("Authorization", `Bearer ${staffToken}`)
        .send({ status: "WAITING_FOR_REQUESTER", updatedAt: res.body.updatedAt });
      expect(res.status).toBe(200);
      expect(res.body.currentStatus).toBe("WAITING_FOR_REQUESTER");

      // 4. WAITING_FOR_REQUESTER -> RESOLVED (ticket has 1 ActionTaken)
      res = await request(app)
        .patch(`/api/v1/staff/tickets/${ticket.id}/status`)
        .set("Authorization", `Bearer ${staffToken}`)
        .send({ status: "RESOLVED", updatedAt: res.body.updatedAt });
      expect(res.status).toBe(200);
      expect(res.body.currentStatus).toBe("RESOLVED");
      expect(res.body.resolvedAt).toBeTruthy();

      // 5. RESOLVED -> REOPENED
      res = await request(app)
        .patch(`/api/v1/staff/tickets/${ticket.id}/status`)
        .set("Authorization", `Bearer ${staffToken}`)
        .send({ status: "REOPENED", updatedAt: res.body.updatedAt });
      expect(res.status).toBe(200);
      expect(res.body.currentStatus).toBe("REOPENED");

      // 6. REOPENED -> RESOLVED
      res = await request(app)
        .patch(`/api/v1/tickets/${ticket.id}/status`)
        .set("Authorization", `Bearer ${staffToken}`)
        .send({ status: "RESOLVED", updatedAt: res.body.updatedAt });
      expect(res.status).toBe(200);
      expect(res.body.currentStatus).toBe("RESOLVED");

      // 7. RESOLVED -> CLOSED
      res = await request(app)
        .patch(`/api/v1/staff/tickets/${ticket.id}/status`)
        .set("Authorization", `Bearer ${staffToken}`)
        .send({ status: "CLOSED", updatedAt: res.body.updatedAt });
      expect(res.status).toBe(200);
      expect(res.body.currentStatus).toBe("CLOSED");
      expect(res.body.closedAt).toBeTruthy();
    });

    it("rejects disallowed status jumps (NEW -> CLOSED, NEW -> RESOLVED, OPEN -> CLOSED, RESOLVED -> IN_PROGRESS) with 400 Bad Request", async () => {
      const newTicket = await createTestTicket(TicketStatus.NEW, true);

      // NEW -> CLOSED (disallowed)
      const resNewToClosed = await request(app)
        .patch(`/api/v1/staff/tickets/${newTicket.id}/status`)
        .set("Authorization", `Bearer ${staffToken}`)
        .send({ status: "CLOSED", updatedAt: newTicket.updatedAt.toISOString() });
      expect(resNewToClosed.status).toBe(400);
      expect(resNewToClosed.body.error.code).toBe("INVALID_STATUS_TRANSITION");

      // NEW -> RESOLVED (disallowed by BR-06 even when ActionTaken exists)
      const resNewToResolved = await request(app)
        .patch(`/api/v1/staff/tickets/${newTicket.id}/status`)
        .set("Authorization", `Bearer ${staffToken}`)
        .send({ status: "RESOLVED", updatedAt: newTicket.updatedAt.toISOString() });
      expect(resNewToResolved.status).toBe(400);
      expect(resNewToResolved.body.error.code).toBe("INVALID_STATUS_TRANSITION");

      // OPEN -> CLOSED (disallowed)
      const openTicket = await createTestTicket(TicketStatus.OPEN, true);
      const resOpenToClosed = await request(app)
        .patch(`/api/v1/staff/tickets/${openTicket.id}/status`)
        .set("Authorization", `Bearer ${staffToken}`)
        .send({ status: "CLOSED", updatedAt: openTicket.updatedAt.toISOString() });
      expect(resOpenToClosed.status).toBe(400);
      expect(resOpenToClosed.body.error.code).toBe("INVALID_STATUS_TRANSITION");

      // RESOLVED -> IN_PROGRESS (disallowed; must transition to REOPENED or CLOSED)
      const resolvedTicket = await createTestTicket(TicketStatus.RESOLVED, true);
      const resResolvedToInProgress = await request(app)
        .patch(`/api/v1/staff/tickets/${resolvedTicket.id}/status`)
        .set("Authorization", `Bearer ${staffToken}`)
        .send({ status: "IN_PROGRESS", updatedAt: resolvedTicket.updatedAt.toISOString() });
      expect(resResolvedToInProgress.status).toBe(400);
      expect(resResolvedToInProgress.body.error.code).toBe("INVALID_STATUS_TRANSITION");
    });

    it("enforces CLOSED and CANCELLED as strictly terminal states (rejecting all outgoing transitions with 400 Bad Request)", async () => {
      const closedTicket = await createTestTicket(TicketStatus.CLOSED, true);
      for (const target of ["REOPENED", "OPEN", "IN_PROGRESS", "RESOLVED", "CANCELLED"]) {
        const res = await request(app)
          .patch(`/api/v1/staff/tickets/${closedTicket.id}/status`)
          .set("Authorization", `Bearer ${staffToken}`)
          .send({ status: target, updatedAt: closedTicket.updatedAt.toISOString() });
        expect(res.status).toBe(400);
        expect(res.body.error.code).toBe("INVALID_STATUS_TRANSITION");
      }

      const cancelledTicket = await createTestTicket(TicketStatus.CANCELLED, true);
      for (const target of ["REOPENED", "OPEN", "IN_PROGRESS", "RESOLVED", "CLOSED"]) {
        const res = await request(app)
          .patch(`/api/v1/staff/tickets/${cancelledTicket.id}/status`)
          .set("Authorization", `Bearer ${staffToken}`)
          .send({ status: target, updatedAt: cancelledTicket.updatedAt.toISOString() });
        expect(res.status).toBe(400);
        expect(res.body.error.code).toBe("INVALID_STATUS_TRANSITION");
      }
    });
  });

  // ===========================================================================
  // 2. Resolution Gate Invariant (BR-07, AC-20.2)
  // ===========================================================================
  describe("BR-07 / AC-20.2: Resolution Gate Invariant", () => {
    it("rejects transitioning IN_PROGRESS -> RESOLVED with 400 Bad Request when ticket has 0 ActionTaken records", async () => {
      const actionlessTicket = await createTestTicket(TicketStatus.IN_PROGRESS, false);

      const res = await request(app)
        .patch(`/api/v1/staff/tickets/${actionlessTicket.id}/status`)
        .set("Authorization", `Bearer ${staffToken}`)
        .send({
          status: "RESOLVED",
          updatedAt: actionlessTicket.updatedAt.toISOString(),
        });

      expect(res.status).toBe(400);
      expect(res.body.error.message).toBe(
        "Cannot resolve ticket without at least one recorded Action Taken."
      );

      // Verify ticket status remained IN_PROGRESS in database
      const unchanged = await prisma.ticket.findUnique({
        where: { id: actionlessTicket.id },
      });
      expect(unchanged?.currentStatus).toBe(TicketStatus.IN_PROGRESS);
    });

    it("permits transitioning IN_PROGRESS -> RESOLVED with 200 OK once at least 1 ActionTaken record is logged", async () => {
      const ticket = await createTestTicket(TicketStatus.IN_PROGRESS, false);

      // Log 1 ActionTaken via API
      const createActionRes = await request(app)
        .post(`/api/v1/tickets/${ticket.id}/actions-taken`)
        .set("Authorization", `Bearer ${staffToken}`)
        .send({
          actionDescription: "Reset user MFA token and verified login with requester.",
          result: "Requester logged in successfully.",
          followUpRequired: false,
        });
      expect(createActionRes.status).toBe(201);

      // Fetch latest updatedAt token
      const refreshedTicket = await prisma.ticket.findUniqueOrThrow({
        where: { id: ticket.id },
      });

      // Now transition IN_PROGRESS -> RESOLVED
      const resolveRes = await request(app)
        .patch(`/api/v1/staff/tickets/${ticket.id}/status`)
        .set("Authorization", `Bearer ${staffToken}`)
        .send({
          status: "RESOLVED",
          updatedAt: refreshedTicket.updatedAt.toISOString(),
        });

      expect(resolveRes.status).toBe(200);
      expect(resolveRes.body.currentStatus).toBe("RESOLVED");
      expect(resolveRes.body.resolvedAt).toBeTruthy();
    });
  });

  // ===========================================================================
  // 3. Requester Advisory Resolution (BR-08, AC-20.3)
  // ===========================================================================
  describe("BR-08 / AC-20.3: Requester Advisory Problem Resolution", () => {
    it("records requesterResolvedAt timestamp without mutating currentStatus", async () => {
      const ticket = await createTestTicket(TicketStatus.IN_PROGRESS, false);

      const res = await request(app)
        .post(`/api/v1/tickets/${ticket.id}/resolve-request`)
        .set("Authorization", `Bearer ${requesterToken}`)
        .send({});

      expect(res.status).toBe(200);
      expect(res.body.requesterResolvedAt).toBeTruthy();
      expect(res.body.requesterResolutionConfirmedAt).toBeTruthy();
      expect(res.body.currentStatus).toBe("IN_PROGRESS");

      // Verify in DB that currentStatus is still IN_PROGRESS
      const dbTicket = await prisma.ticket.findUniqueOrThrow({
        where: { id: ticket.id },
      });
      expect(dbTicket.currentStatus).toBe(TicketStatus.IN_PROGRESS);
      expect(dbTicket.requesterResolutionConfirmedAt).not.toBeNull();
    });

    it("rejects non-owning requester with 403 Forbidden", async () => {
      const ticket = await createTestTicket(TicketStatus.IN_PROGRESS, false);

      const res = await request(app)
        .post(`/api/v1/tickets/${ticket.id}/resolve-request`)
        .set("Authorization", `Bearer ${otherRequesterToken}`)
        .send({});

      expect(res.status).toBe(403);
    });
  });

  // ===========================================================================
  // 4. Optimistic Concurrency Control (BR-09, AC-20.4)
  // ===========================================================================
  describe("BR-09 / AC-20.4: Optimistic Concurrency Control (updatedAt Token)", () => {
    it("allows first concurrent status update and rejects second update using stale updatedAt with 409 Conflict", async () => {
      const ticket = await createTestTicket(TicketStatus.OPEN, true);
      const initialUpdatedAt = ticket.updatedAt.toISOString();

      // Staff Member A updates OPEN -> IN_PROGRESS using initialUpdatedAt
      const resA = await request(app)
        .patch(`/api/v1/staff/tickets/${ticket.id}/status`)
        .set("Authorization", `Bearer ${staffToken}`)
        .send({
          status: "IN_PROGRESS",
          updatedAt: initialUpdatedAt,
        });
      expect(resA.status).toBe(200);
      expect(resA.body.currentStatus).toBe("IN_PROGRESS");
      expect(resA.body.updatedAt).not.toBe(initialUpdatedAt);

      // Staff Member B attempts OPEN -> WAITING_FOR_REQUESTER using stale initialUpdatedAt
      const resB = await request(app)
        .patch(`/api/v1/staff/tickets/${ticket.id}/status`)
        .set("Authorization", `Bearer ${adminToken}`)
        .send({
          status: "WAITING_FOR_REQUESTER",
          updatedAt: initialUpdatedAt,
        });
      expect(resB.status).toBe(409);
      expect(resB.body.error.code).toBe("CONFLICT");
      expect(resB.body.error.message).toMatch(/modified by another user/i);
    });
  });
});
