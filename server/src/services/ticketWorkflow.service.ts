import { PrismaClient, TicketStatus } from "@prisma/client";

/**
 * Authoritative Status Transition Matrix (BR-06, SDS §4.2, Issue 20 Contract §2)
 * - CLOSED and CANCELLED are strictly terminal states (no outgoing transitions).
 */
export const ALLOWED_STATUS_TRANSITIONS: Record<TicketStatus, readonly TicketStatus[]> = {
  [TicketStatus.NEW]: [
    TicketStatus.OPEN,
    TicketStatus.IN_PROGRESS,
    TicketStatus.CANCELLED,
  ],
  [TicketStatus.OPEN]: [
    TicketStatus.IN_PROGRESS,
    TicketStatus.WAITING_FOR_REQUESTER,
    TicketStatus.RESOLVED,
    TicketStatus.CANCELLED,
  ],
  [TicketStatus.IN_PROGRESS]: [
    TicketStatus.WAITING_FOR_REQUESTER,
    TicketStatus.RESOLVED,
    TicketStatus.CANCELLED,
  ],
  [TicketStatus.WAITING_FOR_REQUESTER]: [
    TicketStatus.IN_PROGRESS,
    TicketStatus.RESOLVED,
    TicketStatus.CANCELLED,
  ],
  [TicketStatus.RESOLVED]: [
    TicketStatus.CLOSED,
    TicketStatus.REOPENED,
  ],
  [TicketStatus.CLOSED]: [],
  [TicketStatus.REOPENED]: [
    TicketStatus.IN_PROGRESS,
    TicketStatus.RESOLVED,
    TicketStatus.CANCELLED,
  ],
  [TicketStatus.CANCELLED]: [],
};

/**
 * Returns the list of allowed next statuses from a given status (BR-06).
 */
export function getAllowedNextStatuses(currentStatus: TicketStatus): readonly TicketStatus[] {
  return ALLOWED_STATUS_TRANSITIONS[currentStatus] ?? [];
}

/**
 * Validates whether transitioning from `from` to `to` is permitted by BR-06.
 */
export function isTransitionAllowed(from: TicketStatus, to: TicketStatus): boolean {
  const allowed = ALLOWED_STATUS_TRANSITIONS[from];
  if (!allowed) return false;
  return allowed.includes(to);
}

/**
 * Normalizes a raw status string into a canonical Prisma TicketStatus enum value.
 */
export function parseTicketStatus(input: unknown): TicketStatus | null {
  if (typeof input !== "string" || !input.trim()) {
    return null;
  }
  const norm = input.trim().toUpperCase().replace(/[\s-]+/g, "_");
  switch (norm) {
    case "NEW":
      return TicketStatus.NEW;
    case "OPEN":
    case "ASSIGNED":
      return TicketStatus.OPEN;
    case "IN_PROGRESS":
      return TicketStatus.IN_PROGRESS;
    case "WAITING_FOR_REQUESTER":
    case "PENDING_REQUESTER":
      return TicketStatus.WAITING_FOR_REQUESTER;
    case "RESOLVED":
      return TicketStatus.RESOLVED;
    case "CLOSED":
      return TicketStatus.CLOSED;
    case "REOPENED":
      return TicketStatus.REOPENED;
    case "CANCELLED":
      return TicketStatus.CANCELLED;
    default:
      return null;
  }
}

export interface WorkflowServiceResult {
  httpStatus: number;
  body: Record<string, any>;
}

/**
 * Executes a ticket status transition enforcing:
 * - BR-06: Strict Status Transition Matrix (400 Bad Request on invalid jump)
 * - BR-07: Resolution Gate Invariant (>= 1 ActionTaken required for RESOLVED, 400 Bad Request)
 * - BR-09: Optimistic Concurrency Control via updatedAt timestamp comparison (409 Conflict)
 */
