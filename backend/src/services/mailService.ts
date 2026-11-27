import fs from 'fs';
import path from 'path';
import nodemailer from 'nodemailer';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export type MailProvider = 'auto' | 'smtp' | 'resend' | 'webhook' | 'outbox';
export type ActiveMailProvider = 'smtp' | 'resend' | 'webhook' | 'outbox';

export interface MailRuntimeConfig {
  provider: MailProvider;
  fromName: string;
  fromEmail: string;
  replyTo: string;
  appBaseUrl: string;
  smtpHost: string;
  smtpPort: number;
  smtpSecure: boolean;
  smtpUser: string;
  smtpPass: string;
  resendApiKey: string;
  webhookUrl: string;
}

export interface EffectiveMailConfig extends MailRuntimeConfig {
  activeProvider: ActiveMailProvider;
  formattedFrom: string;
  effectiveAppBaseUrl: string;
}

export interface MailInput {
  to: string;
  subject: string;
  html: string;
  text?: string;
  replyTo?: string;
}

export interface MailResult {
  delivered: boolean;
  provider: string;
  error?: string;
}

export interface MailTestResult {
  reachable: boolean;
  provider: ActiveMailProvider;
  message: string;
}

export const DEFAULT_MAIL_CONFIG: MailRuntimeConfig = {
  provider: 'auto',
  fromName: 'Talenta+',
  fromEmail: '',
  replyTo: '',
  appBaseUrl: '',
  smtpHost: '',
  smtpPort: 465,
  smtpSecure: true,
  smtpUser: '',
  smtpPass: '',
  resendApiKey: '',
  webhookUrl: ''
};

const OUTBOX_DIR = path.join(__dirname, '../../uploads/mail-outbox');
let cachedMailConfig: { value: MailRuntimeConfig; expiresAt: number } | null = null;

