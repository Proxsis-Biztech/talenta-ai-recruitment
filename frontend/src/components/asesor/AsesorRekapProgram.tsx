import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import {
  FileSpreadsheet,
  Download,
  Search,
  Filter,
  CheckCircle2,
  XCircle,
  HelpCircle,
  Award,
  ChevronRight
} from 'lucide-react';
import { AsesorLayout } from './AsesorLayout';
import { downloadCsvFile } from '../../utils/csvExport';
import { Button, Badge, Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from '../ui';
import { calculateCompositeScore, formatToday } from '../../services/asesorScoreService';
import { fetchAssessorCandidates, type AssessorCandidate } from '../../services/assessorService';
import { resolveCandidateReviewStage } from '../../services/asesorReviewState';
import { getPortalToken } from '../../services/portalAuthService';

export default function AsesorRekapProgram() {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [filterRec, setFilterRec] = useState<string>('all');
  const [accountFilter, setAccountFilter] = useState<'all' | 'real' | 'test'>('all');

  const [savedScores, setSavedScores] = useState<Record<string, any>>({});
  const [calibrationByCode, setCalibrationByCode] = useState<Record<string, any>>({});
  const [candidateList, setCandidateList] = useState<AssessorCandidate[]>([]);

  useEffect(() => {
    let cancelled = false;
    const loadData = async () => {
      const token = getPortalToken();
      const [candidateResult, scoreResult, calResult] = await Promise.allSettled([
        fetchAssessorCandidates(),
        token
          ? axios.get('/api/asesor/scores', {
              headers: { Authorization: `Bearer ${token}` }
            })
          : Promise.resolve({ data: { data: [] } }),
        token
          ? axios.get('/api/asesor/calibration', {
              headers: { Authorization: `Bearer ${token}` }
            })
          : Promise.resolve({ data: { data: [] } })
      ]);
      if (cancelled) return;
      if (candidateResult.status === 'fulfilled') {
        setCandidateList(candidateResult.value);
      } else {
        setCandidateList([]);
      }
      if (scoreResult.status === 'fulfilled') {
        const map: Record<string, any> = {};
        for (const score of scoreResult.value.data?.data || []) {
          map[score.candidateCode] = score;
        }
        setSavedScores(map);
      } else {
        setSavedScores({});
      }
      if (calResult.status === 'fulfilled') {
        const calMap: Record<string, any> = {};
        for (const row of calResult.value.data?.data || []) {
          calMap[row.candidateCode] = row;
        }
        setCalibrationByCode(calMap);
      } else {
        setCalibrationByCode({});
      }
    };
    void loadData();
    return () => {
      cancelled = true;
    };
  }, []);

  const candidates = candidateList.map((c) => {
    const saved = savedScores[c.candidateCode || c.code] || savedScores[c.code];
    const cal = calibrationByCode[c.candidateCode || c.code] || calibrationByCode[c.code];
    const calStatus = cal?.metrics?.status || null;
    const stageMeta = resolveCandidateReviewStage(c);
    const hasAssessorReview =
      Boolean(saved) ||
      c.lhaStatus === 'signed' ||
      ['DIREVIEW', 'FINALISASI', 'TERBIT'].includes(stageMeta.stage);

    const interviewScore = saved?.interviewScore ?? (hasAssessorReview ? c.interviewScore : null);
    const compositeScore = hasAssessorReview
      ? saved?.compositeScore ??
        c.compositeScore ??
        (c.catScore != null && interviewScore != null
          ? calculateCompositeScore(c.catScore, interviewScore)
          : null)
      : null;
    const recommendation = hasAssessorReview
      ? saved?.recommendation ?? c.recommendation ?? null
      : null;

    return {
      id: c.code,
      name: c.name,
      pt: c.company,
      program: c.program,
      isTestAccount: Boolean(c.isTestAccount),
      catScore: c.catScore,
      interviewScore,
      compositeScore,
      recommendation,
      calibrationStatus: calStatus,
      secondaryInterviewScore: cal?.secondary?.interviewScore ?? null,
      assessor: saved?.assessor?.name || c.assessorName || '-',
      verifiedDate: saved?.signedAt
        ? new Date(saved.signedAt).toLocaleDateString('id-ID')
        : c.signedAt
          ? new Date(c.signedAt).toLocaleDateString('id-ID')
          : null,
      statusLabel: stageMeta.label,
      isSaved: Boolean(saved) || c.lhaStatus === 'signed' || Boolean(recommendation)
    };
  });

  const filtered = candidates.filter((c) => {
    const matchSearch =
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.id.toLowerCase().includes(search.toLowerCase()) ||
      c.pt.toLowerCase().includes(search.toLowerCase());
    const matchRec = filterRec === 'all' || c.recommendation === filterRec;
    const matchAccount =
      accountFilter === 'all' ||
      (accountFilter === 'real' && !c.isTestAccount) ||
      (accountFilter === 'test' && c.isTestAccount);
    return matchSearch && matchRec && matchAccount;
  });

  const handleExportCsv = () => {
    const header = [
      'ID KANDIDAT',
      'NAMA',
      'PT MITRA',
      'PROGRAM',
      'SKOR CAT (40%)',
      'SKOR INTERVIEW (60%)',
      'PENILAI KE-2',
      'STATUS KALIBRASI',
      'SKOR KOMPOSIT',
      'REKOMENDASI',
      'ASESOR',
      'TGL VERIFIKASI'
    ];
    const escape = (v: string | number | null | undefined) => {
      const text = v == null || v === '' ? '-' : String(v);
      return `"${text.replace(/"/g, '""')}"`;
    };
    const rows = filtered.map((c) =>
      [
        c.id,
        c.name,
        c.pt,
        c.program,
        c.catScore,
        c.interviewScore,
        c.secondaryInterviewScore,
        c.calibrationStatus || 'tunggal',
        c.compositeScore,
        c.recommendation,
        c.assessor,
        c.verifiedDate
      ]
        .map(escape)
        .join(',')
    );
    const csv = [header.map(escape).join(','), ...rows].join('\r\n');
    downloadCsvFile(csv, `rekap-penilaian-asesor-${formatToday().replace(/\s/g, '-')}.csv`);
  };

  return (
    <AsesorLayout activeTab="rekap">
      <div className="max-w-7xl mx-auto px-4 sm:px-8 py-7 sm:py-8 space-y-6 antialiased">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold font-heading text-ink tracking-tight">
              Rekapitulasi Penilaian Program Asesmen
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 mt-1">
              Matriks hasil pengujian seluruh kandidat per program asesmen terstandar.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              onClick={handleExportCsv}
              className="text-xs sm:text-sm py-2 px-3.5 rounded-xl font-semibold flex items-center gap-2 cursor-pointer shadow-2xs"
            >
              <Download className="w-4 h-4 text-primary-navy" />
              <span>Ekspor Rekap (CSV)</span>
            </Button>
          </div>
        </div>

        {/* Filter Bar */}
        <div className="bg-white rounded-2xl border border-slate-200/90 p-4 sm:p-5 shadow-xs flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-2 flex-1 max-w-md">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cari kandidat, ID, atau PT..."
              className="w-full px-4 py-2.5 text-xs sm:text-sm rounded-xl border border-slate-200 focus:border-primary-navy outline-none shadow-2xs"
            />
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="inline-flex rounded-lg border border-slate-200 bg-slate-50 p-0.5 text-[11px] font-semibold">
              {(['all', 'real', 'test'] as const).map((key) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setAccountFilter(key)}
                  className={`px-2.5 py-1 rounded-md transition-colors cursor-pointer ${
                    accountFilter === key
                      ? 'bg-white text-primary-navy shadow-2xs'
                      : 'text-slate-500 hover:text-ink'
                  }`}
                >
                  {key === 'all' ? 'Semua' : key === 'real' ? 'Peserta Asli' : 'Akun Uji'}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-muted-slate font-bold mr-1">Rekomendasi:</span>
              {['all', 'LANJUT', 'DIPERTIMBANGKAN', 'TIDAK'].map((rec) => (
                <button
                  key={rec}
                  onClick={() => setFilterRec(rec)}
                  className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                    filterRec === rec
                      ? 'bg-primary-navy text-white shadow-xs'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {rec === 'all' ? 'Semua' : rec}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Table Results */}
        <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>KANDIDAT</TableHead>
                  <TableHead>PT MITRA</TableHead>
                  <TableHead className="text-right">CAT (40%)</TableHead>
                  <TableHead className="text-right">INTERVIEW (60%)</TableHead>
                  <TableHead className="text-right">KOMPOSIT</TableHead>
                  <TableHead>KALIBRASI</TableHead>
                  <TableHead>REKOMENDASI</TableHead>
                  <TableHead>TGL VERIFIKASI</TableHead>
                  <TableHead className="text-right">AKSI</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center py-10 text-xs text-slate-500">
                      Tidak ada data rekap kandidat pada filter ini.
                    </TableCell>
                  </TableRow>
                ) : (
                  filtered.map((c) => (
                    <TableRow key={c.id}>
                      <TableCell>
                        <div>
                          <p className="font-semibold text-sm text-ink">{c.name}</p>
                          <p className="font-mono text-[11px] text-muted-slate">
                            {c.id} • {c.statusLabel}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell className="text-slate-600 font-sans text-xs">
                        <span className="font-medium text-ink">{c.pt}</span>
                        <span className="block text-[11px] text-muted-slate">{c.program}</span>
                      </TableCell>
                      <TableCell className="text-right font-sans font-semibold tabular-nums text-xs text-slate-700">
                        {c.catScore ?? '—'}
                      </TableCell>
                      <TableCell className="text-right font-sans font-semibold tabular-nums text-xs text-slate-700">
                        {c.interviewScore ?? '—'}
                      </TableCell>
                      <TableCell className="text-right font-heading text-sm font-bold tabular-nums text-primary-navy">
                        {c.compositeScore ?? '—'}
                      </TableCell>
                      <TableCell>
                        {c.calibrationStatus === 'perlu_kalibrasi' ? (
                          <Badge variant="danger" format="soft">
                            Perlu Kalibrasi ({c.secondaryInterviewScore ?? '-'})
                          </Badge>
                        ) : c.calibrationStatus === 'selaras' ? (
                          <Badge variant="success" format="soft">
                            Selaras ({c.secondaryInterviewScore ?? '-'})
                          </Badge>
                        ) : (
                          <span className="text-[11px] text-slate-400">Penilai Tunggal</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {c.recommendation && c.recommendation !== 'BELUM DINILAI' ? (
                          <Badge
                            variant={
                              c.recommendation === 'LANJUT'
                                ? 'success'
                                : c.recommendation === 'DIPERTIMBANGKAN'
                                  ? 'warning'
                                  : 'danger'
                            }
                            format="soft"
                            hasDot
                          >
                            {c.recommendation === 'LANJUT'
                              ? 'Lulus (Lanjut)'
                              : c.recommendation === 'DIPERTIMBANGKAN'
                                ? 'Dipertimbangkan'
                                : 'Tidak Lulus'}
                          </Badge>
                        ) : (
                          <span className="text-xs text-slate-400">Belum dinilai</span>
                        )}
                      </TableCell>
                      <TableCell className="font-sans tabular-nums text-xs text-slate-500">
                        {c.verifiedDate ?? '—'}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="outline"
                          size="xs"
                          onClick={() => navigate(`/asesor/scoring/${c.id}`)}
                          className="cursor-pointer"
                        >
                          Detail
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      </div>
    </AsesorLayout>
  );
}
