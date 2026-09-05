import { Prisma } from "@prisma/client";

/**
 * Generates a unique, sequentially incremented Ticket Number in the format TKT-YYYY-NNNNN.
 * Executes atomically in PostgreSQL to prevent race conditions or duplicate sequence numbers
 * under concurrent requests.
 *
 * @param tx - Prisma Transaction Client
 * @param yearOverride - Optional year parameter for deterministic unit testing
 * @returns Formatted ticket number string (e.g. "TKT-2026-00001")
 */
export async function generateTicketNumber(
  tx: Prisma.TransactionClient,
  yearOverride?: number
): Promise<string> {
  const currentYear = yearOverride ?? new Date().getUTCFullYear();

  // Atomically insert new annual counter or increment existing counter
  const result = await tx.$queryRawUnsafe<{ assignedVal: number }[]>(
    `INSERT INTO ticket_number_sequences (year, "nextVal")
     VALUES ($1, 2)
     ON CONFLICT (year)
     DO UPDATE SET "nextVal" = ticket_number_sequences."nextVal" + 1
     RETURNING "nextVal" - 1 AS "assignedVal";`,
    currentYear
  );

  const assignedSeq = result[0].assignedVal;
  const paddedNumber = String(assignedSeq).padStart(5, "0");
  return `TKT-${currentYear}-${paddedNumber}`;
}
