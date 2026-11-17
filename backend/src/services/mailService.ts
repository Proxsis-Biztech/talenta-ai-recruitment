import fs from 'fs';
import path from 'path';

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

const OUTBOX_DIR = path.join(__dirname, '../../uploads/mail-outbox');

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
  Boolean(process.env.RESEND_API_KEY || process.env.MAIL_WEBHOOK_URL);

/**
 * Sends transactional mail through Resend (HTTP API) or a generic webhook.
 * When no provider is configured the message is written to uploads/mail-outbox
 * so local/staging environments can still exercise the flow.
 */
export const sendMail = async (input: MailInput): Promise<MailResult> => {
  const from = process.env.MAIL_FROM || 'Talenta+ <no-reply@talenta.local>';

  if (process.env.RESEND_API_KEY) {
    try {
      const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from,
          to: [input.to],
          subject: input.subject,
          html: input.html,
          text: input.text,
          reply_to: input.replyTo,
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

  if (process.env.MAIL_WEBHOOK_URL) {
    try {
      const response = await fetch(process.env.MAIL_WEBHOOK_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ from, ...input }),
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
