import { useCallback, useEffect, useState, useMemo } from 'react';
import axios from 'axios';
import {
  Trophy, Brain, Star, ShieldAlert, X, BarChart3, Briefcase, Loader2, Scale,
  Search, Download, Eye, Printer, FileText, CheckCircle2, ChevronDown, ChevronUp,
  Target, Award
} from 'lucide-react';
import RadarChart from './RadarChart';
import Swal from 'sweetalert2';
import { Card, CardContent } from './ui/Card';
import { Button } from './ui/Button';
import { Badge } from './ui/Badge';
import { Input } from './ui/Input';

interface SkillItem { skill: string; score: number; notes: string }
interface PhaseItem {
  name: string;
  score: number;
  questions: { question: string; score: number; note: string }[];
}

export interface CompositeEvaluation {
  compositeScore: number;
  recommendation: 'STRONG HIRE' | 'RECOMMENDED HIRE' | 'CONSIDER' | 'NOT RECOMMENDED';
  cvContribution: number;
  interviewContribution: number;
  integrityPenalty: number;
  proctorCount: number;
  rationale: string;
}

interface RankedApplicant {
  id: string;
  fullName: string;
  email: string;
  jobTitle: string;
  passingScore: number | null;
  screeningScore: number | null;
  interviewScore: number | null;
  interviewStatus: string;
  interviewResult: string | null;
  interviewTranscript: string | null;
  skillMatrix: SkillItem[] | null;
  phases: PhaseItem[] | null;
  proctorFlags: { violations: { time: string; reason: string }[]; flagged: boolean } | null;
  education: string;
  university: string | null;
  compositeEvaluation?: CompositeEvaluation;
}

const getRecommendation = (result: string | null): { label: string; cls: string } => {
  const m = result?.match(/Rekomendasi:\s*(\w+)/);
  switch (m ? m[1] : null) {
    case 'strong_accept':
    case 'accept': return { label: 'Direkomendasikan', cls: 'bg-emerald-50 text-emerald-700 ring-emerald-200' };
    case 'consider': return { label: 'Pertimbangkan', cls: 'bg-amber-50 text-amber-700 ring-amber-200' };
    case 'reject':
    case 'strong_reject': return { label: 'Tidak Direkomendasikan', cls: 'bg-rose-50 text-rose-700 ring-rose-200' };
    default: return { label: 'Belum Dinilai', cls: 'bg-slate-100 text-slate-500 ring-slate-200' };
  }
};

const scoreColor = (score: number | null) => {
  if (score === null) return 'bg-slate-200';
  if (score >= 75) return 'bg-emerald-500';
  if (score >= 60) return 'bg-amber-500';
  return 'bg-rose-500';
};

