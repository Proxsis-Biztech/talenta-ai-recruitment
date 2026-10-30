// Central Assessment & Company Catalog Service for Multi-Company (Banyak PT) support

export interface QuestionItem {
  id: number;
  type: 'single' | 'multi' | 'short' | 'essay' | 'matching';
  competency: string;
  difficulty: 'Mudah' | 'Sedang' | 'Sulit';
  text: string;
  codeSnippet?: string;
  options?: { key: string; label: string }[];
  matchingPairs?: { left: string; rightOptions: string[] }[];
}

export interface AssessmentProgram {
  id: string;
  companyId: string;
  companyName: string;
  title: string;
  category: string;
  gradeLevel: 'Grade C (Junior)' | 'Grade B (Specialist / Mid)' | 'Grade A (Lead / Senior)';
  difficultyLabel: 'Mudah' | 'Sedang' | 'Sulit';
  durationMinutes: number;
  totalQuestions: number;
  passingScore: number;
  description: string;
  questionTypes: ('single' | 'multi' | 'short' | 'essay' | 'matching')[];
  questions: QuestionItem[];
}

export interface CompanyInfo {
  id: string;
  name: string;
  industry: string;
  logoCode: string;
  activeProgramsCount: number;
}

export const COMPANIES_CATALOG: CompanyInfo[] = [
  {
    id: 'PT-TELKOM',
    name: 'PT Telkom Indonesia Tbk',
    industry: 'Telekomunikasi & Digital Cloud',
    logoCode: 'TLK',
    activeProgramsCount: 3
  },
  {
    id: 'PT-MANDIRI',
    name: 'PT Bank Mandiri (Persero) Tbk',
    industry: 'Perbankan & Financial Technology',
    logoCode: 'BMRI',
    activeProgramsCount: 2
  },
  {
    id: 'PT-CIMB',
    name: 'PT Bank CIMB Niaga Tbk',
    industry: 'Perbankan Komersial & Konsumer',
    logoCode: 'CIMB',
    activeProgramsCount: 2
  },
  {
    id: 'PT-ASTRA',
    name: 'PT Astra International Tbk',
    industry: 'Otomotif, Finansial & Infrastruktur',
    logoCode: 'ASII',
    activeProgramsCount: 2
  },
  {
    id: 'PT-PERTAMINA',
    name: 'PT Pertamina Hulu Energi',
    industry: 'Energi, Minyak & Gas Bumi',
    logoCode: 'PHE',
    activeProgramsCount: 2
  }
];

