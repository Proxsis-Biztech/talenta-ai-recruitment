import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import questionBank from '../data/question-bank.json';

const prisma = new PrismaClient();

export const DEFAULT_PROGRAMS_DATA = [
  {
    code: 'SE-402',
    title: 'Software Engineer Specialist Batch IV (PT Telkom Indonesia Tbk)',
    description: 'Pengujian arsitektur microservices, concurrency database, clean code, dan optimasi algoritma rekayasa software terapan.',
    status: 'active',
    interviewDuration: 90,
    interviewPassingScore: 75
  },
  {
    code: 'CLD-301',
    title: 'Lead Cloud Solutions Architect (PT Telkom Indonesia Tbk)',
    description: 'Evaluasi tingkat lanjut mencakup multi-region hybrid cloud, disaster recovery, Kubernetes clustering, dan kepatuhan ISO 27001.',
    status: 'active',
    interviewDuration: 90,
    interviewPassingScore: 80
  },
  {
    code: 'FED-101',
    title: 'Senior Frontend Engineer Specialist (PT Telkom Indonesia Tbk)',
    description: 'Kompetensi rekayasa UI/UX modern, micro-frontend architecture, Web Vitals performance, dan state management enterprise.',
    status: 'active',
    interviewDuration: 75,
    interviewPassingScore: 75
  },
  {
    code: 'BMRI-DATA-02',
    title: 'Lead Data Engineer & Concurrency Specialist (PT Bank Mandiri Tbk)',
    description: 'Pipeline streaming terdistribusi, Lakehouse tuning, Apache Spark/Kafka, idempotensi data finansial berkapasitas tinggi.',
    status: 'active',
    interviewDuration: 90,
    interviewPassingScore: 80
  },
  {
    code: 'BMRI-SEC-03',
    title: 'Cybersecurity & Fraud Prevention Analyst (PT Bank Mandiri Tbk)',
    description: 'Mitigasi ancaman zero-day, SOC SIEM anomaly detection, fraud transaction analysis, dan audit regulasi BI/OJK.',
    status: 'active',
    interviewDuration: 90,
    interviewPassingScore: 80
  },
  {
    code: 'CIMB-BPM-02',
    title: 'Senior Business Process Management Specialist (PT Bank CIMB Niaga Tbk)',
    description: 'Digital banking process re-engineering, lean operations, SLA governance, dan integrasi workflow otomatis.',
    status: 'active',
    interviewDuration: 75,
    interviewPassingScore: 75
  },
  {
    code: 'CIMB-AUD-01',
    title: 'IT Internal Audit & Compliance Officer (PT Bank CIMB Niaga Tbk)',
    description: 'Audit infrastruktur perbankan, COBIT 2019 framework, data privacy & compliance terhadap regulasi perlindungan data perbankan.',
    status: 'active',
    interviewDuration: 75,
    interviewPassingScore: 75
  },
  {
    code: 'ASII-OPS-01',
    title: 'Industrial Operations & Supply Chain Specialist (PT Astra International Tbk)',
    description: 'Optimasi lean manufacturing, just-in-time logistics, supply chain predictive analytics, dan manajemen lini perakitan presisi.',
    status: 'active',
    interviewDuration: 75,
    interviewPassingScore: 75
  },
  {
    code: 'ASII-FIN-02',
    title: 'Corporate Finance & M&A Strategic Analyst (PT Astra International Tbk)',
    description: 'Financial modeling multi-skenario, capital budgeting, due diligence M&A, dan portofolio risk evaluation holding.',
    status: 'active',
    interviewDuration: 90,
    interviewPassingScore: 80
  },
  {
    code: 'PHE-HSE-02',
    title: 'Environmental Safety & ESG Risk Engineer (PT Pertamina Hulu Energi)',
    description: 'Manajemen risiko HSE offshore/onshore, reduksi carbon footprint, kepatuhan ISO 14001, dan standar keselamatan hulu migas.',
    status: 'active',
    interviewDuration: 90,
    interviewPassingScore: 75
  },
  {
    code: 'PHE-GEO-01',
    title: 'Senior Geoscientist & Subsurface Modeler (PT Pertamina Hulu Energi)',
    description: 'Interpretasi seismik 3D, pemodelan reservoir reservoir statis & dinamis, karakterisasi petrofisika sumur eksplorasi migas.',
    status: 'active',
    interviewDuration: 90,
    interviewPassingScore: 80
  }
];

