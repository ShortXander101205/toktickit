import { Router, Request, Response } from "express";
import { Prisma, Role } from "@prisma/client";
import bcryptjs from "bcryptjs";
import { getPrisma } from "../prisma.js";
import {
  authenticate,
  requirePasswordChanged,
  requireRole,
} from "../middleware/auth.js";

export const adminRouter = Router();

// Enforce authentication, first-login password change, and Administrator role guard (BR-02, BR-06, FR-06.1)
adminRouter.use(authenticate);
adminRouter.use(requirePasswordChanged);
adminRouter.use(requireRole(["ADMINISTRATOR"]));

// Email regex validator
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * GET /api/v1/admin/users
 * Returns list of users with optional search and role filtering.
 */
adminRouter.get("/users", async (req: Request, res: Response): Promise<void> => {
  const { search, role } = req.query;
  const prisma = getPrisma();

  const where: Prisma.UserWhereInput = {};

  if (search && typeof search === "string" && search.trim()) {
    const term = search.trim();
    where.OR = [
      { name: { contains: term, mode: "insensitive" } },
      { email: { contains: term, mode: "insensitive" } },
    ];
  }

  if (role && typeof role === "string" && role.trim()) {
    const upperRole = role.trim().toUpperCase();
    if (Object.values(Role).includes(upperRole as Role)) {
      where.role = upperRole as Role;
    }
  }

  try {
    const users = await prisma.user.findMany({
      where,
      select: {
        id: true,
        name: true,
        email: true,
        department: true,
        role: true,
        isActive: true,
        mustChangePassword: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: { createdAt: "desc" },
    });

    res.status(200).json({
      success: true,
      data: users,
    });
  } catch (err: any) {
    res.status(500).json({
      success: false,
      error: {
        code: "INTERNAL_ERROR",
        message: err?.message || "Failed to retrieve users.",
      },
    });
  }
});

/**
 * POST /api/v1/admin/users
 * Provisions a new user account with initial password.
 */
adminRouter.post("/users", async (req: Request, res: Response): Promise<void> => {
  const { name, email, department, role, isActive, initialPassword } = req.body || {};
  const prisma = getPrisma();

  // Validate name
  if (!name || typeof name !== "string" || name.trim().length < 2 || name.trim().length > 100) {
    res.status(400).json({
      success: false,
      error: {
        code: "VALIDATION_ERROR",
        message: "Full Name must be between 2 and 100 characters.",
      },
    });
    return;
  }

  // Validate email
  if (!email || typeof email !== "string" || !EMAIL_REGEX.test(email.trim())) {
    res.status(400).json({
      success: false,
      error: {
        code: "VALIDATION_ERROR",
        message: "A valid email address is required.",
      },
    });
    return;
  }

  // Validate role (BR-09 Single-Role Policy)
  const normRole = typeof role === "string" ? role.trim().toUpperCase() : "";
  if (!normRole || !Object.values(Role).includes(normRole as Role)) {
    res.status(400).json({
      success: false,
      error: {
        code: "VALIDATION_ERROR",
        message: "Role must be one of REQUESTER, IT_STAFF, ADMINISTRATOR.",
      },
    });
    return;
  }

  // Validate initialPassword
  if (!initialPassword || typeof initialPassword !== "string" || initialPassword.length < 8) {
    res.status(400).json({
      success: false,
      error: {
        code: "VALIDATION_ERROR",
        message: "Initial password must be at least 8 characters long.",
      },
    });
    return;
  }

  const normalizedEmail = email.trim().toLowerCase();

  try {
    // Check email uniqueness case-insensitively (BR-10)
    const existingUser = await prisma.user.findFirst({
      where: {
        email: { equals: normalizedEmail, mode: "insensitive" },
      },
    });

    if (existingUser) {
      res.status(409).json({
        success: false,
        error: {
          code: "EMAIL_ALREADY_EXISTS",
          message: "A user account with this email address already exists.",
        },
      });
      return;
    }

    // Hash password with bcrypt cost 10
    const passwordHash = await bcryptjs.hash(initialPassword, 10);

    // Create user with mustChangePassword = true (FR-06.3)
    const newUser = await prisma.user.create({
      data: {
        name: name.trim(),
        email: normalizedEmail,
        department: typeof department === "string" && department.trim() ? department.trim() : null,
        role: normRole as Role,
        isActive: isActive !== undefined ? Boolean(isActive) : true,
        passwordHash,
        mustChangePassword: true,
      },
      select: {
        id: true,
        name: true,
        email: true,
        department: true,
        role: true,
        isActive: true,
        mustChangePassword: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    res.status(201).json({
      success: true,
      data: newUser,
    });
  } catch (err: any) {
    res.status(500).json({
      success: false,
      error: {
        code: "INTERNAL_ERROR",
        message: err?.message || "Failed to create user.",
      },
    });
  }
});

/**
 * PATCH /api/v1/admin/users/:id
 * Updates user attributes and enforces safety rules (BR-11, BR-12).
 */
adminRouter.patch("/users/:id", async (req: Request, res: Response): Promise<void> => {
  const targetUserId = parseInt(req.params.id, 10);
  if (isNaN(targetUserId)) {
    res.status(400).json({
      success: false,
      error: {
        code: "VALIDATION_ERROR",
        message: "Invalid user ID parameter.",
      },
    });
    return;
  }

  const prisma = getPrisma();

  try {
    const targetUser = await prisma.user.findUnique({
      where: { id: targetUserId },
    });

    if (!targetUser) {
      res.status(404).json({
        success: false,
        error: {
          code: "USER_NOT_FOUND",
          message: "User not found.",
        },
      });
      return;
    }

    const { name, email, department, role, isActive } = req.body || {};
    const updateData: Prisma.UserUpdateInput = {};

    // Validate name if provided
    if (name !== undefined) {
      if (typeof name !== "string" || name.trim().length < 2 || name.trim().length > 100) {
        res.status(400).json({
          success: false,
          error: {
            code: "VALIDATION_ERROR",
            message: "Full Name must be between 2 and 100 characters.",
          },
        });
        return;
      }
      updateData.name = name.trim();
    }

    // Validate email if provided
    let normalizedEmail: string | undefined;
    if (email !== undefined) {
      if (typeof email !== "string" || !EMAIL_REGEX.test(email.trim())) {
        res.status(400).json({
          success: false,
          error: {
            code: "VALIDATION_ERROR",
            message: "A valid email address is required.",
          },
        });
        return;
      }
      normalizedEmail = email.trim().toLowerCase();
    }

    // Validate role if provided (BR-09)
    let normRole: Role | undefined;
    if (role !== undefined) {
      const parsedRole = typeof role === "string" ? role.trim().toUpperCase() : "";
      if (!Object.values(Role).includes(parsedRole as Role)) {
        res.status(400).json({
          success: false,
          error: {
            code: "VALIDATION_ERROR",
            message: "Role must be one of REQUESTER, IT_STAFF, ADMINISTRATOR.",
          },
        });
        return;
      }
      normRole = parsedRole as Role;
    }

    // Validate department if provided
    if (department !== undefined) {
      updateData.department = typeof department === "string" && department.trim() ? department.trim() : null;
    }

    // -------------------------------------------------------------------------
    // Safety Rule BR-11: Self-Deactivation & Self-Demotion Prevention
    // -------------------------------------------------------------------------
    if (req.user && targetUserId === req.user.id) {
      if (isActive === false) {
        res.status(400).json({
          success: false,
          error: {
            code: "CANNOT_DEACTIVATE_SELF",
            message: "Administrators cannot deactivate their own active account.",
          },
        });
        return;
      }
      if (normRole !== undefined && normRole !== Role.ADMINISTRATOR) {
        res.status(400).json({
          success: false,
          error: {
            code: "CANNOT_DEMOTE_SELF",
            message: "Administrators cannot demote their own account role.",
          },
        });
        return;
      }
    }

    // -------------------------------------------------------------------------
    // Safety Rule BR-12: Last Active Administrator Preservation
    // -------------------------------------------------------------------------
    if (targetUser.role === Role.ADMINISTRATOR && targetUser.isActive) {
      const isDeactivating = isActive === false;
      const isDemoting = normRole !== undefined && normRole !== Role.ADMINISTRATOR;

      if (isDeactivating || isDemoting) {
        const otherActiveAdminCount = await prisma.user.count({
          where: {
            role: Role.ADMINISTRATOR,
            isActive: true,
            id: { not: targetUserId },
          },
        });

        if (otherActiveAdminCount === 0) {
          res.status(400).json({
            success: false,
            error: {
              code: "LAST_ADMIN_PROTECTION",
              message: "Cannot deactivate or demote the system's last remaining active Administrator.",
            },
          });
          return;
        }
      }
    }

    // -------------------------------------------------------------------------
    // Safety Rule BR-10: Email Uniqueness Check on Update
    // -------------------------------------------------------------------------
    if (normalizedEmail) {
      const emailConflict = await prisma.user.findFirst({
        where: {
          email: { equals: normalizedEmail, mode: "insensitive" },
          id: { not: targetUserId },
        },
      });

      if (emailConflict) {
        res.status(409).json({
          success: false,
          error: {
            code: "EMAIL_ALREADY_EXISTS",
            message: "A user account with this email address already exists.",
          },
        });
        return;
      }

      updateData.email = normalizedEmail;
    }

    if (normRole !== undefined) {
      updateData.role = normRole;
    }

    if (isActive !== undefined) {
      updateData.isActive = Boolean(isActive);
    }

    const updatedUser = await prisma.user.update({
      where: { id: targetUserId },
      data: updateData,
      select: {
        id: true,
        name: true,
        email: true,
        department: true,
        role: true,
        isActive: true,
        mustChangePassword: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    res.status(200).json({
      success: true,
      data: updatedUser,
    });
  } catch (err: any) {
    res.status(500).json({
      success: false,
      error: {
        code: "INTERNAL_ERROR",
        message: err?.message || "Failed to update user.",
      },
    });
  }
});

/**
 * POST /api/v1/admin/users/:id/reset-password
 * Resets a user's initial password and sets mustChangePassword = true.
 */
adminRouter.post("/users/:id/reset-password", async (req: Request, res: Response): Promise<void> => {
  const targetUserId = parseInt(req.params.id, 10);
  if (isNaN(targetUserId)) {
    res.status(400).json({
      success: false,
      error: {
        code: "VALIDATION_ERROR",
        message: "Invalid user ID parameter.",
      },
    });
    return;
  }

  const { newInitialPassword } = req.body || {};

  if (!newInitialPassword || typeof newInitialPassword !== "string" || newInitialPassword.length < 8) {
    res.status(400).json({
      success: false,
      error: {
        code: "VALIDATION_ERROR",
        message: "New initial password must be at least 8 characters long.",
      },
    });
    return;
  }

  const prisma = getPrisma();

  try {
    const targetUser = await prisma.user.findUnique({
      where: { id: targetUserId },
    });

    if (!targetUser) {
      res.status(404).json({
        success: false,
        error: {
          code: "USER_NOT_FOUND",
          message: "User not found.",
        },
      });
      return;
    }

    const passwordHash = await bcryptjs.hash(newInitialPassword, 10);

    await prisma.user.update({
      where: { id: targetUserId },
      data: {
        passwordHash,
        mustChangePassword: true,
      },
    });

    res.status(200).json({
      success: true,
      data: {
        message: "Initial password reset successfully.",
        userId: targetUserId,
        mustChangePassword: true,
      },
    });
  } catch (err: any) {
    res.status(500).json({
      success: false,
      error: {
        code: "INTERNAL_ERROR",
        message: err?.message || "Failed to reset password.",
      },
    });
  }
});
