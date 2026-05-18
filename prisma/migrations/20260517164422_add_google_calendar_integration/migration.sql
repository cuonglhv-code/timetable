-- CreateTable
CREATE TABLE "GoogleIntegration" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "centreId" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "clientSecret" TEXT NOT NULL,
    "serviceAccountEmail" TEXT NOT NULL,
    "serviceAccountKey" TEXT NOT NULL,
    "verifiedDomain" TEXT NOT NULL,
    "isDomainVerified" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "GoogleIntegration_centreId_fkey" FOREIGN KEY ("centreId") REFERENCES "Centre" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "CalendarShare" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "classSessionId" TEXT NOT NULL,
    "teacherEmail" TEXT NOT NULL,
    "teacherName" TEXT,
    "permission" TEXT NOT NULL DEFAULT 'READER',
    "sendEmailNotification" BOOLEAN NOT NULL DEFAULT true,
    "googleEventId" TEXT,
    "googleCalendarId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "lastSyncAt" DATETIME,
    "errorMessage" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "CalendarShare_classSessionId_fkey" FOREIGN KEY ("classSessionId") REFERENCES "ClassSession" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "GoogleIntegration_centreId_key" ON "GoogleIntegration"("centreId");

-- CreateIndex
CREATE INDEX "GoogleIntegration_centreId_isDomainVerified_idx" ON "GoogleIntegration"("centreId", "isDomainVerified");

-- CreateIndex
CREATE INDEX "CalendarShare_teacherEmail_status_idx" ON "CalendarShare"("teacherEmail", "status");

-- CreateIndex
CREATE INDEX "CalendarShare_classSessionId_status_idx" ON "CalendarShare"("classSessionId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "CalendarShare_classSessionId_teacherEmail_key" ON "CalendarShare"("classSessionId", "teacherEmail");
