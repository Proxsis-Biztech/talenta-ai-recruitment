import React from 'react';
import { AdminBankSoalEditor } from './AdminBankSoalEditor';

interface AdminMateriSoalHubProps {
  initialTab?: 'materi' | 'bank-soal';
  initialProgramCode?: string;
  initialCompanyName?: string;
}

export function AdminMateriSoalHub({
  initialTab = 'bank-soal',
  initialProgramCode,
  initialCompanyName
}: AdminMateriSoalHubProps) {
  return (
    <AdminBankSoalEditor
      initialFocus={initialTab}
      initialProgramCode={initialProgramCode}
      initialCompanyName={initialCompanyName}
    />
  );
}
