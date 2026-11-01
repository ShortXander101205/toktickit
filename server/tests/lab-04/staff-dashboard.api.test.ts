import { describe, it, expect, beforeAll, beforeEach, afterAll } from "vitest";
import request from "supertest";
import { app } from "../../src/app.js";
import { getPrisma } from "../../src/prisma.js";
import { sessionService } from "../../src/services/session.service.js";
import { Priority, TicketStatus, Role } from "@prisma/client";
import bcryptjs from "bcryptjs";

describe("Issue 21: IT Staff & Administrator Operational Dashboard API (BR-11, BR-12, BR-13, AC-21.3, AC-21.4)", () => {
  const prisma = getPrisma();

  let staffUser1: { id: number; email: string };
  let staffUser2: { id: number; email: string };
  let adminUser: { id: number; email: string };
  let requesterUser: { id: number; email: string };

  let staff1Token: string;
  let adminToken: string;
  let requesterToken: string;

  let categoryId: number;
  let relatedSystemId: number;
  const createdTicketIds: number[] = [];

  beforeAll(async () => {
    const passwordHash = bcryptjs.hashSync("Password123!", 10);

    const s1 = await prisma.user.upsert({
      where: { email: "staff.dash1@kmutt.ac.th" },
      update: { passwordHash, mustChangePassword: false, isActive: true, role: Role.IT_STAFF },
      create: {
        email: "staff.dash1@kmutt.ac.th",
        name: "Staff Dashboard One",
        passwordHash,
        mustChangePassword: false,
        isActive: true,
        role: Role.IT_STAFF,
      },
    });
    staffUser1 = { id: s1.id, email: s1.email };

    const s2 = await prisma.user.upsert({
      where: { email: "staff.dash2@kmutt.ac.th" },
      update: { passwordHash, mustChangePassword: false, isActive: true, role: Role.IT_STAFF },
      create: {
        email: "staff.dash2@kmutt.ac.th",
        name: "Staff Dashboard Two",
        passwordHash,
        mustChangePassword: false,
        isActive: true,
        role: Role.IT_STAFF,
      },
    });
    staffUser2 = { id: s2.id, email: s2.email };

    const adm = await prisma.user.upsert({
      where: { email: "admin.dash@kmutt.ac.th" },
      update: { passwordHash, mustChangePassword: false, isActive: true, role: Role.ADMINISTRATOR },
      create: {
        email: "admin.dash@kmutt.ac.th",
        name: "Admin Dashboard User",
        passwordHash,
        mustChangePassword: false,
        isActive: true,
        role: Role.ADMINISTRATOR,
      },
    });
    adminUser = { id: adm.id, email: adm.email };

    const req = await prisma.user.upsert({
      where: { email: "req.dash@kmutt.ac.th" },
      update: { passwordHash, mustChangePassword: false, isActive: true, role: Role.REQUESTER },
      create: {
        email: "req.dash@kmutt.ac.th",
        name: "Requester Dashboard User",
        passwordHash,
        mustChangePassword: false,
        isActive: true,
        role: Role.REQUESTER,
      },
    });
    requesterUser = { id: req.id, email: req.email };

    const cat =
      (await prisma.category.findFirst()) ||
      (await prisma.category.create({
        data: { code: "DASH_NET", name: "Network", description: "Campus network" },
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

    const resStaff1 = await request(app)
      .post("/api/v1/auth/login")
      .send({ email: staffUser1.email, password: "Password123!" });
    staff1Token = resStaff1.body.data.token;

    const resAdmin = await request(app)
      .post("/api/v1/auth/login")
      .send({ email: adminUser.email, password: "Password123!" });
    adminToken = resAdmin.body.data.token;

    const resReq = await request(app)
      .post("/api/v1/auth/login")
      .send({ email: requesterUser.email, password: "Password123!" });
    requesterToken = resReq.body.data.token;
  });

  afterAll(async () => {
    if (createdTicketIds.length > 0) {
      await prisma.ticket.deleteMany({
        where: { id: { in: createdTicketIds } },
      });
    }
    await prisma.user.deleteMany({
      where: {
        email: {
          in: [
            "staff.dash1@kmutt.ac.th",
            "staff.dash2@kmutt.ac.th",
            "admin.dash@kmutt.ac.th",
            "req.dash@kmutt.ac.th",
          ],
        },
      },
    });
  });

  async function createQueueTicket(opts: {
    status: TicketStatus;
    ownerId?: number | null;
    itPriority?: Priority;
    summary: string;
  }) {
    const t = await prisma.ticket.create({
      data: {
        ticketNumber: `TKT-STFD-${Date.now()}-${Math.floor(Math.random() * 100000)}`,
        summary: opts.summary,
        description: `Description for ${opts.summary}`,
        categoryId,
        relatedSystemId,
        requestedPriority: Priority.MEDIUM,
        itPriority: opts.itPriority ?? Priority.MEDIUM,
        currentStatus: opts.status,
        requesterId: requesterUser.id,
        ownerId: opts.ownerId ?? null,
      },
    });
    createdTicketIds.push(t.id);
    return t;
  }

  it("AC-21.4 & BR-11: enforces RBAC on GET /api/v1/dashboards/staff (403 for REQUESTER)", async () => {
    // 1. Unauthenticated -> 401
    const unauth = await request(app).get("/api/v1/dashboards/staff");
    expect(unauth.status).toBe(401);

    // 2. Requester role -> 403 Forbidden
    const reqRes = await request(app)
      .get("/api/v1/dashboards/staff")
      .set("Authorization", `Bearer ${requesterToken}`);
    expect(reqRes.status).toBe(403);
    expect(reqRes.body.error.code).toBe("FORBIDDEN");

    // 3. IT Staff role -> 200 OK
    const staffRes = await request(app)
      .get("/api/v1/dashboards/staff")
      .set("Authorization", `Bearer ${staff1Token}`);
    expect(staffRes.status).toBe(200);
    expect(staffRes.body.success).toBe(true);

    // 4. Admin role -> 200 OK
    const adminRes = await request(app)
      .get("/api/v1/dashboards/staff")
      .set("Authorization", `Bearer ${adminToken}`);
    expect(adminRes.status).toBe(200);
    expect(adminRes.body.success).toBe(true);
  });

  it("AC-21.3 & BR-11: calculates operational queue counts and personal assignments dynamically", async () => {
    // 1 unassigned NEW ticket
    await createQueueTicket({ status: TicketStatus.NEW, ownerId: null, summary: "Unassigned New" });
    // 1 OPEN assigned to staffUser1
    await createQueueTicket({ status: TicketStatus.OPEN, ownerId: staffUser1.id, summary: "Staff1 Open" });
    // 1 IN_PROGRESS assigned to staffUser1
    await createQueueTicket({ status: TicketStatus.IN_PROGRESS, ownerId: staffUser1.id, summary: "Staff1 In Progress" });
    // 1 IN_PROGRESS assigned to staffUser2
    await createQueueTicket({ status: TicketStatus.IN_PROGRESS, ownerId: staffUser2.id, summary: "Staff2 In Progress" });
    // 1 WAITING_FOR_REQUESTER unassigned
    await createQueueTicket({ status: TicketStatus.WAITING_FOR_REQUESTER, ownerId: null, summary: "Waiting Requester Unassigned" });
    // 1 RESOLVED assigned to staffUser1 (terminal state - should NOT count towards active myAssigned)
    await createQueueTicket({ status: TicketStatus.RESOLVED, ownerId: staffUser1.id, summary: "Resolved Staff1" });

    const res = await request(app)
      .get("/api/v1/dashboards/staff")
      .set("Authorization", `Bearer ${staff1Token}`);

    expect(res.status).toBe(200);
    const data = res.body.data;

    expect(data.newCount).toBeGreaterThanOrEqual(1);
    expect(data.openCount).toBeGreaterThanOrEqual(1);
    expect(data.inProgressCount).toBeGreaterThanOrEqual(2);
    expect(data.waitingForRequesterCount).toBeGreaterThanOrEqual(1);

    // staffUser1 has active OPEN and IN_PROGRESS = 2 (RESOLVED excluded)
    expect(data.myAssignedCount).toBeGreaterThanOrEqual(2);
    expect(data.unassignedCount).toBeGreaterThanOrEqual(2);

    // Recent 5 queue tickets
    expect(data.recentTickets.length).toBeLessThanOrEqual(5);
    expect(data.recentTickets.length).toBeGreaterThanOrEqual(1);
  });

  it("AC-21.4 & BR-12: enforces RBAC and returns user account stats on GET /api/v1/dashboards/admin", async () => {
    // 1. Requester -> 403 Forbidden
    const reqRes = await request(app)
      .get("/api/v1/dashboards/admin")
      .set("Authorization", `Bearer ${requesterToken}`);
    expect(reqRes.status).toBe(403);

    // 2. IT Staff -> 403 Forbidden
    const staffRes = await request(app)
      .get("/api/v1/dashboards/admin")
      .set("Authorization", `Bearer ${staff1Token}`);
    expect(staffRes.status).toBe(403);

    // 3. Admin -> 200 OK
    const adminRes = await request(app)
      .get("/api/v1/dashboards/admin")
      .set("Authorization", `Bearer ${adminToken}`);
    expect(adminRes.status).toBe(200);
    expect(adminRes.body.success).toBe(true);

    const data = adminRes.body.data;
    // Includes queue counts
    expect(data.newCount).toBeDefined();
    expect(data.inProgressCount).toBeDefined();
    // Includes user account stats
    expect(data.totalUsers).toBeGreaterThanOrEqual(4);
    expect(data.activeUsers).toBeGreaterThanOrEqual(4);
    expect(data.requestersCount).toBeGreaterThanOrEqual(1);
    expect(data.staffCount).toBeGreaterThanOrEqual(2);
    expect(data.adminCount).toBeGreaterThanOrEqual(1);

    expect(data.users).toBeDefined();
    expect(data.users.totalUsers).toBe(data.totalUsers);
  });
});