/** Parses `"Display Name <email@domain>"` or `"email@domain"` into parts. */
export const parseMailFrom = (raw?: string): { name: string; email: string } => {
  const value = String(raw || '').trim();
  if (!value) return { name: '', email: '' };
  const match = value.match(/^(.*?)\s*<([^<>]+)>$/);
  if (match) {
    return {
      name: match[1].replace(/^["']|["']$/g, '').trim(),
      email: match[2].trim()
    };
  }
  return { name: '', email: value };
};

export const formatMailFrom = (fromName: string, fromEmail: string): string => {
  const cleanEmail = fromEmail.trim();
  const cleanName = fromName.replace(/[\r\n"]/g, '').trim();
  if (!cleanEmail) return cleanName ? `${cleanName} <no-reply@talenta.local>` : 'Talenta+ <no-reply@talenta.local>';
  return cleanName ? `"${cleanName}" <${cleanEmail}>` : cleanEmail;
};

const normalizeAppUrl = (raw: string): string => raw.trim().replace(/\/+$/, '');

const resolveEnvAppBaseUrl = (env: NodeJS.ProcessEnv): string => {
  const explicit = env.APP_BASE_URL || env.FRONTEND_URL;
  if (explicit) return normalizeAppUrl(explicit);
  const firstOrigin = String(env.CORS_ORIGIN || '')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean)[0];
  return normalizeAppUrl(firstOrigin || 'http://localhost:5173');
};

const parsePort = (value: unknown, fallback: number): number => {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed >= 1 && parsed <= 65535 ? parsed : fallback;
};

const parseBoolean = (value: unknown, fallback: boolean): boolean => {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'string') {
    const lower = value.trim().toLowerCase();
    if (lower === 'true' || lower === '1') return true;
    if (lower === 'false' || lower === '0') return false;
  }
  return fallback;
};

export const normalizeStoredMailConfig = (raw: unknown): MailRuntimeConfig => {
  const src = raw && typeof raw === 'object' && !Array.isArray(raw) ? (raw as Record<string, unknown>) : {};
  const providerRaw = String(src.provider || 'auto').trim();
  const provider: MailProvider =
    providerRaw === 'smtp' ||
    providerRaw === 'resend' ||
    providerRaw === 'webhook' ||
    providerRaw === 'outbox'
      ? providerRaw
      : 'auto';
  const smtpPort = parsePort(src.smtpPort, DEFAULT_MAIL_CONFIG.smtpPort);
  return {
    provider,
    fromName: String(src.fromName ?? DEFAULT_MAIL_CONFIG.fromName).trim(),
    fromEmail: String(src.fromEmail ?? '').trim(),
    replyTo: String(src.replyTo ?? '').trim(),
    appBaseUrl: normalizeAppUrl(String(src.appBaseUrl ?? '')),
    smtpHost: String(src.smtpHost ?? '').trim(),
    smtpPort,
    smtpSecure: parseBoolean(src.smtpSecure, smtpPort === 465),
    smtpUser: String(src.smtpUser ?? '').trim(),
    smtpPass: String(src.smtpPass ?? ''),
    resendApiKey: String(src.resendApiKey ?? '').trim(),
    webhookUrl: String(src.webhookUrl ?? '').trim()
  };
};

/**
 * Merges DB-stored mail settings with environment variable fallbacks
 * and resolves which transport provider is active.
 */
export const resolveEffectiveMailConfig = (
  stored: Partial<MailRuntimeConfig> = {},
  env: NodeJS.ProcessEnv = process.env
): EffectiveMailConfig => {
  const envFrom = parseMailFrom(env.MAIL_FROM);
  const envPort = parsePort(env.SMTP_PORT, 465);
  const envSecure = parseBoolean(env.SMTP_SECURE, envPort === 465);

  const smtpHost = String(stored.smtpHost ?? '').trim() || String(env.SMTP_HOST || '').trim();
  const smtpPort = stored.smtpPort ? parsePort(stored.smtpPort, envPort) : envPort;
  const smtpSecure =
    typeof stored.smtpSecure === 'boolean'
      ? stored.smtpSecure
      : env.SMTP_SECURE !== undefined
        ? envSecure
        : smtpPort === 465;
  const smtpUser = String(stored.smtpUser ?? '').trim() || String(env.SMTP_USER || '').trim();
  const smtpPass = String(stored.smtpPass ?? '') || String(env.SMTP_PASS || '');
  const resendApiKey = String(stored.resendApiKey ?? '').trim() || String(env.RESEND_API_KEY || '').trim();
  const webhookUrl = String(stored.webhookUrl ?? '').trim() || String(env.MAIL_WEBHOOK_URL || '').trim();

  const fromName = String(stored.fromName ?? '').trim() || envFrom.name || DEFAULT_MAIL_CONFIG.fromName;
  const rawFromEmail = String(stored.fromEmail ?? '').trim() || envFrom.email;
  const fromEmail = rawFromEmail || (smtpUser.includes('@') ? smtpUser : '');
  const replyTo = String(stored.replyTo ?? '').trim() || String(env.MAIL_REPLY_TO || '').trim();
  const appBaseUrl = normalizeAppUrl(String(stored.appBaseUrl ?? ''));
  const effectiveAppBaseUrl = appBaseUrl || resolveEnvAppBaseUrl(env);

  const provider: MailProvider = stored.provider || 'auto';
  const smtpReady = Boolean(smtpHost && smtpUser && smtpPass);

  let activeProvider: ActiveMailProvider = 'outbox';
  if (provider === 'outbox') {
    activeProvider = 'outbox';
  } else if (provider === 'smtp') {
    activeProvider = smtpReady ? 'smtp' : 'outbox';
  } else if (provider === 'resend') {
    activeProvider = resendApiKey ? 'resend' : 'outbox';
  } else if (provider === 'webhook') {
    activeProvider = webhookUrl ? 'webhook' : 'outbox';
  } else {
    if (smtpReady) activeProvider = 'smtp';
    else if (resendApiKey) activeProvider = 'resend';
    else if (webhookUrl) activeProvider = 'webhook';
  }

  return {
    provider,
    fromName,
    fromEmail,
    replyTo,
    appBaseUrl,
    smtpHost,
    smtpPort,
    smtpSecure,
    smtpUser,
    smtpPass,
    resendApiKey,
    webhookUrl,
    activeProvider,
    formattedFrom: formatMailFrom(fromName, fromEmail),
    effectiveAppBaseUrl
  };
};

export const getMailConfig = async (): Promise<MailRuntimeConfig> => {
  if (cachedMailConfig && cachedMailConfig.expiresAt > Date.now()) {
    return cachedMailConfig.value;
  }
  let value = DEFAULT_MAIL_CONFIG;
  try {
    const record = await prisma.masterRecord.findUnique({
      where: { scope_key: { scope: 'mail-config', key: 'default' } }
    });
    if (record?.value) {
      value = normalizeStoredMailConfig(JSON.parse(record.value));
    }
  } catch {
    value = DEFAULT_MAIL_CONFIG;
  }
  cachedMailConfig = { value, expiresAt: Date.now() + 30_000 };
  return value;
};

export const invalidateMailConfigCache = () => {
  cachedMailConfig = null;
};

export const resolveAppBaseUrl = async (): Promise<string> => {
  const stored = await getMailConfig();
  return resolveEffectiveMailConfig(stored).effectiveAppBaseUrl;
};

const writeOutbox = (input: MailInput, provider: string, error?: string) => {
  try {
    if (!fs.existsSync(OUTBOX_DIR)) fs.mkdirSync(OUTBOX_DIR, { recursive: true });
    const stamp = new Date().toISOString().replace(/[:.]/g, '-');
    const fileName = `${stamp}-${input.to.replace(/[^a-zA-Z0-9@.\-]/g, '_')}.html`;
    const header = [
      `To: ${input.to}`,
      `Subject: ${input.subject}`,
      `Provider: ${provider}`,
      error ? `Error: ${error}` : '',
      '',
    ].join('\n');
    fs.writeFileSync(path.join(OUTBOX_DIR, fileName), `${header}${input.html}`, 'utf8');
  } catch (err) {
    console.error('Mail outbox write failed:', err);
  }
};

export const isMailConfigured = (): boolean =>
  Boolean(
    (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) ||
      process.env.RESEND_API_KEY ||
      process.env.MAIL_WEBHOOK_URL
  );

export const isMailConfiguredAsync = async (): Promise<boolean> => {
  const stored = await getMailConfig();
  return resolveEffectiveMailConfig(stored).activeProvider !== 'outbox';
};

const createSmtpTransporter = (cfg: EffectiveMailConfig) =>
  nodemailer.createTransport({
    host: cfg.smtpHost,
    port: cfg.smtpPort,
    secure: cfg.smtpSecure,
    auth: {
      user: cfg.smtpUser,
      pass: cfg.smtpPass
    },
    connectionTimeout: 10_000,
    greetingTimeout: 10_000,
    socketTimeout: 15_000
  });

const dispatchWithConfig = async (cfg: EffectiveMailConfig, input: MailInput): Promise<MailResult> => {
  const replyTo = input.replyTo || cfg.replyTo || undefined;

  if (cfg.activeProvider === 'smtp') {
    try {
      const transporter = createSmtpTransporter(cfg);
      await transporter.sendMail({
        from: cfg.formattedFrom,
        to: input.to,
        subject: input.subject,
        html: input.html,
        text: input.text,
        replyTo
      });
      return { delivered: true, provider: 'smtp' };
    } catch (error: any) {
      const detail = error?.message || 'SMTP send failed';
      console.error('SMTP mail error:', detail);
      writeOutbox(input, 'smtp', detail);
      return { delivered: false, provider: 'smtp', error: detail };
    }
  }

  if (cfg.activeProvider === 'resend') {
    try {
      const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${cfg.resendApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: cfg.formattedFrom,
          to: [input.to],
          subject: input.subject,
          html: input.html,
          text: input.text,
          reply_to: replyTo,
        }),
      });
      if (!response.ok) {
        const detail = await response.text();
        console.error('Resend mail failed:', response.status, detail);
        writeOutbox(input, 'resend', `${response.status} ${detail}`);
        return { delivered: false, provider: 'resend', error: detail };
      }
      return { delivered: true, provider: 'resend' };
    } catch (error: any) {
      console.error('Resend mail error:', error);
      writeOutbox(input, 'resend', error?.message);
      return { delivered: false, provider: 'resend', error: error?.message };
    }
  }

  if (cfg.activeProvider === 'webhook') {
    try {
      const response = await fetch(cfg.webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ from: cfg.formattedFrom, replyTo, ...input }),
      });
      if (!response.ok) {
        writeOutbox(input, 'webhook', `${response.status}`);
        return { delivered: false, provider: 'webhook', error: `${response.status}` };
      }
      return { delivered: true, provider: 'webhook' };
    } catch (error: any) {
      writeOutbox(input, 'webhook', error?.message);
      return { delivered: false, provider: 'webhook', error: error?.message };
    }
  }

  writeOutbox(input, 'outbox');
  console.log(`[mail:outbox] ${input.subject} -> ${input.to}`);
  return { delivered: false, provider: 'outbox' };
};

