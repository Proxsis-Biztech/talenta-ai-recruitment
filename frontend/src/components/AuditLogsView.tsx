import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { 
  FileText, Search, Filter, Download, RefreshCw, 
  ShieldCheck, AlertTriangle, CheckCircle, Clock, UserCheck
} from 'lucide-react';
import { Card, CardContent } from './ui/Card';
import { Button } from './ui/Button';
import { Badge } from './ui/Badge';
import { Input } from './ui/Input';
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from './ui/Table';

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

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('adminToken');
      const res = await axios.get('/api/admin/audit-logs', {
        headers: { Authorization: `Bearer ${token}` },
        params: {
          category: categoryFilter,
          search: searchQuery
        }
      });
      setLogs(res.data.data);
    } catch (err) {
      console.error('Failed fetching audit logs:', err);
    } finally {
      setLoading(false);
    }
  }, [categoryFilter, searchQuery]);

  useEffect(() => {
    fetchLogs();
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

    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `audit_logs_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    link.remove();
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
        <h2 className="text-lg font-heading font-bold text-ink tracking-tight">
          Log Audit & Keamanan
        </h2>
        <p className="text-xs text-muted-slate mt-1 font-sans">
          Rekam jejak mutasi data, histori login, dan kepatuhan sistem audit.
        </p>
      </div>

      {/* Top Filter and Actions Bar */}
      <Card elevation="flat" className="p-4 border-slate-200 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
        <div className="flex flex-1 items-center gap-3">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input 
              type="text"
              placeholder="Cari aksi, aktor, atau rincian log..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-none focus:ring-1 focus:ring-primary-navy transition-colors font-sans"
            />
          </div>

          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg text-xs font-sans overflow-x-auto">
            {['ALL', 'AUTH', 'AI_SCREENING', 'DECISION', 'EXPORT', 'SECURITY'].map(cat => (
              <button
                key={cat}
                onClick={() => setCategoryFilter(cat)}
                className={`px-2.5 py-1 rounded-md whitespace-nowrap transition-colors cursor-pointer ${
                  categoryFilter === cat 
                    ? 'bg-white text-primary-navy font-bold shadow-xs' 
                    : 'text-slate-600 hover:text-slate-900 font-medium'
                }`}
              >
                {cat === 'ALL' ? 'Semua' : cat}
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="secondary"
            size="icon"
            onClick={fetchLogs}
            title="Refresh Log"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>
          <Button
            variant="secondary"
            size="sm"
            onClick={handleExportCSV}
            leftIcon={<Download className="w-3.5 h-3.5 text-slate-500" />}
          >
            Unduh CSV Log Audit
          </Button>
        </div>
      </Card>

      {/* Audit Log Table */}
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Waktu Tercatat</TableHead>
            <TableHead>Kategori</TableHead>
            <TableHead>Aksi &amp; Aktor</TableHead>
            <TableHead>Target / Subjek</TableHead>
            <TableHead>Keterangan Aktivitas</TableHead>
            <TableHead className="text-center">Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {loading ? (
            <TableRow>
              <TableCell colSpan={6} className="py-12 text-center text-slate-400 font-sans text-sm">
                Memuat log audit sistem...
              </TableCell>
            </TableRow>
          ) : logs.length === 0 ? (
            <TableRow>
              <TableCell colSpan={6} className="py-14 text-center">
                <div className="flex flex-col items-center gap-2.5">
                  <div className="w-11 h-11 rounded-full bg-exam-bg text-muted-slate flex items-center justify-center">
                    <FileText className="w-5 h-5" />
                  </div>
                  <p className="text-sm font-heading font-semibold text-ink">Belum ada aktivitas</p>
                  <p className="text-xs text-muted-slate">Tidak ada aktivitas yang tercatat untuk filter ini.</p>
                </div>
              </TableCell>
            </TableRow>
          ) : (
            logs.map(log => (
              <TableRow key={log.id}>
                <TableCell className="font-mono text-xs text-slate-500 whitespace-nowrap">
                  {log.timestamp ? log.timestamp.replace('T', ' ').slice(0, 19) : '-'}
                </TableCell>
                <TableCell className="whitespace-nowrap">
                  <Badge variant={getCategoryVariant(log.category)} format="soft" className="text-[10px]">
                    {log.category}
                  </Badge>
                </TableCell>
                <TableCell>
                  <div className="font-semibold text-slate-900 font-sans">{log.action}</div>
                  <div className="text-[11px] text-slate-500 font-mono flex items-center gap-1 mt-0.5">
                    <span className="text-primary-navy">@{log.actor}</span> &bull; <span>{log.ip}</span>
                  </div>
                </TableCell>
                <TableCell className="font-sans text-xs text-slate-800 font-medium">
                  {log.target || '-'}
                </TableCell>
                <TableCell className="font-sans text-xs text-slate-600 max-w-sm">
                  {log.details}
                </TableCell>
                <TableCell className="text-center whitespace-nowrap">
                  <Badge variant={getStatusVariant(log.status)} format="soft" hasDot className="text-[10px]">
                    {log.status}
                  </Badge>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}
