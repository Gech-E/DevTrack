-- AlterTable
ALTER TABLE "learning_goals" ADD COLUMN "projectId" TEXT;

-- CreateIndex
CREATE INDEX "learning_goals_projectId_idx" ON "learning_goals"("projectId");

-- AddForeignKey
ALTER TABLE "learning_goals" ADD CONSTRAINT "learning_goals_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE SET NULL ON UPDATE CASCADE;
