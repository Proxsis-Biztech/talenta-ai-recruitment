import React, { useState, useEffect, useCallback, useRef } from 'react';
import axios from 'axios';
import { 
  FileText, Search, Filter, Download, RefreshCw, Copy, Check,
  ShieldCheck, AlertTriangle, CheckCircle, Clock, UserCheck
} from 'lucide-react';
import { Card, CardContent } from './ui/Card';
import { Button } from './ui/Button';
import { Input } from './ui/Input';
import { Drawer } from './ui/Drawer';
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from './ui/Table';
import { downloadCsvFile } from '../utils/csvExport';
import { AdminEmptyState } from './admin/AdminStatCard';

interface AuditLog {
  id: string;
  timestamp: string;
  actor: string;
  action: string;
  category: 'AUTH' | 'AI_SCREENING' | 'DECISION' | 'EXPORT' | 'SECURITY' | 'DATA_MUTATION';
  ip: string;
  target?: string;
  details: string;
  status: 'SUCCESS' | 'WARNING' | 'FAILED';
}

export default function AuditLogsView() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);
  const [copiedIpId, setCopiedIpId] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const hasLoadedRef = useRef(false);

  const CATEGORY_LABELS: Record<string, string> = {
    ALL: 'Semua',
    AUTH: 'Autentikasi',
    AI_SCREENING: 'Skrining AI',
    DECISION: 'Keputusan',
    EXPORT: 'Ekspor',
    SECURITY: 'Keamanan',
    DATA_MUTATION: 'Mutasi Data',
  };

  const handleCopyIp = (e: React.MouseEvent, id: string, ip: string) => {
    e.stopPropagation();
    void navigator.clipboard.writeText(ip);
    setCopiedIpId(id);
    window.setTimeout(() => setCopiedIpId((prev) => (prev === id ? null : prev)), 1500);
  };

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setDebouncedSearch(searchQuery);
    }, 220);
    return () => window.clearTimeout(timer);
  }, [searchQuery]);

  const fetchLogs = useCallback(async () => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    if (!hasLoadedRef.current) setLoading(true);
    try {
      const token = localStorage.getItem('adminToken');
      const res = await axios.get('/api/admin/audit-logs', {
        headers: { Authorization: `Bearer ${token}` },
        params: {
          category: categoryFilter,
          search: debouncedSearch
        },
        signal: controller.signal
      });
      setLogs(res.data.data);
      hasLoadedRef.current = true;
    } catch (err) {
      if (!axios.isCancel(err)) {
        console.error('Failed fetching audit logs:', err);
      }
    } finally {
      if (!controller.signal.aborted) {
        setLoading(false);
      }
    }
  }, [categoryFilter, debouncedSearch]);

  useEffect(() => {
    fetchLogs();
    return () => abortRef.current?.abort();
  }, [fetchLogs]);

  const handleExportCSV = () => {
    const headers = ['ID', 'Waktu (ISO)', 'Aktor', 'Aksi', 'Kategori', 'IP', 'Target', 'Status', 'Keterangan'];
    const rows = logs.map(l => [
      `"${l.id}"`,
      `"${l.timestamp}"`,
      `"${l.actor}"`,
      `"${l.action}"`,
      `"${l.category}"`,
      `"${l.ip}"`,
      `"${l.target || '-'}"`,
      `"${l.status}"`,
      `"${l.details.replace(/"/g, '""')}"`
    ]);

    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\r\n');
    downloadCsvFile(csvContent, `audit_logs_${Date.now()}.csv`);
  };

  const getCategoryVariant = (cat: string): 'info' | 'navy' | 'success' | 'neutral' | 'danger' => {
    switch (cat) {
      case 'AUTH':
        return 'info';
      case 'AI_SCREENING':
        return 'navy';
      case 'DECISION':
        return 'success';
      case 'EXPORT':
        return 'neutral';
      case 'SECURITY':
        return 'danger';
      default:
        return 'neutral';
    }
  };

  const getStatusVariant = (status: string): 'success' | 'warning' | 'danger' | 'neutral' => {
    switch (status) {
      case 'SUCCESS':
        return 'success';
      case 'WARNING':
        return 'warning';
      case 'FAILED':
        return 'danger';
      default:
        return 'neutral';
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-heading font-bold text-[#0F172A] tracking-tight">
          Log Audit &amp; Keamanan
        </h1>
        <p className="text-sm text-[#64748B] mt-1 font-sans">
          Rekam jejak mutasi data, histori login, dan kepatuhan sistem audit. Klik baris untuk melihat rincian lengkap.
        </p>
      </div>

      {/* Top Filter and Actions Bar */}
      <Card elevation="flat" className="p-4 border-[#E2E8F0] rounded-xl flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
        <div className="flex flex-wrap flex-1 items-center gap-3 min-w-0">
          <div className="relative w-full sm:w-[260px] shrink-0">
            <Search className="w-4 h-4 text-[#94A3B8] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              placeholder="Cari aksi, aktor, atau rincian log..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full h-10 pl-9 pr-3 text-sm bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg focus:bg-white focus:outline-none focus:border-[#2563EB] focus:ring-2 focus:ring-[#2563EB]/15 transition-colors font-sans"
            />
          </div>

          <div className="inline-flex items-center gap-1 bg-[#F1F5F9] p-1 rounded-lg text-xs font-sans overflow-x-auto">
            {['ALL', 'AUTH', 'AI_SCREENING', 'DECISION', 'EXPORT', 'SECURITY'].map(cat => (
              <button
                key={cat}
                type="button"
                onClick={() => setCategoryFilter(cat)}
                className={`px-3 h-8 rounded-md whitespace-nowrap transition-colors cursor-pointer ${
                  categoryFilter === cat
                    ? 'bg-[#1E3A8A] text-white font-semibold'
                    : 'text-[#475569] hover:text-[#0F172A] font-medium'
                }`}
              >
                {CATEGORY_LABELS[cat] || cat}
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <Button
            variant="outline"
            size="icon"
            onClick={fetchLogs}
            title="Segarkan Log"
            className="h-10 w-10 border-[#E2E8F0] text-[#475569]"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>
          <Button
            variant="outline"
            onClick={handleExportCSV}
            leftIcon={<Download className="w-4 h-4" />}
            className="h-10 px-4 rounded-lg border-[#E2E8F0] text-[#475569]"
          >
            Unduh CSV
          </Button>
        </div>
      </Card>

      {/* Audit Log Table */}
      <div className="bg-white rounded-xl border border-[#E2E8F0] shadow-[0_1px_3px_rgba(15,23,42,0.08)] overflow-x-auto">
      <Table className="w-full min-w-[960px]">
        <TableHeader className="sticky top-0 z-10 bg-white">
          <TableRow className="border-b border-[#E2E8F0]">
            <TableHead className="w-[170px] text-xs font-semibold uppercase text-[#64748B] whitespace-nowrap">Waktu Tercatat</TableHead>
            <TableHead className="w-[130px] text-xs font-semibold uppercase text-[#64748B] whitespace-nowrap">Kategori</TableHead>
            <TableHead className="min-w-[260px] text-xs font-semibold uppercase text-[#64748B] whitespace-nowrap">Aksi &amp; Aktor</TableHead>
            <TableHead className="w-[200px] text-xs font-semibold uppercase text-[#64748B] whitespace-nowrap">Target</TableHead>
            <TableHead className="min-w-[220px] text-xs font-semibold uppercase text-[#64748B] whitespace-nowrap">Keterangan Aktivitas</TableHead>
            <TableHead className="w-[110px] text-center text-xs font-semibold uppercase text-[#64748B] whitespace-nowrap">Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {loading ? (
            Array.from({ length: 5 }).map((_, i) => (
              <TableRow key={`sk-${i}`} className="h-14">
                <TableCell colSpan={6}><div className="h-5 w-full rounded bg-[#E2E8F0] animate-pulse" /></TableCell>
              </TableRow>
            ))
          ) : logs.length === 0 ? (
            <TableRow>
              <TableCell colSpan={6}>
                <AdminEmptyState
                  icon={FileText}
                  title="Belum ada aktivitas"
                  description="Tidak ada log aktivitas yang tercatat untuk filter ini."
                />
              </TableCell>
            </TableRow>
          ) : (
            logs.map(log => (
              <TableRow
                key={log.id}
                onClick={() => setSelectedLog(log)}
                className="h-16 hover:bg-[#F8FAFC] transition-colors cursor-pointer"
              >
                <TableCell className="w-[170px] font-mono text-[13px] text-[#475569] whitespace-nowrap tabular-nums">
                  {log.timestamp ? log.timestamp.replace('T', ' ').slice(0, 19) : '-'}
                </TableCell>
                <TableCell className="w-[130px] whitespace-nowrap">
                  <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold bg-[#F1F5F9] text-[#475569]">
                    {CATEGORY_LABELS[log.category] || log.category}
                  </span>
                </TableCell>
                <TableCell className="min-w-[260px]">
                  <div className="font-semibold text-sm text-[#0F172A] truncate" title={log.action}>{log.action}</div>
                  <div className="text-xs text-[#64748B] font-mono flex items-center gap-1.5 mt-0.5 min-w-0">
                    <span className="text-[#1E3A8A] shrink-0">@{log.actor}</span>
                    <span>•</span>
                    <span className="truncate max-w-[140px]" title={log.ip}>{log.ip}</span>
                    {log.ip && (
                      <button
                        type="button"
                        onClick={(e) => handleCopyIp(e, log.id, log.ip)}
                        className="p-0.5 text-[#64748B] hover:text-[#1E3A8A] rounded cursor-pointer shrink-0"
                        title={`Salin IP: ${log.ip}`}
                      >
                        {copiedIpId === log.id ? <Check className="w-3 h-3 text-[#16A34A]" /> : <Copy className="w-3 h-3" />}
                      </button>
                    )}
                  </div>
                </TableCell>
                <TableCell className="w-[200px] max-w-[200px] font-sans text-sm text-[#0F172A] font-medium">
                  <span className="block truncate" title={log.target || '-'}>{log.target || '-'}</span>
                </TableCell>
                <TableCell className="font-sans text-sm text-[#475569] max-w-[280px]">
                  <span className="block truncate" title={log.details}>{log.details}</span>
                </TableCell>
                <TableCell className="w-[110px] text-center whitespace-nowrap">
                  <span
                    className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                      log.status === 'SUCCESS'
                        ? 'bg-[#DCFCE7] text-[#166534]'
                        : log.status === 'WARNING'
                          ? 'bg-[#FEF3C7] text-[#92400E]'
                          : 'bg-[#FEE2E2] text-[#991B1B]'
                    }`}
                  >
                    {log.status === 'SUCCESS' ? 'Sukses' : log.status === 'WARNING' ? 'Peringatan' : 'Gagal'}
                  </span>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
      </div>

      {/* Audit Detail Drawer */}
      <Drawer
        isOpen={Boolean(selectedLog)}
        onClose={() => setSelectedLog(null)}
        title="Rincian Log Audit"
        docketRef={selectedLog ? `ID: ${selectedLog.id}` : undefined}
        width="md"
      >
        {selectedLog && (
          <div className="space-y-4 text-sm">
            <div className="grid grid-cols-2 gap-3 bg-[#F8FAFC] p-4 rounded-xl border border-[#E2E8F0]">
              <div>
                <p className="text-xs text-[#64748B]">Waktu</p>
                <p className="font-mono font-semibold text-[#0F172A] mt-0.5">{selectedLog.timestamp?.replace('T', ' ').slice(0, 19) || '-'}</p>
              </div>
              <div>
                <p className="text-xs text-[#64748B]">Kategori</p>
                <p className="font-semibold text-[#0F172A] mt-0.5">{CATEGORY_LABELS[selectedLog.category] || selectedLog.category}</p>
              </div>
              <div>
                <p className="text-xs text-[#64748B]">Aktor</p>
                <p className="font-mono text-[#1E3A8A] mt-0.5">@{selectedLog.actor}</p>
              </div>
              <div>
                <p className="text-xs text-[#64748B]">Alamat IP</p>
                <p className="font-mono text-xs text-[#0F172A] break-all mt-0.5">{selectedLog.ip}</p>
              </div>
            </div>
            <div>
              <p className="text-xs font-semibold text-[#64748B] uppercase">Aksi</p>
              <p className="font-semibold text-[#0F172A] mt-1">{selectedLog.action}</p>
            </div>
            <div>
              <p className="text-xs font-semibold text-[#64748B] uppercase">Target</p>
              <p className="text-[#0F172A] mt-1 break-all">{selectedLog.target || '-'}</p>
            </div>
            <div>
              <p className="text-xs font-semibold text-[#64748B] uppercase">Keterangan Lengkap</p>
              <p className="text-[#475569] mt-1 leading-relaxed whitespace-pre-wrap bg-[#F8FAFC] p-3.5 rounded-lg border border-[#E2E8F0]">{selectedLog.details}</p>
            </div>
          </div>
        )}
      </Drawer>
    </div>
  );
}
