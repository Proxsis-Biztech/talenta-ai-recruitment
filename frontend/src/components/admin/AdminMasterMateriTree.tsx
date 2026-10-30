import React, { useState, useMemo } from 'react';
import {
  FileText,
  Plus,
  Save,
  CheckCircle2,
  Layers,
  Sparkles,
  BookOpen,
  Trash2,
  X,
  Check,
  Edit2,
  Building2,
  Filter,
  TrendingUp,
  ShieldCheck,
  RotateCcw,
  Search,
  Eye,
  Download,
  Award,
  ChevronDown,
  ExternalLink,
  SlidersHorizontal,
  CheckSquare,
  Square
} from 'lucide-react';
import { Button, Badge, Card, CardContent, Modal } from '../ui';
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell
} from '../ui/Table';

export interface CompanyOption {
  id: string;
  name: string;
  code: string;
  color: 'blue' | 'red' | 'purple' | 'emerald' | 'cyan';
  bgLight: string;
  textDark: string;
  borderColor: string;
}

export const MASTER_COMPANIES: CompanyOption[] = [
  {
    id: 'PT-MANDIRI',
    name: 'PT Bank Mandiri (Persero) Tbk',
    code: 'BMRI',
    color: 'blue',
    bgLight: 'bg-blue-50',
    textDark: 'text-blue-700',
    borderColor: 'border-blue-200'
  },
  {
    id: 'PT-TELKOM',
    name: 'PT Telkom Indonesia Tbk',
    code: 'TLKM',
    color: 'red',
    bgLight: 'bg-red-50',
    textDark: 'text-red-700',
    borderColor: 'border-red-200'
  },
  {
    id: 'PT-CIMB',
    name: 'PT Bank CIMB Niaga Tbk',
    code: 'CIMB',
    color: 'purple',
    bgLight: 'bg-purple-50',
    textDark: 'text-purple-700',
    borderColor: 'border-purple-200'
  },
  {
    id: 'PT-ASTRA',
    name: 'PT Astra International Tbk',
    code: 'ASII',
    color: 'emerald',
    bgLight: 'bg-emerald-50',
    textDark: 'text-emerald-700',
    borderColor: 'border-emerald-200'
  },
  {
    id: 'PT-PERTAMINA',
    name: 'PT Pertamina Hulu Energi',
    code: 'PHE',
    color: 'cyan',
    bgLight: 'bg-cyan-50',
    textDark: 'text-cyan-700',
    borderColor: 'border-cyan-200'
  }
];

export const ASSESSMENT_TYPES = [
  'Technical & Hard Competency',
  'Behavioral & Leadership (BARS)',
  'Cognitive & Aptitude Test',
  'Culture & Core Values (AKHLAK)'
] as const;

export const ASSESSMENT_LEVELS = [
  'Level 1: Entry / Fresh Graduate (ODP/MT)',
  'Level 2: Mid-Level / Professional Specialist',
  'Level 3: Senior / Lead Specialist',
  'Level 4: Managerial / Executive Head'
] as const;

export interface MasterMateriItem {
  id: string;
  code: string;
  title: string;
  category: string;
  subcategory?: string;
  competency?: string;
  companyId: string;
  companyName: string;
  assessmentType: (typeof ASSESSMENT_TYPES)[number];
  assessmentLevel: (typeof ASSESSMENT_LEVELS)[number];
  type: 'Studi Kasus' | 'Teori' | 'Algoritma' | 'Praktikum';
  version: string;
  content: string;
  rubric: string;
  behavioralIndicators: string[];
  status?: 'Aktif' | 'Draft' | 'Reviu';
  updatedAt?: string;
}

const STORAGE_KEY = 'talenta_master_materi_table_v2';

