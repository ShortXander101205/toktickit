-- AlterTable
ALTER TABLE "tickets" ADD COLUMN     "version" INTEGER NOT NULL DEFAULT 1;

-- CreateTable
CREATE TABLE "actions_taken" (
    "id" SERIAL NOT NULL,
    "ticketId" INTEGER NOT NULL,
    "performedById" INTEGER NOT NULL,
    "actionDateTime" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actionDescription" TEXT NOT NULL,
    "result" TEXT NOT NULL,
    "followUpRequired" BOOLEAN NOT NULL DEFAULT false,
    "followUpNote" TEXT,
    "attachmentNotes" VARCHAR(255),
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "actions_taken_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "actions_taken_ticketId_actionDateTime_idx" ON "actions_taken"("ticketId", "actionDateTime");

-- CreateIndex
CREATE INDEX "actions_taken_performedById_idx" ON "actions_taken"("performedById");

-- CreateIndex
CREATE INDEX "tickets_requesterId_currentStatus_updatedAt_idx" ON "tickets"("requesterId", "currentStatus", "updatedAt");

-- CreateIndex
CREATE INDEX "tickets_ownerId_currentStatus_updatedAt_idx" ON "tickets"("ownerId", "currentStatus", "updatedAt");

-- CreateIndex
CREATE INDEX "tickets_currentStatus_itPriority_idx" ON "tickets"("currentStatus", "itPriority");

-- AddForeignKey
ALTER TABLE "actions_taken" ADD CONSTRAINT "actions_taken_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES "tickets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "actions_taken" ADD CONSTRAINT "actions_taken_performedById_fkey" FOREIGN KEY ("performedById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
