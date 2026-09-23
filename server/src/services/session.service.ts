import crypto from "crypto";
import { Request } from "express";

export interface SessionData {
  userId: number;
  createdAt: Date;
}

class SessionService {
  private sessions = new Map<string, SessionData>();

  /**
   * Creates a new cryptographically secure opaque session token for the user.
   */
  createSession(userId: number): string {
    const token = crypto.randomUUID();
    this.sessions.set(token, {
      userId,
      createdAt: new Date(),
    });
    return token;
  }

  /**
   * Retrieves active session details by token. Returns null if expired or missing.
   */
  getSession(token: string): SessionData | null {
    const session = this.sessions.get(token);
    if (!session) return null;
    return session;
  }

  /**
   * Destroys an active session.
   */
  destroySession(token: string): void {
    this.sessions.delete(token);
  }

  /**
   * Clears all active sessions (utility for automated tests).
   */
  clearAllSessions(): void {
    this.sessions.clear();
  }

  /**
   * Extracts session token from cookie, Authorization header, or x-session-token header.
   */
  extractToken(req: Request): string | null {
    // 1. Check HttpOnly cookie
    if (req.cookies && req.cookies.toktickit_session) {
      return req.cookies.toktickit_session;
    }

    // 2. Check Authorization Bearer header
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith("Bearer ")) {
      const token = authHeader.substring(7).trim();
      if (token) return token;
    }

    // 3. Check optional custom header
    const customHeader = req.headers["x-session-token"];
    if (typeof customHeader === "string" && customHeader.trim()) {
      return customHeader.trim();
    }

    return null;
  }
}

export const sessionService = new SessionService();
