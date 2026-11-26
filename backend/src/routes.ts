import { Router } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
import rateLimit from 'express-rate-limit';
import { 
  submitApplication, getApplicants, downloadCV, exportApplicantsCSV, 
  updateApplicant, deleteApplicant, bulkDeleteApplicants, screenApplicantCV, saveInterview, 
  scoreInterview, checkEmail, getInterviewResultByEmail, getApplicantRanking,
  batchScreenApplicants, generateDecisionLetter, getAuditLogsHandler, testAiLatencyHandler,
  evaluateInterviewTurn, transcribeAudioHandler, synthesizeSpeechHandler
} from './controllers/ApplicantController';
import multer from 'multer';

const audioUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 25 * 1024 * 1024 }
});

const caseFileUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }
});
import { login, me as getCurrentAdmin, getAdmins, createAdmin, updateAdmin, deleteAdmin, setupTwoFactor, enableTwoFactor, disableTwoFactor } from './controllers/AdminController';
import {
  loginPortal, registerPeserta, googleLogin, tokenLogin, me as getPortalMe, updateProfile, changePassword, completeOnboarding, verifyPortalFacePhoto, completeDeviceCheck, completeDeviceCheckSession, getPortalDashboard,
  listPortalUsers, createPortalUser, updatePortalUser, deletePortalUser,
  forgotPassword, resetPassword, refreshPortalSession, logoutPortal, getAssessmentHistory, sendPortalUserCredentials, sendPortalUserActivation,
  getPortalConsent, acceptPortalConsent
} from './controllers/PortalAuthController';
import { createInterviewSessionToken } from './controllers/ApplicantController';
import { getActiveJobs, getAdminJobs, createJob, updateJob, deleteJob } from './controllers/JobController';
import { getBillingOverview, requestTopUpQuota, approveInvoice, verifyLhaPublic, downloadInvoicePdf } from './controllers/BillingController';
import { startExam, saveAnswers, submitExam, getExamResult, submitLiveCoding, getMyLiveCoding, getPortalProctoringPolicy } from './controllers/ExamController';
import {
  upsertAssessorScore, listAssessorScores, getAssessorScore, getSignedLha, downloadLhaPdf, downloadMyPortalLhaPdf,
  upsertSecondaryScore, getCalibrationOverview, getCandidateCalibration, finalizeCalibrationConsensus,
  submitLhaCorrectionRequest, getLhaVersionHistory, listAdminLhaCorrections, reviewAdminLhaCorrection
} from './controllers/AssessorScoreController';
import { getProctoringReviews, upsertProctoringReview } from './controllers/ProctoringController';
import { getInterviewQuestions } from './controllers/InterviewController';
import {
  listAssessorCandidates,
  getAssessorCandidate,
  getAssessorCandidateProctoring,
  listAllAssessorProctoringEvents,
  handleAssessorSessionAction,
  listAdminLiveSessions,
  adminManageLiveSession
} from './controllers/AssessorCandidateController';
import { getWaitingRoomStatus, completeAndCallNext, streamWaitingRoom } from './controllers/InterviewQueueController';
import { getPortalMaterials } from './controllers/PortalMaterialController';
import { getMasterScope, putMasterRecord, deleteMasterRecord } from './controllers/MasterDataController';
import { listTenants, createOrSyncTenant } from './controllers/TenantController';
import {
  getReportTemplate,
  saveReportTemplate,
  uploadReportTemplateFile,
  getReportTemplateFile,
  previewReportTemplatePdf,
  downloadApplicantLhaPdf
} from './controllers/ReportTemplateController';
import {
  downloadFaqWordTemplate,
  getFaqKnowledge,
  uploadFaqKnowledgeFile,
  addFaqKnowledgeItem,
  updateFaqKnowledgeItem,
  deleteFaqKnowledgeItem,
  getMcpKnowledgeConfig,
  saveMcpKnowledgeConfig,
  testMcpKnowledgeConnection,
  testFaqRagSearch,
  listPesertaFaqItems,
  askPesertaFaqChatbot,
  createHelpdeskTicket,
  listPesertaHelpdeskTickets,
  replyPesertaHelpdeskTicket,
  listAdminHelpdeskTickets,
  replyAdminHelpdeskTicket,
  updateHelpdeskTicketStatus,
  markAdminHelpdeskRead,
  streamPortalHelpdesk,
  streamAdminHelpdesk
} from './controllers/FaqKnowledgeController';
import { syncProgramQuestions, publishProgram, uploadQuestionAttachment, uploadProgramCaseFile, deleteProgramCaseFile, getCaseFile, downloadQuestionTemplate, importProgramQuestions } from './controllers/ProgramQuestionController';
import { listAccessCodes, createAccessCode, updateAccessCode } from './controllers/AccessCodeController';
import { uploadExcel, downloadPortalUserTemplate, importPortalUsers } from './controllers/BulkImportController';
import { runFactSheetMatching } from './services/factSheetService';
import { authenticateAny, authenticatePortal, authenticateToken, requirePortalRole, requireSuperadmin } from './middleware/auth';
import { uploadCV } from './middleware/upload';
import {
  uploadInterviewRecording, saveInterviewTranscript, listMyRecordings,
  listCandidateRecordings, downloadRecording
} from './controllers/InterviewRecordingController';
import {
  listDepartments, createDepartment, updateDepartment, deleteDepartment, assignUserDepartment,
  listClassGroups, createClassGroup, updateClassGroup, deleteClassGroup,
  listClassMembers, addClassMembers, removeClassMember, assignUserClasses, listMyClasses
} from './controllers/OrganizationController';
import { executeJudge0, judge0Status } from './controllers/Judge0Controller';

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
router.get('/health', async (_req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return res.json({
      status: 'ok',
      service: 'talenta-api',
      database: 'ok',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Health check failed:', error);
    return res.status(503).json({
      status: 'degraded',
      service: 'talenta-api',
      database: 'down',
      timestamp: new Date().toISOString()
    });
  }
});
router.post('/applicants', uploadCV, submitApplication);
router.get('/jobs', getActiveJobs);
router.post('/admin/login', authLimiter, login);
router.get('/lha/verify/:hash', verifyLhaPublic);
router.post('/interview/session-token', authLimiter, createInterviewSessionToken);

// Portal authentication (peserta & asesor)
router.post('/portal/auth/login', authLimiter, loginPortal);
router.post('/portal/auth/register', authLimiter, registerPeserta);
router.post('/portal/auth/token-login', authLimiter, tokenLogin);
router.post('/portal/auth/forgot-password', authLimiter, forgotPassword);
router.post('/portal/auth/reset-password', authLimiter, resetPassword);
router.post('/portal/auth/refresh', refreshPortalSession);
router.post('/portal/auth/logout', authenticatePortal, logoutPortal);
router.get('/portal/auth/me', authenticatePortal, getPortalMe);
router.put('/portal/profile', authenticatePortal, updateProfile);
router.put('/portal/password', authenticatePortal, changePassword);
router.post('/portal/onboarding', authenticatePortal, completeOnboarding);
router.post('/portal/verify-face', authenticatePortal, verifyPortalFacePhoto);
router.get('/portal/proctoring-policy', authenticatePortal, getPortalProctoringPolicy);
router.post('/portal/device-check', authenticatePortal, completeDeviceCheck);
router.post('/portal/device-check/complete', authenticatePortal, completeDeviceCheckSession);
router.get('/portal/dashboard', authenticatePortal, getPortalDashboard);
router.get('/portal/waiting-room', authenticatePortal, requirePortalRole('peserta'), getWaitingRoomStatus);
router.get('/portal/waiting-room/stream', authenticatePortal, requirePortalRole('peserta'), streamWaitingRoom);
router.get('/portal/history', authenticatePortal, getAssessmentHistory);
router.get('/portal/consent', authenticatePortal, getPortalConsent);
router.post('/portal/consent', authenticatePortal, acceptPortalConsent);
router.get('/portal/classes', authenticatePortal, listMyClasses);
router.post('/portal/interview/recording', authenticatePortal, requirePortalRole('peserta'), audioUpload.single('audio'), uploadInterviewRecording);
router.post('/portal/interview/transcript', authenticatePortal, requirePortalRole('peserta'), saveInterviewTranscript);
router.get('/portal/interview/recordings', authenticatePortal, listMyRecordings);
router.get('/portal/recordings/:id/file', authenticatePortal, downloadRecording);
router.get('/portal/judge0/status', authenticatePortal, judge0Status);
router.post('/portal/judge0/execute', authenticatePortal, requirePortalRole('peserta'), executeJudge0);
router.post('/portal/live-coding/submit', authenticatePortal, requirePortalRole('peserta'), submitLiveCoding);
router.get('/portal/live-coding/my', authenticatePortal, requirePortalRole('peserta'), getMyLiveCoding);
router.get('/portal/materials', authenticatePortal, requirePortalRole('peserta'), getPortalMaterials);
router.get('/portal/lha/pdf', authenticatePortal, requirePortalRole('peserta'), downloadMyPortalLhaPdf);
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
router.post('/admin/applicants/bulk-delete', authenticateToken, requireSuperadmin, bulkDeleteApplicants);

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
const aiTurnLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 120,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Terlalu banyak permintaan evaluasi AI. Silakan coba lagi beberapa saat.' }
});
router.post('/interview/gemini-turn', aiTurnLimiter, evaluateInterviewTurn);
router.post('/interview/langchain-turn', aiTurnLimiter, evaluateInterviewTurn);
router.post('/interview/transcribe-audio', aiTurnLimiter, audioUpload.single('audio'), transcribeAudioHandler);
router.post('/interview/tts', aiTurnLimiter, synthesizeSpeechHandler);

