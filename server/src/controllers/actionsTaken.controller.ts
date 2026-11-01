import { Request, Response } from "express";
import { Role } from "@prisma/client";
import { getPrisma } from "../prisma.js";

/**
 * POST /api/v1/tickets/:ticketId/actions-taken
 * Records a new Action Taken by IT Staff or Administrator (BR-01, BR-02, BR-03, BR-04, BR-05, BR-06, BR-07)
 */
export async function handleCreateActionTaken(req: Request, res: Response): Promise<Response> {
  const prisma = getPrisma();

  // 1. Authenticated session check
  if (!req.user) {
    return res.status(401).json({
      success: false,
      error: {
        code: "UNAUTHORIZED",
        message: "Authentication required to record actions taken.",
      },
    });
  }

  // 2. Role-Based Access Control (BR-06)
  if (req.user.role !== Role.IT_STAFF && req.user.role !== Role.ADMINISTRATOR) {
    return res.status(403).json({
      success: false,
      error: {
        code: "FORBIDDEN_ACTION_TAKEN_WRITE",
        message: "Access denied. Only IT Staff and Administrators may record actions taken.",
      },
    });
  }

  // 3. Active account invariant check (BR-07)
  const staffUser = await prisma.user.findUnique({
    where: { id: req.user.id },
  });
  if (!staffUser || !staffUser.isActive) {
    return res.status(403).json({
      success: false,
      error: {
        code: "INACTIVE_ACCOUNT",
        message: "User account is inactive or no longer permitted to record work.",
      },
    });
  }

  // 4. Target ticket ID parsing & validation
  const rawTicketId = req.params.ticketId || req.params.id;
  const ticketId = parseInt(rawTicketId, 10);
  if (isNaN(ticketId) || ticketId <= 0) {
    return res.status(400).json({
      success: false,
      error: {
        code: "INVALID_TICKET_ID",
        message: "Ticket ID must be a valid positive integer.",
      },
    });
  }

  // 5. Verify target ticket exists
  const ticket = await prisma.ticket.findUnique({
    where: { id: ticketId },
  });
  if (!ticket) {
    return res.status(404).json({
      success: false,
      error: {
        code: "TICKET_NOT_FOUND",
        message: "Ticket not found with the specified ID.",
      },
    });
  }

  // 6. Action Description validation (BR-05) - accepts actionDescription or description
  const rawDescription = req.body.actionDescription ?? req.body.description;
  const actionDescription = typeof rawDescription === "string" ? rawDescription.trim() : "";
  if (actionDescription.length < 5 || actionDescription.length > 1000) {
    return res.status(422).json({
      success: false,
      error: {
        code: "INVALID_DESCRIPTION",
        message: "Action description must be between 5 and 1000 characters.",
        fieldErrors: [{ field: "actionDescription", message: "Description must be 5-1000 characters." }],
      },
    });
  }

  // 7. Result validation (BR-05)
  const rawResult = req.body.result;
  const result = typeof rawResult === "string" ? rawResult.trim() : "";
  if (result.length < 2 || result.length > 1000) {
    return res.status(422).json({
      success: false,
      error: {
        code: "INVALID_RESULT",
        message: "Result must be between 2 and 1000 characters.",
        fieldErrors: [{ field: "result", message: "Result must be 2-1000 characters." }],
      },
    });
  }

  // 8. Conditional Follow-Up validation (BR-04)
  const followUpRequired = Boolean(req.body.followUpRequired);
  let followUpNote: string | null = null;
  if (followUpRequired) {
    const rawNote = req.body.followUpNote;
    const note = typeof rawNote === "string" ? rawNote.trim() : "";
    if (note.length < 5 || note.length > 1000) {
      return res.status(422).json({
        success: false,
        error: {
          code: "MISSING_FOLLOW_UP_NOTE",
          message: "Follow-up note is required and must be between 5 and 1000 characters when follow-up is required.",
          fieldErrors: [{ field: "followUpNote", message: "Follow-up note is mandatory when follow-up is required." }],
        },
      });
    }
    followUpNote = note;
  }

  // 9. Attachment notes validation (BR-05)
  let attachmentNotes: string | null = null;
  if (req.body.attachmentNotes !== undefined && req.body.attachmentNotes !== null) {
    const rawAttach = req.body.attachmentNotes.toString().trim();
    if (rawAttach.length > 255) {
      return res.status(422).json({
        success: false,
        error: {
          code: "INVALID_ATTACHMENT_NOTES",
          message: "Attachment notes must not exceed 255 characters.",
          fieldErrors: [{ field: "attachmentNotes", message: "Max length is 255 characters." }],
        },
      });
    }
    attachmentNotes = rawAttach.length > 0 ? rawAttach : null;
  }

  // 10. Action Date/Time validation (BR-05) - default now(), reject future beyond 60s
  let actionDateTime = new Date();
  if (req.body.actionDateTime) {
    const parsedDate = new Date(req.body.actionDateTime);
    if (isNaN(parsedDate.getTime())) {
      return res.status(422).json({
        success: false,
        error: {
          code: "INVALID_ACTION_DATE",
          message: "Action date/time must be a valid ISO 8601 string.",
        },
      });
    }
    // Reject future dates exceeding 60 seconds tolerance for clock skew
    if (parsedDate.getTime() > Date.now() + 60000) {
      return res.status(422).json({
        success: false,
        error: {
          code: "FUTURE_ACTION_DATE",
          message: "Action date/time cannot be in the future.",
        },
      });
    }
    actionDateTime = parsedDate;
  }

  // 11. Performer Identity Invariant (BR-03)
  // Performer is strictly derived from session; client-provided performer is discarded
  const performedById = req.user.id;

  // 12. Persist Action Taken
  const created = await prisma.actionTaken.create({
    data: {
      ticketId,
      performedById,
      actionDateTime,
      actionDescription,
      result,
      followUpRequired,
      followUpNote,
      attachmentNotes,
      version: 1,
    },
    include: {
      performedBy: {
        select: {
          id: true,
          name: true,
          role: true,
        },
      },
    },
  });

  return res.status(201).json({
    success: true,
    data: {
      actionTaken: {
        id: created.id,
        ticketId: created.ticketId,
        actionDateTime: created.actionDateTime.toISOString(),
        actionDescription: created.actionDescription,
        result: created.result,
        followUpRequired: created.followUpRequired,
        followUpNote: created.followUpNote,
        attachmentNotes: created.attachmentNotes,
        version: created.version,
        performedBy: {
          id: created.performedBy.id,
          name: created.performedBy.name,
          role: created.performedBy.role,
        },
        createdAt: created.createdAt.toISOString(),
        updatedAt: created.updatedAt.toISOString(),
      },
    },
  });
}

