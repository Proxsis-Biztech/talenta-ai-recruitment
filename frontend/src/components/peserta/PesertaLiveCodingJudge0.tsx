import React, { useState, useEffect } from 'react';
import {
  Code2, Play, Send, RefreshCw, CheckCircle2, XCircle, Clock,
  Cpu, Terminal, BookOpen, AlertTriangle, ChevronRight, Layers,
  Check, Copy, Sparkles, Laptop
} from 'lucide-react';
import { Button, Badge } from '../ui';
import {
  CODING_PROBLEMS,
  SUPPORTED_LANGUAGES,
  executeJudge0Code,
  type CodingProblem,
  type Judge0SubmissionResult
} from '../../services/judge0Service';

interface PesertaLiveCodingJudge0Props {
  programTitle?: string;
  onCompleteCoding?: (score: number) => void;
}

export default function PesertaLiveCodingJudge0({
  programTitle = 'Live Coding Test',
  onCompleteCoding
}: PesertaLiveCodingJudge0Props) {
  const [selectedProblem, setSelectedProblem] = useState<CodingProblem>(CODING_PROBLEMS[0]);
  const [selectedLanguage, setSelectedLanguage] = useState(SUPPORTED_LANGUAGES[0]);
  const [code, setCode] = useState(selectedProblem.starterCode[selectedLanguage.key] || '');
  const [isRunning, setIsRunning] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [result, setResult] = useState<Judge0SubmissionResult | null>(null);
  const [activeConsoleTab, setActiveConsoleTab] = useState<'tests' | 'output'>('tests');
  const [selectedTestCaseIdx, setSelectedTestCaseIdx] = useState(0);
  const [copied, setCopied] = useState(false);

  // Sync starter code when language or problem changes
  useEffect(() => {
    setCode(selectedProblem.starterCode[selectedLanguage.key] || '');
    setResult(null);
    setSelectedTestCaseIdx(0);
  }, [selectedProblem, selectedLanguage]);

  const handleRun = async () => {
    setIsRunning(true);
    try {
      const res = await executeJudge0Code(selectedProblem, selectedLanguage.key, code);
      setResult(res);
      setActiveConsoleTab('tests');
    } finally {
      setIsRunning(false);
    }
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      const res = await executeJudge0Code(selectedProblem, selectedLanguage.key, code);
      setResult(res);
      setActiveConsoleTab('tests');
      if (res.status.id === 3 && onCompleteCoding) {
        onCompleteCoding(100);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResetCode = () => {
    if (window.confirm('Reset kode kembali ke template awal?')) {
      setCode(selectedProblem.starterCode[selectedLanguage.key] || '');
      setResult(null);
    }
  };

  const handleCopyCode = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-5 antialiased">
      {/* ─── Top Control Bar: Problem Picker & Language Selector ─── */}
      <div className="bg-white rounded-2xl border border-slate-200/90 p-4 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Problem selector pills */}
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider mr-1">
            Tantangan:
          </span>
          {CODING_PROBLEMS.map((prob) => {
            const isSelected = prob.id === selectedProblem.id;
            return (
              <button
                key={prob.id}
                onClick={() => setSelectedProblem(prob)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
                  isSelected
                    ? 'bg-primary-navy text-white shadow-xs'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                <span>{prob.id}:</span>
                <span className="truncate max-w-[140px] sm:max-w-none">{prob.title}</span>
              </button>
            );
          })}
        </div>

        {/* Language selector & reset */}
        <div className="flex items-center gap-2.5 shrink-0 self-end md:self-auto">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-slate-500">Bahasa:</span>
            <select
              value={selectedLanguage.key}
              onChange={(e) => {
                const lang = SUPPORTED_LANGUAGES.find((l) => l.key === e.target.value);
                if (lang) setSelectedLanguage(lang);
              }}
              className="h-9.5 px-3 py-1 text-xs font-semibold bg-white border border-slate-300 rounded-xl focus:outline-none focus:border-primary-navy cursor-pointer"
            >
              {SUPPORTED_LANGUAGES.map((l) => (
                <option key={l.key} value={l.key}>
                  {l.name}
                </option>
              ))}
            </select>
          </div>

          <button
            onClick={handleResetCode}
            title="Reset ke template bawaan"
            className="p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-xl border border-slate-200 transition-colors cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* ─── Main Grid: Problem Brief (Left) & Code Editor + Judge0 Console (Right) ─── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* Problem Brief Panel */}
        <div className="lg:col-span-5 bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden flex flex-col h-[640px]">
          {/* Header */}
          <div className="px-5 py-4 border-b border-slate-100 bg-slate-50/70">
            <div className="flex items-center justify-between gap-2 mb-1.5">
              <span className="font-mono text-xs font-bold text-primary-navy bg-blue-50 px-2 py-0.5 rounded-md border border-blue-200/60">
                {selectedProblem.id}
              </span>
              <Badge
                variant={
                  selectedProblem.difficulty === 'Mudah'
                    ? 'success'
                    : selectedProblem.difficulty === 'Menengah'
                    ? 'navy'
                    : 'warning'
                }
                format="soft"
              >
                {selectedProblem.difficulty}
              </Badge>
            </div>
            <h3 className="font-heading font-bold text-base sm:text-lg text-slate-900 leading-snug">
              {selectedProblem.title}
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">{selectedProblem.category}</p>
          </div>

          {/* Body Content Scrollable */}
          <div className="p-5 overflow-y-auto space-y-4 text-xs sm:text-sm text-slate-700 leading-relaxed flex-1">
            <div>
              <h4 className="font-bold text-slate-900 mb-1.5 font-sans">Deskripsi Masalah:</h4>
              <p className="whitespace-pre-line text-slate-600">{selectedProblem.description}</p>
            </div>

            <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200/70 space-y-2">
              <div className="flex items-center gap-4 text-xs font-mono text-slate-600">
                <span className="flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5 text-slate-400" />
                  Batas Waktu: <strong>{selectedProblem.timeLimit}</strong>
                </span>
                <span className="flex items-center gap-1">
                  <Cpu className="w-3.5 h-3.5 text-slate-400" />
                  Batas Memori: <strong>{selectedProblem.memoryLimit}</strong>
                </span>
              </div>
            </div>

            <div>
              <h4 className="font-bold text-slate-900 mb-1">Format Masukan (Input):</h4>
              <p className="text-slate-600 whitespace-pre-line text-xs bg-slate-50 p-2.5 rounded-lg border border-slate-200/60 font-mono">
                {selectedProblem.inputDescription}
              </p>
            </div>

            <div>
              <h4 className="font-bold text-slate-900 mb-1">Format Keluaran (Output):</h4>
              <p className="text-slate-600 whitespace-pre-line text-xs bg-slate-50 p-2.5 rounded-lg border border-slate-200/60 font-mono">
                {selectedProblem.outputDescription}
              </p>
            </div>

            {/* Test Case Samples */}
            <div className="space-y-2.5">
              <h4 className="font-bold text-slate-900">Contoh Kasus Uji (Test Cases):</h4>
              {selectedProblem.testCases.map((tc, idx) => (
                <div
                  key={tc.id}
                  className="p-3 bg-slate-50/90 rounded-xl border border-slate-200/80 space-y-1.5 text-xs font-mono"
                >
                  <div className="flex items-center justify-between text-slate-500 font-bold font-sans text-[11px]">
                    <span>Kasus Uji #{idx + 1} {tc.isHidden ? '(Hidden Test)' : ''}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 font-sans block text-[10px] uppercase font-bold">Input:</span>
                    <code className="text-slate-800 bg-white px-2 py-0.5 rounded border border-slate-200 block truncate">
                      {tc.input}
                    </code>
                  </div>
                  <div>
                    <span className="text-slate-400 font-sans block text-[10px] uppercase font-bold">Output Diharapkan:</span>
                    <code className="text-emerald-700 bg-white px-2 py-0.5 rounded border border-slate-200 block truncate font-bold">
                      {tc.expectedOutput}
                    </code>
                  </div>
                  {tc.explanation && (
                    <p className="text-[11px] text-slate-500 font-sans italic mt-1">
                      {tc.explanation}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Code Editor & Judge0 Output Panel */}
        <div className="lg:col-span-7 space-y-4 flex flex-col h-[640px]">
          {/* Editor Container */}
          <div className="bg-slate-900 rounded-2xl border border-slate-800 shadow-md flex-1 flex flex-col overflow-hidden">
            {/* Editor Header Bar */}
            <div className="px-4 py-2.5 bg-slate-950 border-b border-slate-800 flex items-center justify-between text-xs text-slate-400">
              <div className="flex items-center gap-2">
                <div className="flex gap-1.5">
                  <div className="w-2.5 h-2.5 rounded-full bg-rose-500/80" />
                  <div className="w-2.5 h-2.5 rounded-full bg-amber-500/80" />
                  <div className="w-2.5 h-2.5 rounded-full bg-emerald-500/80" />
                </div>
                <span className="font-mono text-slate-300 ml-2 font-semibold">
                  solution.{selectedLanguage.extension}
                </span>
                <span className="text-[11px] text-slate-500 font-sans">• Judge0 Sandbox v1.13</span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={handleCopyCode}
                  className="inline-flex items-center gap-1 text-[11px] text-slate-400 hover:text-slate-200 transition-colors cursor-pointer"
                >
                  {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                  <span>{copied ? 'Tersalin' : 'Salin'}</span>
                </button>
              </div>
            </div>

            {/* Textarea Editor */}
            <div className="relative flex-1 p-3 font-mono text-xs sm:text-[13px] bg-slate-900 overflow-hidden">
              <textarea
                value={code}
                onChange={(e) => setCode(e.target.value)}
                spellCheck={false}
                className="w-full h-full bg-transparent text-emerald-400 focus:outline-none resize-none font-mono leading-relaxed selection:bg-blue-600/40 p-2 overflow-y-auto"
                style={{ tabSize: 4 }}
              />
            </div>

            {/* Bottom Actions Bar */}
            <div className="px-4 py-3 bg-slate-950 border-t border-slate-800/80 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 text-xs text-slate-400">
                <Terminal className="w-3.5 h-3.5 text-blue-400" />
                <span>Judge0 CE Runtime Engine</span>
              </div>

              <div className="flex items-center gap-2.5">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={handleRun}
                  disabled={isRunning || isSubmitting}
                  leftIcon={isRunning ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5" />}
                  className="text-xs bg-slate-800 text-slate-200 hover:bg-slate-700 border-slate-700"
                >
                  {isRunning ? 'Menjalankan...' : 'Jalankan Kode'}
                </Button>

                <Button
                  variant="primary"
                  size="sm"
                  onClick={handleSubmit}
                  disabled={isRunning || isSubmitting}
                  leftIcon={isSubmitting ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                  className="text-xs font-bold bg-blue-600 hover:bg-blue-500 shadow-sm"
                >
                  {isSubmitting ? 'Mengevaluasi...' : 'Submit Solusi'}
                </Button>
              </div>
            </div>
          </div>

          {/* Console / Test Result Output Box */}
          <div className="bg-white rounded-2xl border border-slate-200/90 p-4 shadow-xs h-[230px] flex flex-col overflow-hidden">
            {/* Header Tabs */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-2 mb-3">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setActiveConsoleTab('tests')}
                  className={`text-xs font-bold pb-1 transition-colors cursor-pointer border-b-2 ${
                    activeConsoleTab === 'tests'
                      ? 'border-primary-navy text-primary-navy'
                      : 'border-transparent text-slate-500 hover:text-slate-800'
                  }`}
                >
                  Hasil Test Cases ({result ? `${result.passedTests}/${result.totalTests}` : 'Siap'})
                </button>
                <button
                  onClick={() => setActiveConsoleTab('output')}
                  className={`text-xs font-bold pb-1 transition-colors cursor-pointer border-b-2 ${
                    activeConsoleTab === 'output'
                      ? 'border-primary-navy text-primary-navy'
                      : 'border-transparent text-slate-500 hover:text-slate-800'
                  }`}
                >
                  Log Terminal / Stdout
                </button>
              </div>

              {result && (
                <div className="flex items-center gap-3 text-xs font-mono">
                  <span className="flex items-center gap-1 text-slate-500">
                    <Clock className="w-3 h-3" /> {result.time}s
                  </span>
                  <span className="flex items-center gap-1 text-slate-500">
                    <Cpu className="w-3 h-3" /> {(result.memory / 1024).toFixed(1)}MB
                  </span>
                  <Badge
                    variant={result.status.id === 3 ? 'success' : 'danger'}
                    format="soft"
                    hasDot
                  >
                    {result.status.description}
                  </Badge>
                </div>
              )}
            </div>

            {/* Tab 1: Test Cases Viewer */}
            {activeConsoleTab === 'tests' && (
              <div className="flex-1 overflow-y-auto space-y-2 text-xs">
                {!result ? (
                  <div className="h-full flex flex-col items-center justify-center text-slate-400 gap-1.5 py-6">
                    <Terminal className="w-6 h-6 text-slate-300" />
                    <p className="font-medium text-xs">Klik "Jalankan Kode" atau "Submit Solusi" untuk mengevaluasi kode Anda.</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      {result.testDetails.map((td, idx) => (
                        <button
                          key={td.testId}
                          onClick={() => setSelectedTestCaseIdx(idx)}
                          className={`px-3 py-1.5 rounded-lg font-mono text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 border ${
                            selectedTestCaseIdx === idx
                              ? 'bg-slate-900 text-white border-slate-900'
                              : td.passed
                              ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                              : 'bg-rose-50 text-rose-800 border-rose-200'
                          }`}
                        >
                          {td.passed ? (
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                          ) : (
                            <XCircle className="w-3.5 h-3.5 text-rose-500" />
                          )}
                          <span>Kasus #{idx + 1}</span>
                        </button>
                      ))}
                    </div>

                    {result.testDetails[selectedTestCaseIdx] && (
                      <div className="bg-slate-50 p-3 rounded-xl border border-slate-200/80 space-y-1.5 font-mono text-[11px]">
                        <div>
                          <span className="text-slate-400 font-sans block text-[10px] uppercase font-bold">Input:</span>
                          <span className="text-slate-800 block truncate">
                            {result.testDetails[selectedTestCaseIdx].input}
                          </span>
                        </div>
                        <div className="grid grid-cols-2 gap-2 pt-1 border-t border-slate-200/60">
                          <div>
                            <span className="text-slate-400 font-sans block text-[10px] uppercase font-bold">Expected:</span>
                            <span className="text-emerald-700 font-bold block truncate">
                              {result.testDetails[selectedTestCaseIdx].expected}
                            </span>
                          </div>
                          <div>
                            <span className="text-slate-400 font-sans block text-[10px] uppercase font-bold">Output Aktual:</span>
                            <span
                              className={`font-bold block truncate ${
                                result.testDetails[selectedTestCaseIdx].passed ? 'text-emerald-700' : 'text-rose-600'
                              }`}
                            >
                              {result.testDetails[selectedTestCaseIdx].actual}
                            </span>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Tab 2: Terminal Stdout Viewer */}
            {activeConsoleTab === 'output' && (
              <div className="flex-1 bg-slate-950 p-3 rounded-xl border border-slate-800 text-xs font-mono overflow-y-auto text-slate-300">
                {!result ? (
                  <span className="text-slate-500 italic">Belum ada output eksekusi...</span>
                ) : (
                  <pre className="whitespace-pre-wrap leading-relaxed text-emerald-400">
                    {result.stdout || result.stderr || result.message}
                  </pre>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
