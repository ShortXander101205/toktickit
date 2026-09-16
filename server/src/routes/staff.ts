import { Router, Request, Response } from "express";
import { Prisma, Priority, TicketStatus, Role } from "@prisma/client";
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

// Status Transition Matrix validator (SDS Approved Decision D-02 / Spec §6.1)
export function isTransitionAllowed(from: TicketStatus, to: TicketStatus): boolean {
  if (from === to) return true;
  switch (from) {
    case TicketStatus.NEW:
      return ([TicketStatus.OPEN, TicketStatus.IN_PROGRESS, TicketStatus.CANCELLED] as TicketStatus[]).includes(to);
    case TicketStatus.OPEN:
      return ([TicketStatus.IN_PROGRESS, TicketStatus.WAITING_FOR_REQUESTER, TicketStatus.RESOLVED, TicketStatus.CANCELLED] as TicketStatus[]).includes(to);
    case TicketStatus.IN_PROGRESS:
      return ([TicketStatus.WAITING_FOR_REQUESTER, TicketStatus.RESOLVED, TicketStatus.CANCELLED] as TicketStatus[]).includes(to);
    case TicketStatus.WAITING_FOR_REQUESTER:
      return ([TicketStatus.IN_PROGRESS, TicketStatus.RESOLVED, TicketStatus.CANCELLED] as TicketStatus[]).includes(to);
    case TicketStatus.RESOLVED:
      return ([TicketStatus.CLOSED, TicketStatus.REOPENED, TicketStatus.CANCELLED] as TicketStatus[]).includes(to);
    case TicketStatus.CLOSED:
      return ([TicketStatus.REOPENED] as TicketStatus[]).includes(to);
    case TicketStatus.REOPENED:
      return ([TicketStatus.OPEN, TicketStatus.IN_PROGRESS, TicketStatus.CANCELLED] as TicketStatus[]).includes(to);
    case TicketStatus.CANCELLED:
      return ([TicketStatus.REOPENED] as TicketStatus[]).includes(to);
    default:
      return false;
  }
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

/**
 * GET /api/v1/staff/assignees
 * List all active IT Staff and Administrator users for ownership assignment.
 */
staffRouter.get("/assignees", async (_req: Request, res: Response): Promise<void> => {
  try {
    const prisma = getPrisma();
    const members = await prisma.user.findMany({
      where: {
        isActive: true,
        role: { in: [Role.IT_STAFF, Role.ADMINISTRATOR] },
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
      },
      orderBy: { name: "asc" },
    });
    res.status(200).json({
      success: true,
      data: members,
    });
  } catch (error: any) {
    console.error("Error retrieving staff assignees:", error);
    res.status(500).json({
      success: false,
      error: { code: "INTERNAL_ERROR", message: "Failed to retrieve assignees." },
    });
  }
});

/**
 * PATCH /api/v1/staff/tickets/:id/assignment
 * Assign or reassign ticket owner, or unassign (ownerId: null).
 */
staffRouter.patch("/tickets/:id/assignment", async (req: Request, res: Response): Promise<void> => {
  try {
    const prisma = getPrisma();
    const ticketId = parseInt(req.params.id, 10);
    if (isNaN(ticketId)) {
      res.status(400).json({
        success: false,
        error: { code: "INVALID_TICKET_ID", message: "Invalid ticket ID." },
      });
      return;
    }

    const ticket = await prisma.ticket.findUnique({ where: { id: ticketId } });
    if (!ticket) {
      res.status(404).json({
        success: false,
        error: { code: "TICKET_NOT_FOUND", message: "Ticket not found." },
      });
      return;
    }

    const { ownerId } = req.body;
    let targetOwnerId: number | null = null;

    if (ownerId !== null && ownerId !== undefined) {
      const parsedId = typeof ownerId === "number" ? ownerId : parseInt(ownerId, 10);
      if (isNaN(parsedId)) {
        res.status(422).json({
          success: false,
          error: { code: "INVALID_OWNER", message: "ownerId must be a valid integer or null." },
        });
        return;
      }

      const targetUser = await prisma.user.findUnique({ where: { id: parsedId } });
      if (!targetUser || !targetUser.isActive || targetUser.role === Role.REQUESTER) {
        res.status(422).json({
          success: false,
          error: {
            code: "INVALID_OWNER",
            message: "Assigned owner must be an active IT Staff or Administrator.",
          },
        });
        return;
      }
      targetOwnerId = targetUser.id;
    }

    const updated = await prisma.ticket.update({
      where: { id: ticketId },
      data: { ownerId: targetOwnerId },
      include: {
        owner: { select: { id: true, name: true, email: true, role: true } },
      },
    });

    res.status(200).json({
      success: true,
      data: {
        id: updated.id,
        ticketNumber: updated.ticketNumber,
        ownerId: updated.ownerId,
        owner: updated.owner
          ? {
              id: updated.owner.id,
              name: updated.owner.name,
              email: updated.owner.email,
              role: updated.owner.role,
            }
          : null,
        updatedAt: updated.updatedAt.toISOString(),
      },
    });
  } catch (error: any) {
    console.error("Error updating ticket assignment:", error);
    res.status(500).json({
      success: false,
      error: { code: "INTERNAL_ERROR", message: "Failed to update ticket assignment." },
    });
  }
});

/**
 * PATCH /api/v1/staff/tickets/:id/priority
 * Update itPriority (LOW, MEDIUM, HIGH, URGENT).
 */
staffRouter.patch("/tickets/:id/priority", async (req: Request, res: Response): Promise<void> => {
  try {
    const prisma = getPrisma();
    const ticketId = parseInt(req.params.id, 10);
    if (isNaN(ticketId)) {
      res.status(400).json({
        success: false,
        error: { code: "INVALID_TICKET_ID", message: "Invalid ticket ID." },
      });
      return;
    }

    const ticket = await prisma.ticket.findUnique({ where: { id: ticketId } });
    if (!ticket) {
      res.status(404).json({
        success: false,
        error: { code: "TICKET_NOT_FOUND", message: "Ticket not found." },
      });
      return;
    }

    const { itPriority } = req.body;
    if (!itPriority || typeof itPriority !== "string") {
      res.status(422).json({
        success: false,
        error: { code: "INVALID_PRIORITY", message: "itPriority is required." },
      });
      return;
    }

    const pri = normalizePriority(itPriority);
    if (!pri) {
      res.status(422).json({
        success: false,
        error: {
          code: "INVALID_PRIORITY",
          message: "Invalid IT priority. Must be one of LOW, MEDIUM, HIGH, URGENT.",
        },
      });
      return;
    }

    const updated = await prisma.ticket.update({
      where: { id: ticketId },
      data: { itPriority: pri },
    });

    res.status(200).json({
      success: true,
      data: {
        id: updated.id,
        ticketNumber: updated.ticketNumber,
        itPriority: updated.itPriority,
        updatedAt: updated.updatedAt.toISOString(),
      },
    });
  } catch (error: any) {
    console.error("Error updating IT priority:", error);
    res.status(500).json({
      success: false,
      error: { code: "INTERNAL_ERROR", message: "Failed to update IT priority." },
    });
  }
});

/**
 * PATCH /api/v1/staff/tickets/:id/status
 * Transition status adhering to the Status Transition Matrix.
 */
staffRouter.patch("/tickets/:id/status", async (req: Request, res: Response): Promise<void> => {
  try {
    const prisma = getPrisma();
    const ticketId = parseInt(req.params.id, 10);
    if (isNaN(ticketId)) {
      res.status(400).json({
        success: false,
        error: { code: "INVALID_TICKET_ID", message: "Invalid ticket ID." },
      });
      return;
    }

    const ticket = await prisma.ticket.findUnique({ where: { id: ticketId } });
    if (!ticket) {
      res.status(404).json({
        success: false,
        error: { code: "TICKET_NOT_FOUND", message: "Ticket not found." },
      });
      return;
    }

    const { targetStatus, status } = req.body;
    const rawStatus = targetStatus || status;
    if (!rawStatus || typeof rawStatus !== "string") {
      res.status(422).json({
        success: false,
        error: { code: "INVALID_STATUS", message: "targetStatus is required." },
      });
      return;
    }

    const nextStatus = normalizeStatus(rawStatus);
    if (!nextStatus) {
      res.status(422).json({
        success: false,
        error: { code: "INVALID_STATUS", message: "Invalid status value." },
      });
      return;
    }

    if (!isTransitionAllowed(ticket.currentStatus, nextStatus)) {
      res.status(422).json({
        success: false,
        error: {
          code: "INVALID_STATUS_TRANSITION",
          message: `Cannot transition status from ${ticket.currentStatus} to ${nextStatus}.`,
        },
      });
      return;
    }

    const updated = await prisma.ticket.update({
      where: { id: ticketId },
      data: { currentStatus: nextStatus },
    });

    res.status(200).json({
      success: true,
      data: {
        id: updated.id,
        ticketNumber: updated.ticketNumber,
        currentStatus: updated.currentStatus,
        updatedAt: updated.updatedAt.toISOString(),
      },
    });
  } catch (error: any) {
    console.error("Error updating ticket status:", error);
    res.status(500).json({
      success: false,
      error: { code: "INTERNAL_ERROR", message: "Failed to update ticket status." },
    });
  }
});
