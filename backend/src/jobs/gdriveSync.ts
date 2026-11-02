import cron from 'node-cron';
import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';
import { google } from 'googleapis';

const prisma = new PrismaClient();

let driveCredentialsWarned = false;

const resolveDriveConfig = () => {
  const credentialsPath = process.env.GDRIVE_SERVICE_ACCOUNT_JSON;
  const folderId = process.env.GDRIVE_FOLDER_ID;

  if (!credentialsPath || !folderId) return null;
  if (/your-service-account-key|isi-dengan/i.test(credentialsPath + folderId)) return null;
  if (!fs.existsSync(path.resolve(credentialsPath))) return null;

  return { credentialsPath, folderId };
};

export const startGdriveSyncJob = () => {
  // Run every 2 minutes
  cron.schedule('*/2 * * * *', async () => {
    try {
      const driveConfig = resolveDriveConfig();
      if (!driveConfig) {
        if (!driveCredentialsWarned) {
          driveCredentialsWarned = true;
          console.warn('[Cron] GDrive sync disabled: GDRIVE_SERVICE_ACCOUNT_JSON / GDRIVE_FOLDER_ID belum dikonfigurasi dengan benar di .env.');
        }
        return;
      }

      const pendingApplicants = await prisma.applicant.findMany({
        where: { syncStatus: 'pending' },
        take: 10 // Process 10 files per batch
      });

      if (pendingApplicants.length === 0) {
        return;
      }

      console.log(`[Cron] Found ${pendingApplicants.length} pending applicants to sync.`);

      const { credentialsPath, folderId } = driveConfig;

      const auth = new google.auth.GoogleAuth({
        keyFile: credentialsPath,
        scopes: ['https://www.googleapis.com/auth/drive.file'],
      });
      const drive = google.drive({ version: 'v3', auth });

      for (const applicant of pendingApplicants) {
        if (!applicant.localCvPath) {
          console.warn(`[Cron] Applicant ${applicant.id} missing localCvPath. Marking as failed.`);
          await prisma.applicant.update({
            where: { id: applicant.id },
            data: { syncStatus: 'failed' }
          });
          continue;
        }

        const filePath = path.join(__dirname, '../../uploads', applicant.localCvPath);
        
        if (!fs.existsSync(filePath)) {
          console.warn(`[Cron] File not found: ${filePath}. Marking as failed.`);
          await prisma.applicant.update({
            where: { id: applicant.id },
            data: { syncStatus: 'failed' }
          });
          continue;
        }

        try {
          console.log(`[Cron] Uploading ${applicant.localCvPath} to Google Drive...`);
          
          const fileMetadata = {
            name: applicant.cvFileName, // We reuse this field temporarily for the intended filename
            parents: [folderId]
          };
          const media = {
            mimeType: applicant.cvMimeType,
            body: fs.createReadStream(filePath)
          };

          const file = await drive.files.create({
            requestBody: fileMetadata,
            media: media,
            fields: 'id',
            supportsAllDrives: true
          });

          const gdriveFileId = file.data.id;
          if (!gdriveFileId) {
            throw new Error("Google Drive did not return a file ID");
          }

          // Update database: replace cvFileName with the actual GDrive File ID
          await prisma.applicant.update({
            where: { id: applicant.id },
            data: { 
              syncStatus: 'success',
              cvFileName: gdriveFileId // We store the File ID here so we can fetch it later
            }
          });

          // Cleanup local file
          fs.unlinkSync(filePath);
          console.log(`[Cron] Successfully synced and cleaned up ${applicant.localCvPath}`);

        } catch (uploadError: any) {
          console.error(`[Cron] Failed to sync applicant ${applicant.id}:`, uploadError.message);
          // Wait, if it fails due to network, don't mark as failed immediately, so it retries next time.
          // Unless it's a critical error (like auth), we just leave it pending to retry.
        }
      }

    } catch (error) {
      console.error('[Cron] GDrive sync job error:', error);
    }
  });
  
  console.log('[Cron] Google Drive sync job scheduled (runs every 2 minutes)');
};
