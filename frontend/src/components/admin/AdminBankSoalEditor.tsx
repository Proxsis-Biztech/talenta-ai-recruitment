import React, { useState, useEffect } from 'react';
import {
  CheckSquare,
  Plus,
  Search,
  Filter,
  BarChart3,
  Edit,
  Trash2,
  Eye,
  Save,
  Check,
  Sparkles,
  ArrowRight,
  TrendingUp,
  FileText,
  AlertCircle,
  CheckCircle2,
  ShieldAlert,
  SlidersHorizontal,
  ChevronLeft
} from 'lucide-react';
import {
  Button,
  Badge,
  Card,
  CardContent,
  Input,
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
  Modal
} from '../ui';

export interface BankQuestion {
  id: string;
  type: 'Pilihan Ganda' | 'Multi-Select' | 'Isian Singkat' | 'Esai' | 'Matching';
  text: string;
  competency: string;
  difficulty: 'Mudah' | 'Sedang' | 'Sulit';
  status: 'Published' | 'Review' | 'Draft' | 'Retired';
  pValue: number; // 0.0 to 1.0 item difficulty index
  distractorStats: { label: string; pct: number }[];
  options: { key: string; text: string; isCorrect: boolean }[];
  explanation: string;
}

export interface FactSheetItem {
  id: string;
  category: string;
  fact: string;
  priority: 'Priority 1 (Critical)' | 'Priority 2 (Important)' | 'Priority 3 (Secondary)';
  weight: number;
}

const QUESTIONS_STORAGE_KEY = 'talenta_bank_soal_questions_v1';
const FACTSHEET_STORAGE_KEY = 'talenta_bank_soal_factsheet_v1';
const PRESET_STORAGE_KEY = 'talenta_proctoring_preset_v1';

const INITIAL_FACT_SHEET: FactSheetItem[] = [
  {
    id: 'FS-01',
    category: 'Operational SLA',
    fact: 'Penurunan On-Time Performance (OTP) dari 99.2% menjadi 97.8% pada jam sibuk perbankan/transportasi.',
    priority: 'Priority 1 (Critical)',
    weight: 5
  },
  {
    id: 'FS-02',
    category: 'Customer Satisfaction',
    fact: 'Penurunan Customer Satisfaction Index (CSI) dari 89 menjadi 83 dalam kuartal terakhir.',
    priority: 'Priority 1 (Critical)',
    weight: 5
  },
  {
    id: 'FS-03',
    category: 'Financial / OPEX',
    fact: 'Kenaikan tarif dan beban operasional listrik cabang sebesar +14% melampaui pagu anggaran tahunan.',
    priority: 'Priority 2 (Important)',
    weight: 4
  },
  {
    id: 'FS-04',
    category: 'Vendor Management',
    fact: 'Keterlambatan response time maintenance vendor pihak ketiga pada mesin CRM/ATM di 4 titik transit.',
    priority: 'Priority 2 (Important)',
    weight: 3
  },
  {
    id: 'FS-05',
    category: 'Staffing & Resourcing',
    fact: 'Beban antrean teller saat peak hour pagi (08.00-10.30) memicu keluhan nasabah di lobi utama.',
    priority: 'Priority 3 (Secondary)',
    weight: 3
  }
];

