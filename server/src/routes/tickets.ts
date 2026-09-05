import { Router, Request, Response } from "express";
import { Prisma } from "@prisma/client";
import { getPrisma } from "../prisma.js";
import { uploadAttachments } from "../middleware/upload.js";
import { generateTicketNumber } from "../services/ticketNumber.service.js";
import { saveAttachmentFile } from "../services/attachmentStorage.service.js";
import { validateAttachmentFile, validateAttachmentQuantity } from "../services/attachmentValidator.js";

export const ticketsRouter = Router();

const VALID_PRIORITIES = new Set(["Low", "Medium", "High", "Urgent"]);

export async function handleCreateTicket(req: Request, res: Response) {
  const prisma = getPrisma();
  // 1. Verify and extract requester ID
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

  // 2. Extract and sanitize payload fields
  const { summary, description, categoryId, relatedSystemId, requestedPriority } = req.body;
  const validationErrors: Array<{ field: string; message: string }> = [];

  // Summary validation (5-100 characters)
  const trimmedSummary = typeof summary === "string" ? summary.trim() : "";
  if (!trimmedSummary) {
    validationErrors.push({ field: "summary", message: "Summary is required." });
  } else if (trimmedSummary.length < 5 || trimmedSummary.length > 100) {
    validationErrors.push({
      field: "summary",
      message: "Summary must be between 5 and 100 characters.",
    });
  }

  // Description validation (10-2000 characters)
  const trimmedDescription = typeof description === "string" ? description.trim() : "";
  if (!trimmedDescription) {
    validationErrors.push({ field: "description", message: "Description is required." });
  } else if (trimmedDescription.length < 10 || trimmedDescription.length > 2000) {
    validationErrors.push({
      field: "description",
      message: "Description must be between 10 and 2000 characters.",
    });
  }

  // Category validation
  const parsedCategoryId = parseInt(categoryId, 10);
  if (isNaN(parsedCategoryId)) {
    validationErrors.push({ field: "categoryId", message: "Category is required." });
  }

  // Related System validation
  const parsedSystemId = parseInt(relatedSystemId, 10);
  if (isNaN(parsedSystemId)) {
    validationErrors.push({ field: "relatedSystemId", message: "Related system is required." });
  }

  // Requested Priority validation
  let normalizedPriority = typeof requestedPriority === "string" ? requestedPriority.trim() : "";
  // Capitalize first letter if needed (e.g. "medium" -> "Medium", "MEDIUM" -> "Medium")
  if (normalizedPriority) {
    normalizedPriority = normalizedPriority.charAt(0).toUpperCase() + normalizedPriority.slice(1).toLowerCase();
  }
  if (!VALID_PRIORITIES.has(normalizedPriority)) {
    validationErrors.push({
      field: "requestedPriority",
      message: "Requested priority must be one of: Low, Medium, High, Urgent.",
    });
  }

  // If initial schema validation fails, return 422 immediately
  if (validationErrors.length > 0) {
    return res.status(422).json({
      success: false,
      error: {
        code: "VALIDATION_ERROR",
        message: "The submitted ticket data failed validation constraints.",
        details: validationErrors,
      },
    });
  }

  // 3. Verify Foreign Keys in DB
  const [category, relatedSystem] = await Promise.all([
    prisma.category.findUnique({ where: { id: parsedCategoryId } }),
    prisma.relatedSystem.findUnique({ where: { id: parsedSystemId } }),
  ]);

  if (!category || !category.isActive) {
    validationErrors.push({
      field: "categoryId",
      message: "Selected category does not exist or is inactive.",
    });
  }

  if (!relatedSystem || !relatedSystem.isActive) {
    validationErrors.push({
      field: "relatedSystemId",
      message: "Selected related system does not exist or is inactive.",
    });
  }

  if (validationErrors.length > 0) {
    return res.status(422).json({
      success: false,
      error: {
        code: "VALIDATION_ERROR",
        message: "The submitted ticket data failed validation constraints.",
        details: validationErrors,
      },
    });
  }

  // 4. Validate Files if present
  const files = (req.files as Express.Multer.File[]) || [];
  const qtyCheck = validateAttachmentQuantity(0, files.length);
  if (!qtyCheck.valid) {
    return res.status(422).json({
      success: false,
      error: {
        code: "TOO_MANY_FILES",
        message: qtyCheck.error!,
        details: [{ field: "attachments", message: qtyCheck.error! }],
      },
    });
  }

  for (const file of files) {
    const fileCheck = validateAttachmentFile(file.originalname, file.mimetype, file.size);
    if (!fileCheck.valid) {
      const isMimeError = fileCheck.error?.includes("unsupported");
      return res.status(isMimeError ? 415 : 422).json({
        success: false,
        error: {
          code: isMimeError ? "UNSUPPORTED_MEDIA_TYPE" : "FILE_TOO_LARGE",
          message: fileCheck.error!,
          details: [{ field: "attachments", message: fileCheck.error! }],
        },
      });
    }
  }

  // 5. Execute Transactional Creation
  try {
    const createdTicket = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      // 5.1 Generate sequential ticket number atomically
      const ticketNumber = await generateTicketNumber(tx);

      // 5.2 Create Ticket entity
      const ticket = await tx.ticket.create({
        data: {
          ticketNumber,
          requesterId: requester.id,
          categoryId: category!.id,
          relatedSystemId: relatedSystem!.id,
          summary: trimmedSummary,
          description: trimmedDescription,
          requestedPriority: normalizedPriority,
          itPriority: normalizedPriority, // Auto-matches requestedPriority upon creation
          currentStatus: "New",
        },
        include: {
          category: true,
          relatedSystem: true,
          requester: true,
        },
      });

      // 5.3 Persist Attachments if any
      const createdAttachments = [];
      for (const file of files) {
        const { storedFilename } = await saveAttachmentFile(file.originalname, file.buffer);
        const attachment = await tx.attachment.create({
          data: {
            ticketId: ticket.id,
            originalFilename: file.originalname,
            storedFilename,
            mimeType: file.mimetype,
            fileSize: file.size,
          },
        });
        createdAttachments.push({
          id: attachment.id,
          originalFilename: attachment.originalFilename,
          mimeType: attachment.mimeType,
          fileSize: attachment.fileSize,
          createdAt: attachment.createdAt.toISOString(),
        });
      }

      return {
        id: ticket.id,
        ticketNumber: ticket.ticketNumber,
        summary: ticket.summary,
        description: ticket.description,
        categoryId: ticket.categoryId,
        categoryName: ticket.category.name,
        relatedSystemId: ticket.relatedSystemId,
        relatedSystemName: ticket.relatedSystem.name,
        requestedPriority: ticket.requestedPriority,
        itPriority: ticket.itPriority,
        currentStatus: ticket.currentStatus,
        requesterId: ticket.requesterId,
        requesterName: ticket.requester.name,
        createdAt: ticket.createdAt.toISOString(),
        updatedAt: ticket.updatedAt.toISOString(),
        attachments: createdAttachments,
      };
    });

    return res.status(201).json({
      success: true,
      data: createdTicket,
    });
  } catch (error: any) {
    console.error("Error creating ticket:", error);
    return res.status(500).json({
      success: false,
      error: {
        code: "INTERNAL_ERROR",
        message: "Failed to create ticket due to an unexpected server error.",
        details: [],
      },
    });
  }
}

// Register route with upload middleware
ticketsRouter.post("/", uploadAttachments, handleCreateTicket);