/**
 * Sends transactional mail through SMTP (e.g. Zoho Mail / ZeptoMail), Resend, or a webhook.
 * When no provider is configured the message is written to uploads/mail-outbox
 * so local/staging environments can still exercise the flow.
 */
export const sendMail = async (input: MailInput): Promise<MailResult> => {
  const stored = await getMailConfig();
  const cfg = resolveEffectiveMailConfig(stored);
  return dispatchWithConfig(cfg, input);
};

/**
 * Verifies the configured mail transport and optionally sends a test message.
 */
export const testMailConnection = async (
  override: Partial<MailRuntimeConfig> = {},
  testTo?: string
): Promise<MailTestResult> => {
  const stored = await getMailConfig();
  const merged: MailRuntimeConfig = { ...stored, ...override };
  const cfg = resolveEffectiveMailConfig(merged);

  if (cfg.activeProvider === 'outbox') {
    const missingSmtp =
      merged.provider === 'smtp'
        ? 'Host, username, atau password SMTP belum lengkap.'
        : 'Belum ada provider email aktif (SMTP / Resend / Webhook).';
    return { reachable: false, provider: 'outbox', message: missingSmtp };
  }

  if (cfg.activeProvider === 'smtp') {
    try {
      const transporter = createSmtpTransporter(cfg);
      await transporter.verify();
      if (!testTo) {
        return {
          reachable: true,
          provider: 'smtp',
          message: `Koneksi SMTP ke ${cfg.smtpHost}:${cfg.smtpPort} berhasil diverifikasi.`
        };
      }
    } catch (error: any) {
      return {
        reachable: false,
        provider: 'smtp',
        message: `Gagal terhubung ke SMTP ${cfg.smtpHost}:${cfg.smtpPort} — ${error?.message || 'Autentikasi/koneksi ditolak'}`
      };
    }
  }

  if (testTo) {
    const result = await dispatchWithConfig(cfg, {
      to: testTo,
      subject: 'Tes Konfigurasi Email Talenta+',
      html: layout(
        'Tes Koneksi Email Berhasil',
        `<p>Email ini dikirim untuk memverifikasi konfigurasi pengiriman email platform <strong>Talenta+</strong>.</p>
         <p>Provider aktif: <strong>${cfg.activeProvider.toUpperCase()}</strong><br/>Pengirim: <code>${cfg.formattedFrom}</code></p>`
      ),
      text: `Tes konfigurasi email Talenta+ berhasil (${cfg.activeProvider}) dari ${cfg.formattedFrom}.`
    });
    if (!result.delivered) {
      return {
        reachable: false,
        provider: cfg.activeProvider,
        message: `Gagal mengirim email tes via ${cfg.activeProvider}: ${result.error || 'Unknown error'}`
      };
    }
    return {
      reachable: true,
      provider: cfg.activeProvider,
      message: `Email tes berhasil dikirim ke ${testTo} melalui ${cfg.activeProvider.toUpperCase()}.`
    };
  }

  return {
    reachable: true,
    provider: cfg.activeProvider,
    message: `Provider ${cfg.activeProvider.toUpperCase()} terkonfigurasi. Isi email tujuan tes untuk menguji pengiriman nyata.`
  };
};

