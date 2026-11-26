import React, { memo, useEffect, useRef, useState } from 'react';
import {
  ArrowDown,
  ArrowUp,
  Check,
  CheckCircle2,
  Copy,
  FileText,
  KeyRound,
  Paperclip,
  Plus,
  Save,
  SlidersHorizontal,
  Trash2,
  X
} from 'lucide-react';
import type { BankQuestion } from './AdminBankSoalEditor';

interface GoogleFormQuestionCardProps {
  question: BankQuestion;
  index: number;
  totalCount: number;
  isActive: boolean;
  autoFocusTitle?: boolean;
  competencySuggestions: string[];
  onActivate: () => void;
  onPatch: (id: string, patch: Partial<BankQuestion>) => void;
  onSave: () => void;
  onDuplicate: (question: BankQuestion) => void;
  onDelete: (id: string) => void;
  onMove: (id: string, direction: 'up' | 'down') => void;
  onUploadAttachment: (question: BankQuestion, file: File) => void;
  onRemoveAttachment: (id: string) => void;
}

const OPTION_KEYS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';

const rekeyOptions = (opts: BankQuestion['options']) =>
  opts.map((opt, idx) => ({
    ...opt,
    key: OPTION_KEYS[idx] || String(idx + 1)
  }));

const TYPE_META: Record<BankQuestion['type'], { label: string; short: string }> = {
  'Pilihan Ganda': { label: 'Pilihan Ganda', short: 'Pilihan Ganda' },
  'Multi-Select': { label: 'Kotak Centang (Multi)', short: 'Multi-Select' },
  'Isian Singkat': { label: 'Jawaban Singkat', short: 'Isian Singkat' },
  Esai: { label: 'Paragraf / Esai', short: 'Esai' },
  Matching: { label: 'Pencocokan (Matching)', short: 'Matching' }
};

