import { Router, Request, Response } from "express";
import { Prisma, Priority, TicketStatus, Role } from "@prisma/client";
import { getPrisma } from "../prisma.js";
import { uploadAttachments, uploadSingleAttachment } from "../middleware/upload.js";
import { generateTicketNumber } from "../services/ticketNumber.service.js";
import { saveAttachmentFile } from "../services/attachmentStorage.service.js";
import { validateAttachmentFile, validateAttachmentQuantity } from "../services/attachmentValidator.js";

export const ticketsRouter = Router();

const VALID_PRIORITIES = new Set(["Low", "Medium", "High", "Urgent"]);

function parsePriorityEnum(val: string): Priority {
  const upper = val.trim().toUpperCase();
  if (upper === "LOW") return Priority.LOW;
  if (upper === "MEDIUM") return Priority.MEDIUM;
  if (upper === "HIGH") return Priority.HIGH;
  if (upper === "URGENT") return Priority.URGENT;
  return Priority.MEDIUM;
}

function parseTicketStatusEnum(val: string): TicketStatus {
  const norm = val.trim().toUpperCase().replace(/\s+/g, "_");
  if (norm === "NEW") return TicketStatus.NEW;
  if (norm === "OPEN" || norm === "ASSIGNED") return TicketStatus.OPEN;
  if (norm === "IN_PROGRESS") return TicketStatus.IN_PROGRESS;
  if (norm === "WAITING_FOR_REQUESTER" || norm === "PENDING_REQUESTER") return TicketStatus.WAITING_FOR_REQUESTER;
  if (norm === "RESOLVED") return TicketStatus.RESOLVED;
  if (norm === "CLOSED") return TicketStatus.CLOSED;
  if (norm === "REOPENED") return TicketStatus.REOPENED;
  if (norm === "CANCELLED") return TicketStatus.CANCELLED;
  return TicketStatus.NEW;
}

export function formatPriorityToTitle(val: Priority | string | null | undefined): string | null {
  if (val === null || val === undefined) return null;
  const upper = val.toString().trim().toUpperCase();
  if (upper === "LOW") return "Low";
  if (upper === "MEDIUM") return "Medium";
  if (upper === "HIGH") return "High";
  if (upper === "URGENT") return "Urgent";
  return val.toString();
}

export function formatStatusToTitle(val: TicketStatus | string | null | undefined): string {
  if (!val) return "New";
  const norm = val.toString().trim().toUpperCase().replace(/\s+/g, "_");
  if (norm === "NEW") return "New";
  if (norm === "OPEN" || norm === "ASSIGNED") return "Open";
  if (norm === "IN_PROGRESS") return "In Progress";
  if (norm === "WAITING_FOR_REQUESTER" || norm === "PENDING_REQUESTER") return "Waiting for Requester";
  if (norm === "RESOLVED") return "Resolved";
  if (norm === "CLOSED") return "Closed";
  if (norm === "REOPENED") return "Reopened";
  if (norm === "CANCELLED") return "Cancelled";
  return val.toString();
}