// Helper to generate 40 realistic questions based on company, program title, and grade level
function generateProgramQuestions(
  programTitle: string,
  companyName: string,
  gradeLevel: AssessmentProgram['gradeLevel']
): QuestionItem[] {
  const isSenior = gradeLevel.includes('Grade A');
  const isJunior = gradeLevel.includes('Grade C');
  const baseDiff = isSenior ? 'Sulit' : isJunior ? 'Mudah' : 'Sedang';

  const questions: QuestionItem[] = [
    {
      id: 1,
      type: 'single',
      competency: 'System & Problem Solving',
      difficulty: baseDiff,
      text: `[${companyName}] Dalam skenario arsitektur ${programTitle}, manakah strategi optimal berikut untuk menangani volume transaksi tinggi saat lonjakan operasional?`,
      options: [
        { key: 'A', label: 'Menerapkan asynchronous event-driven queue dengan backpressure handling dan distributed caching mutex.' },
        { key: 'B', label: 'Memproses seluruh query secara synchronous langsung ke master database tanpa caching.' },
        { key: 'C', label: 'Menonaktifkan audit trail logging untuk mengurangi penggunaan memori server.' },
        { key: 'D', label: 'Membatasi koneksi peramban secara statis tanpa sistem retry otomatis.' }
      ]
    },
    {
      id: 2,
      type: 'multi',
      competency: 'Data Integrity & Optimization',
      difficulty: isJunior ? 'Mudah' : 'Sulit',
      text: `Pilihlah DUA prinsip utama dalam menjamin konsistensi data transaksi finansial/operasional pada sistem berskala terdistribusi:`,
      options: [
        { key: 'A', label: 'Penerapan Transactional Outbox Pattern dan Idempotent Consumer untuk mencegah duplikasi.' },
        { key: 'B', label: 'Penggunaan Read Committed Isolation Level dengan locking terukur pada baris kritis.' },
        { key: 'C', label: 'Penyimpanan data password tanpa algoritma salting dan hashing.' },
        { key: 'D', label: 'Menghindari mekanisme retry pada microservice downstream.' }
      ]
    },
    {
      id: 3,
      type: 'short',
      competency: 'Standards & Protocols',
      difficulty: 'Mudah',
      text: `Sebutkan nama kode respon standar HTTP jika klien mengirimkan format payload request yang tidak dapat diproses oleh validator API (misal: 400, 422, 500):`,
      options: []
    },
    {
      id: 4,
      type: 'essay',
      competency: 'Analytical Thinking & Strategy',
      difficulty: 'Sulit',
      text: `Uraikan analisis risiko dan rencana mitigasi Anda jika downstream service pihak ketiga mengalami latensi lebih dari 5.000 ms pada program ${programTitle}.`,
      codeSnippet: `// Skenario Error Handling Downstream Client\ntry {\n  const result = await client.processTransaction({\n    payload: requestData,\n    timeoutMs: 4000\n  });\n} catch (err) {\n  // Implementasikan fallback & circuit breaker di sini\n}`
    },
    {
      id: 5,
      type: 'matching',
      competency: 'Core Knowledge & Architecture',
      difficulty: 'Sedang',
      text: `Pasangkan konsep arsitektur di kolom kiri dengan peran operasional yang paling tepat di kolom kanan:`,
      matchingPairs: [
        { left: 'Distributed Cache (Redis Cluster)', rightOptions: ['Low-latency Temporary In-Memory Storage', 'Asynchronous Message Queue', 'Relational Persistent Database'] },
        { left: 'Message Broker (Apache Kafka)', rightOptions: ['Asynchronous Message Queue', 'Low-latency Temporary In-Memory Storage', 'Relational Persistent Database'] },
        { left: 'Primary Storage (PostgreSQL)', rightOptions: ['Relational Persistent Database', 'Low-latency Temporary In-Memory Storage', 'Asynchronous Message Queue'] }
      ]
    }
  ];

  for (let i = 6; i <= 40; i++) {
    const qType: QuestionItem['type'] =
      i % 8 === 0 ? 'matching' : i % 7 === 0 ? 'essay' : i % 5 === 0 ? 'short' : i % 4 === 0 ? 'multi' : 'single';
    const diff: QuestionItem['difficulty'] =
      i % 3 === 0 ? (isJunior ? 'Sedang' : 'Sulit') : i % 2 === 0 ? 'Sedang' : (isSenior ? 'Sedang' : 'Mudah');

    questions.push({
      id: i,
      type: qType,
      competency: i % 3 === 0 ? 'Cloud & Engineering' : i % 2 === 0 ? 'Business Logic & Security' : 'Architecture & Quality',
      difficulty: diff,
      text: `Soal #${i} [${gradeLevel}]: Berdasarkan studi kasus ${programTitle} di ${companyName}, bagaimana pendekatan Anda dalam mengoptimalkan efisiensi komputasi, keamanan otorisasi data, dan ketahanan sistem (fault tolerance)?`,
      options: [
        { key: 'A', label: 'Memisahkan concern antara lapisan bisnis murni dan lapisan integrasi, serta mengimplementasikan health-check otomatis.' },
        { key: 'B', label: 'Menggabungkan semua query dan controller ke dalam satu file tunggal tanpa pemisahan modul.' },
        { key: 'C', label: 'Mengabaikan exception handling dan membiarkan proses terminasi saat runtime exception.' },
        { key: 'D', label: 'Menonaktifkan autentikasi session token pada endpoint internal.' }
      ],
      matchingPairs: [
        { left: `Komponen Logika #${i}`, rightOptions: ['Business Rules Core', 'Infrastructure Driver', 'Transport Gateway'] },
        { left: `Komponen Database #${i}`, rightOptions: ['Infrastructure Driver', 'Business Rules Core', 'Transport Gateway'] }
      ]
    });
  }

  return questions;
}

