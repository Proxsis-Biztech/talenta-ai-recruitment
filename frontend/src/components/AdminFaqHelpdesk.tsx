import React, { useCallback, useEffect, useState } from 'react';
import axios from 'axios';
import {
  BookOpen,
  Upload,
  Download,
  Plus,
  Trash2,
  Search,
  MessageSquare,
  Send,
  CheckCircle2,
  Clock,
  FileText,
  Sparkles,
  Loader2,
  RefreshCw,
  Pencil,
  Settings2,
  Bot,
  LifeBuoy,
  ArrowRight
} from 'lucide-react';
import Swal from 'sweetalert2';
import { Card, CardContent } from './ui/Card';
import { Button } from './ui/Button';
import { Badge } from './ui/Badge';
import { Input } from './ui/Input';

interface FaqChunkItem {
  id: string;
  question: string;
  answer: string;
  category: string;
  keywords: string[];
  sourceFile: string;
  tenantKey: string;
  createdAt: string;
}

interface FaqDocumentMeta {
  id: string;
  fileName: string;
  tenantKey: string;
  companyName: string;
  chunkCount: number;
  mcpSyncStatus: 'synced_local' | 'synced_mcp';
  uploadedBy: string;
  uploadedAt: string;
}

interface HelpdeskMessageItem {
  id: string;
  senderRole: 'peserta' | 'admin' | 'bot';
  senderName: string;
  text: string;
  createdAt: string;
}

interface HelpdeskTicket {
  id: string;
  ticketCode: string;
  tenantKey: string;
  companyName: string;
  programCode: string;
  candidateName: string;
  candidateEmail: string;
  candidateCode: string;
  subject: string;
  source: 'chatbot-faq' | 'exam-player' | 'portal';
  status: 'open' | 'in_progress' | 'resolved';
  unreadByAdmin?: boolean;
  messages: HelpdeskMessageItem[];
  createdAt: string;
  updatedAt: string;
}

interface TenantOption {
  id: string;
  name: string;
}

const getAuthHeaders = () => {
  const token = localStorage.getItem('adminToken') || localStorage.getItem('portalToken') || '';
  return token ? { Authorization: `Bearer ${token}` } : {};
};

interface AdminFaqHelpdeskProps {
  initialTab?: 'knowledge' | 'helpdesk' | 'chatbot';
  hideTabs?: boolean;
}

