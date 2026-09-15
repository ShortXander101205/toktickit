import express, { Request, Response } from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import { requestersRouter, getActiveRequesters } from "./routes/requesters.js";
import { referenceRouter, getCategories, getRelatedSystems } from "./routes/reference.js";
import { ticketsRouter } from "./routes/tickets.js";
import { attachmentsRouter } from "./routes/attachments.js";
import { authRouter } from "./routes/auth.js";
import { optionalAuthenticate, requirePasswordChanged } from "./middleware/auth.js";

// The Express app is exported separately from app.listen() (see index.ts) so
// Supertest can import `app` without opening a port. Do not merge these files.
export const app = express();

app.use(
  cors({
    origin: ["http://localhost:5173", "http://localhost:3000"],
    credentials: true,
  })
);
app.use(cookieParser());
app.use(express.json());

// ---------------------------------------------------------------------------
// Lab 1 — API health check
// Returns HTTP 200 with JSON: { status: "ok", service: "TokTickIT API" }
// ---------------------------------------------------------------------------
app.get("/api/health", (_req: Request, res: Response) => {
  res.status(200).json({ status: "ok", service: "TokTickIT API" });
});

// ---------------------------------------------------------------------------
// Lab 3 — Issue 12 Authentication Routes
// ---------------------------------------------------------------------------
app.use("/api/v1/auth", authRouter);
app.use("/api/auth", authRouter);

// ---------------------------------------------------------------------------
// Lab 2 — Feature 2 Reference Data & Requester Routes
// ---------------------------------------------------------------------------
app.use("/api/requesters", requestersRouter);
app.get("/api/development-requesters", getActiveRequesters);

app.use("/api", referenceRouter);

// ---------------------------------------------------------------------------
// Lab 2 & 3 — Operational Ticket and Attachment Routes
// Gated by optional session extraction and BR-02 password change enforcement
// ---------------------------------------------------------------------------
app.use("/api/tickets", optionalAuthenticate, requirePasswordChanged, ticketsRouter);
app.use("/api/attachments", optionalAuthenticate, requirePasswordChanged, attachmentsRouter);

// Aliases for /api/v1 prefix
app.use("/api/v1/requesters", requestersRouter);
app.get("/api/v1/development-requesters", getActiveRequesters);
app.get("/api/v1/related-systems", getRelatedSystems);
app.get("/api/v1/categories", getCategories);
app.use("/api/v1/tickets", optionalAuthenticate, requirePasswordChanged, ticketsRouter);
app.use("/api/v1/attachments", optionalAuthenticate, requirePasswordChanged, attachmentsRouter);

export default app;