export const GoogleFormQuestionCard = memo(function GoogleFormQuestionCard({
  question,
  index,
  totalCount,
  isActive,
  autoFocusTitle = false,
  competencySuggestions,
  onActivate,
  onPatch,
  onSave,
  onDuplicate,
  onDelete,
  onMove,
  onUploadAttachment,
  onRemoveAttachment
}: GoogleFormQuestionCardProps) {
  const [showExplanation, setShowExplanation] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const titleRef = useRef<HTMLTextAreaElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (isActive && autoFocusTitle && titleRef.current) {
      titleRef.current.focus();
      titleRef.current.select();
    }
  }, [isActive, autoFocusTitle]);

  useEffect(() => {
    if (isActive && titleRef.current) {
      titleRef.current.style.height = 'auto';
      titleRef.current.style.height = `${Math.max(44, titleRef.current.scrollHeight)}px`;
    }
  }, [isActive, question.text]);

  const handleTypeChange = (nextType: BankQuestion['type']) => {
    const patch: Partial<BankQuestion> = { type: nextType };
    if (nextType === 'Pilihan Ganda' || nextType === 'Multi-Select') {
      const currentOpts = Array.isArray(question.options) ? question.options : [];
      if (currentOpts.length < 2) {
        patch.options = [
          { key: 'A', text: 'Opsi 1', isCorrect: true },
          { key: 'B', text: 'Opsi 2', isCorrect: false },
          { key: 'C', text: 'Opsi 3', isCorrect: false },
          { key: 'D', text: 'Opsi 4', isCorrect: false }
        ];
      } else if (nextType === 'Pilihan Ganda') {
        const firstCorrectIdx = currentOpts.findIndex((o) => o.isCorrect);
        patch.options = rekeyOptions(
          currentOpts.map((o, i) => ({
            ...o,
            isCorrect: i === (firstCorrectIdx >= 0 ? firstCorrectIdx : 0)
          }))
        );
      }
    } else if (nextType === 'Isian Singkat') {
      const existingKey = question.options?.[0]?.text || '';
      patch.options = [{ key: 'A', text: existingKey, isCorrect: true }];
    } else if (nextType === 'Matching') {
      const existingPairs = Array.isArray(question.matchingPairs) ? question.matchingPairs : [];
      if (existingPairs.length === 0) {
        patch.matchingPairs = [
          { left: '', rightOptions: [''], correctRight: '' },
          { left: '', rightOptions: [''], correctRight: '' }
        ];
      }
    }
    onPatch(question.id, patch);
  };

  const handleAddOption = () => {
    const nextIdx = question.options.length;
    const key = OPTION_KEYS[nextIdx] || String(nextIdx + 1);
    const nextOpts = [
      ...question.options,
      { key, text: '', isCorrect: question.options.length === 0 }
    ];
    onPatch(question.id, { options: nextOpts });
  };

  const handleRemoveOption = (removeIdx: number) => {
    if (question.options.length <= 2) return;
    const filtered = question.options.filter((_, idx) => idx !== removeIdx);
    const hasCorrect = filtered.some((o) => o.isCorrect);
    const normalized = rekeyOptions(
      hasCorrect ? filtered : filtered.map((o, i) => ({ ...o, isCorrect: i === 0 }))
    );
    onPatch(question.id, { options: normalized });
  };

  const handleToggleCorrect = (optIdx: number) => {
    const nextOpts =
      question.type === 'Pilihan Ganda'
        ? question.options.map((o, i) => ({ ...o, isCorrect: i === optIdx }))
        : question.options.map((o, i) => (i === optIdx ? { ...o, isCorrect: !o.isCorrect } : o));
    onPatch(question.id, { options: nextOpts });
  };

  const handleOptionTextChange = (optIdx: number, text: string) => {
    const nextOpts = question.options.map((o, i) => (i === optIdx ? { ...o, text } : o));
    onPatch(question.id, { options: nextOpts });
  };

  const matchingPairs = Array.isArray(question.matchingPairs) ? question.matchingPairs : [];

  const updateMatchingPairs = (
    updater: (
      pairs: NonNullable<BankQuestion['matchingPairs']>
    ) => NonNullable<BankQuestion['matchingPairs']>
  ) => {
    const updated = updater(matchingPairs);
    const allRightOptions = updated.map((p) => p.correctRight || '').filter(Boolean);
    onPatch(question.id, {
      matchingPairs: updated.map((p) => ({
        ...p,
        rightOptions: allRightOptions.length > 0 ? allRightOptions : [p.correctRight || '']
      }))
    });
  };

  const correctCount =
    question.type === 'Pilihan Ganda' || question.type === 'Multi-Select'
      ? question.options.filter((o) => o.isCorrect).length
      : question.type === 'Isian Singkat'
        ? question.options[0]?.text?.trim()
          ? 1
          : 0
        : question.type === 'Matching'
          ? matchingPairs.filter((p) => p.left.trim() && (p.correctRight || '').trim()).length
          : 1;

  /* ─── COLLAPSED (PREVIEW) CARD — CLICK TO EDIT ─── */
  if (!isActive) {
    return (
      <div
        id={`gf-card-${question.id}`}
        role="button"
        tabIndex={0}
        onClick={onActivate}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            onActivate();
          }
        }}
        className="group rounded-xl border border-slate-200/90 bg-white px-5 py-4 shadow-2xs hover:border-[#1E3A8A]/40 hover:shadow-xs transition-all cursor-pointer space-y-3"
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-2.5 min-w-0 flex-1">
            <span className="mt-0.5 text-xs font-mono font-bold text-slate-400 group-hover:text-[#1E3A8A] shrink-0">
              {index + 1}.
            </span>
            <p className="text-sm font-medium text-slate-900 leading-snug break-words">
              {question.text?.trim() ? (
                question.text
              ) : (
                <span className="italic text-slate-400">Pertanyaan tanpa judul (klik untuk isi)</span>
              )}
            </p>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 text-[11px] font-medium">
              {TYPE_META[question.type]?.short || question.type}
            </span>
            {question.status !== 'Published' && (
              <span className="px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200 text-[10px] font-semibold">
                {question.status}
              </span>
            )}
          </div>
        </div>

        {/* Clean Option / Answer Preview */}
        {(question.type === 'Pilihan Ganda' || question.type === 'Multi-Select') && (
          <div className="pl-5 space-y-1.5">
            {question.options.slice(0, 5).map((opt) => (
              <div key={opt.key} className="flex items-center gap-2.5 text-xs text-slate-600">
                <span
                  className={`w-4 h-4 shrink-0 flex items-center justify-center border ${
                    question.type === 'Pilihan Ganda' ? 'rounded-full' : 'rounded'
                  } ${
                    opt.isCorrect
                      ? 'bg-emerald-500 border-emerald-500 text-white'
                      : 'border-slate-300 bg-white'
                  }`}
                >
                  {opt.isCorrect && <Check className="w-2.5 h-2.5 stroke-[3]" />}
                </span>
                <span className={`truncate ${opt.isCorrect ? 'font-semibold text-emerald-800' : ''}`}>
                  {opt.text || <span className="italic text-slate-400">Opsi kosong</span>}
                </span>
              </div>
            ))}
          </div>
        )}

        {question.type === 'Isian Singkat' && (
          <div className="pl-5">
            <div className="max-w-2xl border-b border-dashed border-slate-300 pb-1 text-xs text-slate-500">
              {question.options[0]?.text ? (
                <span>
                  Kunci: <strong className="text-emerald-700">{question.options[0].text}</strong>
                </span>
              ) : (
                <span className="italic text-slate-400">Teks jawaban singkat...</span>
              )}
            </div>
          </div>
        )}

        {question.type === 'Esai' && (
          <div className="pl-5">
            <div className="max-w-2xl border-b border-dashed border-slate-300 pb-1 text-xs italic text-slate-400">
              Teks jawaban panjang (Esai)...
            </div>
          </div>
        )}

        {question.type === 'Matching' && (
          <div className="pl-5 flex flex-wrap gap-1.5">
            {matchingPairs.length === 0 ? (
              <span className="text-xs italic text-slate-400">Belum ada pasangan pencocokan</span>
            ) : (
              matchingPairs.slice(0, 4).map((pair, pIdx) => (
                <span
                  key={pIdx}
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-50 border border-slate-200 text-[11px] text-slate-700"
                >
                  <span>{pair.left || '...'}</span>
                  <span className="text-slate-400">↔</span>
                  <span className="font-semibold text-emerald-700">{pair.correctRight || '...'}</span>
                </span>
              ))
            )}
          </div>
        )}

        {/* Quiet Metadata Footer */}
        <div className="pl-5 flex flex-wrap items-center gap-2 text-[11px] text-slate-400 pt-0.5">
          {question.competency && <span className="text-slate-500">{question.competency}</span>}
          {question.competency && <span>•</span>}
          <span>{question.difficulty}</span>
          {question.attachmentName && (
            <>
              <span>•</span>
              <span className="inline-flex items-center gap-1 text-[#1E3A8A] font-medium">
                <Paperclip className="w-3 h-3" />
                {question.attachmentName}
              </span>
            </>
          )}
        </div>
      </div>
    );
  }

  /* ─── ACTIVE (FOCUSED) GOOGLE FORMS EDITOR CARD ─── */
  return (
    <div
      id={`gf-card-${question.id}`}
      className="rounded-xl border border-slate-200 border-l-4 border-l-[#1E3A8A] bg-white shadow-md ring-1 ring-[#1E3A8A]/10 transition-all overflow-hidden"
    >
      <div className="p-5 sm:p-6 space-y-5">
        {/* Top Row: Question Text + Inline Attachment + Type Selector (Google Forms Signature Row) */}
        <div className="flex flex-col sm:flex-row sm:items-start gap-3">
          <div className="flex-1 flex items-start gap-2 min-w-0">
            <span className="mt-3 text-xs font-mono font-bold text-[#1E3A8A] shrink-0">
              {index + 1}.
            </span>
            <div className="flex-1 min-w-0">
              <textarea
                ref={titleRef}
                rows={1}
                value={question.text}
                onChange={(e) => onPatch(question.id, { text: e.target.value })}
                placeholder="Tulis pertanyaan di sini..."
                className="w-full resize-none bg-slate-50/80 hover:bg-slate-100/70 focus:bg-slate-50 border-0 border-b-2 border-slate-200 focus:border-[#1E3A8A] rounded-t-lg px-3.5 py-2.5 text-sm sm:text-[15px] font-medium text-slate-900 placeholder:text-slate-400 outline-none transition-colors leading-relaxed"
              />
            </div>

            {/* Inline Attachment Icon Button (like Google Forms image icon) */}
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              title="Lampirkan file pendukung soal (PDF, DOCX, atau Gambar)"
              className={`mt-1.5 p-2 rounded-lg border transition-colors cursor-pointer shrink-0 ${
                question.attachmentUrl
                  ? 'border-[#1E3A8A]/30 bg-blue-50 text-[#1E3A8A]'
                  : 'border-transparent text-slate-400 hover:text-slate-700 hover:bg-slate-100'
              }`}
            >
              <Paperclip className="w-4 h-4" />
            </button>
            <input
              ref={fileInputRef}
              type="file"
              className="hidden"
              accept=".pdf,.doc,.docx,.png,.jpg,.jpeg,.txt"
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (file) onUploadAttachment(question, file);
                event.target.value = '';
              }}
            />
          </div>

          {/* Question Type Dropdown */}
          <div className="sm:w-52 shrink-0">
            <select
              aria-label="Tipe Soal"
              value={question.type}
              onChange={(e) => handleTypeChange(e.target.value as BankQuestion['type'])}
              className="w-full h-11 px-3 rounded-lg border border-slate-200 bg-white text-xs sm:text-sm font-medium text-slate-800 hover:border-slate-300 focus:border-[#1E3A8A] outline-none cursor-pointer"
            >
              <option value="Pilihan Ganda">Pilihan Ganda</option>
              <option value="Multi-Select">Kotak Centang (Multi)</option>
              <option value="Isian Singkat">Jawaban Singkat</option>
              <option value="Esai">Paragraf / Esai</option>
              <option value="Matching">Pencocokan (Matching)</option>
            </select>
          </div>
        </div>

        {/* Attached File Chip (only shown if attached) */}
        {question.attachmentUrl && (
          <div className="ml-5 inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-blue-50/70 border border-blue-200 text-xs text-[#1E3A8A]">
            <Paperclip className="w-3.5 h-3.5 shrink-0" />
            <a
              href={question.attachmentUrl}
              target="_blank"
              rel="noreferrer"
              className="font-medium hover:underline truncate max-w-xs"
            >
              {question.attachmentName || 'Lampiran soal'}
            </a>
            <button
              type="button"
              onClick={() => onRemoveAttachment(question.id)}
              className="p-0.5 rounded hover:bg-blue-100 text-slate-500 hover:text-rose-600 cursor-pointer"
              title="Hapus lampiran"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* ─── ANSWER BUILDER AREA ─── */}
        <div className="pl-5 space-y-2.5">
          {(question.type === 'Pilihan Ganda' || question.type === 'Multi-Select') && (
            <>
              <div className="space-y-2">
                {question.options.map((opt, oIdx) => (
                  <div key={`${opt.key}-${oIdx}`} className="group/opt flex items-center gap-2.5">
                    <button
                      type="button"
                      onClick={() => handleToggleCorrect(oIdx)}
                      title={
                        opt.isCorrect
                          ? 'Kunci jawaban benar (klik untuk ubah)'
                          : 'Klik untuk jadikan kunci jawaban benar'
                      }
                      className={`w-5 h-5 shrink-0 flex items-center justify-center border-2 transition-colors cursor-pointer ${
                        question.type === 'Pilihan Ganda' ? 'rounded-full' : 'rounded-md'
                      } ${
                        opt.isCorrect
                          ? 'bg-emerald-500 border-emerald-500 text-white'
                          : 'border-slate-300 bg-white hover:border-emerald-400'
                      }`}
                    >
                      {opt.isCorrect && <Check className="w-3 h-3 stroke-[3]" />}
                    </button>

                    <span className="text-xs font-mono font-semibold text-slate-400 w-4 shrink-0">
                      {opt.key}.
                    </span>

                    <input
                      type="text"
                      value={opt.text}
                      onChange={(e) => handleOptionTextChange(oIdx, e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          if (oIdx === question.options.length - 1) {
                            handleAddOption();
                          }
                        }
                      }}
                      placeholder={`Opsi ${oIdx + 1}`}
                      className="flex-1 py-1.5 px-1 text-sm text-slate-800 bg-transparent border-0 border-b border-transparent hover:border-slate-200 focus:border-[#1E3A8A] outline-none transition-colors"
                    />

                    {opt.isCorrect && (
                      <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-bold shrink-0">
                        Kunci
                      </span>
                    )}

                    {question.options.length > 2 && (
                      <button
                        type="button"
                        onClick={() => handleRemoveOption(oIdx)}
                        title="Hapus opsi"
                        className="p-1.5 rounded-lg text-slate-300 hover:text-rose-600 hover:bg-rose-50 opacity-60 group-hover/opt:opacity-100 transition-all cursor-pointer shrink-0"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                ))}
              </div>

              {/* "+ Tambahkan opsi" (Google Forms Iconic Inline Add) */}
              {question.options.length < 8 && (
                <div className="flex items-center gap-2.5 pt-1">
                  <span
                    className={`w-5 h-5 shrink-0 border-2 border-dashed border-slate-300 ${
                      question.type === 'Pilihan Ganda' ? 'rounded-full' : 'rounded-md'
                    }`}
                  />
                  <button
                    type="button"
                    onClick={handleAddOption}
                    className="text-xs font-medium text-slate-500 hover:text-[#1E3A8A] py-1 border-b border-transparent hover:border-[#1E3A8A] transition-colors cursor-pointer"
                  >
                    + Tambah opsi
                  </button>
                  <span className="text-[11px] text-slate-400 ml-auto">
                    Klik lingkaran/kotak di kiri untuk set kunci benar
                  </span>
                </div>
              )}
            </>
          )}

          {question.type === 'Isian Singkat' && (
            <div className="space-y-2 max-w-2xl">
              <input
                type="text"
                value={question.options[0]?.text || ''}
                onChange={(e) =>
                  onPatch(question.id, {
                    options: [{ key: 'A', text: e.target.value, isCorrect: true }]
                  })
                }
                placeholder="Ketik kunci jawaban singkat yang benar..."
                className="w-full py-2 px-1 text-sm text-slate-800 bg-transparent border-0 border-b-2 border-dashed border-slate-300 focus:border-solid focus:border-emerald-600 outline-none transition-colors"
              />
              <p className="text-[11px] text-slate-400">
                Jawaban peserta akan dicocokkan otomatis dengan kunci ini (tidak sensitif huruf besar/kecil).
              </p>
            </div>
          )}

          {question.type === 'Esai' && (
            <div className="space-y-2 max-w-3xl">
              <div className="py-2.5 border-b border-dashed border-slate-300 text-sm text-slate-400 italic">
                Teks jawaban panjang peserta (dinilai secara manual / rubrik oleh asesor)
              </div>
            </div>
          )}

          {question.type === 'Matching' && (
            <div className="space-y-2">
              {matchingPairs.map((pair, pIdx) => (
                <div key={pIdx} className="flex flex-col sm:flex-row sm:items-center gap-2">
                  <input
                    type="text"
                    value={pair.left}
                    onChange={(e) =>
                      updateMatchingPairs((prev) =>
                        prev.map((item, i) => (i === pIdx ? { ...item, left: e.target.value } : item))
                      )
                    }
                    placeholder={`Pernyataan ${pIdx + 1}`}
                    className="flex-1 py-1.5 px-2 text-xs sm:text-sm rounded-lg border border-slate-200 focus:border-[#1E3A8A] outline-none"
                  />
                  <span className="text-xs text-slate-400 hidden sm:inline">↔</span>
                  <input
                    type="text"
                    value={pair.correctRight || ''}
                    onChange={(e) =>
                      updateMatchingPairs((prev) =>
                        prev.map((item, i) =>
                          i === pIdx ? { ...item, correctRight: e.target.value } : item
                        )
                      )
                    }
                    placeholder={`Pasangan benar ${pIdx + 1}`}
                    className="flex-1 py-1.5 px-2 text-xs sm:text-sm rounded-lg border border-emerald-200 bg-emerald-50/30 focus:border-emerald-600 outline-none"
                  />
                  {matchingPairs.length > 2 && (
                    <button
                      type="button"
                      onClick={() =>
                        updateMatchingPairs((prev) => prev.filter((_, i) => i !== pIdx))
                      }
                      className="p-1.5 text-slate-400 hover:text-rose-600 cursor-pointer self-end sm:self-auto"
                      title="Hapus pasangan"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ))}
              <button
                type="button"
                onClick={() =>
                  updateMatchingPairs((prev) => [
                    ...prev,
                    { left: '', rightOptions: [''], correctRight: '' }
                  ])
                }
                className="inline-flex items-center gap-1 text-xs font-medium text-slate-500 hover:text-[#1E3A8A] pt-1 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Tambah pasangan</span>
              </button>
            </div>
          )}
        </div>

        {/* ─── COLLAPSIBLE PANEL 1: PEMBAHASAN / RUBRIK ─── */}
        {showExplanation && (
          <div className="ml-5 p-3.5 rounded-xl bg-emerald-50/50 border border-emerald-200/80 space-y-2">
            <label className="text-xs font-semibold text-emerald-900 flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5" />
              <span>Pembahasan / Panduan Penilaian</span>
            </label>
            <textarea
              rows={2}
              value={question.explanation}
              onChange={(e) => onPatch(question.id, { explanation: e.target.value })}
              placeholder="Jelaskan secara singkat mengapa jawaban tersebut benar (opsional)..."
              className="w-full p-2.5 rounded-lg border border-emerald-200 bg-white focus:border-emerald-600 text-xs outline-none leading-relaxed"
            />
          </div>
        )}

        {/* ─── COLLAPSIBLE PANEL 2: PENGATURAN DETAIL (TOPIK, KESULITAN, STATUS) ─── */}
        {showSettings && (
          <div className="ml-5 p-4 rounded-xl bg-slate-50 border border-slate-200/90 space-y-3 text-xs">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block font-semibold text-slate-600 mb-1">Tingkat Kesulitan</label>
                <select
                  value={question.difficulty}
                  onChange={(e) =>
                    onPatch(question.id, {
                      difficulty: e.target.value as BankQuestion['difficulty']
                    })
                  }
                  className="w-full h-9 px-2.5 rounded-lg border border-slate-200 bg-white text-xs font-medium text-slate-800 outline-none focus:border-[#1E3A8A]"
                >
                  <option value="Mudah">Mudah</option>
                  <option value="Sedang">Sedang</option>
                  <option value="Sulit">Sulit</option>
                </select>
              </div>
              <div>
                <label className="block font-semibold text-slate-600 mb-1">Status Butir</label>
                <select
                  value={question.status}
                  onChange={(e) =>
                    onPatch(question.id, { status: e.target.value as BankQuestion['status'] })
                  }
                  className="w-full h-9 px-2.5 rounded-lg border border-slate-200 bg-white text-xs font-medium text-slate-800 outline-none focus:border-[#1E3A8A]"
                >
                  <option value="Published">Published</option>
                  <option value="Review">Review</option>
                  <option value="Draft">Draft</option>
                  <option value="Retired">Retired</option>
                </select>
              </div>
              <div>
                <label className="block font-semibold text-slate-600 mb-1">ID Soal</label>
                <div className="h-9 px-2.5 rounded-lg border border-slate-200 bg-slate-100 text-slate-600 font-mono font-semibold flex items-center">
                  {question.id}
                </div>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="block font-semibold text-slate-600">Kompetensi / Topik</label>
              <input
                type="text"
                value={question.competency || ''}
                onChange={(e) => onPatch(question.id, { competency: e.target.value })}
                placeholder="Contoh: System Architecture, Penalaran Logis..."
                className="w-full h-9 px-3 rounded-lg border border-slate-200 bg-white text-xs outline-none focus:border-[#1E3A8A]"
              />
              {competencySuggestions.length > 0 && (
                <div className="flex flex-wrap items-center gap-1 pt-0.5">
                  {competencySuggestions.slice(0, 6).map((comp) => {
                    const active =
                      (question.competency || '').trim().toLowerCase() === comp.toLowerCase();
                    return (
                      <button
                        key={comp}
                        type="button"
                        onClick={() => onPatch(question.id, { competency: comp })}
                        className={`px-2 py-0.5 rounded-full text-[11px] border transition-colors cursor-pointer ${
                          active
                            ? 'bg-[#1E3A8A] text-white border-[#1E3A8A] font-semibold'
                            : 'bg-white text-slate-600 border-slate-200 hover:border-[#1E3A8A]/40'
                        }`}
                      >
                        {comp}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* ─── GOOGLE FORMS SIGNATURE BOTTOM ACTION BAR ─── */}
      <div className="px-5 py-3 bg-slate-50/70 border-t border-slate-200/80 flex flex-wrap items-center justify-between gap-2">
        {/* Left: Answer Key / Explanation & Settings toggles */}
        <div className="flex flex-wrap items-center gap-1.5">
          <button
            type="button"
            onClick={() => setShowExplanation((prev) => !prev)}
            className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
              showExplanation
                ? 'bg-emerald-100 text-emerald-900'
                : 'text-[#1E3A8A] hover:bg-blue-50'
            }`}
          >
            <KeyRound className="w-3.5 h-3.5" />
            <span>Pembahasan</span>
            {correctCount > 0 && (
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            )}
          </button>

          <button
            type="button"
            onClick={() => setShowSettings((prev) => !prev)}
            className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
              showSettings
                ? 'bg-slate-200 text-slate-900 font-semibold'
                : 'text-slate-600 hover:bg-slate-200/70'
            }`}
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
            <span>
              {question.difficulty} • {question.status}
            </span>
          </button>
        </div>

        {/* Right: Reorder, Duplicate, Delete, Save */}
        <div className="flex items-center gap-1">
          <button
            type="button"
            disabled={index === 0}
            onClick={() => onMove(question.id, 'up')}
            title="Pindah ke atas"
            className="p-2 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-200/70 disabled:opacity-30 cursor-pointer disabled:cursor-not-allowed"
          >
            <ArrowUp className="w-4 h-4" />
          </button>
          <button
            type="button"
            disabled={index === totalCount - 1}
            onClick={() => onMove(question.id, 'down')}
            title="Pindah ke bawah"
            className="p-2 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-200/70 disabled:opacity-30 cursor-pointer disabled:cursor-not-allowed"
          >
            <ArrowDown className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => onDuplicate(question)}
            title="Duplikasi soal"
            className="p-2 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-200/70 cursor-pointer"
          >
            <Copy className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => onDelete(question.id)}
            title="Hapus soal"
            className="p-2 rounded-lg text-slate-500 hover:text-rose-600 hover:bg-rose-50 cursor-pointer"
          >
            <Trash2 className="w-4 h-4" />
          </button>

          <div className="h-5 w-px bg-slate-200 mx-1" />

          <button
            type="button"
            onClick={onSave}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-[#1E3A8A] hover:bg-[#172554] text-white text-xs font-semibold shadow-2xs transition-colors cursor-pointer"
          >
            <Save className="w-3.5 h-3.5" />
            <span>Simpan</span>
          </button>
        </div>
      </div>
    </div>
  );
});