export async function handleCreateTicket(req: Request, res: Response) {
  const prisma = getPrisma();
  // 1. Verify and extract requester ID
  let requesterId: number;
  if (req.user) {
    requesterId = req.user.id;
  } else {
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

    requesterId = parseInt(Array.isArray(rawRequesterId) ? rawRequesterId[0] : rawRequesterId, 10);
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
  }

  const requester = await prisma.user.findUnique({
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
          requestedPriority: parsePriorityEnum(normalizedPriority),
          itPriority: parsePriorityEnum(normalizedPriority), // Auto-matches requestedPriority upon creation
          currentStatus: TicketStatus.NEW,
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
        requestedPriority: formatPriorityToTitle(ticket.requestedPriority),
        itPriority: formatPriorityToTitle(ticket.itPriority),
        currentStatus: formatStatusToTitle(ticket.currentStatus),
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

  // 1. Verify and extract requester ID
  let requesterId: number;
  if (req.user) {
    requesterId = req.user.id;
  } else {
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

    requesterId = parseInt(Array.isArray(rawRequesterId) ? rawRequesterId[0] : rawRequesterId, 10);
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
  }

  const requester = await prisma.user.findUnique({
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
      itPriorityCondition = { itPriority: parsePriorityEnum(normalizedIt) };
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
    ...(normalizedReqPriority ? { requestedPriority: parsePriorityEnum(normalizedReqPriority) } : {}),
    ...(itPriorityCondition ? itPriorityCondition : {}),
    ...(statusFilter ? { currentStatus: parseTicketStatusEnum(statusFilter) } : {}),
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
      requestedPriority: formatPriorityToTitle(t.requestedPriority),
      itPriority: formatPriorityToTitle(t.itPriority),
      currentStatus: formatStatusToTitle(t.currentStatus),
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

async function resolveUserFromRequest(
  req: Request,
  prisma: any
): Promise<{ user: { id: number; role: Role; name?: string; email?: string } | null; error?: { status: number; code: string; message: string } }> {
  if (req.user) {
    return {
      user: {
        id: req.user.id,
        role: req.user.role as Role,
        name: req.user.name,
        email: req.user.email,
      },
    };
  }
  const rawRequesterId = req.headers["x-requester-id"];
  if (!rawRequesterId) {
    return {
      user: null,
      error: {
        status: 400,
        code: "MISSING_REQUESTER_HEADER",
        message: "The 'x-requester-id' header is required to identify the submitting requester.",
      },
    };
  }
  const parsedId = parseInt(Array.isArray(rawRequesterId) ? rawRequesterId[0] : rawRequesterId, 10);
  if (isNaN(parsedId)) {
    return {
      user: null,
      error: {
        status: 400,
        code: "INVALID_REQUESTER_HEADER",
        message: "The 'x-requester-id' header must be a valid integer ID.",
      },
    };
  }
  const u = await prisma.user.findUnique({ where: { id: parsedId } });
  if (!u || !u.isActive) {
    return {
      user: null,
      error: {
        status: 404,
        code: "REQUESTER_NOT_FOUND",
        message: "Requester not found or is inactive.",
      },
    };
  }
  return {
    user: {
      id: u.id,
      role: u.role as Role,
      name: u.name,
      email: u.email,
    },
  };
}

export async function handleGetTicketDetail(req: Request, res: Response) {
  const prisma = getPrisma();

  // 1. Verify and extract user identity
  const authResult = await resolveUserFromRequest(req, prisma);
  if (!authResult.user) {
    const err = authResult.error || { status: 401, code: "UNAUTHORIZED", message: "Active authenticated session required." };
    return res.status(err.status).json({
      success: false,
      error: {
        code: err.code,
        message: err.message,
        details: [],
      },
    });
  }
  const currentUser = authResult.user;

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
    const isStaffOrAdmin = currentUser.role === Role.IT_STAFF || currentUser.role === Role.ADMINISTRATOR;

    const ticket = await prisma.ticket.findUnique({
      where: { id: ticketId },
      include: {
        category: true,
        relatedSystem: true,
        requester: {
          select: { id: true, name: true, email: true, department: true },
        },
        owner: {
          select: { id: true, name: true, email: true, role: true },
        },
        attachments: {
          include: { removedByUser: true },
          orderBy: { createdAt: "asc" },
        },
        publicComments: {
          include: {
            author: { select: { id: true, name: true, role: true } },
          },
          orderBy: { createdAt: "asc" },
        },
        internalNotes: {
          include: {
            author: { select: { id: true, name: true, role: true } },
          },
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

    // Requesters are restricted to viewing only their own tickets (BR-04, AC-14.3)
    if (!isStaffOrAdmin && ticket.requesterId !== currentUser.id) {
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
        removedByRequesterId: a.removedByUserId,
        removedByRequesterName: a.removedByUser?.name || null,
        createdAt: a.createdAt.toISOString(),
        updatedAt: a.updatedAt.toISOString(),
      }));

    const formattedPublicComments = ticket.publicComments.map((c) => ({
      id: c.id,
      ticketId: c.ticketId,
      author: {
        id: c.author.id,
        name: c.author.name,
        role: c.author.role,
      },
      content: c.content,
      createdAt: c.createdAt.toISOString(),
    }));

    const data: Record<string, any> = {
      id: ticket.id,
      ticketNumber: ticket.ticketNumber,
      summary: ticket.summary,
      description: ticket.description,
      categoryId: ticket.categoryId,
      categoryName: ticket.category.name,
      category: {
        id: ticket.category.id,
        name: ticket.category.name,
        code: ticket.category.code,
      },
      relatedSystemId: ticket.relatedSystemId,
      relatedSystemName: ticket.relatedSystem.name,
      relatedSystem: {
        id: ticket.relatedSystem.id,
        name: ticket.relatedSystem.name,
      },
      requestedPriority: formatPriorityToTitle(ticket.requestedPriority),
      itPriority: formatPriorityToTitle(ticket.itPriority),
      currentStatus: formatStatusToTitle(ticket.currentStatus),
      ownerId: ticket.ownerId,
      owner: ticket.owner
        ? {
            id: ticket.owner.id,
            name: ticket.owner.name,
            email: ticket.owner.email,
            role: ticket.owner.role,
          }
        : null,
      ticketOwner: ticket.owner?.name || null,
      requesterId: ticket.requesterId,
      requesterName: ticket.requester.name,
      requesterEmail: ticket.requester.email,
      requester: {
        id: ticket.requester.id,
        name: ticket.requester.name,
        email: ticket.requester.email,
        department: ticket.requester.department,
      },
      requesterResolutionConfirmedAt: ticket.requesterResolutionConfirmedAt
        ? ticket.requesterResolutionConfirmedAt.toISOString()
        : null,
      createdAt: ticket.createdAt.toISOString(),
      updatedAt: ticket.updatedAt.toISOString(),
      attachments: activeAttachments,
      removedAttachments,
      publicComments: formattedPublicComments,
    };

    // STRICT CONFIDENTIALITY INVARIANT (BR-04):
    // Internal notes are only included for IT Staff and Administrators.
    // For Requesters, internalNotes is omitted completely from the payload.
    if (isStaffOrAdmin && ticket.internalNotes) {
      data.internalNotes = ticket.internalNotes.map((n) => ({
        id: n.id,
        ticketId: n.ticketId,
        author: {
          id: n.author.id,
          name: n.author.name,
          role: n.author.role,
        },
        content: n.content,
        createdAt: n.createdAt.toISOString(),
      }));
    }

    return res.status(200).json({
      success: true,
      data,
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

/**
 * POST /api/v1/tickets/:id/resolve-request
 * Requester action indicating "Problem Appears Resolved" (BR-05).
 * Updates requesterResolutionConfirmedAt without altering ticket status.
 */
export async function handleResolveRequest(req: Request, res: Response) {
  const prisma = getPrisma();
  const authResult = await resolveUserFromRequest(req, prisma);
  if (!authResult.user) {
    const err = authResult.error || { status: 401, code: "UNAUTHORIZED", message: "Active authenticated session required." };
    return res.status(err.status).json({
      success: false,
      error: { code: err.code, message: err.message, details: [] },
    });
  }
  const currentUser = authResult.user;

  const ticketId = parseInt(req.params.id, 10);
  if (isNaN(ticketId)) {
    return res.status(400).json({
      success: false,
      error: { code: "INVALID_TICKET_ID", message: "Invalid ticket ID." },
    });
  }

  const ticket = await prisma.ticket.findUnique({ where: { id: ticketId } });
  if (!ticket) {
    return res.status(404).json({
      success: false,
      error: { code: "TICKET_NOT_FOUND", message: "Ticket not found." },
    });
  }

  // Only the owning requester may indicate resolution
  if (ticket.requesterId !== currentUser.id) {
    return res.status(403).json({
      success: false,
      error: {
        code: "FORBIDDEN_ACTION",
        message: "Only the owning requester may record problem resolution confirmation.",
      },
    });
  }

  const now = new Date();
  const updated = await prisma.ticket.update({
    where: { id: ticketId },
    data: { requesterResolutionConfirmedAt: now },
  });

  return res.status(200).json({
    success: true,
    data: {
      id: updated.id,
      ticketNumber: updated.ticketNumber,
      requesterResolutionConfirmedAt: now.toISOString(),
      message: "Problem resolution indication recorded.",
    },
  });
}

/**
 * POST /api/v1/tickets/:id/comments
 * Post Public Comment (owned Requester, IT Staff, Admin) - BR-04, BR-08.
 */
export async function handleCreateComment(req: Request, res: Response) {
  const prisma = getPrisma();
  const authResult = await resolveUserFromRequest(req, prisma);
  if (!authResult.user) {
    const err = authResult.error || { status: 401, code: "UNAUTHORIZED", message: "Active authenticated session required." };
    return res.status(err.status).json({
      success: false,
      error: { code: err.code, message: err.message, details: [] },
    });
  }
  const currentUser = authResult.user;

  const ticketId = parseInt(req.params.id, 10);
  if (isNaN(ticketId)) {
    return res.status(400).json({
      success: false,
      error: { code: "INVALID_TICKET_ID", message: "Invalid ticket ID." },
    });
  }

  const ticket = await prisma.ticket.findUnique({ where: { id: ticketId } });
  if (!ticket) {
    return res.status(404).json({
      success: false,
      error: { code: "TICKET_NOT_FOUND", message: "Ticket not found." },
    });
  }

  // If user is a Requester, verify ticket ownership
  const isStaffOrAdmin = currentUser.role === Role.IT_STAFF || currentUser.role === Role.ADMINISTRATOR;
  if (!isStaffOrAdmin && ticket.requesterId !== currentUser.id) {
    return res.status(403).json({
      success: false,
      error: {
        code: "FORBIDDEN_COMMENT",
        message: "You do not have permission to comment on this ticket.",
      },
    });
  }

  const { content } = req.body || {};
  const trimmed = typeof content === "string" ? content.trim() : "";
  if (!trimmed || trimmed.length < 1 || trimmed.length > 2000) {
    return res.status(422).json({
      success: false,
      error: {
        code: "VALIDATION_FAILED",
        message: "Comment content must be between 1 and 2000 characters.",
        fieldErrors: [{ field: "content", message: "Comment content must be between 1 and 2000 characters." }],
      },
    });
  }

  const comment = await prisma.publicComment.create({
    data: {
      ticketId: ticket.id,
      authorId: currentUser.id,
      content: trimmed,
    },
    include: {
      author: { select: { id: true, name: true, role: true } },
    },
  });

  return res.status(201).json({
    success: true,
    data: {
      id: comment.id,
      ticketId: comment.ticketId,
      author: {
        id: comment.author.id,
        name: comment.author.name,
        role: comment.author.role,
      },
      content: comment.content,
      createdAt: comment.createdAt.toISOString(),
    },
  });
}

/**
 * POST /api/v1/tickets/:id/notes
 * Post Internal Note (IT Staff and Admin only; 403 Forbidden for Requester) - BR-04, BR-08.
 */
export async function handleCreateInternalNote(req: Request, res: Response) {
  const prisma = getPrisma();
  const authResult = await resolveUserFromRequest(req, prisma);
  if (!authResult.user) {
    const err = authResult.error || { status: 401, code: "UNAUTHORIZED", message: "Active authenticated session required." };
    return res.status(err.status).json({
      success: false,
      error: { code: err.code, message: err.message, details: [] },
    });
  }
  const currentUser = authResult.user;

  // Strict Role Guard for Internal Notes (BR-04)
  if (currentUser.role !== Role.IT_STAFF && currentUser.role !== Role.ADMINISTRATOR) {
    return res.status(403).json({
      success: false,
      error: {
        code: "FORBIDDEN_INTERNAL_NOTES",
        message: "Access denied. Only IT Staff and Administrators may record internal notes.",
      },
    });
  }

  const ticketId = parseInt(req.params.id, 10);
  if (isNaN(ticketId)) {
    return res.status(400).json({
      success: false,
      error: { code: "INVALID_TICKET_ID", message: "Invalid ticket ID." },
    });
  }

  const ticket = await prisma.ticket.findUnique({ where: { id: ticketId } });
  if (!ticket) {
    return res.status(404).json({
      success: false,
      error: { code: "TICKET_NOT_FOUND", message: "Ticket not found." },
    });
  }

  const { content } = req.body || {};
  const trimmed = typeof content === "string" ? content.trim() : "";
  if (!trimmed || trimmed.length < 1 || trimmed.length > 2000) {
    return res.status(422).json({
      success: false,
      error: {
        code: "VALIDATION_FAILED",
        message: "Note content must be between 1 and 2000 characters.",
        fieldErrors: [{ field: "content", message: "Note content must be between 1 and 2000 characters." }],
      },
    });
  }

  const note = await prisma.internalNote.create({
    data: {
      ticketId: ticket.id,
      authorId: currentUser.id,
      content: trimmed,
    },
    include: {
      author: { select: { id: true, name: true, role: true } },
    },
  });

  return res.status(201).json({
    success: true,
    data: {
      id: note.id,
      ticketId: note.ticketId,
      author: {
        id: note.author.id,
        name: note.author.name,
        role: note.author.role,
      },
      content: note.content,
      createdAt: note.createdAt.toISOString(),
    },
  });
}

export async function handleUploadTicketAttachment(req: Request, res: Response) {
  const prisma = getPrisma();

  // 1. Verify and extract requester ID from header
  let requesterId: number;
  if (req.user) {
    requesterId = req.user.id;
  } else {
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

    requesterId = parseInt(Array.isArray(rawRequesterId) ? rawRequesterId[0] : rawRequesterId, 10);
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
  }

  const requester = await prisma.user.findUnique({
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
ticketsRouter.post("/:id/resolve-request", handleResolveRequest);
ticketsRouter.post("/:id/comments", handleCreateComment);
ticketsRouter.post("/:id/notes", handleCreateInternalNote);
