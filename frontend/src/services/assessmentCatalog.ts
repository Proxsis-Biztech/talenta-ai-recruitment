// Central Assessment & Company Catalog Service for Multi-Company (Banyak PT) support

export interface QuestionItem {
  id: number;
  type: 'single' | 'multi' | 'short' | 'essay' | 'matching';
  competency: string;
  difficulty: 'Mudah' | 'Sedang' | 'Sulit';
  text: string;
  codeSnippet?: string;
  options?: { key: string; label: string; isCorrect?: boolean }[];
  matchingPairs?: { left: string; rightOptions: string[]; correctRight?: string }[];
  explanation?: string;
  correctAnswer?: string;
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
export function generateProgramQuestions(
  programTitle: string,
  companyName: string,
  gradeLevel: AssessmentProgram['gradeLevel'] = 'Grade B (Specialist / Mid)'
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
      explanation: 'Penerapan queue asinkron dengan backpressure dan distributed mutex lock mencegah thread starvation dan lonjakan beban langsung pada database inti.',
      options: [
        { key: 'A', label: 'Menerapkan asynchronous event-driven queue dengan backpressure handling dan distributed caching mutex.', isCorrect: true },
        { key: 'B', label: 'Memproses seluruh query secara synchronous langsung ke master database tanpa caching.', isCorrect: false },
        { key: 'C', label: 'Menonaktifkan audit trail logging untuk mengurangi penggunaan memori server.', isCorrect: false },
        { key: 'D', label: 'Membatasi koneksi peramban secara statis tanpa sistem retry otomatis.', isCorrect: false }
      ]
    },
    {
      id: 2,
      type: 'multi',
      competency: 'Data Integrity & Optimization',
      difficulty: isJunior ? 'Mudah' : 'Sulit',
      text: `Pilihlah DUA prinsip utama dalam menjamin konsistensi data transaksi finansial/operasional pada sistem berskala terdistribusi:`,
      explanation: 'Transactional Outbox menjamin dual-write problem teratasi, sedangkan locking terukur pada baris kritis mencegah race condition tanpa blocking tabel.',
      options: [
        { key: 'A', label: 'Penerapan Transactional Outbox Pattern dan Idempotent Consumer untuk mencegah duplikasi.', isCorrect: true },
        { key: 'B', label: 'Penggunaan Read Committed Isolation Level dengan locking terukur pada baris kritis.', isCorrect: true },
        { key: 'C', label: 'Penyimpanan data password tanpa algoritma salting dan hashing.', isCorrect: false },
        { key: 'D', label: 'Menghindari mekanisme retry pada microservice downstream.', isCorrect: false }
      ]
    },
    {
      id: 3,
      type: 'short',
      competency: 'Standards & Protocols',
      difficulty: 'Mudah',
      text: `Sebutkan nama kode respon standar HTTP jika klien mengirimkan format payload request yang tidak dapat diproses oleh validator API (misal: 400, 422, 500):`,
      correctAnswer: '422 Unprocessable Entity (atau 400 Bad Request)',
      explanation: 'HTTP 422 Unprocessable Entity mengindikasikan sintaks request valid namun instruksi semantic tidak dapat diproses oleh domain validator.',
      options: []
    },
    {
      id: 4,
      type: 'essay',
      competency: 'Analytical Thinking & Strategy',
      difficulty: 'Sulit',
      text: `Uraikan analisis risiko dan rencana mitigasi Anda jika downstream service pihak ketiga mengalami latensi lebih dari 5.000 ms pada program ${programTitle}.`,
      explanation: 'Kandidat harus memaparkan pola Circuit Breaker (Open/Half-Open/Closed), graceful degradation dengan cache fallback, serta alur alerting ke tim SRE.',
      codeSnippet: `// Skenario Error Handling Downstream Client\ntry {\n  const result = await client.processTransaction({\n    payload: requestData,\n    timeoutMs: 4000\n  });\n} catch (err) {\n  // Implementasikan fallback & circuit breaker di sini\n}`
    },
    {
      id: 5,
      type: 'matching',
      competency: 'Core Knowledge & Architecture',
      difficulty: 'Sedang',
      text: `Pasangkan konsep arsitektur di kolom kiri dengan peran operasional yang paling tepat di kolom kanan:`,
      explanation: 'Pemisahan storage berdasar karakteristik latensi dan sifat persistensi data sangat fundamental.',
      matchingPairs: [
        { left: 'Distributed Cache (Redis Cluster)', rightOptions: ['Low-latency Temporary In-Memory Storage', 'Asynchronous Message Queue', 'Relational Persistent Database'], correctRight: 'Low-latency Temporary In-Memory Storage' },
        { left: 'Message Broker (Apache Kafka)', rightOptions: ['Asynchronous Message Queue', 'Low-latency Temporary In-Memory Storage', 'Relational Persistent Database'], correctRight: 'Asynchronous Message Queue' },
        { left: 'Primary Storage (PostgreSQL)', rightOptions: ['Relational Persistent Database', 'Low-latency Temporary In-Memory Storage', 'Asynchronous Message Queue'], correctRight: 'Relational Persistent Database' }
      ]
    }
  ];

  for (let i = 6; i <= 40; i++) {
    const qType: QuestionItem['type'] =
      i % 8 === 0 ? 'matching' : i % 7 === 0 ? 'essay' : i % 5 === 0 ? 'short' : i % 4 === 0 ? 'multi' : 'single';
    const diff: QuestionItem['difficulty'] =
      i % 3 === 0 ? (isJunior ? 'Sedang' : 'Sulit') : i % 2 === 0 ? 'Sedang' : (isSenior ? 'Sedang' : 'Mudah');

    const isMulti = qType === 'multi';

    questions.push({
      id: i,
      type: qType,
      competency: i % 3 === 0 ? 'Cloud & Engineering' : i % 2 === 0 ? 'Business Logic & Security' : 'Architecture & Quality',
      difficulty: diff,
      text: `Soal #${i} [${gradeLevel}]: Berdasarkan studi kasus ${programTitle} di ${companyName}, bagaimana pendekatan Anda dalam mengoptimalkan efisiensi komputasi, keamanan otorisasi data, dan ketahanan sistem (fault tolerance)?`,
      explanation: `Jawaban standar terbaik menekankan pemisahan lapisan (separation of concerns), validasi otorisasi berlapis (RBAC/ABAC), dan ketersediaan observabilitas menyeluruh.`,
      correctAnswer: qType === 'short' ? 'Separation of Concerns & Distributed Resilience' : undefined,
      options: [
        { key: 'A', label: 'Memisahkan concern antara lapisan bisnis murni dan lapisan integrasi, serta mengimplementasikan health-check otomatis.', isCorrect: true },
        { key: 'B', label: isMulti ? 'Menerapkan token authentication tersertifikasi dengan masa berlaku terbatas dan audit trail.' : 'Menggabungkan semua query dan controller ke dalam satu file tunggal tanpa pemisahan modul.', isCorrect: isMulti },
        { key: 'C', label: 'Mengabaikan exception handling dan membiarkan proses terminasi saat runtime exception.', isCorrect: false },
        { key: 'D', label: 'Menonaktifkan autentikasi session token pada endpoint internal.', isCorrect: false }
      ],
      matchingPairs: qType === 'matching' ? [
        { left: `Komponen Logika #${i}`, rightOptions: ['Business Rules Core', 'Infrastructure Driver', 'Transport Gateway'], correctRight: 'Business Rules Core' },
        { left: `Komponen Database #${i}`, rightOptions: ['Infrastructure Driver', 'Business Rules Core', 'Transport Gateway'], correctRight: 'Infrastructure Driver' }
      ] : undefined
    });
  }

  return questions;
}

