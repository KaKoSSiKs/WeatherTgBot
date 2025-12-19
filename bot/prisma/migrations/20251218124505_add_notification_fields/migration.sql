/*
  Warnings:

  - Added the required column `updatedAt` to the `Notification` table without a default value. This is not possible if the table is not empty.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Notification" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "subscriptionType" TEXT NOT NULL DEFAULT 'regular_forecast',
    "subtype" TEXT NOT NULL DEFAULT 'today',
    "parameters" TEXT NOT NULL DEFAULT '{}',
    "schedule" TEXT NOT NULL DEFAULT 'daily',
    "nextNotification" DATETIME,
    "lastChecked" DATETIME,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "pauseUntil" DATETIME,
    "customName" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'daily',
    "time" TEXT,
    "days" TEXT,
    "userId" INTEGER NOT NULL,
    "locationId" INTEGER,
    CONSTRAINT "Notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Notification_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "Location" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_Notification" ("days", "enabled", "id", "locationId", "time", "type", "userId") SELECT "days", "enabled", "id", "locationId", "time", "type", "userId" FROM "Notification";
DROP TABLE "Notification";
ALTER TABLE "new_Notification" RENAME TO "Notification";
CREATE INDEX "Notification_userId_idx" ON "Notification"("userId");
CREATE INDEX "Notification_nextNotification_idx" ON "Notification"("nextNotification");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