/**
 * GET /api/v1/tickets/:ticketId/actions-taken
 * Lists all actions taken for a ticket in ascending chronological order (FR-01.5, BR-06, BR-13)
 */
export async function handleGetActionsTaken(req: Request, res: Response): Promise<Response> {
  const prisma = getPrisma();

  // 1. Authenticated session check
  if (!req.user) {
    return res.status(401).json({
      success: false,
      error: {
        code: "UNAUTHORIZED",
        message: "Authentication required to view actions taken.",
      },
    });
  }

  // 2. Target ticket ID parsing & validation
  const rawTicketId = req.params.ticketId || req.params.id;
  const ticketId = parseInt(rawTicketId, 10);
  if (isNaN(ticketId) || ticketId <= 0) {
    return res.status(400).json({
      success: false,
      error: {
        code: "INVALID_TICKET_ID",
        message: "Ticket ID must be a valid positive integer.",
      },
    });
  }

  // 3. Verify target ticket exists
  const ticket = await prisma.ticket.findUnique({
    where: { id: ticketId },
  });
  if (!ticket) {
    return res.status(404).json({
      success: false,
      error: {
        code: "TICKET_NOT_FOUND",
        message: "Ticket not found with the specified ID.",
      },
    });
  }

  // 4. Role & Ownership check (BR-06, BR-13)
  // Requesters can only inspect actions taken on their own tickets
  if (req.user.role === Role.REQUESTER && ticket.requesterId !== req.user.id) {
    return res.status(403).json({
      success: false,
      error: {
        code: "FORBIDDEN_TICKET_ACCESS",
        message: "Access denied. You may only view actions taken on tickets you submitted.",
      },
    });
  }

  // 5. Query actions taken in ascending chronological order
  const actions = await prisma.actionTaken.findMany({
    where: { ticketId },
    orderBy: { actionDateTime: "asc" },
    include: {
      performedBy: {
        select: {
          id: true,
          name: true,
          role: true,
        },
      },
    },
  });

  return res.status(200).json({
    success: true,
    data: {
      items: actions.map((a) => ({
        id: a.id,
        ticketId: a.ticketId,
        actionDateTime: a.actionDateTime.toISOString(),
        actionDescription: a.actionDescription,
        result: a.result,
        followUpRequired: a.followUpRequired,
        followUpNote: a.followUpNote,
        attachmentNotes: a.attachmentNotes,
        version: a.version,
        performedBy: {
          id: a.performedBy.id,
          name: a.performedBy.name,
          role: a.performedBy.role,
        },
        createdAt: a.createdAt.toISOString(),
        updatedAt: a.updatedAt.toISOString(),
      })),
      totalCount: actions.length,
    },
  });
}

