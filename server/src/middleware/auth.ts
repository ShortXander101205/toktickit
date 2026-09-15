import { Request, Response, NextFunction } from "express";
import { Role } from "@prisma/client";
import { getPrisma } from "../prisma.js";
import { sessionService } from "../services/session.service.js";

export interface AuthUserContext {
  id: number;
  email: string;
  name: string;
  role: Role;
  mustChangePassword: boolean;
  department: string | null;
  isActive: boolean;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthUserContext;
    }
  }
}

/**
 * Authentication middleware.
 * Verifies session token from cookie or Authorization header,
 * checks that the user account is active, and populates req.user.
 */
export async function authenticate(req: Request, res: Response, next: NextFunction) {
  const token = sessionService.extractToken(req);
  if (!token) {
    return res.status(401).json({
      success: false,
      error: {
        code: "UNAUTHORIZED",
        message: "Authentication required.",
      },
    });
  }

  const session = sessionService.getSession(token);
  if (!session) {
    return res.status(401).json({
      success: false,
      error: {
        code: "UNAUTHORIZED",
        message: "Session expired or invalid.",
      },
    });
  }

  const prisma = getPrisma();
  const user = await prisma.user.findUnique({
    where: { id: session.userId },
  });

  if (!user || !user.isActive) {
    sessionService.destroySession(token);
    return res.status(401).json({
      success: false,
      error: {
        code: "UNAUTHORIZED",
        message: "User account inactive or not found.",
      },
    });
  }

  req.user = {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    mustChangePassword: user.mustChangePassword,
    department: user.department,
    isActive: user.isActive,
  };

  next();
}

/**
 * Soft authentication middleware.
 * If a session token is present and valid, populates req.user.
 * Does NOT reject unauthenticated requests (lets legacy callers pass).
 */
export async function optionalAuthenticate(req: Request, _res: Response, next: NextFunction) {
  const token = sessionService.extractToken(req);
  if (!token) {
    return next();
  }

  const session = sessionService.getSession(token);
  if (!session) {
    return next();
  }

  try {
    const prisma = getPrisma();
    const user = await prisma.user.findUnique({
      where: { id: session.userId },
    });

    if (user && user.isActive) {
      req.user = {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        mustChangePassword: user.mustChangePassword,
        department: user.department,
        isActive: user.isActive,
      };
    }
  } catch {
    // Ignore errors in soft auth
  }

  next();
}

/**
 * BR-02: Mandatory First-Login Password Change Route Gating.
 * Blocks access to operational routes when mustChangePassword === true.
 */
export function requirePasswordChanged(req: Request, res: Response, next: NextFunction) {
  if (req.user && req.user.mustChangePassword) {
    return res.status(403).json({
      success: false,
      error: {
        code: "PASSWORD_CHANGE_REQUIRED",
        message: "Mandatory password change required before accessing application resources.",
      },
    });
  }
  next();
}

/**
 * Role-Based Access Control (RBAC) guard.
 */
export function requireRole(...allowedRoles: Role[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: {
          code: "UNAUTHORIZED",
          message: "Authentication required.",
        },
      });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        error: {
          code: "FORBIDDEN",
          message: "Insufficient permissions for this resource.",
        },
      });
    }

    next();
  };
}
