import { describe, it, expect, beforeAll } from "vitest";
import request from "supertest";
import { PrismaClient } from "@prisma/client";
import app from "../../src/app.js";
import { seed } from "../../prisma/seed.js";

const prisma = new PrismaClient();

describe("API: GET /api/tickets/:id (Feature 9 Ticket Detail - AC-11, AC-12)", () => {
  let catHardware: any;
  let sysLaptop: any;
  let ticketRequester1: any;
  let ticketRequester2: any;
  let activeAttachment: any;
  let removedAttachment: any;

  beforeAll(async () => {
    // 1. Clean test data and re-seed
    await prisma.attachment.deleteMany();
    await prisma.ticket.deleteMany();
    await seed(prisma);

    catHardware = await prisma.category.findUnique({ where: { code: "HW" } });
    sysLaptop = await prisma.relatedSystem.findUnique({ where: { name: "Corporate Laptop" } });

    // 2. Create Ticket owned by Requester 1 (id: 1)
    ticketRequester1 = await prisma.ticket.create({
      data: {
        ticketNumber: "TKT-2026-00001",
        requesterId: 1,
        categoryId: catHardware!.id,
        relatedSystemId: sysLaptop!.id,
        summary: "Laptop battery drains quickly",
        description: "My laptop battery is draining much faster than usual even when idle.",
        requestedPriority: "High",
        itPriority: "High",
        currentStatus: "New",
      },
    });

    // 3. Create active attachment on Ticket 1
    activeAttachment = await prisma.attachment.create({
      data: {
        ticketId: ticketRequester1.id,
        originalFilename: "battery_diagnostic.png",
        storedFilename: "test-uuid-active.png",
        mimeType: "image/png",
        fileSize: 524288,
        isRemoved: false,
      },
    });

    // 4. Create soft-removed attachment on Ticket 1
    removedAttachment = await prisma.attachment.create({
      data: {
        ticketId: ticketRequester1.id,
        originalFilename: "wrong_report.pdf",
        storedFilename: "test-uuid-removed.pdf",
        mimeType: "application/pdf",
        fileSize: 1048576,
        isRemoved: true,
        removalReason: "Uploaded incorrect diagnostic report from previous semester",
        removedAt: new Date("2026-09-03T11:15:00.000Z"),
        removedByRequesterId: 1,
      },
    });

    // 5. Create Ticket owned by Requester 2 (id: 2)
    ticketRequester2 = await prisma.ticket.create({
      data: {
        ticketNumber: "TKT-2026-00002",
        requesterId: 2,
        categoryId: catHardware!.id,
        relatedSystemId: sysLaptop!.id,
        summary: "Monitor flickering issue",
        description: "External monitor flickers constantly when plugged into dock.",
        requestedPriority: "Medium",
        itPriority: "Medium",
        currentStatus: "New",
      },
    });
  });

  it("TD-01 (Happy Path Detail Retrieval): returns 200 OK with full ticket attributes and partitioned attachments for owner", async () => {
    const res = await request(app)
      .get(`/api/tickets/${ticketRequester1.id}`)
      .set("x-requester-id", "1");

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toBeDefined();

    const t = res.body.data;
    expect(t.id).toBe(ticketRequester1.id);
    expect(t.ticketNumber).toBe("TKT-2026-00001");
    expect(t.summary).toBe("Laptop battery drains quickly");
    expect(t.description).toBe("My laptop battery is draining much faster than usual even when idle.");
    expect(t.categoryName).toBe("Hardware");
    expect(t.relatedSystemName).toBe("Corporate Laptop");
    expect(t.requestedPriority).toBe("High");
    expect(t.itPriority).toBe("High");
    expect(t.currentStatus).toBe("New");
    expect(t.requesterId).toBe(1);
    expect(t.ticketOwner).toBeNull();

    // Verify active attachments
    expect(Array.isArray(t.attachments)).toBe(true);
    expect(t.attachments.length).toBe(1);
    expect(t.attachments[0].id).toBe(activeAttachment.id);
    expect(t.attachments[0].originalFilename).toBe("battery_diagnostic.png");
    expect(t.attachments[0].mimeType).toBe("image/png");
    expect(t.attachments[0].fileSize).toBe(524288);
    expect(t.attachments[0].isRemoved).toBe(false);

    // Verify soft-removed attachments (tombstones)
    expect(Array.isArray(t.removedAttachments)).toBe(true);
    expect(t.removedAttachments.length).toBe(1);
    expect(t.removedAttachments[0].id).toBe(removedAttachment.id);
    expect(t.removedAttachments[0].originalFilename).toBe("wrong_report.pdf");
    expect(t.removedAttachments[0].isRemoved).toBe(true);
    expect(t.removedAttachments[0].removalReason).toBe(
      "Uploaded incorrect diagnostic report from previous semester"
    );
    expect(t.removedAttachments[0].removedAt).toBeDefined();
    expect(t.removedAttachments[0].removedByRequesterId).toBe(1);
  });

  it("TD-02 (Cross-Requester Ticket Access Rejection - BR-08, AC-12): returns 403 Forbidden when Requester 2 fetches Requester 1's ticket", async () => {
    const res = await request(app)
      .get(`/api/tickets/${ticketRequester1.id}`)
      .set("x-requester-id", "2"); // Requester 2 attempting to view Requester 1's ticket

    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
    expect(res.body.error).toBeDefined();
    expect(res.body.error.code).toBe("FORBIDDEN_TICKET_ACCESS");
    expect(res.body.data).toBeUndefined();
  });

  it("TD-03 (Missing Ticket ID - 404): returns 404 Not Found for non-existent ticket ID", async () => {
    const res = await request(app)
      .get("/api/tickets/999999")
      .set("x-requester-id", "1");

    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe("TICKET_NOT_FOUND");
  });

  it("TD-04 (Missing Header - 400): returns 400 Bad Request when x-requester-id header is absent", async () => {
    const res = await request(app)
      .get(`/api/tickets/${ticketRequester1.id}`);

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toMatch(/MISSING_REQUESTER/);
  });

  it("TD-05 (Invalid Header - 400): returns 400 Bad Request when x-requester-id is non-integer", async () => {
    const res = await request(app)
      .get(`/api/tickets/${ticketRequester1.id}`)
      .set("x-requester-id", "not-a-number");

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toMatch(/INVALID_REQUESTER/);
  });

  it("TD-06 (Inactive Requester - 404): returns 404 Not Found when requester is inactive", async () => {
    const inactiveUser = await prisma.requesterUser.findFirst({ where: { isActive: false } });
    if (inactiveUser) {
      const res = await request(app)
        .get(`/api/tickets/${ticketRequester1.id}`)
        .set("x-requester-id", String(inactiveUser.id));

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe("REQUESTER_NOT_FOUND");
    }
  });

  it("TD-07 (Path Alias /api/v1/tickets/:id): supports the /api/v1 prefix alias", async () => {
    const res = await request(app)
      .get(`/api/v1/tickets/${ticketRequester1.id}`)
      .set("x-requester-id", "1");

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.ticketNumber).toBe("TKT-2026-00001");
  });
});
