import { Router } from "express";
import { authenticate, requirePasswordChanged } from "../middleware/auth.js";
import {
  handleCreateActionTaken,
  handleGetActionsTaken,
  handleUpdateActionTaken,
} from "../controllers/actionsTaken.controller.js";

/**
 * Router for Actions Taken endpoints under /api/v1/tickets/:ticketId/actions-taken
 * Merges parent params (:id or :ticketId) so handlers can access the target ticket ID.
 */
export const actionsTakenRouter = Router({ mergeParams: true });

// All Actions Taken operations require authenticated active session with changed password
actionsTakenRouter.use(authenticate, requirePasswordChanged);

// POST /api/v1/tickets/:id/actions-taken - IT Staff & Admin only (BR-06)
actionsTakenRouter.post("/", handleCreateActionTaken);

// GET /api/v1/tickets/:id/actions-taken - IT Staff, Admin, and ticket-owning Requester (BR-06, BR-13)
actionsTakenRouter.get("/", handleGetActionsTaken);

// PUT /api/v1/tickets/:id/actions-taken/:actionId - IT Staff & Admin only with concurrency check (BR-06, BR-12)
actionsTakenRouter.put("/:actionId", handleUpdateActionTaken);
