import React, { useEffect, useMemo, useState } from 'react';
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
  ChevronLeft,
  Layers,
  Database,
  Upload,
  Paperclip,
  Brain,
  Download,
  FileSpreadsheet
} from 'lucide-react';
import axios from 'axios';
import { loadMasterScope, saveMasterRecord } from '../../services/masterDataService';
import { getAllPrograms, buildDefaultBankSoal } from '../../services/assessmentCatalog';
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

export type QuestionCategory = 'psikotes' | 'kompetensi';

export interface BankQuestion {
  id: string;
  category?: QuestionCategory;
  type: 'Pilihan Ganda' | 'Multi-Select' | 'Isian Singkat' | 'Esai' | 'Matching';
  programCode?: string;
  text: string;
  competency: string;
  difficulty: 'Mudah' | 'Sedang' | 'Sulit';
  status: 'Published' | 'Review' | 'Draft' | 'Retired';
  pValue: number; // 0.0 to 1.0 item difficulty index
  distractorStats: { label: string; pct: number }[];
  options: { key: string; text: string; isCorrect: boolean }[];
  matchingPairs?: { left: string; rightOptions: string[]; correctRight?: string }[];
  explanation: string;
  attachmentUrl?: string | null;
  attachmentName?: string | null;
  attachmentMime?: string | null;
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


const syncProgramQuestions = async (programCode: string, allQuestions: BankQuestion[]) => {
  const token = localStorage.getItem('adminToken');
  if (!token) return;
  const programQuestions = allQuestions.filter(
    (question) => (question.programCode || programCode) === programCode
  );
  const payload = programQuestions.map((question) => {
    const options = question.options || [];
    let correctAnswer: unknown = null;
    if (question.type === 'Pilihan Ganda') {
      correctAnswer = options.find((option) => option.isCorrect)?.key ?? null;
    } else if (question.type === 'Multi-Select') {
      correctAnswer = options.filter((option) => option.isCorrect).map((option) => option.key);
    } else if (question.type === 'Isian Singkat') {
      correctAnswer = options[0]?.text || question.explanation || null;
    } else if (question.type === 'Matching') {
      correctAnswer = ((question as any).matchingPairs || []).map((pair: any) => ({
        left: pair.left,
        correctRight: pair.correctRight || pair.rightOptions?.[0] || ''
      }));
    }
    return {
      type: question.type,
      text: question.text,
      competency: question.competency,
      difficulty: question.difficulty,
      options,
      matchingPairs: (question as any).matchingPairs || [],
      correctAnswer,
      points: 1
    };
  });
  await axios.post(
    `/api/admin/programs/${programCode}/questions/sync`,
    { questions: payload },
    { headers: { Authorization: `Bearer ${token}` } }
  );
};

const ALL_QUESTION_TYPES: BankQuestion['type'][] = [
  'Pilihan Ganda',
  'Multi-Select',
  'Isian Singkat',
  'Esai',
  'Matching'
];

type CategoryTypeConfig = Record<
  string,
  Record<QuestionCategory, BankQuestion['type'][]>
>;

const DEFAULT_CATEGORY_TYPES: Record<QuestionCategory, BankQuestion['type'][]> = {
  psikotes: ['Pilihan Ganda', 'Multi-Select', 'Isian Singkat'],
  kompetensi: ['Pilihan Ganda', 'Multi-Select', 'Isian Singkat', 'Esai', 'Matching']
};

const getQuestionCategory = (question: Pick<BankQuestion, 'category'>): QuestionCategory =>
  question.category === 'psikotes' ? 'psikotes' : 'kompetensi';

const createQuestionId = (category: QuestionCategory): string =>
  `${category === 'psikotes' ? 'PSI' : 'SOAL'}-${Math.floor(400 + Math.random() * 500)}`;


function QuestionFormFields({
  question,
  onChange,
  onSave,
  onCancel,
  onUploadAttachment,
  onRemoveAttachment,
  onDelete,
  headerLabel
}: {
  question: BankQuestion;
  onChange: (patch: Partial<BankQuestion>) => void;
  onSave: () => void;
  onCancel?: () => void;
  onUploadAttachment?: (file: File) => void;
  onRemoveAttachment?: () => void;
  onDelete?: () => void;
  headerLabel: string;
}) {
  return (
    <div className="space-y-4 text-xs">
      <div className="flex items-center justify-between pb-2 border-b border-slate-100">
        <span className="font-bold text-ink text-sm">{headerLabel}</span>
        <span className="font-mono text-xs bg-slate-100 px-2 py-0.5 rounded text-slate-600 font-bold">
          ID: {question.id}
        </span>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div>
          <label className="block text-xs sm:text-sm font-bold text-ink mb-1.5">Kategori Soal</label>
          <select
            value={getQuestionCategory(question)}
            onChange={(e) => onChange({ category: e.target.value as QuestionCategory })}
            className="w-full h-11 px-3.5 py-2 rounded-xl border border-slate-300 text-sm font-semibold text-slate-800 bg-white shadow-2xs cursor-pointer focus:outline-none focus:border-primary-navy"
          >
            <option value="psikotes">Soal Psikotes</option>
            <option value="kompetensi">Uji Kompetensi</option>
          </select>
        </div>
        <div>
          <label className="block text-xs sm:text-sm font-bold text-ink mb-1.5">Tipe Soal</label>
          <select
            value={question.type}
            onChange={(e) => onChange({ type: e.target.value as BankQuestion['type'] })}
            className="w-full h-11 px-3.5 py-2 rounded-xl border border-slate-300 text-sm font-semibold text-slate-800 bg-white shadow-2xs cursor-pointer focus:outline-none focus:border-primary-navy"
          >
            <option value="Pilihan Ganda">Pilihan Ganda</option>
            <option value="Multi-Select">Multi-Select</option>
            <option value="Isian Singkat">Isian Singkat</option>
            <option value="Esai">Esai</option>
            <option value="Matching">Matching</option>
          </select>
        </div>
        <div>
          <label className="block text-xs sm:text-sm font-bold text-ink mb-1.5">Tingkat Kesulitan</label>
          <select
            value={question.difficulty}
            onChange={(e) => onChange({ difficulty: e.target.value as BankQuestion['difficulty'] })}
            className="w-full h-11 px-3.5 py-2 rounded-xl border border-slate-300 text-sm font-semibold text-slate-800 bg-white shadow-2xs cursor-pointer focus:outline-none focus:border-primary-navy"
          >
            <option value="Mudah">Mudah</option>
            <option value="Sedang">Sedang</option>
            <option value="Sulit">Sulit</option>
          </select>
        </div>
        <div>
          <label className="block text-xs sm:text-sm font-bold text-ink mb-1.5">Status Butir</label>
          <select
            value={question.status}
            onChange={(e) => onChange({ status: e.target.value as BankQuestion['status'] })}
            className="w-full h-11 px-3.5 py-2 rounded-xl border border-slate-300 text-sm font-semibold text-slate-800 bg-white shadow-2xs cursor-pointer focus:outline-none focus:border-primary-navy"
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
          value={question.competency}
          onChange={(e) => onChange({ competency: e.target.value })}
          placeholder="Contoh: Database Optimization, System Architecture..."
          className="w-full px-3 py-2 rounded-lg border border-border-slate text-xs outline-none focus:border-primary-navy"
        />
      </div>

      <div>
        <label className="block font-bold text-ink mb-1">Teks Pertanyaan (Studi Kasus / Soal):</label>
        <textarea
          rows={4}
          value={question.text}
          onChange={(e) => onChange({ text: e.target.value })}
          placeholder="Tuliskan butir soal secara lengkap..."
          className="w-full p-3 rounded-xl border border-border-slate focus:border-primary-navy text-xs outline-none leading-relaxed"
        />
      </div>

      <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 space-y-2">
        <div className="flex items-center justify-between gap-2">
          <label className="block font-bold text-ink flex items-center gap-1.5">
            <Paperclip className="w-3.5 h-3.5 text-primary-navy" />
            Lampiran butir soal (PDF/DOCX/gambar)
          </label>
          <label className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white text-[11px] font-semibold text-slate-700 cursor-pointer hover:bg-slate-100">
            <Upload className="w-3 h-3" />
            Unggah
            <input
              type="file"
              className="hidden"
              accept=".pdf,.doc,.docx,.png,.jpg,.jpeg,.txt"
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (file && onUploadAttachment) onUploadAttachment(file);
                event.target.value = '';
              }}
            />
          </label>
        </div>
        {question.attachmentUrl ? (
          <div className="flex items-center justify-between gap-2 text-[11px] text-slate-700">
            <a href={question.attachmentUrl} target="_blank" rel="noreferrer" className="truncate hover:underline">
              {question.attachmentName || question.attachmentUrl}
            </a>
            <button
              type="button"
              onClick={() => onRemoveAttachment?.()}
              className="text-rose-600 hover:text-rose-700 cursor-pointer"
            >
              <Trash2 className="w-3 h-3" />
            </button>
          </div>
        ) : (
          <p className="text-[11px] text-slate-500">
            Lampiran ditampilkan pada panel split-view peserta.
          </p>
        )}
      </div>