const INITIAL_MATERI_LIST: MasterMateriItem[] = [
  {
    id: 'mat-mandiri-1',
    code: 'BMRI-DATA-02',
    title: 'Modul Credit Scoring Telemetry & Fraud Detection Pipeline (BMRI-DATA-02)',
    category: 'Finansial, Credit Risk & Data Science',
    subcategory: 'Pemodelan Risiko Kredit & Algoritma Fraud Machine Learning',
    competency: 'Risk Analytics, Probability of Default (PD) & Telemetry',
    companyId: 'PT-MANDIRI',
    companyName: 'PT Bank Mandiri (Persero) Tbk',
    assessmentType: 'Technical & Hard Competency',
    assessmentLevel: 'Level 3: Senior / Lead Specialist',
    type: 'Studi Kasus',
    version: 'v3.2',
    content:
      'Materi uji komprehensif mencakup arsitektur telemetry transaksi debit/kredit, reduksi bias algoritma scoring, deteksi anomali rekening dormant, dan pelaporan kepatuhan regulasi OJK/BI.',
    rubric:
      'Standar BARS 1-5 berdasarkan ketepatan kalibrasi matriks konfusi (Precision/Recall), mitigasi False Positive fraud alert, dan desain resilient data stream pipeline.',
    behavioralIndicators: [
      'Mampu merancang pipeline fitur credit scoring real-time dengan latency < 150ms',
      'Mengidentifikasi anomali velocity transaksi kartu debit tanpa mengganggu legitimate cardholder',
      'Menerapkan explainable AI (SHAP/LIME) untuk justifikasi penolakan kredit sesuai POJK'
    ],
    status: 'Aktif',
    updatedAt: '2026-10-30'
  },
  {
    id: 'mat-mandiri-2',
    code: 'BMRI-OUTAGE-01',
    title: 'Penanganan Insiden Outage Super-App Livin & Rekonsiliasi Saldo',
    category: 'Finansial, Credit Risk & Data Science',
    subcategory: 'Digital Banking Transformation & Core Outage Leadership',
    competency: 'Crisis Communication & High Concurrency Triage',
    companyId: 'PT-MANDIRI',
    companyName: 'PT Bank Mandiri (Persero) Tbk',
    assessmentType: 'Behavioral & Leadership (BARS)',
    assessmentLevel: 'Level 2: Mid-Level / Professional Specialist',
    type: 'Studi Kasus',
    version: 'v2.0',
    content:
      'Simulasi manajemen krisis ketika terjadi lonjakan traffic gajian (payroll peak) yang mengakibatkan timeout pada microservice transfer antarbank dan antrean dispute nasabah di media sosial.',
    rubric:
      'Skala BARS 1-5 menguji ketenangan dalam tekanan, prioritasi aktivasi read-only fallback gateway, serta koordinasi eskalasi ke Dewan Direksi.',
    behavioralIndicators: [
      'Mengaktifkan status degradasi layanan secara terkontrol dalam 5 menit pertama',
      'Menyusun rilis transparansi komunikasi ke publik bersama tim Corporate Secretary',
      'Memimpin rekonsiliasi data saldo terdebit ganda dengan SLA penyelesaian maksimal 24 jam'
    ],
    status: 'Aktif',
    updatedAt: '2026-10-29'
  },
  {
    id: 'mat-mandiri-3',
    code: 'BMRI-AKHLAK-01',
    title: 'Integritas Etika Kerja & Pencegahan Benturan Kepentingan Kredit',
    category: 'Tata Nilai AKHLAK Mandiri & Integritas Perbankan',
    subcategory: 'Tata Nilai AKHLAK Mandiri & Integritas Perbankan',
    competency: 'Nilai Amanah & Fiduciary Duty Pegawai Bank',
    companyId: 'PT-MANDIRI',
    companyName: 'PT Bank Mandiri (Persero) Tbk',
    assessmentType: 'Culture & Core Values (AKHLAK)',
    assessmentLevel: 'Level 1: Entry / Fresh Graduate (ODP/MT)',
    type: 'Teori',
    version: 'v1.5',
    content:
      'Uji kepatuhan terhadap prinsip 4 Eyes Principles pada persetujuan fasilitas kredit komersial dan penolakan gratifikasi dari nasabah debitur.',
    rubric:
      'Penilaian konsistensi moral kandidat menghadapi dilema target bisnis vs kepatuhan SOP perbankan.',
    behavioralIndicators: [
      'Menolak tegas pemberian imbalan atau fasilitas khusus dari calon debitur',
      'Melaporkan potensi konflik kepentingan keluarga dalam pengajuan fasilitas KPR/KTA',
      'Menjaga kerahasiaan data simpanan nasabah sesuai amanat UU PDP No. 27/2022'
    ],
    status: 'Aktif',
    updatedAt: '2026-10-28'
  },
  {
    id: 'mat-telkom-1',
    code: 'TLKM-RES-01',
    title: 'Modul Mitigasi Cascading Failure & Circuit Breaker (SE-402)',
    category: 'Rekayasa Perangkat Lunak (Software Engineering)',
    subcategory: 'Arsitektur Sistem Terdistribusi & Telecom Resilience',
    competency: 'Microservices & Fault Tolerance Patterns',
    companyId: 'PT-TELKOM',
    companyName: 'PT Telkom Indonesia Tbk',
    assessmentType: 'Technical & Hard Competency',
    assessmentLevel: 'Level 3: Senior / Lead Specialist',
    type: 'Studi Kasus',
    version: 'v2.1',
    content:
      'Materi pengujian teknik fallback dan implementasi pattern Circuit Breaker menggunakan Resilience4j / Envoy Proxy pada backbone jaringan telekomunikasi berbeban tinggi.',
    rubric:
      'Skala BARS 1-5 berdasarkan kemampuan mendiagnosis connection pool exhaustion, merancang state Half-Open, dan menerapkan distributed tracing.',
    behavioralIndicators: [
      'Mampu mengidentifikasi titik kegagalan tunggal (single point of failure) pada gateway',
      'Menerapkan rate limiting dan bulkhead pattern secara sistematis pada downstream services',
      'Menjelaskan trade-off antara ketersediaan (availability) dan konsistensi data dalam CAP theorem'
    ],
    status: 'Aktif',
    updatedAt: '2026-10-30'
  },
  {
    id: 'mat-telkom-2',
    code: 'TLKM-DB-02',
    title: 'Analisis Profiling Query & Pencegahan Index Scan Bottleneck',
    category: 'Rekayasa Perangkat Lunak (Software Engineering)',
    subcategory: 'Manajemen Data & Basis Data Enterprise Telkom',
    competency: 'Indexing Strategy & Query Planner Tuning',
    companyId: 'PT-TELKOM',
    companyName: 'PT Telkom Indonesia Tbk',
    assessmentType: 'Technical & Hard Competency',
    assessmentLevel: 'Level 2: Mid-Level / Professional Specialist',
    type: 'Praktikum',
    version: 'v1.4',
    content:
      'Panduan teknis pengujian kemampuan optimasi query EXPLAIN ANALYZE, partisi tabel PostgreSQL pada data billing jutaan pelanggan IndiHome, dan tuning memory cache.',
    rubric:
      'Kandidat dinilai dari ketepatan memilih jenis indeks (B-Tree vs BRIN untuk time-series) dan estimasi cost buffer.',
    behavioralIndicators: [
      'Mampu membaca output EXPLAIN ANALYZE dengan akurat dan cepat',
      'Mengetahui kapan partial index lebih efisien dibandingkan full table scan',
      'Menghindari locking tabel saat proses migrasi skema database production'
    ],
    status: 'Aktif',
    updatedAt: '2026-10-27'
  },
  {
    id: 'mat-telkom-3',
    code: 'TLKM-CLD-03',
    title: 'Simulasi Pemulihan Insiden Downtime Cloud Telkom 99.99% (CLD-301)',
    category: 'Rekayasa Perangkat Lunak (Software Engineering)',
    subcategory: 'Enterprise Cloud Architecture & Disaster Recovery',
    competency: 'Multi-Region High Availability & Business Continuity',
    companyId: 'PT-TELKOM',
    companyName: 'PT Telkom Indonesia Tbk',
    assessmentType: 'Behavioral & Leadership (BARS)',
    assessmentLevel: 'Level 4: Managerial / Executive Head',
    type: 'Studi Kasus',
    version: 'v2.5',
    content:
      'Evaluasi kepemimpinan teknis saat kabel bawah laut fiber optic putus, menuntut failover otomatis traffic nasional ke rute cadangan satelit & data center alternatif.',
    rubric:
      'Standar BARS 1-5 untuk level VP/Head: pengambilan keputusan di bawah ketidakpastian tinggi, alokasi bandwidth darurat, dan koordinasi stakeholder kementerian.',
    behavioralIndicators: [
      'Memutuskan peralihan routing global dalam toleransi RTO < 10 menit',
      'Memimpin komando war-room teknis lintas fungsi dengan instruksi yang terstruktur',
      'Mempersiapkan post-mortem review komprehensif untuk mencegah repetisi insiden'
    ],
    status: 'Aktif',
    updatedAt: '2026-10-26'
  },
  {
    id: 'mat-cimb-1',
    code: 'CIMB-TCB-01',
    title: 'Studi Kasus PT Anjak: Operasional CRM & Service Level (TCB-ANJAK)',
    category: 'Perbankan & Kasus In-Basket',
    subcategory: 'The Complete Banker (TCB) — Simulasi In-Basket PT Anjak',
    competency: 'Problem Solving, Fact Sheet Matching & Prioritisasi',
    companyId: 'PT-CIMB',
    companyName: 'PT Bank CIMB Niaga Tbk',
    assessmentType: 'Behavioral & Leadership (BARS)',
    assessmentLevel: 'Level 1: Entry / Fresh Graduate (ODP/MT)',
    type: 'Studi Kasus',
    version: 'v3.0',
    content:
      'Kandidat menganalisis dinamika operasional penurunan On-Time Performance (OTP) 99.2% ke 97.8%, penurunan Customer Satisfaction Index 89 ke 83, kenaikan biaya listrik +14%, dan antrean panjang teller.',
    rubric:
      'Standar BARS 1-5 mencakup Fact Sheet Matching, pengenalan akar masalah, dan penyusunan rekomendasi perbaikan 30-60-90 hari.',
    behavioralIndicators: [
      'Menempatkan penurunan OTP dan kepuasan nasabah sebagai Prioritas Utama (Priority 1)',
      'Menghubungkan keterlambatan vendor maintenance dengan kegagalan transaksi CRM/ATM',
      'Merumuskan mitigasi efisiensi biaya tanpa mengorbankan kualitas layanan nasabah'
    ],
    status: 'Aktif',
    updatedAt: '2026-10-30'
  },
  {
    id: 'mat-cimb-2',
    code: 'CIMB-KOG-02',
    title: 'Analisis Matriks Profitabilitas Nasabah & Trade-Off Likuiditas',
    category: 'Perbankan & Kasus In-Basket',
    subcategory: 'Kognitif & Critical Business Decision',
    competency: 'Commercial Portfolio Yield & Liquidity Trade-Off',
    companyId: 'PT-CIMB',
    companyName: 'PT Bank CIMB Niaga Tbk',
    assessmentType: 'Cognitive & Aptitude Test',
    assessmentLevel: 'Level 2: Mid-Level / Professional Specialist',
    type: 'Algoritma',
    version: 'v1.2',
    content:
      'Pengujian penalaran numerik tingkat lanjut untuk mengukur Return on Risk-Adjusted Capital (RAROC) terhadap portofolio pembiayaan korporasi.',
    rubric:
      'Ketepatan perhitungan Net Interest Margin (NIM) dan sensitivitas suku bunga acuan BI Rate.',
    behavioralIndicators: [
      'Mampu mengkalkulasi skenario stress-test pergerakan suku bunga terhadap margin bank',
      'Menyeimbangkan antara likuiditas harian LDR dengan target profitabilitas lending'
    ],
    status: 'Aktif',
    updatedAt: '2026-10-25'
  },
  {
    id: 'mat-astra-1',
    code: 'ASII-OPS-01',
    title: 'Studi Kasus Efisiensi Logistik & Lean Manufacturing Astra',
    category: 'Management Trainee & Operational Excellence',
    subcategory: 'Astra Management Trainee — Kaizen & Lean Operations',
    competency: 'Continuous Improvement & Supply Chain Efficiency',
    companyId: 'PT-ASTRA',
    companyName: 'PT Astra International Tbk',
    assessmentType: 'Behavioral & Leadership (BARS)',
    assessmentLevel: 'Level 1: Entry / Fresh Graduate (ODP/MT)',
    type: 'Studi Kasus',
    version: 'v2.0',
    content:
      'Evaluasi implementasi Kaizen pada perakitan komponen otomotif untuk memangkas lead time 18% dan meminimalkan waste persediaan gudang.',
    rubric:
      'Penilaian BARS berfokus pada ketelitian identifikasi bottle-neck, komunikasi persuasif ke pekerja lapangan, dan orientasi mutu.',
    behavioralIndicators: [
      'Mengaplikasikan prinsip 5S (Seiri, Seiton, Seiso, Seiketsu, Shitsuke) pada alur kerja',
      'Mengajak tim bengkel berdiskusi memecahkan kendala tanpa saling menyalahkan'
    ],
    status: 'Aktif',
    updatedAt: '2026-10-29'
  },
  {
    id: 'mat-astra-2',
    code: 'ASII-LEAD-02',
    title: 'Kepemimpinan Lapangan & Manajemen Konflik Sub-Kontraktor Pabrik',
    category: 'Management Trainee & Operational Excellence',
    subcategory: 'Industrial Relations & Plant Supervision',
    competency: 'Negotiation, Assertiveness & Safety Culture',
    companyId: 'PT-ASTRA',
    companyName: 'PT Astra International Tbk',
    assessmentType: 'Behavioral & Leadership (BARS)',
    assessmentLevel: 'Level 3: Senior / Lead Specialist',
    type: 'Studi Kasus',
    version: 'v1.8',
    content:
      'Simulasi penanganan sengketa jam lembur dan keselamatan kerja teknisi vendor perakitan suku cadang kendaraan listrik di plant Karawang.',
    rubric:
      'Ketegasan menegakkan Astra Total Quality Control (ATQC) tanpa menimbulkan mogok kerja lapangan.',
    behavioralIndicators: [
      'Mendengarkan aspirasi perwakilan serikat pekerja vendor secara berimbang',
      'Menegakkan standard operasional prosedur APD wajib tanpa toleransi kompromi'
    ],
    status: 'Aktif',
    updatedAt: '2026-10-28'
  },
  {
    id: 'mat-pertamina-1',
    code: 'PHE-HSE-01',
    title: 'Prosedur Tanggap Darurat & Audit Kepatuhan Lingkungan Migas',
    category: 'HSSE & Drilling Engineering',
    subcategory: 'Oil & Gas Safety Protocol & HSE Zero Incident',
    competency: 'Offshore Emergency Shutdown & Incident Investigation',
    companyId: 'PT-PERTAMINA',
    companyName: 'PT Pertamina Hulu Energi',
    assessmentType: 'Technical & Hard Competency',
    assessmentLevel: 'Level 3: Senior / Lead Specialist',
    type: 'Studi Kasus',
    version: 'v2.2',
    content:
      'Pengujian protokol evakuasi rig lepas pantai saat terdeteksi kebocoran gas H2S bertekanan tinggi dan tata kelola pelaporan ESD ke SKK Migas.',
    rubric:
      'Skala BARS menguji ketegasan menghentikan operasi berbahaya (Stop Work Authority) tanpa kompromi.',
    behavioralIndicators: [
      'Menginstruksikan aktivasi emergency blow-out preventer tanpa ragu',
      'Menjaga koordinasi evakuasi personel helikopter dan kapal patroli penjaga laut'
    ],
    status: 'Aktif',
    updatedAt: '2026-10-30'
  },
  {
    id: 'mat-pertamina-2',
    code: 'PHE-AKHLAK-02',
    title: 'Budaya AKHLAK Kolaboratif: Sinergi Sub-Holding Upstream Migas',
    category: 'HSSE & Drilling Engineering',
    subcategory: 'Corporate Governance & Inter-Entity Synergies',
    competency: 'Cross-Entity Value Creation & Resource Sharing',
    companyId: 'PT-PERTAMINA',
    companyName: 'PT Pertamina Hulu Energi',
    assessmentType: 'Culture & Core Values (AKHLAK)',
    assessmentLevel: 'Level 2: Mid-Level / Professional Specialist',
    type: 'Teori',
    version: 'v1.6',
    content:
      'Studi integrasi logistik kapal tanker dan fasilitas refinery bersama lintas zona wilayah kerja blok Mahakam dan blok Rokan.',
    rubric:
      'Penilaian pada kemauan berbagi armada logistik guna efisiensi belanja modal (CAPEX) holding.',
    behavioralIndicators: [
      'Memprioritaskan kepentingan pasokan energi nasional di atas target parsial zona kerja',
      'Berkoordinasi proaktif dengan anak usaha holding untuk utilisasi aset bersama'
    ],
    status: 'Aktif',
    updatedAt: '2026-10-27'
  }
];