const layout = (title: string, body: string) => `
<div style="font-family:Segoe UI,Arial,sans-serif;background:#f8fafc;padding:32px">
  <div style="max-width:560px;margin:0 auto;background:#ffffff;border:1px solid #e2e8f0;border-radius:14px;overflow:hidden">
    <div style="background:#1e3a8a;padding:20px 28px;color:#ffffff">
      <div style="font-size:18px;font-weight:700">Talenta+</div>
      <div style="font-size:12px;opacity:.8">Platform Asesmen &amp; Rekrutmen</div>
    </div>
    <div style="padding:28px;color:#0f172a;font-size:14px;line-height:1.6">
      <h2 style="margin:0 0 16px;font-size:18px;color:#1e3a8a">${title}</h2>
      ${body}
    </div>
    <div style="padding:16px 28px;background:#f8fafc;border-top:1px solid #e2e8f0;color:#64748b;font-size:11px">
      Email ini dikirim otomatis oleh Talenta+. Jangan membagikan tautan atau kode di dalamnya.
    </div>
  </div>
</div>`;

const button = (href: string, label: string) =>
  `<p style="margin:24px 0"><a href="${href}" style="background:#2563eb;color:#ffffff;text-decoration:none;padding:12px 20px;border-radius:10px;font-weight:600;display:inline-block">${label}</a></p>`;

export const sendPasswordResetEmail = async (
  to: string,
  name: string,
  token: string,
  resetUrl: string
): Promise<MailResult> =>
  sendMail({
    to,
    subject: 'Atur ulang kata sandi akun Talenta+ Anda',
    html: layout(
      'Atur ulang kata sandi',
      `<p>Halo ${name || 'Kandidat'},</p>
       <p>Kami menerima permintaan untuk mengatur ulang kata sandi akun Anda. Tautan di bawah berlaku 30 menit dan hanya dapat dipakai satu kali.</p>
       ${button(resetUrl, 'Atur Kata Sandi Baru')}
       <p>Jika tombol tidak berfungsi, salin kode berikut ke halaman reset: <strong style="font-family:monospace;letter-spacing:2px">${token}</strong></p>
       <p style="color:#64748b">Abaikan email ini jika Anda tidak meminta pengaturan ulang kata sandi.</p>`
    ),
    text: `Atur ulang kata sandi Talenta+: ${resetUrl} (kode: ${token})`,
  });

