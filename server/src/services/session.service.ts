import crypto from "crypto";
import { Request } from "express";

export interface SessionData {
  userId: number;
  createdAt: Date;
  expiresAt: Date;
}

class SessionService {
  // In-memory session store mapping sessionToken -> SessionData
  private sessions = new Map<string, SessionData>();
  private readonly defaultTtlMs = 24 * 60 * 60 * 1000; // 24 hours

  /**
   * Generates a secure, cryptographically random session token and stores the session.
   */
  createSession(userId: number, ttlMs: number = this.defaultTtlMs): string {
    const token = `toktickit_${crypto.randomBytes(32).toString("hex")}`;
    const now = new Date();
    const expiresAt = new Date(now.getTime() + ttlMs);

    this.sessions.set(token, {
      userId,
      createdAt: now,
      expiresAt,
    });

    return token;
  }

  /**
   * Retrieves active session data. Returns null if missing or expired.
   */
  getSession(token: string): SessionData | null {
    const session = this.sessions.get(token);
    if (!session) {
      return null;
    }

    if (session.expiresAt.getTime() < Date.now()) {
      this.sessions.delete(token);
      return null;
    }

    return session;
  }

  /**
   * Destroys a session on logout.
   */
  destroySession(token: string): boolean {
    return this.sessions.delete(token);
  }

  /**
   * Clears all sessions (useful for test isolation).
   */
  clearAllSessions(): void {
    this.sessions.clear();
  }

  /**
   * Extracts the session token from either:
   * 1. Authorization header: "Bearer <token>"
   * 2. Cookie: "toktickit_session=<token>"
   */
  extractToken(req: Request): string | null {
    // 1. Authorization header
    const authHeader = req.headers["authorization"] || req.headers["Authorization"];
    if (typeof authHeader === "string" && authHeader.startsWith("Bearer ")) {
      const token = authHeader.substring(7).trim();
      if (token) return token;
    }

    // 2. Parsed cookies (if cookie-parser middleware is present)
    if ((req as any).cookies && (req as any).cookies.toktickit_session) {
      return (req as any).cookies.toktickit_session;
    }

    // 3. Raw Cookie header parser
    const cookieHeader = req.headers["cookie"];
    if (typeof cookieHeader === "string") {
      const cookies = cookieHeader.split(";");
      for (const cookie of cookies) {
        const [key, value] = cookie.trim().split("=");
        if (key === "toktickit_session" && value) {
          return decodeURIComponent(value);
        }
      }
    }

    return null;
  }
}

export const sessionService = new SessionService();
