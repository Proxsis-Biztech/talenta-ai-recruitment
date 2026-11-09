import { Response } from 'express';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import multer from 'multer';
import * as XLSX from 'xlsx';
import { type AuthRequest } from '../middleware/auth';
import { recordAuditLog } from '../services/auditService';
import { ensureApplicantForPortalUser } from '../services/portalApplicantSync';

const prisma = new PrismaClient();

export const uploadExcel = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, callback) => {
    const allowed = [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-excel',
      'application/octet-stream'
    ];
    if (allowed.includes(file.mimetype) || /\.(xlsx|xls)$/i.test(file.originalname)) {
      callback(null, true);
    } else {
      callback(new Error('Format file harus .xlsx atau .xls'));
    }
  }
}).single('file');

const HEADER_ALIASES = {
  name: ['namalengkap', 'nama', 'name', 'fullname'],
  email: ['email', 'surel', 'alamatemail'],
  password: ['password', 'katasandi', 'sandi'],
  phone: ['notelepon', 'telepon', 'phone', 'nohp', 'whatsapp'],
  programCode: ['kodeprogram', 'programcode', 'kodeasesmen', 'program', 'kode'],
  companyName: ['perusahaan', 'company', 'namaperusahaan', 'instansi'],
  gradeLevel: ['grade', 'gradelevel', 'level', 'tingkat']
};

const normalizeRow = (row: Record<string, unknown>) => {
  const normalized: Record<string, string> = {};
  for (const [key, value] of Object.entries(row)) {
    const normalizedKey = key.toLowerCase().replace(/[^a-z0-9]/g, '');
    normalized[normalizedKey] = String(value ?? '').trim();
  }
  const pick = (aliases: string[]) => {
    for (const alias of aliases) {
      if (normalized[alias]) return normalized[alias];
    }
    return '';
  };
  return {
    name: pick(HEADER_ALIASES.name),
    email: pick(HEADER_ALIASES.email).toLowerCase(),
    password: pick(HEADER_ALIASES.password) || 'peserta123',
    phone: pick(HEADER_ALIASES.phone),
    programCode: pick(HEADER_ALIASES.programCode).toUpperCase(),
    companyName: pick(HEADER_ALIASES.companyName),
    gradeLevel: pick(HEADER_ALIASES.gradeLevel)
  };
};

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const downloadPortalUserTemplate = async (_req: AuthRequest, res: Response) => {
  try {
    const jobs = await prisma.job.findMany({
      where: { status: 'active' },
      select: { code: true, title: true },
      orderBy: { title: 'asc' }
    });

    const workbook = XLSX.utils.book_new();
    const instructions = XLSX.utils.aoa_to_sheet([
      ['TEMPLATE IMPORT PESERTA — RIGHT ASSESSMENT'],
      [''],
      ['Petunjuk:'],
      ['1. Isi sheet "Data Peserta" tanpa mengubah nama kolom.'],
      ['2. Nama Lengkap, Email, dan Kode Program wajib diisi.'],
      ['3. Password minimal 8 karakter. Jika kosong, sistem memakai "peserta123".'],
      ['4. Kode Program harus salah satu dari daftar di sheet "Referensi Program".'],
      ['5. Satu email hanya boleh digunakan satu kali.'],
      ['6. Maksimal 500 baris per file, ukuran maksimal 5 MB.'],
      [''],
      ['Kolom:', 'Nama Lengkap | Email | Password | No. Telepon | Kode Program | Perusahaan | Grade Level']
    ]);
    instructions['!cols'] = [{ wch: 100 }];
    XLSX.utils.book_append_sheet(workbook, instructions, 'Petunjuk');

    const dataSheet = XLSX.utils.json_to_sheet([
      {
        'Nama Lengkap': 'Contoh Kandidat',
        Email: 'contoh.kandidat@email.com',
        Password: 'peserta123',
        'No. Telepon': '081234567890',
        'Kode Program': jobs[0]?.code || 'SE-402',
        Perusahaan: 'PT Telkom Indonesia Tbk',
        'Grade Level': 'Grade B (Specialist / Mid)'
      }
    ], {
      header: ['Nama Lengkap', 'Email', 'Password', 'No. Telepon', 'Kode Program', 'Perusahaan', 'Grade Level']
    });
    dataSheet['!cols'] = [
      { wch: 28 }, { wch: 32 }, { wch: 16 }, { wch: 20 }, { wch: 18 }, { wch: 36 }, { wch: 28 }
    ];
    XLSX.utils.book_append_sheet(workbook, dataSheet, 'Data Peserta');

    const reference = XLSX.utils.json_to_sheet(
      jobs.filter((job) => job.code).map((job) => ({ 'Kode Program': job.code, 'Nama Program': job.title }))
    );
    reference['!cols'] = [{ wch: 18 }, { wch: 80 }];
    XLSX.utils.book_append_sheet(workbook, reference, 'Referensi Program');

    const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename="Template_Import_Peserta_Right.xlsx"');
    return res.send(buffer);
  } catch (error) {
    console.error('Download import template error:', error);
    return res.status(500).json({ error: 'Gagal membuat template Excel.' });
  }
};

