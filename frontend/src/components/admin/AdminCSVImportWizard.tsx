import React, { useState } from 'react';
import {
  Upload,
  CheckCircle2,
  AlertTriangle,
  FileSpreadsheet,
  ArrowRight,
  ArrowLeft,
  X,
  FileText,
  Database,
  Check
} from 'lucide-react';
import { Button, Badge, Modal, Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from '../ui';

interface AdminCSVImportWizardProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (importedCount: number) => void;
}

export function AdminCSVImportWizard({ isOpen, onClose, onSuccess }: AdminCSVImportWizardProps) {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [fileName, setFileName] = useState('data_kandidat_batch4.csv');
  const [fileSize, setFileSize] = useState('142 KB');

  // Step 2 Mapping state
  const [columnMapping, setColumnMapping] = useState({
    name: 'nama_lengkap',
    email: 'alamat_email',
    phone: 'nomor_wa',
    pt: 'perusahaan_tujuan',
    program: 'nama_program'
  });

  // Step 3 Mock preview rows
  const [previewRows, setPreviewRows] = useState([
    { row: 1, name: 'Adi Nugroho', email: 'adi.nugroho@corp.id', phone: '081234567891', pt: 'PT Telkom Indonesia', program: 'Software Engineer Batch IV', status: 'valid' },
    { row: 2, name: 'Siti Rahmawati', email: 'siti.rahma@gmail.com', phone: '081234567892', pt: 'PT Telkom Indonesia', program: 'Software Engineer Batch IV', status: 'valid' },
    { row: 3, name: 'Denny Kurnia', email: 'invalid_email_format', phone: '081234567893', pt: 'Astra International', program: 'Data Analyst Fellow', status: 'error', errorMsg: 'Format email tidak valid' },
    { row: 4, name: 'Maya Anggraini', email: 'maya.a@tech.co', phone: '081234567894', pt: 'Bank Mandiri Tbk', program: 'Software Engineer Batch IV', status: 'valid' },
    { row: 5, name: 'Rian Hidayat', email: 'rian.h@bumn.id', phone: '081234567895', pt: 'PT Telkom Indonesia', program: 'Software Engineer Batch IV', status: 'valid' }
  ]);

  const validCount = previewRows.filter((r) => r.status === 'valid').length;
  const errorCount = previewRows.filter((r) => r.status === 'error').length;

  const handleFinishImport = () => {
    onSuccess(validCount);
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Import Peserta Massal (Wizard CSV 3 Langkah)">
      <div className="space-y-6">
        {/* Step Stepper Header */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
          <div className="flex items-center gap-6">
            {[
              { n: 1, label: 'Upload CSV' },
              { n: 2, label: 'Mapping Kolom' },
              { n: 3, label: 'Preview & Error Check' }
            ].map((s) => {
              const done = step > s.n;
              const active = step === s.n;
              return (
                <div key={s.n} className={`flex items-center gap-2 text-xs font-bold ${active ? 'text-primary-navy' : done ? 'text-ink' : 'text-slate-400'}`}>
                  <span className={`w-6 h-6 rounded-full flex items-center justify-center font-mono text-xs ${active ? 'bg-primary-navy text-white' : done ? 'bg-success-green text-white' : 'bg-slate-100'}`}>
                    {done ? '✓' : s.n}
                  </span>
                  <span>{s.label}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* ─── STEP 1: Upload File ─── */}
        {step === 1 && (
          <div className="space-y-4">
            <div className="border-2 border-dashed border-[#CBD5E1] hover:border-primary-navy rounded-2xl p-8 text-center transition-colors bg-slate-50/50 cursor-pointer">
              <div className="w-12 h-12 rounded-2xl bg-soft-blue text-primary-navy flex items-center justify-center mx-auto mb-3">
                <Upload className="w-6 h-6" />
              </div>
              <p className="text-sm font-bold text-ink">Tarik & Lepas File CSV Data Peserta ke Sini</p>
              <p className="text-xs text-muted-slate mt-1">atau klik untuk menelusuri berkas dari komputer (Maksimal 10 MB)</p>
            </div>

            <div className="p-3 bg-white border border-border-slate rounded-xl flex items-center justify-between text-xs">
              <div className="flex items-center gap-2.5">
                <FileSpreadsheet className="w-5 h-5 text-emerald-600" />
                <div>
                  <p className="font-bold text-ink">{fileName}</p>
                  <p className="text-[10px] text-muted-slate">{fileSize} • 5 Baris Terdeteksi</p>
                </div>
              </div>
              <Badge variant="success">File Siap Diproses</Badge>
            </div>
          </div>
        )}

        {/* ─── STEP 2: Mapping Kolom ─── */}
        {step === 2 && (
          <div className="space-y-4 text-xs">
            <p className="text-muted-slate">
              Cocokkan nama kolom di file CSV Anda dengan atribut data kandidat di database Talenta+:
            </p>

            <div className="space-y-3 bg-slate-50 p-4 rounded-xl border border-slate-200">
              <div className="grid grid-cols-2 gap-4 items-center">
                <span className="font-bold text-ink">Nama Lengkap Peserta (Wajib)</span>
                <select
                  value={columnMapping.name}
                  onChange={(e) => setColumnMapping({ ...columnMapping, name: e.target.value })}
                  className="px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-semibold"
                >
                  <option value="nama_lengkap">nama_lengkap</option>
                  <option value="full_name">full_name</option>
                  <option value="candidate_name">candidate_name</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4 items-center">
                <span className="font-bold text-ink">Alamat Email (Wajib)</span>
                <select
                  value={columnMapping.email}
                  onChange={(e) => setColumnMapping({ ...columnMapping, email: e.target.value })}
                  className="px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-semibold"
                >
                  <option value="alamat_email">alamat_email</option>
                  <option value="email">email</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4 items-center">
                <span className="font-bold text-ink">Nomor WhatsApp / HP</span>
                <select
                  value={columnMapping.phone}
                  onChange={(e) => setColumnMapping({ ...columnMapping, phone: e.target.value })}
                  className="px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-semibold"
                >
                  <option value="nomor_wa">nomor_wa</option>
                  <option value="phone">phone</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4 items-center">
                <span className="font-bold text-ink">Perusahaan / PT Terkait</span>
                <select
                  value={columnMapping.pt}
                  onChange={(e) => setColumnMapping({ ...columnMapping, pt: e.target.value })}
                  className="px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-semibold"
                >
                  <option value="perusahaan_tujuan">perusahaan_tujuan</option>
                  <option value="company">company</option>
                </select>
              </div>
            </div>
          </div>
        )}

        {/* ─── STEP 3: Preview Data & Error Check ─── */}
        {step === 3 && (
          <div className="space-y-4">
            <div className="flex items-center justify-between text-xs">
              <span className="text-emerald-700 font-bold bg-emerald-50 px-2.5 py-1 rounded-md border border-emerald-200">
                ✓ {validCount} Baris Valid
              </span>
              {errorCount > 0 && (
                <span className="text-red-700 font-bold bg-red-50 px-2.5 py-1 rounded-md border border-red-200 flex items-center gap-1">
                  <AlertTriangle className="w-3.5 h-3.5 text-red-600" />
                  {errorCount} Baris Bermasalah
                </span>
              )}
            </div>

            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Baris</TableHead>
                  <TableHead>Nama</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>PT Mitra</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {previewRows.map((r) => (
                  <TableRow key={r.row} className={r.status === 'error' ? 'bg-red-50/70' : ''}>
                    <TableCell className="font-mono font-bold text-slate-500">{r.row}</TableCell>
                    <TableCell className="font-semibold text-ink font-sans">{r.name}</TableCell>
                    <TableCell className="font-mono text-slate-600 text-xs">{r.email}</TableCell>
                    <TableCell className="text-slate-600 font-sans">{r.pt}</TableCell>
                    <TableCell>
                      {r.status === 'valid' ? (
                        <Badge variant="success" format="soft">
                          Valid
                        </Badge>
                      ) : (
                        <Badge variant="danger" format="soft" title={r.errorMsg}>
                          Error
                        </Badge>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}

        {/* Modal Wizard Navigation Footer */}
        <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
          {step > 1 ? (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setStep((s) => (s - 1) as any)}
              className="text-xs flex items-center gap-1.5"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Kembali</span>
            </Button>
          ) : (
            <div />
          )}

          {step < 3 ? (
            <Button
              variant="primary"
              size="sm"
              onClick={() => setStep((s) => (s + 1) as any)}
              className="text-xs flex items-center gap-1.5"
            >
              <span>Lanjutkan</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Button>
          ) : (
            <Button
              variant="primary"
              size="sm"
              onClick={handleFinishImport}
              className="text-xs flex items-center gap-1.5 bg-success-green hover:bg-[#15803D]"
            >
              <Check className="w-4 h-4" />
              <span>Impor {validCount} Kandidat Sekarang</span>
            </Button>
          )}
        </div>
      </div>
    </Modal>
  );
}
