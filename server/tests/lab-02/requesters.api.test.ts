import { describe, it, expect, beforeAll } from "vitest";
import request from "supertest";
import { getPrisma } from "../../src/prisma.js";
import { app } from "../../src/app.js";
import { seed } from "../../prisma/seed.js";

const prisma = getPrisma();

describe("Feature 2: Requester Context & Reference Data APIs", () => {
  beforeAll(async () => {
    await seed(prisma);
  });

  describe("GET /api/requesters", () => {
    it("returns HTTP 200 with an array of active development requesters", async () => {
      const res = await request(app).get("/api/requesters");
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.length).toBeGreaterThanOrEqual(4);
      expect(res.body.data.every((u: any) => u.isActive === true)).toBe(true);
    });

    it("strictly filters out inactive requesters (isActive = false)", async () => {
      const res = await request(app).get("/api/requesters");
      expect(res.status).toBe(200);
      const inactive = res.body.data.find(
        (u: any) => u.email === "inactive.user@kmutt.ac.th"
      );
      expect(inactive).toBeUndefined();
    });

    it("returns requesters sorted alphabetically by name", async () => {
      const res = await request(app).get("/api/requesters");
      const names = res.body.data.map((u: any) => u.name);
      const sorted = [...names].sort((a, b) => a.localeCompare(b));
      expect(names).toEqual(sorted);
    });

    it("responds correctly via specification alias /api/development-requesters", async () => {
      const res = await request(app).get("/api/development-requesters");
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.length).toBeGreaterThanOrEqual(4);
    });
  });

  describe("GET /api/categories", () => {
    it("returns HTTP 200 with all 4 seeded categories with code and name", async () => {
      const res = await request(app).get("/api/categories");
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveLength(4);
      const codes = res.body.data.map((c: any) => c.code).sort();
      expect(codes).toEqual(["ACC", "HW", "NET", "SW"]);
    });
  });

  describe("GET /api/related-systems", () => {
    it("returns HTTP 200 with at least 6 active related systems", async () => {
      const res = await request(app).get("/api/related-systems");
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.length).toBeGreaterThanOrEqual(6);
      expect(res.body.data.every((s: any) => s.isActive === true)).toBe(true);
    });
  });

  describe("Database Idempotency & Sequence Safety", () => {
    it("re-executing seed script does not throw unique constraint violations", async () => {
      await expect(seed(prisma)).resolves.not.toThrow();
    });

    it("creating a user after seeding succeeds without autoincrement sequence collision", async () => {
      const created = await prisma.requesterUser.create({
        data: {
          name: "Dynamic Test Requester",
          email: "dynamic.test@kmutt.ac.th",
          isActive: true,
        },
      });
      expect(created.id).toBeGreaterThan(5);

      // Cleanup dynamic record
      await prisma.requesterUser.delete({ where: { id: created.id } });
    });
  });
});
