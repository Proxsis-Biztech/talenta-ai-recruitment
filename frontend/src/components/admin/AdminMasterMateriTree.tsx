import React, { useState, useMemo } from 'react';
import {
  Folder,
  FolderOpen,
  FileText,
  ChevronRight,
  ChevronDown,
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
  RotateCcw
} from 'lucide-react';
import { Button, Badge, Card, CardContent, Modal } from '../ui';

export interface CompanyOption {
  id: string;
  name: string;
  code: string;
  color: string;
}

export const MASTER_COMPANIES: CompanyOption[] = [
  { id: 'PT-MANDIRI', name: 'PT Bank Mandiri (Persero) Tbk', code: 'Mandiri', color: 'blue' },
  { id: 'PT-TELKOM', name: 'PT Telkom Indonesia Tbk', code: 'Telkom', color: 'red' },
  { id: 'PT-CIMB', name: 'PT Bank CIMB Niaga Tbk', code: 'CIMB', color: 'purple' },
  { id: 'PT-ASTRA', name: 'PT Astra International Tbk', code: 'Astra', color: 'emerald' },
  { id: 'PT-PERTAMINA', name: 'PT Pertamina Hulu Energi', code: 'Pertamina', color: 'cyan' },
];

export const ASSESSMENT_TYPES = [
  'Technical & Hard Competency',
  'Behavioral & Leadership (BARS)',
  'Cognitive & Aptitude Test',
  'Culture & Core Values (AKHLAK)',
] as const;

export const ASSESSMENT_LEVELS = [
  'Level 1: Entry / Fresh Graduate (ODP/MT)',
  'Level 2: Mid-Level / Professional Specialist',
  'Level 3: Senior / Lead Specialist',
  'Level 4: Managerial / Executive Head',
] as const;

export interface TreeNode {
  id: string;
  name: string;
  type: 'category' | 'subcategory' | 'competency' | 'material';
  companyId?: string; // 'PT-MANDIRI' | 'PT-TELKOM' | 'PT-CIMB' | 'PT-ASTRA' | 'PT-PERTAMINA' | 'ALL'
  companyName?: string;
  assessmentType?: string;
  assessmentLevel?: string;
  children?: TreeNode[];
  materialData?: {
    title: string;
    type: 'Teori' | 'Studi Kasus' | 'Algoritma' | 'Praktikum';
    version: string;
    companyId?: string;
    companyName?: string;
    assessmentType?: string;
    assessmentLevel?: string;
    content: string;
    rubric: string;
    behavioralIndicators: string[];
  };
}

const STORAGE_KEY = 'talenta_master_materi_tree_v2';

