import { Router, Request, Response } from "express";
import { Prisma, Priority, TicketStatus } from "@prisma/client";
import { getPrisma } from "../prisma.js";
import {
  authenticate,
  requirePasswordChanged,
  requireRole,
} from "../middleware/auth.js";

export const staffRouter = Router();

// Enforce authentication, first-login password change, and IT Staff / Admin role guard (BR-02, BR-06)
staffRouter.use(authenticate);
staffRouter.use(requirePasswordChanged);
staffRouter.use(requireRole(["IT_STAFF", "ADMINISTRATOR"]));

// Normalize status values and aliases
function normalizeStatus(input: string): TicketStatus | null {
  const norm = input.trim().toUpperCase().replace(/\s+/g, "_");
  if (norm === "NEW") return TicketStatus.NEW;
  if (norm === "OPEN" || norm === "ASSIGNED") return TicketStatus.OPEN;
  if (norm === "IN_PROGRESS") return TicketStatus.IN_PROGRESS;
  if (norm === "WAITING_FOR_REQUESTER" || norm === "PENDING_REQUESTER")
    return TicketStatus.WAITING_FOR_REQUESTER;
  if (norm === "RESOLVED") return TicketStatus.RESOLVED;
  if (norm === "CLOSED") return TicketStatus.CLOSED;
  if (norm === "REOPENED") return TicketStatus.REOPENED;
  if (norm === "CANCELLED") return TicketStatus.CANCELLED;
  return null;
}

// Normalize priority values
function normalizePriority(input: string): Priority | null {
  const norm = input.trim().toUpperCase();
  if (norm === "LOW") return Priority.LOW;
  if (norm === "MEDIUM") return Priority.MEDIUM;
  if (norm === "HIGH") return Priority.HIGH;
  if (norm === "URGENT") return Priority.URGENT;
  return null;
}

/**
 * GET /api/v1/staff/tickets
 * Shared IT Staff & Administrator ticket queue with search, multi-field filtering, sorting, and pagination.
 */