// Admin master data (bank soal, materi, program builder, company matrix, AI config)
router.get('/admin/master/:scope', authenticateToken, getMasterScope);
router.put('/admin/master/:scope/:key', authenticateToken, putMasterRecord);
router.delete('/admin/master/:scope/:key', authenticateToken, deleteMasterRecord);

// Program access codes
router.get('/admin/access-codes', authenticateToken, listAccessCodes);
router.post('/admin/access-codes', authenticateToken, createAccessCode);
router.put('/admin/access-codes/:code', authenticateToken, updateAccessCode);

router.get('/admin/tenants', authenticateToken, listTenants);
router.post('/admin/tenants', authenticateToken, requireSuperadmin, createOrSyncTenant);
router.get('/admin/live-sessions', authenticateToken, listAdminLiveSessions);
router.post('/admin/live-sessions/:userId/action', authenticateToken, adminManageLiveSession);
router.get('/admin/report-templates/:companyKey', authenticateToken, getReportTemplate);
router.get('/admin/report-templates/:companyKey/preview-pdf', authenticateToken, previewReportTemplatePdf);
router.get('/admin/applicants/:id/lha-pdf', authenticateToken, downloadApplicantLhaPdf);
router.put('/admin/report-templates/:companyKey', authenticateToken, saveReportTemplate);
router.post('/admin/report-templates/:companyKey/upload', authenticateToken, caseFileUpload.single('file'), uploadReportTemplateFile);
router.get('/report-templates/files/:fileName', getReportTemplateFile);

