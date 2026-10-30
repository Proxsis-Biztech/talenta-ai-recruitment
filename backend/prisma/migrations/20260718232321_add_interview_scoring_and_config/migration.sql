-- AlterTable
ALTER TABLE "Job" ADD COLUMN "interviewDuration" INTEGER;
ALTER TABLE "Job" ADD COLUMN "interviewPassingScore" INTEGER;

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Applicant" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "fullName" TEXT NOT NULL,
    "placeOfBirth" TEXT NOT NULL,
    "dateOfBirth" DATETIME NOT NULL,
    "phone" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "gender" TEXT NOT NULL,
    "education" TEXT NOT NULL,
    "university" TEXT,
    "major" TEXT,
    "gpa" REAL,
    "cvFileName" TEXT NOT NULL,
    "cvMimeType" TEXT NOT NULL,
    "localCvPath" TEXT,
    "syncStatus" TEXT NOT NULL DEFAULT 'pending',
    "certificateFileName" TEXT,
    "certificateMimeType" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "interviewResult" TEXT,
    "interviewTranscript" TEXT,
    "interviewStatus" TEXT NOT NULL DEFAULT 'not_started',
    "interviewScore" INTEGER,
    "interviewSkillMatrix" TEXT,
    "appliedPosition" TEXT NOT NULL DEFAULT 'General',
    "screeningStatus" TEXT NOT NULL DEFAULT 'pending',
    "screeningScore" INTEGER,
    "screeningSummary" TEXT,
    "jobId" TEXT,
    CONSTRAINT "Applicant_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "Job" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Applicant" ("address", "appliedPosition", "certificateFileName", "certificateMimeType", "createdAt", "cvFileName", "cvMimeType", "dateOfBirth", "education", "email", "fullName", "gender", "gpa", "id", "interviewResult", "interviewTranscript", "jobId", "localCvPath", "major", "phone", "placeOfBirth", "screeningScore", "screeningStatus", "screeningSummary", "syncStatus", "university") SELECT "address", "appliedPosition", "certificateFileName", "certificateMimeType", "createdAt", "cvFileName", "cvMimeType", "dateOfBirth", "education", "email", "fullName", "gender", "gpa", "id", "interviewResult", "interviewTranscript", "jobId", "localCvPath", "major", "phone", "placeOfBirth", "screeningScore", "screeningStatus", "screeningSummary", "syncStatus", "university" FROM "Applicant";
DROP TABLE "Applicant";
ALTER TABLE "new_Applicant" RENAME TO "Applicant";
CREATE UNIQUE INDEX "Applicant_email_key" ON "Applicant"("email");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