export const sendCredentialsEmail = async (
  to: string,
  name: string,
  params: { loginUrl: string; programTitle?: string; temporaryPassword?: string; username?: string }
): Promise<MailResult> =>
  sendMail({
    to,
    subject: `Akun asesmen Talenta+${params.programTitle ? ` — ${params.programTitle}` : ''}`,
    html: layout(
      'Akun asesmen Anda sudah siap',
      `<p>Halo ${name || 'Kandidat'},</p>
       <p>Akun Anda untuk ${params.programTitle ? `<strong>${params.programTitle}</strong>` : 'asesmen Talenta+'} telah dibuat.</p>
       <table style="width:100%;font-size:13px;border-collapse:collapse">
         <tr><td style="padding:6px 0;color:#64748b">Email</td><td style="padding:6px 0;font-weight:600">${to}</td></tr>
         ${params.username ? `<tr><td style="padding:6px 0;color:#64748b">Username</td><td style="padding:6px 0;font-weight:600">${params.username}</td></tr>` : ''}
         ${params.temporaryPassword ? `<tr><td style="padding:6px 0;color:#64748b">Kata sandi sementara</td><td style="padding:6px 0;font-family:monospace;font-weight:600">${params.temporaryPassword}</td></tr>` : ''}
       </table>
       ${button(params.loginUrl, 'Masuk ke Talenta+')}
       <p style="color:#64748b">Anda akan diminta mengganti kata sandi sementara saat pertama kali masuk.</p>`
    ),
    text: `Akun Talenta+ siap. Masuk: ${params.loginUrl}${params.temporaryPassword ? ` | Sandi sementara: ${params.temporaryPassword}` : ''}`,
  });

export const sendActivationEmail = async (
  to: string,
  name: string,
  token: string,
  activationUrl: string,
  programTitle?: string | null
): Promise<MailResult> =>
  sendMail({
    to,
    subject: programTitle
      ? `Aktivasi Akun Asesmen: ${programTitle} — Talenta+`
      : 'Aktivasi Akun Peserta Talenta+',
    html: layout(
      'Aktivasi akun peserta',
      `<p>Halo ${name || 'Peserta'},</p>
       <p>Akun asesmen Anda pada <strong>Talenta+</strong> telah dibuat.${
         programTitle ? ` Anda dijadwalkan untuk program <strong>${programTitle}</strong>.` : ''
       }</p>
       <p>Untuk alasan keamanan, silakan buat kata sandi pribadi Anda sendiri melalui tautan aktivasi di bawah ini:</p>
       ${button(activationUrl, 'Aktivasi Akun & Buat Kata Sandi')}
       <p style="color:#475569;font-size:13px">Atau tempelkan kode aktivasi berikut pada halaman masuk:</p>
       <p style="font-family:monospace;background:#f1f5f9;padding:10px 14px;border-radius:8px;display:inline-block">${token}</p>
       <p style="color:#64748b">Tautan ini berlaku selama 7 hari dan hanya dapat digunakan satu kali.</p>`
    ),
    text: `Aktivasi akun Talenta+. Buka tautan berikut untuk membuat kata sandi Anda (berlaku 7 hari): ${activationUrl} | Kode: ${token}`,
  });

export const sendInvitationEmail = async (
  to: string,
  name: string,
  params: { programTitle: string; loginUrl: string; schedule?: string | null; note?: string }
): Promise<MailResult> =>
  sendMail({
    to,
    subject: `Undangan asesmen: ${params.programTitle}`,
    html: layout(
      'Undangan asesmen',
      `<p>Halo ${name || 'Kandidat'},</p>
       <p>Anda diundang mengikuti asesmen <strong>${params.programTitle}</strong> di Talenta+.</p>
       ${params.schedule ? `<p>Jadwal: <strong>${params.schedule}</strong></p>` : ''}
       ${params.note ? `<p>${params.note}</p>` : ''}
       ${button(params.loginUrl, 'Buka Portal Asesmen')}
       <p style="color:#64748b">Gunakan email ini saat masuk. Cek perangkat dan verifikasi wajah sebelum memulai ujian.</p>`
    ),
    text: `Undangan asesmen ${params.programTitle}: ${params.loginUrl}`,
  });
