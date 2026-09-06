import { describe, it, expect, beforeAll } from "vitest";
import request from "supertest";
import { PrismaClient } from "@prisma/client";
import app from "../../src/app.js";
import { seed } from "../../prisma/seed.js";

const prisma = new PrismaClient();

describe("API: GET /api/tickets (Feature 8 My Tickets - AC-04-01, AC-04-03)", () => {
  let catAccount: any;
  let catHardware: any;
  let catNetwork: any;
  let sysWifi: any;
  let sysEmail: any;

  beforeAll(async () => {
    // 1. Clean test data
    await prisma.attachment.deleteMany();
    await prisma.ticket.deleteMany();
    await seed(prisma);

    // 2. Fetch categories and systems for test fixtures
    catAccount = await prisma.category.findUnique({ where: { code: "ACC" } });
    catHardware = await prisma.category.findUnique({ where: { code: "HW" } });
    catNetwork = await prisma.category.findUnique({ where: { code: "NET" } });
    sysWifi = await prisma.relatedSystem.findUnique({ where: { name: "Campus Wi-Fi" } });
    sysEmail = await prisma.relatedSystem.findUnique({ where: { name: "Email" } });

    // 3. Create isolated ticket fixtures
    // Requester 1 has 3 tickets:
    // Ticket 1: Wi-Fi issue (Network, High, High, New)
    await prisma.ticket.create({
      data: {
        ticketNumber: "TKT-2026-00001",
        requesterId: 1,
        categoryId: catNetwork!.id,
        relatedSystemId: sysWifi!.id,
        summary: "Campus Wi-Fi drops intermittently",
        description: "Wi-Fi connection terminates every 15 minutes in Library area.",
        requestedPriority: "High",
        itPriority: "High",
        currentStatus: "New",
        createdAt: new Date("2026-09-01T10:00:00Z"),
      },
    });

    // Ticket 2: Battery drainage (Hardware, Medium, itPriority: null -> UNASSIGNED, In Progress)
    await prisma.ticket.create({
      data: {
        ticketNumber: "TKT-2026-00002",
        requesterId: 1,
        categoryId: catHardware!.id,
        relatedSystemId: sysEmail!.id,
        summary: "Laptop battery drains quickly",
        description: "Hardware battery issue that requires replacement diagnosis.",
        requestedPriority: "Medium",
        itPriority: null, // Unassigned IT priority
        currentStatus: "In Progress",
        createdAt: new Date("2026-09-02T11:00:00Z"),
      },
    });

    // Ticket 3: Account locked (Account, Low, Low, Resolved)
    await prisma.ticket.create({
      data: {
        ticketNumber: "TKT-2026-00003",
        requesterId: 1,
        categoryId: catAccount!.id,
        relatedSystemId: sysEmail!.id,
        summary: "Password reset assistance needed",
        description: "User locked out after exceeding failed attempts limit.",
        requestedPriority: "Low",
        itPriority: "Low",
        currentStatus: "Resolved",
        createdAt: new Date("2026-09-03T12:00:00Z"),
      },
    });

    // Requester 2 has 2 tickets:
    // Ticket 4: Printer offline (Hardware, Urgent, Urgent, New)
    await prisma.ticket.create({
      data: {
        ticketNumber: "TKT-2026-00004",
        requesterId: 2,
        categoryId: catHardware!.id,
        relatedSystemId: sysEmail!.id,
        summary: "Department printer jammed and offline",
        description: "Printer in CB2 room 301 is not responding.",
        requestedPriority: "Urgent",
        itPriority: "Urgent",
        currentStatus: "New",
        createdAt: new Date("2026-09-04T08:00:00Z"),
      },
    });

    // Ticket 5: VPN access error (Network, Medium, Medium, New)
    await prisma.ticket.create({
      data: {
        ticketNumber: "TKT-2026-00005",
        requesterId: 2,
        categoryId: catNetwork!.id,
        relatedSystemId: sysWifi!.id,
        summary: "Cannot establish VPN session from home",
        description: "SSL VPN authentication fails with error 403.",
        requestedPriority: "Medium",
        itPriority: "Medium",
        currentStatus: "New",
        createdAt: new Date("2026-09-04T09:00:00Z"),
      },
    });
  });

  describe("Strict Requester Isolation & Security (AC-04-01, BR-08)", () => {
    it("returns HTTP 200 with only tickets belonging to Requester 1", async () => {
      const res = await request(app)
        .get("/api/tickets")
        .set("x-requester-id", "1");

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveLength(3);
      expect(res.body.pagination.totalCount).toBe(3);
      res.body.data.forEach((ticket: any) => {
        expect(ticket.requesterId).toBe(1);
        expect(["TKT-2026-00001", "TKT-2026-00002", "TKT-2026-00003"]).toContain(ticket.ticketNumber);
      });
    });

    it("returns HTTP 200 with only tickets belonging to Requester 2", async () => {
      const res = await request(app)
        .get("/api/tickets")
        .set("x-requester-id", "2");

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveLength(2);
      expect(res.body.pagination.totalCount).toBe(2);
      res.body.data.forEach((ticket: any) => {
        expect(["TKT-2026-00004", "TKT-2026-00005"]).toContain(ticket.ticketNumber);
      });
    });

    it("returns HTTP 400 when x-requester-id header is missing", async () => {
      const res = await request(app).get("/api/tickets");
      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toMatch(/MISSING_REQUESTER/i);
    });

    it("returns HTTP 400 when x-requester-id header is non-numeric", async () => {
      const res = await request(app)
        .get("/api/tickets")
        .set("x-requester-id", "abc");
      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe("INVALID_REQUESTER_ID");
    });

    it("returns HTTP 404 when requester is inactive or non-existent", async () => {
      // User 5 is seeded as inactive
      const res = await request(app)
        .get("/api/tickets")
        .set("x-requester-id", "5");
      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe("REQUESTER_NOT_FOUND");
    });

    it("strictly isolates queries: searching for another requester's ticket number yields zero results", async () => {
      // Requester 1 attempts to find Ticket 4 (owned by Requester 2)
      const res = await request(app)
        .get("/api/tickets?search=TKT-2026-00004")
        .set("x-requester-id", "1");

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(0);
      expect(res.body.pagination.totalCount).toBe(0);
      expect(res.body.pagination.totalPages).toBe(0);
    });

    it("strictly ignores untrusted req.query.requesterId in favor of x-requester-id header", async () => {
      // Attacker passes ?requesterId=2 attempting to retrieve Requester 2's tickets using Requester 1's header
      const res = await request(app)
        .get("/api/tickets?requesterId=2")
        .set("x-requester-id", "1");

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(3); // strictly Requester 1's 3 tickets
      res.body.data.forEach((ticket: any) => {
        expect(["TKT-2026-00001", "TKT-2026-00002", "TKT-2026-00003"]).toContain(ticket.ticketNumber);
      });
    });

    it("works identically via the /api/v1/tickets alias", async () => {
      const res = await request(app)
        .get("/api/v1/tickets")
        .set("x-requester-id", "1");

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveLength(3);
    });
  });

  describe("Filtering Capabilities (AC-04-03)", () => {
    it("filters tickets by category ID", async () => {
      const res = await request(app)
        .get(`/api/tickets?category=${catNetwork.id}`)
        .set("x-requester-id", "1");

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(1);
      expect(res.body.data[0].ticketNumber).toBe("TKT-2026-00001");
      expect(res.body.data[0].categoryName).toBe("Network");
    });

    it("filters tickets by categoryId alias", async () => {
      const res = await request(app)
        .get(`/api/tickets?categoryId=${catHardware.id}`)
        .set("x-requester-id", "1");

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(1);
      expect(res.body.data[0].ticketNumber).toBe("TKT-2026-00002");
    });

    it("filters tickets by status", async () => {
      const res = await request(app)
        .get("/api/tickets?status=In Progress")
        .set("x-requester-id", "1");

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(1);
      expect(res.body.data[0].ticketNumber).toBe("TKT-2026-00002");
      expect(res.body.data[0].currentStatus).toBe("In Progress");
    });

    it("filters tickets by requested priority", async () => {
      const res = await request(app)
        .get("/api/tickets?requestedPriority=High")
        .set("x-requester-id", "1");

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(1);
      expect(res.body.data[0].ticketNumber).toBe("TKT-2026-00001");
      expect(res.body.data[0].requestedPriority).toBe("High");
    });

    it("filters tickets with itPriority=UNASSIGNED to match null itPriority records", async () => {
      const res = await request(app)
        .get("/api/tickets?itPriority=UNASSIGNED")
        .set("x-requester-id", "1");

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(1);
      expect(res.body.data[0].ticketNumber).toBe("TKT-2026-00002");
      expect(res.body.data[0].itPriority).toBeNull();
    });

    it("filters tickets with standard itPriority", async () => {
      const res = await request(app)
        .get("/api/tickets?itPriority=High")
        .set("x-requester-id", "1");

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(1);
      expect(res.body.data[0].ticketNumber).toBe("TKT-2026-00001");
      expect(res.body.data[0].itPriority).toBe("High");
    });

    it("returns 400 when non-numeric category ID is provided", async () => {
      const res = await request(app)
        .get("/api/tickets?category=invalid")
        .set("x-requester-id", "1");

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe("INVALID_QUERY_PARAMETER");
    });
  });

  describe("Search & Sorting Capabilities (AC-04-03)", () => {
    it("searches across summary and description case-insensitively", async () => {
      const res = await request(app)
        .get("/api/tickets?search=battery")
        .set("x-requester-id", "1");

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(1);
      expect(res.body.data[0].ticketNumber).toBe("TKT-2026-00002");
    });

    it("searches by ticket number prefix", async () => {
      const res = await request(app)
        .get("/api/tickets?search=00003")
        .set("x-requester-id", "1");

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(1);
      expect(res.body.data[0].ticketNumber).toBe("TKT-2026-00003");
    });

    it("sorts tickets by createdAt descending and ascending", async () => {
      const resDesc = await request(app)
        .get("/api/tickets?sortBy=createdAt&sortOrder=desc")
        .set("x-requester-id", "1");
      const resAsc = await request(app)
        .get("/api/tickets?sortBy=createdAt&sortOrder=asc")
        .set("x-requester-id", "1");

      expect(resDesc.status).toBe(200);
      expect(resAsc.status).toBe(200);
      expect(resDesc.body.data[0].ticketNumber).toBe("TKT-2026-00003"); // 2026-09-03
      expect(resAsc.body.data[0].ticketNumber).toBe("TKT-2026-00001"); // 2026-09-01
    });

    it("rejects non-whitelisted sortBy field with HTTP 400", async () => {
      const res = await request(app)
        .get("/api/tickets?sortBy=password")
        .set("x-requester-id", "1");

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe("INVALID_QUERY_PARAMETER");
    });
  });

  describe("Pagination Mathematics & Edge Cases (AC-04-03)", () => {
    it("returns correct page size and pagination metadata", async () => {
      const res = await request(app)
        .get("/api/tickets?page=1&pageSize=10")
        .set("x-requester-id", "1");

      expect(res.status).toBe(200);
      expect(res.body.pagination.currentPage).toBe(1);
      expect(res.body.pagination.pageSize).toBe(10);
      expect(res.body.pagination.totalCount).toBe(3);
      expect(res.body.pagination.totalItems).toBe(3);
      expect(res.body.pagination.totalPages).toBe(1);
    });

    it("slices pages accurately when pageSize is 2", async () => {
      // Total items = 3; with page=1 & pageSize=2 -> 2 items, totalPages = 2
      const p1 = await request(app)
        .get("/api/tickets?page=1&pageSize=2&sortBy=createdAt&sortOrder=asc")
        .set("x-requester-id", "1");
      expect(p1.body.data).toHaveLength(2);
      expect(p1.body.pagination.totalPages).toBe(2);

      const p2 = await request(app)
        .get("/api/tickets?page=2&pageSize=2&sortBy=createdAt&sortOrder=asc")
        .set("x-requester-id", "1");
      expect(p2.body.data).toHaveLength(1);
      expect(p2.body.data[0].ticketNumber).toBe("TKT-2026-00003");
    });

    it("handles out-of-bounds page requests gracefully by returning empty data", async () => {
      const res = await request(app)
        .get("/api/tickets?page=999&pageSize=10")
        .set("x-requester-id", "1");

      expect(res.status).toBe(200);
      expect(res.body.data).toEqual([]);
      expect(res.body.pagination.currentPage).toBe(999);
      expect(res.body.pagination.totalCount).toBe(3);
      expect(res.body.pagination.totalPages).toBe(1);
    });

    it("returns totalPages: 0 when totalCount is 0", async () => {
      const res = await request(app)
        .get("/api/tickets?search=nonexistentterm123")
        .set("x-requester-id", "1");

      expect(res.status).toBe(200);
      expect(res.body.data).toEqual([]);
      expect(res.body.pagination.totalCount).toBe(0);
      expect(res.body.pagination.totalPages).toBe(0);
    });
  });
});
