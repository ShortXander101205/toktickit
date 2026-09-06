import { Router, Request, Response } from "express";
import { Prisma } from "@prisma/client";
import { getPrisma } from "../prisma.js";
import { uploadAttachments, uploadSingleAttachment } from "../middleware/upload.js";
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

const VALID_SORT_FIELDS = new Set(["ticketNumber", "createdAt", "updatedAt", "currentStatus"]);

export async function handleGetTickets(req: Request, res: Response) {
  const prisma = getPrisma();

  // 1. Verify and extract requester ID from header
  const rawRequesterId = req.headers["x-requester-id"];
  if (!rawRequesterId) {
    return res.status(400).json({
      success: false,
      error: {
        code: "MISSING_REQUESTER_ID",
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
        code: "INVALID_REQUESTER_ID",
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

  // 2. Parse and validate query parameters (defense-in-depth: ignore req.query.requesterId)
  const { search, category, categoryId: rawCatId, requestedPriority, itPriority, status, sortBy: rawSortBy, sortOrder: rawSortOrder, page: rawPage, pageSize: rawPageSize } = req.query;

  // Category filter
  const targetCategory = category ?? rawCatId;
  let parsedCategoryId: number | undefined;
  if (targetCategory !== undefined && targetCategory !== "") {
    parsedCategoryId = parseInt(String(targetCategory), 10);
    if (isNaN(parsedCategoryId)) {
      return res.status(400).json({
        success: false,
        error: {
          code: "INVALID_QUERY_PARAMETER",
          message: "Category ID must be a valid integer.",
          details: [{ field: "category", message: "Category ID must be an integer." }],
        },
      });
    }
  }

  // Requested Priority filter
  let normalizedReqPriority: string | undefined;
  if (typeof requestedPriority === "string" && requestedPriority.trim()) {
    const trimmed = requestedPriority.trim();
    normalizedReqPriority = trimmed.charAt(0).toUpperCase() + trimmed.slice(1).toLowerCase();
  }

  // IT Priority filter: support "UNASSIGNED" -> null check
  let itPriorityCondition: Prisma.TicketWhereInput | undefined;
  if (typeof itPriority === "string" && itPriority.trim()) {
    const trimmedIt = itPriority.trim();
    if (trimmedIt.toUpperCase() === "UNASSIGNED") {
      itPriorityCondition = { itPriority: null };
    } else {
      const normalizedIt = trimmedIt.charAt(0).toUpperCase() + trimmedIt.slice(1).toLowerCase();
      itPriorityCondition = { itPriority: normalizedIt };
    }
  }

  // Status filter
  let statusFilter: string | undefined;
  if (typeof status === "string" && status.trim()) {
    statusFilter = status.trim();
  }

  // Search keyword (ticketNumber, summary, description)
  const searchKeyword = typeof search === "string" ? search.trim() : "";

  // Sort validation
  const sortBy = typeof rawSortBy === "string" && rawSortBy.trim() ? rawSortBy.trim() : "createdAt";
  if (!VALID_SORT_FIELDS.has(sortBy)) {
    return res.status(400).json({
      success: false,
      error: {
        code: "INVALID_QUERY_PARAMETER",
        message: "Invalid query parameters supplied.",
        details: [
          {
            field: "sortBy",
            message: `Invalid sortBy field '${sortBy}'. Allowed fields: ticketNumber, createdAt, updatedAt, currentStatus.`,
          },
        ],
      },
    });
  }

  const sortOrder = String(rawSortOrder).toLowerCase() === "asc" ? "asc" : "desc";

  // Pagination parameters
  const pageParsed = parseInt(String(rawPage), 10);
  const page = isNaN(pageParsed) || pageParsed < 1 ? 1 : pageParsed;

  const pageSizeParsed = parseInt(String(rawPageSize), 10);
  const pageSize = isNaN(pageSizeParsed) || pageSizeParsed < 1 ? 10 : pageSizeParsed;
  const offset = (page - 1) * pageSize;

  // 3. Build strictly isolated Prisma query
  const where: Prisma.TicketWhereInput = {
    requesterId: requester.id, // INVARIANT: Strict requester isolation (BR-08)
    ...(parsedCategoryId !== undefined ? { categoryId: parsedCategoryId } : {}),
    ...(normalizedReqPriority ? { requestedPriority: normalizedReqPriority } : {}),
    ...(itPriorityCondition ? itPriorityCondition : {}),
    ...(statusFilter ? { currentStatus: statusFilter } : {}),
    ...(searchKeyword
      ? {
          OR: [
            { ticketNumber: { contains: searchKeyword, mode: "insensitive" } },
            { summary: { contains: searchKeyword, mode: "insensitive" } },
            { description: { contains: searchKeyword, mode: "insensitive" } },
          ],
        }
      : {}),
  };

  try {
    const totalCount = await prisma.ticket.count({ where });
    // totalPages returns 0 when totalCount is 0 so client triggers disable correctly
    const totalPages = totalCount === 0 ? 0 : Math.ceil(totalCount / pageSize);

    const tickets = await prisma.ticket.findMany({
      where,
      orderBy: {
        [sortBy]: sortOrder,
      },
      skip: offset,
      take: pageSize,
      include: {
        category: true,
        relatedSystem: true,
      },
    });

    const formattedTickets = tickets.map((t) => ({
      id: t.id,
      ticketNumber: t.ticketNumber,
      summary: t.summary,
      description: t.description,
      categoryId: t.categoryId,
      categoryName: t.category.name,
      relatedSystemId: t.relatedSystemId,
      relatedSystemName: t.relatedSystem.name,
      requestedPriority: t.requestedPriority,
      itPriority: t.itPriority,
      currentStatus: t.currentStatus,
      requesterId: t.requesterId,
      ticketOwner: null,
      createdAt: t.createdAt.toISOString(),
      updatedAt: t.updatedAt.toISOString(),
    }));

    return res.status(200).json({
      success: true,
      data: formattedTickets,
      pagination: {
        totalCount,
        totalItems: totalCount,
        totalPages,
        currentPage: page,
        pageSize,
      },
    });
  } catch (error: any) {
    console.error("Error retrieving tickets:", error);
    return res.status(500).json({
      success: false,
      error: {
        code: "INTERNAL_ERROR",
        message: "Failed to retrieve tickets due to an unexpected server error.",
        details: [],
      },
    });
  }
}

export async function handleGetTicketDetail(req: Request, res: Response) {
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

  // 2. Parse and validate ticket ID parameter
  const ticketId = parseInt(req.params.id, 10);
  if (isNaN(ticketId)) {
    return res.status(400).json({
      success: false,
      error: {
        code: "INVALID_TICKET_ID",
        message: "Ticket ID must be a valid integer.",
        details: [],
      },
    });
  }

  try {
    const ticket = await prisma.ticket.findUnique({
      where: { id: ticketId },
      include: {
        category: true,
        relatedSystem: true,
        requester: true,
        attachments: {
          include: { removedByRequester: true },
          orderBy: { createdAt: "asc" },
        },
      },
    });

    if (!ticket) {
      return res.status(404).json({
        success: false,
        error: {
          code: "TICKET_NOT_FOUND",
          message: "Ticket not found with the specified ID.",
          details: [],
        },
      });
    }

    // Strict Cross-Requester Ownership Check (BR-08, AC-12)
    if (ticket.requesterId !== requester.id) {
      return res.status(403).json({
        success: false,
        error: {
          code: "FORBIDDEN_TICKET_ACCESS",
          message: "Access denied. You do not have permission to view this ticket.",
          details: [],
        },
      });
    }

    const activeAttachments = ticket.attachments
      .filter((a) => !a.isRemoved)
      .map((a) => ({
        id: a.id,
        ticketId: a.ticketId,
        originalFilename: a.originalFilename,
        mimeType: a.mimeType,
        fileSize: a.fileSize,
        isRemoved: false,
        createdAt: a.createdAt.toISOString(),
        updatedAt: a.updatedAt.toISOString(),
      }));

    const removedAttachments = ticket.attachments
      .filter((a) => a.isRemoved)
      .map((a) => ({
        id: a.id,
        ticketId: a.ticketId,
        originalFilename: a.originalFilename,
        mimeType: a.mimeType,
        fileSize: a.fileSize,
        isRemoved: true,
        removalReason: a.removalReason,
        removedAt: a.removedAt ? a.removedAt.toISOString() : null,
        removedByRequesterId: a.removedByRequesterId,
        removedByRequesterName: a.removedByRequester?.name || null,
        createdAt: a.createdAt.toISOString(),
        updatedAt: a.updatedAt.toISOString(),
      }));

    return res.status(200).json({
      success: true,
      data: {
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
        ticketOwner: null,
        requesterId: ticket.requesterId,
        requesterName: ticket.requester.name,
        requesterEmail: ticket.requester.email,
        createdAt: ticket.createdAt.toISOString(),
        updatedAt: ticket.updatedAt.toISOString(),
        attachments: activeAttachments,
        removedAttachments,
      },
    });
  } catch (error: any) {
    console.error("Error retrieving ticket detail:", error);
    return res.status(500).json({
      success: false,
      error: {
        code: "INTERNAL_ERROR",
        message: "Failed to retrieve ticket detail due to an unexpected server error.",
        details: [],
      },
    });
  }
}

export async function handleUploadTicketAttachment(req: Request, res: Response) {
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

  // 2. Parse ticket ID
  const ticketId = parseInt(req.params.id, 10);
  if (isNaN(ticketId)) {
    return res.status(400).json({
      success: false,
      error: {
        code: "INVALID_TICKET_ID",
        message: "Ticket ID must be a valid integer.",
        details: [],
      },
    });
  }

  // 3. Find ticket and verify ownership (BR-08)
  const ticket = await prisma.ticket.findUnique({
    where: { id: ticketId },
  });

  if (!ticket) {
    return res.status(404).json({
      success: false,
      error: {
        code: "TICKET_NOT_FOUND",
        message: "Ticket not found with the specified ID.",
        details: [],
      },
    });
  }

  if (ticket.requesterId !== requester.id) {
    return res.status(403).json({
      success: false,
      error: {
        code: "FORBIDDEN_TICKET_ACCESS",
        message: "Access denied. You do not have permission to upload attachments to this ticket.",
        details: [],
      },
    });
  }

  // 4. Check file presence
  const file = (req.files && Array.isArray(req.files) && req.files.length > 0) ? req.files[0] : req.file;
  if (!file) {
    return res.status(400).json({
      success: false,
      error: {
        code: "MISSING_ATTACHMENT_FILE",
        message: "Attachment file is required.",
        details: [],
      },
    });
  }

  // 5. Check active attachment quantity limit (BR-06, AC-15)
  // ONLY count active attachments (isRemoved === false)
  const activeCount = await prisma.attachment.count({
    where: {
      ticketId,
      isRemoved: false,
    },
  });

  const quantityCheck = validateAttachmentQuantity(activeCount, 1);
  if (!quantityCheck.valid) {
    return res.status(422).json({
      success: false,
      error: {
        code: "ATTACHMENT_LIMIT_EXCEEDED",
        message: quantityCheck.error || "Total active attachments cannot exceed 5 files.",
        details: [
          {
            field: "file",
            message: `Current active attachments: ${activeCount}. Maximum allowed is 5.`,
          },
        ],
      },
    });
  }

  // 6. Validate file size and MIME type (BR-06, AC-14)
  const fileCheck = validateAttachmentFile(file.originalname, file.mimetype, file.size);
  if (!fileCheck.valid) {
    return res.status(422).json({
      success: false,
      error: {
        code: "INVALID_ATTACHMENT",
        message: fileCheck.error || "Attachment validation failed.",
        details: [{ field: "file", message: fileCheck.error || "Invalid file" }],
      },
    });
  }

  try {
    // 7. Save file binary to storage
    const { storedFilename } = await saveAttachmentFile(file.originalname, file.buffer);

    // 8. Persist attachment record
    const attachment = await prisma.attachment.create({
      data: {
        ticketId,
        originalFilename: file.originalname,
        storedFilename,
        mimeType: file.mimetype,
        fileSize: file.size,
        isRemoved: false,
      },
    });

    return res.status(201).json({
      success: true,
      message: "Attachment uploaded successfully",
      data: {
        id: attachment.id,
        ticketId: attachment.ticketId,
        originalFilename: attachment.originalFilename,
        mimeType: attachment.mimeType,
        fileSize: attachment.fileSize,
        isRemoved: false,
        createdAt: attachment.createdAt.toISOString(),
      },
    });
  } catch (error: any) {
    console.error("Error uploading ticket attachment:", error);
    return res.status(500).json({
      success: false,
      error: {
        code: "INTERNAL_ERROR",
        message: "Failed to upload attachment due to an unexpected server error.",
        details: [],
      },
    });
  }
}

// Register routes
ticketsRouter.get("/", handleGetTickets);
ticketsRouter.post("/", uploadAttachments, handleCreateTicket);
ticketsRouter.get("/:id", handleGetTicketDetail);
ticketsRouter.post("/:id/attachments", uploadSingleAttachment, handleUploadTicketAttachment);