      {(question.type === 'Pilihan Ganda' || question.type === 'Multi-Select') && (
        <div className="space-y-2">
          <label className="block font-bold text-ink">
            Opsi Pilihan Jawaban &amp; Kunci Benar (Klik huruf untuk set kunci):
          </label>
          {question.options.map((opt, oIdx) => (
            <div key={opt.key} className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  const newOpts =
                    question.type === 'Pilihan Ganda'
                      ? question.options.map((o, i) => ({ ...o, isCorrect: i === oIdx }))
                      : question.options.map((o, i) =>
                          i === oIdx ? { ...o, isCorrect: !o.isCorrect } : o
                        );
                  onChange({ options: newOpts });
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
                  const newOpts = question.options.map((o, i) =>
                    i === oIdx ? { ...o, text: e.target.value } : o
                  );
                  onChange({ options: newOpts });
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
          value={question.explanation}
          onChange={(e) => onChange({ explanation: e.target.value })}
          placeholder="Penjelasan teknis kenapa opsi tersebut benar..."
          className="w-full p-2.5 rounded-lg border border-border-slate focus:border-primary-navy text-xs outline-none leading-relaxed"
        />
      </div>

      <div className="pt-2 flex flex-wrap justify-end gap-2 border-t border-slate-100">
        {onDelete && (
          <Button
            variant="danger"
            size="sm"
            onClick={onDelete}
            className="flex items-center gap-1.5 cursor-pointer mr-auto"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Hapus Soal</span>
          </Button>
        )}
        {onCancel && (
          <Button variant="outline" size="sm" onClick={onCancel}>
            Batal
          </Button>
        )}
        <Button
          variant="primary"
          size="sm"
          onClick={onSave}
          className="flex items-center gap-1.5 cursor-pointer shadow-xs"
        >
          <Save className="w-3.5 h-3.5" />
          <span>Simpan Butir Soal</span>
        </Button>
      </div>
    </div>
  );
}

export function AdminBankSoalEditor() {
  const [viewMode, setViewMode] = useState<'programs' | 'table' | 'editor' | 'stats' | 'factsheet'>('programs');
  const [activeCategory, setActiveCategory] = useState<QuestionCategory>('psikotes');
  const [typeConfig, setTypeConfig] = useState<CategoryTypeConfig>({});
  const [filterType, setFilterType] = useState('all');
  const [filterDiff, setFilterDiff] = useState('all');
  const [searchKeyword, setSearchKeyword] = useState('');

  // Preset Proctoring
  const [selectedPreset, setSelectedPreset] = useState<'Ringan' | 'Sedang' | 'Ketat'>('Ketat');

  // Fact Sheet Items state
  const [factSheetItems, setFactSheetItems] = useState<FactSheetItem[]>(INITIAL_FACT_SHEET);

  // Questions state
  const [programs, setPrograms] = useState(() => getAllPrograms());
  const [selectedProgramCode, setSelectedProgramCode] = useState(programs[0]?.id || 'SE-402');
  const [caseFiles, setCaseFiles] = useState<Array<{ name: string; url: string; mime?: string }>>([]);
  const [caseUploading, setCaseUploading] = useState(false);
  const [caseMessage, setCaseMessage] = useState('');
  const [questionImporting, setQuestionImporting] = useState(false);
  const [questionImportMessage, setQuestionImportMessage] = useState('');

  useEffect(() => {
    let cancelled = false;
    const token = localStorage.getItem('adminToken');
    if (!token) return;
    axios
      .get('/api/admin/jobs', {
        params: { limit: 100 },
        headers: { Authorization: `Bearer ${token}` }
      })
      .then((response) => {
        if (cancelled) return;
        const merged = getAllPrograms();
        for (const job of response.data?.data || []) {
          if (!job.code) continue;
          if (!merged.some((program) => program.id === job.code)) {
            merged.push({
              id: job.code,
              title: job.title,
              companyName: job.title.includes('(')
                ? job.title.split('(').slice(-1)[0].replace(')', '').trim()
                : '-',
              category: 'Program Kustom',
              description: job.description || '',
              durationMinutes: job.interviewDuration || 90,
              passingScore: job.interviewPassingScore || 70,
              totalQuestions: 0,
              gradeLevel: 'Grade B (Specialist / Mid)',
              questions: []
            } as any);
          }
        }
        setPrograms(merged);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, []);
  const [questions, setQuestions] = useState<BankQuestion[]>(INITIAL_QUESTIONS);

  useEffect(() => {
    let cancelled = false;
    loadMasterScope<any>('bank-soal')
      .then((data: Record<string, any>) => {
        if (cancelled) return;
        const defaultBank = buildDefaultBankSoal() as BankQuestion[];
        if (Array.isArray(data.questions) && data.questions.length > 0) {
          const normalized = data.questions.map((question: BankQuestion) => ({
            ...question,
            programCode: question.programCode || programs[0]?.id || 'SE-402'
          }));
          const existingCodes = new Set(normalized.map((q: BankQuestion) => q.programCode));
          const missingQuestions = defaultBank.filter((q) => !existingCodes.has(q.programCode));
          const merged = missingQuestions.length > 0 ? [...normalized, ...missingQuestions] : normalized;
          setQuestions(merged);
          if (missingQuestions.length > 0 || normalized.some((question: BankQuestion, index: number) => question.programCode !== data.questions[index]?.programCode)) {
            void saveMasterRecord('bank-soal', 'questions', merged);
          }
        } else {
          setQuestions(defaultBank);
          void saveMasterRecord('bank-soal', 'questions', defaultBank);
        }
        if (Array.isArray(data.factsheet) && data.factsheet.length > 0) {
          setFactSheetItems(data.factsheet);
        } else {
          void saveMasterRecord('bank-soal', 'factsheet', INITIAL_FACT_SHEET);
        }
        if (data.preset) {
          setSelectedPreset(data.preset);
        } else {
          void saveMasterRecord('bank-soal', 'preset', 'Ketat');
        }
        if (data.typeConfig && typeof data.typeConfig === 'object') {
          setTypeConfig(data.typeConfig);
        }
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [programs]);

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

  const scrollToEditor = () => {
    window.setTimeout(() => {
      document.getElementById('question-editor')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 80);
  };

  const handleEdit = (q: BankQuestion) => {
    setActiveQuestion({
      ...JSON.parse(JSON.stringify(q)),
      category: getQuestionCategory(q)
    });
    setIsEditingExisting(true);
    setViewMode('editor');
    scrollToEditor();
  };

  const handleCreateNew = (
    type: BankQuestion['type'] = 'Pilihan Ganda',
    categoryOverride?: QuestionCategory
  ) => {
    const targetCategory = categoryOverride || activeCategory;
    const newQ: BankQuestion = {
      id: createQuestionId(targetCategory),
      category: targetCategory,
      type,
      programCode: selectedProgramCode,
      text: '',
      competency: targetCategory === 'psikotes' ? 'Penalaran Logis & Analitik' : 'System Architecture',
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
    scrollToEditor();
  };

  const handleStats = (q: BankQuestion) => {
    setActiveQuestion(q);
    setViewMode('stats');
  };

  const handleDeleteQuestion = (id: string) => {
    if (window.confirm(`Yakin ingin menghapus butir soal ${id} dari repositori?`)) {
      const next = questions.filter((q) => q.id !== id);
      setQuestions(next);
      void saveMasterRecord('bank-soal', 'questions', next);
      void syncProgramQuestions(selectedProgramCode, next).catch(() => undefined);
      showToast(`Butir soal ${id} berhasil dihapus dan disinkronkan ke bank ujian.`);
    }
  };

  const handleInlineFieldChange = (id: string, patch: Partial<BankQuestion>) => {
    setQuestions((prev) => prev.map((item) => (item.id === id ? { ...item, ...patch } : item)));
  };

  const commitQuestions = (next: BankQuestion[]) => {
    setQuestions(next);
    void saveMasterRecord('bank-soal', 'questions', next);
    void syncProgramQuestions(selectedProgramCode, next).catch(() => undefined);
    showToast('Perubahan soal tersimpan dan disinkronkan.');
  };

  const handleInlineCommit = () => commitQuestions(questions);

  const handleInlineAttachmentUpload = async (question: BankQuestion, file: File) => {
    const token = localStorage.getItem('adminToken');
    if (!token) return;
    const programQuestions = questions.filter(
      (item) => (item.programCode || programs[0]?.id || 'SE-402') === selectedProgramCode
    );
    const orderNo = programQuestions.findIndex((item) => item.id === question.id) + 1;
    if (orderNo <= 0) return;
    const formData = new FormData();
    formData.append('file', file);
    formData.append('programCode', selectedProgramCode);
    formData.append('orderNo', String(orderNo));
    try {
      const response = await axios.post('/api/admin/questions/attachment', formData, {
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'multipart/form-data' }
      });
      const stored = response.data?.data;
      if (!stored) return;
      commitQuestions(
        questions.map((item) =>
          item.id === question.id
            ? {
                ...item,
                attachmentUrl: stored.url,
                attachmentName: stored.name,
                attachmentMime: stored.mime
              }
            : item
        )
      );
    } catch (error) {
      setCaseMessage(
        axios.isAxiosError(error)
          ? error.response?.data?.error || 'Gagal mengunggah lampiran soal.'
          : 'Gagal mengunggah lampiran soal.'
      );
    }
  };

  const handleSaveQuestion = () => {
    if (!activeQuestion.text.trim()) {
      alert('Teks pertanyaan tidak boleh kosong.');
      return;
    }

    const normalizedActive: BankQuestion = {
      ...activeQuestion,
      category: getQuestionCategory(activeQuestion)
    };
    let nextQuestions: BankQuestion[];
    if (isEditingExisting) {
      nextQuestions = questions.map((q) => (q.id === normalizedActive.id ? normalizedActive : q));
    } else {
      nextQuestions = [normalizedActive, ...questions];
    }

    setQuestions(nextQuestions);
    setActiveCategory(getQuestionCategory(normalizedActive));
    void saveMasterRecord('bank-soal', 'questions', nextQuestions);
    void syncProgramQuestions(normalizedActive.programCode || selectedProgramCode, nextQuestions).catch(() => undefined);
    showToast(`Butir soal ${normalizedActive.id} tersimpan dan disinkronkan ke lembar ujian.`);
    setViewMode('table');
  };

  // Fact Sheet handlers
  const handleSaveFactSheet = () => {
    void saveMasterRecord('bank-soal', 'factsheet', factSheetItems);
    void saveMasterRecord('bank-soal', 'preset', selectedPreset);
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
    void saveMasterRecord('bank-soal', 'factsheet', nextFacts);

    setIsFactModalOpen(false);
    setFactText('');
    showToast(`Fakta kunci baru (${newFact.id}) berhasil ditambahkan ke Fact Sheet!`);
  };

  const handleDeleteFactItem = (id: string) => {
    if (window.confirm(`Hapus fakta kunci ${id}?`)) {
      const next = factSheetItems.filter((f) => f.id !== id);
      setFactSheetItems(next);
      void saveMasterRecord('bank-soal', 'factsheet', next);
      showToast(`Fakta kunci ${id} dihapus.`);
    }
  };

  const programQuestionsForSelected = questions.filter(
    (q) => (q.programCode || programs[0]?.id || 'SE-402') === selectedProgramCode
  );

  const categoryCounts = {
    psikotes: programQuestionsForSelected.filter((q) => getQuestionCategory(q) === 'psikotes').length,
    kompetensi: programQuestionsForSelected.filter((q) => getQuestionCategory(q) === 'kompetensi').length
  };

  const enabledTypesForActiveCategory: BankQuestion['type'][] =
    typeConfig[selectedProgramCode]?.[activeCategory] || DEFAULT_CATEGORY_TYPES[activeCategory];

  const toggleTypeEnabled = (type: BankQuestion['type']) => {
    const currentProgramCfg = typeConfig[selectedProgramCode] || {
      psikotes: [...DEFAULT_CATEGORY_TYPES.psikotes],
      kompetensi: [...DEFAULT_CATEGORY_TYPES.kompetensi]
    };
    const currentList = currentProgramCfg[activeCategory] || DEFAULT_CATEGORY_TYPES[activeCategory];
    const isEnabled = currentList.includes(type);
    const nextList = isEnabled
      ? currentList.filter((item) => item !== type)
      : [...currentList, type];

    if (nextList.length === 0) {
      showToast('Minimal satu tipe soal harus aktif dalam kategori ini.');
      return;
    }

    const nextConfig: CategoryTypeConfig = {
      ...typeConfig,
      [selectedProgramCode]: {
        ...currentProgramCfg,
        [activeCategory]: nextList
      }
    };
    setTypeConfig(nextConfig);
    if (isEnabled && filterType === type) {
      setFilterType('all');
    }
    void saveMasterRecord('bank-soal', 'typeConfig', nextConfig);
    showToast(
      `Tipe soal ${type} ${isEnabled ? 'dinonaktifkan' : 'diaktifkan'} pada ${
        activeCategory === 'psikotes' ? 'Soal Psikotes' : 'Uji Kompetensi'
      }.`
    );
  };

  const filtered = programQuestionsForSelected.filter((q) => {
    if (getQuestionCategory(q) !== activeCategory) return false;
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

  const typeCounts = ALL_QUESTION_TYPES.map((type) => ({
    type,
    enabled: enabledTypesForActiveCategory.includes(type),
    count: programQuestionsForSelected.filter(
      (question) => getQuestionCategory(question) === activeCategory && question.type === type
    ).length
  }));

  const programRows = programs.map((program) => {
    const programQuestions = questions.filter(
      (question) => (question.programCode || programs[0]?.id || 'SE-402') === program.id
    );
    const psikotesCount = programQuestions.filter((q) => getQuestionCategory(q) === 'psikotes').length;
    const kompetensiCount = programQuestions.filter((q) => getQuestionCategory(q) === 'kompetensi').length;
    return {
      ...program,
      total: programQuestions.length,
      psikotesCount,
      kompetensiCount,
      published: programQuestions.filter((question) => question.status === 'Published').length,
      typeCount: new Set(programQuestions.map((question) => question.type)).size
    };
  });

  useEffect(() => {
    const token = localStorage.getItem('adminToken');
    if (!token || !selectedProgramCode) return;
    let cancelled = false;
    axios
      .get('/api/admin/jobs', { headers: { Authorization: `Bearer ${token}` } })
      .then((response) => {
        if (cancelled) return;
        const jobs = response.data?.data || [];
        const job = jobs.find((item: any) => item.code === selectedProgramCode);
        try {
          const parsed = job?.caseFiles ? JSON.parse(job.caseFiles) : [];
          setCaseFiles(Array.isArray(parsed) ? parsed : []);
        } catch {
          setCaseFiles([]);
        }
      })
      .catch(() => {
        if (!cancelled) setCaseFiles([]);
      });
    return () => {
      cancelled = true;
    };
  }, [selectedProgramCode]);


  const handleDownloadQuestionTemplate = async () => {
    const token = localStorage.getItem('adminToken');
    if (!token) return;
    try {
      const response = await axios.get(
        `/api/admin/programs/${selectedProgramCode}/questions/template`,
        { headers: { Authorization: `Bearer ${token}` }, responseType: 'blob' }
      );
      const url = window.URL.createObjectURL(
        new Blob([response.data], {
          type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        })
      );
      const link = document.createElement('a');
      link.href = url;
      link.download = `Template_Bank_Soal_${selectedProgramCode}.xlsx`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch {
      setQuestionImportMessage('Gagal mengunduh template Excel.');
    }
  };

  const handleImportQuestions = async (file: File) => {
    const token = localStorage.getItem('adminToken');
    if (!token) return;
    setQuestionImporting(true);
    setQuestionImportMessage('');
    try {
      const formData = new FormData();
      formData.append('file', file);
      const response = await axios.post(
        `/api/admin/programs/${selectedProgramCode}/questions/import`,
        formData,
        { headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'multipart/form-data' } }
      );
      const rows = Array.isArray(response.data?.data) ? response.data.data : [];
      const imported: BankQuestion[] = rows.map((row: any, index: number) => ({
        id: `IMP-${Date.now()}-${index + 1}`,
        category: activeCategory,
        type: row.type,
        programCode: selectedProgramCode,
        text: row.text,
        competency: row.competency || 'General',
        difficulty: row.difficulty || 'Sedang',
        status: 'Published',
        pValue: 0,
        distractorStats: [],
        options: Array.isArray(row.options) ? row.options : [],
        matchingPairs: Array.isArray(row.matchingPairs) ? row.matchingPairs : [],
        explanation: row.explanation || ''
      }));
      if (imported.length === 0) {
        setQuestionImportMessage('Tidak ada soal valid pada berkas.');
        return;
      }
      const next = [...questions, ...imported];
      setQuestions(next);
      await saveMasterRecord('bank-soal', 'questions', next);
      await syncProgramQuestions(selectedProgramCode, next);
      const skipped = Number(response.data?.skipped) || 0;
      setQuestionImportMessage(
        `${imported.length} soal berhasil diimpor${skipped ? `, ${skipped} baris dilewati` : ''}.`
      );
    } catch (error) {
      setQuestionImportMessage(
        axios.isAxiosError(error)
          ? error.response?.data?.error || 'Gagal mengimpor soal.'
          : 'Gagal mengimpor soal.'
      );
    } finally {
      setQuestionImporting(false);
    }
  };

  const handleCaseFileUpload = async (file: File) => {
    const token = localStorage.getItem('adminToken');
    if (!token) return;
    setCaseUploading(true);
    setCaseMessage('');
    try {
      const formData = new FormData();
      formData.append('file', file);
      const response = await axios.post(
        `/api/admin/programs/${selectedProgramCode}/case-files`,
        formData,
        { headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'multipart/form-data' } }
      );
      setCaseFiles(response.data?.caseFiles || []);
      setCaseMessage('Dokumen studi kasus berhasil diunggah.');
    } catch (error) {
      setCaseMessage(
        axios.isAxiosError(error)
          ? error.response?.data?.error || 'Gagal mengunggah dokumen.'
          : 'Gagal mengunggah dokumen.'
      );
    } finally {
      setCaseUploading(false);
    }
  };

  const handleQuestionAttachmentUpload = async (file: File) => {
    const token = localStorage.getItem('adminToken');
    if (!token) return;
    const programCode = activeQuestion.programCode || selectedProgramCode;
    const programQuestions = questions.filter(
      (question) => (question.programCode || programs[0]?.id || 'SE-402') === programCode
    );
    const orderNo = programQuestions.findIndex((question) => question.id === activeQuestion.id) + 1;
    if (orderNo <= 0) {
      setCaseMessage('Simpan butir soal terlebih dahulu sebelum mengunggah lampiran.');
      return;
    }
    const formData = new FormData();
    formData.append('file', file);
    formData.append('programCode', programCode);
    formData.append('orderNo', String(orderNo));
    try {
      const response = await axios.post('/api/admin/questions/attachment', formData, {
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'multipart/form-data' }
      });
      const stored = response.data?.data;
      if (stored) {
        setActiveQuestion((prev) => ({
          ...prev,
          attachmentUrl: stored.url,
          attachmentName: stored.name,
          attachmentMime: stored.mime
        }));
      }
      setCaseMessage('Lampiran soal terunggah.');
    } catch (error) {
      setCaseMessage(
        axios.isAxiosError(error)
          ? error.response?.data?.error || 'Gagal mengunggah lampiran soal.'
          : 'Gagal mengunggah lampiran soal.'
      );
    }
  };

  const handleCaseFileDelete = async (url: string) => {
    const token = localStorage.getItem('adminToken');
    if (!token) return;
    const fileName = url.split('/').pop() || '';
    try {
      const response = await axios.delete(
        `/api/admin/programs/${selectedProgramCode}/case-files/${encodeURIComponent(fileName)}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setCaseFiles(response.data?.caseFiles || []);
      setCaseMessage('Dokumen dihapus.');
    } catch {
      setCaseMessage('Gagal menghapus dokumen.');
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-border-slate p-6 shadow-xs space-y-6">
      {/* View Switcher Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
        <div>
          <div className="flex items-center gap-2">
            <span className="font-mono text-[11px] font-bold text-primary-navy bg-soft-blue px-2.5 py-0.5 rounded border border-accent-border">
              BANK SOAL AI
            </span>
            <Badge variant="navy">
              {viewMode === 'programs'
                ? `${programRows.reduce((sum, p) => sum + p.total, 0)} Total Soal • ${programRows.length} Program`
                : `${filtered.length} Butir Soal • ${selectedProgramCode}`}
            </Badge>
          </div>
          <h2 className="text-xl font-extrabold font-heading text-ink tracking-tight mt-1">
            Repositori Bank Soal &amp; Item Analytics
          </h2>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant={viewMode === 'programs' ? 'primary' : 'outline'}
            size="sm"
            onClick={() => setViewMode('programs')}
            className="text-xs flex items-center gap-1.5 cursor-pointer"
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Semua Program</span>
          </Button>
        </div>
      </div>

      {toastMessage && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-900 flex items-center gap-2 animate-fadeIn">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span className="font-semibold">{toastMessage}</span>
        </div>
      )}

      {/* ─── Program Overview ─── */}
      {viewMode === 'programs' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h3 className="text-sm font-bold text-ink">Bank Soal per Program Asesmen</h3>
              <p className="text-xs text-slate-500 mt-0.5">Pilih program untuk melihat dan mengelola butir soal CAT.</p>
            </div>
            <Badge variant="navy">{programRows.reduce((sum, program) => sum + program.total, 0)} Total Soal</Badge>
          </div>
          <div className="border border-slate-200 rounded-xl overflow-hidden bg-white">
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50">
                  <TableHead className="w-24">Kode</TableHead>
                  <TableHead>Program Asesmen</TableHead>
                  <TableHead className="w-28 text-center">Jumlah Soal</TableHead>
                  <TableHead className="w-28 text-center">Tipe Soal</TableHead>
                  <TableHead className="w-28 text-center">Published</TableHead>
                  <TableHead className="w-32 text-right">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {programRows.map((program) => (
                  <TableRow key={program.id}>
                    <TableCell className="font-mono text-xs font-bold text-primary-navy">{program.id}</TableCell>
                    <TableCell>
                      <p className="text-sm font-semibold text-slate-800">{program.title}</p>
                      <p className="text-[11px] text-slate-500">{program.companyName}</p>
                    </TableCell>
                    <TableCell className="text-center">
                      <span className="font-mono font-bold text-slate-700">{program.total}</span>
                      <div className="text-[10px] text-slate-500 mt-0.5">
                        Psikotes: <strong className="text-indigo-700">{program.psikotesCount}</strong> • Kompetensi:{' '}
                        <strong className="text-primary-navy">{program.kompetensiCount}</strong>
                      </div>
                    </TableCell>
                    <TableCell className="text-center text-sm text-slate-600">{program.typeCount}</TableCell>
                    <TableCell className="text-center text-sm text-emerald-700 font-semibold">{program.published}</TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="outline"
                        size="xs"
                        onClick={() => {
                          setSelectedProgramCode(program.id);
                          setFilterType('all');
                          setViewMode('table');
                        }}
                        className="text-xs"
                      >
                        Kelola Soal
                        <ArrowRight className="w-3 h-3 ml-1" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      )}

      {/* ─── TAB 1: Tabel Soal ─── */}
      {(viewMode === 'table' || viewMode === 'editor') && (
        <div className="space-y-4">
          <div className="rounded-xl border border-slate-200 bg-white p-4 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
              <div className="flex flex-col sm:flex-row sm:items-end gap-3">
                <Button variant="ghost" size="sm" onClick={() => setViewMode('programs')} className="text-xs self-start sm:self-auto">
                  <ChevronLeft className="w-3.5 h-3.5 mr-1" />
                  Semua Program
                </Button>
                <div className="min-w-0">
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">Program Asesmen</label>
                  <select value={selectedProgramCode} onChange={(e) => setSelectedProgramCode(e.target.value)} className="w-full sm:w-[360px] h-11 px-3.5 py-2 bg-white border border-slate-300 rounded-xl text-sm font-semibold text-slate-800 shadow-2xs cursor-pointer focus:outline-none focus:border-primary-navy">
                    {programs.map((program) => (
                      <option key={program.id} value={program.id}>[{program.id}] {program.title}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">Pencarian</label>
                <div className="relative">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input type="text" value={searchKeyword} onChange={(e) => setSearchKeyword(e.target.value)} placeholder="Cari kode atau teks soal..." className="w-full h-11 pl-10 pr-3.5 py-2 bg-white border border-slate-300 rounded-xl text-sm outline-none focus:border-primary-navy" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">Tipe Soal</label>
                <select value={filterType} onChange={(e) => setFilterType(e.target.value)} className="w-full h-11 px-3.5 py-2 bg-white border border-slate-300 rounded-xl text-sm font-semibold text-slate-800 shadow-2xs cursor-pointer focus:outline-none focus:border-primary-navy">
                  <option value="all">Semua Tipe</option>
                  <option value="Pilihan Ganda">Pilihan Ganda</option>
                  <option value="Multi-Select">Multi-Select</option>
                  <option value="Isian Singkat">Isian Singkat</option>
                  <option value="Esai">Esai</option>
                  <option value="Matching">Matching</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">Kesulitan</label>
                <select value={filterDiff} onChange={(e) => setFilterDiff(e.target.value)} className="w-full h-11 px-3.5 py-2 bg-white border border-slate-300 rounded-xl text-sm font-semibold text-slate-800 shadow-2xs cursor-pointer focus:outline-none focus:border-primary-navy">
                  <option value="all">Semua Kesulitan</option>
                  <option value="Mudah">Mudah</option>
                  <option value="Sedang">Sedang</option>
                  <option value="Sulit">Sulit</option>
                </select>
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-4 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h3 className="text-sm font-bold text-ink flex items-center gap-2">
                  <Paperclip className="w-4 h-4 text-primary-navy" />
                  Dokumen Studi Kasus Program [{selectedProgramCode}]
                </h3>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Unggah PDF/DOCX pendukung (BR-EX-08, BR-IB-03). Dokumen tampil pada panel split-view peserta saat ujian.
                </p>
              </div>
              <label className="inline-flex items-center gap-2 px-3 py-2 rounded-xl border border-slate-200 bg-white text-xs font-semibold text-slate-700 cursor-pointer hover:bg-slate-50">
                <Upload className="w-3.5 h-3.5" />
                {caseUploading ? 'Mengunggah...' : 'Unggah Dokumen'}
                <input
                  type="file"
                  className="hidden"
                  accept=".pdf,.doc,.docx,.png,.jpg,.jpeg,.txt"
                  disabled={caseUploading}
                  onChange={(event) => {
                    const file = event.target.files?.[0];
                    if (file) void handleCaseFileUpload(file);
                    event.target.value = '';
                  }}
                />
              </label>
            </div>
            {caseMessage && <p className="text-[11px] text-slate-600">{caseMessage}</p>}
            {caseFiles.length === 0 ? (
              <p className="text-[11px] text-slate-500">Belum ada dokumen studi kasus untuk program ini.</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {caseFiles.map((file) => (
                  <span key={file.url} className="inline-flex items-center gap-2 px-2.5 py-1.5 rounded-lg border border-slate-200 bg-slate-50 text-[11px] font-medium text-slate-700">
                    <FileText className="w-3 h-3 text-primary-navy" />
                    <a href={file.url} target="_blank" rel="noreferrer" className="hover:underline">
                      {file.name}
                    </a>
                    <button
                      type="button"
                      onClick={() => void handleCaseFileDelete(file.url)}
                      className="text-rose-600 hover:text-rose-700 cursor-pointer"
                      title="Hapus dokumen"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Kategori Soal Switcher: Soal Psikotes vs Uji Kompetensi */}
          <div className="rounded-xl border border-slate-200 bg-white p-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => {
                  setActiveCategory('psikotes');
                  setFilterType('all');
                }}
                className={`flex items-center justify-between gap-3 rounded-xl border px-4 py-3 text-left transition cursor-pointer ${
                  activeCategory === 'psikotes'
                    ? 'border-indigo-500 bg-indigo-50/80 shadow-xs'
                    : 'border-slate-200 bg-slate-50/60 hover:bg-slate-100/70'
                }`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div
                    className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${
                      activeCategory === 'psikotes'
                        ? 'bg-indigo-600 text-white'
                        : 'bg-white border border-slate-200 text-slate-600'
                    }`}
                  >
                    <Brain className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-slate-900">Soal Psikotes</p>
                    <p className="text-[11px] text-slate-500 truncate">
                      Penalaran logis, numerik, verbal &amp; kepribadian
                    </p>
                  </div>
                </div>
                <span
                  className={`px-2.5 py-1 rounded-full text-xs font-mono font-bold shrink-0 ${
                    activeCategory === 'psikotes'
                      ? 'bg-indigo-600 text-white'
                      : 'bg-white border border-slate-200 text-slate-700'
                  }`}
                >
                  {categoryCounts.psikotes} Soal
                </span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setActiveCategory('kompetensi');
                  setFilterType('all');
                }}
                className={`flex items-center justify-between gap-3 rounded-xl border px-4 py-3 text-left transition cursor-pointer ${
                  activeCategory === 'kompetensi'
                    ? 'border-primary-navy bg-soft-blue shadow-xs'
                    : 'border-slate-200 bg-slate-50/60 hover:bg-slate-100/70'
                }`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div
                    className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${
                      activeCategory === 'kompetensi'
                        ? 'bg-primary-navy text-white'
                        : 'bg-white border border-slate-200 text-slate-600'
                    }`}
                  >
                    <CheckSquare className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-slate-900">Uji Kompetensi</p>
                    <p className="text-[11px] text-slate-500 truncate">
                      Teknis, studi kasus, arsitektur &amp; materi program
                    </p>
                  </div>
                </div>
                <span
                  className={`px-2.5 py-1 rounded-full text-xs font-mono font-bold shrink-0 ${
                    activeCategory === 'kompetensi'
                      ? 'bg-primary-navy text-white'
                      : 'bg-white border border-slate-200 text-slate-700'
                  }`}
                >
                  {categoryCounts.kompetensi} Soal
                </span>
              </button>
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-4 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h3 className="text-sm font-bold text-ink flex items-center gap-2">
                  <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                  Import Soal dari Excel [{selectedProgramCode}]
                </h3>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Unduh template, isi soal berbagai tipe (PG, multi-select, isian, esai, matching), lalu unggah kembali. Soal masuk ke kategori aktif: <strong>{activeCategory === 'psikotes' ? 'Soal Psikotes' : 'Uji Kompetensi'}</strong>.
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Button variant="outline" size="sm" onClick={() => void handleDownloadQuestionTemplate()}>
                  <Download className="w-3.5 h-3.5 mr-1.5" />
                  Unduh Template
                </Button>
                <label className="inline-flex items-center gap-2 px-3 py-2 rounded-xl border border-slate-200 bg-white text-xs font-semibold text-slate-700 cursor-pointer hover:bg-slate-50">
                  <Upload className="w-3.5 h-3.5" />
                  {questionImporting ? 'Mengimpor...' : 'Import Excel'}
                  <input
                    type="file"
                    className="hidden"
                    accept=".xlsx,.xls,.csv"
                    disabled={questionImporting}
                    onChange={(event) => {
                      const file = event.target.files?.[0];
                      if (file) void handleImportQuestions(file);
                      event.target.value = '';
                    }}
                  />
                </label>
              </div>
            </div>
            {questionImportMessage && (
              <p className="text-[11px] text-slate-600 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2">
                {questionImportMessage}
              </p>
            )}
          </div>

          <div className="space-y-3">
            {filtered.length === 0 ? (
              <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center text-xs text-slate-500">
                Belum ada soal untuk filter ini. Gunakan tombol Tambah Soal Baru di bawah daftar.
              </div>
            ) : filtered.map((q, index) => (
              <div key={q.id} className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs space-y-3">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="w-8 h-8 rounded-lg bg-primary-navy text-white flex items-center justify-center font-mono font-bold text-xs">{index + 1}</span>
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-mono font-bold bg-slate-900 text-white shadow-2xs">
                      <span className="text-slate-400 font-normal">ID Soal:</span>
                      <span>{q.id}</span>
                    </span>
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold bg-blue-50 text-primary-navy border border-blue-200 shadow-2xs">
                      <Database className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                      <span>Sumber: <strong className="text-blue-950 font-bold">Master Bank Soal CAT [{selectedProgramCode || 'Umum'}]</strong></span>
                    </span>
                    <Badge variant={getQuestionCategory(q) === 'psikotes' ? 'warning' : 'navy'} format="soft">
                      {getQuestionCategory(q) === 'psikotes' ? 'Psikotes' : 'Uji Kompetensi'}
                    </Badge>
                    <Badge variant="navy" format="soft">{q.type}</Badge>
                    <Badge variant={q.difficulty === 'Sulit' ? 'danger' : q.difficulty === 'Sedang' ? 'warning' : 'success'} format="soft">{q.difficulty}</Badge>
                    <Badge variant={q.status === 'Published' ? 'success' : q.status === 'Review' ? 'warning' : 'neutral'} format="soft">{q.status}</Badge>
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-2 text-xs bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-200/80 text-slate-600">
                  <span className="font-semibold text-slate-700 flex items-center gap-1.5">
                    <Database className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                    Sumber Bank Soal CAT:
                  </span>
                  <span className="text-blue-950 font-semibold">Master Bank Soal CAT [{selectedProgramCode || 'Umum'}]</span>
                  <span className="text-slate-300">•</span>
                  <span className="font-semibold text-slate-700">ID Soal:</span>
                  <span className="font-mono font-bold text-slate-900 bg-white px-2 py-0.5 rounded border border-slate-300">{q.id}</span>
                </div>
                <QuestionFormFields
                  question={q}
                  onChange={(patch) => handleInlineFieldChange(q.id, patch)}
                  onSave={handleInlineCommit}
                  onUploadAttachment={(file) => void handleInlineAttachmentUpload(q, file)}
                  onRemoveAttachment={() =>
                    commitQuestions(
                      questions.map((item) =>
                        item.id === q.id
                          ? { ...item, attachmentUrl: null, attachmentName: null, attachmentMime: null }
                          : item
                      )
                    )
                  }
                  onDelete={() => handleDeleteQuestion(q.id)}
                  headerLabel={`Detail Soal #${index + 1}`}
                />
              </div>
            ))}
          </div>

          <div className="pt-2 flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-t border-slate-100">
            <p className="text-[11px] text-slate-500">
              Tambah satu butir soal, lalu atur detailnya pada form di bawah tanpa berpindah halaman.
            </p>
            <Button
              variant="primary"
              size="sm"
              onClick={() => handleCreateNew('Pilihan Ganda', activeCategory)}
              className="text-xs flex items-center gap-1.5 cursor-pointer shrink-0"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Tambah Soal Baru</span>
            </Button>
          </div>
        </div>
      )}

      {/* ─── TAB 2: Soal Editor (inline di halaman yang sama) ─── */}
      {viewMode === 'editor' && (
        <div id="question-editor" className="scroll-mt-24 max-w-3xl">
          <QuestionFormFields
            question={activeQuestion}
            onChange={(patch) => setActiveQuestion((prev) => ({ ...prev, ...patch }))}
            onSave={handleSaveQuestion}
            onCancel={() => setViewMode('table')}
            onUploadAttachment={(file) => void handleQuestionAttachmentUpload(file)}
            onRemoveAttachment={() =>
              setActiveQuestion((prev) => ({
                ...prev,
                attachmentUrl: null,
                attachmentName: null,
                attachmentMime: null
              }))
            }
            onDelete={
              isEditingExisting
                ? () => {
                    handleDeleteQuestion(activeQuestion.id);
                    setViewMode('table');
                  }
                : undefined
            }
            headerLabel={isEditingExisting ? `Edit Soal: ${activeQuestion.id}` : 'Tambah Butir Soal Baru'}
          />
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
