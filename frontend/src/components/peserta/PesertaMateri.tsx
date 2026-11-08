import React, { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import {
  BookOpen,
  Search,
  FileText,
  Layers,
  ChevronRight,
  CheckCircle2,
  X
} from 'lucide-react';
import { PesertaLayout } from './PesertaLayout';
import { Button, Badge, Modal } from '../ui';
import { getPortalToken } from '../../services/portalAuthService';

interface MateriItem {
  id: string;
  code: string;
  title: string;
  category: string;
  subcategory?: string;
  competency?: string;
  companyName?: string;
  assessmentType?: string;
  assessmentLevel?: string;
  type?: string;
  version?: string;
  content: string;
  rubric?: string;
  behavioralIndicators?: string[];
  status?: string;
}

export default function PesertaMateri() {
  const [items, setItems] = useState<MateriItem[]>([]);
  const [programTitle, setProgramTitle] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [activeItem, setActiveItem] = useState<MateriItem | null>(null);

  useEffect(() => {
    let cancelled = false;
    const token = getPortalToken();
    if (!token) {
      setError('Sesi tidak ditemukan. Silakan masuk kembali.');
      setLoading(false);
      return;
    }
    axios
      .get('/api/portal/materials', { headers: { Authorization: `Bearer ${token}` } })
      .then((response) => {
        if (cancelled) return;
        setItems(Array.isArray(response.data?.data) ? response.data.data : []);
        setProgramTitle(response.data?.programTitle || '');
      })
      .catch(() => {
        if (!cancelled) setError('Gagal memuat materi asesmen.');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const filtered = useMemo(() => {
    const keyword = search.trim().toLowerCase();
    if (!keyword) return items;
    return items.filter((item) =>
      [item.title, item.category, item.competency, item.content]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(keyword))
    );
  }, [items, search]);

  return (
    <PesertaLayout activeTab="materi">
      <div className="max-w-6xl mx-auto px-4 sm:px-8 py-8 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div>
            <Badge variant="navy" format="soft" className="mb-2">
              MATERI & SILABUS
            </Badge>
            <h1 className="font-heading text-2xl sm:text-3xl font-extrabold text-ink tracking-tight">
              Materi Persiapan Asesmen
            </h1>
            <p className="text-sm text-slate-500 mt-1">
              {programTitle || 'Program asesmen Anda'}
            </p>
          </div>
          <div className="relative w-full sm:w-72">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Cari materi atau kompetensi..."
              className="w-full pl-9 pr-3 py-2.5 text-sm bg-white border border-slate-200 rounded-xl focus:outline-none focus:border-primary-navy"
            />
          </div>
        </div>

        {loading ? (
          <div className="bg-white rounded-2xl border border-slate-200 p-10 text-center text-sm text-slate-500">
            Memuat materi...
          </div>
        ) : error ? (
          <div className="bg-rose-50 border border-rose-200 rounded-2xl p-6 text-sm text-rose-700">
            {error}
          </div>
        ) : filtered.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-200 p-10 text-center space-y-2">
            <BookOpen className="w-8 h-8 text-slate-300 mx-auto" />
            <p className="text-sm font-semibold text-ink">Belum ada materi</p>
            <p className="text-xs text-slate-500">
              Materi akan tampil setelah administrator mempublikasikannya untuk program Anda.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filtered.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setActiveItem(item)}
                className="text-left bg-white rounded-2xl border border-slate-200 p-5 hover:border-accent-border hover:shadow-sm transition-all"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="w-10 h-10 rounded-xl bg-soft-blue border border-accent-border flex items-center justify-center text-primary-navy shrink-0">
                    <FileText className="w-5 h-5" />
                  </div>
                  <Badge variant="teal" format="soft">
                    {item.type || 'Materi'}
                  </Badge>
                </div>
                <h3 className="font-heading font-bold text-base text-ink mt-3 leading-snug">
                  {item.title}
                </h3>
                <p className="text-xs text-slate-500 mt-1">
                  {item.category}
                  {item.competency ? ` • ${item.competency}` : ''}
                </p>
                <p className="text-xs text-slate-600 mt-3 line-clamp-2 leading-relaxed">
                  {item.content}
                </p>
                <div className="flex items-center justify-between mt-4 pt-3 border-t border-slate-100 text-[11px] text-slate-500">
                  <span className="inline-flex items-center gap-1">
                    <Layers className="w-3 h-3" />
                    {item.code} • {item.version || 'v1.0'}
                  </span>
                  <span className="inline-flex items-center gap-1 font-semibold text-primary-navy">
                    Baca Materi <ChevronRight className="w-3.5 h-3.5" />
                  </span>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      <Modal
        isOpen={Boolean(activeItem)}
        onClose={() => setActiveItem(null)}
        title={activeItem?.title || 'Detail Materi'}
        size="lg"
      >
        {activeItem && (
          <div className="space-y-4 text-sm">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="navy" format="soft">{activeItem.category}</Badge>
              <Badge variant="teal" format="soft">{activeItem.type || 'Materi'}</Badge>
              <span className="text-xs text-slate-500 font-mono">{activeItem.code} • {activeItem.version || 'v1.0'}</span>
            </div>
            {activeItem.competency && (
              <p className="text-xs text-slate-500">
                Kompetensi: <strong className="text-slate-700">{activeItem.competency}</strong>
              </p>
            )}
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 text-slate-700 leading-relaxed whitespace-pre-line">
              {activeItem.content}
            </div>
            {activeItem.rubric && (
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">Rubrik Penilaian</h4>
                <p className="text-slate-600 leading-relaxed">{activeItem.rubric}</p>
              </div>
            )}
            {activeItem.behavioralIndicators && activeItem.behavioralIndicators.length > 0 && (
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">Indikator Perilaku</h4>
                <ul className="space-y-1.5">
                  {activeItem.behavioralIndicators.map((indicator, index) => (
                    <li key={index} className="flex items-start gap-2 text-slate-600">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                      <span>{indicator}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            <div className="flex justify-end pt-2">
              <Button variant="outline" size="sm" onClick={() => setActiveItem(null)} leftIcon={<X className="w-3.5 h-3.5" />}>
                Tutup
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </PesertaLayout>
  );
}