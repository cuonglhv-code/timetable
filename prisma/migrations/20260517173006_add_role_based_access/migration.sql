-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'TEACHER',
    "centreId" TEXT,
    "teacherId" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "lastLogin" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "User_centreId_fkey" FOREIGN KEY ("centreId") REFERENCES "Centre" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "User_teacherId_fkey" FOREIGN KEY ("teacherId") REFERENCES "Teacher" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "User_teacherId_key" ON "User"("teacherId");

-- CreateIndex
CREATE INDEX "User_email_isActive_idx" ON "User"("email", "isActive");

-- CreateIndex
CREATE INDEX "User_role_isActive_idx" ON "User"("role", "isActive");
