import React from 'react';
import { AdminBankSoalEditor } from './AdminBankSoalEditor';

interface AdminMateriSoalHubProps {
  initialTab?: 'materi' | 'bank-soal';
  initialProgramCode?: string;
  initialCompanyName?: string;
  onBackToPrograms?: () => void;
}

export function AdminMateriSoalHub({
  initialTab = 'bank-soal',
  initialProgramCode,
  initialCompanyName,
  onBackToPrograms
}: AdminMateriSoalHubProps) {
  return (
    <AdminBankSoalEditor
      initialFocus={initialTab}
      initialProgramCode={initialProgramCode}
      initialCompanyName={initialCompanyName}
      onBackToPrograms={onBackToPrograms}
    />
  );
}
