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
import { login, me as getCurrentAdmin, getAdmins, createAdmin, updateAdmin, deleteAdmin } from './controllers/AdminController';
import {
  loginPortal, registerPeserta, googleLogin, tokenLogin, me as getPortalMe, updateProfile, changePassword, completeOnboarding, completeDeviceCheck, getPortalDashboard,
  listPortalUsers, createPortalUser, updatePortalUser, deletePortalUser
} from './controllers/PortalAuthController';
import { createInterviewSessionToken } from './controllers/ApplicantController';
import { getActiveJobs, getAdminJobs, createJob, updateJob, deleteJob } from './controllers/JobController';
import { getBillingOverview, requestTopUpQuota, approveInvoice, verifyLhaPublic } from './controllers/BillingController';
import { startExam, saveAnswers, submitExam, getExamResult } from './controllers/ExamController';
import { upsertAssessorScore, listAssessorScores, getAssessorScore, getSignedLha } from './controllers/AssessorScoreController';
import { getProctoringReviews, upsertProctoringReview } from './controllers/ProctoringController';
import { getInterviewQuestions } from './controllers/InterviewController';
import { getWaitingRoomStatus, completeAndCallNext } from './controllers/InterviewQueueController';
import { getMasterScope, putMasterRecord, deleteMasterRecord } from './controllers/MasterDataController';
import { listTenants } from './controllers/TenantController';
import { listAccessCodes, createAccessCode, updateAccessCode } from './controllers/AccessCodeController';
import { uploadExcel, downloadPortalUserTemplate, importPortalUsers } from './controllers/BulkImportController';
import { runFactSheetMatching } from './services/factSheetService';
import { authenticateAny, authenticatePortal, authenticateToken, requirePortalRole, requireSuperadmin } from './middleware/auth';
import { uploadCV } from './middleware/upload';

const router = Router();

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true,
  message: { error: 'Terlalu banyak percobaan masuk. Silakan coba lagi dalam 15 menit.' }
});

// Public routes
router.get('/health', (_req, res) => res.json({ status: 'ok', service: 'talenta-api', timestamp: new Date().toISOString() }));
router.post('/applicants', uploadCV, submitApplication);
router.get('/jobs', getActiveJobs);
router.post('/admin/login', authLimiter, login);
router.get('/lha/verify/:hash', verifyLhaPublic);
router.post('/interview/session-token', authLimiter, createInterviewSessionToken);

// Portal authentication (peserta & asesor)
router.post('/portal/auth/login', authLimiter, loginPortal);
router.post('/portal/auth/register', authLimiter, registerPeserta);
router.post('/portal/auth/token-login', authLimiter, tokenLogin);
router.get('/portal/auth/me', authenticatePortal, getPortalMe);
router.put('/portal/profile', authenticatePortal, updateProfile);
router.put('/portal/password', authenticatePortal, changePassword);
router.post('/portal/onboarding', authenticatePortal, completeOnboarding);
router.post('/portal/device-check', authenticatePortal, completeDeviceCheck);
router.get('/portal/dashboard', authenticatePortal, getPortalDashboard);
router.get('/portal/waiting-room', authenticatePortal, requirePortalRole('peserta'), getWaitingRoomStatus);
router.post('/asesor/interview/:candidateCode/complete-and-call-next', authenticatePortal, requirePortalRole('asesor'), completeAndCallNext);

router.get('/interview/questions', authenticatePortal, requirePortalRole('peserta'), getInterviewQuestions);

// CAT exam attempts (server-side answer storage + scoring)
router.post('/exam/:programCode/start', authenticatePortal, requirePortalRole('peserta'), startExam);
router.put('/exam/:programCode/answers', authenticatePortal, requirePortalRole('peserta'), saveAnswers);
router.post('/exam/:programCode/submit', authenticatePortal, requirePortalRole('peserta'), submitExam);
router.get('/exam/:programCode/result', authenticatePortal, requirePortalRole('peserta'), getExamResult);

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

// Admin master data (bank soal, materi, program builder, company matrix, AI config)
router.get('/admin/master/:scope', authenticateToken, getMasterScope);
router.put('/admin/master/:scope/:key', authenticateToken, putMasterRecord);
router.delete('/admin/master/:scope/:key', authenticateToken, deleteMasterRecord);

// Program access codes
router.get('/admin/access-codes', authenticateToken, listAccessCodes);
router.post('/admin/access-codes', authenticateToken, createAccessCode);
router.put('/admin/access-codes/:code', authenticateToken, updateAccessCode);

router.get('/admin/tenants', authenticateToken, listTenants);

// Current admin session
router.get('/admin/me', authenticateToken, getCurrentAdmin);

// Portal user management (peserta & asesor accounts)
router.get('/admin/portal-users/template', authenticateToken, requireSuperadmin, downloadPortalUserTemplate);
router.post('/admin/portal-users/import', authenticateToken, requireSuperadmin, uploadExcel, importPortalUsers);
router.get('/admin/portal-users', authenticateToken, listPortalUsers);
router.post('/admin/portal-users', authenticateToken, createPortalUser);
router.put('/admin/portal-users/:id', authenticateToken, updatePortalUser);
router.delete('/admin/portal-users/:id', authenticateToken, deletePortalUser);

router.get('/asesor/proctoring/:candidateCode', authenticatePortal, requirePortalRole('asesor'), getProctoringReviews);
router.put('/asesor/proctoring/:candidateCode/:eventId', authenticatePortal, requirePortalRole('asesor'), upsertProctoringReview);

// Assessor scoring, e-sign, and LHA
router.post('/asesor/scores', authenticatePortal, requirePortalRole('asesor'), upsertAssessorScore);
router.get('/asesor/scores', authenticateAny, listAssessorScores);
router.get('/asesor/scores/:candidateCode', authenticateAny, getAssessorScore);
router.get('/asesor/lha/:candidateCode', authenticateAny, getSignedLha);

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
// Called from the Asesor scoring console, which has no backend session identity yet,
// so it is protected by a dedicated rate limiter (same posture as /interview/gemini-turn).
const factSheetLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Terlalu banyak permintaan AI Fact Sheet Matching. Silakan coba lagi nanti.' }
});
router.post('/admin/ai/fact-sheet-match', authenticateAny, factSheetLimiter, async (req, res) => {
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