// FAQ Knowledge Base (RAG / Word .docx) & Helpdesk Internal
router.get('/admin/faq-knowledge/template-docx', authenticateToken, downloadFaqWordTemplate);
router.get('/admin/faq-knowledge', authenticateToken, getFaqKnowledge);
router.post('/admin/faq-knowledge/upload', authenticateToken, caseFileUpload.single('file'), uploadFaqKnowledgeFile);
router.post('/admin/faq-knowledge/items', authenticateToken, addFaqKnowledgeItem);
router.put('/admin/faq-knowledge/items/:id', authenticateToken, updateFaqKnowledgeItem);
router.delete('/admin/faq-knowledge/items/:id', authenticateToken, deleteFaqKnowledgeItem);
router.get('/admin/faq-knowledge/mcp-config', authenticateToken, getMcpKnowledgeConfig);
router.put('/admin/faq-knowledge/mcp-config', authenticateToken, saveMcpKnowledgeConfig);
router.post('/admin/faq-knowledge/mcp-test', authenticateToken, testMcpKnowledgeConnection);
router.post('/admin/faq-knowledge/test-rag', authenticateToken, testFaqRagSearch);
router.get('/admin/helpdesk/stream', authenticateToken, streamAdminHelpdesk);
router.get('/admin/helpdesk/tickets', authenticateToken, listAdminHelpdeskTickets);
router.post('/admin/helpdesk/tickets/:id/reply', authenticateToken, replyAdminHelpdeskTicket);
router.patch('/admin/helpdesk/tickets/:id/status', authenticateToken, updateHelpdeskTicketStatus);
router.patch('/admin/helpdesk/tickets/:id/read', authenticateToken, markAdminHelpdeskRead);

