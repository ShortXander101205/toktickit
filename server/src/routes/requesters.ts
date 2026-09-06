import { Router, Request, Response } from "express";
import { getPrisma } from "../prisma.js";

export const requestersRouter = Router();

// Handler for GET /api/requesters
export async function getActiveRequesters(_req: Request, res: Response): Promise<void> {
  try {
    const requesters = await getPrisma().requesterUser.findMany({
      where: { isActive: true },
      orderBy: { name: "asc" },
    });
    res.status(200).json({ success: true, data: requesters });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: {
        code: "DATABASE_ERROR",
        message: "Failed to retrieve active requesters.",
        details: [],
      },
    });
  }
}

requestersRouter.get("/", getActiveRequesters);
