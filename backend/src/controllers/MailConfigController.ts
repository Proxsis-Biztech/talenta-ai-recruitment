import { Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { z } from 'zod';
import { type AuthRequest } from '../middleware/auth';
import { recordAuditLog, resolveRequestIp } from '../services/auditService';
import {
  DEFAULT_MAIL_CONFIG,
  getMailConfig,
  invalidateMailConfigCache,
  normalizeStoredMailConfig,
  resolveEffectiveMailConfig,
  testMailConnection,
  type MailRuntimeConfig
} from '../services/mailService';

const prisma = new PrismaClient();

const maskSecret = (secret: string): string => {
  const value = String(secret || '').trim();
  if (!value) return '';
  if (value.length <= 6) return '••••••';
  return `${value.slice(0, 2)}••••${value.slice(-2)}`;
};

const isMasked = (value: unknown): boolean => String(value || '').includes('••');
const emailCheck = z.string().email();

const mailConfigSchema = z.object({
  provider: z.enum(['auto', 'smtp', 'resend', 'webhook', 'outbox']).default('auto'),
  fromName: z.string().trim().max(120).optional().default(DEFAULT_MAIL_CONFIG.fromName),
  fromEmail: z.string().trim().max(200).optional().default(''),
  replyTo: z.string().trim().max(200).optional().default(''),
  appBaseUrl: z.string().trim().max(300).optional().default(''),
  smtpHost: z.string().trim().max(200).optional().default(''),
  smtpPort: z.coerce.number().int().min(1).max(65535).optional().default(465),
  smtpSecure: z.boolean().optional(),
  smtpUser: z.string().trim().max(200).optional().default(''),
  smtpPass: z.string().max(300).optional().default(''),
  clearSmtpPass: z.boolean().optional(),
  resendApiKey: z.string().trim().max(300).optional().default(''),
  clearResendApiKey: z.boolean().optional(),
  webhookUrl: z.string().trim().max(400).optional().default('')
});

const serializePublicMailConfig = (stored: MailRuntimeConfig) => {
  const effective = resolveEffectiveMailConfig(stored);
  const envSmtpReady = Boolean(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS);
  return {
    config: {
      provider: stored.provider,
      fromName: stored.fromName,
      fromEmail: stored.fromEmail,
      replyTo: stored.replyTo,
      appBaseUrl: stored.appBaseUrl,
      smtpHost: stored.smtpHost,
      smtpPort: stored.smtpPort,
      smtpSecure: stored.smtpSecure,
      smtpUser: stored.smtpUser,
      hasSmtpPass: Boolean(stored.smtpPass),
      smtpPassMasked: maskSecret(stored.smtpPass),
      hasResendApiKey: Boolean(stored.resendApiKey),
      resendApiKeyMasked: maskSecret(stored.resendApiKey),
      webhookUrl: stored.webhookUrl
    },
    effective: {
      activeProvider: effective.activeProvider,
      effectiveFrom: effective.formattedFrom,
      effectiveAppBaseUrl: effective.effectiveAppBaseUrl,
      envSmtpConfigured: envSmtpReady,
      envResendConfigured: Boolean(process.env.RESEND_API_KEY),
      envWebhookConfigured: Boolean(process.env.MAIL_WEBHOOK_URL)
    }
  };
};

const validateOptionalEmails = (fields: Array<{ label: string; value: string }>) => {
  for (const field of fields) {
    if (field.value && !emailCheck.safeParse(field.value).success) {
      return `${field.label} tidak valid.`;
    }
  }
  return null;
};

export const getMailConfigHandler = async (_req: AuthRequest, res: Response) => {
  try {
    const stored = await getMailConfig();
    return res.json(serializePublicMailConfig(stored));
  } catch (error) {
    console.error('Get mail config error:', error);
    return res.status(500).json({ error: 'Gagal memuat konfigurasi email.' });
  }
};

export const saveMailConfigHandler = async (req: AuthRequest, res: Response) => {
  try {
    const parsed = mailConfigSchema.parse(req.body || {});
    const emailError = validateOptionalEmails([
      { label: 'Email Pengirim (From)', value: parsed.fromEmail },
      { label: 'Reply-To', value: parsed.replyTo }
    ]);
    if (emailError) return res.status(400).json({ error: emailError });

    if (parsed.appBaseUrl && !/^https?:\/\//i.test(parsed.appBaseUrl)) {
      return res.status(400).json({ error: 'Base URL aplikasi harus diawali http:// atau https://.' });
    }
    if (parsed.webhookUrl && !/^https?:\/\//i.test(parsed.webhookUrl)) {
      return res.status(400).json({ error: 'Webhook URL harus diawali http:// atau https://.' });
    }

    const existing = await getMailConfig();
    const smtpPass = parsed.clearSmtpPass
      ? ''
      : parsed.smtpPass && !isMasked(parsed.smtpPass)
        ? parsed.smtpPass
        : existing.smtpPass;
    const resendApiKey = parsed.clearResendApiKey
      ? ''
      : parsed.resendApiKey && !isMasked(parsed.resendApiKey)
        ? parsed.resendApiKey
        : existing.resendApiKey;

    const nextConfig = normalizeStoredMailConfig({
      provider: parsed.provider,
      fromName: parsed.fromName,
      fromEmail: parsed.fromEmail,
      replyTo: parsed.replyTo,
      appBaseUrl: parsed.appBaseUrl,
      smtpHost: parsed.smtpHost,
      smtpPort: parsed.smtpPort,
      smtpSecure: parsed.smtpSecure ?? parsed.smtpPort === 465,
      smtpUser: parsed.smtpUser,
      smtpPass,
      resendApiKey,
      webhookUrl: parsed.webhookUrl
    });

    await prisma.masterRecord.upsert({
      where: { scope_key: { scope: 'mail-config', key: 'default' } },
      update: { value: JSON.stringify(nextConfig) },
      create: { scope: 'mail-config', key: 'default', value: JSON.stringify(nextConfig) }
    });
    invalidateMailConfigCache();

    recordAuditLog({
      actor: req.user?.username || 'superadmin',
      action: 'MAIL_CONFIG_UPDATE',
      category: 'DATA_MUTATION',
      ip: resolveRequestIp(req),
      target: 'mail-config/default',
      details: `Konfigurasi email diperbarui (provider=${nextConfig.provider}, host=${nextConfig.smtpHost || '-'}).`,
      status: 'SUCCESS'
    });

    return res.json(serializePublicMailConfig(nextConfig));
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.issues[0]?.message || 'Konfigurasi email tidak valid.' });
    }
    console.error('Save mail config error:', error);
    return res.status(500).json({ error: 'Gagal menyimpan konfigurasi email.' });
  }
};

