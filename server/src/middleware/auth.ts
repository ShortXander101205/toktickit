import { Request, Response, NextFunction } from "express";
import { sessionService } from "../services/session.service.js";
import { getPrisma } from "../prisma.js";

export interface AuthUser {
  id: number;
  email: string;
  name: string;
  department: string | null;
  role: "REQUESTER" | "IT_STAFF" | "ADMINISTRATOR";
  mustChangePassword: boolean;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}

/**
 * Middleware that verifies active session token and attaches req.user.
 * Rejects unauthenticated requests with 401 Unauthorized.
 */
export async function authenticate(req: Request, res: Response, next: NextFunction): Promise<void> {
  const token = sessionService.extractToken(req);
  if (!token) {
    res.status(401).json({
      success: false,
      error: {
        code: "UNAUTHORIZED",
        message: "Authentication required.",
      },
    });
    return;
  }

  const session = sessionService.getSession(token);
  if (!session) {
    res.status(401).json({
      success: false,
      error: {
        code: "UNAUTHORIZED",
        message: "Authentication session expired or invalid.",
      },
    });
    return;
  }

  const prisma = getPrisma();
  const user = await prisma.user.findUnique({
    where: { id: session.userId },
  });

  if (!user || !user.isActive) {
    sessionService.destroySession(token);
    res.status(401).json({
      success: false,
      error: {
        code: "UNAUTHORIZED",
        message: "User account is inactive or no longer exists.",
      },
    });
    return;
  }

  req.user = {
    id: user.id,
    email: user.email,
    name: user.name,
    department: user.department,
    role: user.role as "REQUESTER" | "IT_STAFF" | "ADMINISTRATOR",
    mustChangePassword: user.mustChangePassword,
  };

  next();
}

/**
 * Optional authentication middleware: if a valid session exists, attaches req.user,
 * otherwise proceeds with req.user undefined.
 */
export async function optionalAuthenticate(
  req: Request,
  _res: Response,
  next: NextFunction
): Promise<void> {
  const token = sessionService.extractToken(req);
  if (!token) {
    return next();
  }

  const session = sessionService.getSession(token);
  if (!session) {
    return next();
  }

  const prisma = getPrisma();
  const user = await prisma.user.findUnique({
    where: { id: session.userId },
  });

  if (user && user.isActive) {
    req.user = {
      id: user.id,
      email: user.email,
      name: user.name,
      department: user.department,
      role: user.role as "REQUESTER" | "IT_STAFF" | "ADMINISTRATOR",
      mustChangePassword: user.mustChangePassword,
    };
  }

  next();
}

/**
 * Middleware enforcing BR-02: users with mustChangePassword === true are blocked
 * from operational routes with HTTP 403 Forbidden.
 */
export function requirePasswordChanged(req: Request, res: Response, next: NextFunction): void {
  if (req.user && req.user.mustChangePassword) {
    res.status(403).json({
      success: false,
      error: {
        code: "PASSWORD_CHANGE_REQUIRED",
        message: "You must change your password before accessing the application.",
      },
    });
    return;
  }
  next();
}

/**
 * Middleware enforcing BR-03: derives requesterId from the authenticated user context.
 */
export function deriveRequesterIdentity(req: Request, _res: Response, next: NextFunction): void {
  if (req.user) {
    if (req.body && typeof req.body === "object") {
      req.body.requesterId = req.user.id;
    }
  }
  next();
}
