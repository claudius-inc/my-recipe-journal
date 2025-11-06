-- AlterTable: Add updatedAt to Verification
ALTER TABLE "Verification" ADD COLUMN "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- AlterTable: Add token, ipAddress, userAgent, updatedAt to Session
ALTER TABLE "Session" ADD COLUMN "token" TEXT;
ALTER TABLE "Session" ADD COLUMN "ipAddress" TEXT;
ALTER TABLE "Session" ADD COLUMN "userAgent" TEXT;
ALTER TABLE "Session" ADD COLUMN "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- AlterTable: Add OAuth fields and updatedAt to Account
ALTER TABLE "Account" ADD COLUMN "refresh_token" TEXT;
ALTER TABLE "Account" ADD COLUMN "access_token" TEXT;
ALTER TABLE "Account" ADD COLUMN "expires_at" INTEGER;
ALTER TABLE "Account" ADD COLUMN "token_type" TEXT;
ALTER TABLE "Account" ADD COLUMN "scope" TEXT;
ALTER TABLE "Account" ADD COLUMN "id_token" TEXT;
ALTER TABLE "Account" ADD COLUMN "session_state" TEXT;
ALTER TABLE "Account" ADD COLUMN "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- CreateIndex: Add unique constraint on token
CREATE UNIQUE INDEX "Session_token_key" ON "Session"("token");

-- Backfill token for existing sessions (use session id as token if exists)
UPDATE "Session" SET "token" = id WHERE "token" IS NULL;

-- AlterTable: Make token NOT NULL after backfill
ALTER TABLE "Session" ALTER COLUMN "token" SET NOT NULL;