const INITIAL_TREE: TreeNode[] = [
  // ─── PT BANK MANDIRI (PERSERO) TBK ───
  {
    id: 'cat-mandiri-1',
    name: 'PT Bank Mandiri — Finansial, Credit Risk & Data Science',
    type: 'category',
    companyId: 'PT-MANDIRI',
    companyName: 'PT Bank Mandiri (Persero) Tbk',
    assessmentType: 'Technical & Hard Competency',
    assessmentLevel: 'Level 3: Senior / Lead Specialist',
    children: [
      {
        id: 'sub-mandiri-1',
        name: 'Pemodelan Risiko Kredit & Algoritma Fraud Machine Learning',
        type: 'subcategory',
        companyId: 'PT-MANDIRI',
        assessmentType: 'Technical & Hard Competency',
        assessmentLevel: 'Level 3: Senior / Lead Specialist',
        children: [
          {
            id: 'comp-mandiri-1',
            name: 'Risk Analytics, Probability of Default (PD) & Telemetry',
            type: 'competency',
            companyId: 'PT-MANDIRI',
            assessmentType: 'Technical & Hard Competency',
            assessmentLevel: 'Level 3: Senior / Lead Specialist',
            children: [
              {
                id: 'mat-mandiri-1',
                name: 'Modul Credit Scoring Telemetry & Fraud Detection Pipeline (BMRI-DATA-02)',
                type: 'material',
                companyId: 'PT-MANDIRI',
                companyName: 'PT Bank Mandiri (Persero) Tbk',
                assessmentType: 'Technical & Hard Competency',
                assessmentLevel: 'Level 3: Senior / Lead Specialist',
                materialData: {
                  title: 'Modul Credit Scoring Telemetry & Fraud Detection Pipeline (BMRI-DATA-02)',
                  type: 'Studi Kasus',
                  version: 'v3.2',
                  companyId: 'PT-MANDIRI',
                  companyName: 'PT Bank Mandiri (Persero) Tbk',
                  assessmentType: 'Technical & Hard Competency',
                  assessmentLevel: 'Level 3: Senior / Lead Specialist',
                  content:
                    'Materi uji komprehensif mencakup arsitektur telemetry transaksi debit/kredit, reduksi bias algoritma scoring, deteksi anomali rekening dormant, dan pelaporan kepatuhan regulasi OJK/BI.',
                  rubric:
                    'Standar BARS 1-5 berdasarkan ketepatan kalibrasi matriks konfusi (Precision/Recall), mitigasi False Positive fraud alert, dan desain resilient data stream pipeline.',
                  behavioralIndicators: [
                    'Mampu merancang pipeline fitur credit scoring real-time dengan latency < 150ms',
                    'Mengidentifikasi anomali velocity transaksi kartu debit tanpa mengganggu legitimate cardholder',
                    'Menerapkan explainable AI (SHAP/LIME) untuk justifikasi penolakan kredit sesuai POJK'
                  ]
                }
              }
            ]
          }
        ]
      },
      {
        id: 'sub-mandiri-2',
        name: 'Digital Banking Transformation & Core Outage Leadership',
        type: 'subcategory',
        companyId: 'PT-MANDIRI',
        assessmentType: 'Behavioral & Leadership (BARS)',
        assessmentLevel: 'Level 2: Mid-Level / Professional Specialist',
        children: [
          {
            id: 'comp-mandiri-2',
            name: 'Crisis Communication & High Concurrency Triage',
            type: 'competency',
            companyId: 'PT-MANDIRI',
            assessmentType: 'Behavioral & Leadership (BARS)',
            assessmentLevel: 'Level 2: Mid-Level / Professional Specialist',
            children: [
              {
                id: 'mat-mandiri-2',
                name: 'Penanganan Insiden Outage Super-App Livin & Rekonsiliasi Saldo',
                type: 'material',
                companyId: 'PT-MANDIRI',
                companyName: 'PT Bank Mandiri (Persero) Tbk',
                assessmentType: 'Behavioral & Leadership (BARS)',
                assessmentLevel: 'Level 2: Mid-Level / Professional Specialist',
                materialData: {
                  title: 'Penanganan Insiden Outage Super-App Livin & Rekonsiliasi Saldo',
                  type: 'Studi Kasus',
                  version: 'v2.0',
                  companyId: 'PT-MANDIRI',
                  companyName: 'PT Bank Mandiri (Persero) Tbk',
                  assessmentType: 'Behavioral & Leadership (BARS)',
                  assessmentLevel: 'Level 2: Mid-Level / Professional Specialist',
                  content:
                    'Simulasi manajemen krisis ketika terjadi lonjakan traffic gajian (payroll peak) yang mengakibatkan timeout pada microservice transfer antarbank dan antrean dispute nasabah di media sosial.',
                  rubric:
                    'Skala BARS 1-5 menguji ketenangan dalam tekanan, prioritasi aktivasi read-only fallback gateway, serta koordinasi eskalasi ke Dewan Direksi.',
                  behavioralIndicators: [
                    'Mengaktifkan status degradasi layanan secara terkontrol dalam 5 menit pertama',
                    'Menyusun rilis transparansi komunikasi ke publik bersama tim Corporate Secretary',
                    'Memimpin rekonsiliasi data saldo terdebit ganda dengan SLA penyelesaian maksimal 24 jam'
                  ]
                }
              }
            ]
          }
        ]
      },
      {
        id: 'sub-mandiri-3',
        name: 'Tata Nilai AKHLAK Mandiri & Integritas Perbankan',
        type: 'subcategory',
        companyId: 'PT-MANDIRI',
        assessmentType: 'Culture & Core Values (AKHLAK)',
        assessmentLevel: 'Level 1: Entry / Fresh Graduate (ODP/MT)',
        children: [
          {
            id: 'comp-mandiri-3',
            name: 'Nilai Amanah & Fiduciary Duty Pegawai Bank',
            type: 'competency',
            companyId: 'PT-MANDIRI',
            assessmentType: 'Culture & Core Values (AKHLAK)',
            assessmentLevel: 'Level 1: Entry / Fresh Graduate (ODP/MT)',
            children: [
              {
                id: 'mat-mandiri-3',
                name: 'Integritas Etika Kerja & Pencegahan Benturan Kepentingan Kredit',
                type: 'material',
                companyId: 'PT-MANDIRI',
                companyName: 'PT Bank Mandiri (Persero) Tbk',
                assessmentType: 'Culture & Core Values (AKHLAK)',
                assessmentLevel: 'Level 1: Entry / Fresh Graduate (ODP/MT)',
                materialData: {
                  title: 'Integritas Etika Kerja & Pencegahan Benturan Kepentingan Kredit',
                  type: 'Teori',
                  version: 'v1.5',
                  companyId: 'PT-MANDIRI',
                  companyName: 'PT Bank Mandiri (Persero) Tbk',
                  assessmentType: 'Culture & Core Values (AKHLAK)',
                  assessmentLevel: 'Level 1: Entry / Fresh Graduate (ODP/MT)',
                  content:
                    'Uji kepatuhan terhadap prinsip 4 Eyes Principles pada persetujuan fasilitas kredit komersial dan penolakan gratifikasi dari nasabah debitur.',
                  rubric:
                    'Penilaian konsistensi moral kandidat menghadapi dilema target bisnis vs kepatuhan SOP perbankan.',
                  behavioralIndicators: [
                    'Menolak tegas pemberian imbalan atau fasilitas khusus dari calon debitur',
                    'Melaporkan potensi konflik kepentingan keluarga dalam pengajuan fasilitas KPR/KTA',
                    'Menjaga kerahasiaan data simpanan nasabah sesuai amanat UU PDP No. 27/2022'
                  ]
                }
              }
            ]
          }
        ]
      }
    ]
  },

  // ─── PT TELKOM INDONESIA TBK ───
  {
    id: 'cat-telkom-1',
    name: 'PT Telkom Indonesia — Rekayasa Perangkat Lunak (Software Engineering)',
    type: 'category',
    companyId: 'PT-TELKOM',
    companyName: 'PT Telkom Indonesia Tbk',
    assessmentType: 'Technical & Hard Competency',
    assessmentLevel: 'Level 3: Senior / Lead Specialist',
    children: [
      {
        id: 'sub-telkom-1',
        name: 'Arsitektur Sistem Terdistribusi & Telecom Resilience',
        type: 'subcategory',
        companyId: 'PT-TELKOM',
        assessmentType: 'Technical & Hard Competency',
        assessmentLevel: 'Level 3: Senior / Lead Specialist',
        children: [
          {
            id: 'comp-telkom-1',
            name: 'Microservices & Fault Tolerance Patterns',
            type: 'competency',
            companyId: 'PT-TELKOM',
            assessmentType: 'Technical & Hard Competency',
            assessmentLevel: 'Level 3: Senior / Lead Specialist',
            children: [
              {
                id: 'mat-telkom-1',
                name: 'Modul Mitigasi Cascading Failure & Circuit Breaker (SE-402)',
                type: 'material',
                companyId: 'PT-TELKOM',
                companyName: 'PT Telkom Indonesia Tbk',
                assessmentType: 'Technical & Hard Competency',
                assessmentLevel: 'Level 3: Senior / Lead Specialist',
                materialData: {
                  title: 'Modul Mitigasi Cascading Failure & Circuit Breaker (SE-402)',
                  type: 'Studi Kasus',
                  version: 'v2.1',
                  companyId: 'PT-TELKOM',
                  companyName: 'PT Telkom Indonesia Tbk',
                  assessmentType: 'Technical & Hard Competency',
                  assessmentLevel: 'Level 3: Senior / Lead Specialist',
                  content:
                    'Materi pengujian teknik fallback dan implementasi pattern Circuit Breaker menggunakan Resilience4j / Envoy Proxy pada backbone jaringan telekomunikasi berbeban tinggi.',
                  rubric:
                    'Skala BARS 1-5 berdasarkan kemampuan mendiagnosis connection pool exhaustion, merancang state Half-Open, dan menerapkan distributed tracing.',
                  behavioralIndicators: [
                    'Mampu mengidentifikasi titik kegagalan tunggal (single point of failure) pada gateway',
                    'Menerapkan rate limiting dan bulkhead pattern secara sistematis pada downstream services',
                    'Menjelaskan trade-off antara ketersediaan (availability) dan konsistensi data dalam CAP theorem'
                  ]
                }
              }
            ]
          }
        ]
      },
      {
        id: 'sub-telkom-2',
        name: 'Manajemen Data & Basis Data Enterprise Telkom',
        type: 'subcategory',
        companyId: 'PT-TELKOM',
        assessmentType: 'Technical & Hard Competency',
        assessmentLevel: 'Level 2: Mid-Level / Professional Specialist',
        children: [
          {
            id: 'comp-telkom-2',
            name: 'Indexing Strategy & Query Planner Tuning',
            type: 'competency',
            companyId: 'PT-TELKOM',
            assessmentType: 'Technical & Hard Competency',
            assessmentLevel: 'Level 2: Mid-Level / Professional Specialist',
            children: [
              {
                id: 'mat-telkom-2',
                name: 'Analisis Profiling Query & Pencegahan Index Scan Bottleneck',
                type: 'material',
                companyId: 'PT-TELKOM',
                companyName: 'PT Telkom Indonesia Tbk',
                assessmentType: 'Technical & Hard Competency',
                assessmentLevel: 'Level 2: Mid-Level / Professional Specialist',
                materialData: {
                  title: 'Analisis Profiling Query & Pencegahan Index Scan Bottleneck',
                  type: 'Praktikum',
                  version: 'v1.4',
                  companyId: 'PT-TELKOM',
                  companyName: 'PT Telkom Indonesia Tbk',
                  assessmentType: 'Technical & Hard Competency',
                  assessmentLevel: 'Level 2: Mid-Level / Professional Specialist',
                  content:
                    'Panduan teknis pengujian kemampuan optimasi query EXPLAIN ANALYZE, partisi tabel PostgreSQL pada data billing jutaan pelanggan IndiHome, dan tuning memory cache.',
                  rubric:
                    'Kandidat dinilai dari ketepatan memilih jenis indeks (B-Tree vs BRIN untuk time-series) dan estimasi cost buffer.',
                  behavioralIndicators: [
                    'Mampu membaca output EXPLAIN ANALYZE dengan akurat dan cepat',
                    'Mengetahui kapan partial index lebih efisien dibandingkan full table scan',
                    'Menghindari locking tabel saat proses migrasi skema database production'
                  ]
                }
              }
            ]
          }
        ]
      },
      {
        id: 'sub-telkom-3',
        name: 'Enterprise Cloud Architecture & Disaster Recovery',
        type: 'subcategory',
        companyId: 'PT-TELKOM',
        assessmentType: 'Behavioral & Leadership (BARS)',
        assessmentLevel: 'Level 4: Managerial / Executive Head',
        children: [
          {
            id: 'comp-telkom-3',
            name: 'Multi-Region High Availability & Business Continuity',
            type: 'competency',
            companyId: 'PT-TELKOM',
            assessmentType: 'Behavioral & Leadership (BARS)',
            assessmentLevel: 'Level 4: Managerial / Executive Head',
            children: [
              {
                id: 'mat-telkom-3',
                name: 'Simulasi Pemulihan Insiden Downtime Cloud Telkom 99.99% (CLD-301)',
                type: 'material',
                companyId: 'PT-TELKOM',
                companyName: 'PT Telkom Indonesia Tbk',
                assessmentType: 'Behavioral & Leadership (BARS)',
                assessmentLevel: 'Level 4: Managerial / Executive Head',
                materialData: {
                  title: 'Simulasi Pemulihan Insiden Downtime Cloud Telkom 99.99% (CLD-301)',
                  type: 'Studi Kasus',
                  version: 'v2.5',
                  companyId: 'PT-TELKOM',
                  companyName: 'PT Telkom Indonesia Tbk',
                  assessmentType: 'Behavioral & Leadership (BARS)',
                  assessmentLevel: 'Level 4: Managerial / Executive Head',
                  content:
                    'Evaluasi kepemimpinan teknis saat kabel bawah laut fiber optic putus, menuntut failover otomatis traffic nasional ke rute cadangan satelit & data center alternatif.',
                  rubric:
                    'Standar BARS 1-5 untuk level VP/Head: pengambilan keputusan di bawah ketidakpastian tinggi, alokasi bandwidth darurat, dan koordinasi stakeholder kementerian.',
                  behavioralIndicators: [
                    'Memutuskan peralihan routing global dalam toleransi RTO < 10 menit',
                    'Memimpin komando war-room teknis lintas fungsi dengan instruksi yang terstruktur',
                    'Mempersiapkan post-mortem review komprehensif untuk mencegah repetisi insiden'
                  ]
                }
              }
            ]
          }
        ]
      }
    ]
  },

  // ─── PT BANK CIMB NIAGA TBK ───
  {
    id: 'cat-cimb-1',
    name: 'PT Bank CIMB Niaga — Perbankan & Kasus In-Basket',
    type: 'category',
    companyId: 'PT-CIMB',
    companyName: 'PT Bank CIMB Niaga Tbk',
    assessmentType: 'Behavioral & Leadership (BARS)',
    assessmentLevel: 'Level 1: Entry / Fresh Graduate (ODP/MT)',
    children: [
      {
        id: 'sub-cimb-1',
        name: 'The Complete Banker (TCB) — Simulasi In-Basket PT Anjak',
        type: 'subcategory',
        companyId: 'PT-CIMB',
        assessmentType: 'Behavioral & Leadership (BARS)',
        assessmentLevel: 'Level 1: Entry / Fresh Graduate (ODP/MT)',
        children: [
          {
            id: 'comp-cimb-1',
            name: 'Problem Solving, Fact Sheet Matching & Prioritisasi',
            type: 'competency',
            companyId: 'PT-CIMB',
            assessmentType: 'Behavioral & Leadership (BARS)',
            assessmentLevel: 'Level 1: Entry / Fresh Graduate (ODP/MT)',
            children: [
              {
                id: 'mat-cimb-1',
                name: 'Studi Kasus PT Anjak: Operasional CRM & Service Level (TCB-ANJAK)',
                type: 'material',
                companyId: 'PT-CIMB',
                companyName: 'PT Bank CIMB Niaga Tbk',
                assessmentType: 'Behavioral & Leadership (BARS)',
                assessmentLevel: 'Level 1: Entry / Fresh Graduate (ODP/MT)',
                materialData: {
                  title: 'Studi Kasus PT Anjak: Operasional CRM & Service Level (TCB-ANJAK)',
                  type: 'Studi Kasus',
                  version: 'v3.0',
                  companyId: 'PT-CIMB',
                  companyName: 'PT Bank CIMB Niaga Tbk',
                  assessmentType: 'Behavioral & Leadership (BARS)',
                  assessmentLevel: 'Level 1: Entry / Fresh Graduate (ODP/MT)',
                  content:
                    'Kandidat menganalisis dinamika operasional penurunan On-Time Performance (OTP) 99.2% ke 97.8%, penurunan Customer Satisfaction Index 89 ke 83, kenaikan biaya listrik +14%, dan antrean panjang teller.',
                  rubric:
                    'Standar BARS 1-5 mencakup Fact Sheet Matching, pengenalan akar masalah, dan penyusunan rekomendasi perbaikan 30-60-90 hari.',
                  behavioralIndicators: [
                    'Menempatkan penurunan OTP dan kepuasan nasabah sebagai Prioritas Utama (Priority 1)',
                    'Menghubungkan keterlambatan vendor maintenance dengan kegagalan transaksi CRM/ATM',
                    'Merumuskan mitigasi efisiensi biaya tanpa mengorbankan kualitas layanan nasabah'
                  ]
                }
              }
            ]
          }
        ]
      },
      {
        id: 'sub-cimb-2',
        name: 'Kognitif & Critical Business Decision',
        type: 'subcategory',
        companyId: 'PT-CIMB',
        assessmentType: 'Cognitive & Aptitude Test',
        assessmentLevel: 'Level 2: Mid-Level / Professional Specialist',
        children: [
          {
            id: 'comp-cimb-2',
            name: 'Commercial Portfolio Yield & Liquidity Trade-Off',
            type: 'competency',
            companyId: 'PT-CIMB',
            assessmentType: 'Cognitive & Aptitude Test',
            assessmentLevel: 'Level 2: Mid-Level / Professional Specialist',
            children: [
              {
                id: 'mat-cimb-2',
                name: 'Analisis Matriks Profitabilitas Nasabah & Trade-Off Likuiditas',
                type: 'material',
                companyId: 'PT-CIMB',
                companyName: 'PT Bank CIMB Niaga Tbk',
                assessmentType: 'Cognitive & Aptitude Test',
                assessmentLevel: 'Level 2: Mid-Level / Professional Specialist',
                materialData: {
                  title: 'Analisis Matriks Profitabilitas Nasabah & Trade-Off Likuiditas',
                  type: 'Algoritma',
                  version: 'v1.2',
                  companyId: 'PT-CIMB',
                  companyName: 'PT Bank CIMB Niaga Tbk',
                  assessmentType: 'Cognitive & Aptitude Test',
                  assessmentLevel: 'Level 2: Mid-Level / Professional Specialist',
                  content:
                    'Pengujian penalaran numerik tingkat lanjut untuk mengukur Return on Risk-Adjusted Capital (RAROC) terhadap portofolio pembiayaan korporasi.',
                  rubric:
                    'Ketepatan perhitungan Net Interest Margin (NIM) dan sensitivitas suku bunga acuan BI Rate.',
                  behavioralIndicators: [
                    'Mampu mengkalkulasi skenario stress-test pergerakan suku bunga terhadap margin bank',
                    'Menyeimbangkan antara likuiditas harian LDR dengan target profitabilitas lending'
                  ]
                }
              }
            ]
          }
        ]
      }
    ]
  },

  // ─── PT ASTRA INTERNATIONAL TBK ───
  {
    id: 'cat-astra-1',
    name: 'PT Astra International — Management Trainee & Operational Excellence',
    type: 'category',
    companyId: 'PT-ASTRA',
    companyName: 'PT Astra International Tbk',
    assessmentType: 'Behavioral & Leadership (BARS)',
    assessmentLevel: 'Level 1: Entry / Fresh Graduate (ODP/MT)',
    children: [
      {
        id: 'sub-astra-1',
        name: 'Astra Management Trainee — Kaizen & Lean Operations',
        type: 'subcategory',
        companyId: 'PT-ASTRA',
        assessmentType: 'Behavioral & Leadership (BARS)',
        assessmentLevel: 'Level 1: Entry / Fresh Graduate (ODP/MT)',
        children: [
          {
            id: 'comp-astra-1',
            name: 'Continuous Improvement & Supply Chain Efficiency',
            type: 'competency',
            companyId: 'PT-ASTRA',
            assessmentType: 'Behavioral & Leadership (BARS)',
            assessmentLevel: 'Level 1: Entry / Fresh Graduate (ODP/MT)',
            children: [
              {
                id: 'mat-astra-1',
                name: 'Studi Kasus Efisiensi Logistik & Lean Manufacturing Astra',
                type: 'material',
                companyId: 'PT-ASTRA',
                companyName: 'PT Astra International Tbk',
                assessmentType: 'Behavioral & Leadership (BARS)',
                assessmentLevel: 'Level 1: Entry / Fresh Graduate (ODP/MT)',
                materialData: {
                  title: 'Studi Kasus Efisiensi Logistik & Lean Manufacturing Astra',
                  type: 'Studi Kasus',
                  version: 'v2.0',
                  companyId: 'PT-ASTRA',
                  companyName: 'PT Astra International Tbk',
                  assessmentType: 'Behavioral & Leadership (BARS)',
                  assessmentLevel: 'Level 1: Entry / Fresh Graduate (ODP/MT)',
                  content:
                    'Evaluasi implementasi Kaizen pada perakitan komponen otomotif untuk memangkas lead time 18% dan meminimalkan waste persediaan gudang.',
                  rubric:
                    'Penilaian BARS berfokus pada ketelitian identifikasi bottle-neck, komunikasi persuasif ke pekerja lapangan, dan orientasi mutu.',
                  behavioralIndicators: [
                    'Mengaplikasikan prinsip 5S (Seiri, Seiton, Seiso, Seiketsu, Shitsuke) pada alur kerja',
                    'Mengajak tim bengkel berdiskusi memecahkan kendala tanpa saling menyalahkan'
                  ]
                }
              }
            ]
          }
        ]
      }
    ]
  },

  // ─── PT PERTAMINA HULU ENERGI ───
  {
    id: 'cat-pertamina-1',
    name: 'PT Pertamina Hulu Energi — HSSE & Drilling Engineering',
    type: 'category',
    companyId: 'PT-PERTAMINA',
    companyName: 'PT Pertamina Hulu Energi',
    assessmentType: 'Technical & Hard Competency',
    assessmentLevel: 'Level 3: Senior / Lead Specialist',
    children: [
      {
        id: 'sub-pertamina-1',
        name: 'Oil & Gas Safety Protocol & HSE Zero Incident',
        type: 'subcategory',
        companyId: 'PT-PERTAMINA',
        assessmentType: 'Technical & Hard Competency',
        assessmentLevel: 'Level 3: Senior / Lead Specialist',
        children: [
          {
            id: 'comp-pertamina-1',
            name: 'Offshore Emergency Shutdown & Incident Investigation',
            type: 'competency',
            companyId: 'PT-PERTAMINA',
            assessmentType: 'Technical & Hard Competency',
            assessmentLevel: 'Level 3: Senior / Lead Specialist',
            children: [
              {
                id: 'mat-pertamina-1',
                name: 'Prosedur Tanggap Darurat & Audit Kepatuhan Lingkungan Migas',
                type: 'material',
                companyId: 'PT-PERTAMINA',
                companyName: 'PT Pertamina Hulu Energi',
                assessmentType: 'Technical & Hard Competency',
                assessmentLevel: 'Level 3: Senior / Lead Specialist',
                materialData: {
                  title: 'Prosedur Tanggap Darurat & Audit Kepatuhan Lingkungan Migas',
                  type: 'Studi Kasus',
                  version: 'v2.2',
                  companyId: 'PT-PERTAMINA',
                  companyName: 'PT Pertamina Hulu Energi',
                  assessmentType: 'Technical & Hard Competency',
                  assessmentLevel: 'Level 3: Senior / Lead Specialist',
                  content:
                    'Pengujian protokol evakuasi rig lepas pantai saat terdeteksi kebocoran gas H2S bertekanan tinggi dan tata kelola pelaporan ESD ke SKK Migas.',
                  rubric:
                    'Skala BARS menguji ketegasan menghentikan operasi berbahaya (Stop Work Authority) tanpa kompromi.',
                  behavioralIndicators: [
                    'Menginstruksikan aktivasi emergency blow-out preventer tanpa ragu',
                    'Menjaga koordinasi evakuasi personel helikopter dan kapal patroli penjaga laut'
                  ]
                }
              }
            ]
          }
        ]
      }
    ]
  }
];

