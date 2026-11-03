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
import { Button, Badge, Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from '../ui';
import {
  CANDIDATE_DIRECTORY,
  calculateCompositeScore,
  formatToday
} from '../../services/asesorScoreService';
import { getPortalToken } from '../../services/portalAuthService';

export default function AsesorRekapProgram() {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [filterRec, setFilterRec] = useState<string>('all');

  const [savedScores, setSavedScores] = useState<Record<string, any>>({});

  useEffect(() => {
    let cancelled = false;
    const loadScores = async () => {
      const token = getPortalToken();
      if (!token) return;
      try {
        const response = await axios.get('/api/asesor/scores', {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (cancelled) return;
        const map: Record<string, any> = {};
        for (const score of response.data.data || []) {
          map[score.candidateCode] = score;
        }
        setSavedScores(map);
      } catch {
        if (!cancelled) setSavedScores({});
      }
    };
    void loadScores();
    return () => {
      cancelled = true;
    };
  }, []);

  const candidates = CANDIDATE_DIRECTORY.map((c) => {
    const saved = savedScores[c.code];
    return {
      id: c.code,
      name: c.name,
      pt: c.pt,
      program: c.program,
      catScore: c.catScore,
      interviewScore: saved ? saved.interviewScore : null,
      compositeScore: saved ? saved.compositeScore : null,
      recommendation: saved ? saved.recommendation : null,
      assessor: saved ? saved.assessor?.name || 'Asesor' : null,
      verifiedDate: saved?.signedAt ? new Date(saved.signedAt).toLocaleDateString('id-ID') : null,
      isSaved: Boolean(saved)
    };
  });

  const filtered = candidates.filter((c) => {
    const matchSearch =
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.id.toLowerCase().includes(search.toLowerCase()) ||
      c.pt.toLowerCase().includes(search.toLowerCase());
    const matchRec = filterRec === 'all' || c.recommendation === filterRec;
    return matchSearch && matchRec;
  });

  const handleExportCsv = () => {
    const header = [
      'ID KANDIDAT',
      'NAMA',
      'PT MITRA',
      'PROGRAM',
      'SKOR CAT (40%)',
      'SKOR INTERVIEW (60%)',
      'SKOR KOMPOSIT',
      'REKOMENDASI',
      'ASESOR',
      'TGL VERIFIKASI'
    ];
    const escape = (v: string | number) => `"${String(v).replace(/"/g, '""')}"`;
    const rows = filtered.map((c) =>
      [
        c.id,
        c.name,
        c.pt,
        c.program,
        c.catScore,
        c.interviewScore,
        c.compositeScore,
        c.recommendation,
        c.assessor,
        c.verifiedDate
      ]
        .map(escape)
        .join(',')
    );
    const csv = [header.map(escape).join(','), ...rows].join('\r\n');
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `rekap-penilaian-asesor-${formatToday().replace(/\s/g, '-')}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <AsesorLayout activeTab="rekap">
      <div className="max-w-7xl mx-auto px-4 sm:px-8 py-8 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold font-heading text-ink tracking-tight">
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
              className="text-xs sm:text-sm py-2 px-3.5 rounded-xl font-bold flex items-center gap-2 cursor-pointer shadow-2xs"
            >
              <Download className="w-4 h-4 text-primary-navy" />
              <span>Ekspor Rekap (CSV)</span>
            </Button>
          </div>
        </div>

        {/* Filter Bar */}
        <div className="bg-white rounded-3xl border border-slate-200/90 p-4 sm:p-5 shadow-xs flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-2 flex-1 max-w-md">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cari kandidat, ID, atau PT..."
              className="w-full px-4 py-2.5 text-xs sm:text-sm rounded-xl border border-slate-200 focus:border-primary-navy outline-none shadow-2xs"
            />
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

        {/* Table Results */}
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>KANDIDAT</TableHead>
              <TableHead>PT MITRA</TableHead>
              <TableHead>SKOR CAT (40%)</TableHead>
              <TableHead>SKOR INTERVIEW (60%)</TableHead>
              <TableHead>SKOR KOMPOSIT</TableHead>
              <TableHead>REKOMENDASI</TableHead>
              <TableHead>TGL VERIFIKASI</TableHead>
              <TableHead className="text-right">AKSI</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((c) => (
              <TableRow key={c.id}>
                <TableCell>
                  <div>
                    <p className="font-bold text-ink">{c.name}</p>
                    <p className="font-mono text-[11px] text-muted-slate">
                      {c.id}
                      {c.isSaved ? ' • dinilai asesor' : ' • belum dinilai'}
                    </p>
                  </div>
                </TableCell>
                <TableCell className="text-slate-600 font-sans">
                  {c.pt}
                  <span className="block text-[11px] text-muted-slate">{c.program}</span>
                </TableCell>
                <TableCell className="font-mono font-bold text-slate-700">{c.catScore}</TableCell>
                <TableCell className="font-mono font-bold text-slate-700">{c.interviewScore ?? '—'}</TableCell>
                <TableCell className="font-mono text-base font-extrabold text-primary-navy">
                  {c.compositeScore ?? '—'}
                </TableCell>
                <TableCell>
                  {c.recommendation ? (
                    <Badge
                      variant={
                        c.recommendation === 'LANJUT' ? 'success' :
                        c.recommendation === 'DIPERTIMBANGKAN' ? 'warning' : 'danger'
                      }
                      format="soft"
                      hasDot
                    >
                      {c.recommendation === 'LANJUT' ? 'Lulus (Lanjut)' :
                       c.recommendation === 'DIPERTIMBANGKAN' ? 'Dipertimbangkan' : 'Tidak Lulus'}
                    </Badge>
                  ) : (
                    <span className="text-xs text-slate-400">Belum dinilai</span>
                  )}
                </TableCell>
                <TableCell className="font-mono text-xs text-slate-500">{c.verifiedDate ?? '—'}</TableCell>
                <TableCell className="text-right">
                  <Button
                    variant="outline"
                    size="xs"
                    onClick={() => navigate(`/asesor/scoring/${c.id}`)}
                  >
                    Detail
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </AsesorLayout>
  );
}