const INITIAL_QUESTIONS: BankQuestion[] = [
  {
    id: 'SOAL-401',
    type: 'Pilihan Ganda',
    text: 'Strategi caching manakah yang paling efektif mencegah Cache Stampede pada sistem microservices berintensitas baca tinggi?',
    competency: 'System Architecture',
    difficulty: 'Sedang',
    status: 'Published',
    pValue: 0.68,
    distractorStats: [
      { label: 'A (Kunci)', pct: 68 },
      { label: 'B', pct: 14 },
      { label: 'C', pct: 8 },
      { label: 'D', pct: 10 }
    ],
    options: [
      { key: 'A', text: 'Cache-Aside dengan Randomized TTL (Jitter) dan Mutex Locking', isCorrect: true },
      { key: 'B', text: 'Write-Through Cache dengan TTL statis', isCorrect: false },
      { key: 'C', text: 'Direct Database Bypassing tanpa fallback', isCorrect: false },
      { key: 'D', text: 'Write-Behind Caching tanpa invalidation queue', isCorrect: false }
    ],
    explanation:
      'Penerapan jitter mencegah expire simultan dari cache keys sehingga query database tidak melonjak drastis.'
  },
  {
    id: 'SOAL-402',
    type: 'Multi-Select',
    text: 'Pilihlah DUA kondisi di mana penggunaan B-Tree Composite Index pada PostgreSQL tidak dioptimalkan oleh Query Planner:',
    competency: 'Database Optimization',
    difficulty: 'Sulit',
    status: 'Published',
    pValue: 0.42,
    distractorStats: [
      { label: 'A (Kunci)', pct: 42 },
      { label: 'B (Kunci)', pct: 38 },
      { label: 'C', pct: 12 },
      { label: 'D', pct: 8 }
    ],
    options: [
      { key: 'A', text: 'Klausa WHERE tidak menyertakan leading column', isCorrect: true },
      {
        key: 'B',
        text: 'Query memanggil function transformation seperti LOWER() tanpa functional index',
        isCorrect: true
      },
      { key: 'C', text: 'Query melakukan operasi JOIN antar primary key', isCorrect: false },
      { key: 'D', text: 'Tabel memiliki baris di atas 10 juta baris', isCorrect: false }
    ],
    explanation: 'Leading column mutlak diperlukan dalam traverse pohon B-Tree multikolom.'
  },
  {
    id: 'SOAL-403',
    type: 'Isian Singkat',
    text: 'Sebutkan kode status HTTP standar untuk Bad Gateway dari upstream server:',
    competency: 'Network Protocols',
    difficulty: 'Mudah',
    status: 'Review',
    pValue: 0.89,
    distractorStats: [
      { label: 'Benar (502)', pct: 89 },
      { label: 'Salah', pct: 11 }
    ],
    options: [],
    explanation: 'HTTP 502 Bad Gateway secara spesifik merujuk pada respons invalid dari upstream gateway/proxy.'
  },
  {
    id: 'SOAL-404',
    type: 'Esai',
    text: '[Studi Kasus PT Anjak] Jelaskan rumusan rekomendasi tindakan 30-hari pertama Anda untuk memulihkan penurunan On-Time Performance (OTP) 99.2% menjadi 97.8% tanpa menambah beban OPEX listrik.',
    competency: 'In-Basket Problem Solving',
    difficulty: 'Sulit',
    status: 'Published',
    pValue: 0.55,
    distractorStats: [
      { label: 'Grade A (Skor 5)', pct: 25 },
      { label: 'Grade B (Skor 4)', pct: 45 },
      { label: 'Grade C (Skor 2-3)', pct: 30 }
    ],
    options: [],
    explanation: 'Kandidat harus menautkan fakta penurunan OTP dengan keterlambatan vendor maintenance mesin CRM.'
  }
];

