-- Create Priority Enum
DO $$ BEGIN
  CREATE TYPE "Priority" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'URGENT');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Create TicketStatus Enum
DO $$ BEGIN
  CREATE TYPE "TicketStatus" AS ENUM ('NEW', 'OPEN', 'IN_PROGRESS', 'WAITING_FOR_REQUESTER', 'RESOLVED', 'CLOSED', 'REOPENED', 'CANCELLED');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Add nullable ownerId and itPriority columns to tickets
ALTER TABLE "tickets" ADD COLUMN IF NOT EXISTS "ownerId" INTEGER;
ALTER TABLE "tickets" ADD COLUMN IF NOT EXISTS "itPriority" "Priority";

-- Convert requestedPriority to Priority enum safely
ALTER TABLE "tickets" 
  ALTER COLUMN "requestedPriority" TYPE "Priority" 
  USING (
    CASE UPPER("requestedPriority")
      WHEN 'LOW' THEN 'LOW'::"Priority"
      WHEN 'MEDIUM' THEN 'MEDIUM'::"Priority"
      WHEN 'HIGH' THEN 'HIGH'::"Priority"
      WHEN 'URGENT' THEN 'URGENT'::"Priority"
      ELSE 'MEDIUM'::"Priority"
    END
  );

ALTER TABLE "tickets" ALTER COLUMN "requestedPriority" SET DEFAULT 'MEDIUM'::"Priority";

-- Convert itPriority to Priority enum safely
ALTER TABLE "tickets" 
  ALTER COLUMN "itPriority" TYPE "Priority" 
  USING (
    CASE UPPER("itPriority")
      WHEN 'LOW' THEN 'LOW'::"Priority"
      WHEN 'MEDIUM' THEN 'MEDIUM'::"Priority"
      WHEN 'HIGH' THEN 'HIGH'::"Priority"
      WHEN 'URGENT' THEN 'URGENT'::"Priority"
      ELSE NULL
    END
  );

-- Populate itPriority = requestedPriority for existing tickets (BR-07)
UPDATE "tickets" SET "itPriority" = "requestedPriority" WHERE "itPriority" IS NULL;

-- Convert currentStatus to TicketStatus enum safely
ALTER TABLE "tickets" ALTER COLUMN "currentStatus" DROP DEFAULT;

ALTER TABLE "tickets" 
  ALTER COLUMN "currentStatus" TYPE "TicketStatus" 
  USING (
    CASE UPPER(REPLACE("currentStatus", ' ', '_'))
      WHEN 'NEW' THEN 'NEW'::"TicketStatus"
      WHEN 'OPEN' THEN 'OPEN'::"TicketStatus"
      WHEN 'ASSIGNED' THEN 'OPEN'::"TicketStatus"
      WHEN 'IN_PROGRESS' THEN 'IN_PROGRESS'::"TicketStatus"
      WHEN 'WAITING_FOR_REQUESTER' THEN 'WAITING_FOR_REQUESTER'::"TicketStatus"
      WHEN 'PENDING_REQUESTER' THEN 'WAITING_FOR_REQUESTER'::"TicketStatus"
      WHEN 'RESOLVED' THEN 'RESOLVED'::"TicketStatus"
      WHEN 'CLOSED' THEN 'CLOSED'::"TicketStatus"
      WHEN 'REOPENED' THEN 'REOPENED'::"TicketStatus"
      WHEN 'CANCELLED' THEN 'CANCELLED'::"TicketStatus"
      ELSE 'NEW'::"TicketStatus"
    END
  );

ALTER TABLE "tickets" ALTER COLUMN "currentStatus" SET DEFAULT 'NEW'::"TicketStatus";

-- Ensure foreign key for ownerId with ON DELETE SET NULL
ALTER TABLE "tickets" DROP CONSTRAINT IF EXISTS "tickets_ownerId_fkey";
ALTER TABLE "tickets" ADD CONSTRAINT "tickets_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Create indexes for fast staff queue querying and filtering
CREATE INDEX IF NOT EXISTS "tickets_ownerId_idx" ON "tickets"("ownerId");
CREATE INDEX IF NOT EXISTS "tickets_itPriority_idx" ON "tickets"("itPriority");
CREATE INDEX IF NOT EXISTS "tickets_categoryId_idx" ON "tickets"("categoryId");
CREATE INDEX IF NOT EXISTS "tickets_createdAt_idx" ON "tickets"("createdAt");
