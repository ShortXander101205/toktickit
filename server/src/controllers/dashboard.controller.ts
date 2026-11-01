import { Request, Response } from "express";
import { getPrisma } from "../prisma.js";
import {
  getRequesterDashboardMetrics,
  getStaffDashboardMetrics,
  getAdminDashboardMetrics,
} from "../services/dashboard.service.js";

/**
 * GET /api/v1/dashboards/requester
 * Requester operational metrics strictly isolated to the authenticated requester (BR-10, BR-13)
 */
export async function getRequesterDashboardHandler(req: Request, res: Response): Promise<void> {
  try {
    let requesterId: number;

    if (req.user) {
      requesterId = req.user.id;
    } else {
      const rawRequesterId = req.headers["x-requester-id"];
      if (!rawRequesterId) {
        res.status(401).json({
          success: false,
          error: {
            code: "UNAUTHORIZED",
            message: "Authentication required to access requester dashboard.",
          },
        });
        return;
      }

      requesterId = parseInt(Array.isArray(rawRequesterId) ? rawRequesterId[0] : rawRequesterId, 10);
      if (isNaN(requesterId) || requesterId <= 0) {
        res.status(401).json({
          success: false,
          error: {
            code: "UNAUTHORIZED",
            message: "Invalid requester identification header.",
          },
        });
        return;
      }

      const prisma = getPrisma();
      const user = await prisma.user.findUnique({ where: { id: requesterId } });
      if (!user || !user.isActive) {
        res.status(401).json({
          success: false,
          error: {
            code: "UNAUTHORIZED",
            message: "Requester account not found or is inactive.",
          },
        });
        return;
      }
    }

    const data = await getRequesterDashboardMetrics(requesterId);

    res.status(200).json({
      success: true,
      data,
    });
  } catch (error: any) {
    console.error("Error retrieving requester dashboard:", error);
    res.status(500).json({
      success: false,
      error: {
        code: "INTERNAL_ERROR",
        message: "Failed to retrieve requester dashboard metrics.",
      },
    });
  }
}

/**
 * GET /api/v1/dashboards/staff
 * IT Staff global queue operational metrics (BR-11, BR-13, BR-14)
 */
export async function getStaffDashboardHandler(req: Request, res: Response): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({
        success: false,
        error: {
          code: "UNAUTHORIZED",
          message: "Authentication required to access staff dashboard.",
        },
      });
      return;
    }

    const data = await getStaffDashboardMetrics(req.user.id);

    res.status(200).json({
      success: true,
      data,
    });
  } catch (error: any) {
    console.error("Error retrieving staff dashboard:", error);
    res.status(500).json({
      success: false,
      error: {
        code: "INTERNAL_ERROR",
        message: "Failed to retrieve staff dashboard metrics.",
      },
    });
  }
}

/**
 * GET /api/v1/dashboards/admin
 * Administrator operational queue metrics + user accounts summary (BR-12, BR-13, BR-14)
 */
export async function getAdminDashboardHandler(req: Request, res: Response): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({
        success: false,
        error: {
          code: "UNAUTHORIZED",
          message: "Authentication required to access administrator dashboard.",
        },
      });
      return;
    }

    const data = await getAdminDashboardMetrics(req.user.id);

    res.status(200).json({
      success: true,
      data,
    });
  } catch (error: any) {
    console.error("Error retrieving administrator dashboard:", error);
    res.status(500).json({
      success: false,
      error: {
        code: "INTERNAL_ERROR",
        message: "Failed to retrieve administrator dashboard metrics.",
      },
    });
  }
}

