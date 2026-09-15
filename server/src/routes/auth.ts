import { Router, Request, Response } from "express";
import { getPrisma } from "../prisma.js";
import { sessionService } from "../services/session.service.js";
import { passwordService } from "../services/password.service.js";
import { authenticate } from "../middleware/auth.js";

export const authRouter = Router();

/**
 * POST /api/v1/auth/login
 * Public endpoint to authenticate user with email and password.
 * Strictly prevents account enumeration (BR-01).
 */
authRouter.post("/login", async (req: Request, res: Response) => {
  const { email, password } = req.body || {};

  // Input sanitization
  const trimmedEmail = typeof email === "string" ? email.trim().toLowerCase() : "";
  const trimmedPassword = typeof password === "string" ? password : "";

  if (!trimmedEmail || !trimmedPassword) {
    return res.status(401).json({
      success: false,
      error: {
        code: "INVALID_CREDENTIALS",
        message: "Invalid email address or password.",
      },
    });
  }

  const prisma = getPrisma();
  const user = await prisma.user.findUnique({
    where: { email: trimmedEmail },
  });

  // BR-01: Check user existence, account active flag, and password match.
  // Return identical safe error without leaking account state.
  if (!user || !user.isActive || !passwordService.verifyPassword(trimmedPassword, user.passwordHash)) {
    return res.status(401).json({
      success: false,
      error: {
        code: "INVALID_CREDENTIALS",
        message: "Invalid email address or password.",
      },
    });
  }

  // Issue session token
  const token = sessionService.createSession(user.id);

  // Set HTTP-only session cookie
  res.cookie("toktickit_session", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
  });

  return res.status(200).json({
    success: true,
    data: {
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        mustChangePassword: user.mustChangePassword,
      },
      token,
    },
  });
});

/**
 * POST /api/v1/auth/logout
 * Clears session on server and removes session cookie.
 */
authRouter.post("/logout", async (req: Request, res: Response) => {
  const token = sessionService.extractToken(req);
  if (token) {
    sessionService.destroySession(token);
  }

  res.clearCookie("toktickit_session", { path: "/" });

  return res.status(200).json({
    success: true,
    data: {
      message: "Successfully logged out.",
    },
  });
});

/**
 * GET /api/v1/auth/me
 * Returns currently authenticated user context.
 */
authRouter.get("/me", authenticate, async (req: Request, res: Response) => {
  return res.status(200).json({
    success: true,
    data: {
      id: req.user!.id,
      email: req.user!.email,
      name: req.user!.name,
      role: req.user!.role,
      mustChangePassword: req.user!.mustChangePassword,
    },
  });
});

/**
 * POST /api/v1/auth/change-password
 * Enforces mandatory first-login password change (FR-02, BR-02).
 */
authRouter.post("/change-password", authenticate, async (req: Request, res: Response) => {
  const { currentPassword, newPassword, confirmPassword } = req.body || {};

  if (!currentPassword || !newPassword || !confirmPassword) {
    return res.status(422).json({
      success: false,
      error: {
        code: "VALIDATION_FAILED",
        message: "Current password, new password, and confirmation are required.",
        fieldErrors: [
          ...(!currentPassword ? [{ field: "currentPassword", message: "Current password is required." }] : []),
          ...(!newPassword ? [{ field: "newPassword", message: "New password is required." }] : []),
          ...(!confirmPassword ? [{ field: "confirmPassword", message: "Confirm password is required." }] : []),
        ],
      },
    });
  }

  if (newPassword !== confirmPassword) {
    return res.status(422).json({
      success: false,
      error: {
        code: "VALIDATION_FAILED",
        message: "New password and confirmation do not match.",
        fieldErrors: [
          { field: "confirmPassword", message: "Password confirmation does not match new password." },
        ],
      },
    });
  }

  const prisma = getPrisma();
  const user = await prisma.user.findUnique({
    where: { id: req.user!.id },
  });

  if (!user) {
    return res.status(401).json({
      success: false,
      error: {
        code: "UNAUTHORIZED",
        message: "User account not found.",
      },
    });
  }

  // Verify current password
  if (!passwordService.verifyPassword(currentPassword, user.passwordHash)) {
    return res.status(422).json({
      success: false,
      error: {
        code: "VALIDATION_FAILED",
        message: "Current password does not match.",
        fieldErrors: [
          { field: "currentPassword", message: "Current password does not match." },
        ],
      },
    });
  }

  // Validate complexity rules
  const validation = passwordService.validatePasswordComplexity(newPassword, currentPassword);
  if (!validation.isValid) {
    return res.status(422).json({
      success: false,
      error: {
        code: "VALIDATION_FAILED",
        message: "Password does not meet complexity requirements.",
        fieldErrors: validation.errors.map((msg) => ({ field: "newPassword", message: msg })),
      },
    });
  }

  // Update password and reset mustChangePassword flag
  const newPasswordHash = passwordService.hashPassword(newPassword);
  await prisma.user.update({
    where: { id: user.id },
    data: {
      passwordHash: newPasswordHash,
      mustChangePassword: false,
    },
  });

  // Update in-request context
  if (req.user) {
    req.user.mustChangePassword = false;
  }

  return res.status(200).json({
    success: true,
    data: {
      message: "Password updated successfully.",
    },
  });
});
