import { Router, Request, Response } from "express";
import fs from "fs";
import { getPrisma } from "../prisma.js";
import {
  getAttachmentFilePath,
  attachmentFileExists,
  deleteAttachmentFile,
} from "../services/attachmentStorage.service.js";

export const attachmentsRouter = Router();

export async function handleDownloadAttachment(req: Request, res: Response) {
  const prisma = getPrisma();

  // 1. Verify and extract requester ID from header
  const rawRequesterId = req.headers["x-requester-id"];
  if (!rawRequesterId) {
    return res.status(400).json({
      success: false,
      error: {
        code: "MISSING_REQUESTER_HEADER",
        message: "The 'x-requester-id' header is required to identify the submitting requester.",
        details: [],
      },
    });
  }

  const requesterId = parseInt(Array.isArray(rawRequesterId) ? rawRequesterId[0] : rawRequesterId, 10);
  if (isNaN(requesterId)) {
    return res.status(400).json({
      success: false,
      error: {
        code: "INVALID_REQUESTER_HEADER",
        message: "The 'x-requester-id' header must be a valid integer ID.",
        details: [],
      },
    });
  }

  const requester = await prisma.requesterUser.findUnique({
    where: { id: requesterId },
  });

  if (!requester || !requester.isActive) {
    return res.status(404).json({
      success: false,
      error: {
        code: "REQUESTER_NOT_FOUND",
        message: "Requester not found or is inactive.",
        details: [],
      },
    });
  }

  // 2. Parse attachment ID parameter
  const attachmentId = parseInt(req.params.id, 10);
  if (isNaN(attachmentId)) {
    return res.status(400).json({
      success: false,
      error: {
        code: "INVALID_ATTACHMENT_ID",
        message: "Attachment ID must be a valid integer.",
        details: [],
      },
    });
  }

  try {
    const attachment = await prisma.attachment.findUnique({
      where: { id: attachmentId },
      include: { ticket: true },
    });

    if (!attachment) {
      return res.status(404).json({
        success: false,
        error: {
          code: "ATTACHMENT_NOT_FOUND",
          message: "Attachment not found with the specified ID.",
          details: [],
        },
      });
    }

    // 3. Ownership Verification (BR-08, AC-18)
    if (attachment.ticket.requesterId !== requester.id) {
      return res.status(403).json({
        success: false,
        error: {
          code: "FORBIDDEN_ATTACHMENT_ACCESS",
          message: "Access denied. You do not have permission to download this attachment.",
          details: [],
        },
      });
    }

    // 4. Soft-Removal Guard (BR-07, AC-17)
    if (attachment.isRemoved || attachment.removedAt !== null) {
      return res.status(410).json({
        success: false,
        error: {
          code: "ATTACHMENT_REMOVED",
          message: "This attachment has been removed and is no longer available for download.",
          details: [
            {
              field: "isRemoved",
              message: `Removal reason: ${attachment.removalReason || "No reason specified"}`,
            },
          ],
        },
      });
    }

    // 5. Check physical file exists on disk
    const filePath = getAttachmentFilePath(attachment.storedFilename);
    const exists = await attachmentFileExists(attachment.storedFilename);
    if (!exists) {
      return res.status(404).json({
        success: false,
        error: {
          code: "FILE_NOT_FOUND",
          message: "The requested file binary was not found on storage.",
          details: [],
        },
      });
    }

    // 6. Set response headers and stream file
    res.setHeader("Content-Type", attachment.mimeType);
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="${encodeURIComponent(attachment.originalFilename)}"`
    );
    res.setHeader("Content-Length", attachment.fileSize);

    const fileStream = fs.createReadStream(filePath);
    return fileStream.pipe(res);
  } catch (error: any) {
    console.error("Error streaming attachment download:", error);
    return res.status(500).json({
      success: false,
      error: {
        code: "INTERNAL_ERROR",
        message: "Failed to download attachment due to an unexpected server error.",
        details: [],
      },
    });
  }
}

export async function handleSoftRemoveAttachment(req: Request, res: Response) {
  const prisma = getPrisma();

  // 1. Verify and extract requester ID from header
  const rawRequesterId = req.headers["x-requester-id"];
  if (!rawRequesterId) {
    return res.status(400).json({
      success: false,
      error: {
        code: "MISSING_REQUESTER_HEADER",
        message: "The 'x-requester-id' header is required to identify the submitting requester.",
        details: [],
      },
    });
  }

  const requesterId = parseInt(Array.isArray(rawRequesterId) ? rawRequesterId[0] : rawRequesterId, 10);
  if (isNaN(requesterId)) {
    return res.status(400).json({
      success: false,
      error: {
        code: "INVALID_REQUESTER_HEADER",
        message: "The 'x-requester-id' header must be a valid integer ID.",
        details: [],
      },
    });
  }

  const requester = await prisma.requesterUser.findUnique({
    where: { id: requesterId },
  });

  if (!requester || !requester.isActive) {
    return res.status(404).json({
      success: false,
      error: {
        code: "REQUESTER_NOT_FOUND",
        message: "Requester not found or is inactive.",
        details: [],
      },
    });
  }

  // 2. Parse attachment ID parameter
  const attachmentId = parseInt(req.params.id, 10);
  if (isNaN(attachmentId)) {
    return res.status(400).json({
      success: false,
      error: {
        code: "INVALID_ATTACHMENT_ID",
        message: "Attachment ID must be a valid integer.",
        details: [],
      },
    });
  }

  try {
    const attachment = await prisma.attachment.findUnique({
      where: { id: attachmentId },
      include: { ticket: true },
    });

    if (!attachment) {
      return res.status(404).json({
        success: false,
        error: {
          code: "ATTACHMENT_NOT_FOUND",
          message: "Attachment not found with the specified ID.",
          details: [],
        },
      });
    }

    // 3. Ownership Verification (BR-08)
    if (attachment.ticket.requesterId !== requester.id) {
      return res.status(403).json({
        success: false,
        error: {
          code: "FORBIDDEN_ATTACHMENT_REMOVAL",
          message: "Access denied. You do not have permission to remove this attachment.",
          details: [],
        },
      });
    }

    // 4. Check if already removed
    if (attachment.isRemoved) {
      return res.status(200).json({
        success: true,
        message: "Attachment has already been removed.",
        data: {
          id: attachment.id,
          ticketId: attachment.ticketId,
          originalFilename: attachment.originalFilename,
          isRemoved: true,
          removalReason: attachment.removalReason,
          removedAt: attachment.removedAt?.toISOString() || null,
          removedByRequesterId: attachment.removedByRequesterId,
        },
      });
    }

    // 5. Validate removal reason (BR-07, AC-16)
    const rawReason = req.body?.reason;
    const trimmedReason = typeof rawReason === "string" ? rawReason.trim() : "";
    if (!trimmedReason || trimmedReason.length < 5) {
      return res.status(422).json({
        success: false,
        error: {
          code: "VALIDATION_ERROR",
          message: "A removal reason of at least 5 characters is mandatory.",
          details: [
            {
              field: "reason",
              message: "Removal reason must be at least 5 characters.",
            },
          ],
        },
      });
    }

    // 6. In-place soft-update in PostgreSQL
    const removedAt = new Date();
    const updated = await prisma.attachment.update({
      where: { id: attachment.id },
      data: {
        isRemoved: true,
        removalReason: trimmedReason,
        removedAt,
        removedByRequesterId: requester.id,
      },
    });

    // 7. Immediate physical binary deletion from disk (SDS Decision D-11)
    await deleteAttachmentFile(attachment.storedFilename);

    return res.status(200).json({
      success: true,
      message: "Attachment removed successfully",
      data: {
        id: updated.id,
        ticketId: updated.ticketId,
        originalFilename: updated.originalFilename,
        isRemoved: true,
        removalReason: updated.removalReason,
        removedAt: updated.removedAt?.toISOString() || null,
        removedByRequesterId: updated.removedByRequesterId,
      },
    });
  } catch (error: any) {
    console.error("Error removing attachment:", error);
    return res.status(500).json({
      success: false,
      error: {
        code: "INTERNAL_ERROR",
        message: "Failed to remove attachment due to an unexpected server error.",
        details: [],
      },
    });
  }
}

// Register routes
attachmentsRouter.get("/:id/download", handleDownloadAttachment);
attachmentsRouter.get("/:id", handleDownloadAttachment);
attachmentsRouter.delete("/:id", handleSoftRemoveAttachment);
