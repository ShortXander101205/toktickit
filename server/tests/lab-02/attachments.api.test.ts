import { describe, it, expect, beforeAll, afterAll } from "vitest";
import request from "supertest";
import { PrismaClient } from "@prisma/client";
import fs from "fs";
import path from "path";
import app from "../../src/app.js";
import { seed } from "../../prisma/seed.js";
import {
  saveAttachmentFile,
  getAttachmentFilePath,
  attachmentFileExists,
} from "../../src/services/attachmentStorage.service.js";

const prisma = new PrismaClient();

describe("API: Attachment Management (/api/tickets/:id/attachments & /api/attachments/:id) (AC-13 to AC-18)", () => {
  let catHardware: any;
  let sysLaptop: any;
  let ticketReq1: any;
  let ticketReq2: any;
  let sampleActiveAttachment: any;
  let sampleFilePath: string;

  beforeAll(async () => {
    // 1. Clean test database and re-seed
    await prisma.attachment.deleteMany();
    await prisma.ticket.deleteMany();
    await seed(prisma);

    catHardware = await prisma.category.findUnique({ where: { code: "HW" } });
    sysLaptop = await prisma.relatedSystem.findUnique({ where: { name: "Corporate Laptop" } });

    // 2. Create Ticket for Requester 1 (id: 1)
    ticketReq1 = await prisma.ticket.create({
      data: {
        ticketNumber: "TKT-2026-00010",
        requesterId: 1,
        categoryId: catHardware!.id,
        relatedSystemId: sysLaptop!.id,
        summary: "Attachment testing ticket",
        description: "Ticket dedicated to testing file upload, download, and soft removal.",
        requestedPriority: "Medium",
        itPriority: "Medium",
        currentStatus: "New",
      },
    });

    // 3. Create Ticket for Requester 2 (id: 2)
    ticketReq2 = await prisma.ticket.create({
      data: {
        ticketNumber: "TKT-2026-00020",
        requesterId: 2,
        categoryId: catHardware!.id,
        relatedSystemId: sysLaptop!.id,
        summary: "Requester 2 ticket",
        description: "Requester 2 ticket for cross-requester rejection tests.",
        requestedPriority: "Low",
        itPriority: "Low",
        currentStatus: "New",
      },
    });

    // 4. Save a real file to disk for download tests
    const dummyBuffer = Buffer.from("TokTickIT-Dummy-File-Content-12345");
    const { storedFilename, filePath } = await saveAttachmentFile("sample_active.png", dummyBuffer);
    sampleFilePath = filePath;

    sampleActiveAttachment = await prisma.attachment.create({
      data: {
        ticketId: ticketReq1.id,
        originalFilename: "sample_active.png",
        storedFilename,
        mimeType: "image/png",
        fileSize: dummyBuffer.length,
        isRemoved: false,
      },
    });
  });

  afterAll(async () => {
    // Clean up created files on disk
    try {
      if (fs.existsSync(sampleFilePath)) {
        await fs.promises.unlink(sampleFilePath);
      }
    } catch {
      // Ignore
    }
  });

  // -------------------------------------------------------------------------
  // 1. Upload Tests (POST /api/tickets/:id/attachments)
  // -------------------------------------------------------------------------

  it("AT-01 (Valid Attachment Upload - AC-13): uploads valid file, stores binary, returns 201 Created", async () => {
    const fileBuffer = Buffer.from("Valid image content");

    const res = await request(app)
      .post(`/api/tickets/${ticketReq1.id}/attachments`)
      .set("x-requester-id", "1")
      .attach("file", fileBuffer, "test_screenshot.png");

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toBeDefined();
    expect(res.body.data.originalFilename).toBe("test_screenshot.png");
    expect(res.body.data.mimeType).toBe("image/png");
    expect(res.body.data.isRemoved).toBe(false);

    // Verify row in database
    const dbAttachment = await prisma.attachment.findUnique({
      where: { id: res.body.data.id },
    });
    expect(dbAttachment).toBeDefined();
    expect(dbAttachment?.ticketId).toBe(ticketReq1.id);
    expect(dbAttachment?.isRemoved).toBe(false);

    // Verify file exists on disk
    const exists = await attachmentFileExists(dbAttachment!.storedFilename);
    expect(exists).toBe(true);
  });

  it("AT-02 (Cross-Requester Upload Rejection): returns 403 Forbidden when Requester 2 uploads to Requester 1's ticket", async () => {
    const fileBuffer = Buffer.from("Malicious file");

    const res = await request(app)
      .post(`/api/tickets/${ticketReq1.id}/attachments`)
      .set("x-requester-id", "2") // Requester 2 does not own ticketReq1
      .attach("file", fileBuffer, "hacked.png");

    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe("FORBIDDEN_TICKET_ACCESS");
  });

  it("AT-03 (File Size Boundary Rejection - BR-06, AC-14): rejects files exceeding 5 MB with 422", async () => {
    // 5 MB + 1 byte = 5,242,881 bytes
    const oversizedBuffer = Buffer.alloc(5 * 1024 * 1024 + 1);

    const res = await request(app)
      .post(`/api/tickets/${ticketReq1.id}/attachments`)
      .set("x-requester-id", "1")
      .attach("file", oversizedBuffer, "huge_file.png");

    expect(res.status).toBe(422);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toMatch(/FILE_TOO_LARGE/);
  });

  it("AT-04 (File Format / MIME Rejection - BR-06, AC-14): rejects unsupported extensions and MIME types with 415 or 422", async () => {
    const exeBuffer = Buffer.from("Executable payload");

    const res = await request(app)
      .post(`/api/tickets/${ticketReq1.id}/attachments`)
      .set("x-requester-id", "1")
      .attach("file", exeBuffer, "malicious.exe");

    expect([415, 422]).toContain(res.status);
    expect(res.body.success).toBe(false);
  });

  it("AT-05 (5-Active Limit Boundary Rejection - BR-06, AC-15): rejects 6th active upload when 5 active files exist with 422", async () => {
    // Create dedicated ticket for quantity tests
    const qtyTicket = await prisma.ticket.create({
      data: {
        ticketNumber: "TKT-2026-00099",
        requesterId: 1,
        categoryId: catHardware!.id,
        relatedSystemId: sysLaptop!.id,
        summary: "Quantity limit test ticket",
        description: "Testing active attachment limit of 5 files.",
        requestedPriority: "Medium",
        itPriority: "Medium",
        currentStatus: "New",
      },
    });

    // Populate with exactly 5 active attachments
    for (let i = 1; i <= 5; i++) {
      await prisma.attachment.create({
        data: {
          ticketId: qtyTicket.id,
          originalFilename: `file_${i}.png`,
          storedFilename: `stored_qty_${i}.png`,
          mimeType: "image/png",
          fileSize: 1024,
          isRemoved: false,
        },
      });
    }

    // Attempt to upload 6th active attachment
    const res = await request(app)
      .post(`/api/tickets/${qtyTicket.id}/attachments`)
      .set("x-requester-id", "1")
      .attach("file", Buffer.from("6th file"), "file_6.png");

    expect(res.status).toBe(422);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe("ATTACHMENT_LIMIT_EXCEEDED");
  });

  it("AT-05b (Soft-Removed Boundary Check): ticket with 4 active and 1 soft-removed file allows new upload", async () => {
    const boundaryTicket = await prisma.ticket.create({
      data: {
        ticketNumber: "TKT-2026-00088",
        requesterId: 1,
        categoryId: catHardware!.id,
        relatedSystemId: sysLaptop!.id,
        summary: "Soft-removed boundary check",
        description: "Verifying soft-removed files do not count toward 5-file limit.",
        requestedPriority: "Medium",
        itPriority: "Medium",
        currentStatus: "New",
      },
    });

    // 4 active files
    for (let i = 1; i <= 4; i++) {
      await prisma.attachment.create({
        data: {
          ticketId: boundaryTicket.id,
          originalFilename: `active_${i}.png`,
          storedFilename: `stored_active_${i}.png`,
          mimeType: "image/png",
          fileSize: 1024,
          isRemoved: false,
        },
      });
    }

    // 1 soft-removed file (Total in DB is 5, but active is 4)
    await prisma.attachment.create({
      data: {
        ticketId: boundaryTicket.id,
        originalFilename: "removed_old.pdf",
        storedFilename: "stored_removed_old.pdf",
        mimeType: "application/pdf",
        fileSize: 2048,
        isRemoved: true,
        removalReason: "Old file removed",
        removedAt: new Date(),
        removedByRequesterId: 1,
      },
    });

    // Upload 5th active file: MUST SUCCEED
    const res = await request(app)
      .post(`/api/tickets/${boundaryTicket.id}/attachments`)
      .set("x-requester-id", "1")
      .attach("file", Buffer.from("5th active file content"), "active_5.png");

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.originalFilename).toBe("active_5.png");
  });

  // -------------------------------------------------------------------------
  // 2. Download Tests (GET /api/attachments/:id/download)
  // -------------------------------------------------------------------------

  it("AT-06 (Active File Download - AC-18): streams binary byte stream with Content-Disposition headers", async () => {
    const res = await request(app)
      .get(`/api/attachments/${sampleActiveAttachment.id}/download`)
      .set("x-requester-id", "1");

    expect(res.status).toBe(200);
    expect(res.header["content-type"]).toContain("image/png");
    expect(res.header["content-disposition"]).toContain("sample_active.png");
    expect(res.body.toString()).toContain("TokTickIT-Dummy-File-Content-12345");
  });

  it("AT-07 (Cross-Requester Download Rejection - BR-08, AC-18): returns 403 Forbidden when Requester 2 downloads Requester 1's attachment", async () => {
    const res = await request(app)
      .get(`/api/attachments/${sampleActiveAttachment.id}/download`)
      .set("x-requester-id", "2"); // Requester 2 not owner

    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe("FORBIDDEN_ATTACHMENT_ACCESS");
  });

  // -------------------------------------------------------------------------
  // 3. Soft-Removal Tests (DELETE /api/attachments/:id)
  // -------------------------------------------------------------------------

  it("AT-08 (Soft-Removal with Mandatory Reason - BR-07, AC-16): marks isRemoved, records reason, deletes binary file from storage", async () => {
    // Create a real file on disk to verify physical deletion
    const dummyBuffer = Buffer.from("Will be deleted from disk");
    const { storedFilename, filePath } = await saveAttachmentFile("to_delete.png", dummyBuffer);

    const attachmentToDelete = await prisma.attachment.create({
      data: {
        ticketId: ticketReq1.id,
        originalFilename: "to_delete.png",
        storedFilename,
        mimeType: "image/png",
        fileSize: dummyBuffer.length,
        isRemoved: false,
      },
    });

    expect(fs.existsSync(filePath)).toBe(true);

    const res = await request(app)
      .delete(`/api/attachments/${attachmentToDelete.id}`)
      .set("x-requester-id", "1")
      .send({ reason: "Uploaded incorrect diagnostic dump file" });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.isRemoved).toBe(true);
    expect(res.body.data.removalReason).toBe("Uploaded incorrect diagnostic dump file");
    expect(res.body.data.removedAt).toBeDefined();
    expect(res.body.data.removedByRequesterId).toBe(1);

    // Verify database record still exists (soft delete)
    const dbRecord = await prisma.attachment.findUnique({
      where: { id: attachmentToDelete.id },
    });
    expect(dbRecord).toBeDefined();
    expect(dbRecord?.isRemoved).toBe(true);

    // Verify physical file is DELETED from disk (SDS Decision D-11)
    const existsOnDisk = await attachmentFileExists(storedFilename);
    expect(existsOnDisk).toBe(false);
  });

  it("AT-09 (Soft-Removal Rejection with Short Reason - BR-07): returns 422 if reason is < 5 characters or whitespace-only", async () => {
    // Short reason
    const res1 = await request(app)
      .delete(`/api/attachments/${sampleActiveAttachment.id}`)
      .set("x-requester-id", "1")
      .send({ reason: "err" });

    expect(res1.status).toBe(422);
    expect(res1.body.success).toBe(false);
    expect(res1.body.error.code).toBe("VALIDATION_ERROR");

    // Whitespace-only reason
    const res2 = await request(app)
      .delete(`/api/attachments/${sampleActiveAttachment.id}`)
      .set("x-requester-id", "1")
      .send({ reason: "     " });

    expect(res2.status).toBe(422);
    expect(res2.body.success).toBe(false);
  });

  it("AT-10 (Soft-Removal Cross-Requester Rejection): returns 403 Forbidden when Requester 2 attempts to remove Requester 1's attachment", async () => {
    const res = await request(app)
      .delete(`/api/attachments/${sampleActiveAttachment.id}`)
      .set("x-requester-id", "2") // Requester 2
      .send({ reason: "Unauthorized attempt" });

    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe("FORBIDDEN_ATTACHMENT_REMOVAL");

    // Verify file was NOT removed
    const stillActive = await prisma.attachment.findUnique({
      where: { id: sampleActiveAttachment.id },
    });
    expect(stillActive?.isRemoved).toBe(false);
  });

  it("AT-11 (Download Blocked on Soft-Removed Attachment - BR-07, AC-17): returns 410 Gone when attempting to download soft-removed attachment", async () => {
    // Create a pre-soft-removed attachment
    const removedAtt = await prisma.attachment.create({
      data: {
        ticketId: ticketReq1.id,
        originalFilename: "previously_removed.pdf",
        storedFilename: "stored_removed_fake.pdf",
        mimeType: "application/pdf",
        fileSize: 4096,
        isRemoved: true,
        removalReason: "File deleted due to privacy concern",
        removedAt: new Date(),
        removedByRequesterId: 1,
      },
    });

    const res = await request(app)
      .get(`/api/attachments/${removedAtt.id}/download`)
      .set("x-requester-id", "1");

    expect(res.status).toBe(410);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe("ATTACHMENT_REMOVED");
    expect(res.body.error.message).toContain("removed and is no longer available");
  });
});