export function AdminBankSoalEditor() {
  const [viewMode, setViewMode] = useState<'table' | 'editor' | 'stats' | 'factsheet'>('table');
  const [filterType, setFilterType] = useState('all');
  const [filterDiff, setFilterDiff] = useState('all');
  const [searchKeyword, setSearchKeyword] = useState('');

  // Preset Proctoring
  const [selectedPreset, setSelectedPreset] = useState<'Ringan' | 'Sedang' | 'Ketat'>(() => {
    return (localStorage.getItem(PRESET_STORAGE_KEY) as any) || 'Ketat';
  });

  // Fact Sheet Items state
  const [factSheetItems, setFactSheetItems] = useState<FactSheetItem[]>(() => {
    try {
      const saved = localStorage.getItem(FACTSHEET_STORAGE_KEY);
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.warn('Failed to parse saved factsheet:', e);
    }
    return INITIAL_FACT_SHEET;
  });

  // Questions state
  const [questions, setQuestions] = useState<BankQuestion[]>(() => {
    try {
      const saved = localStorage.getItem(QUESTIONS_STORAGE_KEY);
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.warn('Failed to parse saved questions:', e);
    }
    return INITIAL_QUESTIONS;
  });

  const [activeQuestion, setActiveQuestion] = useState<BankQuestion>(questions[0]);
  const [isEditingExisting, setIsEditingExisting] = useState(true);

  // Success Notification banner
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Modal Fact Sheet state
  const [isFactModalOpen, setIsFactModalOpen] = useState(false);
  const [factCategory, setFactCategory] = useState('Operational SLA');
  const [factText, setFactText] = useState('');
  const [factPriority, setFactPriority] = useState<FactSheetItem['priority']>('Priority 1 (Critical)');
  const [factWeight, setFactWeight] = useState<number>(5);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const handleEdit = (q: BankQuestion) => {
    setActiveQuestion(JSON.parse(JSON.stringify(q)));
    setIsEditingExisting(true);
    setViewMode('editor');
  };

  const handleCreateNew = () => {
    const newQ: BankQuestion = {
      id: `SOAL-${Math.floor(400 + Math.random() * 500)}`,
      type: 'Pilihan Ganda',
      text: '',
      competency: 'System Architecture',
      difficulty: 'Sedang',
      status: 'Published',
      pValue: 0.5,
      distractorStats: [
        { label: 'A (Kunci)', pct: 50 },
        { label: 'B', pct: 20 },
        { label: 'C', pct: 15 },
        { label: 'D', pct: 15 }
      ],
      options: [
        { key: 'A', text: 'Opsi Jawaban Benar (Kunci)', isCorrect: true },
        { key: 'B', text: 'Distraktor 1', isCorrect: false },
        { key: 'C', text: 'Distraktor 2', isCorrect: false },
        { key: 'D', text: 'Distraktor 3', isCorrect: false }
      ],
      explanation: 'Pembahasan kunci jawaban terstandar.'
    };
    setActiveQuestion(newQ);
    setIsEditingExisting(false);
    setViewMode('editor');
  };

  const handleStats = (q: BankQuestion) => {
    setActiveQuestion(q);
    setViewMode('stats');
  };

  const handleDeleteQuestion = (id: string) => {
    if (window.confirm(`Yakin ingin menghapus butir soal ${id} dari repositori?`)) {
      const next = questions.filter((q) => q.id !== id);
      setQuestions(next);
      localStorage.setItem(QUESTIONS_STORAGE_KEY, JSON.stringify(next));
      showToast(`Butir soal ${id} berhasil dihapus.`);
    }
  };

  const handleSaveQuestion = () => {
    if (!activeQuestion.text.trim()) {
      alert('Teks pertanyaan tidak boleh kosong.');
      return;
    }

    let nextQuestions: BankQuestion[];
    if (isEditingExisting) {
      nextQuestions = questions.map((q) => (q.id === activeQuestion.id ? activeQuestion : q));
    } else {
      nextQuestions = [activeQuestion, ...questions];
    }

    setQuestions(nextQuestions);
    localStorage.setItem(QUESTIONS_STORAGE_KEY, JSON.stringify(nextQuestions));
    showToast(`Butir soal ${activeQuestion.id} berhasil disimpan ke repositori Bank Soal!`);
    setViewMode('table');
  };

  // Fact Sheet handlers
  const handleSaveFactSheet = () => {
    localStorage.setItem(FACTSHEET_STORAGE_KEY, JSON.stringify(factSheetItems));
    localStorage.setItem(PRESET_STORAGE_KEY, selectedPreset);
    showToast('Konfigurasi Fact Sheet & Preset Pengawasan Proctoring berhasil diperbarui!');
  };

  const handleAddFactItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!factText.trim()) return;

    const newFact: FactSheetItem = {
      id: `FS-0${factSheetItems.length + 1}`,
      category: factCategory,
      fact: factText.trim(),
      priority: factPriority,
      weight: Number(factWeight)
    };

    const nextFacts = [...factSheetItems, newFact];
    setFactSheetItems(nextFacts);
    localStorage.setItem(FACTSHEET_STORAGE_KEY, JSON.stringify(nextFacts));

    setIsFactModalOpen(false);
    setFactText('');
    showToast(`Fakta kunci baru (${newFact.id}) berhasil ditambahkan ke Fact Sheet!`);
  };

  const handleDeleteFactItem = (id: string) => {
    if (window.confirm(`Hapus fakta kunci ${id}?`)) {
      const next = factSheetItems.filter((f) => f.id !== id);
      setFactSheetItems(next);
      localStorage.setItem(FACTSHEET_STORAGE_KEY, JSON.stringify(next));
      showToast(`Fakta kunci ${id} dihapus.`);
    }
  };

  const filtered = questions.filter((q) => {
    if (filterType !== 'all' && q.type !== filterType) return false;
    if (filterDiff !== 'all' && q.difficulty !== filterDiff) return false;
    if (
      searchKeyword &&
      !q.text.toLowerCase().includes(searchKeyword.toLowerCase()) &&
      !q.id.toLowerCase().includes(searchKeyword.toLowerCase())
    ) {
      return false;
    }
    return true;
  });

  return (
    <div className="bg-white rounded-2xl border border-border-slate p-6 shadow-xs space-y-6">
      {/* View Switcher Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
        <div>
          <div className="flex items-center gap-2">
            <span className="font-mono text-[11px] font-bold text-primary-navy bg-soft-blue px-2.5 py-0.5 rounded border border-accent-border">
              BANK SOAL AI
            </span>
            <Badge variant="navy">{questions.length} Butir Soal Terstandar</Badge>
          </div>
          <h2 className="text-xl font-extrabold font-heading text-ink tracking-tight mt-1">
            Repositori Bank Soal &amp; Item Analytics
          </h2>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant={viewMode === 'table' ? 'primary' : 'outline'}
            size="sm"
            onClick={() => setViewMode('table')}
            className="text-xs cursor-pointer"
          >
            Daftar Soal
          </Button>
          <Button
            variant={viewMode === 'editor' ? 'primary' : 'outline'}
            size="sm"
            onClick={handleCreateNew}
            className="text-xs flex items-center gap-1.5 cursor-pointer"
          >
            <Edit className="w-3.5 h-3.5" />
            <span>Editor Soal</span>
          </Button>
          <Button
            variant={viewMode === 'stats' ? 'primary' : 'outline'}
            size="sm"
            onClick={() => setViewMode('stats')}
            className="text-xs flex items-center gap-1.5 cursor-pointer"
          >
            <BarChart3 className="w-3.5 h-3.5" />
            <span>Statistik &amp; Distraktor</span>
          </Button>
          <Button
            variant={viewMode === 'factsheet' ? 'primary' : 'outline'}
            size="sm"
            onClick={() => setViewMode('factsheet')}
            className="text-xs flex items-center gap-1.5 cursor-pointer"
          >
            <FileText className="w-3.5 h-3.5 text-blue-accent" />
            <span>Fact Sheet In-Basket (BR-FS-04)</span>
          </Button>
        </div>
      </div>

      {toastMessage && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-900 flex items-center gap-2 animate-fadeIn">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span className="font-semibold">{toastMessage}</span>
        </div>
      )}

      {/* ─── TAB 1: Tabel Soal ─── */}
      {viewMode === 'table' && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3 p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs">
            <div className="flex flex-wrap items-center gap-3">
              <span className="font-bold text-ink">Filter:</span>
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchKeyword}
                  onChange={(e) => setSearchKeyword(e.target.value)}
                  placeholder="Cari kode atau teks soal..."
                  className="pl-8 pr-3 py-1 bg-white border border-slate-300 rounded-lg text-xs outline-none"
                />
              </div>

              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
                className="px-2.5 py-1 bg-white border border-slate-300 rounded-lg font-semibold cursor-pointer"
              >
                <option value="all">Semua Tipe</option>
                <option value="Pilihan Ganda">Pilihan Ganda</option>
                <option value="Multi-Select">Multi-Select</option>
                <option value="Isian Singkat">Isian Singkat</option>
                <option value="Esai">Esai</option>
                <option value="Matching">Matching</option>
              </select>

              <select
                value={filterDiff}
                onChange={(e) => setFilterDiff(e.target.value)}
                className="px-2.5 py-1 bg-white border border-slate-300 rounded-lg font-semibold cursor-pointer"
              >
                <option value="all">Semua Kesulitan</option>
                <option value="Mudah">Mudah</option>
                <option value="Sedang">Sedang</option>
                <option value="Sulit">Sulit</option>
              </select>
            </div>

            <Button
              variant="primary"
              size="sm"
              onClick={handleCreateNew}
              className="text-xs flex items-center gap-1.5 cursor-pointer shadow-xs"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Tambah Butir Soal</span>
            </Button>
          </div>

          <div className="border border-slate-200 rounded-xl overflow-hidden shadow-xs">
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50">
                  <TableHead className="w-24">KODE</TableHead>
                  <TableHead>TEKS SOAL</TableHead>
                  <TableHead className="w-28">TIPE</TableHead>
                  <TableHead className="w-40">KOMPETENSI</TableHead>
                  <TableHead className="w-24">TINGKAT</TableHead>
                  <TableHead className="w-24">P-VALUE</TableHead>
                  <TableHead className="w-24">STATUS</TableHead>
                  <TableHead className="w-28 text-right">AKSI</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((q) => (
                  <TableRow key={q.id} className="hover:bg-slate-50/50">
                    <TableCell className="font-mono font-bold text-primary-navy text-xs">{q.id}</TableCell>
                    <TableCell className="max-w-xs truncate text-ink font-medium text-xs" title={q.text}>
                      {q.text}
                    </TableCell>
                    <TableCell className="text-xs text-slate-700">{q.type}</TableCell>
                    <TableCell className="text-xs text-slate-600">{q.competency}</TableCell>
                    <TableCell>
                      <Badge
                        variant={q.difficulty === 'Sulit' ? 'danger' : q.difficulty === 'Sedang' ? 'warning' : 'success'}
                        format="soft"
                        className="text-[11px]"
                      >
                        {q.difficulty}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-mono font-bold text-slate-700 text-xs">{q.pValue}</TableCell>
                    <TableCell>
                      <Badge
                        variant={q.status === 'Published' ? 'success' : q.status === 'Review' ? 'warning' : 'neutral'}
                        format="soft"
                        className="text-[11px]"
                      >
                        {q.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleStats(q)}
                          title="Statistik Butir Soal"
                          className="cursor-pointer"
                        >
                          <BarChart3 className="w-4 h-4 text-slate-500 hover:text-blue-600" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleEdit(q)}
                          title="Edit Soal"
                          className="cursor-pointer"
                        >
                          <Edit className="w-4 h-4 text-slate-500 hover:text-primary-navy" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDeleteQuestion(q.id)}
                          title="Hapus Soal"
                          className="cursor-pointer text-slate-400 hover:text-red-600"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      )}

      {/* ─── TAB 2: Soal Editor ─── */}
      {viewMode === 'editor' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Form (7 cols) */}
          <div className="lg:col-span-7 space-y-4 text-xs">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <span className="font-bold text-ink text-sm">
                {isEditingExisting ? `Edit Soal: ${activeQuestion.id}` : 'Tambah Butir Soal Baru'}
              </span>
              <span className="font-mono text-xs bg-slate-100 px-2 py-0.5 rounded text-slate-600 font-bold">
                ID: {activeQuestion.id}
              </span>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block font-bold text-ink mb-1">Tipe Soal</label>
                <select
                  value={activeQuestion.type}
                  onChange={(e) => setActiveQuestion({ ...activeQuestion, type: e.target.value as any })}
                  className="w-full px-3 py-2 rounded-lg border border-border-slate font-semibold bg-white cursor-pointer"
                >
                  <option value="Pilihan Ganda">Pilihan Ganda</option>
                  <option value="Multi-Select">Multi-Select</option>
                  <option value="Isian Singkat">Isian Singkat</option>
                  <option value="Esai">Esai</option>
                  <option value="Matching">Matching</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-ink mb-1">Tingkat Kesulitan</label>
                <select
                  value={activeQuestion.difficulty}
                  onChange={(e) => setActiveQuestion({ ...activeQuestion, difficulty: e.target.value as any })}
                  className="w-full px-3 py-2 rounded-lg border border-border-slate font-semibold bg-white cursor-pointer"
                >
                  <option value="Mudah">Mudah</option>
                  <option value="Sedang">Sedang</option>
                  <option value="Sulit">Sulit</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-ink mb-1">Status Butir</label>
                <select
                  value={activeQuestion.status}
                  onChange={(e) => setActiveQuestion({ ...activeQuestion, status: e.target.value as any })}
                  className="w-full px-3 py-2 rounded-lg border border-border-slate font-semibold bg-white cursor-pointer"
                >
                  <option value="Published">Published</option>
                  <option value="Review">Review</option>
                  <option value="Draft">Draft</option>
                  <option value="Retired">Retired</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block font-bold text-ink mb-1">Kompetensi yang Diuji</label>
              <input
                type="text"
                value={activeQuestion.competency}
                onChange={(e) => setActiveQuestion({ ...activeQuestion, competency: e.target.value })}
                placeholder="Contoh: Database Optimization, System Architecture..."
                className="w-full px-3 py-2 rounded-lg border border-border-slate text-xs outline-none focus:border-primary-navy"
              />
            </div>

            <div>
              <label className="block font-bold text-ink mb-1">Teks Pertanyaan (Studi Kasus / Soal):</label>
              <textarea
                rows={4}
                value={activeQuestion.text}
                onChange={(e) => setActiveQuestion({ ...activeQuestion, text: e.target.value })}
                placeholder="Tuliskan butir soal secara lengkap..."
                className="w-full p-3 rounded-xl border border-border-slate focus:border-primary-navy text-xs outline-none leading-relaxed"
              />
            </div>

            {/* Opsi Jawaban (for Pilihan Ganda / Multi-Select) */}
            {(activeQuestion.type === 'Pilihan Ganda' || activeQuestion.type === 'Multi-Select') && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="block font-bold text-ink">
                    Opsi Pilihan Jawaban &amp; Kunci Benar (Klik huruf untuk set kunci):
                  </label>
                </div>
                {activeQuestion.options.map((opt, oIdx) => (
                  <div key={opt.key} className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        let newOpts: typeof activeQuestion.options;
                        if (activeQuestion.type === 'Pilihan Ganda') {
                          newOpts = activeQuestion.options.map((o, i) => ({
                            ...o,
                            isCorrect: i === oIdx
                          }));
                        } else {
                          newOpts = activeQuestion.options.map((o, i) =>
                            i === oIdx ? { ...o, isCorrect: !o.isCorrect } : o
                          );
                        }
                        setActiveQuestion({ ...activeQuestion, options: newOpts });
                      }}
                      className={`w-7 h-7 rounded-lg font-bold text-xs flex items-center justify-center shrink-0 cursor-pointer ${
                        opt.isCorrect ? 'bg-success-green text-white' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                      }`}
                      title="Klik untuk set kunci benar"
                    >
                      {opt.key}
                    </button>
                    <input
                      type="text"
                      value={opt.text}
                      onChange={(e) => {
                        const newOpts = [...activeQuestion.options];
                        newOpts[oIdx].text = e.target.value;
                        setActiveQuestion({ ...activeQuestion, options: newOpts });
                      }}
                      className="flex-1 px-3 py-2 rounded-lg border border-border-slate text-xs outline-none"
                    />
                  </div>
                ))}
              </div>
            )}

            <div>
              <label className="block font-bold text-ink mb-1">Kunci &amp; Pembahasan Soal:</label>
              <textarea
                rows={2}
                value={activeQuestion.explanation}
                onChange={(e) => setActiveQuestion({ ...activeQuestion, explanation: e.target.value })}
                placeholder="Penjelasan teknis kenapa opsi tersebut benar..."
                className="w-full p-2.5 rounded-lg border border-border-slate focus:border-primary-navy text-xs outline-none leading-relaxed"
              />
            </div>

            <div className="pt-2 flex justify-end gap-2 border-t border-slate-100">
              <Button variant="outline" size="sm" onClick={() => setViewMode('table')}>
                Batal
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={handleSaveQuestion}
                className="flex items-center gap-1.5 cursor-pointer shadow-xs"
              >
                <Save className="w-3.5 h-3.5" />
                <span>Simpan Butir Soal</span>
              </Button>
            </div>
          </div>

          {/* Right Live Preview (5 cols) */}
          <div className="lg:col-span-5 bg-slate-50 rounded-2xl border border-slate-200 p-5 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-200">
              <span className="font-heading font-bold text-xs uppercase tracking-wider text-ink">
                Live Preview (Tampilan Peserta CAT)
              </span>
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-100 text-blue-800">
                {activeQuestion.type}
              </span>
            </div>

            <div className="bg-white rounded-xl border border-slate-200 p-4 space-y-3 shadow-2xs">
              <div className="flex items-center justify-between text-[11px] text-slate-500 font-mono">
                <span>{activeQuestion.id}</span>
                <span className="text-amber-600 font-bold">{activeQuestion.difficulty}</span>
              </div>
              <p className="text-xs font-semibold text-slate-900 leading-relaxed">
                {activeQuestion.text || '(Teks soal belum diisi)'}
              </p>

              {activeQuestion.options.length > 0 && (
                <div className="space-y-1.5 pt-2">
                  {activeQuestion.options.map((opt) => (
                    <div
                      key={opt.key}
                      className={`p-2.5 rounded-lg border text-xs flex items-center gap-2.5 ${
                        opt.isCorrect
                          ? 'border-emerald-500 bg-emerald-50/50 text-emerald-950 font-medium'
                          : 'border-slate-200 bg-slate-50 text-slate-700'
                      }`}
                    >
                      <span
                        className={`w-5 h-5 rounded-md flex items-center justify-center font-bold text-[10px] ${
                          opt.isCorrect ? 'bg-emerald-600 text-white' : 'bg-slate-200 text-slate-700'
                        }`}
                      >
                        {opt.key}
                      </span>
                      <span>{opt.text}</span>
                    </div>
                  ))}
                </div>
              )}

              {activeQuestion.explanation && (
                <div className="mt-3 p-2.5 rounded-lg bg-blue-50/80 border border-blue-200/60 text-[11px] text-blue-950">
                  <span className="font-bold block mb-0.5">💡 Pembahasan:</span>
                  <span>{activeQuestion.explanation}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ─── TAB 3: Statistik & Distraktor (Item Analytics) ─── */}
      {viewMode === 'stats' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <button
              onClick={() => setViewMode('table')}
              className="text-xs text-primary-navy font-bold hover:underline flex items-center gap-1 cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4" />
              <span>Kembali ke Tabel Soal</span>
            </button>
            <span className="text-xs text-slate-500 font-mono font-bold">Item Analysis: {activeQuestion.id}</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="p-4 bg-slate-50 border-slate-200">
              <span className="text-xs text-slate-500 font-medium block">Tingkat Kesukaran (P-Value)</span>
              <span className="text-2xl font-bold font-heading text-slate-900 mt-1 block">
                {activeQuestion.pValue}
              </span>
              <span className="text-[11px] text-emerald-600 font-semibold">
                {activeQuestion.pValue >= 0.7 ? 'Kategori Mudah' : activeQuestion.pValue >= 0.4 ? 'Kategori Sedang' : 'Kategori Sukar'}
              </span>
            </Card>

            <Card className="p-4 bg-slate-50 border-slate-200">
              <span className="text-xs text-slate-500 font-medium block">Daya Beda (Discrimination Index)</span>
              <span className="text-2xl font-bold font-heading text-blue-600 mt-1 block">0.48</span>
              <span className="text-[11px] text-blue-700 font-semibold">Sangat Baik (D &gt; 0.40)</span>
            </Card>

            <Card className="p-4 bg-slate-50 border-slate-200">
              <span className="text-xs text-slate-500 font-medium block">Jumlah Partisipan Teruji</span>
              <span className="text-2xl font-bold font-heading text-slate-900 mt-1 block font-mono">1.248</span>
              <span className="text-[11px] text-slate-500">Kandidat Terkalibrasi</span>
            </Card>
          </div>

          {/* Distractor Distribution Bar */}
          <div className="border border-slate-200 rounded-xl p-5 space-y-4">
            <h3 className="font-heading font-bold text-sm text-ink">
              Distribusi Pemilihan Opsi Jawaban (Distractor Analysis)
            </h3>
            <p className="text-xs text-slate-500">
              Memastikan tidak ada opsi pengecoh (distraktor) yang tidak berfungsi atau ambigu.
            </p>

            <div className="space-y-3 pt-2">
              {activeQuestion.distractorStats.map((d, idx) => (
                <div key={idx} className="space-y-1">
                  <div className="flex justify-between text-xs font-semibold">
                    <span className="text-slate-800">Opsi {d.label}</span>
                    <span className="font-mono text-primary-navy">{d.pct}%</span>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-3 overflow-hidden border border-slate-200">
                    <div
                      className={`h-full rounded-full ${
                        d.label.includes('Kunci') || d.label.includes('Benar')
                          ? 'bg-emerald-500'
                          : 'bg-blue-600'
                      }`}
                      style={{ width: `${d.pct}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ─── TAB 4: Fact Sheet In-Basket (BRD CIMB PT Anjak) ─── */}
      {viewMode === 'factsheet' && (
        <div className="space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-xl bg-blue-50/70 border border-blue-200 text-xs">
            <div>
              <span className="font-bold text-blue-900 block text-sm">
                Engine Fact Sheet &amp; Skenario Kasus (BR-FS-04 &amp; BR-IB-03)
              </span>
              <p className="text-slate-600 mt-0.5 leading-relaxed">
                Daftar fakta kunci skenario yang wajib diidentifikasi peserta pada studi kasus (misal: Kasus PT Anjak
                CIMB Niaga). Digunakan AI untuk verifikasi prioritas masalah dan menyusun draf laporan LHA.
              </p>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsFactModalOpen(true)}
                className="text-xs flex items-center gap-1.5 cursor-pointer bg-white"
              >
                <Plus className="w-3.5 h-3.5 text-blue-600" />
                <span>Tambah Fakta Kunci</span>
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={handleSaveFactSheet}
                className="text-xs flex items-center gap-1.5 cursor-pointer shadow-xs"
              >
                <Save className="w-3.5 h-3.5" />
                <span>Simpan Fact Sheet</span>
              </Button>
            </div>
          </div>

          {/* Preset Selector */}
          <div className="flex items-center justify-between p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs">
            <span className="font-bold text-slate-800 flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-primary-navy" />
              Preset AI Proctoring &amp; Threshold Toleransi (BR-PR-05):
            </span>
            <select
              value={selectedPreset}
              onChange={(e) => setSelectedPreset(e.target.value as any)}
              className="px-3 py-1.5 bg-white border border-slate-300 rounded-lg font-bold text-primary-navy cursor-pointer"
            >
              <option value="Ringan">Preset Ringan (Browser only, th: 80)</option>
              <option value="Sedang">Preset Sedang (Webcam basic, th: 50)</option>
              <option value="Ketat">Preset Ketat (Identitas, gaze, gadget, th: 30)</option>
            </select>
          </div>

          {/* Fact Sheet Table */}
          <div className="border border-slate-200 rounded-xl overflow-hidden shadow-xs">
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50">
                  <TableHead className="w-24">KODE FAKTA</TableHead>
                  <TableHead className="w-44">KATEGORI</TableHead>
                  <TableHead>FAKTA KUNCI SKENARIO</TableHead>
                  <TableHead className="w-44">EXPECTED PRIORITY</TableHead>
                  <TableHead className="w-28 text-center">BOBOT (1-5)</TableHead>
                  <TableHead className="w-20 text-right">AKSI</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {factSheetItems.map((item) => (
                  <TableRow key={item.id} className="hover:bg-slate-50/50">
                    <TableCell className="font-mono text-xs font-bold text-blue-700">{item.id}</TableCell>
                    <TableCell className="text-xs font-medium text-slate-700">{item.category}</TableCell>
                    <TableCell className="text-xs text-slate-900 leading-relaxed max-w-md">{item.fact}</TableCell>
                    <TableCell>
                      {item.priority.includes('Critical') ? (
                        <Badge variant="destructive" hasDot className="text-[11px]">
                          {item.priority}
                        </Badge>
                      ) : item.priority.includes('Important') ? (
                        <Badge variant="warning" hasDot className="text-[11px]">
                          {item.priority}
                        </Badge>
                      ) : (
                        <Badge variant="secondary" className="text-[11px]">
                          {item.priority}
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-xs font-mono font-bold text-center text-blue-700">
                      {item.weight} / 5
                    </TableCell>
                    <TableCell className="text-right">
                      <button
                        type="button"
                        onClick={() => handleDeleteFactItem(item.id)}
                        className="p-1 text-slate-400 hover:text-red-600 cursor-pointer"
                        title="Hapus Fakta"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      )}

      {/* ─── MODAL TAMBAH FAKTA KUNCI SKENARIO ─── */}
      <Modal
        isOpen={isFactModalOpen}
        onClose={() => setIsFactModalOpen(false)}
        title="Tambah Fakta Kunci Kasus (Fact Sheet Ingestion)"
        size="md"
      >
        <form onSubmit={handleAddFactItem} className="p-4 space-y-4 text-xs">
          <div>
            <label className="block font-bold text-slate-700 mb-1">Kategori Masalah</label>
            <input
              type="text"
              value={factCategory}
              onChange={(e) => setFactCategory(e.target.value)}
              placeholder="Contoh: Operational SLA, OPEX Listrik, Customer Satisfaction..."
              required
              className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs outline-none focus:border-primary-navy"
            />
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1">Uraian Fakta Kunci Skenario</label>
            <textarea
              rows={3}
              value={factText}
              onChange={(e) => setFactText(e.target.value)}
              placeholder="Contoh: Penurunan On-Time Performance (OTP) 99.2% ke 97.8% pada mesin CRM..."
              required
              className="w-full p-2.5 rounded-lg border border-slate-300 text-xs outline-none leading-relaxed"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-slate-700 mb-1">Prioritas Analisis</label>
              <select
                value={factPriority}
                onChange={(e) => setFactPriority(e.target.value as any)}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs bg-white cursor-pointer"
              >
                <option value="Priority 1 (Critical)">Priority 1 (Critical)</option>
                <option value="Priority 2 (Important)">Priority 2 (Important)</option>
                <option value="Priority 3 (Secondary)">Priority 3 (Secondary)</option>
              </select>
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">Bobot Penilaian (1 - 5)</label>
              <input
                type="number"
                min={1}
                max={5}
                value={factWeight}
                onChange={(e) => setFactWeight(Number(e.target.value))}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs font-mono font-bold"
              />
            </div>
          </div>

          <div className="pt-2 flex justify-end gap-2 border-t border-slate-100">
            <Button variant="outline" size="sm" type="button" onClick={() => setIsFactModalOpen(false)}>
              Batal
            </Button>
            <Button variant="primary" size="sm" type="submit">
              Simpan Fakta Kunci
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