export const AdminFaqHelpdesk: React.FC<AdminFaqHelpdeskProps> = ({ initialTab = 'knowledge', hideTabs = false }) => {
  const [activeTab, setActiveTab] = useState<'knowledge' | 'helpdesk' | 'chatbot'>(initialTab);

  useEffect(() => {
    setActiveTab(initialTab);
  }, [initialTab]);
  const [tenants, setTenants] = useState<TenantOption[]>([]);
  const [selectedCompanyKey, setSelectedCompanyKey] = useState<string>('DEFAULT');
  const [documents, setDocuments] = useState<FaqDocumentMeta[]>([]);
  const [chunks, setChunks] = useState<FaqChunkItem[]>([]);
  const [loadingKnowledge, setLoadingKnowledge] = useState(false);

  // Upload state
  const [uploading, setUploading] = useState(false);
  const [replaceExisting, setReplaceExisting] = useState(false);

  // Manual add FAQ state
  const [newCategory, setNewCategory] = useState('Umum');
  const [newQuestion, setNewQuestion] = useState('');
  const [newAnswer, setNewAnswer] = useState('');
  const [addingItem, setAddingItem] = useState(false);

  // Edit FAQ state
  const [editingChunkId, setEditingChunkId] = useState<string | null>(null);
  const [editCategory, setEditCategory] = useState('');
  const [editQuestion, setEditQuestion] = useState('');
  const [editAnswer, setEditAnswer] = useState('');
  const [savingEdit, setSavingEdit] = useState(false);

  // Proksis MCP Knowledge GUI config state
  const [mcpOpen, setMcpOpen] = useState(false);
  const [mcpConfig, setMcpConfig] = useState({
    enabled: false,
    endpointUrl: '',
    apiKey: '',
    hasApiKey: false,
    apiKeyMasked: ''
  });
  const [savingMcp, setSavingMcp] = useState(false);
  const [testingMcp, setTestingMcp] = useState(false);

  // RAG tester state
  const [ragQuery, setRagQuery] = useState('');
  const [ragTesting, setRagTesting] = useState(false);
  const [ragResult, setRagResult] = useState<{
    matched: boolean;
    confidence: number;
    bestChunk: FaqChunkItem | null;
    relatedChunks: FaqChunkItem[];
  } | null>(null);

  // Helpdesk state
  const [tickets, setTickets] = useState<HelpdeskTicket[]>([]);
  const [loadingTickets, setLoadingTickets] = useState(false);
  const [statusFilter, setStatusFilter] = useState<'all' | 'open' | 'in_progress' | 'resolved'>('all');
  const [selectedTicketId, setSelectedTicketId] = useState<string | null>(null);
  const [replyText, setReplyText] = useState('');
  const [replying, setReplying] = useState(false);

  // Admin Chatbot FAQ interactive chat state
  const [chatMessages, setChatMessages] = useState<
    Array<{
      id: string;
      sender: 'user' | 'bot';
      text: string;
      matchedQuestion?: string | null;
      sourceFile?: string | null;
      confidence?: number;
      canEscalate?: boolean;
      originalQuery?: string;
    }>
  >([
    {
      id: 'welcome-admin',
      sender: 'bot',
      text: 'Halo Admin! Ini adalah Chatbot AI Asesmen RIGHT (bertenaga Gemini AI) yang juga terhubung ke Basis Pengetahuan FAQ resmi. Ketik pertanyaan apa saja di bawah untuk menguji respon AI atau eskalasi ke Helpdesk Internal.'
    }
  ]);
  const [chatInput, setChatInput] = useState('');
  const [chatSending, setChatSending] = useState(false);
  const [escalatingChat, setEscalatingChat] = useState(false);

  const loadTenants = useCallback(async () => {
    try {
      const resp = await axios.get('/api/admin/tenants', { headers: getAuthHeaders() });
      const list = Array.isArray(resp.data) ? resp.data : resp.data?.tenants || [];
      setTenants(list.map((t: { id: string; name: string }) => ({ id: t.id, name: t.name })));
    } catch {
      // ignore if non-superadmin
    }
  }, []);

  const loadKnowledge = useCallback(async (companyKey: string) => {
    setLoadingKnowledge(true);
    try {
      const resp = await axios.get('/api/admin/faq-knowledge', {
        params: { companyKey },
        headers: getAuthHeaders()
      });
      setDocuments(resp.data?.documents || []);
      setChunks(resp.data?.chunks || []);
    } catch {
      Swal.fire('Gagal', 'Tidak dapat memuat basis pengetahuan FAQ.', 'error');
    } finally {
      setLoadingKnowledge(false);
    }
  }, []);

  const loadTickets = useCallback(async () => {
    setLoadingTickets(true);
    try {
      const resp = await axios.get('/api/admin/helpdesk/tickets', { headers: getAuthHeaders() });
      const list: HelpdeskTicket[] = resp.data?.tickets || [];
      setTickets(list);
      if (!selectedTicketId && list.length > 0) {
        setSelectedTicketId(list[0].id);
      }
    } catch {
      // silent
    } finally {
      setLoadingTickets(false);
    }
  }, [selectedTicketId]);

  useEffect(() => {
    loadTenants();
    loadTickets();
    axios
      .get('/api/admin/faq-knowledge/mcp-config', { headers: getAuthHeaders() })
      .then((res) => {
        if (res.data) {
          setMcpConfig((prev) => ({
            ...prev,
            enabled: Boolean(res.data.enabled),
            endpointUrl: res.data.endpointUrl || '',
            hasApiKey: Boolean(res.data.hasApiKey),
            apiKeyMasked: res.data.apiKeyMasked || ''
          }));
        }
      })
      .catch(() => undefined);
  }, [loadTenants, loadTickets]);

  useEffect(() => {
    loadKnowledge(selectedCompanyKey);
  }, [selectedCompanyKey, loadKnowledge]);

  useEffect(() => {
    if (activeTab !== 'helpdesk') return;
    const timer = setInterval(() => {
      loadTickets();
    }, 20000);
    return () => clearInterval(timer);
  }, [activeTab, loadTickets]);

  useEffect(() => {
    if (activeTab !== 'helpdesk' || typeof window === 'undefined' || !('EventSource' in window)) return;
    const token = localStorage.getItem('adminToken');
    if (!token) return;
    const source = new EventSource(`/api/admin/helpdesk/stream?token=${encodeURIComponent(token)}`);
    const refresh = () => void loadTickets();
    source.addEventListener('ticket-created', refresh);
    source.addEventListener('ticket-updated', refresh);
    source.onerror = () => {
      // EventSource auto-reconnects; polling fallback stays active.
    };
    return () => source.close();
  }, [activeTab, loadTickets]);

  const handleDownloadWordTemplate = async () => {
    try {
      const resp = await axios.get('/api/admin/faq-knowledge/template-docx', {
        headers: getAuthHeaders(),
        responseType: 'blob'
      });
      const blobUrl = URL.createObjectURL(new Blob([resp.data]));
      const a = document.createElement('a');
      a.href = blobUrl;
      a.download = 'Template_FAQ_Knowledge_RIGHT.docx';
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(blobUrl);
    } catch {
      Swal.fire('Gagal', 'Tidak dapat mengunduh template Word FAQ.', 'error');
    }
  };

  const handleUploadWord = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('companyKey', selectedCompanyKey);
      formData.append('companyName', selectedCompanyKey);
      formData.append('replaceExisting', String(replaceExisting));

      const resp = await axios.post('/api/admin/faq-knowledge/upload', formData, {
        headers: { ...getAuthHeaders(), 'Content-Type': 'multipart/form-data' }
      });
      setDocuments(resp.data?.store?.documents || []);
      setChunks(resp.data?.store?.chunks || []);
      Swal.fire('Berhasil', resp.data?.message || 'Dokumen FAQ berhasil diindeks ke Sistem RAG.', 'success');
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { error?: string } } })?.response?.data?.error ||
        'Gagal mengunggah dokumen FAQ Word.';
      Swal.fire('Gagal', msg, 'error');
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  const handleAddManualItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newQuestion.trim() || !newAnswer.trim()) return;
    setAddingItem(true);
    try {
      const resp = await axios.post(
        '/api/admin/faq-knowledge/items',
        {
          companyKey: selectedCompanyKey,
          companyName: selectedCompanyKey,
          category: newCategory.trim() || 'Umum',
          question: newQuestion.trim(),
          answer: newAnswer.trim()
        },
        { headers: getAuthHeaders() }
      );
      setChunks(resp.data?.store?.chunks || []);
      setNewQuestion('');
      setNewAnswer('');
      Swal.fire('Tersimpan', 'Item FAQ berhasil ditambahkan ke Basis Pengetahuan RAG.', 'success');
    } catch {
      Swal.fire('Gagal', 'Tidak dapat menambahkan item FAQ.', 'error');
    } finally {
      setAddingItem(false);
    }
  };

  const handleDeleteChunk = async (id: string) => {
    try {
      const resp = await axios.delete(`/api/admin/faq-knowledge/items/${id}`, {
        params: { companyKey: selectedCompanyKey },
        headers: getAuthHeaders()
      });
      setChunks(resp.data?.store?.chunks || []);
    } catch {
      Swal.fire('Gagal', 'Tidak dapat menghapus item FAQ.', 'error');
    }
  };

  const startEditChunk = (c: FaqChunkItem) => {
    setEditingChunkId(c.id);
    setEditCategory(c.category);
    setEditQuestion(c.question);
    setEditAnswer(c.answer);
  };

  const handleSaveEditChunk = async (id: string) => {
    if (!editQuestion.trim() || !editAnswer.trim()) return;
    setSavingEdit(true);
    try {
      const resp = await axios.put(
        `/api/admin/faq-knowledge/items/${id}`,
        {
          companyKey: selectedCompanyKey,
          category: editCategory.trim() || 'Umum',
          question: editQuestion.trim(),
          answer: editAnswer.trim()
        },
        { headers: getAuthHeaders() }
      );
      setChunks(resp.data?.store?.chunks || []);
      setEditingChunkId(null);
    } catch {
      Swal.fire('Gagal', 'Tidak dapat memperbarui item FAQ.', 'error');
    } finally {
      setSavingEdit(false);
    }
  };

  const handleSaveMcpConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingMcp(true);
    try {
      const resp = await axios.put(
        '/api/admin/faq-knowledge/mcp-config',
        {
          enabled: mcpConfig.enabled,
          endpointUrl: mcpConfig.endpointUrl,
          ...(mcpConfig.apiKey ? { apiKey: mcpConfig.apiKey } : {})
        },
        { headers: getAuthHeaders() }
      );
      setMcpConfig((prev) => ({
        ...prev,
        apiKey: '',
        hasApiKey: Boolean(resp.data?.hasApiKey)
      }));
      Swal.fire('Tersimpan', 'Konfigurasi Proksis MCP Knowledge berhasil disimpan.', 'success');
    } catch {
      Swal.fire('Gagal', 'Tidak dapat menyimpan konfigurasi MCP Knowledge.', 'error');
    } finally {
      setSavingMcp(false);
    }
  };

  const handleTestMcpConfig = async () => {
    setTestingMcp(true);
    try {
      const resp = await axios.post(
        '/api/admin/faq-knowledge/mcp-test',
        { endpointUrl: mcpConfig.endpointUrl, apiKey: mcpConfig.apiKey || undefined },
        { headers: getAuthHeaders() }
      );
      Swal.fire(
        resp.data?.reachable ? 'Terhubung' : 'Gagal',
        resp.data?.message || 'Uji koneksi selesai.',
        resp.data?.reachable ? 'success' : 'warning'
      );
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { error?: string } } })?.response?.data?.error ||
        'Gagal menghubungi endpoint MCP Knowledge.';
      Swal.fire('Gagal', msg, 'error');
    } finally {
      setTestingMcp(false);
    }
  };

  const handleTestRag = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ragQuery.trim()) return;
    setRagTesting(true);
    try {
      const resp = await axios.post(
        '/api/admin/faq-knowledge/test-rag',
        { query: ragQuery.trim(), companyKey: selectedCompanyKey },
        { headers: getAuthHeaders() }
      );
      setRagResult(resp.data);
    } catch {
      Swal.fire('Gagal', 'Pengujian RAG gagal dijalankan.', 'error');
    } finally {
      setRagTesting(false);
    }
  };

  const handleReplyTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTicketId || !replyText.trim()) return;
    setReplying(true);
    try {
      const resp = await axios.post(
        `/api/admin/helpdesk/tickets/${selectedTicketId}/reply`,
        { message: replyText.trim(), status: 'in_progress' },
        { headers: getAuthHeaders() }
      );
      const updated: HelpdeskTicket = resp.data?.ticket;
      if (updated) {
        setTickets((prev) => prev.map((t) => (t.id === updated.id ? updated : t)));
      }
      setReplyText('');
    } catch {
      Swal.fire('Gagal', 'Tidak dapat mengirim balasan tiket.', 'error');
    } finally {
      setReplying(false);
    }
  };

  const handleChangeTicketStatus = async (ticketId: string, status: HelpdeskTicket['status']) => {
    try {
      const resp = await axios.patch(
        `/api/admin/helpdesk/tickets/${ticketId}/status`,
        { status },
        { headers: getAuthHeaders() }
      );
      const updated: HelpdeskTicket = resp.data?.ticket;
      if (updated) {
        setTickets((prev) => prev.map((t) => (t.id === updated.id ? updated : t)));
      }
    } catch {
      Swal.fire('Gagal', 'Tidak dapat mengubah status tiket.', 'error');
    }
  };

  const handleSendAdminChat = async (questionText: string) => {
    const clean = questionText.trim();
    if (!clean || chatSending) return;
    setChatMessages((prev) => [
      ...prev,
      { id: `u-${Date.now()}`, sender: 'user', text: clean }
    ]);
    setChatInput('');
    setChatSending(true);
    try {
      const history = chatMessages
        .filter((m) => m.id !== 'welcome-admin')
        .slice(-8)
        .map((m) => ({ sender: m.sender, text: m.text }));
      const resp = await axios.post(
        '/api/peserta/faq-chat',
        {
          message: clean,
          companyName: selectedCompanyKey === 'DEFAULT' ? '' : selectedCompanyKey,
          history
        },
        { headers: getAuthHeaders() }
      );
      const data = resp.data;
      setChatMessages((prev) => [
        ...prev,
        {
          id: `b-${Date.now()}`,
          sender: 'bot',
          text: data.reply,
          matchedQuestion: data.matchedQuestion,
          sourceFile: data.sourceFile,
          confidence: data.confidence,
          canEscalate: data.canEscalate,
          originalQuery: clean
        }
      ]);
    } catch {
      setChatMessages((prev) => [
        ...prev,
        {
          id: `b-${Date.now()}`,
          sender: 'bot',
          text: 'Gagal memproses pertanyaan Chatbot AI.',
          canEscalate: true,
          originalQuery: clean
        }
      ]);
    } finally {
      setChatSending(false);
    }
  };

  const handleEscalateAdminChat = async (queryText: string) => {
    if (escalatingChat) return;
    setEscalatingChat(true);
    try {
      const resp = await axios.post(
        '/api/peserta/helpdesk/tickets',
        {
          subject: queryText.slice(0, 100),
          message: queryText,
          companyName: selectedCompanyKey === 'DEFAULT' ? 'Umum' : selectedCompanyKey,
          programCode: 'ADMIN-CHAT',
          candidateName: localStorage.getItem('adminUsername') || 'Admin',
          candidateEmail: localStorage.getItem('adminUsername') || 'admin@right.id',
          source: 'chatbot-faq'
        },
        { headers: getAuthHeaders() }
      );
      const created: HelpdeskTicket | undefined = resp.data?.ticket;
      if (created) {
        await loadTickets();
        setSelectedTicketId(created.id);
        setActiveTab('helpdesk');
      }
    } catch {
      Swal.fire('Gagal', 'Tidak dapat membuat tiket Helpdesk Internal.', 'error');
    } finally {
      setEscalatingChat(false);
    }
  };

  const markTicketAsRead = useCallback(async (ticketId: string) => {
    setTickets((prev) =>
      prev.map((t) =>
        t.id === ticketId
          ? { ...t, unreadByAdmin: false, status: t.status === 'open' ? 'in_progress' : t.status }
          : t
      )
    );
    try {
      await axios.patch(
        `/api/admin/helpdesk/tickets/${ticketId}/read`,
        {},
        { headers: getAuthHeaders() }
      );
    } catch {
      // silent
    }
  }, []);

  const filteredTickets = tickets.filter((t) => (statusFilter === 'all' ? true : t.status === statusFilter));
  const selectedTicket = filteredTickets.find((t) => t.id === selectedTicketId) || filteredTickets[0] || null;
  const openCount = tickets.filter((t) => t.unreadByAdmin !== false && t.status === 'open').length;

  useEffect(() => {
    if (activeTab === 'helpdesk' && selectedTicket && selectedTicket.unreadByAdmin !== false) {
      markTicketAsRead(selectedTicket.id);
    }
  }, [activeTab, selectedTicket?.id, selectedTicket?.unreadByAdmin, markTicketAsRead]);

  return (
    <div className="space-y-6">
      {/* Header & Tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        {!hideTabs && (
          <div className="flex items-center gap-2 bg-slate-100 p-1 rounded-xl w-fit">
          <button
            type="button"
            onClick={() => setActiveTab('knowledge')}
            className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all flex items-center gap-2 ${
              activeTab === 'knowledge'
                ? 'bg-white text-primary-navy shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <BookOpen className="w-4 h-4" />
            Konten FAQ (Word) &amp; RAG
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('chatbot')}
            className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all flex items-center gap-2 ${
              activeTab === 'chatbot'
                ? 'bg-white text-primary-navy shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Bot className="w-4 h-4" />
            Chatbot AI
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('helpdesk')}
            className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all flex items-center gap-2 ${
              activeTab === 'helpdesk'
                ? 'bg-white text-primary-navy shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <MessageSquare className="w-4 h-4" />
            Helpdesk Internal
            {openCount > 0 && (
              <span className="px-1.5 py-0.5 text-[11px] font-bold rounded-full bg-rose-500 text-white">
                {openCount}
              </span>
            )}
          </button>
        </div>
        )}

        {activeTab === 'knowledge' && (
          <div className="flex items-center gap-2">
            <select
              value={selectedCompanyKey}
              onChange={(e) => setSelectedCompanyKey(e.target.value)}
              className="px-3 py-2 text-sm border border-slate-200 rounded-xl bg-white text-slate-800 font-medium"
            >
              <option value="DEFAULT">Global Platform (DEFAULT)</option>
              {tenants.map((t) => (
                <option key={t.id} value={t.name}>
                  Tenant: {t.name}
                </option>
              ))}
            </select>
            <Button variant="secondary" size="sm" onClick={handleDownloadWordTemplate}>
              <Download className="w-4 h-4 mr-1.5" />
              Template Word (.docx)
            </Button>
            <Button variant="secondary" size="sm" onClick={() => setMcpOpen((v) => !v)}>
              <Settings2 className="w-4 h-4 mr-1.5" />
              Proksis MCP
            </Button>
          </div>
        )}
      </div>

      {activeTab === 'knowledge' && mcpOpen && (
        <Card className="border-blue-200 bg-blue-50/30">
          <CardContent className="p-5">
            <form onSubmit={handleSaveMcpConfig} className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <h3 className="font-bold text-slate-900 text-sm">
                    Konfigurasi Endpoint Proksis MCP Knowledge
                  </h3>
                  <p className="text-xs text-slate-500">
                    Atur URL endpoint dan Bearer token untuk sinkronisasi otomatis chunk FAQ ke server MCP Knowledge.
                  </p>
                </div>
                <label className="inline-flex items-center gap-2 text-xs font-semibold text-slate-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={mcpConfig.enabled}
                    onChange={(e) => setMcpConfig((prev) => ({ ...prev, enabled: e.target.checked }))}
                    className="rounded border-slate-300"
                  />
                  Aktifkan Sync MCP
                </label>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <Input
                  label="Endpoint URL Proksis MCP Knowledge"
                  value={mcpConfig.endpointUrl}
                  onChange={(e) => setMcpConfig((prev) => ({ ...prev, endpointUrl: e.target.value }))}
                  placeholder="https://mcp.proxsis.com/api/knowledge/ingest"
                />
                <Input
                  label={
                    mcpConfig.hasApiKey
                      ? `Bearer Token (Tersimpan: ${mcpConfig.apiKeyMasked})`
                      : 'Bearer Token (Opsional)'
                  }
                  type="password"
                  value={mcpConfig.apiKey}
                  onChange={(e) => setMcpConfig((prev) => ({ ...prev, apiKey: e.target.value }))}
                  placeholder={mcpConfig.hasApiKey ? 'Kosongkan jika tetap menggunakan token lama' : 'Masukkan API Key / Token'}
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  disabled={testingMcp || !mcpConfig.endpointUrl.trim()}
                  onClick={handleTestMcpConfig}
                >
                  {testingMcp ? 'Menguji...' : 'Uji Koneksi'}
                </Button>
                <Button type="submit" size="sm" disabled={savingMcp}>
                  {savingMcp ? 'Menyimpan...' : 'Simpan Konfigurasi MCP'}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {activeTab === 'knowledge' ? (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left: Upload Word + Manual Add + RAG Tester */}
          <div className="lg:col-span-5 space-y-6">
            <Card className="border-slate-200">
              <CardContent className="p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
                      <Upload className="w-4 h-4 text-blue-accent" />
                      Upload Dokumen FAQ (Word .docx)
                    </h3>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Ekstrak otomatis format Tanya/Jawab (Q:/A:) ke indeks RAG &amp; Proksis MCP Knowledge.
                    </p>
                  </div>
                </div>

                <label className="flex items-center gap-2 text-xs text-slate-600 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={replaceExisting}
                    onChange={(e) => setReplaceExisting(e.target.checked)}
                    className="rounded border-slate-300"
                  />
                  Ganti seluruh item FAQ sebelumnya untuk tenant ini
                </label>

                <label className="flex flex-col items-center justify-center border-2 border-dashed border-slate-300 hover:border-blue-accent rounded-2xl p-6 cursor-pointer bg-slate-50/70 transition-colors">
                  {uploading ? (
                    <Loader2 className="w-7 h-7 animate-spin text-blue-accent mb-2" />
                  ) : (
                    <FileText className="w-7 h-7 text-blue-accent mb-2" />
                  )}
                  <span className="text-sm font-semibold text-slate-800">
                    {uploading ? 'Memproses dokumen...' : 'Pilih File Word (.docx / .txt / .md)'}
                  </span>
                  <span className="text-xs text-slate-500 mt-1">Maksimal 10 MB</span>
                  <input
                    type="file"
                    accept=".docx,.txt,.md"
                    className="hidden"
                    disabled={uploading}
                    onChange={handleUploadWord}
                  />
                </label>

                {documents.length > 0 && (
                  <div className="space-y-2 pt-2 border-t border-slate-100">
                    <p className="text-xs font-bold uppercase tracking-wider text-slate-500">
                      Riwayat Upload Dokumen
                    </p>
                    <div className="space-y-1.5 max-h-40 overflow-y-auto">
                      {documents.map((doc) => (
                        <div
                          key={doc.id}
                          className="flex items-center justify-between text-xs p-2.5 rounded-xl bg-slate-50 border border-slate-200/70"
                        >
                          <div className="truncate pr-2">
                            <p className="font-semibold text-slate-800 truncate">{doc.fileName}</p>
                            <p className="text-slate-500">{doc.chunkCount} chunk terindeks</p>
                          </div>
                          <Badge variant={doc.mcpSyncStatus === 'synced_mcp' ? 'success' : 'info'}>
                            {doc.mcpSyncStatus === 'synced_mcp' ? 'MCP Synced' : 'RAG Local'}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Manual Add FAQ */}
            <Card className="border-slate-200">
              <CardContent className="p-5">
                <h3 className="font-bold text-slate-900 text-base flex items-center gap-2 mb-3">
                  <Plus className="w-4 h-4 text-blue-accent" />
                  Tambah Entri FAQ Manual
                </h3>
                <form onSubmit={handleAddManualItem} className="space-y-3">
                  <Input
                    label="Kategori"
                    value={newCategory}
                    onChange={(e) => setNewCategory(e.target.value)}
                    placeholder="Contoh: Proctoring, Wawancara, LHA"
                  />
                  <Input
                    label="Pertanyaan Kandidat"
                    value={newQuestion}
                    onChange={(e) => setNewQuestion(e.target.value)}
                    placeholder="Contoh: Apakah boleh memakai virtual background?"
                    required
                  />
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Jawaban Resmi Terverifikasi
                    </label>
                    <textarea
                      rows={3}
                      value={newAnswer}
                      onChange={(e) => setNewAnswer(e.target.value)}
                      placeholder="Tuliskan jawaban resmi yang dijadikan referensi oleh Chatbot AI..."
                      className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-accent/20"
                      required
                    />
                  </div>
                  <Button type="submit" disabled={addingItem} className="w-full">
                    {addingItem ? 'Menyimpan...' : 'Simpan ke Knowledge Base'}
                  </Button>
                </form>
              </CardContent>
            </Card>

            {/* RAG Tester */}
            <Card className="border-slate-200 bg-slate-50/60">
              <CardContent className="p-5 space-y-3">
                <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-blue-accent" />
                  Uji Pencarian Referensi FAQ
                </h3>
                <form onSubmit={handleTestRag} className="flex gap-2">
                  <input
                    type="text"
                    value={ragQuery}
                    onChange={(e) => setRagQuery(e.target.value)}
                    placeholder="Ketik pertanyaan kandidat untuk diuji..."
                    className="flex-1 px-3 py-2 text-sm border border-slate-200 rounded-xl bg-white"
                  />
                  <Button type="submit" size="sm" disabled={ragTesting}>
                    <Search className="w-4 h-4" />
                  </Button>
                </form>
                {ragResult && (
                  <div className="p-3 rounded-xl bg-white border border-slate-200 text-xs space-y-1.5">
                    <div className="flex items-center justify-between">
                      <Badge variant={ragResult.matched ? 'success' : 'warning'}>
                        {ragResult.matched ? 'Cocok dengan FAQ' : 'Tidak ada kecocokan (Eskalasi Helpdesk)'}
                      </Badge>
                      <span className="text-slate-500 font-mono">Skor: {ragResult.confidence}</span>
                    </div>
                    {ragResult.bestChunk && (
                      <>
                        <p className="font-semibold text-slate-900">{ragResult.bestChunk.question}</p>
                        <p className="text-slate-600">{ragResult.bestChunk.answer}</p>
                      </>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Right: Indexed Chunks */}
          <div className="lg:col-span-7">
            <Card className="border-slate-200">
              <CardContent className="p-5">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="font-bold text-slate-900 text-base">
                      Basis Pengetahuan FAQ Terindeks ({chunks.length})
                    </h3>
                    <p className="text-xs text-slate-500">
                      Konten di bawah ini digunakan sebagai referensi utama Asisten AI (Gemini) saat menjawab kandidat.
                    </p>
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => loadKnowledge(selectedCompanyKey)}>
                    <RefreshCw className={`w-4 h-4 ${loadingKnowledge ? 'animate-spin' : ''}`} />
                  </Button>
                </div>

                {chunks.length === 0 ? (
                  <div className="text-center py-12 text-slate-500 text-sm">
                    Belum ada konten FAQ khusus untuk tenant ini. Upload file Word (.docx) atau tambahkan manual.
                  </div>
                ) : (
                  <div className="space-y-3 max-h-[700px] overflow-y-auto pr-1">
                    {chunks.map((c) => (
                      <div
                        key={c.id}
                        className="p-4 rounded-2xl border border-slate-200 bg-white hover:border-slate-300 transition-colors space-y-2"
                      >
                        {editingChunkId === c.id ? (
                          <div className="space-y-2.5">
                            <Input
                              label="Kategori"
                              value={editCategory}
                              onChange={(e) => setEditCategory(e.target.value)}
                            />
                            <Input
                              label="Pertanyaan"
                              value={editQuestion}
                              onChange={(e) => setEditQuestion(e.target.value)}
                            />
                            <div>
                              <label className="block text-xs font-semibold text-slate-700 mb-1">
                                Jawaban Resmi
                              </label>
                              <textarea
                                rows={3}
                                value={editAnswer}
                                onChange={(e) => setEditAnswer(e.target.value)}
                                className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl"
                              />
                            </div>
                            <div className="flex justify-end gap-2">
                              <Button
                                type="button"
                                size="sm"
                                variant="secondary"
                                onClick={() => setEditingChunkId(null)}
                              >
                                Batal
                              </Button>
                              <Button
                                type="button"
                                size="sm"
                                disabled={savingEdit}
                                onClick={() => handleSaveEditChunk(c.id)}
                              >
                                {savingEdit ? 'Menyimpan...' : 'Simpan Perubahan'}
                              </Button>
                            </div>
                          </div>
                        ) : (
                          <>
                            <div className="flex items-start justify-between gap-3">
                              <div className="space-y-1">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <Badge variant="info">{c.category}</Badge>
                                  <span className="text-[11px] text-slate-400">{c.sourceFile}</span>
                                </div>
                                <p className="font-bold text-slate-900 text-sm">{c.question}</p>
                              </div>
                              <div className="flex items-center gap-1">
                                <button
                                  type="button"
                                  onClick={() => startEditChunk(c)}
                                  className="p-1.5 text-slate-400 hover:text-blue-accent rounded-lg hover:bg-blue-50"
                                  title="Edit item FAQ"
                                >
                                  <Pencil className="w-4 h-4" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleDeleteChunk(c.id)}
                                  className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50"
                                  title="Hapus item FAQ"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            </div>
                            <p className="text-xs text-slate-600 leading-relaxed">{c.answer}</p>
                            {c.keywords?.length > 0 && (
                              <div className="flex flex-wrap gap-1 pt-1">
                                {c.keywords.slice(0, 6).map((kw) => (
                                  <span
                                    key={kw}
                                    className="px-2 py-0.5 text-[10px] rounded-full bg-slate-100 text-slate-600"
                                  >
                                    #{kw}
                                  </span>
                                ))}
                              </div>
                            )}
                          </>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      ) : activeTab === 'chatbot' ? (
        <Card className="border-slate-200">
          <CardContent className="p-0 overflow-hidden">
            <div className="bg-primary-navy text-white px-5 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-white/10">
                  <Bot className="w-5 h-5 text-blue-300" />
                </div>
                <div>
                  <h3 className="font-bold text-sm">Chatbot AI RIGHT (Gemini AI + Helpdesk Internal)</h3>
                  <p className="text-xs text-blue-200">
                    Menjawab bebas menggunakan Gemini AI dengan referensi Basis Pengetahuan resmi
                  </p>
                </div>
              </div>
              <select
                value={selectedCompanyKey}
                onChange={(e) => setSelectedCompanyKey(e.target.value)}
                className="px-3 py-1.5 text-xs rounded-lg bg-white/10 border border-white/20 text-white"
              >
                <option value="DEFAULT" className="text-slate-900">Global Platform (DEFAULT)</option>
                {tenants.map((t) => (
                  <option key={t.id} value={t.name} className="text-slate-900">
                    Tenant: {t.name}
                  </option>
                ))}
              </select>
            </div>

            {chunks.length > 0 && (
              <div className="px-5 py-2.5 border-b border-slate-100 bg-slate-50 flex gap-2 overflow-x-auto">
                {chunks.slice(0, 5).map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => handleSendAdminChat(item.question)}
                    className="shrink-0 text-xs px-3 py-1.5 rounded-full bg-white border border-slate-200 text-slate-700 hover:border-blue-accent hover:text-primary-navy transition-colors"
                  >
                    {item.question.length > 45 ? `${item.question.slice(0, 45)}...` : item.question}
                  </button>
                ))}
              </div>
            )}

            <div className="p-5 space-y-3 h-[420px] overflow-y-auto bg-white">
              {chatMessages.map((m) => (
                <div
                  key={m.id}
                  className={`flex flex-col ${m.sender === 'user' ? 'items-end' : 'items-start'}`}
                >
                  <div
                    className={`max-w-[80%] px-4 py-3 rounded-2xl text-xs leading-relaxed ${
                      m.sender === 'user'
                        ? 'bg-primary-navy text-white rounded-br-none'
                        : 'bg-slate-100 text-slate-800 rounded-bl-none'
                    }`}
                  >
                    {m.matchedQuestion && (
                      <p className="font-bold text-primary-navy mb-1">{m.matchedQuestion}</p>
                    )}
                    <p className="whitespace-pre-wrap">{m.text}</p>
                    {m.sourceFile && (
                      <p className="text-[10px] text-slate-500 mt-1.5">
                        Referensi: {m.sourceFile} {m.confidence !== undefined ? `• Skor Konteks: ${m.confidence}` : ''}
                      </p>
                    )}
                  </div>
                  {m.canEscalate && m.originalQuery && (
                    <button
                      type="button"
                      disabled={escalatingChat}
                      onClick={() => handleEscalateAdminChat(m.originalQuery!)}
                      className="mt-1.5 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 text-xs font-semibold hover:bg-amber-100"
                    >
                      <LifeBuoy className="w-3.5 h-3.5" />
                      Hubungkan ke Helpdesk Internal
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              ))}
              {chatSending && (
                <div className="flex items-center gap-2 text-xs text-slate-400">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Asisten AI sedang menyusun jawaban...
                </div>
              )}
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSendAdminChat(chatInput);
              }}
              className="p-4 border-t border-slate-200 bg-slate-50 flex gap-2"
            >
              <input
                type="text"
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                placeholder="Ketik pertanyaan apa saja untuk menguji Chatbot AI (Gemini)..."
                className="flex-1 px-4 py-2.5 text-sm border border-slate-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-blue-accent/20"
              />
              <Button type="submit" disabled={chatSending || !chatInput.trim()}>
                <Send className="w-4 h-4 mr-1.5" />
                Kirim
              </Button>
            </form>
          </CardContent>
        </Card>
      ) : (
        /* TAB 2: HELPDESK INTERNAL */
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-5">
            <Card className="border-slate-200">
              <CardContent className="p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-slate-900 text-sm">Chat Masuk Kandidat</h3>
                  <Button variant="ghost" size="sm" onClick={loadTickets}>
                    <RefreshCw className={`w-4 h-4 ${loadingTickets ? 'animate-spin' : ''}`} />
                  </Button>
                </div>
                <div className="flex gap-1.5 flex-wrap">
                  {(['all', 'open', 'in_progress', 'resolved'] as const).map((st) => (
                    <button
                      key={st}
                      type="button"
                      onClick={() => setStatusFilter(st)}
                      className={`px-2.5 py-1 rounded-lg text-xs font-semibold ${
                        statusFilter === st
                          ? 'bg-primary-navy text-white'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      {st === 'all'
                        ? 'Semua'
                        : st === 'open'
                          ? 'Baru'
                          : st === 'in_progress'
                            ? 'Aktif'
                            : 'Selesai'}
                    </button>
                  ))}
                </div>

                <div className="space-y-2 max-h-[540px] overflow-y-auto">
                  {filteredTickets.length === 0 ? (
                    <p className="text-center py-8 text-xs text-slate-500">Belum ada chat Helpdesk masuk.</p>
                  ) : (
                    filteredTickets.map((t) => {
                      const lastMsg = t.messages[t.messages.length - 1];
                      return (
                        <button
                          key={t.id}
                          type="button"
                          onClick={() => {
                            setSelectedTicketId(t.id);
                            markTicketAsRead(t.id);
                          }}
                          className={`w-full text-left p-3 rounded-xl border transition-all ${
                            selectedTicket?.id === t.id
                              ? 'border-blue-accent bg-blue-50/40'
                              : 'border-slate-200 bg-white hover:bg-slate-50'
                          }`}
                        >
                          <div className="flex items-center justify-between gap-2 mb-1">
                            <p className="font-bold text-slate-900 text-xs truncate">{t.candidateName}</p>
                            <Badge
                              variant={
                                t.status === 'resolved'
                                  ? 'success'
                                  : t.status === 'in_progress'
                                    ? 'info'
                                    : 'warning'
                              }
                            >
                              {t.status === 'resolved'
                                ? 'Selesai'
                                : t.status === 'in_progress'
                                  ? 'Aktif'
                                  : 'Baru'}
                            </Badge>
                          </div>
                          <p className="text-[11px] font-medium text-primary-navy truncate">
                            {t.companyName} • {t.programCode}
                          </p>
                          <p className="text-xs text-slate-600 truncate mt-1">
                            {lastMsg?.text || t.subject}
                          </p>
                        </button>
                      );
                    })
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="lg:col-span-7">
            <Card className="border-slate-200">
              <CardContent className="p-5">
                {!selectedTicket ? (
                  <div className="text-center py-16 text-sm text-slate-500">
                    Pilih percakapan di sebelah kiri untuk membalas chat kandidat.
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-bold text-slate-900 text-base">
                            {selectedTicket.candidateName}
                          </h3>
                          <Badge variant="info">{selectedTicket.source}</Badge>
                        </div>
                        <p className="text-xs text-slate-500 mt-0.5">
                          {selectedTicket.companyName} • Program: {selectedTicket.programCode}
                        </p>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Button
                          size="sm"
                          variant={selectedTicket.status === 'in_progress' ? 'primary' : 'secondary'}
                          onClick={() => handleChangeTicketStatus(selectedTicket.id, 'in_progress')}
                        >
                          <Clock className="w-3.5 h-3.5 mr-1" />
                          Proses
                        </Button>
                        <Button
                          size="sm"
                          variant={selectedTicket.status === 'resolved' ? 'primary' : 'secondary'}
                          onClick={() => handleChangeTicketStatus(selectedTicket.id, 'resolved')}
                        >
                          <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
                          Selesai
                        </Button>
                      </div>
                    </div>

                    <div className="space-y-3 max-h-[360px] overflow-y-auto p-3 rounded-2xl bg-slate-50 border border-slate-200/70">
                      {selectedTicket.messages.map((m) => (
                        <div
                          key={m.id}
                          className={`flex flex-col ${
                            m.senderRole === 'admin' ? 'items-end' : 'items-start'
                          }`}
                        >
                          <span className="text-[10px] text-slate-400 mb-1 px-1">
                            {m.senderName} •{' '}
                            {new Date(m.createdAt).toLocaleString('id-ID', {
                              hour: '2-digit',
                              minute: '2-digit',
                              day: '2-digit',
                              month: 'short'
                            })}
                          </span>
                          <div
                            className={`max-w-[85%] px-3.5 py-2.5 rounded-2xl text-xs leading-relaxed ${
                              m.senderRole === 'admin'
                                ? 'bg-primary-navy text-white rounded-br-none'
                                : 'bg-white border border-slate-200 text-slate-800 rounded-bl-none'
                            }`}
                          >
                            {m.text}
                          </div>
                        </div>
                      ))}
                    </div>

                    <form onSubmit={handleReplyTicket} className="flex gap-2">
                      <input
                        type="text"
                        value={replyText}
                        onChange={(e) => setReplyText(e.target.value)}
                        placeholder="Tulis balasan resmi Helpdesk Internal untuk kandidat..."
                        className="flex-1 px-3.5 py-2.5 text-sm border border-slate-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-blue-accent/20"
                      />
                      <Button type="submit" disabled={replying || !replyText.trim()}>
                        {replying ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <>
                            <Send className="w-4 h-4 mr-1.5" />
                            Kirim
                          </>
                        )}
                      </Button>
                    </form>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminFaqHelpdesk;
