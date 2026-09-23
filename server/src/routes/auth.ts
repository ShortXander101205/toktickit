import { Router, Request, Response } from "express";
import bcryptjs from "bcryptjs";
import { getPrisma } from "../prisma.js";
import { sessionService } from "../services/session.service.js";
import { passwordService } from "../services/password.service.js";
import { authenticate } from "../middleware/auth.js";

export const authRouter = Router();

// Constant dummy hash used for timing-attack normalization (BR-01)
const DUMMY_HASH = "$2b$10$wE9l1eF5u51268mX0.9UteS6pZzGZ2yYpP6tF5xN8hT2J1v5mR1qG";

/**
 * POST /api/v1/auth/login
 * Public endpoint for authenticating user credentials.
 */
authRouter.post("/login", async (req: Request, res: Response): Promise<void> => {
  const { email, password } = req.body || {};

  if (!email || !password || typeof email !== "string" || typeof password !== "string") {
    res.status(400).json({
      success: false,
      error: {
        code: "MISSING_CREDENTIALS",
        message: "Email and password are required.",
      },
    });
    return;
  }

  const normalizedEmail = email.toLowerCase().trim();
  const prisma = getPrisma();
  const user = await prisma.user.findUnique({
    where: { email: normalizedEmail },
  });

  // Anti-enumeration defense (BR-01): uniform error for missing user or deactivated account
  if (!user || !user.isActive) {
    bcryptjs.compareSync("dummy_password", DUMMY_HASH);
    res.status(401).json({
      success: false,
      error: {
        code: "INVALID_CREDENTIALS",
        message: "Invalid email address or password.",
      },
    });
    return;
  }

  const isPasswordValid = passwordService.verifyPassword(password, user.passwordHash);
  if (!isPasswordValid) {
    res.status(401).json({
      success: false,
      error: {
        code: "INVALID_CREDENTIALS",
        message: "Invalid email address or password.",
      },
    });
    return;
  }

  // Generate session token and set secure HttpOnly cookie
  const token = sessionService.createSession(user.id);
  res.cookie("toktickit_session", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 24 * 60 * 60 * 1000, // 24 hours
  });

  res.status(200).json({
    success: true,
    data: {
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        department: user.department,
        role: user.role,
        mustChangePassword: user.mustChangePassword,
      },
    },
  });
});

/**
 * POST /api/v1/auth/logout
 * Terminates active user session and clears cookie.
 */
authRouter.post("/logout", (req: Request, res: Response): void => {
  const token = sessionService.extractToken(req);
  if (token) {
    sessionService.destroySession(token);
  }

  res.clearCookie("toktickit_session", {
    path: "/",
    httpOnly: true,
    sameSite: "lax",
  });

  res.status(200).json({
    success: true,
    data: {
      message: "Successfully logged out.",
    },
  });
});

/**
 * GET /api/v1/auth/me
 * Returns authenticated user profile.
 */
authRouter.get("/me", authenticate, (req: Request, res: Response): void => {
  res.status(200).json({
    success: true,
    data: {
      id: req.user!.id,
      email: req.user!.email,
      name: req.user!.name,
      department: req.user!.department,
      role: req.user!.role,
      mustChangePassword: req.user!.mustChangePassword,
    },
  });
});

/**
 * POST /api/v1/auth/change-password
 * Updates password and sets mustChangePassword = false.
 */
authRouter.post(
  "/change-password",
  authenticate,
  async (req: Request, res: Response): Promise<void> => {
    const { currentPassword, newPassword, confirmPassword } = req.body || {};

    if (!currentPassword || !newPassword || !confirmPassword) {
      res.status(400).json({
        success: false,
        error: {
          code: "MISSING_PASSWORD_FIELDS",
          message: "Current password, new password, and confirmation are required.",
        },
      });
      return;
    }

    if (newPassword !== confirmPassword) {
      res.status(422).json({
        success: false,
        error: {
          code: "PASSWORD_CONFIRMATION_MISMATCH",
          message: "New password and confirmation password do not match.",
        },
      });
      return;
    }

    const prisma = getPrisma();
    const user = await prisma.user.findUnique({
      where: { id: req.user!.id },
    });

    if (!user) {
      res.status(401).json({
        success: false,
        error: {
          code: "UNAUTHORIZED",
          message: "User not found.",
        },
      });
      return;
    }

    const isCurrentValid = passwordService.verifyPassword(currentPassword, user.passwordHash);
    if (!isCurrentValid) {
      res.status(422).json({
        success: false,
        error: {
          code: "INVALID_CURRENT_PASSWORD",
          message: "Current password is incorrect.",
        },
      });
      return;
    }

    const validation = passwordService.validatePasswordComplexity(newPassword, currentPassword);
    if (!validation.isValid) {
      res.status(422).json({
        success: false,
        error: {
          code: "WEAK_PASSWORD",
          message: "New password does not meet complexity requirements.",
          fieldErrors: validation.errors.map((msg) => ({
            field: "newPassword",
            message: msg,
          })),
        },
      });
      return;
    }

    const newHash = passwordService.hashPassword(newPassword);
    await prisma.user.update({
      where: { id: user.id },
      data: {
        passwordHash: newHash,
        mustChangePassword: false,
      },
    });

    req.user!.mustChangePassword = false;

    res.status(200).json({
      success: true,
      data: {
        message: "Password updated successfully.",
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          department: user.department,
          role: user.role,
          mustChangePassword: false,
        },
      },
    });
  }
);