export const DEFAULT_ASSESSMENT_PROGRAMS: AssessmentProgram[] = [
  // 1. PT Telkom Indonesia Tbk - SE-402
  {
    id: 'SE-402',
    companyId: 'PT-TELKOM',
    companyName: 'PT Telkom Indonesia Tbk',
    title: 'Software Engineer Specialist Batch IV (PT Telkom Indonesia Tbk)',
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
  // 2. PT Telkom Indonesia Tbk - CLD-301
  {
    id: 'CLD-301',
    companyId: 'PT-TELKOM',
    companyName: 'PT Telkom Indonesia Tbk',
    title: 'Lead Cloud Solutions Architect (PT Telkom Indonesia Tbk)',
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
  // 3. PT Telkom Indonesia Tbk - FED-101
  {
    id: 'FED-101',
    companyId: 'PT-TELKOM',
    companyName: 'PT Telkom Indonesia Tbk',
    title: 'Senior Frontend Engineer Specialist (PT Telkom Indonesia Tbk)',
    category: 'Web & Mobile Engineering',
    gradeLevel: 'Grade B (Specialist / Mid)',
    difficultyLabel: 'Sedang',
    durationMinutes: 75,
    totalQuestions: 40,
    passingScore: 75,
    description: 'Kompetensi rekayasa UI/UX modern, micro-frontend architecture, Web Vitals performance, dan state management enterprise.',
    questionTypes: ['single', 'multi', 'short', 'essay', 'matching'],
    questions: generateProgramQuestions('Senior Frontend Engineer Specialist', 'PT Telkom Indonesia Tbk', 'Grade B (Specialist / Mid)')
  },

  // 4. PT Bank Mandiri (Persero) Tbk - BMRI-DATA-02
  {
    id: 'BMRI-DATA-02',
    companyId: 'PT-MANDIRI',
    companyName: 'PT Bank Mandiri Tbk',
    title: 'Lead Data Engineer & Concurrency Specialist (PT Bank Mandiri Tbk)',
    category: 'Data Science & Finansial',
    gradeLevel: 'Grade A (Lead / Senior)',
    difficultyLabel: 'Sulit',
    durationMinutes: 90,
    totalQuestions: 40,
    passingScore: 80,
    description: 'Pipeline streaming terdistribusi, Lakehouse tuning, Apache Spark/Kafka, idempotensi data finansial berkapasitas tinggi.',
    questionTypes: ['single', 'multi', 'short', 'essay', 'matching'],
    questions: generateProgramQuestions('Lead Data Engineer & Concurrency Specialist', 'PT Bank Mandiri Tbk', 'Grade A (Lead / Senior)')
  },
  // 5. PT Bank Mandiri (Persero) Tbk - BMRI-SEC-03
  {
    id: 'BMRI-SEC-03',
    companyId: 'PT-MANDIRI',
    companyName: 'PT Bank Mandiri Tbk',
    title: 'Cybersecurity & Fraud Prevention Analyst (PT Bank Mandiri Tbk)',
    category: 'Information Security & Risk',
    gradeLevel: 'Grade A (Lead / Senior)',
    difficultyLabel: 'Sulit',
    durationMinutes: 90,
    totalQuestions: 40,
    passingScore: 80,
    description: 'Mitigasi ancaman zero-day, SOC SIEM anomaly detection, fraud transaction analysis, dan audit regulasi BI/OJK.',
    questionTypes: ['single', 'multi', 'short', 'essay', 'matching'],
    questions: generateProgramQuestions('Cybersecurity & Fraud Prevention Analyst', 'PT Bank Mandiri Tbk', 'Grade A (Lead / Senior)')
  },

  // 6. PT Bank CIMB Niaga Tbk - CIMB-BPM-02
  {
    id: 'CIMB-BPM-02',
    companyId: 'PT-CIMB',
    companyName: 'PT Bank CIMB Niaga Tbk',
    title: 'Senior Business Process Management Specialist (PT Bank CIMB Niaga Tbk)',
    category: 'Process Engineering & Governance',
    gradeLevel: 'Grade B (Specialist / Mid)',
    difficultyLabel: 'Sedang',
    durationMinutes: 75,
    totalQuestions: 40,
    passingScore: 75,
    description: 'Digital banking process re-engineering, lean operations, SLA governance, dan integrasi workflow otomatis.',
    questionTypes: ['single', 'multi', 'short', 'essay', 'matching'],
    questions: generateProgramQuestions('Senior Business Process Management Specialist', 'PT Bank CIMB Niaga Tbk', 'Grade B (Specialist / Mid)')
  },
  // 7. PT Bank CIMB Niaga Tbk - CIMB-AUD-01
  {
    id: 'CIMB-AUD-01',
    companyId: 'PT-CIMB',
    companyName: 'PT Bank CIMB Niaga Tbk',
    title: 'IT Internal Audit & Compliance Officer (PT Bank CIMB Niaga Tbk)',
    category: 'Internal Audit & Compliance',
    gradeLevel: 'Grade B (Specialist / Mid)',
    difficultyLabel: 'Sedang',
    durationMinutes: 75,
    totalQuestions: 40,
    passingScore: 75,
    description: 'Audit infrastruktur perbankan, COBIT 2019 framework, data privacy & compliance terhadap regulasi perlindungan data perbankan.',
    questionTypes: ['single', 'multi', 'short', 'essay', 'matching'],
    questions: generateProgramQuestions('IT Internal Audit & Compliance Officer', 'PT Bank CIMB Niaga Tbk', 'Grade B (Specialist / Mid)')
  },

  // 8. PT Astra International Tbk - ASII-OPS-01
  {
    id: 'ASII-OPS-01',
    companyId: 'PT-ASTRA',
    companyName: 'PT Astra International Tbk',
    title: 'Industrial Operations & Supply Chain Specialist (PT Astra International Tbk)',
    category: 'Supply Chain & Manufacturing',
    gradeLevel: 'Grade B (Specialist / Mid)',
    difficultyLabel: 'Sedang',
    durationMinutes: 75,
    totalQuestions: 40,
    passingScore: 75,
    description: 'Optimasi lean manufacturing, just-in-time logistics, supply chain predictive analytics, dan manajemen lini perakitan presisi.',
    questionTypes: ['single', 'multi', 'short', 'essay', 'matching'],
    questions: generateProgramQuestions('Industrial Operations & Supply Chain Specialist', 'PT Astra International Tbk', 'Grade B (Specialist / Mid)')
  },
  // 9. PT Astra International Tbk - ASII-FIN-02
  {
    id: 'ASII-FIN-02',
    companyId: 'PT-ASTRA',
    companyName: 'PT Astra International Tbk',
    title: 'Corporate Finance & M&A Strategic Analyst (PT Astra International Tbk)',
    category: 'Corporate Finance & Strategy',
    gradeLevel: 'Grade A (Lead / Senior)',
    difficultyLabel: 'Sulit',
    durationMinutes: 90,
    totalQuestions: 40,
    passingScore: 80,
    description: 'Financial modeling multi-skenario, capital budgeting, due diligence M&A, dan portofolio risk evaluation holding.',
    questionTypes: ['single', 'multi', 'short', 'essay', 'matching'],
    questions: generateProgramQuestions('Corporate Finance & M&A Strategic Analyst', 'PT Astra International Tbk', 'Grade A (Lead / Senior)')
  },

  // 10. PT Pertamina Hulu Energi - PHE-HSE-02
  {
    id: 'PHE-HSE-02',
    companyId: 'PT-PERTAMINA',
    companyName: 'PT Pertamina Hulu Energi',
    title: 'Environmental Safety & ESG Risk Engineer (PT Pertamina Hulu Energi)',
    category: 'Engineering & K3 Operasional',
    gradeLevel: 'Grade B (Specialist / Mid)',
    difficultyLabel: 'Sedang',
    durationMinutes: 90,
    totalQuestions: 40,
    passingScore: 75,
    description: 'Manajemen risiko HSE offshore/onshore, reduksi carbon footprint, kepatuhan ISO 14001, dan standar keselamatan hulu migas.',
    questionTypes: ['single', 'multi', 'short', 'essay', 'matching'],
    questions: generateProgramQuestions('Environmental Safety & ESG Risk Engineer', 'PT Pertamina Hulu Energi', 'Grade B (Specialist / Mid)')
  },
  // 11. PT Pertamina Hulu Energi - PHE-GEO-01
  {
    id: 'PHE-GEO-01',
    companyId: 'PT-PERTAMINA',
    companyName: 'PT Pertamina Hulu Energi',
    title: 'Senior Geoscientist & Subsurface Modeler (PT Pertamina Hulu Energi)',
    category: 'Geoscience & Exploration',
    gradeLevel: 'Grade A (Lead / Senior)',
    difficultyLabel: 'Sulit',
    durationMinutes: 90,
    totalQuestions: 40,
    passingScore: 80,
    description: 'Interpretasi seismik 3D, pemodelan reservoir reservoir statis & dinamis, karakterisasi petrofisika sumur eksplorasi migas.',
    questionTypes: ['single', 'multi', 'short', 'essay', 'matching'],
    questions: generateProgramQuestions('Senior Geoscientist & Subsurface Modeler', 'PT Pertamina Hulu Energi', 'Grade A (Lead / Senior)')
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

export function findProgramByTitle(jobTitle: string, jobId?: string): AssessmentProgram {
  const all = getAllPrograms();
  const normalizedJobTitle = jobTitle.toLowerCase().trim();
  
  // Exact or contains match
  const found = all.find(p => {
    const pTitle = p.title.toLowerCase().trim();
    return pTitle === normalizedJobTitle ||
           normalizedJobTitle.includes(pTitle) ||
           pTitle.includes(normalizedJobTitle) ||
           (jobId && p.id === jobId);
  });
  if (found) return found;

  // Extract company name if in parentheses
  const matchParen = jobTitle.match(/\(([^)]+)\)/);
  const companyName = matchParen ? matchParen[1] : 'Perusahaan Mitra';
  const cleanTitle = jobTitle.replace(/\([^)]+\)/, '').trim();

  return {
    id: jobId || 'PROG-CUSTOM',
    companyId: 'PT-DYNAMIC',
    companyName: companyName,
    title: jobTitle,
    category: 'Asesmen Kompetensi Teknis & Terapan',
    gradeLevel: 'Grade B (Specialist / Mid)',
    difficultyLabel: 'Sedang',
    durationMinutes: 75,
    totalQuestions: 40,
    passingScore: 75,
    description: `Program asesmen komprehensif untuk formasi ${cleanTitle} pada ${companyName}.`,
    questionTypes: ['single', 'multi', 'short', 'essay', 'matching'],
    questions: generateProgramQuestions(cleanTitle, companyName, 'Grade B (Specialist / Mid)')
  };
}