export async function executeTicketStatusTransition(
  prisma: PrismaClient,
  params: {
    ticketId: number;
    rawStatus: unknown;
    updatedAt?: unknown;
  }
): Promise<WorkflowServiceResult> {
  const { ticketId, rawStatus, updatedAt } = params;

  const ticket = await prisma.ticket.findUnique({
    where: { id: ticketId },
  });

  if (!ticket) {
    return {
      httpStatus: 404,
      body: {
        success: false,
        error: {
          code: "TICKET_NOT_FOUND",
          message: "Ticket not found.",
        },
      },
    };
  }

  // 1. Validate target status enum
  if (typeof rawStatus !== "string" || !rawStatus.trim()) {
    return {
      httpStatus: 400,
      body: {
        success: false,
        error: {
          code: "VALIDATION_ERROR",
          message: "Target status is required.",
        },
      },
    };
  }

  const nextStatus = parseTicketStatus(rawStatus);
  if (!nextStatus) {
    return {
      httpStatus: 400,
      body: {
        success: false,
        error: {
          code: "VALIDATION_ERROR",
          message: `Invalid status value: ${rawStatus}.`,
        },
      },
    };
  }

  // 2. Optimistic Concurrency Control (BR-09)
  if (updatedAt !== undefined && updatedAt !== null && updatedAt !== "") {
    if (typeof updatedAt !== "string") {
      return {
        httpStatus: 400,
        body: {
          success: false,
          error: {
            code: "VALIDATION_ERROR",
            message: "updatedAt must be a valid ISO-8601 timestamp string.",
          },
        },
      };
    }

    const clientTimeMs = new Date(updatedAt).getTime();
    if (Number.isNaN(clientTimeMs)) {
      return {
        httpStatus: 400,
        body: {
          success: false,
          error: {
            code: "VALIDATION_ERROR",
            message: "updatedAt must be a valid ISO-8601 timestamp string.",
          },
        },
      };
    }

    const dbTimeMs = ticket.updatedAt.getTime();
    if (clientTimeMs !== dbTimeMs) {
      return {
        httpStatus: 409,
        body: {
          success: false,
          error: {
            code: "CONFLICT",
            message: "Ticket was modified by another user. Please refresh and try again.",
          },
        },
      };
    }
  }

  // 3. Enforce Status Transition Matrix (BR-06)
  if (!isTransitionAllowed(ticket.currentStatus, nextStatus)) {
    return {
      httpStatus: 400,
      body: {
        success: false,
        error: {
          code: "INVALID_STATUS_TRANSITION",
          message: `Invalid status transition from ${ticket.currentStatus} to ${nextStatus}.`,
        },
      },
    };
  }

  // 4. Enforce Resolution Gate Invariant (BR-07)
  if (nextStatus === TicketStatus.RESOLVED) {
    const actionCount = await prisma.actionTaken.count({
      where: { ticketId },
    });

    if (actionCount < 1) {
      return {
        httpStatus: 400,
        body: {
          success: false,
          error: {
            code: "VALIDATION_ERROR",
            message: "Cannot resolve ticket without at least one recorded Action Taken.",
          },
        },
      };
    }
  }

  // 5. Persist status update and guarantee strictly monotonic updatedAt timestamp
  const now = new Date();
  const nextUpdatedAt =
    now.getTime() <= ticket.updatedAt.getTime()
      ? new Date(ticket.updatedAt.getTime() + 1)
      : now;

  const updated = await prisma.ticket.update({
    where: { id: ticketId },
    data: {
      currentStatus: nextStatus,
      updatedAt: nextUpdatedAt,
      version: { increment: 1 },
    },
  });

  const updatedIso = updated.updatedAt.toISOString();
  const resolvedAt = updated.currentStatus === TicketStatus.RESOLVED ? updatedIso : null;
  const closedAt = updated.currentStatus === TicketStatus.CLOSED ? updatedIso : null;

  const payload = {
    id: updated.id,
    ticketNumber: updated.ticketNumber,
    currentStatus: updated.currentStatus,
    resolvedAt,
    closedAt,
    updatedAt: updatedIso,
  };

  return {
    httpStatus: 200,
    body: {
      success: true,
      ...payload,
      data: payload,
    },
  };
}

/**
 * Records Requester Advisory Problem Resolution (BR-08).
 * Updates requesterResolutionConfirmedAt without modifying currentStatus.
 */
export async function executeRequesterAdvisoryResolution(
  prisma: PrismaClient,
  params: {
    ticketId: number;
    requesterId: number;
  }
): Promise<WorkflowServiceResult> {
  const { ticketId, requesterId } = params;

  const ticket = await prisma.ticket.findUnique({
    where: { id: ticketId },
  });

  if (!ticket) {
    return {
      httpStatus: 404,
      body: {
        success: false,
        error: {
          code: "TICKET_NOT_FOUND",
          message: "Ticket not found.",
        },
      },
    };
  }

  if (ticket.requesterId !== requesterId) {
    return {
      httpStatus: 403,
      body: {
        success: false,
        error: {
          code: "FORBIDDEN_ACTION",
          message: "Only the owning requester may record problem resolution confirmation.",
        },
      },
    };
  }

  if (
    ticket.currentStatus === TicketStatus.CLOSED ||
    ticket.currentStatus === TicketStatus.CANCELLED
  ) {
    return {
      httpStatus: 400,
      body: {
        success: false,
        error: {
          code: "INVALID_TICKET_STATE",
          message: `Cannot record advisory resolution on a ${ticket.currentStatus} ticket.`,
        },
      },
    };
  }

  const now = new Date();
  const updated = await prisma.ticket.update({
    where: { id: ticketId },
    data: {
      requesterResolutionConfirmedAt: now,
    },
  });

  const confirmedIso = now.toISOString();
  const payload = {
    id: updated.id,
    ticketNumber: updated.ticketNumber,
    currentStatus: updated.currentStatus,
    requesterResolvedAt: confirmedIso,
    requesterResolutionConfirmedAt: confirmedIso,
    updatedAt: updated.updatedAt.toISOString(),
    message: "Problem resolution indication recorded.",
  };

  return {
    httpStatus: 200,
    body: {
      success: true,
      ...payload,
      data: payload,
    },
  };
}