export async function bootstrapDatabaseSeed() {
  try {
    // 1. Ensure Superadmin account exists. The password comes from SUPERADMIN_PASSWORD.
    const superadminUser = 'superadmin';
    const configuredPassword = process.env.SUPERADMIN_PASSWORD;
    const isProduction = process.env.NODE_ENV === 'production';
    const plainPassword = configuredPassword || (isProduction ? null : 'cleaverzz25');
    const existingAdmin = await prisma.admin.findUnique({ where: { username: superadminUser } });

    if (!existingAdmin) {
      if (!plainPassword) {
        console.warn('⚠️ SUPERADMIN_PASSWORD belum diisi; akun superadmin tidak dibuat.');
      } else {
        await prisma.admin.create({
          data: {
            username: superadminUser,
            password: await bcrypt.hash(plainPassword, 10),
            role: 'superadmin'
          }
        });
        console.log('✅ Superadmin account seeded from SUPERADMIN_PASSWORD.');
      }
    } else if (configuredPassword) {
      const match = await bcrypt.compare(configuredPassword, existingAdmin.password);
      if (!match) {
        await prisma.admin.update({
          where: { username: superadminUser },
          data: { password: await bcrypt.hash(configuredPassword, 10), role: 'superadmin' }
        });
        console.log('✅ Superadmin password synchronized with SUPERADMIN_PASSWORD.');
      }
    }

    // 1b. Ensure tenants (PT / client companies) exist
    const tenantSeed = [
      { code: 'TELKOM', name: 'PT Telkom Indonesia Tbk', industry: 'Telecommunications' },
      { code: 'MANDIRI', name: 'PT Bank Mandiri (Persero) Tbk', industry: 'Banking' },
      { code: 'CIMB', name: 'PT Bank CIMB Niaga Tbk', industry: 'Banking' },
      { code: 'ASTRA', name: 'PT Astra International Tbk', industry: 'Conglomerate' },
      { code: 'PERTAMINA', name: 'PT Pertamina Hulu Energi', industry: 'Energy' }
    ];
    const tenantsByCode = new Map<string, any>();
    for (const tenant of tenantSeed) {
      const record = await prisma.tenant.upsert({
        where: { code: tenant.code },
        update: { name: tenant.name, industry: tenant.industry },
        create: tenant
      });
      tenantsByCode.set(tenant.code, record);
    }
    const tenantByName = new Map(Array.from(tenantsByCode.values()).map((tenant) => [tenant.name, tenant]));
    const normalizeCompany = (value: string) =>
      value.toLowerCase().replace(/[^a-z0-9]+/g, ' ').replace(/\b(pt|tbk|persero)\b/g, '').replace(/\s+/g, ' ').trim();
    const findTenantByTitle = (title: string) => {
      const normalizedTitle = normalizeCompany(title);
      return Array.from(tenantsByCode.values()).find((tenant) =>
        normalizedTitle.includes(normalizeCompany(tenant.name))
      ) || null;
    };
    console.log('✅ Tenants synchronized.');

    // 1c. Seed one admin per tenant (superadmin remains cross-tenant)
    for (const tenant of tenantSeed) {
      const username = `admin.${tenant.code.toLowerCase()}`;
      const existingTenantAdmin = await prisma.admin.findUnique({ where: { username } });
      const tenantRecord = tenantsByCode.get(tenant.code);
      if (!existingTenantAdmin) {
        await prisma.admin.create({
          data: {
            username,
            password: await bcrypt.hash('admin123', 10),
            role: 'admin',
            tenantId: tenantRecord?.id
          }
        });
      } else if (!existingTenantAdmin.tenantId) {
        await prisma.admin.update({ where: { id: existingTenantAdmin.id }, data: { tenantId: tenantRecord?.id } });
      }
    }
    console.log('✅ Tenant administrators synchronized.');

    // 2. Ensure Assessment Jobs exist (seed only the missing ones, keep catalog order stable)
    console.log('ℹ️ Syncing assessment jobs into database...');
    const existingJobs = await prisma.job.findMany();
    const jobsByTitle = new Map(existingJobs.map((j) => [j.title, j]));
    let jobsList: any[] = [];
    let newlySeededJobs = 0;

    for (const item of DEFAULT_PROGRAMS_DATA) {
      let job = jobsByTitle.get(item.title);
      if (!job) {
        try {
          job = await prisma.job.create({
            data: {
              code: item.code,
              title: item.title,
              description: item.description,
              status: item.status,
              interviewDuration: item.interviewDuration,
              interviewPassingScore: item.interviewPassingScore,
              tenantId: findTenantByTitle(item.title)?.id
            }
          });
          newlySeededJobs += 1;
        } catch (e) {
          // ignore duplicate title if any
        }
      } else {
        const updates: any = {};
        if (!job.code) updates.code = item.code;
        if (!job.tenantId) {
          const tenant = findTenantByTitle(item.title);
          if (tenant) updates.tenantId = tenant.id;
        }
        if (Object.keys(updates).length > 0) {
          try {
            job = await prisma.job.update({ where: { id: job.id }, data: updates });
          } catch {
            // keep the existing job when a unique code is already assigned elsewhere
          }
        }
      }
      if (job) jobsList.push(job);
    }
    if (newlySeededJobs > 0) console.log(`✅ Seeded ${newlySeededJobs} missing assessment jobs.`);
    if (jobsList.length === 0) jobsList = await prisma.job.findMany();

    // 2b. Seed the server-side CAT question bank (answer keys never reach the browser)
    for (const program of questionBank.programs) {
      const count = await prisma.programQuestion.count({ where: { programCode: program.code } });
      if (count === 0) {
        await prisma.programQuestion.createMany({
          data: program.questions.map((q) => ({
            programCode: program.code,
            orderNo: q.id,
            type: q.type,
            competency: q.competency,
            difficulty: q.difficulty,
            text: q.text,
            codeSnippet: q.codeSnippet,
            options: JSON.stringify(q.options),
            matchingPairs: JSON.stringify(q.matchingPairs),
            correctAnswer: q.correctAnswer === null ? null : JSON.stringify(q.correctAnswer)
          }))
        });
      }
    }
    console.log('✅ CAT question bank synchronized.');

    for (const program of questionBank.programs) {
      await prisma.programAccessCode.upsert({
        where: { code: program.code },
        update: { programCode: program.code, active: true },
        create: {
          code: program.code,
          programCode: program.code,
          maxUses: 10000,
          expiresAt: new Date('2027-12-31T23:59:59Z'),
          active: true
        }
      });
    }
    console.log('✅ Program access codes synchronized.');

    // 2c. Seed demo portal accounts (passwords are hashed, never stored in plain text)
    const demoPortalUsers: any[] = [
      {
        email: 'farhan@kandidat.id',
        password: 'peserta123',
        name: 'Farhan Pratama',
        role: 'peserta',
        candidateCode: 'KND-0891',
        phone: '0812-8822-1920',
        companyId: 'PT-TELKOM',
        companyName: 'PT Telkom Indonesia Tbk',
        tenantCode: 'TELKOM',
        assessmentId: 'SE-402',
        assessmentTitle: 'Software Engineer Specialist Batch IV (PT Telkom Indonesia Tbk)',
        gradeLevel: 'Grade B (Specialist / Mid)'
      },
      {
        email: 'amanda@kandidat.id',
        password: 'peserta123',
        name: 'Amanda Nurul Aulia',
        role: 'peserta',
        candidateCode: 'KND-0892',
        phone: '0813-7721-4455',
        companyId: 'PT-MANDIRI',
        companyName: 'PT Bank Mandiri (Persero) Tbk',
        tenantCode: 'MANDIRI',
        assessmentId: 'BMRI-DATA-02',
        assessmentTitle: 'Data Science & Credit Risk Analytics',
        gradeLevel: 'Grade B (Specialist / Mid)'
      },
      {
        email: 'asesor@talenta.id',
        username: 'asesor',
        password: 'asesor123',
        name: 'Dr. Dwi Hartanto, M.Psi., Psikolog',
        role: 'asesor',
        companyName: 'PT Telkom Indonesia Tbk',
        tenantCode: 'TELKOM',
        specialization: 'Assessment Center & Behavioral Interview'
      }
    ];
    for (const account of demoPortalUsers) {
      const existing = await prisma.portalUser.findUnique({ where: { email: account.email } });
      const tenantId = account.tenantCode ? tenantsByCode.get(account.tenantCode)?.id : null;
      const { tenantCode: _tenantCode, ...accountData } = account;
      if (!existing) {
        await prisma.portalUser.create({
          data: { ...accountData, tenantId, password: await bcrypt.hash(account.password, 10) }
        });
      } else {
        const updates: any = {};
        if (account.candidateCode && !existing.candidateCode) updates.candidateCode = account.candidateCode;
        if (tenantId && !existing.tenantId) updates.tenantId = tenantId;
        if (Object.keys(updates).length > 0) {
          await prisma.portalUser.update({ where: { id: existing.id }, data: updates });
        }
      }
    }
    console.log('✅ Portal accounts synchronized.');

    // 3. Ensure Sample Applicants exist so Admin & Asesor views have real data
    if (jobsList.length > 0) {
      const existingEmails = new Set(
        (await prisma.applicant.findMany({ select: { email: true } })).map((a) => a.email)
      );
      console.log('ℹ️ Seeding realistic candidates into database...');
      const sampleApplicants = [
        {
          fullName: 'Farhan Pratama',
          email: 'farhan@kandidat.id',
          phone: '081234567890',
          placeOfBirth: 'Jakarta',
          dateOfBirth: new Date('1998-05-14'),
          address: 'Jl. Merdeka Barat No. 12, Jakarta Pusat',
          gender: 'Pria',
          education: 'S1',
          university: 'Institut Teknologi Bandung',
          major: 'Teknik Informatika',
          gpa: 3.82,
          cvFileName: 'CV_Farhan_Pratama.pdf',
          cvMimeType: 'application/pdf',
          appliedPosition: jobsList[0]?.title || 'Software Engineer Specialist Batch IV (PT Telkom Indonesia Tbk)',
          jobId: jobsList[0]?.id,
          screeningStatus: 'success',
          screeningScore: 94,
          screeningSummary: 'Kandidat memiliki rekam jejak arsitektur sistemik teruji, penguasaan Event-Driven Microservices dan Kafka solid.',
          interviewStatus: 'scored',
          interviewScore: 92,
          interviewResult: 'Level 5 - Sangat Kompeten (Exemplary). BARS: 4.8 / 5.0. Direkomendasikan kuat untuk posisi Senior/Lead.',
          interviewTranscript: 'Kandidat menjelaskan penerapan Transactional Outbox Pattern dan De-duplication ID dengan sangat presisi.'
        },
        {
          fullName: 'Budi Santoso',
          email: 'budi.mandiri@kandidat.id',
          phone: '081298765432',
          placeOfBirth: 'Surabaya',
          dateOfBirth: new Date('1997-08-20'),
          address: 'Jl. Pemuda No. 45, Surabaya',
          gender: 'Pria',
          education: 'S1',
          university: 'Universitas Indonesia',
          major: 'Sistem Informasi',
          gpa: 3.75,
          cvFileName: 'CV_Budi_Santoso.pdf',
          cvMimeType: 'application/pdf',
          appliedPosition: jobsList[3]?.title || 'Lead Data Engineer & Concurrency Specialist (PT Bank Mandiri Tbk)',
          jobId: jobsList[3]?.id || jobsList[0]?.id,
          screeningStatus: 'success',
          screeningScore: 90,
          screeningSummary: 'Pemahaman mendalam mengenai Lakehouse architecture, Apache Spark, dan penanganan deadlock transaksi finansial.',
          interviewStatus: 'scored',
          interviewScore: 88,
          interviewResult: 'Level 4 - Kompeten (Proficient). BARS: 4.5 / 5.0. Pemahaman konseptual dan implementasi data warehouse kuat.'
        },
        {
          fullName: 'Siti Rahmawati',
          email: 'siti.rahma@kandidat.id',
          phone: '081377889900',
          placeOfBirth: 'Bandung',
          dateOfBirth: new Date('1999-02-11'),
          address: 'Jl. Dago No. 88, Bandung',
          gender: 'Wanita',
          education: 'S1',
          university: 'Institut Teknologi Sepuluh Nopember',
          major: 'Teknik Komputer',
          gpa: 3.88,
          cvFileName: 'CV_Siti_Rahmawati.pdf',
          cvMimeType: 'application/pdf',
          appliedPosition: jobsList[1]?.title || 'Lead Cloud Solutions Architect (PT Telkom Indonesia Tbk)',
          jobId: jobsList[1]?.id || jobsList[0]?.id,
          screeningStatus: 'success',
          screeningScore: 92,
          screeningSummary: 'Sertifikasi AWS Solutions Architect & CKA Kubernetes terverifikasi, pengalaman migrasi on-premise ke hybrid cloud.',
          interviewStatus: 'in_progress',
          interviewScore: null
        },
        {
          fullName: 'Amanda Nurul',
          email: 'amanda.nurul@kandidat.id',
          phone: '081211223344',
          placeOfBirth: 'Yogyakarta',
          dateOfBirth: new Date('2000-01-15'),
          address: 'Jl. Kaliurang Km 5, Yogyakarta',
          gender: 'Wanita',
          education: 'S1',
          university: 'Universitas Gadjah Mada',
          major: 'Ilmu Komputer',
          gpa: 3.70,
          cvFileName: 'CV_Amanda_Nurul.pdf',
          cvMimeType: 'application/pdf',
          appliedPosition: jobsList[2]?.title || 'Senior Frontend Engineer Specialist (PT Telkom Indonesia Tbk)',
          jobId: jobsList[2]?.id || jobsList[0]?.id,
          screeningStatus: 'success',
          screeningScore: 86,
          screeningSummary: 'Portofolio UI component library dan micro-frontend enterprise solid.',
          interviewStatus: 'not_started',
          interviewScore: null
        },
        {
          fullName: 'Dewi Lestari',
          email: 'dewi.lestari@kandidat.id',
          phone: '081399887766',
          placeOfBirth: 'Semarang',
          dateOfBirth: new Date('1998-11-03'),
          address: 'Jl. Pandanaran No. 20, Semarang',
          gender: 'Wanita',
          education: 'S1',
          university: 'Universitas Diponegoro',
          major: 'Teknik Elektro',
          gpa: 3.65,
          cvFileName: 'CV_Dewi_Lestari.pdf',
          cvMimeType: 'application/pdf',
          appliedPosition: jobsList[4]?.title || 'Cybersecurity & Fraud Prevention Analyst (PT Bank Mandiri Tbk)',
          jobId: jobsList[4]?.id || jobsList[0]?.id,
          screeningStatus: 'success',
          screeningScore: 88,
          screeningSummary: 'Pengalaman di Security Operations Center (SOC) dan audit ISO 27001.',
          interviewStatus: 'completed',
          interviewScore: 85,
          interviewResult: 'Level 4 - Kompeten. BARS: 4.3 / 5.0.'
        },
        {
          fullName: 'Reza Fauzi',
          email: 'reza.fauzi@kandidat.id',
          phone: '081255667788',
          placeOfBirth: 'Medan',
          dateOfBirth: new Date('1997-04-25'),
          address: 'Jl. Gatot Subroto No. 100, Medan',
          gender: 'Pria',
          education: 'S1',
          university: 'Universitas Sumatera Utara',
          major: 'Teknik Industri',
          gpa: 3.60,
          cvFileName: 'CV_Reza_Fauzi.pdf',
          cvMimeType: 'application/pdf',
          appliedPosition: jobsList[7]?.title || 'Industrial Operations & Supply Chain Specialist (PT Astra International Tbk)',
          jobId: jobsList[7]?.id || jobsList[0]?.id,
          screeningStatus: 'pending',
          screeningScore: null,
          interviewStatus: 'not_started',
          interviewScore: null
        }
      ];

      let seededApplicants = 0;
      for (const app of sampleApplicants) {
        if (existingEmails.has(app.email)) continue;
        try {
          await prisma.applicant.create({
            data: app
          });
          existingEmails.add(app.email);
          seededApplicants += 1;
        } catch (e) {
          // ignore duplicate email
        }
      }
      if (seededApplicants > 0) {
        console.log(`✅ Seeded ${seededApplicants} missing realistic applicants.`);
      }
    }
  } catch (err) {
    console.warn('Bootstrap seed error:', err);
  } finally {
    await prisma.$disconnect();
  }
}
