-- Migration: 20260904120000_feature_2_foundation

-- CreateEnum
DO $$ BEGIN
    CREATE TYPE "Priority" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'URGENT');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE "TicketStatus" AS ENUM ('NEW', 'ASSIGNED', 'IN_PROGRESS', 'PENDING_REQUESTER', 'RESOLVED', 'CLOSED', 'CANCELLED');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Ensure Category table is mapped to categories
DO $$ BEGIN
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'Category') THEN
        ALTER TABLE "Category" RENAME TO "categories";
    END IF;
END $$;

-- AlterTable categories
ALTER TABLE "categories" ADD COLUMN IF NOT EXISTS "code" TEXT;
ALTER TABLE "categories" ADD COLUMN IF NOT EXISTS "description" TEXT;
ALTER TABLE "categories" ADD COLUMN IF NOT EXISTS "is_active" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "categories" ADD COLUMN IF NOT EXISTS "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "categories" ADD COLUMN IF NOT EXISTS "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- Backfill codes for seeded categories
UPDATE "categories" SET "code" = 'ACC', "description" = 'User credentials, permissions, and directory access' WHERE "name" = 'Account and Access' AND ("code" IS NULL OR "code" = '');
UPDATE "categories" SET "code" = 'HW', "description" = 'Computer hardware, peripherals, and physical lab devices' WHERE "name" = 'Hardware' AND ("code" IS NULL OR "code" = '');
UPDATE "categories" SET "code" = 'SW', "description" = 'Operating systems, authorized desktop software, and campus utilities' WHERE "name" = 'Software' AND ("code" IS NULL OR "code" = '');
UPDATE "categories" SET "code" = 'NET', "description" = 'Campus networking, DNS, routing, and access points' WHERE "name" = 'Network' AND ("code" IS NULL OR "code" = '');
UPDATE "categories" SET "code" = UPPER(SUBSTRING("name", 1, 3)) WHERE "code" IS NULL;

ALTER TABLE "categories" ALTER COLUMN "code" SET NOT NULL;

-- CreateTable requester_users
CREATE TABLE IF NOT EXISTS "requester_users" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "requester_users_pkey" PRIMARY KEY ("id")
);

-- CreateTable related_systems
CREATE TABLE IF NOT EXISTS "related_systems" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "related_systems_pkey" PRIMARY KEY ("id")
);

-- CreateTable tickets
CREATE TABLE IF NOT EXISTS "tickets" (
    "id" TEXT NOT NULL,
    "ticket_number" TEXT NOT NULL,
    "requester_id" INTEGER NOT NULL,
    "category_id" INTEGER NOT NULL,
    "related_system_id" INTEGER NOT NULL,
    "summary" VARCHAR(100) NOT NULL,
    "description" VARCHAR(2000) NOT NULL,
    "requested_priority" "Priority" NOT NULL DEFAULT 'MEDIUM',
    "it_priority" "Priority" NOT NULL DEFAULT 'MEDIUM',
    "current_status" "TicketStatus" NOT NULL DEFAULT 'NEW',
    "version" INTEGER NOT NULL DEFAULT 1,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tickets_pkey" PRIMARY KEY ("id")
);

-- CreateTable attachments
CREATE TABLE IF NOT EXISTS "attachments" (
    "id" TEXT NOT NULL,
    "ticket_id" TEXT NOT NULL,
    "original_filename" TEXT NOT NULL,
    "stored_filename" TEXT NOT NULL,
    "mime_type" TEXT NOT NULL,
    "file_size" INTEGER NOT NULL,
    "is_removed" BOOLEAN NOT NULL DEFAULT false,
    "removal_reason" VARCHAR(500),
    "removed_at" TIMESTAMP(3),
    "removed_by_requester_id" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "attachments_pkey" PRIMARY KEY ("id")
);

-- CreateTable ticket_sequences
CREATE TABLE IF NOT EXISTS "ticket_sequences" (
    "year" INTEGER NOT NULL,
    "last_number" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "ticket_sequences_pkey" PRIMARY KEY ("year")
);

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "categories_code_key" ON "categories"("code");
CREATE UNIQUE INDEX IF NOT EXISTS "requester_users_email_key" ON "requester_users"("email");
CREATE UNIQUE INDEX IF NOT EXISTS "related_systems_name_key" ON "related_systems"("name");
CREATE UNIQUE INDEX IF NOT EXISTS "tickets_ticket_number_key" ON "tickets"("ticket_number");
CREATE UNIQUE INDEX IF NOT EXISTS "attachments_stored_filename_key" ON "attachments"("stored_filename");

CREATE INDEX IF NOT EXISTS "tickets_requester_id_idx" ON "tickets"("requester_id");
CREATE INDEX IF NOT EXISTS "tickets_current_status_idx" ON "tickets"("current_status");
CREATE INDEX IF NOT EXISTS "tickets_category_id_idx" ON "tickets"("category_id");
CREATE INDEX IF NOT EXISTS "tickets_related_system_id_idx" ON "tickets"("related_system_id");
CREATE INDEX IF NOT EXISTS "tickets_created_at_idx" ON "tickets"("created_at");

CREATE INDEX IF NOT EXISTS "attachments_ticket_id_idx" ON "attachments"("ticket_id");
CREATE INDEX IF NOT EXISTS "attachments_is_removed_idx" ON "attachments"("is_removed");

-- Foreign Keys
DO $$ BEGIN
    ALTER TABLE "tickets" ADD CONSTRAINT "tickets_requester_id_fkey" FOREIGN KEY ("requester_id") REFERENCES "requester_users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE "tickets" ADD CONSTRAINT "tickets_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE "tickets" ADD CONSTRAINT "tickets_related_system_id_fkey" FOREIGN KEY ("related_system_id") REFERENCES "related_systems"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE "attachments" ADD CONSTRAINT "attachments_ticket_id_fkey" FOREIGN KEY ("ticket_id") REFERENCES "tickets"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE "attachments" ADD CONSTRAINT "attachments_removed_by_requester_id_fkey" FOREIGN KEY ("removed_by_requester_id") REFERENCES "requester_users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;
