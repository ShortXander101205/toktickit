-- Migration: 20260904120000_feature_2_foundation
-- Universal schema compatibility for TokTickIT Lab 2

-- AlterTable: rename Category to categories or create categories
DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'Category') THEN
    ALTER TABLE "Category" RENAME TO "categories";
    ALTER TABLE "categories" ADD COLUMN IF NOT EXISTS "code" TEXT;
    ALTER TABLE "categories" ADD COLUMN IF NOT EXISTS "description" TEXT;
    ALTER TABLE "categories" ADD COLUMN IF NOT EXISTS "isActive" BOOLEAN NOT NULL DEFAULT true;
    ALTER TABLE "categories" ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
    ALTER INDEX IF EXISTS "Category_name_key" RENAME TO "categories_name_key";
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'categories_code_key') THEN
      CREATE UNIQUE INDEX "categories_code_key" ON "categories"("code");
    END IF;
  ELSE
    CREATE TABLE IF NOT EXISTS "categories" (
      "id" SERIAL NOT NULL,
      "code" TEXT,
      "name" TEXT NOT NULL,
      "description" TEXT,
      "isActive" BOOLEAN NOT NULL DEFAULT true,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "categories_pkey" PRIMARY KEY ("id")
    );
    CREATE UNIQUE INDEX IF NOT EXISTS "categories_code_key" ON "categories"("code");
    CREATE UNIQUE INDEX IF NOT EXISTS "categories_name_key" ON "categories"("name");
  END IF;
END $$;

-- Backfill codes for seeded categories
UPDATE "categories" SET "code" = 'ACC', "description" = 'User credentials, permissions, and directory access' WHERE "name" = 'Account and Access' AND ("code" IS NULL OR "code" = '');
UPDATE "categories" SET "code" = 'HW', "description" = 'Computer hardware, peripherals, and physical lab devices' WHERE "name" = 'Hardware' AND ("code" IS NULL OR "code" = '');
UPDATE "categories" SET "code" = 'SW', "description" = 'Operating systems, authorized desktop software, and campus utilities' WHERE "name" = 'Software' AND ("code" IS NULL OR "code" = '');
UPDATE "categories" SET "code" = 'NET', "description" = 'Campus networking, DNS, routing, and access points' WHERE "name" = 'Network' AND ("code" IS NULL OR "code" = '');
UPDATE "categories" SET "code" = UPPER(SUBSTRING("name", 1, 3)) WHERE "code" IS NULL;

-- CreateTable requester_users
CREATE TABLE IF NOT EXISTS "requester_users" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "department" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "requester_users_pkey" PRIMARY KEY ("id")
);

-- CreateTable related_systems
CREATE TABLE IF NOT EXISTS "related_systems" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "related_systems_pkey" PRIMARY KEY ("id")
);

-- CreateTable tickets
CREATE TABLE IF NOT EXISTS "tickets" (
    "id" SERIAL NOT NULL,
    "ticketNumber" VARCHAR(32) NOT NULL,
    "requesterId" INTEGER NOT NULL,
    "categoryId" INTEGER NOT NULL,
    "relatedSystemId" INTEGER NOT NULL,
    "summary" VARCHAR(100) NOT NULL,
    "description" TEXT NOT NULL,
    "requestedPriority" TEXT NOT NULL,
    "itPriority" TEXT,
    "currentStatus" TEXT NOT NULL DEFAULT 'New',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tickets_pkey" PRIMARY KEY ("id")
);

-- CreateTable attachments
CREATE TABLE IF NOT EXISTS "attachments" (
    "id" SERIAL NOT NULL,
    "ticketId" INTEGER NOT NULL,
    "originalFilename" TEXT NOT NULL,
    "storedFilename" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "fileSize" INTEGER NOT NULL,
    "isRemoved" BOOLEAN NOT NULL DEFAULT false,
    "removalReason" TEXT,
    "removedAt" TIMESTAMP(3),
    "removedByRequesterId" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "attachments_pkey" PRIMARY KEY ("id")
);

-- CreateTable ticket_number_sequences
CREATE TABLE IF NOT EXISTS "ticket_number_sequences" (
    "year" INTEGER NOT NULL,
    "nextVal" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "ticket_number_sequences_pkey" PRIMARY KEY ("year")
);

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "requester_users_email_key" ON "requester_users"("email");
CREATE UNIQUE INDEX IF NOT EXISTS "related_systems_name_key" ON "related_systems"("name");
CREATE UNIQUE INDEX IF NOT EXISTS "tickets_ticketNumber_key" ON "tickets"("ticketNumber");
CREATE INDEX IF NOT EXISTS "tickets_requesterId_idx" ON "tickets"("requesterId");
CREATE INDEX IF NOT EXISTS "tickets_currentStatus_idx" ON "tickets"("currentStatus");
CREATE UNIQUE INDEX IF NOT EXISTS "attachments_storedFilename_key" ON "attachments"("storedFilename");
CREATE INDEX IF NOT EXISTS "attachments_ticketId_idx" ON "attachments"("ticketId");

-- AddForeignKey
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'tickets_requesterId_fkey') THEN
    ALTER TABLE "tickets" ADD CONSTRAINT "tickets_requesterId_fkey" FOREIGN KEY ("requesterId") REFERENCES "requester_users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'tickets_categoryId_fkey') THEN
    ALTER TABLE "tickets" ADD CONSTRAINT "tickets_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'tickets_relatedSystemId_fkey') THEN
    ALTER TABLE "tickets" ADD CONSTRAINT "tickets_relatedSystemId_fkey" FOREIGN KEY ("relatedSystemId") REFERENCES "related_systems"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'attachments_ticketId_fkey') THEN
    ALTER TABLE "attachments" ADD CONSTRAINT "attachments_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES "tickets"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'attachments_removedByRequesterId_fkey') THEN
    ALTER TABLE "attachments" ADD CONSTRAINT "attachments_removedByRequesterId_fkey" FOREIGN KEY ("removedByRequesterId") REFERENCES "requester_users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;
