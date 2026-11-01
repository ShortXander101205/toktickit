import { describe, it, expect, beforeAll, beforeEach, afterAll } from "vitest";
import request from "supertest";
import { app } from "../../src/app.js";
import { getPrisma } from "../../src/prisma.js";
import { sessionService } from "../../src/services/session.service.js";
import { Priority, TicketStatus, Role } from "@prisma/client";
import bcryptjs from "bcryptjs";

describe("Issue 18: Actions Taken Data Model, Migration, Seed & Backend APIs", () => {
  const prisma = getPrisma();

  let staffUser: { id: number; email: string };
  let adminUser: { id: number; email: string };
  let requesterUser: { id: number; email: string };
  let otherRequesterUser: { id: number; email: string };
  let inactiveStaffUser: { id: number; email: string };

  let staffToken: string;
  let adminToken: string;
  let requesterToken: string;
  let otherRequesterToken: string;

  let testTicketId: number;
  let emptyTicketId: number;
  let otherTicketId: number;

  beforeAll(async () => {
    const passwordHash = bcryptjs.hashSync("Password123!", 10);

    // 1. Prepare IT Staff User
    const staff = await prisma.user.upsert({
      where: { email: "actions.staff@kmutt.ac.th" },
      update: { passwordHash, mustChangePassword: false, isActive: true, role: Role.IT_STAFF },
      create: {
        email: "actions.staff@kmutt.ac.th",
        name: "Actions IT Staff",
        passwordHash,
        mustChangePassword: false,
        isActive: true,
        role: Role.IT_STAFF,
      },
    });
    staffUser = { id: staff.id, email: staff.email };

    // 2. Prepare Administrator User (Reuse seeded admin account without creating duplicate admin)
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

    // 3. Prepare Requester 1 (Ticket Owner)
    const req1 = await prisma.user.upsert({
      where: { email: "actions.requester1@kmutt.ac.th" },
      update: { passwordHash, mustChangePassword: false, isActive: true, role: Role.REQUESTER },
      create: {
        email: "actions.requester1@kmutt.ac.th",
        name: "Actions Requester One",
        passwordHash,
        mustChangePassword: false,
        isActive: true,
        role: Role.REQUESTER,
      },
    });
    requesterUser = { id: req1.id, email: req1.email };

    // 4. Prepare Requester 2 (Other Requester)
    const req2 = await prisma.user.upsert({
      where: { email: "actions.requester2@kmutt.ac.th" },
      update: { passwordHash, mustChangePassword: false, isActive: true, role: Role.REQUESTER },
      create: {
        email: "actions.requester2@kmutt.ac.th",
        name: "Actions Requester Two",
        passwordHash,
        mustChangePassword: false,
        isActive: true,
        role: Role.REQUESTER,
      },
    });
    otherRequesterUser = { id: req2.id, email: req2.email };

    // 5. Prepare Inactive Staff User
    const inactiveStaff = await prisma.user.upsert({
      where: { email: "actions.inactive@kmutt.ac.th" },
      update: { passwordHash, mustChangePassword: false, isActive: false, role: Role.IT_STAFF },
      create: {
        email: "actions.inactive@kmutt.ac.th",
        name: "Actions Inactive Staff",
        passwordHash,
        mustChangePassword: false,
        isActive: false,
        role: Role.IT_STAFF,
      },
    });
    inactiveStaffUser = { id: inactiveStaff.id, email: inactiveStaff.email };

    // 6. Category & Related System
    const cat =
      (await prisma.category.findFirst()) ||
      (await prisma.category.create({
        data: { code: "ACT_HW", name: "Actions Hardware", description: "Hardware testing" },
      }));
    const relSys =
      (await prisma.relatedSystem.findFirst()) ||
      (await prisma.relatedSystem.create({
        data: { name: "Actions System" },
      }));

    // 7. Test Ticket Owned by Requester 1
    const t1 = await prisma.ticket.create({
      data: {
        ticketNumber: `TK-ACT1-${Date.now()}`,
        summary: "Actions Taken Primary Test Ticket",
        description: "Testing CRUD lifecycle for actions taken records.",
        categoryId: cat.id,
        relatedSystemId: relSys.id,
        requestedPriority: Priority.HIGH,
        currentStatus: TicketStatus.IN_PROGRESS,
        requesterId: requesterUser.id,
        ownerId: staffUser.id,
      },
    });
    testTicketId = t1.id;

    // 8. Legacy Ticket with Zero Actions (Owned by Requester 1)
    const t2 = await prisma.ticket.create({
      data: {
        ticketNumber: `TK-ACT2-${Date.now()}`,
        summary: "Legacy Ticket with Zero Actions Taken",
        description: "Testing safe empty array handling on legacy tickets without actions.",
        categoryId: cat.id,
        relatedSystemId: relSys.id,
        requestedPriority: Priority.LOW,
        currentStatus: TicketStatus.NEW,
        requesterId: requesterUser.id,
      },
    });
    emptyTicketId = t2.id;

    // 9. Unowned Ticket (Owned by Requester 2)
    const t3 = await prisma.ticket.create({
      data: {
        ticketNumber: `TK-ACT3-${Date.now()}`,
        summary: "Requester 2 Unowned Ticket",
        description: "Verifying isolation guards when Requester 1 attempts access.",
        categoryId: cat.id,
        relatedSystemId: relSys.id,
        requestedPriority: Priority.MEDIUM,
        currentStatus: TicketStatus.OPEN,
        requesterId: otherRequesterUser.id,
      },
    });
    otherTicketId = t3.id;
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

  // =========================================================================
  // AC-18.1: Create Action Taken by IT Staff & Admin + Auto-Performer
  // =========================================================================
  it("API-18.01: IT Staff creates valid Action Taken record (201 Created)", async () => {
    const payload = {
      actionDateTime: "2026-05-12T10:00:00.000Z",
      actionDescription: "Inspected hardware chassis and measured multimeter voltage outputs.",
      result: "Chassis grounding verified. 12V rail operates at 12.04V under full test load.",
      followUpRequired: false,
      followUpNote: null,
      attachmentNotes: "multimeter_reading.png",
    };

    const res = await request(app)
      .post(`/api/v1/tickets/${testTicketId}/actions-taken`)
      .set("Authorization", `Bearer ${staffToken}`)
      .send(payload);

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.actionTaken).toBeDefined();

    const action = res.body.data.actionTaken;
    expect(action.id).toBeDefined();
    expect(action.ticketId).toBe(testTicketId);
    expect(action.actionDescription).toBe(payload.actionDescription);
    expect(action.result).toBe(payload.result);
    expect(action.followUpRequired).toBe(false);
    expect(action.followUpNote).toBeNull();
    expect(action.attachmentNotes).toBe("multimeter_reading.png");
    expect(action.version).toBe(1);
    expect(action.performedBy.id).toBe(staffUser.id);
    expect(action.performedBy.role).toBe("IT_STAFF");
  });

  it("API-18.02: Administrator creates Action Taken record (201 Created)", async () => {
    const payload = {
      actionDescription: "Administrative override: authorized express procurement for battery.",
      result: "Purchase requisition PO-90822 submitted to procurement office.",
      followUpRequired: true,
      followUpNote: "Track delivery confirmation and verify dock arrival on Monday.",
    };

    const res = await request(app)
      .post(`/api/v1/tickets/${testTicketId}/actions-taken`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send(payload);

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.actionTaken.performedBy.id).toBe(adminUser.id);
    expect(res.body.data.actionTaken.performedBy.role).toBe("ADMINISTRATOR");
    expect(res.body.data.actionTaken.followUpRequired).toBe(true);
    expect(res.body.data.actionTaken.followUpNote).toBe(payload.followUpNote);
  });

  it("API-18.03: Performer identity is auto-derived from session, ignoring client spoofing (BR-03)", async () => {
    const payload = {
      actionDescription: "Attempting to pass spoofed performer ID in client JSON body.",
      result: "Server must ignore spoofed performer and record authenticated session ID.",
      performedById: 99999, // Attempted spoof
      performedBy: { id: 88888 }, // Attempted object spoof
    };

    const res = await request(app)
      .post(`/api/v1/tickets/${testTicketId}/actions-taken`)
      .set("Authorization", `Bearer ${staffToken}`)
      .send(payload);

    expect(res.status).toBe(201);
    expect(res.body.data.actionTaken.performedBy.id).toBe(staffUser.id);
    expect(res.body.data.actionTaken.performedBy.id).not.toBe(99999);
  });

  // =========================================================================
  // AC-18.2: Role and Cross-Requester Ownership Guards
  // =========================================================================
  it("API-18.04: Requester write attempt (POST) is rejected with 403 Forbidden (BR-06)", async () => {
    const res = await request(app)
      .post(`/api/v1/tickets/${testTicketId}/actions-taken`)
      .set("Authorization", `Bearer ${requesterToken}`)
      .send({
        actionDescription: "Requester trying to insert technical action taken.",
        result: "Should be forbidden.",
      });

    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe("FORBIDDEN_ACTION_TAKEN_WRITE");
  });

  it("API-18.12: Requester can view actions taken for owned ticket (200 OK)", async () => {
    const res = await request(app)
      .get(`/api/v1/tickets/${testTicketId}/actions-taken`)
      .set("Authorization", `Bearer ${requesterToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data.items)).toBe(true);
    expect(res.body.data.totalCount).toBeGreaterThanOrEqual(1);
  });

  it("API-18.13: Requester cannot view actions taken for unowned ticket (403 Forbidden)", async () => {
    // requesterToken belongs to Requester 1, otherTicketId belongs to Requester 2
    const res = await request(app)
      .get(`/api/v1/tickets/${otherTicketId}/actions-taken`)
      .set("Authorization", `Bearer ${requesterToken}`);

    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe("FORBIDDEN_TICKET_ACCESS");
  });

  // =========================================================================
  // AC-18.3: Conditional Follow-Up Note Validation & Field Constraints
  // =========================================================================
  it("API-18.05: Rejects creation when followUpRequired=true but followUpNote is missing (422 Unprocessable)", async () => {
    const res = await request(app)
      .post(`/api/v1/tickets/${testTicketId}/actions-taken`)
      .set("Authorization", `Bearer ${staffToken}`)
      .send({
        actionDescription: "Replaced cooling fan assembly; observed thermal sensor anomaly.",
        result: "Anomalous temperature spikes continue on core 3.",
        followUpRequired: true,
        // followUpNote omitted
      });

    expect(res.status).toBe(422);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe("MISSING_FOLLOW_UP_NOTE");
  });

  it("API-18.05b: Rejects creation when followUpRequired=true and followUpNote is whitespace-only", async () => {
    const res = await request(app)
      .post(`/api/v1/tickets/${testTicketId}/actions-taken`)
      .set("Authorization", `Bearer ${staffToken}`)
      .send({
        actionDescription: "Thermal grease repasted on CPU heatsink.",
        result: "Baseline temperatures decreased by 8 degrees.",
        followUpRequired: true,
        followUpNote: "     ",
      });

    expect(res.status).toBe(422);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe("MISSING_FOLLOW_UP_NOTE");
  });

  it("API-18.06: Coerces followUpNote to null when followUpRequired=false", async () => {
    const res = await request(app)
      .post(`/api/v1/tickets/${testTicketId}/actions-taken`)
      .set("Authorization", `Bearer ${staffToken}`)
      .send({
        actionDescription: "Cleared dust filters and vacuumed fan intake vents.",
        result: "Normal airflow restored.",
        followUpRequired: false,
        followUpNote: "This note should be ignored because followUpRequired is false.",
      });

    expect(res.status).toBe(201);
    expect(res.body.data.actionTaken.followUpRequired).toBe(false);
    expect(res.body.data.actionTaken.followUpNote).toBeNull();
  });

  it("API-18.07: Rejects description shorter than 5 characters (422 Unprocessable)", async () => {
    const res = await request(app)
      .post(`/api/v1/tickets/${testTicketId}/actions-taken`)
      .set("Authorization", `Bearer ${staffToken}`)
      .send({
        actionDescription: "Fix", // < 5 chars
        result: "Passed diagnostics.",
      });

    expect(res.status).toBe(422);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe("INVALID_DESCRIPTION");
  });

  it("API-18.08: Rejects result shorter than 2 characters (422 Unprocessable)", async () => {
    const res = await request(app)
      .post(`/api/v1/tickets/${testTicketId}/actions-taken`)
      .set("Authorization", `Bearer ${staffToken}`)
      .send({
        actionDescription: "Ran memory stress test for 60 minutes.",
        result: "K", // < 2 chars
      });

    expect(res.status).toBe(422);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe("INVALID_RESULT");
  });

  it("API-18.09: Rejects future action date exceeding 60-second skew tolerance", async () => {
    const futureDate = new Date(Date.now() + 3600000).toISOString(); // 1 hour in future

    const res = await request(app)
      .post(`/api/v1/tickets/${testTicketId}/actions-taken`)
      .set("Authorization", `Bearer ${staffToken}`)
      .send({
        actionDateTime: futureDate,
        actionDescription: "Trying to log action in the future.",
        result: "Should be rejected.",
      });

    expect(res.status).toBe(422);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe("FUTURE_ACTION_DATE");
  });

  // =========================================================================
  // AC-18.4: Safe Empty Array Handling for Legacy Tickets & Chronological Ordering
  // =========================================================================
  it("API-18.11: Returns safe empty array [] with 200 OK for tickets with zero actions taken", async () => {
    const res = await request(app)
      .get(`/api/v1/tickets/${emptyTicketId}/actions-taken`)
      .set("Authorization", `Bearer ${staffToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.items).toEqual([]);
    expect(res.body.data.totalCount).toBe(0);
  });

  it("API-18.10: Retrieves actions taken in ascending chronological order (FR-01.5)", async () => {
    const res = await request(app)
      .get(`/api/v1/tickets/${testTicketId}/actions-taken`)
      .set("Authorization", `Bearer ${staffToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    const items = res.body.data.items;
    expect(items.length).toBeGreaterThanOrEqual(2);

    for (let i = 1; i < items.length; i++) {
      const prevDate = new Date(items[i - 1].actionDateTime).getTime();
      const currDate = new Date(items[i].actionDateTime).getTime();
      expect(currDate).toBeGreaterThanOrEqual(prevDate);
    }
  });

  // =========================================================================
  // AC-18.5: Update Action Taken & Optimistic Concurrency Control
  // =========================================================================
  it("API-18.14: IT Staff updates existing action with matching version (200 OK, version incremented)", async () => {
    // 1. Create action
    const createRes = await request(app)
      .post(`/api/v1/tickets/${testTicketId}/actions-taken`)
      .set("Authorization", `Bearer ${staffToken}`)
      .send({
        actionDescription: "Initial diagnostic log prior to update test.",
        result: "Initial test result awaiting verification.",
        version: 1,
      });

    const actionId = createRes.body.data.actionTaken.id;

    // 2. Update action with version = 1
    const updateRes = await request(app)
      .put(`/api/v1/tickets/${testTicketId}/actions-taken/${actionId}`)
      .set("Authorization", `Bearer ${staffToken}`)
      .send({
        actionDescription: "Updated technical work summary after thorough re-test.",
        result: "Re-test confirmed 100% resolution of intermittent dropout.",
        followUpRequired: false,
        followUpNote: null,
        attachmentNotes: "final_verification.log",
        version: 1,
      });

    expect(updateRes.status).toBe(200);
    expect(updateRes.body.success).toBe(true);
    const updated = updateRes.body.data.actionTaken;
    expect(updated.id).toBe(actionId);
    expect(updated.actionDescription).toBe("Updated technical work summary after thorough re-test.");
    expect(updated.result).toBe("Re-test confirmed 100% resolution of intermittent dropout.");
    expect(updated.attachmentNotes).toBe("final_verification.log");
    expect(updated.version).toBe(2); // Incremented
  });

  it("API-18.15: Stale update rejected with 409 Conflict upon version mismatch (BR-12)", async () => {
    // 1. Create action
    const createRes = await request(app)
      .post(`/api/v1/tickets/${testTicketId}/actions-taken`)
      .set("Authorization", `Bearer ${staffToken}`)
      .send({
        actionDescription: "Action created for concurrency conflict verification.",
        result: "Initial result.",
      });

    const actionId = createRes.body.data.actionTaken.id;

    // 2. Submit update with stale version (0 instead of 1)
    const staleRes = await request(app)
      .put(`/api/v1/tickets/${testTicketId}/actions-taken/${actionId}`)
      .set("Authorization", `Bearer ${staffToken}`)
      .send({
        actionDescription: "Concurrent edit with stale version.",
        result: "Should trigger 409 Conflict.",
        version: 999, // Stale version
      });

    expect(staleRes.status).toBe(409);
    expect(staleRes.body.success).toBe(false);
    expect(staleRes.body.error.code).toBe("CONCURRENCY_CONFLICT");
    expect(staleRes.body.error.currentVersion).toBe(1);
  });

  it("API-18.16: Requester edit attempt (PUT) is rejected with 403 Forbidden", async () => {
    // Fetch an action id
    const listRes = await request(app)
      .get(`/api/v1/tickets/${testTicketId}/actions-taken`)
      .set("Authorization", `Bearer ${staffToken}`);
    const actionId = listRes.body.data.items[0].id;

    const res = await request(app)
      .put(`/api/v1/tickets/${testTicketId}/actions-taken/${actionId}`)
      .set("Authorization", `Bearer ${requesterToken}`)
      .send({
        actionDescription: "Requester trying to modify an existing action taken.",
        result: "Should be forbidden.",
        version: 1,
      });

    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe("FORBIDDEN_ACTION_TAKEN_WRITE");
  });

  it("API-18.17: Inactive user account is rejected from creating actions taken (BR-07)", async () => {
    // Session token created directly for inactive user to bypass login
    const inactiveToken = sessionService.createSession(inactiveStaffUser.id);

    const res = await request(app)
      .post(`/api/v1/tickets/${testTicketId}/actions-taken`)
      .set("Authorization", `Bearer ${inactiveToken}`)
      .send({
        actionDescription: "Action attempted by deactivated staff account.",
        result: "Must be rejected.",
      });

    // Either 401 (rejected by auth session lookup) or 403 (inactive account check)
    expect([401, 403]).toContain(res.status);
    expect(res.body.success).toBe(false);
  });

  afterAll(async () => {
    try {
      await prisma.actionTaken.deleteMany({
        where: {
          ticketId: { in: [testTicketId, emptyTicketId, otherTicketId].filter(Boolean) },
        },
      });
      await prisma.ticket.deleteMany({
        where: {
          id: { in: [testTicketId, emptyTicketId, otherTicketId].filter(Boolean) },
        },
      });
      await prisma.user.deleteMany({
        where: {
          email: {
            in: [
              "actions.staff@kmutt.ac.th",
              "actions.requester1@kmutt.ac.th",
              "actions.requester2@kmutt.ac.th",
              "actions.inactive@kmutt.ac.th",
              "actions.admin@kmutt.ac.th",
            ],
          },
        },
      });
    } catch (err) {
      console.error("Error during test cleanup in actions-taken.api.test.ts:", err);
    }
  });
});
