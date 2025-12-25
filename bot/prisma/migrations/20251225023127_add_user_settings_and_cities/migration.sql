-- CreateTable
CREATE TABLE "UserSettings" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "userId" INTEGER NOT NULL,
    "defaultCityId" INTEGER,
    "temperatureUnit" TEXT NOT NULL DEFAULT 'C',
    "windUnit" TEXT NOT NULL DEFAULT 'm/s',
    "pressureUnit" TEXT NOT NULL DEFAULT 'hPa',
    "displaySettings" TEXT NOT NULL DEFAULT '{}',
    "notificationPrefix" TEXT NOT NULL DEFAULT 'sunny',
    "silentModeEnabled" BOOLEAN NOT NULL DEFAULT false,
    "silentModeStart" TEXT NOT NULL DEFAULT '23:00',
    "silentModeEnd" TEXT NOT NULL DEFAULT '07:00',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "UserSettings_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "UserSettings_defaultCityId_fkey" FOREIGN KEY ("defaultCityId") REFERENCES "Location" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "UserCity" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "userId" INTEGER NOT NULL,
    "locationId" INTEGER NOT NULL,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "orderIndex" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "UserCity_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "UserCity_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "Location" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "UserSettings_userId_key" ON "UserSettings"("userId");

-- CreateIndex
CREATE INDEX "UserCity_userId_idx" ON "UserCity"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "UserCity_userId_locationId_key" ON "UserCity"("userId", "locationId");