export default function RankingView() {
  const [applicants, setApplicants] = useState<RankedApplicant[]>([]);
  const [jobs, setJobs] = useState<{ id: string; title: string }[]>([]);
  const [jobFilter, setJobFilter] = useState('');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<RankedApplicant[]>([]);
  const [showCompare, setShowCompare] = useState(false);
  const [detailApplicant, setDetailApplicant] = useState<RankedApplicant | null>(null);
  const [showTranscript, setShowTranscript] = useState(false);

  const fetchRanking = useCallback(async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('adminToken');
      const response = await axios.get('/api/admin/applicants/ranking', {
        headers: { Authorization: `Bearer ${token}` },
        params: { jobId: jobFilter || undefined }
      });
      setApplicants(response.data.data);
    } catch (err) {
      if (axios.isAxiosError(err) && err.response?.status === 401) {
        localStorage.removeItem('adminToken');
        window.location.href = '/admin/login';
      } else {
        Swal.fire({ icon: 'error', title: 'Gagal', text: 'Gagal mengambil data ranking' });
      }
    } finally {
      setLoading(false);
    }
  }, [jobFilter]);

  useEffect(() => {
    fetchRanking();
  }, [fetchRanking]);

  useEffect(() => {
    const token = localStorage.getItem('adminToken');
    if (!token) return;
    axios.get('/api/admin/jobs', { headers: { Authorization: `Bearer ${token}` } })
      .then(res => setJobs(res.data.data.map((j: any) => ({ id: j.id, title: j.title }))))
      .catch(() => undefined);
  }, []);

  const toggleSelect = (app: RankedApplicant) => {
    setSelected(prev => {
      if (prev.some(s => s.id === app.id)) return prev.filter(s => s.id !== app.id);
      if (prev.length >= 3) {
        Swal.fire({ icon: 'info', title: 'Batas Maksimal', text: 'Anda dapat membandingkan maksimal 3 kandidat sekaligus.' });
        return prev;
      }
      return [...prev, app];
    });
  };

  const compareOpen = () => {
    if (selected.length < 2) {
      Swal.fire({ icon: 'info', title: 'Pilih minimal 2 kandidat', text: 'Centang setidaknya 2 kandidat untuk membandingkan side-by-side.' });
      return;
    }
    setShowCompare(true);
  };

  // Filtered applicants based on search
  const filteredApplicants = useMemo(() => {
    if (!search.trim()) return applicants;
    const q = search.toLowerCase();
    return applicants.filter(a =>
      a.fullName.toLowerCase().includes(q) ||
      a.email.toLowerCase().includes(q) ||
      (a.university && a.university.toLowerCase().includes(q)) ||
      a.jobTitle.toLowerCase().includes(q)
    );
  }, [applicants, search]);

  const handleExportCSV = () => {
    if (applicants.length === 0) return;
    const headers = ['Rank', 'Nama', 'Email', 'Posisi', 'Pendidikan', 'Universitas', 'Skor Wawancara AI', 'Skor CV', 'Rekomendasi', 'Passing Score', 'Status Kelulusan'];
    const rows = filteredApplicants.map((app, idx) => {
      const rec = getRecommendation(app.interviewResult).label;
      const isPassed = app.passingScore != null && app.interviewScore != null
        ? (app.interviewScore >= app.passingScore ? 'Lolos' : 'Tidak Lolos')
        : 'N/A';
      return [
        idx + 1,
        `"${app.fullName}"`,
        `"${app.email}"`,
        `"${app.jobTitle}"`,
        `"${app.education}"`,
        `"${app.university || '-'}"`,
        app.interviewScore ?? '-',
        app.screeningScore ?? '-',
        `"${rec}"`,
        app.passingScore ?? '-',
        `"${isPassed}"`
      ];
    });

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `ranking_kandidat_ai_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    link.remove();
  };

  const escapeHtml = (s: string | null | undefined) =>
    (s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

  const printCandidateReport = (app: RankedApplicant) => {
    let skillMatrixHtml = '';
    if (Array.isArray(app.skillMatrix) && app.skillMatrix.length > 0) {
      skillMatrixHtml = `<div style="margin-top:16px">
        <h3 style="font-size:13px;color:#374151;margin:0 0 10px;">Penilaian Kompetensi</h3>
        ${app.skillMatrix.map((s) => `
          <div style="margin-bottom:10px;">
            <div style="display:flex;justify-content:space-between;font-size:12px;font-weight:600;color:#374151;margin-bottom:3px;">
              <span>${escapeHtml(s.skill)}</span><span>${s.score}/100</span>
            </div>
            <div style="height:8px;background:#e2e8f0;border-radius:4px;overflow:hidden;">
              <div style="height:100%;width:${s.score}%;background:${s.score >= 70 ? '#10b981' : s.score >= 50 ? '#f59e0b' : '#ef4444'};border-radius:4px;"></div>
            </div>
            <div style="font-size:10px;color:#6b7280;margin-top:2px;">${escapeHtml(s.notes)}</div>
          </div>`).join('')}
      </div>`;
    }

    let phasesHtml = '';
    if (Array.isArray(app.phases) && app.phases.length > 0) {
      phasesHtml = `<div style="margin-top:16px">
        <h3 style="font-size:13px;color:#374151;margin:0 0 10px;">Penilaian per Fase Wawancara</h3>
        ${app.phases.map((p, pi) => `
          <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:6px;padding:10px;margin-bottom:8px;">
            <div style="display:flex;justify-content:space-between;font-size:12px;font-weight:700;color:#1e293b;">
              <span>Fase ${pi + 1}: ${escapeHtml(p.name)}</span><span>Skor: ${p.score}%</span>
            </div>
            ${Array.isArray(p.questions) ? p.questions.map((q) => `
              <div style="font-size:11px;color:#475569;margin-top:4px;padding-left:8px;border-left:2px solid #cbd5e1;">
                <strong>[${q.score}/100]</strong> ${escapeHtml(q.question)}
                ${q.note ? `<div style="font-size:10px;color:#64748b;margin-top:2px;">${escapeHtml(q.note)}</div>` : ''}
              </div>
            `).join('') : ''}
          </div>
        `).join('')}
      </div>`;
    }

    let proctorHtml = '';
    if (app.proctorFlags?.flagged && Array.isArray(app.proctorFlags.violations) && app.proctorFlags.violations.length > 0) {
      proctorHtml = `<div style="margin-top:16px;padding:10px;border:1px solid #fecaca;background:#fef2f2;border-radius:6px;">
        <h3 style="font-size:12px;color:#b91c1c;margin:0 0 6px;">Catatan Integritas Sesi</h3>
        <div style="font-size:11px;color:#b91c1c;">${app.proctorFlags.violations.length} pelanggaran terdeteksi selama wawancara:
          ${app.proctorFlags.violations.map((v) => `${escapeHtml(v.reason)} (${escapeHtml(v.time)})`).join('; ')}</div>
      </div>`;
    }

    const rec = getRecommendation(app.interviewResult).label;

    const win = window.open('', '_blank', 'width=900,height=700');
    if (!win) return;
    win.document.write(`<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>Laporan Evaluasi — ${escapeHtml(app.fullName)}</title>
<style>
  body{font-family:Arial,Helvetica,sans-serif;color:#111827;margin:32px;font-size:13px;}
  h1{font-size:20px;margin:0;} h2{font-size:14px;color:#374151;margin:0 0 8px;}
  .meta{color:#4b5563;font-size:12px;margin-top:4px;line-height:1.7;}
  .banner{border:1px solid #e2e8f0;border-radius:8px;padding:16px;margin-top:16px;}
  table{width:100%;border-collapse:collapse;margin-top:16px;}
  th,td{border:1px solid #e2e8f0;padding:8px;text-align:left;font-size:12px;vertical-align:top;}
  th{background:#f8fafc;}
  .print-btn{cursor:pointer;background:#111827;color:#fff;border:0;padding:10px 18px;border-radius:6px;font-weight:700;font-size:12px;margin-bottom:16px;}
  @media print{.no-print{display:none;}}
</style></head><body>
<button class="no-print print-btn" onclick="window.print()">Cetak / Simpan PDF</button>
<div style="display:flex;justify-content:space-between;align-items:flex-start;border-bottom:2px solid #111827;padding-bottom:12px;">
  <div><h1>Laporan Evaluasi Kandidat — AI Interviewer</h1><div class="meta">${escapeHtml(app.fullName)} • ${escapeHtml(app.email)}</div></div>
  <div style="text-align:right;"><div style="font-size:28px;font-weight:800;color:#0d9488;">${app.interviewScore ?? '-'}/100</div><div style="font-size:11px;color:#4b5563;">Skor Wawancara AI</div></div>
</div>

<div class="banner">
  <h2>Informasi Kandidat</h2>
  <table>
    <tr><th>Nama</th><td>${escapeHtml(app.fullName)}</td><th>Posisi</th><td>${escapeHtml(app.jobTitle)}</td></tr>
    <tr><th>Email</th><td>${escapeHtml(app.email)}</td><th>Pendidikan</th><td>${escapeHtml(app.education)} ${escapeHtml(app.university || '')}</td></tr>
    <tr><th>Skor CV</th><td>${app.screeningScore != null ? app.screeningScore + '%' : '-'}</td><th>Rekomendasi</th><td>${escapeHtml(rec)}</td></tr>
    <tr><th>Nilai Kelulusan Min.</th><td>${app.passingScore != null ? app.passingScore + '%' : '-'}</td><th>Status</th><td>${app.passingScore != null && app.interviewScore != null ? (app.interviewScore >= app.passingScore ? 'Lolos' : 'Di Bawah Syarat') : '-'}</td></tr>
  </table>
</div>

${skillMatrixHtml}
${phasesHtml}
${proctorHtml}

${app.interviewResult ? `<div class="banner"><h2>Ringkasan Penilaian AI</h2><div style="white-space:pre-wrap;font-size:12px;color:#374151;line-height:1.7;">${escapeHtml(app.interviewResult)}</div></div>` : ''}

${app.interviewTranscript ? `<div class="banner"><h2>Transkrip Percakapan</h2><div style="white-space:pre-wrap;font-size:11px;color:#4b5563;line-height:1.6;">${escapeHtml(app.interviewTranscript.slice(0, 12000))}</div>${app.interviewTranscript.length > 12000 ? '<p style="font-size:10px;color:#6b7280;">…(transkrip dipotong untuk cetak)</p>' : ''}</div>` : ''}

<div style="margin-top:24px;font-size:10px;color:#9ca3af;">Dokumen dihasilkan otomatis oleh sistem AI Interviewer Kinesta • ${new Date().toLocaleString('id-ID')}</div>
<script>setTimeout(()=>window.print(),400)</script>
</body></html>`);
    win.document.close();
  };

  return (
    <div className="animate-fade-in space-y-5">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h3 className="text-base font-extrabold text-slate-900 font-heading">Ranking & Perbandingan Hasil AI Interview</h3>
          <p className="text-xs text-slate-400 mt-0.5">Daftar kandidat yang telah dievaluasi oleh Ava AI, diurutkan berdasarkan skor kompetensi tertinggi</p>
        </div>

        <div className="flex items-center gap-2 flex-wrap self-end sm:self-auto">
          {/* Export button */}
          <Button
            variant="secondary"
            size="sm"
            onClick={handleExportCSV}
            disabled={applicants.length === 0}
            leftIcon={<Download className="w-3.5 h-3.5 text-slate-500" />}
          >
            Export Ranking CSV
          </Button>

          {/* Compare Button */}
          <Button
            variant="primary"
            size="sm"
            onClick={compareOpen}
            disabled={selected.length === 0}
            leftIcon={<Scale className="w-3.5 h-3.5" />}
          >
            Bandingkan ({selected.length}/3)
          </Button>
        </div>
      </div>

      {/* Filter Row */}
      <div className="flex flex-col sm:flex-row gap-2.5">
        <div className="relative flex-1 min-w-0 sm:max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Cari kandidat atau universitas..."
            className="w-full pl-9 pr-8 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-sans placeholder:text-slate-400 focus:bg-white focus:ring-1 focus:ring-primary-navy focus:border-primary-navy transition-colors outline-none"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          {search && (
            <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        <div className="relative min-w-[220px]">
          <Briefcase className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
          <select
            value={jobFilter}
            onChange={(e) => setJobFilter(e.target.value)}
            className="w-full pl-9 pr-8 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-700 focus:bg-white focus:ring-1 focus:ring-primary-navy focus:border-primary-navy outline-none transition-colors appearance-none cursor-pointer hover:border-slate-300 font-sans"
          >
            <option value="">Semua Lowongan Pekerjaan</option>
            {jobs.map(j => <option key={j.id} value={j.id}>{j.title}</option>)}
          </select>
        </div>
      </div>

      {/* Ranking Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="hidden lg:grid grid-cols-12 gap-3 px-6 py-3.5 bg-slate-50/90 border-b border-slate-200 text-xs font-semibold text-slate-500 uppercase tracking-wider font-sans">
          <div className="col-span-1">Peringkat</div>
          <div className="col-span-3">Kandidat</div>
          <div className="col-span-2">Posisi & Kelulusan</div>
          <div className="col-span-3">Skor Penilaian</div>
          <div className="col-span-2">Rekomendasi AI</div>
          <div className="col-span-1 text-right">Aksi & Banding</div>
        </div>

        {loading ? (
          <div className="divide-y divide-slate-100">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="p-5 lg:px-6 flex items-center gap-4">
                <div className="h-6 w-8 skeleton rounded-lg" />
                <div className="w-10 h-10 skeleton rounded-xl" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 w-48 skeleton rounded-lg" />
                  <div className="h-3 w-32 skeleton rounded-lg" />
                </div>
                <div className="h-8 w-32 skeleton rounded-xl" />
              </div>
            ))}
          </div>
        ) : filteredApplicants.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 px-6">
            <div className="w-16 h-16 rounded-lg bg-slate-100 border border-slate-200 flex items-center justify-center mb-4">
              <Trophy className="w-8 h-8 text-slate-400" />
            </div>
            <h4 className="text-lg font-extrabold text-slate-700 font-heading">
              {search ? 'Kandidat Tidak Ditemukan' : 'Belum Ada Hasil Interview Dinilai'}
            </h4>
            <p className="text-sm text-slate-400 mt-1 max-w-sm text-center">
              {search ? 'Coba ubah kata kunci pencarian Anda.' : 'Kandidat akan muncul di ranking setelah wawancara mereka dinilai oleh AI.'}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100/80">
            {filteredApplicants.map((app, idx) => {
              const rec = getRecommendation(app.interviewResult);
              const flagged = app.proctorFlags?.flagged || (app.proctorFlags?.violations?.length ?? 0) > 0;
              const isPassed = app.passingScore != null && app.interviewScore != null
                ? app.interviewScore >= app.passingScore
                : null;

              return (
                <div
                  key={app.id}
                  className={`grid grid-cols-1 lg:grid-cols-12 gap-3 px-4 lg:px-6 py-3.5 items-center transition-colors ${
                    selected.some(s => s.id === app.id) ? 'bg-soft-blue/70 border-l-2 border-primary-navy' : 'hover:bg-slate-50/70'
                  }`}
                >
                  {/* Rank Badge */}
                  <div className="lg:col-span-1 flex items-center gap-2">
                    <span className={`w-7 h-7 rounded-md flex items-center justify-center text-xs font-mono font-bold border ${
                      idx === 0 ? 'bg-amber-50 text-amber-800 border-amber-200 shadow-xs' :
                      idx === 1 ? 'bg-slate-100 text-slate-700 border-slate-200' :
                      idx === 2 ? 'bg-amber-100/60 text-amber-900 border-amber-300' :
                      'bg-slate-50 text-slate-500 border-slate-200'
                    }`}>
                      {idx === 0 ? <Trophy className="w-3.5 h-3.5 text-amber-600" /> : idx + 1}
                    </span>
                  </div>

                  {/* Candidate Identity */}
                  <div className="lg:col-span-3 flex items-center gap-3 min-w-0">
                    <div className="w-8 h-8 rounded-lg bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-700 font-mono font-bold text-xs flex-shrink-0">
                      {app.fullName.charAt(0)}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-slate-900 truncate flex items-center gap-1.5">
                        <span className="truncate">{app.fullName}</span>
                        {flagged && (
                          <Badge variant="warning" format="soft" className="text-[10px] px-1.5 py-0 font-medium">
                            <ShieldAlert className="w-2.5 h-2.5 mr-0.5 inline" /> Flag
                          </Badge>
                        )}
                      </p>
                      <p className="text-xs text-slate-500 font-sans truncate mt-0.5">{app.education}{app.university ? ` • ${app.university}` : ''}</p>
                    </div>
                  </div>

                  {/* Position & Passing Grade */}
                  <div className="lg:col-span-2 flex flex-col justify-center min-w-0">
                    <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-700 truncate">
                      <Briefcase className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                      <span className="truncate">{app.jobTitle}</span>
                    </div>
                    {isPassed !== null && (
                      <span className={`inline-flex items-center gap-1 mt-1 text-[11px] font-semibold ${
                        isPassed ? 'text-emerald-600' : 'text-rose-600'
                      }`}>
                        {isPassed ? `✓ Lolos (Min. ${app.passingScore}%)` : `✗ Di bawah threshold (${app.passingScore}%)`}
                      </span>
                    )}
                  </div>

                  {/* Scores Progress Bars */}
                  <div className="lg:col-span-3 space-y-1.5">
                    <div>
                      <div className="flex items-center justify-between mb-0.5">
                        <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Interview AI</span>
                        <span className="text-xs font-bold font-mono text-slate-800">{app.interviewScore}%</span>
                      </div>
                      <div className="h-1.5 w-full rounded-full bg-slate-100 overflow-hidden">
                        <div className={`h-full rounded-full ${scoreColor(app.interviewScore)}`} style={{ width: `${app.interviewScore ?? 0}%` }} />
                      </div>
                    </div>
                    <div>
                      <div className="flex items-center justify-between mb-0.5">
                        <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">CV Screening</span>
                        <span className="text-xs font-bold font-mono text-slate-800">{app.screeningScore !== null ? `${app.screeningScore}%` : '-'}</span>
                      </div>
                      <div className="h-1.5 w-full rounded-full bg-slate-100 overflow-hidden">
                        <div className={`h-full rounded-full ${scoreColor(app.screeningScore)}`} style={{ width: `${app.screeningScore ?? 0}%` }} />
                      </div>
                    </div>
                  </div>

                  {/* Recommendation Badge */}
                  <div className="lg:col-span-2">
                    {app.compositeEvaluation ? (
                      <Badge
                        variant={
                          app.compositeEvaluation.recommendation === 'STRONG HIRE' ? 'teal' :
                          app.compositeEvaluation.recommendation === 'RECOMMENDED HIRE' ? 'success' :
                          app.compositeEvaluation.recommendation === 'CONSIDER' ? 'warning' : 'danger'
                        }
                        format="soft"
                        className="text-[11px]"
                      >
                        {app.compositeEvaluation.recommendation} ({app.compositeEvaluation.compositeScore})
                      </Badge>
                    ) : (
                      <Badge variant="neutral" format="soft" className="text-[11px]">
                        <Brain className="w-3 h-3 mr-1 inline" /> {rec.label}
                      </Badge>
                    )}
                  </div>

                  {/* Action & Compare Checkbox */}
                  <div className="lg:col-span-1 flex items-center justify-end gap-2">
                    <button
                      onClick={() => setDetailApplicant(app)}
                      className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
                      title="Lihat Detail Laporan"
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                    <label className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-[10px] font-bold cursor-pointer transition-all border ${
                      selected.some(s => s.id === app.id)
                        ? 'bg-blue-600 text-white border-blue-600'
                        : selected.length >= 3 ? 'bg-slate-50 text-slate-300 border-slate-200 cursor-not-allowed' : 'bg-white text-slate-500 border-slate-200 hover:border-blue-300'
                    }`}>
                      <input
                        type="checkbox"
                        className="hidden"
                        disabled={!selected.some(s => s.id === app.id) && selected.length >= 3}
                        checked={selected.some(s => s.id === app.id)}
                        onChange={() => toggleSelect(app)}
                      />
                      <span>{selected.some(s => s.id === app.id) ? '✓' : '+'}</span>
                    </label>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Candidate Detail Modal */}
      {detailApplicant && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-fade-in">
          <div className="bg-white rounded-lg border border-slate-200 shadow-xl w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden">
            {/* Modal Header */}
            <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex-shrink-0">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-md bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-800 font-mono font-bold text-base shadow-xs">
                    {detailApplicant.fullName.charAt(0)}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-primary-navy bg-soft-blue border border-accent-border px-1.5 py-0.2 rounded">
                        Detail Evaluasi AI
                      </span>
                    </div>
                    <h3 className="text-base font-bold text-slate-900 font-heading mt-0.5">{detailApplicant.fullName}</h3>
                    <p className="text-xs text-slate-500 font-mono">{detailApplicant.email} &bull; {detailApplicant.jobTitle}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => printCandidateReport(detailApplicant)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-slate-50 text-slate-700 rounded-md text-xs font-medium border border-slate-200 transition-colors"
                  >
                    <Printer className="w-3.5 h-3.5 text-slate-500" /> Cetak
                  </button>
                  <button
                    onClick={() => setDetailApplicant(null)}
                    className="p-1.5 text-slate-400 hover:text-slate-700 rounded-md hover:bg-slate-100 transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>

            {/* Modal Content */}
            <div className="p-6 overflow-y-auto flex-1 bg-white space-y-6">
              {/* Score Highlight Box */}
              <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg border border-slate-200">
                <div>
                  <p className="text-[10px] font-mono font-bold text-slate-500 uppercase tracking-wider">Skor Akhir Wawancara AI</p>
                  <div className="flex items-center gap-3 mt-1">
                    <span className={`text-2xl font-mono font-bold ${
                      (detailApplicant.interviewScore ?? 0) >= 75 ? 'text-emerald-700' : (detailApplicant.interviewScore ?? 0) >= 60 ? 'text-amber-700' : 'text-rose-700'
                    }`}>
                      {detailApplicant.interviewScore}%
                    </span>
                    <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded text-xs font-mono font-semibold border ${getRecommendation(detailApplicant.interviewResult).cls}`}>
                      <Brain className="w-3.5 h-3.5" /> {getRecommendation(detailApplicant.interviewResult).label}
                    </span>
                  </div>
                  {detailApplicant.passingScore != null && (
                    <p className="text-xs text-slate-500 mt-2">
                      Nilai minimum kelulusan: <span className="font-bold">{detailApplicant.passingScore}%</span> •{' '}
                      {(detailApplicant.interviewScore ?? 0) >= detailApplicant.passingScore ? (
                        <span className="font-bold text-emerald-600">Lolos Passing Grade</span>
                      ) : (
                        <span className="font-bold text-rose-600">Di Bawah Passing Grade</span>
                      )}
                    </p>
                  )}
                </div>
                {detailApplicant.screeningScore !== null && (
                  <div className="text-right">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Skor CV Screening</p>
                    <p className="text-2xl font-extrabold text-blue-600 mt-1">{detailApplicant.screeningScore}%</p>
                  </div>
                )}
              </div>

              {/* Assessment Summary */}
              {detailApplicant.interviewResult && (
                <div className="bg-white p-5 rounded-lg border border-slate-200 shadow-sm">
                  <p className="text-[10px] font-mono font-bold text-slate-500 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                    <FileText className="w-3.5 h-3.5 text-primary-navy" /> Rangkuman Evaluasi AI
                  </p>
                  <p className="text-xs text-slate-700 leading-relaxed whitespace-pre-line">{detailApplicant.interviewResult}</p>
                </div>
              )}

              {/* Radar Chart & Skill Matrix */}
              {detailApplicant.skillMatrix && detailApplicant.skillMatrix.length > 0 && (
                <div className="bg-white p-5 rounded-lg border border-slate-200 shadow-sm space-y-4">
                  <p className="text-[10px] font-mono font-bold text-slate-500 uppercase tracking-wider">Profil Kompetensi Kandidat</p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
                    <div className="flex flex-col items-center">
                      <RadarChart
                        axes={detailApplicant.skillMatrix.map(s => ({ label: s.skill, value: s.score }))}
                        size={260}
                      />
                    </div>
                    <div className="space-y-2.5">
                      {detailApplicant.skillMatrix.map((s, idx) => (
                        <div key={idx} className="bg-slate-50 p-2.5 rounded-md border border-slate-200">
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-xs font-semibold text-slate-800">{s.skill}</span>
                            <span className={`text-[10px] font-mono font-bold ${s.score >= 75 ? 'text-emerald-700' : s.score >= 60 ? 'text-amber-700' : 'text-rose-700'}`}>
                              {s.score}%
                            </span>
                          </div>
                          <div className="h-1.5 w-full rounded bg-slate-200 overflow-hidden mb-1">
                            <div className={`h-full rounded ${scoreColor(s.score)}`} style={{ width: `${s.score}%` }} />
                          </div>
                          <p className="text-[10px] text-slate-500 line-clamp-2 leading-relaxed">{s.notes}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Phase Scores */}
              {detailApplicant.phases && detailApplicant.phases.length > 0 && (
                <div className="bg-white p-5 rounded-lg border border-slate-200 shadow-sm space-y-3">
                  <p className="text-[10px] font-mono font-bold text-slate-500 uppercase tracking-wider">Evaluasi per Fase &amp; Pertanyaan</p>
                  <div className="space-y-2.5">
                    {detailApplicant.phases.map((p, pi) => (
                      <div key={pi} className="bg-slate-50 rounded-md p-3 border border-slate-200">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-xs font-semibold text-slate-800">Fase {pi + 1}: {p.name}</span>
                          <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded ${
                            p.score >= 75 ? 'bg-emerald-100 text-emerald-800' : p.score >= 60 ? 'bg-amber-100 text-amber-800' : 'bg-rose-100 text-rose-800'
                          }`}>
                            {p.score}%
                          </span>
                        </div>
                        {Array.isArray(p.questions) && p.questions.length > 0 && (
                          <div className="space-y-1.5 pt-1 border-t border-slate-200/60">
                            {p.questions.map((q, qi) => (
                              <div key={qi} className="flex items-start gap-2 text-xs">
                                <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-white border border-slate-200 text-slate-700 flex-shrink-0">
                                  {q.score}
                                </span>
                                <div className="flex-1">
                                  <p className="font-semibold text-slate-700">{q.question}</p>
                                  {q.note && <p className="text-[10px] text-slate-500 mt-0.5">{q.note}</p>}
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Collapsible Transcript */}
              {detailApplicant.interviewTranscript && (
                <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
                  <button
                    onClick={() => setShowTranscript(!showTranscript)}
                    className="w-full px-5 py-4 flex items-center justify-between text-left hover:bg-slate-50 transition-colors"
                  >
                    <span className="text-xs font-bold text-slate-700">Transkrip Lengkap Percakapan Wawancara</span>
                    {showTranscript ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
                  </button>
                  {showTranscript && (
                    <div className="p-5 border-t border-slate-100 max-h-60 overflow-y-auto text-xs font-mono text-slate-600 whitespace-pre-line bg-slate-50/50 leading-relaxed">
                      {detailApplicant.interviewTranscript}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Side-by-Side Comparison Modal */}
      {showCompare && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-fade-in">
          <div className="bg-white rounded-lg border border-slate-200 shadow-xl w-full max-w-5xl max-h-[90vh] flex flex-col overflow-hidden">
            <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex-shrink-0">
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-primary-navy bg-soft-blue border border-accent-border px-1.5 py-0.2 rounded">
                      Komparasi Multi-Kandidat
                    </span>
                  </div>
                  <h3 className="text-base font-bold text-slate-900 font-heading mt-0.5">
                    Perbandingan Matriks Komparatif ({selected.length} Kandidat Terpilih)
                  </h3>
                </div>
                <button
                  onClick={() => setShowCompare(false)}
                  className="p-1.5 text-slate-400 hover:text-slate-700 rounded-md hover:bg-slate-100 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="p-6 overflow-y-auto flex-1 bg-white space-y-6">
              {/* Radar charts grid */}
              <div className={`grid gap-6 ${selected.length === 3 ? 'grid-cols-1 md:grid-cols-3' : 'grid-cols-1 md:grid-cols-2'}`}>
                {selected.map((app) => {
                  const rec = getRecommendation(app.interviewResult);
                  return (
                    <div key={app.id} className="bg-slate-50/70 rounded-lg border border-slate-200 p-5 text-center flex flex-col items-center">
                      <div className="w-10 h-10 rounded-md bg-white border border-slate-200 flex items-center justify-center text-slate-800 font-mono font-bold text-base shadow-xs mb-2">
                        {app.fullName.charAt(0)}
                      </div>
                      <p className="text-sm font-bold text-slate-900 truncate max-w-[200px]">{app.fullName}</p>
                      <p className="text-xs text-slate-500 font-mono truncate mb-2">{app.jobTitle}</p>
                      <p className={`text-2xl font-mono font-bold mb-2 ${
                        (app.interviewScore ?? 0) >= 75 ? 'text-emerald-700' : (app.interviewScore ?? 0) >= 60 ? 'text-amber-700' : 'text-rose-700'
                      }`}>
                        {app.interviewScore}<span className="text-xs text-slate-400 font-normal">/100</span>
                      </p>
                      <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded text-[10px] font-mono font-semibold border mb-4 ${rec.cls}`}>
                        <Brain className="w-3 h-3" /> {rec.label}
                      </span>
                      {app.skillMatrix && (
                        <RadarChart axes={app.skillMatrix.map(s => ({ label: s.skill, value: s.score }))} size={230} />
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Matrix comparison table */}
              {(() => {
                const dims = selected[0]?.skillMatrix?.map(s => s.skill) || [];
                return (
                  <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-x-auto">
                    <div className="px-5 py-3.5 bg-slate-50 border-b border-slate-200 flex items-center gap-2">
                      <BarChart3 className="w-4 h-4 text-primary-navy" />
                      <h4 className="text-xs font-mono font-bold text-slate-700 uppercase tracking-wider">Perbandingan Skor Kompetensi &amp; Syarat</h4>
                    </div>
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-slate-100">
                          <th className="text-left px-5 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Dimensi</th>
                          {selected.map(app => (
                            <th key={app.id} className="px-5 py-3 text-center text-xs font-bold text-slate-700">{app.fullName}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {dims.map((dim, di) => (
                          <tr key={di} className="border-b border-slate-50">
                            <td className="px-5 py-3 text-xs font-bold text-slate-600">{dim}</td>
                            {selected.map(app => {
                              const skill = app.skillMatrix?.find(s => s.skill === dim);
                              return (
                                <td key={app.id} className="px-5 py-3">
                                  <div className="flex items-center justify-center gap-2">
                                    <div className="w-20 h-1.5 rounded-full bg-slate-100 overflow-hidden">
                                      <div className={`h-full rounded-full ${scoreColor(skill?.score ?? null)}`} style={{ width: `${skill?.score ?? 0}%` }} />
                                    </div>
                                    <span className={`text-[10px] font-extrabold w-8 text-center ${(skill?.score ?? 0) >= 70 ? 'text-emerald-600' : (skill?.score ?? 0) >= 50 ? 'text-amber-600' : 'text-rose-600'}`}>
                                      {skill?.score ?? '-'}
                                    </span>
                                  </div>
                                </td>
                              );
                            })}
                          </tr>
                        ))}
                        <tr>
                          <td className="px-5 py-3 text-xs font-bold text-slate-600">Skor CV Screening</td>
                          {selected.map(app => (
                            <td key={app.id} className="px-5 py-3 text-center">
                              <span className="inline-flex items-center gap-1 text-xs font-extrabold text-blue-700">
                                <Star className="w-3 h-3" /> {app.screeningScore !== null ? `${app.screeningScore}%` : '-'}
                              </span>
                            </td>
                          ))}
                        </tr>
                        <tr>
                          <td className="px-5 py-3 text-xs font-bold text-slate-600">Threshold Kelulusan</td>
                          {selected.map(app => {
                            const isPassed = app.passingScore != null && app.interviewScore != null
                              ? app.interviewScore >= app.passingScore
                              : null;
                            return (
                              <td key={app.id} className="px-5 py-3 text-center">
                                {isPassed !== null ? (
                                  <span className={`text-xs font-bold ${isPassed ? 'text-emerald-600' : 'text-rose-600'}`}>
                                    {isPassed ? `Lolos (Min. ${app.passingScore}%)` : `Di Bawah Min. (${app.passingScore}%)`}
                                  </span>
                                ) : '-'}
                              </td>
                            );
                          })}
                        </tr>
                      </tbody>
                    </table>
                  </div>
                );
              })()}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
