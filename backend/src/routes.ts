import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { 
  submitApplication, getApplicants, downloadCV, exportApplicantsCSV, 
  updateApplicant, deleteApplicant, screenApplicantCV, saveInterview, 
  scoreInterview, checkEmail, getInterviewResultByEmail, getApplicantRanking,
  batchScreenApplicants, generateDecisionLetter, getAuditLogsHandler, testAiLatencyHandler,
  evaluateInterviewTurn, transcribeAudioHandler, synthesizeSpeechHandler
} from './controllers/ApplicantController';
import multer from 'multer';

const audioUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 25 * 1024 * 1024 }
});
import { login, getAdmins, createAdmin, updateAdmin, deleteAdmin } from './controllers/AdminController';
import { getActiveJobs, getAdminJobs, createJob, updateJob, deleteJob } from './controllers/JobController';
import { getBillingOverview, requestTopUpQuota, approveInvoice, verifyLhaPublic } from './controllers/BillingController';
import { runFactSheetMatching } from './services/factSheetService';
import { authenticateToken, requireSuperadmin } from './middleware/auth';
import { uploadCV } from './middleware/upload';

const router = Router();

// Public routes
router.post('/applicants', uploadCV, submitApplication);
router.get('/jobs', getActiveJobs);
router.post('/admin/login', login);
router.get('/lha/verify/:hash', verifyLhaPublic);

// Protected routes (Admin only - view & read)
router.get('/admin/applicants', authenticateToken, getApplicants);
router.get('/admin/applicants/cv/:fileName', authenticateToken, downloadCV);
router.get('/admin/applicants/export', authenticateToken, exportApplicantsCSV);
router.post('/admin/applicants/:id/screen', authenticateToken, screenApplicantCV);
router.post('/admin/applicants/batch-screen', authenticateToken, batchScreenApplicants);
router.post('/admin/applicants/:id/decision-letter', authenticateToken, generateDecisionLetter);

// Job Vacancy Management routes (Admin only)
router.get('/admin/jobs', authenticateToken, getAdminJobs);
router.post('/admin/jobs', authenticateToken, createJob);
router.put('/admin/jobs/:id', authenticateToken, updateJob);
router.delete('/admin/jobs/:id', authenticateToken, deleteJob);

// Superadmin only routes (edit & delete)
router.put('/admin/applicants/:id', authenticateToken, requireSuperadmin, updateApplicant);
router.delete('/admin/applicants/:id', authenticateToken, requireSuperadmin, deleteApplicant);

// Interview save route (rate-limited — called from unauthenticated interview page)
// Applicants authenticate by providing their registered email
const interviewLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200, // Generous limit for candidate saves and retries
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Terlalu banyak permintaan simpan wawancara. Silakan coba lagi nanti.' }
});
router.get('/applicants/check-email', checkEmail);
router.post('/interview/save', interviewLimiter, saveInterview);
router.get('/interview/result', getInterviewResultByEmail);
router.get('/admin/applicants/ranking', authenticateToken, getApplicantRanking);
router.post('/admin/applicants/:id/score-interview', authenticateToken, scoreInterview);
router.post('/interview/gemini-turn', evaluateInterviewTurn);
router.post('/interview/langchain-turn', evaluateInterviewTurn);
router.post('/interview/transcribe-audio', audioUpload.single('audio'), transcribeAudioHandler);
router.post('/interview/tts', synthesizeSpeechHandler);

// Admin Management routes (superadmin only)
router.get('/admin/users', authenticateToken, requireSuperadmin, getAdmins);
router.post('/admin/users', authenticateToken, requireSuperadmin, createAdmin);
router.put('/admin/users/:id', authenticateToken, requireSuperadmin, updateAdmin);
router.delete('/admin/users/:id', authenticateToken, requireSuperadmin, deleteAdmin);

// Superadmin Audit Logs & AI System Diagnostics
router.get('/admin/audit-logs', authenticateToken, requireSuperadmin, getAuditLogsHandler);
router.get('/admin/ai/ping', authenticateToken, requireSuperadmin, testAiLatencyHandler);

// Multi-Tenant Billing & Credit Management (BRD BR-BL-11, BR-BL-12, BR-MT-01)
router.get('/admin/billing/overview', authenticateToken, getBillingOverview);
router.post('/admin/billing/topup', authenticateToken, requestTopUpQuota);
router.put('/admin/billing/invoices/:invoiceId/approve', authenticateToken, requireSuperadmin, approveInvoice);

// In-Basket AI Fact Sheet Matching (BRD BR-FS-04, BR-IB-03)
router.post('/admin/ai/fact-sheet-match', authenticateToken, async (req, res) => {
  try {
    const { submission, factSheet } = req.body;
    if (!submission) {
      return res.status(400).json({ error: 'Data jawaban studi kasus tidak lengkap' });
    }
    const result = await runFactSheetMatching(submission, factSheet);
    return res.json({ success: true, data: result });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Gagal mengevaluasi Fact Sheet' });
  }
});

export default router;