staffRouter.get("/tickets", async (req: Request, res: Response): Promise<void> => {
  try {
    const {
      search,
      status,
      category,
      itPriority,
      owner,
      sortBy = "createdAt",
      sortOrder = "desc",
      page = "1",
      pageSize = "10",
    } = req.query;

    const where: Prisma.TicketWhereInput = {};
    const fieldErrors: Array<{ field: string; message: string }> = [];

    // 1. Text Search (OR across ticketNumber and summary)
    if (typeof search === "string" && search.trim()) {
      const term = search.trim();
      where.OR = [
        { ticketNumber: { contains: term, mode: "insensitive" } },
        { summary: { contains: term, mode: "insensitive" } },
      ];
    }

    // 2. Status Filter
    if (typeof status === "string" && status.trim()) {
      const normalizedStatus = normalizeStatus(status);
      if (!normalizedStatus) {
        fieldErrors.push({
          field: "status",
          message: `Invalid status value provided: '${status}'. Allowed values: NEW, OPEN, IN_PROGRESS, WAITING_FOR_REQUESTER, RESOLVED, CLOSED, REOPENED, CANCELLED (or aliases ASSIGNED, PENDING_REQUESTER).`,
        });
      } else {
        where.currentStatus = normalizedStatus;
      }
    }

    // 3. Category Filter
    if (category !== undefined && category !== "") {
      const catId = Number(category);
      if (isNaN(catId) || catId <= 0) {
        fieldErrors.push({
          field: "category",
          message: "Category must be a positive integer ID.",
        });
      } else {
        where.categoryId = catId;
      }
    }

    // 4. IT Priority Filter
    if (typeof itPriority === "string" && itPriority.trim()) {
      const normalizedPri = normalizePriority(itPriority);
      if (!normalizedPri) {
        fieldErrors.push({
          field: "itPriority",
          message: `Invalid itPriority value provided: '${itPriority}'. Allowed values: LOW, MEDIUM, HIGH, URGENT.`,
        });
      } else {
        where.itPriority = normalizedPri;
      }
    }

    // 5. Owner Filter (unassigned vs specific user ID)
    if (typeof owner === "string" && owner.trim()) {
      const ownerVal = owner.trim();
      if (ownerVal.toLowerCase() === "unassigned") {
        where.ownerId = null;
      } else {
        const ownerId = Number(ownerVal);
        if (isNaN(ownerId) || ownerId <= 0) {
          fieldErrors.push({
            field: "owner",
            message: "Owner must be 'unassigned' or a positive integer user ID.",
          });
        } else {
          where.ownerId = ownerId;
        }
      }
    }

    // Return 400 if validation failed
    if (fieldErrors.length > 0) {
      res.status(400).json({
        success: false,
        error: {
          code: "INVALID_QUERY_PARAMETERS",
          message: "One or more query parameters are invalid.",
          fieldErrors,
        },
      });
      return;
    }

    // 6. Sorting
    const validSortFields: Record<string, string> = {
      createdAt: "createdAt",
      ticketNumber: "ticketNumber",
      summary: "summary",
      itPriority: "itPriority",
      currentStatus: "currentStatus",
      status: "currentStatus",
    };
    const sortField = validSortFields[sortBy as string] ?? "createdAt";
    const direction: "asc" | "desc" =
      typeof sortOrder === "string" && sortOrder.toLowerCase() === "asc"
        ? "asc"
        : "desc";
    const orderBy = { [sortField]: direction };

    // 7. Pagination Bounds
    let parsedPage = parseInt(page as string, 10);
    if (isNaN(parsedPage) || parsedPage < 1) {
      parsedPage = 1;
    }

    let parsedPageSize = parseInt(pageSize as string, 10);
    const allowedPageSizes = [10, 25, 50];
    if (isNaN(parsedPageSize) || !allowedPageSizes.includes(parsedPageSize)) {
      parsedPageSize = 10;
    }

    const skip = (parsedPage - 1) * parsedPageSize;
    const take = parsedPageSize;

    // 8. Execute Database Query
    const prisma = getPrisma();
    const [totalCount, tickets] = await prisma.$transaction([
      prisma.ticket.count({ where }),
      prisma.ticket.findMany({
        where,
        orderBy,
        skip,
        take,
        include: {
          category: true,
          relatedSystem: true,
          owner: {
            select: { id: true, name: true, email: true, role: true },
          },
          requester: {
            select: { id: true, name: true, email: true, department: true },
          },
        },
      }),
    ]);

    const totalPages = totalCount === 0 ? 0 : Math.ceil(totalCount / parsedPageSize);

    // 9. Format DTOs
    const items = tickets.map((t) => ({
      id: t.id,
      ticketNumber: t.ticketNumber,
      summary: t.summary,
      createdAt: t.createdAt.toISOString(),
      updatedAt: t.updatedAt.toISOString(),
      category: {
        id: t.category.id,
        name: t.category.name,
        code: t.category.code,
      },
      relatedSystem: {
        id: t.relatedSystem.id,
        name: t.relatedSystem.name,
      },
      requestedPriority: t.requestedPriority,
      itPriority: t.itPriority ?? t.requestedPriority,
      currentStatus: t.currentStatus,
      owner: t.owner
        ? {
            id: t.owner.id,
            name: t.owner.name,
            email: t.owner.email,
            role: t.owner.role as "IT_STAFF" | "ADMINISTRATOR",
          }
        : null,
      requester: {
        id: t.requester.id,
        name: t.requester.name,
        email: t.requester.email,
        department: t.requester.department,
      },
    }));

    // 10. Respond with Harmonized Dual Envelope
    res.status(200).json({
      success: true,
      data: {
        items,
        totalCount,
        page: parsedPage,
        pageSize: parsedPageSize,
        totalPages,
        pagination: {
          totalCount,
          page: parsedPage,
          pageSize: parsedPageSize,
          totalPages,
        },
      },
    });
  } catch (error: any) {
    console.error("Error retrieving staff ticket queue:", error);
    res.status(500).json({
      success: false,
      error: {
        code: "INTERNAL_ERROR",
        message: "Failed to retrieve ticket queue due to an unexpected server error.",
      },
    });
  }
});