export const DEFAULT_ASSESSMENT_PROGRAMS: AssessmentProgram[] = [
  // PT Telkom Indonesia Tbk
  {
    id: 'SE-402',
    companyId: 'PT-TELKOM',
    companyName: 'PT Telkom Indonesia Tbk',
    title: 'Software Engineer Specialist Batch IV',
    category: 'Teknologi Informasi & Cloud',
    gradeLevel: 'Grade B (Specialist / Mid)',
    difficultyLabel: 'Sedang',
    durationMinutes: 90,
    totalQuestions: 40,
    passingScore: 75,
    description: 'Pengujian arsitektur microservices, concurrency database, clean code, dan optimasi algoritma rekayasa software terapan.',
    questionTypes: ['single', 'multi', 'short', 'essay', 'matching'],
    questions: generateProgramQuestions('Software Engineer Specialist Batch IV', 'PT Telkom Indonesia Tbk', 'Grade B (Specialist / Mid)')
  },
  {
    id: 'CLD-301',
    companyId: 'PT-TELKOM',
    companyName: 'PT Telkom Indonesia Tbk',
    title: 'Lead Cloud Solutions Architect',
    category: 'Cloud Infrastructure & DevOps',
    gradeLevel: 'Grade A (Lead / Senior)',
    difficultyLabel: 'Sulit',
    durationMinutes: 90,
    totalQuestions: 40,
    passingScore: 80,
    description: 'Evaluasi tingkat lanjut mencakup multi-region hybrid cloud, disaster recovery, Kubernetes clustering, dan kepatuhan ISO 27001.',
    questionTypes: ['single', 'multi', 'short', 'essay', 'matching'],
    questions: generateProgramQuestions('Lead Cloud Solutions Architect', 'PT Telkom Indonesia Tbk', 'Grade A (Lead / Senior)')
  },
  {
    id: 'FED-101',
    companyId: 'PT-TELKOM',
    companyName: 'PT Telkom Indonesia Tbk',
    title: 'Junior Frontend Developer Fellowship',
    category: 'Web & Mobile Engineering',
    gradeLevel: 'Grade C (Junior)',
    difficultyLabel: 'Mudah',
    durationMinutes: 60,
    totalQuestions: 40,
    passingScore: 70,
    description: 'Uji kompetensi dasar TypeScript, React framework, responsivitas antarmuka, accessibility WCAG, dan optimasi core web vitals.',
    questionTypes: ['single', 'multi', 'short', 'essay', 'matching'],
    questions: generateProgramQuestions('Junior Frontend Developer Fellowship', 'PT Telkom Indonesia Tbk', 'Grade C (Junior)')
  },

  // PT Bank Mandiri (Persero) Tbk
  {
    id: 'BMRI-DIG-01',
    companyId: 'PT-MANDIRI',
    companyName: 'PT Bank Mandiri (Persero) Tbk',
    title: 'Digital Leadership & Analytical Thinking Test',
    category: 'Leadership & Transformasi Digital',
    gradeLevel: 'Grade B (Specialist / Mid)',
    difficultyLabel: 'Sedang',
    durationMinutes: 60,
    totalQuestions: 40,
    passingScore: 70,
    description: 'Pengukuran daya analisis kuantitatif, penalaran abstrak, dan kapabilitas kepemimpinan transformasi ekosistem digital perbankan.',
    questionTypes: ['single', 'multi', 'short', 'essay', 'matching'],
    questions: generateProgramQuestions('Digital Leadership & Analytical Thinking Test', 'PT Bank Mandiri (Persero) Tbk', 'Grade B (Specialist / Mid)')
  },
  {
    id: 'BMRI-DATA-02',
    companyId: 'PT-MANDIRI',
    companyName: 'PT Bank Mandiri (Persero) Tbk',
    title: 'Data Science & Credit Risk Analytics',
    category: 'Data Science & Finansial',
    gradeLevel: 'Grade A (Lead / Senior)',
    difficultyLabel: 'Sulit',
    durationMinutes: 90,
    totalQuestions: 40,
    passingScore: 78,
    description: 'Pemodelan risiko kredit, fraud detection machine learning, credit scoring telemetry, dan tata kelola regulasi perbankan.',
    questionTypes: ['single', 'multi', 'short', 'essay', 'matching'],
    questions: generateProgramQuestions('Data Science & Credit Risk Analytics', 'PT Bank Mandiri (Persero) Tbk', 'Grade A (Lead / Senior)')
  },

  // PT Bank CIMB Niaga Tbk
  {
    id: 'TCB-ANJAK',
    companyId: 'PT-CIMB',
    companyName: 'PT Bank CIMB Niaga Tbk',
    title: 'The Complete Banker: Kasus Operasional PT Anjak',
    category: 'In-Basket & Manajemen Perbankan',
    gradeLevel: 'Grade A (Lead / Senior)',
    difficultyLabel: 'Sulit',
    durationMinutes: 90,
    totalQuestions: 40,
    passingScore: 75,
    description: 'Simulasi pemecahan krisis penurunan OTP mesin CRM, mitigasi kepuasan nasabah (CSI), dan efisiensi biaya operasional cabang.',
    questionTypes: ['single', 'multi', 'short', 'essay', 'matching'],
    questions: generateProgramQuestions('The Complete Banker: Kasus Operasional PT Anjak', 'PT Bank CIMB Niaga Tbk', 'Grade A (Lead / Senior)')
  },

  // PT Astra International Tbk
  {
    id: 'MT-ASTRA-01',
    companyId: 'PT-ASTRA',
    companyName: 'PT Astra International Tbk',
    title: 'Management Trainee General Aptitude Test',
    category: 'General Aptitude & Problem Solving',
    gradeLevel: 'Grade C (Junior)',
    difficultyLabel: 'Mudah',
    durationMinutes: 75,
    totalQuestions: 40,
    passingScore: 70,
    description: 'Tes potensi akademik, logika verbal, penalaran numerik, dan pemahaman operasional rantai pasok industri modern Astra.',
    questionTypes: ['single', 'multi', 'short', 'essay', 'matching'],
    questions: generateProgramQuestions('Management Trainee General Aptitude Test', 'PT Astra International Tbk', 'Grade C (Junior)')
  },

  // PT Pertamina Hulu Energi
  {
    id: 'PHE-OPS-01',
    companyId: 'PT-PERTAMINA',
    companyName: 'PT Pertamina Hulu Energi',
    title: 'Energy Operations & Health Safety Environment (HSE)',
    category: 'Engineering & K3 Operasional',
    gradeLevel: 'Grade B (Specialist / Mid)',
    difficultyLabel: 'Sedang',
    durationMinutes: 80,
    totalQuestions: 40,
    passingScore: 75,
    description: 'Pengujian protokol kepatuhan K3 migas, manajemen insiden kilang, mitigasi dampak lingkungan, dan keandalan fasilitas produksi.',
    questionTypes: ['single', 'multi', 'short', 'essay', 'matching'],
    questions: generateProgramQuestions('Energy Operations & Health Safety Environment (HSE)', 'PT Pertamina Hulu Energi', 'Grade B (Specialist / Mid)')
  }
];

// Local storage management helpers
const CATALOG_STORAGE_KEY = 'talenta_assessment_programs_catalog';

export function getAllPrograms(): AssessmentProgram[] {
  try {
    const raw = localStorage.getItem(CATALOG_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch (err) {
    console.warn('Error reading assessment catalog:', err);
  }
  return DEFAULT_ASSESSMENT_PROGRAMS;
}

export function saveAllPrograms(programs: AssessmentProgram[]): void {
  try {
    localStorage.setItem(CATALOG_STORAGE_KEY, JSON.stringify(programs));
  } catch (err) {
    console.warn('Error saving assessment catalog:', err);
  }
}

export function getProgramsByCompany(companyId: string): AssessmentProgram[] {
  const all = getAllPrograms();
  return all.filter((p) => p.companyId === companyId);
}

export function getProgramById(programId: string): AssessmentProgram | undefined {
  const all = getAllPrograms();
  return all.find((p) => p.id === programId) || all[0];
}
