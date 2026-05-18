-- CreateTable
CREATE TABLE "Centre" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "address" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Room" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "centreId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "capacity" INTEGER,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    CONSTRAINT "Room_centreId_fkey" FOREIGN KEY ("centreId") REFERENCES "Centre" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Course" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "colorHex" TEXT
);

-- CreateTable
CREATE TABLE "Teacher" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true
);

-- CreateTable
CREATE TABLE "ClassSession" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "className" TEXT NOT NULL,
    "courseId" TEXT NOT NULL,
    "teacherId" TEXT NOT NULL,
    "centreId" TEXT NOT NULL,
    "roomId" TEXT NOT NULL,
    "date" DATETIME NOT NULL,
    "startTime" TEXT NOT NULL,
    "endTime" TEXT NOT NULL,
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "ClassSession_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "Course" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "ClassSession_teacherId_fkey" FOREIGN KEY ("teacherId") REFERENCES "Teacher" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "ClassSession_centreId_fkey" FOREIGN KEY ("centreId") REFERENCES "Centre" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "ClassSession_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "Room" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "Centre_name_key" ON "Centre"("name");

-- CreateIndex
CREATE INDEX "Room_centreId_isActive_idx" ON "Room"("centreId", "isActive");

-- CreateIndex
CREATE UNIQUE INDEX "Room_centreId_name_key" ON "Room"("centreId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "Course_name_key" ON "Course"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Teacher_email_key" ON "Teacher"("email");

-- CreateIndex
CREATE INDEX "ClassSession_roomId_date_idx" ON "ClassSession"("roomId", "date");

-- CreateIndex
CREATE INDEX "ClassSession_teacherId_date_idx" ON "ClassSession"("teacherId", "date");

-- CreateIndex
CREATE INDEX "ClassSession_centreId_date_idx" ON "ClassSession"("centreId", "date");
