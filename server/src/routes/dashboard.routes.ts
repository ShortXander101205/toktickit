import { Router } from "express";
import {
  authenticate,
  optionalAuthenticate,
  requirePasswordChanged,
  requireRole,
} from "../middleware/auth.js";
import {
  getRequesterDashboardHandler,
  getStaffDashboardHandler,
  getAdminDashboardHandler,
} from "../controllers/dashboard.controller.js";

export const dashboardRouter = Router();

// GET /api/v1/dashboards/requester (BR-10, BR-13)
// Supports session token authentication or x-requester-id fallback in dev/test
dashboardRouter.get(
  "/requester",
  optionalAuthenticate,
  requirePasswordChanged,
  getRequesterDashboardHandler
);

// GET /api/v1/dashboards/staff (BR-11, BR-13, BR-14)
// Restricted to IT Staff and Administrators
dashboardRouter.get(
  "/staff",
  authenticate,
  requirePasswordChanged,
  requireRole(["IT_STAFF", "ADMINISTRATOR"]),
  getStaffDashboardHandler
);

// GET /api/v1/dashboards/admin (BR-12, BR-13, BR-14)
// Restricted to Administrators only
dashboardRouter.get(
  "/admin",
  authenticate,
  requirePasswordChanged,
  requireRole(["ADMINISTRATOR"]),
  getAdminDashboardHandler
);