export const importPortalUsers = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'File Excel wajib diunggah.' });
    }

    const workbook = XLSX.read(req.file.buffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames.includes('Data Peserta')
      ? 'Data Peserta'
      : workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    if (!sheet) {
      return res.status(400).json({ error: 'Sheet data tidak ditemukan.' });
    }

    const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: '' });
    if (rows.length === 0) {
      return res.status(400).json({ error: 'File Excel tidak berisi data peserta.' });
    }
    if (rows.length > 500) {
      return res.status(400).json({ error: 'Maksimal 500 baris per import.' });
    }

    const jobs = await prisma.job.findMany({ select: { code: true, title: true } });
    const jobsByCode = new Map(
      jobs.filter((job) => job.code).map((job) => [String(job.code).toUpperCase(), job])
    );

    const existingEmails = new Set(
      (await prisma.portalUser.findMany({ select: { email: true } })).map((user) => user.email)
    );

    const errors: Array<{ row: number; email: string; message: string }> = [];
    let created = 0;
    let skipped = 0;

    for (let index = 0; index < rows.length; index += 1) {
      const rowNumber = index + 2;
      const data = normalizeRow(rows[index]);

      if (!data.name || !data.email || !data.programCode) {
        errors.push({ row: rowNumber, email: data.email, message: 'Nama, email, dan kode program wajib diisi.' });
        skipped += 1;
        continue;
      }
      if (!emailPattern.test(data.email)) {
        errors.push({ row: rowNumber, email: data.email, message: 'Format email tidak valid.' });
        skipped += 1;
        continue;
      }
      if (data.password.length < 8) {
        errors.push({ row: rowNumber, email: data.email, message: 'Password minimal 8 karakter.' });
        skipped += 1;
        continue;
      }
      if (existingEmails.has(data.email)) {
        errors.push({ row: rowNumber, email: data.email, message: 'Email sudah terdaftar.' });
        skipped += 1;
        continue;
      }
      const job = jobsByCode.get(data.programCode);
      if (!job) {
        errors.push({ row: rowNumber, email: data.email, message: `Kode program "${data.programCode}" tidak ditemukan.` });
        skipped += 1;
        continue;
      }

      const companyFromTitle = job.title.match(/\(([^)]+)\)\s*$/)?.[1] || '';
      try {
        const createdUser = await prisma.portalUser.create({
          data: {
            name: data.name,
            email: data.email,
            password: await bcrypt.hash(data.password, 10),
            phone: data.phone || null,
            role: 'peserta',
            mustChangePassword: true,
            profileCompleted: false,
            companyName: data.companyName || companyFromTitle || null,
            assessmentId: job.code,
            assessmentTitle: job.title,
            gradeLevel: data.gradeLevel || 'Grade B (Specialist / Mid)',
            interviewScheduledAt: new Date()
          }
        });
        await ensureApplicantForPortalUser(createdUser.id);
        existingEmails.add(data.email);
        created += 1;
      } catch {
        errors.push({ row: rowNumber, email: data.email, message: 'Gagal menyimpan baris ini.' });
        skipped += 1;
      }
    }

    recordAuditLog({
      actor: req.user?.username || 'admin',
      action: 'BULK_IMPORT_PESERTA',
      category: 'DATA_MUTATION',
      ip: req.ip || '127.0.0.1',
      target: req.file.originalname,
      details: `Import Excel selesai: ${created} dibuat, ${skipped} dilewati.`,
      status: errors.length > 0 ? 'WARNING' : 'SUCCESS'
    });

    return res.json({
      message: 'Import Excel selesai diproses.',
      created,
      skipped,
      total: rows.length,
      errors: errors.slice(0, 100)
    });
  } catch (error) {
    console.error('Import portal users error:', error);
    return res.status(500).json({ error: 'Gagal memproses file Excel.' });
  }
};