export function AdminMasterMateriTree() {
  const [tree, setTree] = useState<TreeNode[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.warn('Failed to parse saved tree:', e);
    }
    return INITIAL_TREE;
  });

  // Filter States: Per PT, Jenis Asesmen, Level Asesmen
  const [selectedCompanyId, setSelectedCompanyId] = useState<string>('ALL');
  const [selectedTypeFilter, setSelectedTypeFilter] = useState<string>('ALL');
  const [selectedLevelFilter, setSelectedLevelFilter] = useState<string>('ALL');
  const [searchFilter, setSearchFilter] = useState<string>('');

  const [expandedNodes, setExpandedNodes] = useState<Record<string, boolean>>({
    'cat-mandiri-1': true,
    'sub-mandiri-1': true,
    'comp-mandiri-1': true,
    'cat-telkom-1': true,
    'sub-telkom-1': true,
    'comp-telkom-1': true,
    'cat-cimb-1': true,
    'sub-cimb-1': true,
    'comp-cimb-1': true,
  });

  const [selectedNodeId, setSelectedNodeId] = useState<string>('mat-mandiri-1');
  const [selectedMaterial, setSelectedMaterial] = useState<TreeNode['materialData']>(
    INITIAL_TREE[0].children![0].children![0].children![0].materialData
  );

  const [saveSuccess, setSaveSuccess] = useState(false);
  const [newIndicatorText, setNewIndicatorText] = useState('');

  // Add Node Modal State
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newNodeType, setNewNodeType] = useState<'category' | 'subcategory' | 'competency' | 'material'>('category');
  const [newNodeName, setNewNodeName] = useState('');
  const [newNodeCompanyId, setNewNodeCompanyId] = useState<string>('PT-MANDIRI');
  const [newNodeAssessmentType, setNewNodeAssessmentType] = useState<string>('Technical & Hard Competency');
  const [newNodeAssessmentLevel, setNewNodeAssessmentLevel] = useState<string>('Level 3: Senior / Lead Specialist');
  const [newParentId, setNewParentId] = useState('');
  const [newMatType, setNewMatType] = useState<'Teori' | 'Studi Kasus' | 'Algoritma' | 'Praktikum'>('Studi Kasus');
  const [newMatContent, setNewMatContent] = useState('');
  const [newMatRubric, setNewMatRubric] = useState('');

  const toggleExpand = (id: string) => {
    setExpandedNodes((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  // Helper to update a node in the tree recursively
  const updateNodeDataInTree = (
    nodes: TreeNode[],
    targetId: string,
    updatedData: TreeNode['materialData'],
    newTitle?: string
  ): TreeNode[] => {
    return nodes.map((node) => {
      if (node.id === targetId) {
        return {
          ...node,
          name: newTitle || node.name,
          companyId: updatedData?.companyId || node.companyId,
          companyName: updatedData?.companyName || node.companyName,
          assessmentType: updatedData?.assessmentType || node.assessmentType,
          assessmentLevel: updatedData?.assessmentLevel || node.assessmentLevel,
          materialData: updatedData
        };
      }
      if (node.children && node.children.length > 0) {
        return {
          ...node,
          children: updateNodeDataInTree(node.children, targetId, updatedData, newTitle)
        };
      }
      return node;
    });
  };

  // Helper to delete node recursively
  const deleteNodeFromTree = (nodes: TreeNode[], targetId: string): TreeNode[] => {
    return nodes
      .filter((n) => n.id !== targetId)
      .map((n) => {
        if (n.children) {
          return { ...n, children: deleteNodeFromTree(n.children, targetId) };
        }
        return n;
      });
  };

  // Helper to add child node recursively
  const addChildToParent = (nodes: TreeNode[], parentId: string, newNode: TreeNode): TreeNode[] => {
    return nodes.map((node) => {
      if (node.id === parentId) {
        return {
          ...node,
          children: [...(node.children || []), newNode]
        };
      }
      if (node.children && node.children.length > 0) {
        return {
          ...node,
          children: addChildToParent(node.children, parentId, newNode)
        };
      }
      return node;
    });
  };

  // Flatten available parents for dropdown
  const getParentOptions = () => {
    const list: { id: string; name: string; type: string }[] = [];
    const traverse = (nodes: TreeNode[], depth = 0) => {
      for (const n of nodes) {
        if (n.type !== 'material') {
          list.push({ id: n.id, name: `${'—'.repeat(depth)} ${n.name} (${n.type})`, type: n.type });
        }
        if (n.children) traverse(n.children, depth + 1);
      }
    };
    traverse(tree);
    return list;
  };

  // Save current material edits
  const handleSaveAll = () => {
    if (selectedMaterial && selectedNodeId) {
      const updated = updateNodeDataInTree(tree, selectedNodeId, selectedMaterial, selectedMaterial.title);
      setTree(updated);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    } else {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(tree));
    }
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 3000);
  };

  // Handle adding new node
  const handleCreateNode = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNodeName.trim()) return;

    const newId = `node-${Date.now().toString().slice(-4)}`;
    const compObj = MASTER_COMPANIES.find((c) => c.id === newNodeCompanyId);
    let created: TreeNode;

    if (newNodeType === 'material') {
      created = {
        id: newId,
        name: newNodeName.trim(),
        type: 'material',
        companyId: newNodeCompanyId,
        companyName: compObj?.name || 'PT Umum',
        assessmentType: newNodeAssessmentType,
        assessmentLevel: newNodeAssessmentLevel,
        materialData: {
          title: newNodeName.trim(),
          type: newMatType,
          version: 'v1.0',
          companyId: newNodeCompanyId,
          companyName: compObj?.name || 'PT Umum',
          assessmentType: newNodeAssessmentType,
          assessmentLevel: newNodeAssessmentLevel,
          content: newMatContent || 'Konten studi kasus / teori kompetensi baru.',
          rubric: newMatRubric || 'Skala penilaian BARS 1 - 5.',
          behavioralIndicators: ['Mampu mendemonstrasikan penguasaan materi secara menyeluruh']
        }
      };
    } else {
      created = {
        id: newId,
        name: newNodeName.trim(),
        type: newNodeType,
        companyId: newNodeCompanyId,
        companyName: compObj?.name || 'PT Umum',
        assessmentType: newNodeAssessmentType,
        assessmentLevel: newNodeAssessmentLevel,
        children: []
      };
    }

    let nextTree: TreeNode[];
    if (newNodeType === 'category' || !newParentId) {
      nextTree = [...tree, created];
    } else {
      nextTree = addChildToParent(tree, newParentId, created);
      setExpandedNodes((prev) => ({ ...prev, [newParentId]: true }));
    }

    setTree(nextTree);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(nextTree));

    if (created.materialData) {
      setSelectedNodeId(created.id);
      setSelectedMaterial(created.materialData);
    }

    // Reset & close
    setIsAddModalOpen(false);
    setNewNodeName('');
    setNewParentId('');
    setNewMatContent('');
    setNewMatRubric('');
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 3000);
  };

  // Handle remove node
  const handleDeleteNode = (id: string, name: string) => {
    if (window.confirm(`Yakin ingin menghapus node "${name}" beserta seluruh isinya?`)) {
      const nextTree = deleteNodeFromTree(tree, id);
      setTree(nextTree);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(nextTree));
    }
  };

  // Add indicator to active material
  const handleAddIndicator = () => {
    if (!newIndicatorText.trim() || !selectedMaterial) return;
    const nextIndicators = [...selectedMaterial.behavioralIndicators, newIndicatorText.trim()];
    const nextMat = { ...selectedMaterial, behavioralIndicators: nextIndicators };
    setSelectedMaterial(nextMat);
    setTree((prev) => updateNodeDataInTree(prev, selectedNodeId, nextMat));
    setNewIndicatorText('');
  };

  // Delete indicator
  const handleDeleteIndicator = (idx: number) => {
    if (!selectedMaterial) return;
    const nextIndicators = selectedMaterial.behavioralIndicators.filter((_, i) => i !== idx);
    const nextMat = { ...selectedMaterial, behavioralIndicators: nextIndicators };
    setSelectedMaterial(nextMat);
    setTree((prev) => updateNodeDataInTree(prev, selectedNodeId, nextMat));
  };

  // Recursive Filter of the Tree by Company, Assessment Type, and Assessment Level
  const filterTreeNodes = (nodes: TreeNode[]): TreeNode[] => {
    return nodes
      .map((node) => {
        const matchesCompany =
          selectedCompanyId === 'ALL' || !node.companyId || node.companyId === selectedCompanyId;
        const matchesType =
          selectedTypeFilter === 'ALL' || !node.assessmentType || node.assessmentType === selectedTypeFilter;
        const matchesLevel =
          selectedLevelFilter === 'ALL' || !node.assessmentLevel || node.assessmentLevel === selectedLevelFilter;

        const matchesSearch =
          !searchFilter.trim() ||
          node.name.toLowerCase().includes(searchFilter.toLowerCase()) ||
          node.materialData?.content.toLowerCase().includes(searchFilter.toLowerCase());

        let filteredChildren: TreeNode[] | undefined = undefined;
        if (node.children && node.children.length > 0) {
          filteredChildren = filterTreeNodes(node.children);
        }

        const hasMatchingChildren = filteredChildren && filteredChildren.length > 0;
        const selfMatches = matchesCompany && matchesType && matchesLevel && matchesSearch;

        if (selfMatches || hasMatchingChildren) {
          return {
            ...node,
            children: filteredChildren
          };
        }
        return null;
      })
      .filter(Boolean) as TreeNode[];
  };

  const filteredTree = useMemo(() => {
    return filterTreeNodes(tree);
  }, [tree, selectedCompanyId, selectedTypeFilter, selectedLevelFilter, searchFilter]);

  // Count total materials matching
  const totalMaterialsCount = useMemo(() => {
    let count = 0;
    const traverse = (nodes: TreeNode[]) => {
      for (const n of nodes) {
        if (n.type === 'material') count++;
        if (n.children) traverse(n.children);
      }
    };
    traverse(filteredTree);
    return count;
  }, [filteredTree]);

  const renderTree = (nodes: TreeNode[], level = 0) => {
    return nodes.map((node) => {
      const isExpanded = expandedNodes[node.id];
      const hasChildren = node.children && node.children.length > 0;
      const isSelected = selectedNodeId === node.id;

      // Badges
      const compObj = MASTER_COMPANIES.find((c) => c.id === node.companyId);

      return (
        <div key={node.id} className="select-none">
          <div
            onClick={() => {
              if (hasChildren) toggleExpand(node.id);
              if (node.materialData) {
                setSelectedNodeId(node.id);
                setSelectedMaterial(node.materialData);
              }
            }}
            className={`flex items-center gap-2 py-2 px-2.5 rounded-xl cursor-pointer text-xs transition-all group ${
              isSelected
                ? 'bg-blue-50 text-primary-navy font-bold border border-blue-200/90 shadow-2xs'
                : 'hover:bg-slate-100 text-ink'
            }`}
            style={{ paddingLeft: `${level * 16 + 10}px` }}
          >
            {hasChildren ? (
              isExpanded ? (
                <ChevronDown className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              ) : (
                <ChevronRight className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              )
            ) : (
              <FileText className="w-3.5 h-3.5 text-blue-accent shrink-0" />
            )}

            <span className="truncate flex-1 font-medium">{node.name}</span>

            {/* Badges for PT & Type */}
            {compObj && (
              <span className="text-[10px] font-bold bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded-md border border-slate-200 shrink-0 hidden sm:inline-block">
                {compObj.code}
              </span>
            )}

            {node.type === 'category' && (
              <span className="text-[9px] font-mono uppercase bg-slate-100 text-slate-600 px-1.5 py-0.2 rounded shrink-0">
                Kategori
              </span>
            )}
            {node.type === 'competency' && (
              <span className="text-[9px] font-mono uppercase bg-blue-50 text-primary-navy px-1.5 py-0.2 rounded shrink-0">
                Kompetensi
              </span>
            )}
            {node.type === 'material' && (
              <span className="text-[9px] font-mono uppercase bg-emerald-50 text-emerald-800 px-1.5 py-0.2 rounded shrink-0">
                Modul
              </span>
            )}

            {/* Delete button on hover */}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                handleDeleteNode(node.id, node.name);
              }}
              className="opacity-0 group-hover:opacity-100 text-slate-400 hover:text-red-600 p-0.5 rounded cursor-pointer transition-opacity"
              title="Hapus Node"
            >
              <Trash2 className="w-3 h-3" />
            </button>
          </div>

          {hasChildren && isExpanded && <div>{renderTree(node.children!, level + 1)}</div>}
        </div>
      );
    });
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
            <Badge variant="navy">Master Silabus Per PT • Jenis &amp; Level Asesmen</Badge>
          </div>
          <h2 className="text-xl sm:text-2xl font-extrabold font-heading text-ink tracking-tight">
            Master Materi &amp; Kurikulum Kompetensi
          </h2>
          <p className="text-xs sm:text-sm text-muted-slate mt-0.5">
            Kelola silabus terstruktur per PT Mitra, jenis evaluasi (Technical/BARS/Cognitive/AKHLAK), dan tingkat jabatan/level kandidat.
          </p>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsAddModalOpen(true)}
            className="text-xs sm:text-sm py-2 px-3.5 rounded-xl flex items-center gap-1.5 cursor-pointer font-bold shadow-2xs"
          >
            <Plus className="w-4 h-4 text-blue-accent" />
            <span>Tambah Node Silabus</span>
          </Button>

          <Button
            variant="primary"
            size="sm"
            onClick={handleSaveAll}
            className="text-xs sm:text-sm py-2 px-4 rounded-xl flex items-center gap-1.5 cursor-pointer font-bold shadow-sm"
          >
            <Save className="w-4 h-4" />
            <span>Simpan Perubahan</span>
          </Button>
        </div>
      </div>

      {/* ─── SUCCESS ALERT ─── */}
      {saveSuccess && (
        <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-2xl text-xs sm:text-sm text-emerald-900 flex items-center gap-2.5 animate-fadeIn">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          <span className="font-bold">
            Perubahan Master Materi, Jenis Asesmen, dan Indikator Perilaku berhasil disimpan ke basis data repositori!
          </span>
        </div>
      )}

      {/* ─── MASTER FILTER BAR (Per PT, Jenis Asesmen, Level Asesmen) ─── */}
      <div className="bg-slate-50/80 rounded-2xl border border-slate-200/90 p-4 space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-xs font-bold text-slate-700 uppercase tracking-wider">
            <Building2 className="w-4 h-4 text-primary-navy" />
            <span>Pilih Master Perusahaan / PT Mitra:</span>
          </div>

          <div className="flex items-center gap-2 text-xs text-slate-500 font-semibold">
            <span>Menampilkan <strong>{totalMaterialsCount}</strong> Modul Materi Terdaftar</span>
          </div>
        </div>

        {/* Company Filter Tabs */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setSelectedCompanyId('ALL')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              selectedCompanyId === 'ALL'
                ? 'bg-primary-navy text-white shadow-xs'
                : 'bg-white text-slate-600 hover:text-slate-900 border border-slate-200'
            }`}
          >
            Semua PT Mitra
          </button>

          {MASTER_COMPANIES.map((comp) => {
            const isSelected = selectedCompanyId === comp.id;
            return (
              <button
                key={comp.id}
                onClick={() => setSelectedCompanyId(comp.id)}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                  isSelected
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'bg-white text-slate-700 hover:text-primary-navy border border-slate-200'
                }`}
              >
                <Building2 className={`w-3.5 h-3.5 ${isSelected ? 'text-white' : 'text-slate-400'}`} />
                <span>{comp.name}</span>
              </button>
            );
          })}
        </div>

        {/* Sub-Filters: Jenis Asesmen, Level Asesmen & Search */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t border-slate-200/70">
          <div>
            <label className="block text-[11px] font-bold text-slate-600 mb-1 flex items-center gap-1">
              <Layers className="w-3.5 h-3.5 text-blue-600" />
              <span>Jenis Asesmen:</span>
            </label>
            <select
              value={selectedTypeFilter}
              onChange={(e) => setSelectedTypeFilter(e.target.value)}
              className="w-full px-3 py-1.5 rounded-xl border border-slate-200 text-xs bg-white text-slate-800 font-semibold outline-hidden focus:ring-2 focus:ring-blue-500/20"
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
              className="w-full px-3 py-1.5 rounded-xl border border-slate-200 text-xs bg-white text-slate-800 font-semibold outline-hidden focus:ring-2 focus:ring-blue-500/20"
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
              <Filter className="w-3.5 h-3.5 text-amber-600" />
              <span>Pencarian Cepat:</span>
            </label>
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={searchFilter}
                onChange={(e) => setSearchFilter(e.target.value)}
                placeholder="Cari materi / modul..."
                className="w-full px-3 py-1.5 rounded-xl border border-slate-200 text-xs bg-white outline-hidden focus:ring-2 focus:ring-blue-500/20"
              />
              {(selectedCompanyId !== 'ALL' || selectedTypeFilter !== 'ALL' || selectedLevelFilter !== 'ALL' || searchFilter) && (
                <button
                  onClick={() => {
                    setSelectedCompanyId('ALL');
                    setSelectedTypeFilter('ALL');
                    setSelectedLevelFilter('ALL');
                    setSearchFilter('');
                  }}
                  title="Reset Filter"
                  className="p-2 text-slate-400 hover:text-slate-700 bg-white border border-slate-200 rounded-xl cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ─── MAIN TWO-COLUMN WORKSPACE ─── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Tree Explorer (5 cols) */}
        <div className="lg:col-span-5 border border-slate-200/90 rounded-2xl p-4 bg-slate-50/50 space-y-3 flex flex-col justify-between">
          <div className="space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-slate-200">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-ink uppercase tracking-wider">
                  Tree Silabus Asesmen
                </span>
                <span className="text-[10px] font-mono bg-blue-100 text-blue-800 px-1.5 py-0.2 rounded-full font-bold">
                  {filteredTree.length} Node
                </span>
              </div>
              <button
                onClick={() => setIsAddModalOpen(true)}
                className="text-xs font-bold text-primary-navy hover:underline cursor-pointer flex items-center gap-1"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Tambah Node</span>
              </button>
            </div>

            {filteredTree.length === 0 ? (
              <div className="text-center py-12 px-4 space-y-2 bg-white rounded-xl border border-dashed border-slate-300">
                <BookOpen className="w-8 h-8 text-slate-300 mx-auto" />
                <p className="text-xs font-bold text-slate-700">Tidak ada materi yang sesuai filter</p>
                <p className="text-[11px] text-slate-500">
                  Ubah filter PT, Jenis Asesmen, atau Level Asesmen di atas.
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setSelectedCompanyId('ALL');
                    setSelectedTypeFilter('ALL');
                    setSelectedLevelFilter('ALL');
                    setSearchFilter('');
                  }}
                  className="text-xs mt-2"
                >
                  Reset Filter
                </Button>
              </div>
            ) : (
              <div className="space-y-1 max-h-[520px] overflow-y-auto pr-1">
                {renderTree(filteredTree)}
              </div>
            )}
          </div>

          <div className="pt-3 border-t border-slate-200 text-[11px] text-slate-500">
            * Klik salah satu <strong>Modul</strong> untuk membuka editor materi, jenis, level &amp; indikator perilaku di sisi kanan.
          </div>
        </div>

        {/* Right Editor Panel (7 cols) */}
        <div className="lg:col-span-7 border border-slate-200/90 rounded-2xl p-6 space-y-5 bg-white shadow-xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
            <div>
              <h3 className="font-heading font-extrabold text-base text-ink">
                Editor Materi &amp; Indikator Perilaku
              </h3>
              <p className="text-xs text-muted-slate mt-0.5">Modul ID: <span className="font-mono font-bold text-slate-700">{selectedNodeId}</span></p>
            </div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs font-bold text-primary-navy bg-soft-blue px-2.5 py-1 rounded-lg border border-accent-border">
                Versi: {selectedMaterial?.version || 'v1.0'}
              </span>
            </div>
          </div>

          {selectedMaterial ? (
            <div className="space-y-4 text-xs">
              {/* Scope Info: Perusahaan, Jenis, Level */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3.5 bg-slate-50 rounded-2xl border border-slate-200/80">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Perusahaan / PT Mitra</label>
                  <select
                    value={selectedMaterial.companyId || 'PT-MANDIRI'}
                    onChange={(e) => {
                      const compObj = MASTER_COMPANIES.find((c) => c.id === e.target.value);
                      const next = {
                        ...selectedMaterial,
                        companyId: e.target.value,
                        companyName: compObj?.name || 'PT Mitra'
                      };
                      setSelectedMaterial(next);
                      setTree((prev) => updateNodeDataInTree(prev, selectedNodeId, next));
                    }}
                    className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 text-xs bg-white font-bold text-primary-navy outline-hidden"
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
                    value={selectedMaterial.assessmentType || 'Technical & Hard Competency'}
                    onChange={(e) => {
                      const next = { ...selectedMaterial, assessmentType: e.target.value };
                      setSelectedMaterial(next);
                      setTree((prev) => updateNodeDataInTree(prev, selectedNodeId, next));
                    }}
                    className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 text-xs bg-white font-semibold text-slate-800 outline-hidden"
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
                    value={selectedMaterial.assessmentLevel || 'Level 3: Senior / Lead Specialist'}
                    onChange={(e) => {
                      const next = { ...selectedMaterial, assessmentLevel: e.target.value };
                      setSelectedMaterial(next);
                      setTree((prev) => updateNodeDataInTree(prev, selectedNodeId, next));
                    }}
                    className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 text-xs bg-white font-semibold text-slate-800 outline-hidden"
                  >
                    {ASSESSMENT_LEVELS.map((lvl) => (
                      <option key={lvl} value={lvl}>
                        {lvl}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Title */}
              <div>
                <label className="block font-bold text-ink mb-1">Judul Materi / Modul</label>
                <input
                  type="text"
                  value={selectedMaterial.title}
                  onChange={(e) => {
                    const next = { ...selectedMaterial, title: e.target.value };
                    setSelectedMaterial(next);
                    setTree((prev) => updateNodeDataInTree(prev, selectedNodeId, next, e.target.value));
                  }}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-300 focus:border-primary-navy text-xs sm:text-sm font-semibold outline-hidden"
                />
              </div>

              {/* Type and Version */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-ink mb-1">Tipe Materi</label>
                  <select
                    value={selectedMaterial.type}
                    onChange={(e) => {
                      const next = { ...selectedMaterial, type: e.target.value as any };
                      setSelectedMaterial(next);
                      setTree((prev) => updateNodeDataInTree(prev, selectedNodeId, next));
                    }}
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
                    value={selectedMaterial.version}
                    onChange={(e) => {
                      const next = { ...selectedMaterial, version: e.target.value };
                      setSelectedMaterial(next);
                      setTree((prev) => updateNodeDataInTree(prev, selectedNodeId, next));
                    }}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs outline-hidden font-mono"
                  />
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="block font-bold text-ink mb-1">Deskripsi &amp; Konten Pokok</label>
                <textarea
                  rows={3}
                  value={selectedMaterial.content}
                  onChange={(e) => {
                    const next = { ...selectedMaterial, content: e.target.value };
                    setSelectedMaterial(next);
                    setTree((prev) => updateNodeDataInTree(prev, selectedNodeId, next));
                  }}
                  className="w-full p-3 rounded-xl border border-slate-300 focus:border-primary-navy text-xs outline-hidden leading-relaxed"
                />
              </div>

              {/* BARS Rubric */}
              <div>
                <label className="block font-bold text-ink mb-1">Panduan Rubrik Penilaian Asesor (Standar BARS)</label>
                <textarea
                  rows={2}
                  value={selectedMaterial.rubric}
                  onChange={(e) => {
                    const next = { ...selectedMaterial, rubric: e.target.value };
                    setSelectedMaterial(next);
                    setTree((prev) => updateNodeDataInTree(prev, selectedNodeId, next));
                  }}
                  className="w-full p-3 rounded-xl border border-slate-300 focus:border-primary-navy text-xs outline-hidden leading-relaxed"
                />
              </div>

              {/* Behavioral Indicators */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="font-bold text-ink text-xs sm:text-sm">
                    Indikator Perilaku Teramati (Behavioral Evidence):
                  </label>
                  <span className="text-[11px] text-muted-slate font-mono bg-slate-100 px-2 py-0.5 rounded-md">
                    {selectedMaterial.behavioralIndicators.length} Indikator
                  </span>
                </div>

                <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                  {selectedMaterial.behavioralIndicators.map((ind, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between gap-3 p-2.5 bg-slate-50 rounded-xl border border-slate-200 group hover:border-slate-300 transition-all"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span className="w-5 h-5 rounded-full bg-primary-navy text-white text-[11px] font-bold flex items-center justify-center shrink-0">
                          {idx + 1}
                        </span>
                        <span className="text-slate-800 font-medium text-xs truncate">{ind}</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleDeleteIndicator(idx)}
                        className="text-slate-400 hover:text-red-600 cursor-pointer p-1 rounded-lg hover:bg-white transition-colors"
                        title="Hapus Indikator"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>

                {/* Input Add Indicator */}
                <div className="mt-3 flex gap-2">
                  <input
                    type="text"
                    value={newIndicatorText}
                    onChange={(e) => setNewIndicatorText(e.target.value)}
                    placeholder="Ketik indikator perilaku baru (misal: Menjelaskan trade-off konsistensi)..."
                    className="flex-1 px-3.5 py-2 rounded-xl border border-slate-300 text-xs outline-hidden focus:border-primary-navy"
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleAddIndicator}
                    disabled={!newIndicatorText.trim()}
                    className="text-xs shrink-0 cursor-pointer px-4 font-bold"
                  >
                    Tambah
                  </Button>
                </div>
              </div>
            </div>
          ) : (
            <div className="py-16 text-center text-slate-400 space-y-2">
              <FileText className="w-10 h-10 mx-auto text-slate-300" />
              <p className="font-bold text-sm">Pilih Modul dari Tree di sisi kiri</p>
              <p className="text-xs">Klik salah satu modul untuk mengedit rincian materi, PT, jenis asesmen, dan level.</p>
            </div>
          )}
        </div>
      </div>

      {/* ─── MODAL TAMBAH NODE SILABUS ─── */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title="Tambah Node Silabus Baru (Per PT & Level)"
        size="lg"
      >
        <form onSubmit={handleCreateNode} className="p-5 space-y-4 text-xs">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block font-bold text-slate-700 mb-1">Target Perusahaan / PT</label>
              <select
                value={newNodeCompanyId}
                onChange={(e) => setNewNodeCompanyId(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-semibold bg-white cursor-pointer"
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
                value={newNodeAssessmentType}
                onChange={(e) => setNewNodeAssessmentType(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-semibold bg-white cursor-pointer"
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
                value={newNodeAssessmentLevel}
                onChange={(e) => setNewNodeAssessmentLevel(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-semibold bg-white cursor-pointer"
              >
                {ASSESSMENT_LEVELS.map((lvl) => (
                  <option key={lvl} value={lvl}>
                    {lvl}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1">Tingkatan Node (Hirarki)</label>
            <select
              value={newNodeType}
              onChange={(e) => setNewNodeType(e.target.value as any)}
              className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-semibold bg-white cursor-pointer"
            >
              <option value="category">1. Kategori Utama (Parent Level)</option>
              <option value="subcategory">2. Subkategori</option>
              <option value="competency">3. Kompetensi Spesifik</option>
              <option value="material">4. Modul Materi &amp; Kasus (Leaf Node)</option>
            </select>
          </div>

          {newNodeType !== 'category' && (
            <div>
              <label className="block font-bold text-slate-700 mb-1">Pilih Induk (Parent Node)</label>
              <select
                value={newParentId}
                onChange={(e) => setNewParentId(e.target.value)}
                required
                className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs bg-white cursor-pointer font-medium"
              >
                <option value="">-- Pilih Parent Node --</option>
                {getParentOptions().map((opt) => (
                  <option key={opt.id} value={opt.id}>
                    {opt.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div>
            <label className="block font-bold text-slate-700 mb-1">Nama Node / Judul Modul</label>
            <input
              type="text"
              value={newNodeName}
              onChange={(e) => setNewNodeName(e.target.value)}
              placeholder="Contoh: Arsitektur Cloud Native / Kasus Penurunan OTP"
              required
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs outline-hidden focus:border-primary-navy font-semibold"
            />
          </div>

          {newNodeType === 'material' && (
            <>
              <div>
                <label className="block font-bold text-slate-700 mb-1">Tipe Materi</label>
                <select
                  value={newMatType}
                  onChange={(e) => setNewMatType(e.target.value as any)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs bg-white cursor-pointer font-medium"
                >
                  <option value="Studi Kasus">Studi Kasus</option>
                  <option value="Teori">Teori Konseptual</option>
                  <option value="Algoritma">Algoritma &amp; Pemecahan Masalah</option>
                  <option value="Praktikum">Praktikum / Lab</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Deskripsi Ringkas</label>
                <textarea
                  rows={2}
                  value={newMatContent}
                  onChange={(e) => setNewMatContent(e.target.value)}
                  placeholder="Ringkasan isi modul yang akan diuji..."
                  className="w-full p-2.5 rounded-xl border border-slate-300 text-xs outline-hidden"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Panduan Rubrik Asesor (Standar BARS)</label>
                <textarea
                  rows={2}
                  value={newMatRubric}
                  onChange={(e) => setNewMatRubric(e.target.value)}
                  placeholder="Kriteria penskoran BARS 1-5..."
                  className="w-full p-2.5 rounded-xl border border-slate-300 text-xs outline-hidden"
                />
              </div>
            </>
          )}

          <div className="pt-3 flex justify-end gap-2.5 border-t border-slate-100">
            <Button variant="outline" size="sm" type="button" onClick={() => setIsAddModalOpen(false)} className="rounded-xl">
              Batal
            </Button>
            <Button variant="primary" size="sm" type="submit" className="rounded-xl font-bold">
              Simpan &amp; Tambahkan ke Tree
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
