import React, { useEffect, useState } from 'react';
import { BookOpen, CheckSquare } from 'lucide-react';
import { AdminMasterMateriTree } from './AdminMasterMateriTree';
import { AdminBankSoalEditor } from './AdminBankSoalEditor';

interface AdminMateriSoalHubProps {
  initialTab?: 'materi' | 'bank-soal';
}

export function AdminMateriSoalHub({ initialTab = 'materi' }: AdminMateriSoalHubProps) {
  const [activeTab, setActiveTab] = useState<'materi' | 'bank-soal'>(initialTab);

  useEffect(() => {
    setActiveTab(initialTab);
  }, [initialTab]);

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-2xl border border-slate-200 p-2 shadow-2xs flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => setActiveTab('materi')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
            activeTab === 'materi'
              ? 'bg-primary-navy text-white shadow-xs'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <BookOpen className="w-4 h-4" />
          <span>Master Materi &amp; Silabus</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('bank-soal')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
            activeTab === 'bank-soal'
              ? 'bg-primary-navy text-white shadow-xs'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <CheckSquare className="w-4 h-4" />
          <span>Bank Soal CAT</span>
        </button>
      </div>

      {activeTab === 'materi' ? <AdminMasterMateriTree /> : <AdminBankSoalEditor />}
    </div>
  );
}
