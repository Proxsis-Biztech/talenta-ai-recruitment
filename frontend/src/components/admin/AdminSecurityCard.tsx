import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { ShieldCheck, KeyRound, Copy, Check, AlertCircle } from 'lucide-react';
import { Button, Input } from '../ui';

const authHeaders = () => {
  const token = localStorage.getItem('adminToken');
  return token ? { Authorization: `Bearer ${token}` } : {};
};

export default function AdminSecurityCard() {
  const [enabled, setEnabled] = useState(false);
  const [secret, setSecret] = useState('');
  const [otpauthUrl, setOtpauthUrl] = useState('');
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    axios
      .get('/api/admin/me', { headers: authHeaders() })
      .then((response) => setEnabled(Boolean(response.data?.data?.twoFactorEnabled)))
      .catch(() => undefined);
  }, []);

  const setup = async () => {
    setError('');
    setMessage('');
    setBusy(true);
    try {
      const response = await axios.post('/api/admin/2fa/setup', {}, { headers: authHeaders() });
      setSecret(response.data?.secret || '');
      setOtpauthUrl(response.data?.otpauthUrl || '');
      setMessage('Pindai/kunci berikut di aplikasi authenticator, lalu masukkan kode 6 digit untuk mengaktifkan.');
    } catch (err) {
      setError(axios.isAxiosError(err) ? err.response?.data?.error || 'Gagal menyiapkan 2FA.' : 'Gagal menyiapkan 2FA.');
    } finally {
      setBusy(false);
    }
  };

  const enable = async () => {
    setError('');
    setBusy(true);
    try {
      await axios.post('/api/admin/2fa/enable', { code }, { headers: authHeaders() });
      setEnabled(true);
      setSecret('');
      setOtpauthUrl('');
      setCode('');
      setMessage('Verifikasi dua langkah aktif. Kode akan diminta setiap kali login.');
    } catch (err) {
      setError(axios.isAxiosError(err) ? err.response?.data?.error || 'Kode tidak valid.' : 'Kode tidak valid.');
    } finally {
      setBusy(false);
    }
  };

  const disable = async () => {
    setError('');
    setBusy(true);
    try {
      await axios.post('/api/admin/2fa/disable', { code, password }, { headers: authHeaders() });
      setEnabled(false);
      setCode('');
      setPassword('');
      setMessage('Verifikasi dua langkah dinonaktifkan.');
    } catch (err) {
      setError(axios.isAxiosError(err) ? err.response?.data?.error || 'Gagal menonaktifkan 2FA.' : 'Gagal menonaktifkan 2FA.');
    } finally {
      setBusy(false);
    }
  };

  const copySecret = async () => {
    try {
      await navigator.clipboard.writeText(secret);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // clipboard may be unavailable
    }
  };

  return (
    <div className="mb-5 rounded-xl border border-slate-200 bg-white p-5 space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-sm font-bold text-ink flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-primary-navy" />
            Keamanan Akun Administrator
          </h3>
          <p className="text-xs text-muted-slate mt-0.5">
            Verifikasi dua langkah (TOTP) melindungi akun superadmin/admin dari akses tanpa izin.
          </p>
        </div>
        <span
          className={`text-[11px] font-bold px-2.5 py-1 rounded-lg ${
            enabled ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-slate-100 text-slate-600'
          }`}
        >
          {enabled ? '2FA Aktif' : '2FA Nonaktif'}
        </span>
      </div>

      {message && <p className="text-xs text-emerald-800 bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2">{message}</p>}
      {error && (
        <p className="text-xs text-rose-800 bg-rose-50 border border-rose-200 rounded-lg px-3 py-2 flex items-center gap-2">
          <AlertCircle className="w-3.5 h-3.5" />
          {error}
        </p>
      )}

      {!enabled && !secret && (
        <Button variant="primary" size="sm" onClick={() => void setup()} disabled={busy} leftIcon={<KeyRound className="w-3.5 h-3.5" />}>
          Aktifkan Verifikasi Dua Langkah
        </Button>
      )}

      {!enabled && secret && (
        <div className="space-y-3">
          <div className="rounded-lg bg-slate-50 border border-slate-200 p-3 space-y-2">
            <p className="text-[11px] text-slate-600">Kunci manual (masukkan ke Google Authenticator / Authy):</p>
            <div className="flex items-center gap-2">
              <code className="font-mono text-xs font-bold text-primary-navy break-all">{secret}</code>
              <button type="button" onClick={() => void copySecret()} className="p-1.5 rounded-lg hover:bg-slate-200 cursor-pointer">
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5 text-slate-500" />}
              </button>
            </div>
            {otpauthUrl && (
              <a href={otpauthUrl} className="text-[11px] text-blue-accent hover:underline break-all">
                {otpauthUrl}
              </a>
            )}
          </div>
          <div className="flex flex-col sm:flex-row gap-2">
            <Input
              value={code}
              onChange={(event) => setCode(event.target.value.replace(/\D/g, '').slice(0, 6))}
              placeholder="Kode 6 digit"
              isMonospace
            />
            <Button variant="primary" size="sm" onClick={() => void enable()} disabled={busy || code.length !== 6}>
              Verifikasi &amp; Aktifkan
            </Button>
          </div>
        </div>
      )}

      {enabled && (
        <div className="flex flex-col sm:flex-row gap-2 sm:items-end">
          <Input
            value={code}
            onChange={(event) => setCode(event.target.value.replace(/\D/g, '').slice(0, 6))}
            placeholder="Kode 6 digit"
            isMonospace
          />
          <Input
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="Kata sandi admin"
          />
          <Button variant="outline" size="sm" onClick={() => void disable()} disabled={busy || code.length !== 6}>
            Nonaktifkan
          </Button>
        </div>
      )}
    </div>
  );
}