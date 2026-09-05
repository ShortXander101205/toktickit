import express, { Request, Response } from "express";
import cors from "cors";
import { requestersRouter, getActiveRequesters } from "./routes/requesters.js";
import { referenceRouter, getCategories, getRelatedSystems } from "./routes/reference.js";
import { ticketsRouter } from "./routes/tickets.js";

// The Express app is exported separately from app.listen() (see index.ts) so
// Supertest can import `app` without opening a port. Do not merge these files.
export const app = express();

app.use(cors()); // already wired: lets the Vite dev server call this API
app.use(express.json());

// ---------------------------------------------------------------------------
// Lab 1 — API health check
// Returns HTTP 200 with JSON: { status: "ok", service: "TokTickIT API" }
// ---------------------------------------------------------------------------
app.get("/api/health", (_req: Request, res: Response) => {
  res.status(200).json({ status: "ok", service: "TokTickIT API" });
});

// ---------------------------------------------------------------------------
// Lab 2 — Feature 2 Reference Data & Requester Routes
// ---------------------------------------------------------------------------
app.use("/api/requesters", requestersRouter);
app.get("/api/development-requesters", getActiveRequesters);

app.use("/api", referenceRouter);

// ---------------------------------------------------------------------------
// Lab 2 — Feature 3 (Feature 7) Ticket Creation Routes
// ---------------------------------------------------------------------------
app.use("/api/tickets", ticketsRouter);

// Aliases for /api/v1 prefix
app.use("/api/v1/requesters", requestersRouter);
app.get("/api/v1/development-requesters", getActiveRequesters);
app.get("/api/v1/related-systems", getRelatedSystems);
app.get("/api/v1/categories", getCategories);
app.use("/api/v1/tickets", ticketsRouter);

export default app;
