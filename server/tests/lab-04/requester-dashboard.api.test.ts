import { describe, it, expect, beforeAll, beforeEach, afterAll } from "vitest";
import request from "supertest";
import { app } from "../../src/app.js";
import { getPrisma } from "../../src/prisma.js";
import { sessionService } from "../../src/services/session.service.js";
import { Priority, TicketStatus, Role } from "@prisma/client";
import bcryptjs from "bcryptjs";

describe("Issue 21: Requester Operational Dashboard API (BR-10, BR-13, AC-21.1, AC-21.2)", () => {
  const prisma = getPrisma();

  let requester1: { id: number; email: string };
  let requester2: { id: number; email: string };
  let emptyRequester: { id: number; email: string };

  let token1: string;
  let token2: string;
  let emptyToken: string;

  let categoryId: number;
  let relatedSystemId: number;
  const createdTicketIds: number[] = [];

  beforeAll(async () => {
    const passwordHash = bcryptjs.hashSync("Password123!", 10);

    const r1 = await prisma.user.upsert({
      where: { email: "dash.req1@kmutt.ac.th" },
      update: { passwordHash, mustChangePassword: false, isActive: true, role: Role.REQUESTER },
      create: {
        email: "dash.req1@kmutt.ac.th",
        name: "Dashboard Requester 1",
        passwordHash,
        mustChangePassword: false,
        isActive: true,
        role: Role.REQUESTER,
      },
    });
    requester1 = { id: r1.id, email: r1.email };

    const r2 = await prisma.user.upsert({
      where: { email: "dash.req2@kmutt.ac.th" },
      update: { passwordHash, mustChangePassword: false, isActive: true, role: Role.REQUESTER },
      create: {
        email: "dash.req2@kmutt.ac.th",
        name: "Dashboard Requester 2",
        passwordHash,
        mustChangePassword: false,
        isActive: true,
        role: Role.REQUESTER,
      },
    });
    requester2 = { id: r2.id, email: r2.email };

    const rEmpty = await prisma.user.upsert({
      where: { email: "dash.empty@kmutt.ac.th" },
      update: { passwordHash, mustChangePassword: false, isActive: true, role: Role.REQUESTER },
      create: {
        email: "dash.empty@kmutt.ac.th",
        name: "Dashboard Empty Requester",
        passwordHash,
        mustChangePassword: false,
        isActive: true,
        role: Role.REQUESTER,
      },
    });
    emptyRequester = { id: rEmpty.id, email: rEmpty.email };

    const cat =
      (await prisma.category.findFirst()) ||
      (await prisma.category.create({
        data: { code: "DASH_HW", name: "Hardware", description: "Hardware support" },
      }));
    categoryId = cat.id;

    const relSys =
      (await prisma.relatedSystem.findFirst()) ||
      (await prisma.relatedSystem.create({
        data: { name: "Campus Workstation" },
      }));
    relatedSystemId = relSys.id;
  });

  beforeEach(async () => {
    sessionService.clearAllSessions();

    const res1 = await request(app)
      .post("/api/v1/auth/login")
      .send({ email: requester1.email, password: "Password123!" });
    token1 = res1.body.data.token;

    const res2 = await request(app)
      .post("/api/v1/auth/login")
      .send({ email: requester2.email, password: "Password123!" });
    token2 = res2.body.data.token;

    const resEmpty = await request(app)
      .post("/api/v1/auth/login")
      .send({ email: emptyRequester.email, password: "Password123!" });
    emptyToken = resEmpty.body.data.token;
  });

  afterAll(async () => {
    if (createdTicketIds.length > 0) {
      await prisma.ticket.deleteMany({
        where: { id: { in: createdTicketIds } },
      });
    }
  });

  async function createTicketForUser(requesterId: number, status: TicketStatus, summary: string) {
    const t = await prisma.ticket.create({
      data: {
        ticketNumber: `TKT-DASH-${Date.now()}-${Math.floor(Math.random() * 100000)}`,
        summary,
        description: `Description for ${summary}`,
        categoryId,
        relatedSystemId,
        requestedPriority: Priority.MEDIUM,
        itPriority: Priority.MEDIUM,
        currentStatus: status,
        requesterId,
      },
    });
    createdTicketIds.push(t.id);
    return t;
  }

  it("AC-21.1 & BR-10: enforces strict requester data isolation — tickets owned by others are excluded", async () => {
    // Requester 1 has 1 NEW, 1 IN_PROGRESS, 1 RESOLVED
    await createTicketForUser(requester1.id, TicketStatus.NEW, "Req 1 New Ticket");
    await createTicketForUser(requester1.id, TicketStatus.IN_PROGRESS, "Req 1 In Progress Ticket");
    await createTicketForUser(requester1.id, TicketStatus.RESOLVED, "Req 1 Resolved Ticket");

    // Requester 2 has 2 IN_PROGRESS tickets
    await createTicketForUser(requester2.id, TicketStatus.IN_PROGRESS, "Req 2 In Progress A");
    await createTicketForUser(requester2.id, TicketStatus.IN_PROGRESS, "Req 2 In Progress B");

    // Fetch dashboard as Requester 1
    const res = await request(app)
      .get("/api/v1/dashboards/requester")
      .set("Authorization", `Bearer ${token1}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    const data = res.body.data;

    // totalOpen for Requester 1 should be 2 (NEW + IN_PROGRESS)
    expect(data.totalOpen).toBe(2);
    expect(data.inProgress).toBe(1);
    expect(data.resolved).toBe(1);
    expect(data.closed).toBe(0);

    // Every ticket in recentTickets must strictly belong to requester1
    expect(data.recentTickets.length).toBeGreaterThanOrEqual(3);
    data.recentTickets.forEach((t: any) => {
      expect(t.requesterId).toBe(requester1.id);
    });
  });

  it("AC-21.1: ignores query parameters attempting to tamper with requesterId (?requesterId=...)", async () => {
    const res = await request(app)
      .get(`/api/v1/dashboards/requester?requesterId=${requester2.id}`)
      .set("Authorization", `Bearer ${token1}`);

    expect(res.status).toBe(200);
    // Still scopes to requester1
    res.body.data.recentTickets.forEach((t: any) => {
      expect(t.requesterId).toBe(requester1.id);
    });
  });

  it("AC-21.1 & FR-08: accurately calculates all status buckets (totalOpen, waiting, inProgress, resolved, closed)", async () => {
    // Add waitingForRequester, closed, and reopened for Requester 1
    await createTicketForUser(requester1.id, TicketStatus.WAITING_FOR_REQUESTER, "Req 1 Waiting Ticket");
    await createTicketForUser(requester1.id, TicketStatus.CLOSED, "Req 1 Closed Ticket");
    await createTicketForUser(requester1.id, TicketStatus.REOPENED, "Req 1 Reopened Ticket");

    const res = await request(app)
      .get("/api/v1/dashboards/requester")
      .set("Authorization", `Bearer ${token1}`);

    expect(res.status).toBe(200);
    const data = res.body.data;

    // totalOpen includes: NEW(1) + IN_PROGRESS(1) + WAITING_FOR_REQUESTER(1) + REOPENED(1) = 4
    expect(data.totalOpen).toBe(4);
    expect(data.waitingForRequester).toBe(1);
    expect(data.inProgress).toBe(1);
    expect(data.resolved).toBe(1);
    expect(data.closed).toBe(1);
    // Top 5 recent tickets max
    expect(data.recentTickets.length).toBeLessThanOrEqual(5);
  });

  it("AC-21.2 & BR-13: safe zero-value empty behavior when requester has submitted 0 tickets", async () => {
    const res = await request(app)
      .get("/api/v1/dashboards/requester")
      .set("Authorization", `Bearer ${emptyToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toEqual({
      totalOpen: 0,
      waitingForRequester: 0,
      inProgress: 0,
      resolved: 0,
      closed: 0,
      metrics: {
        totalOpen: 0,
        waitingForRequester: 0,
        inProgress: 0,
        resolved: 0,
        closed: 0,
        totalOpenTickets: 0,
        waitingForRequesterTickets: 0,
        inProgressTickets: 0,
        recentlyResolvedTickets: 0,
        resolvedTickets: 0,
        closedTickets: 0,
      },
      recentTickets: [],
    });
  });

  it("enforces authentication: rejects unauthenticated requests with 401 Unauthorized", async () => {
    const res = await request(app).get("/api/v1/dashboards/requester");
    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });
});