router.get('/peserta/faq-knowledge', authenticateAny, listPesertaFaqItems);
router.post('/peserta/faq-chat', authenticateAny, askPesertaFaqChatbot);
router.get('/peserta/helpdesk/stream', authenticatePortal, streamPortalHelpdesk);
router.get('/peserta/helpdesk/tickets', authenticatePortal, listPesertaHelpdeskTickets);
router.post('/peserta/helpdesk/tickets', authenticateAny, createHelpdeskTicket);
router.post('/peserta/helpdesk/tickets/:id/reply', authenticatePortal, replyPesertaHelpdeskTicket);
router.post('/admin/programs/:programCode/questions/sync', authenticateToken, syncProgramQuestions);
router.get('/admin/programs/:programCode/questions/template', authenticateToken, downloadQuestionTemplate);
router.post('/admin/programs/:programCode/questions/import', authenticateToken, caseFileUpload.single('file'), importProgramQuestions);
router.post('/admin/programs/:programCode/publish', authenticateToken, publishProgram);

// Current admin session
router.get('/admin/me', authenticateToken, getCurrentAdmin);

// Two-factor authentication for admin accounts
router.post('/admin/2fa/setup', authenticateToken, setupTwoFactor);
router.post('/admin/2fa/enable', authenticateToken, enableTwoFactor);
router.post('/admin/2fa/disable', authenticateToken, disableTwoFactor);

// Study-case document uploads (BR-EX-08 / BR-IB-03)
router.post('/admin/questions/attachment', authenticateToken, caseFileUpload.single('file'), uploadQuestionAttachment);
router.post('/admin/programs/:programCode/case-files', authenticateToken, caseFileUpload.single('file'), uploadProgramCaseFile);
router.delete('/admin/programs/:programCode/case-files/:fileName', authenticateToken, deleteProgramCaseFile);
router.get('/case-files/:fileName', getCaseFile);

// Portal user management (peserta & asesor accounts)
router.get('/admin/portal-users/template', authenticateToken, requireSuperadmin, downloadPortalUserTemplate);
router.post('/admin/portal-users/import', authenticateToken, requireSuperadmin, uploadExcel, importPortalUsers);
router.get('/admin/portal-users', authenticateToken, listPortalUsers);
router.post('/admin/portal-users', authenticateToken, createPortalUser);
router.put('/admin/portal-users/:id', authenticateToken, updatePortalUser);
router.delete('/admin/portal-users/:id', authenticateToken, deletePortalUser);
router.post('/admin/portal-users/:id/send-credentials', authenticateToken, sendPortalUserCredentials);
router.post('/admin/portal-users/:id/send-activation', authenticateToken, sendPortalUserActivation);
router.put('/admin/portal-users/:userId/department', authenticateToken, assignUserDepartment);
router.put('/admin/portal-users/:userId/classes', authenticateToken, assignUserClasses);

