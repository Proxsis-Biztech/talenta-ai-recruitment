import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

export const DEFAULT_PROGRAMS_DATA = [
  {
    title: 'Software Engineer Specialist Batch IV (PT Telkom Indonesia Tbk)',
    description: 'Pengujian arsitektur microservices, concurrency database, clean code, dan optimasi algoritma rekayasa software terapan.',
    status: 'active',
    interviewDuration: 90,
    interviewPassingScore: 75
  },
  {
    title: 'Lead Cloud Solutions Architect (PT Telkom Indonesia Tbk)',
    description: 'Evaluasi tingkat lanjut mencakup multi-region hybrid cloud, disaster recovery, Kubernetes clustering, dan kepatuhan ISO 27001.',
    status: 'active',
    interviewDuration: 90,
    interviewPassingScore: 80
  },
  {
    title: 'Senior Frontend Engineer Specialist (PT Telkom Indonesia Tbk)',
    description: 'Kompetensi rekayasa UI/UX modern, micro-frontend architecture, Web Vitals performance, dan state management enterprise.',
    status: 'active',
    interviewDuration: 75,
    interviewPassingScore: 75
  },
  {
    title: 'Lead Data Engineer & Concurrency Specialist (PT Bank Mandiri Tbk)',
    description: 'Pipeline streaming terdistribusi, Lakehouse tuning, Apache Spark/Kafka, idempotensi data finansial berkapasitas tinggi.',
    status: 'active',
    interviewDuration: 90,
    interviewPassingScore: 80
  },
  {
    title: 'Cybersecurity & Fraud Prevention Analyst (PT Bank Mandiri Tbk)',
    description: 'Mitigasi ancaman zero-day, SOC SIEM anomaly detection, fraud transaction analysis, dan audit regulasi BI/OJK.',
    status: 'active',
    interviewDuration: 90,
    interviewPassingScore: 80
  },
  {
    title: 'Senior Business Process Management Specialist (PT Bank CIMB Niaga Tbk)',
    description: 'Digital banking process re-engineering, lean operations, SLA governance, dan integrasi workflow otomatis.',
    status: 'active',
    interviewDuration: 75,
    interviewPassingScore: 75
  },
  {
    title: 'IT Internal Audit & Compliance Officer (PT Bank CIMB Niaga Tbk)',
    description: 'Audit infrastruktur perbankan, COBIT 2019 framework, data privacy & compliance terhadap regulasi perlindungan data perbankan.',
    status: 'active',
    interviewDuration: 75,
    interviewPassingScore: 75
  },
  {
    title: 'Industrial Operations & Supply Chain Specialist (PT Astra International Tbk)',
    description: 'Optimasi lean manufacturing, just-in-time logistics, supply chain predictive analytics, dan manajemen lini perakitan presisi.',
    status: 'active',
    interviewDuration: 75,
    interviewPassingScore: 75
  },
  {
    title: 'Corporate Finance & M&A Strategic Analyst (PT Astra International Tbk)',
    description: 'Financial modeling multi-skenario, capital budgeting, due diligence M&A, dan portofolio risk evaluation holding.',
    status: 'active',
    interviewDuration: 90,
    interviewPassingScore: 80
  },
  {
    title: 'Environmental Safety & ESG Risk Engineer (PT Pertamina Hulu Energi)',
    description: 'Manajemen risiko HSE offshore/onshore, reduksi carbon footprint, kepatuhan ISO 14001, dan standar keselamatan hulu migas.',
    status: 'active',
    interviewDuration: 90,
    interviewPassingScore: 75
  },
  {
    title: 'Senior Geoscientist & Subsurface Modeler (PT Pertamina Hulu Energi)',
    description: 'Interpretasi seismik 3D, pemodelan reservoir reservoir statis & dinamis, karakterisasi petrofisika sumur eksplorasi migas.',
    status: 'active',
    interviewDuration: 90,
    interviewPassingScore: 80
  }
];

export async function bootstrapDatabaseSeed() {
  try {
    // 1. Ensure Superadmin account exists
    const superadminUser = 'superadmin';
    const plainPassword = 'cleaverzz25';
    const existingAdmin = await prisma.admin.findUnique({ where: { username: superadminUser } });
    const hashedPassword = await bcrypt.hash(plainPassword, 10);

    if (!existingAdmin) {
      await prisma.admin.create({
        data: {
          username: superadminUser,
          password: hashedPassword,
          role: 'superadmin'
        }
      });
      console.log('✅ Default superadmin seeded: superadmin / cleaverzz25');
    } else {
      const match = await bcrypt.compare(plainPassword, existingAdmin.password);
      if (!match) {
        await prisma.admin.update({
          where: { username: superadminUser },
          data: { password: hashedPassword, role: 'superadmin' }
        });
        console.log('✅ Superadmin password synchronized.');
      }
    }

    // 2. Ensure Assessment Jobs exist
    const jobCount = await prisma.job.count();
    let jobsList: any[] = [];

    if (jobCount === 0) {
      console.log('ℹ️ Seeding default assessment jobs into database...');
      for (const item of DEFAULT_PROGRAMS_DATA) {
        try {
          const j = await prisma.job.create({
            data: {
              title: item.title,
              description: item.description,
              status: item.status,
              interviewDuration: item.interviewDuration,
              interviewPassingScore: item.interviewPassingScore
            }
          });
          jobsList.push(j);
        } catch (e) {
          // ignore duplicate title if any
        }
      }
      console.log(`✅ Seeded ${jobsList.length} assessment jobs.`);
    } else {
      jobsList = await prisma.job.findMany();
    }

    // 3. Ensure Sample Applicants exist so Admin & Asesor views have real data
    const applicantCount = await prisma.applicant.count();
    if (applicantCount === 0 && jobsList.length > 0) {
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

      for (const app of sampleApplicants) {
        try {
          await prisma.applicant.create({
            data: app
          });
        } catch (e) {
          // ignore duplicate email
        }
      }
      console.log(`✅ Seeded ${sampleApplicants.length} realistic applicants.`);
    }
  } catch (err) {
    console.warn('Bootstrap seed error:', err);
  } finally {
    await prisma.$disconnect();
  }
}
