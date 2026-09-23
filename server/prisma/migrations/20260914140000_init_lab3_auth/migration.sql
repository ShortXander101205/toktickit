-- CreateEnum
DO $$ BEGIN
  CREATE TYPE "Role" AS ENUM ('REQUESTER', 'IT_STAFF', 'ADMINISTRATOR');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- CreateTable
CREATE TABLE IF NOT EXISTS "users" (
    "id" SERIAL NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "department" TEXT,
    "role" "Role" NOT NULL DEFAULT 'REQUESTER',
    "mustChangePassword" BOOLEAN NOT NULL DEFAULT true,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "users_email_key" ON "users"("email");

-- Data Migration from requester_users into users (Zero Data Loss)
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'requester_users') THEN
    INSERT INTO "users" ("id", "name", "email", "department", "isActive", "createdAt", "updatedAt", "passwordHash", "role", "mustChangePassword")
    SELECT 
        "id", 
        "name", 
        LOWER("email"), 
        "department", 
        "isActive", 
        "createdAt", 
        "updatedAt", 
        '$2b$10$wE9l1eF5u51268mX0.9UteS6pZzGZ2yYpP6tF5xN8hT2J1v5mR1qG', -- bcrypt hash of 'Password123!'
        'REQUESTER'::"Role", 
        true
    FROM "requester_users"
    ON CONFLICT ("id") DO UPDATE SET
        "name" = EXCLUDED."name",
        "email" = EXCLUDED."email",
        "department" = EXCLUDED."department",
        "isActive" = EXCLUDED."isActive";
  END IF;
END $$;

-- AlterTable tickets: Add ownerId and repoint requesterId foreign key
ALTER TABLE "tickets" ADD COLUMN IF NOT EXISTS "ownerId" INTEGER;

ALTER TABLE "tickets" DROP CONSTRAINT IF EXISTS "tickets_requesterId_fkey";
ALTER TABLE "tickets" ADD CONSTRAINT "tickets_requesterId_fkey" FOREIGN KEY ("requesterId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "tickets" DROP CONSTRAINT IF EXISTS "tickets_ownerId_fkey";
ALTER TABLE "tickets" ADD CONSTRAINT "tickets_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX IF NOT EXISTS "tickets_ownerId_idx" ON "tickets"("ownerId");

-- AlterTable attachments: Rename removedByRequesterId to removedByUserId and repoint foreign key
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'attachments' AND column_name = 'removedByRequesterId') THEN
    ALTER TABLE "attachments" RENAME COLUMN "removedByRequesterId" TO "removedByUserId";
  END IF;
END $$;

ALTER TABLE "attachments" DROP CONSTRAINT IF EXISTS "attachments_removedByRequesterId_fkey";
ALTER TABLE "attachments" DROP CONSTRAINT IF EXISTS "attachments_removedByUserId_fkey";
ALTER TABLE "attachments" ADD CONSTRAINT "attachments_removedByUserId_fkey" FOREIGN KEY ("removedByUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Advance Sequence for users
SELECT setval(pg_get_serial_sequence('users', 'id'), coalesce(max(id), 1)) FROM "users";

-- Drop legacy table
DROP TABLE IF EXISTS "requester_users";