// Organization hierarchy & multi-class assignment (BR-MT-01, M3, M4)
router.get('/admin/departments', authenticateToken, listDepartments);
router.post('/admin/departments', authenticateToken, createDepartment);
router.put('/admin/departments/:id', authenticateToken, updateDepartment);
router.delete('/admin/departments/:id', authenticateToken, deleteDepartment);
router.get('/admin/classes', authenticateToken, listClassGroups);
router.post('/admin/classes', authenticateToken, createClassGroup);
router.put('/admin/classes/:id', authenticateToken, updateClassGroup);
router.delete('/admin/classes/:id', authenticateToken, deleteClassGroup);
router.get('/admin/classes/:id/members', authenticateToken, listClassMembers);
router.post('/admin/classes/:id/members', authenticateToken, addClassMembers);
router.delete('/admin/classes/:id/members/:userId', authenticateToken, removeClassMember);

router.get('/asesor/candidates', authenticatePortal, requirePortalRole('asesor'), listAssessorCandidates);
router.get('/asesor/candidates/:candidateCode', authenticatePortal, requirePortalRole('asesor'), getAssessorCandidate);
router.post('/asesor/candidates/:candidateCode/session-action', authenticatePortal, requirePortalRole('asesor'), handleAssessorSessionAction);
router.get('/asesor/candidates/:candidateCode/proctoring', authenticatePortal, requirePortalRole('asesor'), getAssessorCandidateProctoring);
router.get('/asesor/proctoring', authenticatePortal, requirePortalRole('asesor'), listAllAssessorProctoringEvents);

router.get('/asesor/proctoring/:candidateCode', authenticatePortal, requirePortalRole('asesor'), getProctoringReviews);
router.put('/asesor/proctoring/:candidateCode/:eventId', authenticatePortal, requirePortalRole('asesor'), upsertProctoringReview);

// Assessor scoring, e-sign, calibration, and LHA corrections/versioning
router.post('/asesor/scores', authenticatePortal, requirePortalRole('asesor'), upsertAssessorScore);
router.post('/asesor/scores/:candidateCode/secondary', authenticatePortal, requirePortalRole('asesor'), upsertSecondaryScore);
router.get('/asesor/scores', authenticateAny, listAssessorScores);
router.get('/asesor/scores/:candidateCode', authenticateAny, getAssessorScore);
router.get('/asesor/calibration', authenticateAny, getCalibrationOverview);
router.get('/asesor/calibration/:candidateCode', authenticateAny, getCandidateCalibration);
router.post('/asesor/calibration/:candidateCode/finalize', authenticatePortal, requirePortalRole('asesor'), finalizeCalibrationConsensus);
router.post('/asesor/lha/:candidateCode/correction-request', authenticatePortal, requirePortalRole('asesor'), submitLhaCorrectionRequest);
router.get('/asesor/lha/:candidateCode/versions', authenticateAny, getLhaVersionHistory);
router.get('/asesor/lha/:candidateCode', authenticateAny, getSignedLha);
router.get('/asesor/lha/:candidateCode/pdf', authenticateAny, downloadLhaPdf);
router.get('/asesor/candidates/:candidateCode/recordings', authenticatePortal, requirePortalRole('asesor'), listCandidateRecordings);

// Admin LHA correction approvals
router.get('/admin/lha/corrections', authenticateToken, listAdminLhaCorrections);
router.post('/admin/lha/corrections/:id/review', authenticateToken, reviewAdminLhaCorrection);

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
router.get('/admin/billing/invoices/:invoiceId/pdf', authenticateToken, downloadInvoicePdf);

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
const handleFactSheetMatch = async (req: any, res: any) => {
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
};

router.post('/admin/ai/fact-sheet-match', authenticateAny, factSheetLimiter, handleFactSheetMatch);
router.post('/asesor/ai/fact-sheet-match', authenticatePortal, requirePortalRole('asesor'), factSheetLimiter, handleFactSheetMatch);

export default router;