export const testMailConfigHandler = async (req: AuthRequest, res: Response) => {
  try {
    const body = req.body || {};
    const testTo = String(body.testTo || '').trim();
    if (testTo && !emailCheck.safeParse(testTo).success) {
      return res.status(400).json({ error: 'Alamat email tujuan tes tidak valid.' });
    }

    const existing = await getMailConfig();
    const draft = mailConfigSchema.partial().parse(body);
    const override: Partial<MailRuntimeConfig> = {
      ...(draft.provider !== undefined ? { provider: draft.provider } : {}),
      ...(draft.fromName !== undefined ? { fromName: draft.fromName } : {}),
      ...(draft.fromEmail !== undefined ? { fromEmail: draft.fromEmail } : {}),
      ...(draft.replyTo !== undefined ? { replyTo: draft.replyTo } : {}),
      ...(draft.appBaseUrl !== undefined ? { appBaseUrl: draft.appBaseUrl } : {}),
      ...(draft.smtpHost !== undefined ? { smtpHost: draft.smtpHost } : {}),
      ...(draft.smtpPort !== undefined ? { smtpPort: draft.smtpPort } : {}),
      ...(draft.smtpSecure !== undefined ? { smtpSecure: draft.smtpSecure } : {}),
      ...(draft.smtpUser !== undefined ? { smtpUser: draft.smtpUser } : {}),
      ...(draft.webhookUrl !== undefined ? { webhookUrl: draft.webhookUrl } : {}),
      smtpPass:
        draft.clearSmtpPass
          ? ''
          : draft.smtpPass && !isMasked(draft.smtpPass)
            ? draft.smtpPass
            : existing.smtpPass,
      resendApiKey:
        draft.clearResendApiKey
          ? ''
          : draft.resendApiKey && !isMasked(draft.resendApiKey)
            ? draft.resendApiKey
            : existing.resendApiKey
    };

    const result = await testMailConnection(override, testTo || undefined);
    return res.json(result);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.issues[0]?.message || 'Parameter uji email tidak valid.' });
    }
    console.error('Test mail config error:', error);
    return res.status(500).json({ error: 'Gagal menguji koneksi email.' });
  }
};