export function AdminMasterMateriTree() {
  const [materiList, setMateriList] = useState<MasterMateriItem[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.warn('Failed to parse saved materi list:', e);
    }
    return INITIAL_MATERI_LIST;
  });

  // Filters
  const [selectedCompanyId, setSelectedCompanyId] = useState<string>('ALL');
  const [selectedTypeFilter, setSelectedTypeFilter] = useState<string>('ALL');
  const [selectedLevelFilter, setSelectedLevelFilter] = useState<string>('ALL');
  const [selectedMatTypeFilter, setSelectedMatTypeFilter] = useState<string>('ALL');
  const [searchFilter, setSearchFilter] = useState<string>('');

  // Selected item checkboxes for batch actions
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  // Modals state
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [saveMessage, setSaveMessage] = useState('Perubahan Master Materi berhasil disimpan!');
  const [isEditorModalOpen, setIsEditorModalOpen] = useState(false);
  const [isPreviewModalOpen, setIsPreviewModalOpen] = useState(false);
  const [activeItem, setActiveItem] = useState<MasterMateriItem | null>(null);
  const [isCreatingNew, setIsCreatingNew] = useState(false);

  // Form state for editor
  const [formCode, setFormCode] = useState('');
  const [formTitle, setFormTitle] = useState('');
  const [formCategory, setFormCategory] = useState('');
  const [formSubcategory, setFormSubcategory] = useState('');
  const [formCompanyId, setFormCompanyId] = useState('PT-MANDIRI');
  const [formAssessmentType, setFormAssessmentType] = useState<(typeof ASSESSMENT_TYPES)[number]>(
    'Technical & Hard Competency'
  );
  const [formAssessmentLevel, setFormAssessmentLevel] = useState<(typeof ASSESSMENT_LEVELS)[number]>(
    'Level 3: Senior / Lead Specialist'
  );
  const [formType, setFormType] = useState<'Studi Kasus' | 'Teori' | 'Algoritma' | 'Praktikum'>('Studi Kasus');
  const [formVersion, setFormVersion] = useState('v1.0');
  const [formContent, setFormContent] = useState('');
  const [formRubric, setFormRubric] = useState('');
  const [formIndicators, setFormIndicators] = useState<string[]>([]);
  const [newIndicatorInput, setNewIndicatorInput] = useState('');

  // Save to localStorage helper
  const persistMateri = (updated: MasterMateriItem[], message = 'Perubahan Master Materi berhasil disimpan!') => {
    setMateriList(updated);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    } catch (e) {
      console.warn('Failed to save to localStorage:', e);
    }
    setSaveMessage(message);
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 3000);
  };

  // Filtered Items
  const filteredList = useMemo(() => {
    return materiList.filter((item) => {
      const matchCompany = selectedCompanyId === 'ALL' || item.companyId === selectedCompanyId;
      const matchType = selectedTypeFilter === 'ALL' || item.assessmentType === selectedTypeFilter;
      const matchLevel = selectedLevelFilter === 'ALL' || item.assessmentLevel === selectedLevelFilter;
      const matchMatType = selectedMatTypeFilter === 'ALL' || item.type === selectedMatTypeFilter;

      const q = searchFilter.toLowerCase().trim();
      const matchSearch =
        !q ||
        item.title.toLowerCase().includes(q) ||
        item.code.toLowerCase().includes(q) ||
        item.category.toLowerCase().includes(q) ||
        (item.subcategory && item.subcategory.toLowerCase().includes(q)) ||
        item.companyName.toLowerCase().includes(q) ||
        item.content.toLowerCase().includes(q);

      return matchCompany && matchType && matchLevel && matchMatType && matchSearch;
    });
  }, [materiList, selectedCompanyId, selectedTypeFilter, selectedLevelFilter, selectedMatTypeFilter, searchFilter]);

  // Statistics
  const stats = useMemo(() => {
    const total = materiList.length;
    const technical = materiList.filter((m) => m.assessmentType === 'Technical & Hard Competency').length;
    const behavioral = materiList.filter((m) => m.assessmentType === 'Behavioral & Leadership (BARS)').length;
    const akhlak = materiList.filter((m) => m.assessmentType === 'Culture & Core Values (AKHLAK)').length;
    const cognitive = materiList.filter((m) => m.assessmentType === 'Cognitive & Aptitude Test').length;
    return { total, technical, behavioral, akhlak, cognitive };
  }, [materiList]);

  // Open Create Modal
  const handleOpenCreate = () => {
    setIsCreatingNew(true);
    const comp = MASTER_COMPANIES.find((c) => c.id === selectedCompanyId) || MASTER_COMPANIES[0];
    const generatedCode = `${comp.code}-${Date.now().toString().slice(-4)}`;
    setFormCode(generatedCode);
    setFormTitle('');
    setFormCategory('Kompetensi Inti & Keahlian Khusus');
    setFormSubcategory('');
    setFormCompanyId(comp.id);
    setFormAssessmentType('Technical & Hard Competency');
    setFormAssessmentLevel('Level 2: Mid-Level / Professional Specialist');
    setFormType('Studi Kasus');
    setFormVersion('v1.0');
    setFormContent('');
    setFormRubric('Skala BARS 1-5 berdasarkan ketepatan analisa dan eksekusi solusi.');
    setFormIndicators([
      'Mampu mendemonstrasikan penguasaan kerangka kerja materi secara terstruktur',
      'Mengidentifikasi potensi risiko dan merumuskan mitigasi yang realistis'
    ]);
    setNewIndicatorInput('');
    setIsEditorModalOpen(true);
  };

  // Open Edit Modal
  const handleOpenEdit = (item: MasterMateriItem) => {
    setIsCreatingNew(false);
    setActiveItem(item);
    setFormCode(item.code);
    setFormTitle(item.title);
    setFormCategory(item.category);
    setFormSubcategory(item.subcategory || '');
    setFormCompanyId(item.companyId);
    setFormAssessmentType(item.assessmentType);
    setFormAssessmentLevel(item.assessmentLevel);
    setFormType(item.type);
    setFormVersion(item.version);
    setFormContent(item.content);
    setFormRubric(item.rubric);
    setFormIndicators([...item.behavioralIndicators]);
    setNewIndicatorInput('');
    setIsEditorModalOpen(true);
  };

  // Open Preview Modal
  const handleOpenPreview = (item: MasterMateriItem) => {
    setActiveItem(item);
    setIsPreviewModalOpen(true);
  };

  // Handle Save Form (Create or Edit)
  const handleSaveForm = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTitle.trim()) {
      alert('Judul materi tidak boleh kosong!');
      return;
    }

    const compObj = MASTER_COMPANIES.find((c) => c.id === formCompanyId);
    const companyName = compObj?.name || 'PT Mitra';

    if (isCreatingNew) {
      const newItem: MasterMateriItem = {
        id: `mat-custom-${Date.now()}`,
        code: formCode.trim() || `MOD-${Date.now().toString().slice(-4)}`,
        title: formTitle.trim(),
        category: formCategory.trim() || 'Umum',
        subcategory: formSubcategory.trim() || undefined,
        companyId: formCompanyId,
        companyName,
        assessmentType: formAssessmentType,
        assessmentLevel: formAssessmentLevel,
        type: formType,
        version: formVersion.trim() || 'v1.0',
        content: formContent.trim() || 'Deskripsi materi belum diisi.',
        rubric: formRubric.trim() || 'Skala penilaian BARS standar 1-5.',
        behavioralIndicators: formIndicators.length > 0 ? formIndicators : ['Mampu mendemonstrasikan kompetensi'],
        status: 'Aktif',
        updatedAt: new Date().toISOString().split('T')[0]
      };
      persistMateri([newItem, ...materiList], `Modul materi "${newItem.code}" berhasil ditambahkan!`);
    } else if (activeItem) {
      const updated = materiList.map((m) => {
        if (m.id === activeItem.id) {
          return {
            ...m,
            code: formCode.trim() || m.code,
            title: formTitle.trim(),
            category: formCategory.trim() || m.category,
            subcategory: formSubcategory.trim() || m.subcategory,
            companyId: formCompanyId,
            companyName,
            assessmentType: formAssessmentType,
            assessmentLevel: formAssessmentLevel,
            type: formType,
            version: formVersion.trim() || m.version,
            content: formContent.trim(),
            rubric: formRubric.trim(),
            behavioralIndicators: formIndicators,
            updatedAt: new Date().toISOString().split('T')[0]
          };
        }
        return m;
      });
      persistMateri(updated, `Modul materi "${activeItem.code}" berhasil diperbarui!`);
    }

    setIsEditorModalOpen(false);
  };

  // Handle Delete Single Item
  const handleDeleteItem = (id: string, code: string) => {
    if (window.confirm(`Yakin ingin menghapus materi "${code}" dari daftar master kurikulum?`)) {
      const updated = materiList.filter((m) => m.id !== id);
      persistMateri(updated, `Modul materi "${code}" berhasil dihapus.`);
      setSelectedIds((prev) => prev.filter((item) => item !== id));
    }
  };

  // Handle Delete Selected Batch
  const handleDeleteSelected = () => {
    if (selectedIds.length === 0) return;
    if (window.confirm(`Yakin ingin menghapus ${selectedIds.length} materi yang dipilih?`)) {
      const updated = materiList.filter((m) => !selectedIds.includes(m.id));
      persistMateri(updated, `${selectedIds.length} modul materi berhasil dihapus.`);
      setSelectedIds([]);
    }
  };

  // Checkbox Selection
  const toggleSelectAll = () => {
    if (selectedIds.length === filteredList.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredList.map((m) => m.id));
    }
  };

  const toggleSelectOne = (id: string) => {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]));
  };

  // Indicators management inside form
  const handleAddFormIndicator = () => {
    if (!newIndicatorInput.trim()) return;
    setFormIndicators((prev) => [...prev, newIndicatorInput.trim()]);
    setNewIndicatorInput('');
  };

  const handleRemoveFormIndicator = (idx: number) => {
    setFormIndicators((prev) => prev.filter((_, i) => i !== idx));
  };

  // Export to CSV
  const handleExportCSV = () => {
    const headers = [
      'Kode Modul',
      'Judul Materi',
      'Perusahaan',
      'Jenis Asesmen',
      'Level Asesmen',
      'Tipe Materi',
      'Versi',
      'Silabus Kategori',
      'Jumlah Indikator BARS'
    ];
    const rows = filteredList.map((m) => [
      `"${m.code}"`,
      `"${m.title.replace(/"/g, '""')}"`,
      `"${m.companyName}"`,
      `"${m.assessmentType}"`,
      `"${m.assessmentLevel}"`,
      `"${m.type}"`,
      `"${m.version}"`,
      `"${m.category}"`,
      m.behavioralIndicators.length
    ]);

    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `Master_Materi_Kurikulum_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Reset to default seed
  const handleResetDefault = () => {
    if (window.confirm('Reset data master materi ke konfigurasi bawaan (default)? Semua materi kustom akan dihapus.')) {
      persistMateri(INITIAL_MATERI_LIST, 'Data master materi berhasil direset ke standar default.');
      setSelectedCompanyId('ALL');
      setSelectedTypeFilter('ALL');
      setSelectedLevelFilter('ALL');
      setSelectedMatTypeFilter('ALL');
      setSearchFilter('');
      setSelectedIds([]);
    }
  };

  // Company count badge helper
  const getCompanyCount = (companyId: string) => {
    if (companyId === 'ALL') return materiList.length;
    return materiList.filter((m) => m.companyId === companyId).length;
  };

  // Company styling helper
  const getCompanyBadge = (companyId: string) => {
    const comp = MASTER_COMPANIES.find((c) => c.id === companyId);
    if (!comp) {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold bg-slate-100 text-slate-700 border border-slate-200">
          <Building2 className="w-3.5 h-3.5 text-slate-500" />
          <span>PT Mitra</span>
        </span>
      );
    }
    return (
      <span
        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-extrabold border ${comp.bgLight} ${comp.textDark} ${comp.borderColor}`}
      >
        <span className="w-2 h-2 rounded-full bg-current opacity-80" />
        <span>{comp.code}</span>
        <span className="text-[10px] font-normal opacity-75 hidden xl:inline">({comp.name.split(' ')[1] || comp.name})</span>
      </span>
    );
  };

  // Assessment Type Badge
  const getTypeBadge = (type: string) => {
    if (type.includes('Technical')) {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
          <Layers className="w-3 h-3 text-blue-500" />
          <span>Technical CAT</span>
        </span>
      );
    }
    if (type.includes('Behavioral')) {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-purple-50 text-purple-700 border border-purple-200">
          <Award className="w-3 h-3 text-purple-500" />
          <span>Behavioral BARS</span>
        </span>
      );
    }
    if (type.includes('Culture') || type.includes('AKHLAK')) {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
          <ShieldCheck className="w-3 h-3 text-emerald-500" />
          <span>Budaya AKHLAK</span>
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
        <Sparkles className="w-3 h-3 text-amber-500" />
        <span>Kognitif</span>
      </span>
    );
  };

  // Level Badge
  const getLevelBadge = (level: string) => {
    let shortName = 'Level';
    let badgeClass = 'bg-slate-100 text-slate-700 border-slate-200';

    if (level.includes('Level 1')) {
      shortName = 'L1 • Entry / ODP';
      badgeClass = 'bg-teal-50 text-teal-800 border-teal-200';
    } else if (level.includes('Level 2')) {
      shortName = 'L2 • Specialist';
      badgeClass = 'bg-sky-50 text-sky-800 border-sky-200';
    } else if (level.includes('Level 3')) {
      shortName = 'L3 • Lead / Senior';
      badgeClass = 'bg-indigo-50 text-indigo-800 border-indigo-200 font-bold';
    } else if (level.includes('Level 4')) {
      shortName = 'L4 • Executive';
      badgeClass = 'bg-rose-50 text-rose-800 border-rose-200 font-extrabold';
    }

    return (
      <span className={`inline-block px-2.5 py-0.5 rounded-md text-[11px] border font-medium ${badgeClass}`}>
        {shortName}
      </span>
    );
  };

  return (
    <div className="bg-white rounded-3xl border border-border-slate p-6 sm:p-8 shadow-xs space-y-6 antialiased">
      {/* ─── Page Header ─── */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-5 border-b border-slate-100">
        <div>
          <div className="flex flex-wrap items-center gap-2 mb-1.5">
            <span className="font-mono text-[11px] font-bold text-primary-navy bg-soft-blue px-2.5 py-0.5 rounded-lg border border-accent-border">
              KURIKULUM &amp; MATERI
            </span>
            <Badge variant="navy">Master Silabus Per PT • Format Tabel Terpadu</Badge>
          </div>
          <h2 className="text-xl sm:text-2xl font-extrabold font-heading text-ink tracking-tight">
            Master Materi &amp; Kurikulum Kompetensi
          </h2>
          <p className="text-xs sm:text-sm text-muted-slate mt-0.5">
            Kelola seluruh modul silabus per PT Mitra, jenis evaluasi (Technical/BARS/Cognitive/AKHLAK), dan tingkat jabatan kandidat dalam tabel terstruktur.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          <Button
            variant="outline"
            size="sm"
            onClick={handleExportCSV}
            className="text-xs sm:text-sm py-2 px-3.5 rounded-xl flex items-center gap-1.5 cursor-pointer font-bold shadow-2xs"
            title="Ekspor data materi ke format CSV / Excel"
          >
            <Download className="w-4 h-4 text-slate-600" />
            <span>Ekspor CSV</span>
          </Button>

          <Button
            variant="primary"
            size="sm"
            onClick={handleOpenCreate}
            className="text-xs sm:text-sm py-2 px-4 rounded-xl flex items-center gap-1.5 cursor-pointer font-bold shadow-sm"
          >
            <Plus className="w-4 h-4" />
            <span>Tambah Materi Baru</span>
          </Button>
        </div>
      </div>

      {/* ─── SUCCESS ALERT BANNER ─── */}
      {saveSuccess && (
        <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-2xl text-xs sm:text-sm text-emerald-900 flex items-center justify-between gap-2.5 animate-fadeIn">
          <div className="flex items-center gap-2.5">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            <span className="font-bold">{saveMessage}</span>
          </div>
          <button
            onClick={() => setSaveSuccess(false)}
            className="text-emerald-700 hover:text-emerald-900 p-1 rounded-lg"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* ─── STATS METRIC CARDS ─── */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-[11px] font-bold uppercase tracking-wider">Total Modul</span>
            <BookOpen className="w-4 h-4 text-slate-600" />
          </div>
          <div className="text-xl sm:text-2xl font-black text-ink">{stats.total}</div>
          <div className="text-[10px] text-slate-400 mt-0.5">Modul Silabus Aktif</div>
        </div>

        <div className="p-3.5 rounded-2xl bg-blue-50/70 border border-blue-200/80">
          <div className="flex items-center justify-between text-blue-700 mb-1">
            <span className="text-[11px] font-bold uppercase tracking-wider">Technical CAT</span>
            <Layers className="w-4 h-4 text-blue-600" />
          </div>
          <div className="text-xl sm:text-2xl font-black text-blue-900">{stats.technical}</div>
          <div className="text-[10px] text-blue-600/80 mt-0.5">Uji Kemampuan Teknis</div>
        </div>

        <div className="p-3.5 rounded-2xl bg-purple-50/70 border border-purple-200/80">
          <div className="flex items-center justify-between text-purple-700 mb-1">
            <span className="text-[11px] font-bold uppercase tracking-wider">BARS Leadership</span>
            <Award className="w-4 h-4 text-purple-600" />
          </div>
          <div className="text-xl sm:text-2xl font-black text-purple-900">{stats.behavioral}</div>
          <div className="text-[10px] text-purple-600/80 mt-0.5">Studi Kasus &amp; Perilaku</div>
        </div>

        <div className="p-3.5 rounded-2xl bg-emerald-50/70 border border-emerald-200/80">
          <div className="flex items-center justify-between text-emerald-700 mb-1">
            <span className="text-[11px] font-bold uppercase tracking-wider">Budaya AKHLAK</span>
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-xl sm:text-2xl font-black text-emerald-900">{stats.akhlak}</div>
          <div className="text-[10px] text-emerald-600/80 mt-0.5">Nilai &amp; Etika Kerja</div>
        </div>

        <div className="p-3.5 rounded-2xl bg-amber-50/70 border border-amber-200/80 col-span-2 sm:col-span-1">
          <div className="flex items-center justify-between text-amber-800 mb-1">
            <span className="text-[11px] font-bold uppercase tracking-wider">Kognitif &amp; Aptitude</span>
            <Sparkles className="w-4 h-4 text-amber-600" />
          </div>
          <div className="text-xl sm:text-2xl font-black text-amber-900">{stats.cognitive}</div>
          <div className="text-[10px] text-amber-700/80 mt-0.5">Penalaran &amp; Logika</div>
        </div>
      </div>

      {/* ─── FILTER CONTROL BAR ─── */}
      <div className="bg-slate-50/90 rounded-2xl border border-slate-200 p-4 sm:p-5 space-y-4">
        {/* Company Filter Tabs */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-extrabold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
              <Building2 className="w-4 h-4 text-primary-navy" />
              <span>Pilih Master Perusahaan / PT Mitra:</span>
            </span>
            <span className="text-xs font-semibold text-slate-500">
              Menampilkan <strong>{filteredList.length}</strong> dari {materiList.length} modul
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => setSelectedCompanyId('ALL')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                selectedCompanyId === 'ALL'
                  ? 'bg-primary-navy text-white shadow-xs'
                  : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
              }`}
            >
              <span>Semua PT Mitra</span>
              <span
                className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                  selectedCompanyId === 'ALL' ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-600'
                }`}
              >
                {getCompanyCount('ALL')}
              </span>
            </button>

            {MASTER_COMPANIES.map((comp) => {
              const isSelected = selectedCompanyId === comp.id;
              const count = getCompanyCount(comp.id);
              return (
                <button
                  key={comp.id}
                  onClick={() => setSelectedCompanyId(comp.id)}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                    isSelected
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'bg-white text-slate-700 hover:text-primary-navy hover:bg-slate-100 border border-slate-200'
                  }`}
                >
                  <Building2 className={`w-3.5 h-3.5 ${isSelected ? 'text-white' : 'text-slate-400'}`} />
                  <span>{comp.name}</span>
                  <span
                    className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                      isSelected ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-600'
                    }`}
                  >
                    {count}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Secondary Filter Dropdowns & Search */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-3 border-t border-slate-200/80">
          <div>
            <label className="block text-[11px] font-bold text-slate-600 mb-1 flex items-center gap-1">
              <Layers className="w-3.5 h-3.5 text-blue-600" />
              <span>Jenis Asesmen:</span>
            </label>
            <select
              value={selectedTypeFilter}
              onChange={(e) => setSelectedTypeFilter(e.target.value)}
              className="w-full px-3 py-1.5 rounded-xl border border-slate-300 text-xs bg-white text-slate-800 font-semibold outline-hidden focus:ring-2 focus:ring-blue-500/20"
            >
              <option value="ALL">Semua Jenis Asesmen</option>
              {ASSESSMENT_TYPES.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-600 mb-1 flex items-center gap-1">
              <TrendingUp className="w-3.5 h-3.5 text-emerald-600" />
              <span>Level Asesmen:</span>
            </label>
            <select
              value={selectedLevelFilter}
              onChange={(e) => setSelectedLevelFilter(e.target.value)}
              className="w-full px-3 py-1.5 rounded-xl border border-slate-300 text-xs bg-white text-slate-800 font-semibold outline-hidden focus:ring-2 focus:ring-blue-500/20"
            >
              <option value="ALL">Semua Level Asesmen</option>
              {ASSESSMENT_LEVELS.map((lvl) => (
                <option key={lvl} value={lvl}>
                  {lvl}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-600 mb-1 flex items-center gap-1">
              <SlidersHorizontal className="w-3.5 h-3.5 text-purple-600" />
              <span>Tipe Modul:</span>
            </label>
            <select
              value={selectedMatTypeFilter}
              onChange={(e) => setSelectedMatTypeFilter(e.target.value)}
              className="w-full px-3 py-1.5 rounded-xl border border-slate-300 text-xs bg-white text-slate-800 font-semibold outline-hidden focus:ring-2 focus:ring-blue-500/20"
            >
              <option value="ALL">Semua Tipe Modul</option>
              <option value="Studi Kasus">Studi Kasus</option>
              <option value="Teori">Teori Konseptual</option>
              <option value="Algoritma">Algoritma</option>
              <option value="Praktikum">Praktikum / Lab</option>
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-600 mb-1 flex items-center gap-1">
              <Search className="w-3.5 h-3.5 text-amber-600" />
              <span>Cari Materi / Kode:</span>
            </label>
            <div className="flex items-center gap-1.5">
              <div className="relative flex-1">
                <input
                  type="text"
                  value={searchFilter}
                  onChange={(e) => setSearchFilter(e.target.value)}
                  placeholder="Ketik judul, kode, atau materi..."
                  className="w-full pl-8 pr-3 py-1.5 rounded-xl border border-slate-300 text-xs bg-white outline-hidden focus:ring-2 focus:ring-blue-500/20 font-medium"
                />
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                {searchFilter && (
                  <button
                    onClick={() => setSearchFilter('')}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {(selectedCompanyId !== 'ALL' ||
                selectedTypeFilter !== 'ALL' ||
                selectedLevelFilter !== 'ALL' ||
                selectedMatTypeFilter !== 'ALL' ||
                searchFilter) && (
                <button
                  onClick={() => {
                    setSelectedCompanyId('ALL');
                    setSelectedTypeFilter('ALL');
                    setSelectedLevelFilter('ALL');
                    setSelectedMatTypeFilter('ALL');
                    setSearchFilter('');
                  }}
                  title="Reset Semua Filter"
                  className="p-2 text-slate-500 hover:text-slate-800 bg-white border border-slate-300 rounded-xl cursor-pointer hover:bg-slate-100"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ─── BATCH ACTION STRIP (when items selected) ─── */}
      {selectedIds.length > 0 && (
        <div className="p-3 bg-blue-50/80 border border-blue-200 rounded-2xl flex items-center justify-between gap-3 text-xs animate-fadeIn">
          <div className="flex items-center gap-2">
            <span className="font-extrabold text-primary-navy">
              {selectedIds.length} materi dipilih
            </span>
            <span className="text-slate-500">• Tindakan masal:</span>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleDeleteSelected}
              className="text-xs py-1 px-3 text-red-600 hover:bg-red-50 border-red-200 flex items-center gap-1 cursor-pointer font-bold"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Hapus Terpilih</span>
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSelectedIds([])}
              className="text-xs py-1 px-2.5 text-slate-600 cursor-pointer"
            >
              Batal
            </Button>
          </div>
        </div>
      )}

      {/* ─── THE MASTER MATERI DATA TABLE ─── */}
      <div className="border border-slate-200 rounded-2xl overflow-hidden bg-white shadow-2xs">
        <Table>
          <TableHeader>
            <TableRow className="bg-slate-50/90 text-[11px] font-extrabold uppercase tracking-wider text-slate-600 border-b border-slate-200">
              <TableHead className="w-10 px-4 py-3.5 text-center">
                <button
                  onClick={toggleSelectAll}
                  className="cursor-pointer text-slate-500 hover:text-primary-navy"
                  title="Pilih Semua"
                >
                  {selectedIds.length === filteredList.length && filteredList.length > 0 ? (
                    <CheckSquare className="w-4 h-4 text-blue-600" />
                  ) : (
                    <Square className="w-4 h-4 text-slate-400" />
                  )}
                </button>
              </TableHead>
              <TableHead className="w-28 px-4 py-3.5">Kode Modul</TableHead>
              <TableHead className="px-4 py-3.5 min-w-[280px]">Judul Materi &amp; Silabus</TableHead>
              <TableHead className="w-40 px-4 py-3.5">PT Mitra</TableHead>
              <TableHead className="w-44 px-4 py-3.5">Jenis Asesmen</TableHead>
              <TableHead className="w-40 px-4 py-3.5">Level Jabatan</TableHead>
              <TableHead className="w-32 px-4 py-3.5">Tipe &amp; Versi</TableHead>
              <TableHead className="w-28 px-4 py-3.5 text-center">Indikator BARS</TableHead>
              <TableHead className="w-28 px-4 py-3.5 text-right">Aksi</TableHead>
            </TableRow>
          </TableHeader>

          <TableBody>
            {filteredList.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} className="py-16 text-center text-slate-400 space-y-2">
                  <BookOpen className="w-10 h-10 mx-auto text-slate-300" />
                  <p className="font-bold text-sm text-slate-700">Tidak ada modul materi yang cocok</p>
                  <p className="text-xs text-slate-500">
                    Coba sesuaikan filter perusahaan, jenis asesmen, level, atau kata kunci pencarian.
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setSelectedCompanyId('ALL');
                      setSelectedTypeFilter('ALL');
                      setSelectedLevelFilter('ALL');
                      setSelectedMatTypeFilter('ALL');
                      setSearchFilter('');
                    }}
                    className="text-xs mt-2"
                  >
                    Reset Filter
                  </Button>
                </TableCell>
              </TableRow>
            ) : (
              filteredList.map((item, idx) => {
                const isSelected = selectedIds.includes(item.id);
                return (
                  <TableRow
                    key={item.id}
                    className={`text-xs hover:bg-slate-50/80 transition-colors ${
                      isSelected ? 'bg-blue-50/50' : idx % 2 === 1 ? 'bg-slate-50/25' : 'bg-white'
                    }`}
                  >
                    {/* Checkbox */}
                    <TableCell className="px-4 py-3.5 text-center">
                      <button
                        onClick={() => toggleSelectOne(item.id)}
                        className="cursor-pointer text-slate-500 hover:text-blue-600"
                      >
                        {isSelected ? (
                          <CheckSquare className="w-4 h-4 text-blue-600" />
                        ) : (
                          <Square className="w-4 h-4 text-slate-300" />
                        )}
                      </button>
                    </TableCell>

                    {/* Kode Modul */}
                    <TableCell className="px-4 py-3.5 font-mono text-[11px] font-extrabold text-primary-navy">
                      <span className="bg-slate-100 text-slate-800 px-2 py-1 rounded-md border border-slate-200">
                        {item.code}
                      </span>
                    </TableCell>

                    {/* Judul & Silabus */}
                    <TableCell className="px-4 py-3.5">
                      <div className="space-y-0.5">
                        <div
                          onClick={() => handleOpenPreview(item)}
                          className="font-extrabold text-ink hover:text-blue-600 cursor-pointer transition-colors line-clamp-1 text-xs sm:text-sm"
                          title={item.title}
                        >
                          {item.title}
                        </div>
                        <div className="text-[11px] text-muted-slate flex items-center gap-1.5 font-medium">
                          <span>{item.category}</span>
                          {item.subcategory && (
                            <>
                              <span className="text-slate-300">•</span>
                              <span className="text-slate-500 line-clamp-1">{item.subcategory}</span>
                            </>
                          )}
                        </div>
                        <div className="text-[11px] text-slate-500 line-clamp-1 italic">
                          "{item.content}"
                        </div>
                      </div>
                    </TableCell>

                    {/* PT Mitra */}
                    <TableCell className="px-4 py-3.5">
                      {getCompanyBadge(item.companyId)}
                    </TableCell>

                    {/* Jenis Asesmen */}
                    <TableCell className="px-4 py-3.5">
                      {getTypeBadge(item.assessmentType)}
                    </TableCell>

                    {/* Level Jabatan */}
                    <TableCell className="px-4 py-3.5">
                      {getLevelBadge(item.assessmentLevel)}
                    </TableCell>

                    {/* Tipe & Versi */}
                    <TableCell className="px-4 py-3.5">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-[10px] font-bold bg-slate-100 text-slate-700 px-2 py-0.5 rounded-md border border-slate-200">
                          {item.type}
                        </span>
                        <span className="text-[10px] font-mono text-slate-500 bg-slate-50 px-1.5 py-0.5 rounded border border-slate-200">
                          {item.version}
                        </span>
                      </div>
                    </TableCell>

                    {/* Indikator BARS */}
                    <TableCell className="px-4 py-3.5 text-center">
                      <button
                        onClick={() => handleOpenPreview(item)}
                        className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 hover:bg-blue-50 hover:text-primary-navy border border-slate-200 cursor-pointer transition-all"
                        title="Klik untuk melihat indikator perilaku teramati"
                      >
                        <Award className="w-3 h-3 text-amber-600" />
                        <span>{item.behavioralIndicators.length} Evidence</span>
                      </button>
                    </TableCell>

                    {/* Aksi */}
                    <TableCell className="px-4 py-3.5 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          type="button"
                          onClick={() => handleOpenPreview(item)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 cursor-pointer transition-colors"
                          title="Lihat Detail Silabus"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleOpenEdit(item)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-amber-600 hover:bg-amber-50 cursor-pointer transition-colors"
                          title="Edit Modul Materi"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteItem(item.id, item.code)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 cursor-pointer transition-colors"
                          title="Hapus Modul"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>

        {/* Table Footer Summary */}
        <div className="p-3.5 bg-slate-50/70 border-t border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-slate-500 font-semibold">
          <div>
            Menampilkan <strong>{filteredList.length}</strong> modul dari total <strong>{materiList.length}</strong> master materi kurikulum
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={handleResetDefault}
              className="text-slate-400 hover:text-red-600 text-xs flex items-center gap-1 cursor-pointer font-medium"
              title="Reset semua materi ke default awal"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Reset Data Bawaan</span>
            </button>
          </div>
        </div>
      </div>

      {/* ─── MODAL EDIT / TAMBAH MATERI ─── */}
      <Modal
        isOpen={isEditorModalOpen}
        onClose={() => setIsEditorModalOpen(false)}
        title={isCreatingNew ? 'Tambah Modul Materi Baru' : `Edit Modul: ${formCode}`}
        size="lg"
      >
        <form onSubmit={handleSaveForm} className="p-6 space-y-5 text-xs max-h-[80vh] overflow-y-auto">
          {/* Target Perusahaan, Jenis Asesmen, Level Asesmen */}
          <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-3">
            <div className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
              <Building2 className="w-4 h-4 text-primary-navy" />
              <span>Segmentasi PT Mitra &amp; Jenis Evaluasi</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Perusahaan / PT Mitra</label>
                <select
                  value={formCompanyId}
                  onChange={(e) => setFormCompanyId(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs bg-white font-bold text-primary-navy outline-hidden focus:ring-2 focus:ring-blue-500/20"
                >
                  {MASTER_COMPANIES.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Jenis Asesmen</label>
                <select
                  value={formAssessmentType}
                  onChange={(e) => setFormAssessmentType(e.target.value as any)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs bg-white font-semibold text-slate-800 outline-hidden focus:ring-2 focus:ring-blue-500/20"
                >
                  {ASSESSMENT_TYPES.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Level Asesmen</label>
                <select
                  value={formAssessmentLevel}
                  onChange={(e) => setFormAssessmentLevel(e.target.value as any)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs bg-white font-semibold text-slate-800 outline-hidden focus:ring-2 focus:ring-blue-500/20"
                >
                  {ASSESSMENT_LEVELS.map((lvl) => (
                    <option key={lvl} value={lvl}>
                      {lvl}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Kode & Judul Modul */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block font-bold text-ink mb-1">Kode Modul / ID</label>
              <input
                type="text"
                required
                value={formCode}
                onChange={(e) => setFormCode(e.target.value)}
                placeholder="misal: BMRI-DATA-02"
                className="w-full px-3.5 py-2 rounded-xl border border-slate-300 font-mono font-bold text-xs outline-hidden focus:border-primary-navy"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block font-bold text-ink mb-1">Judul Materi / Modul</label>
              <input
                type="text"
                required
                value={formTitle}
                onChange={(e) => setFormTitle(e.target.value)}
                placeholder="misal: Modul Credit Scoring Telemetry & Fraud Detection"
                className="w-full px-3.5 py-2 rounded-xl border border-slate-300 font-semibold text-xs sm:text-sm outline-hidden focus:border-primary-navy"
              />
            </div>
          </div>

          {/* Kategori Silabus & Subkategori */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-ink mb-1">Kategori Silabus Induk</label>
              <input
                type="text"
                value={formCategory}
                onChange={(e) => setFormCategory(e.target.value)}
                placeholder="misal: Finansial, Credit Risk & Data Science"
                className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-xs outline-hidden focus:border-primary-navy"
              />
            </div>

            <div>
              <label className="block font-bold text-ink mb-1">Sub-Kategori / Topik Spesifik (Opsional)</label>
              <input
                type="text"
                value={formSubcategory}
                onChange={(e) => setFormSubcategory(e.target.value)}
                placeholder="misal: Pemodelan Risiko Kredit & Algoritma Fraud"
                className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-xs outline-hidden focus:border-primary-navy"
              />
            </div>
          </div>

          {/* Tipe & Versi */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-ink mb-1">Tipe Materi</label>
              <select
                value={formType}
                onChange={(e) => setFormType(e.target.value as any)}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs outline-hidden bg-white cursor-pointer font-medium"
              >
                <option value="Studi Kasus">Studi Kasus</option>
                <option value="Teori">Teori Konseptual</option>
                <option value="Algoritma">Algoritma &amp; Pemecahan Masalah</option>
                <option value="Praktikum">Praktikum / Lab</option>
              </select>
            </div>

            <div>
              <label className="block font-bold text-ink mb-1">Nomor Versi</label>
              <input
                type="text"
                value={formVersion}
                onChange={(e) => setFormVersion(e.target.value)}
                placeholder="misal: v2.1"
                className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-mono outline-hidden"
              />
            </div>
          </div>

          {/* Deskripsi & Konten Pokok */}
          <div>
            <label className="block font-bold text-ink mb-1">Deskripsi Silabus &amp; Ruang Lingkup Materi</label>
            <textarea
              rows={3}
              value={formContent}
              onChange={(e) => setFormContent(e.target.value)}
              placeholder="Jelaskan cakupan materi, studi kasus, atau parameter teknis yang diujikan..."
              className="w-full p-3 rounded-xl border border-slate-300 text-xs outline-hidden leading-relaxed focus:border-primary-navy"
            />
          </div>

          {/* Panduan Rubrik Penilaian Asesor */}
          <div>
            <label className="block font-bold text-ink mb-1">
              Panduan Rubrik Penilaian Asesor (Standar BARS 1 - 5)
            </label>
            <textarea
              rows={2}
              value={formRubric}
              onChange={(e) => setFormRubric(e.target.value)}
              placeholder="Kriteria penilaian asesor, skala skor 1-5 berdasarkan ketepatan analisa atau tindakan kandidat..."
              className="w-full p-3 rounded-xl border border-slate-300 text-xs outline-hidden leading-relaxed focus:border-primary-navy"
            />
          </div>

          {/* Indikator Perilaku Teramati (Behavioral Evidence) */}
          <div className="space-y-2 pt-2 border-t border-slate-200">
            <div className="flex items-center justify-between">
              <label className="font-bold text-ink text-xs">
                Indikator Perilaku Teramati (Behavioral Evidence):
              </label>
              <span className="text-[11px] font-mono text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md">
                {formIndicators.length} Evidence Terdaftar
              </span>
            </div>

            <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
              {formIndicators.map((ind, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between gap-2 p-2 bg-slate-50 rounded-xl border border-slate-200 group"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="w-5 h-5 rounded-full bg-primary-navy text-white text-[10px] font-bold flex items-center justify-center shrink-0">
                      {idx + 1}
                    </span>
                    <span className="text-slate-800 text-xs truncate">{ind}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleRemoveFormIndicator(idx)}
                    className="text-slate-400 hover:text-red-600 p-1 rounded-md"
                    title="Hapus Indikator"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>

            {/* Input Add Indicator */}
            <div className="flex gap-2 pt-1">
              <input
                type="text"
                value={newIndicatorInput}
                onChange={(e) => setNewIndicatorInput(e.target.value)}
                placeholder="Ketik indikator perilaku baru lalu tekan Tambah..."
                className="flex-1 px-3 py-1.5 rounded-xl border border-slate-300 text-xs outline-hidden focus:border-primary-navy"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddFormIndicator();
                  }
                }}
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleAddFormIndicator}
                disabled={!newIndicatorInput.trim()}
                className="text-xs cursor-pointer px-3"
              >
                Tambah
              </Button>
            </div>
          </div>

          {/* Modal Actions */}
          <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-slate-200">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsEditorModalOpen(false)}
              className="text-xs py-2 px-4 cursor-pointer"
            >
              Batal
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="sm"
              className="text-xs py-2 px-5 cursor-pointer font-bold shadow-sm"
            >
              <Save className="w-4 h-4 mr-1.5" />
              <span>{isCreatingNew ? 'Simpan Modul Baru' : 'Perbarui Perubahan'}</span>
            </Button>
          </div>
        </form>
      </Modal>

      {/* ─── MODAL DETAIL / PREVIEW MATERI ─── */}
      <Modal
        isOpen={isPreviewModalOpen}
        onClose={() => setIsPreviewModalOpen(false)}
        title={activeItem ? `Pratinjau Modul: ${activeItem.code}` : 'Detail Modul'}
        size="lg"
      >
        {activeItem && (
          <div className="p-6 space-y-5 text-xs max-h-[80vh] overflow-y-auto">
            {/* Header Card */}
            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs font-black bg-primary-navy text-white px-2.5 py-1 rounded-lg">
                    {activeItem.code}
                  </span>
                  {getCompanyBadge(activeItem.companyId)}
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono text-slate-500 bg-white px-2 py-0.5 rounded border border-slate-200">
                    Versi: {activeItem.version}
                  </span>
                </div>
              </div>

              <div>
                <h3 className="text-base font-extrabold text-ink">{activeItem.title}</h3>
                <p className="text-xs text-muted-slate mt-0.5">
                  {activeItem.category} {activeItem.subcategory ? `• ${activeItem.subcategory}` : ''}
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-200/80">
                {getTypeBadge(activeItem.assessmentType)}
                {getLevelBadge(activeItem.assessmentLevel)}
                <span className="text-[10px] font-bold bg-slate-100 text-slate-700 px-2 py-0.5 rounded-md border border-slate-200">
                  Tipe: {activeItem.type}
                </span>
              </div>
            </div>

            {/* Scope Content */}
            <div className="space-y-1.5">
              <span className="font-extrabold text-slate-700 uppercase tracking-wider text-[11px]">
                Deskripsi &amp; Silabus Pokok
              </span>
              <div className="p-3.5 bg-white rounded-xl border border-slate-200 text-slate-800 leading-relaxed text-xs">
                {activeItem.content}
              </div>
            </div>

            {/* Rubric */}
            <div className="space-y-1.5">
              <span className="font-extrabold text-slate-700 uppercase tracking-wider text-[11px]">
                Panduan Rubrik Penilaian Asesor (Standar BARS)
              </span>
              <div className="p-3.5 bg-amber-50/60 rounded-xl border border-amber-200 text-amber-950 leading-relaxed text-xs">
                {activeItem.rubric}
              </div>
            </div>

            {/* Behavioral Indicators */}
            <div className="space-y-2">
              <span className="font-extrabold text-slate-700 uppercase tracking-wider text-[11px] flex items-center justify-between">
                <span>Indikator Perilaku Teramati (Evidence Checklist)</span>
                <span className="text-slate-400 font-normal">
                  {activeItem.behavioralIndicators.length} Indikator
                </span>
              </span>

              <div className="space-y-2">
                {activeItem.behavioralIndicators.map((ind, i) => (
                  <div
                    key={i}
                    className="flex items-start gap-3 p-3 bg-slate-50 rounded-xl border border-slate-200/80"
                  >
                    <span className="w-5 h-5 rounded-full bg-blue-600 text-white text-[11px] font-bold flex items-center justify-center shrink-0 mt-0.5">
                      {i + 1}
                    </span>
                    <span className="text-slate-800 font-medium text-xs leading-normal">{ind}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Footer Buttons */}
            <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-slate-200">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsPreviewModalOpen(false)}
                className="text-xs py-2 px-4 cursor-pointer"
              >
                Tutup
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={() => {
                  setIsPreviewModalOpen(false);
                  handleOpenEdit(activeItem);
                }}
                className="text-xs py-2 px-4 cursor-pointer font-bold"
              >
                <Edit2 className="w-3.5 h-3.5 mr-1.5" />
                <span>Edit Materi Ini</span>
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}

// Export alias for consistency
export { AdminMasterMateriTree as AdminMasterMateriTable };
