import { describe, it, expect, beforeAll } from "vitest";
import request from "supertest";
import { PrismaClient } from "@prisma/client";
import app from "../../src/app.js";
import { seed } from "../../prisma/seed.js";

const prisma = new PrismaClient();

describe("API: POST /api/tickets (Feature 7 Create Ticket - API-02, API-03)", () => {
  beforeAll(async () => {
    await prisma.attachment.deleteMany();
    await prisma.ticket.deleteMany();
    await prisma.ticketNumberSequence.deleteMany({
      where: { year: new Date().getUTCFullYear() },
    });
    await seed(prisma);
  });

  describe("Happy Path: Valid Ticket Creation", () => {
    it("creates a ticket with status New, itPriority matching requestedPriority, and returns HTTP 201", async () => {
      const res = await request(app)
        .post("/api/tickets")
        .set("x-requester-id", "1")
        .send({
          summary: "VPN disconnects every hour",
          description: "The remote SSL VPN gateway terminates session after exactly 60 minutes of active use.",
          categoryId: 4, // Network
          relatedSystemId: 3, // VPN
          requestedPriority: "High",
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.ticketNumber).toMatch(/^TKT-\d{4}-\d{5}$/);
      expect(res.body.data.currentStatus).toBe("New");
      expect(res.body.data.requestedPriority).toBe("High");
      expect(res.body.data.itPriority).toBe("High");
      expect(res.body.data.requesterId).toBe(1);
      expect(res.body.data.categoryName).toBe("Network");
      expect(res.body.data.relatedSystemName).toBe("VPN");
    });

    it("creates a ticket via specification alias /api/v1/tickets", async () => {
      const res = await request(app)
        .post("/api/v1/tickets")
        .set("x-requester-id", "1")
        .send({
          summary: "Email mailbox quota full",
          description: "Cannot receive new incoming student correspondence due to storage limit.",
          categoryId: 1, // Account and Access
          relatedSystemId: 1, // Email
          requestedPriority: "Medium",
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.ticketNumber).toMatch(/^TKT-\d{4}-\d{5}$/);
    });

    it("creates a ticket with an uploaded attachment via multipart/form-data", async () => {
      const dummyBuffer = Buffer.from("fake png binary content");

      const res = await request(app)
        .post("/api/tickets")
        .set("x-requester-id", "1")
        .field("summary", "Broken printer in CB2")
        .field("description", "Paper jam error cannot be resolved through normal tray clearance.")
        .field("categoryId", "2") // Hardware
        .field("relatedSystemId", "6") // Printer
        .field("requestedPriority", "Medium")
        .attach("attachments", dummyBuffer, {
          filename: "jam_photo.png",
          contentType: "image/png",
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.attachments).toHaveLength(1);
      expect(res.body.data.attachments[0].originalFilename).toBe("jam_photo.png");
      expect(res.body.data.attachments[0].mimeType).toBe("image/png");
      expect(res.body.data.attachments[0].fileSize).toBe(dummyBuffer.length);
    });
  });

  describe("Validation & Boundary Enforcement", () => {
    it("returns HTTP 400 when x-requester-id header is missing", async () => {
      const res = await request(app)
        .post("/api/tickets")
        .send({
          summary: "Valid summary here",
          description: "Valid description text that is long enough.",
          categoryId: 1,
          relatedSystemId: 1,
          requestedPriority: "Medium",
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe("MISSING_REQUESTER_HEADER");
    });

    it("returns HTTP 422 when summary is less than 5 characters", async () => {
      const res = await request(app)
        .post("/api/tickets")
        .set("x-requester-id", "1")
        .send({
          summary: "Fail", // 4 chars
          description: "Valid description text that is long enough.",
          categoryId: 1,
          relatedSystemId: 1,
          requestedPriority: "Medium",
        });

      expect(res.status).toBe(422);
      expect(res.body.success).toBe(false);
      expect(res.body.error.details.some((d: any) => d.field === "summary")).toBe(true);
    });

    it("returns HTTP 422 when summary is greater than 100 characters", async () => {
      const res = await request(app)
        .post("/api/tickets")
        .set("x-requester-id", "1")
        .send({
          summary: "A".repeat(101),
          description: "Valid description text that is long enough.",
          categoryId: 1,
          relatedSystemId: 1,
          requestedPriority: "Medium",
        });

      expect(res.status).toBe(422);
      expect(res.body.success).toBe(false);
      expect(res.body.error.details.some((d: any) => d.field === "summary")).toBe(true);
    });

    it("returns HTTP 422 when description is less than 10 characters", async () => {
      const res = await request(app)
        .post("/api/tickets")
        .set("x-requester-id", "1")
        .send({
          summary: "Valid summary",
          description: "Short", // 5 chars
          categoryId: 1,
          relatedSystemId: 1,
          requestedPriority: "Medium",
        });

      expect(res.status).toBe(422);
      expect(res.body.success).toBe(false);
      expect(res.body.error.details.some((d: any) => d.field === "description")).toBe(true);
    });

    it("returns HTTP 422 when priority is invalid", async () => {
      const res = await request(app)
        .post("/api/tickets")
        .set("x-requester-id", "1")
        .send({
          summary: "Valid summary",
          description: "Valid description text that is long enough.",
          categoryId: 1,
          relatedSystemId: 1,
          requestedPriority: "SUPER_CRITICAL",
        });

      expect(res.status).toBe(422);
      expect(res.body.success).toBe(false);
      expect(res.body.error.details.some((d: any) => d.field === "requestedPriority")).toBe(true);
    });

    it("returns HTTP 422 when categoryId does not exist", async () => {
      const res = await request(app)
        .post("/api/tickets")
        .set("x-requester-id", "1")
        .send({
          summary: "Valid summary",
          description: "Valid description text that is long enough.",
          categoryId: 9999,
          relatedSystemId: 1,
          requestedPriority: "Medium",
        });

      expect(res.status).toBe(422);
      expect(res.body.success).toBe(false);
      expect(res.body.error.details.some((d: any) => d.field === "categoryId")).toBe(true);
    });

    it("returns HTTP 415 when uploading an unpermitted file format (.txt)", async () => {
      const textBuffer = Buffer.from("plain text log content");

      const res = await request(app)
        .post("/api/tickets")
        .set("x-requester-id", "1")
        .field("summary", "Invalid file test")
        .field("description", "Attempting upload of forbidden text file.")
        .field("categoryId", "3")
        .field("relatedSystemId", "1")
        .field("requestedPriority", "Low")
        .attach("attachments", textBuffer, {
          filename: "error.txt",
          contentType: "text/plain",
        });

      expect(res.status).toBe(415);
      expect(res.body.success).toBe(false);
      expect(res.body.error.message).toMatch(/unsupported/i);
    });

    it("returns HTTP 422 when uploading a file exceeding 5 MB", async () => {
      const largeBuffer = Buffer.alloc(5.5 * 1024 * 1024); // 5.5 MB

      const res = await request(app)
        .post("/api/tickets")
        .set("x-requester-id", "1")
        .field("summary", "Oversized file test")
        .field("description", "Attempting upload of 5.5MB PDF.")
        .field("categoryId", "3")
        .field("relatedSystemId", "1")
        .field("requestedPriority", "Low")
        .attach("attachments", largeBuffer, {
          filename: "oversized.pdf",
          contentType: "application/pdf",
        });

      expect(res.status).toBe(422);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe("FILE_TOO_LARGE");
    });
  });
});
