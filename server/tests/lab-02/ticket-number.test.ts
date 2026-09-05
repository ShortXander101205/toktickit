import { describe, it, expect, beforeEach } from "vitest";
import { PrismaClient } from "@prisma/client";
import { generateTicketNumber } from "../../src/services/ticketNumber.service.js";

const prisma = new PrismaClient();

describe("Unit: Ticket Number Generator Service (UNIT-01, UNIT-02)", () => {
  beforeEach(async () => {
    // Clean only unit test sequence records (years 2090+) to prevent interfering with API tests
    await prisma.ticketNumberSequence.deleteMany({
      where: { year: { gte: 2090 } },
    });
  });

  it("generates the first ticket number in format TKT-YYYY-00001", async () => {
    const testYear = 2090;
    const ticketNumber = await prisma.$transaction(async (tx) => {
      return generateTicketNumber(tx, testYear);
    });
    expect(ticketNumber).toBe(`TKT-${testYear}-00001`);
  });

  it("generates sequentially incremented numbers with 5-digit zero padding", async () => {
    const testYear = 2091;
    const numbers: string[] = [];

    for (let i = 0; i < 5; i++) {
      const num = await prisma.$transaction(async (tx) => {
        return generateTicketNumber(tx, testYear);
      });
      numbers.push(num);
    }

    expect(numbers).toEqual([
      `TKT-${testYear}-00001`,
      `TKT-${testYear}-00002`,
      `TKT-${testYear}-00003`,
      `TKT-${testYear}-00004`,
      `TKT-${testYear}-00005`,
    ]);
  });

  it("handles annual reset correctly when year increments", async () => {
    // Past year 2092 has sequence at 450
    await prisma.ticketNumberSequence.create({
      data: { year: 2092, nextVal: 450 },
    });

    // Generate for next year 2093 via yearOverride parameter
    const ticketNumber = await prisma.$transaction(async (tx) => {
      return generateTicketNumber(tx, 2093);
    });

    expect(ticketNumber).toBe("TKT-2093-00001");

    // Ensure past year remains unaffected
    const pastYear = await prisma.ticketNumberSequence.findUnique({ where: { year: 2092 } });
    expect(pastYear?.nextVal).toBe(450);
  });

  it("maintains strict uniqueness under concurrent generation", async () => {
    const testYear = 2094;
    const count = 10;
    const promises = Array.from({ length: count }, () =>
      prisma.$transaction(async (tx) => generateTicketNumber(tx, testYear))
    );

    const results = await Promise.all(promises);
    const uniqueSet = new Set(results);
    expect(uniqueSet.size).toBe(count);
  });
});