/**
 * PUT /api/v1/tickets/:ticketId/actions-taken/:actionId
 * Updates an existing Action Taken with optimistic concurrency version check (FR-01.6, FR-05.2, BR-12)
 */
export async function handleUpdateActionTaken(req: Request, res: Response): Promise<Response> {
  const prisma = getPrisma();

  // 1. Authenticated session check
  if (!req.user) {
    return res.status(401).json({
      success: false,
      error: {
        code: "UNAUTHORIZED",
        message: "Authentication required to update actions taken.",
      },
    });
  }

  // 2. Role-Based Access Control (BR-06)
  if (req.user.role !== Role.IT_STAFF && req.user.role !== Role.ADMINISTRATOR) {
    return res.status(403).json({
      success: false,
      error: {
        code: "FORBIDDEN_ACTION_TAKEN_WRITE",
        message: "Access denied. Only IT Staff and Administrators may update actions taken.",
      },
    });
  }

  // 3. Active account invariant check (BR-07)
  const staffUser = await prisma.user.findUnique({
    where: { id: req.user.id },
  });
  if (!staffUser || !staffUser.isActive) {
    return res.status(403).json({
      success: false,
      error: {
        code: "INACTIVE_ACCOUNT",
        message: "User account is inactive or no longer permitted to record work.",
      },
    });
  }

  // 4. Ticket and Action ID parsing & validation
  const rawTicketId = req.params.ticketId || req.params.id;
  const ticketId = parseInt(rawTicketId, 10);
  const actionId = parseInt(req.params.actionId, 10);
  if (isNaN(ticketId) || ticketId <= 0 || isNaN(actionId) || actionId <= 0) {
    return res.status(400).json({
      success: false,
      error: {
        code: "INVALID_IDENTIFIERS",
        message: "Ticket ID and Action ID must be valid positive integers.",
      },
    });
  }

  // 5. Verify target ticket exists
  const ticket = await prisma.ticket.findUnique({
    where: { id: ticketId },
  });
  if (!ticket) {
    return res.status(404).json({
      success: false,
      error: {
        code: "TICKET_NOT_FOUND",
        message: "Ticket not found with the specified ID.",
      },
    });
  }

  // 6. Verify target action exists under this ticket
  const existingAction = await prisma.actionTaken.findFirst({
    where: { id: actionId, ticketId },
  });
  if (!existingAction) {
    return res.status(404).json({
      success: false,
      error: {
        code: "ACTION_NOT_FOUND",
        message: "Action taken record not found for this ticket.",
      },
    });
  }

  // 7. Optimistic Concurrency Control (BR-12)
  const clientVersion = req.body.version;
  if (typeof clientVersion !== "number") {
    return res.status(400).json({
      success: false,
      error: {
        code: "MISSING_VERSION",
        message: "Version number is required for concurrency control.",
      },
    });
  }

  if (existingAction.version !== clientVersion) {
    return res.status(409).json({
      success: false,
      error: {
        code: "CONCURRENCY_CONFLICT",
        message: "Action Taken has been modified by another user. Please refresh and try again.",
        currentVersion: existingAction.version,
      },
    });
  }

  // 8. Action Description validation (if updated or provided)
  const rawDescription = req.body.actionDescription ?? req.body.description ?? existingAction.actionDescription;
  const actionDescription = typeof rawDescription === "string" ? rawDescription.trim() : "";
  if (actionDescription.length < 5 || actionDescription.length > 1000) {
    return res.status(422).json({
      success: false,
      error: {
        code: "INVALID_DESCRIPTION",
        message: "Action description must be between 5 and 1000 characters.",
        fieldErrors: [{ field: "actionDescription", message: "Description must be 5-1000 characters." }],
      },
    });
  }

  // 9. Result validation (if updated or provided)
  const rawResult = req.body.result !== undefined ? req.body.result : existingAction.result;
  const result = typeof rawResult === "string" ? rawResult.trim() : "";
  if (result.length < 2 || result.length > 1000) {
    return res.status(422).json({
      success: false,
      error: {
        code: "INVALID_RESULT",
        message: "Result must be between 2 and 1000 characters.",
        fieldErrors: [{ field: "result", message: "Result must be 2-1000 characters." }],
      },
    });
  }

  // 10. Conditional Follow-Up validation (BR-04)
  const followUpRequired =
    req.body.followUpRequired !== undefined ? Boolean(req.body.followUpRequired) : existingAction.followUpRequired;
  let followUpNote: string | null = null;
  if (followUpRequired) {
    const rawNote = req.body.followUpNote !== undefined ? req.body.followUpNote : existingAction.followUpNote;
    const note = typeof rawNote === "string" ? rawNote.trim() : "";
    if (note.length < 5 || note.length > 1000) {
      return res.status(422).json({
        success: false,
        error: {
          code: "MISSING_FOLLOW_UP_NOTE",
          message: "Follow-up note is required and must be between 5 and 1000 characters when follow-up is required.",
          fieldErrors: [{ field: "followUpNote", message: "Follow-up note is mandatory when follow-up is required." }],
        },
      });
    }
    followUpNote = note;
  }

  // 11. Attachment notes validation
  let attachmentNotes: string | null = existingAction.attachmentNotes;
  if (req.body.attachmentNotes !== undefined) {
    if (req.body.attachmentNotes === null) {
      attachmentNotes = null;
    } else {
      const rawAttach = req.body.attachmentNotes.toString().trim();
      if (rawAttach.length > 255) {
        return res.status(422).json({
          success: false,
          error: {
            code: "INVALID_ATTACHMENT_NOTES",
            message: "Attachment notes must not exceed 255 characters.",
            fieldErrors: [{ field: "attachmentNotes", message: "Max length is 255 characters." }],
          },
        });
      }
      attachmentNotes = rawAttach.length > 0 ? rawAttach : null;
    }
  }

  // 12. Action Date/Time validation
  let actionDateTime = existingAction.actionDateTime;
  if (req.body.actionDateTime) {
    const parsedDate = new Date(req.body.actionDateTime);
    if (isNaN(parsedDate.getTime())) {
      return res.status(422).json({
        success: false,
        error: {
          code: "INVALID_ACTION_DATE",
          message: "Action date/time must be a valid ISO 8601 string.",
        },
      });
    }
    if (parsedDate.getTime() > Date.now() + 60000) {
      return res.status(422).json({
        success: false,
        error: {
          code: "FUTURE_ACTION_DATE",
          message: "Action date/time cannot be in the future.",
        },
      });
    }
    actionDateTime = parsedDate;
  }

  // 13. Persist update with version increment
  const updated = await prisma.actionTaken.update({
    where: { id: actionId },
    data: {
      actionDateTime,
      actionDescription,
      result,
      followUpRequired,
      followUpNote,
      attachmentNotes,
      version: existingAction.version + 1,
    },
    include: {
      performedBy: {
        select: {
          id: true,
          name: true,
          role: true,
        },
      },
    },
  });

  return res.status(200).json({
    success: true,
    data: {
      actionTaken: {
        id: updated.id,
        ticketId: updated.ticketId,
        actionDateTime: updated.actionDateTime.toISOString(),
        actionDescription: updated.actionDescription,
        result: updated.result,
        followUpRequired: updated.followUpRequired,
        followUpNote: updated.followUpNote,
        attachmentNotes: updated.attachmentNotes,
        version: updated.version,
        performedBy: {
          id: updated.performedBy.id,
          name: updated.performedBy.name,
          role: updated.performedBy.role,
        },
        createdAt: updated.createdAt.toISOString(),
        updatedAt: updated.updatedAt.toISOString(),
      },
    },
  });
}

