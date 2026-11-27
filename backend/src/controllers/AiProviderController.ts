import { Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { type AuthRequest } from '../middleware/auth';
import { invalidateAiConfigCache } from '../services/aiConfigService';

const prisma = new PrismaClient();

const DEFAULT_MODELS = [
  'gemini-2.5-flash',
  'gemini-2.5-flash-native-audio-latest',
  'gemini-flash-latest',
  'gemini-3.5-flash-lite',
  'gemini-flash-lite-latest'
];

const maskKey = (key: string): string => {
  const value = String(key || '').trim();
  if (!value) return '';
  if (value.length <= 8) return '••••••••';
  return `${value.slice(0, 4)}••••${value.slice(-4)}`;
};

const isMasked = (value: unknown): boolean => String(value || '').includes('••');

const readConfig = async (): Promise<Record<string, any>> => {
  const record = await prisma.masterRecord.findUnique({
    where: { scope_key: { scope: 'ai-config', key: 'default' } }
  });
  if (!record?.value) return {};
  try {
    const parsed = JSON.parse(record.value);
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {};
  } catch {
    return {};
  }
};

const normalizeProviders = (config: Record<string, any>) => {
  const raw = Array.isArray(config.aiProviders) ? config.aiProviders : [];
  const providers = raw
    .filter((item: any) => item && typeof item === 'object')
    .map((item: any) => ({
      id: String(item.id || '').trim(),
      name: String(item.name || '').trim(),
      baseUrl: String(item.baseUrl || '').trim(),
      apiKey: String(item.apiKey || '').trim(),
      models: Array.isArray(item.models)
        ? item.models.map((model: unknown) => String(model).trim()).filter(Boolean)
        : [],
      builtin: Boolean(item.builtin)
    }))
    .filter((item: any) => item.id && item.name);

  const gemini = providers.find((item: any) => item.builtin || item.id === 'gemini');
  if (!gemini) {
    providers.unshift({
      id: 'gemini',
      name: 'Google Gemini (Default)',
      baseUrl: '',
      apiKey: '',
      models: DEFAULT_MODELS,
      builtin: true
    });
  } else if (gemini.models.length === 0) {
    gemini.models = DEFAULT_MODELS;
  }
  return providers;
};

const toPublicProvider = (provider: any) => {
  const envKey = process.env.GEMINI_API_KEY || '';
  const key = provider.builtin ? envKey : provider.apiKey;
  return {
    id: provider.id,
    name: provider.name,
    baseUrl: provider.baseUrl,
    models: provider.models,
    builtin: provider.builtin,
    hasApiKey: Boolean(key),
    apiKeyMasked: maskKey(key)
  };
};

export const listAiProviders = async (_req: AuthRequest, res: Response) => {
  try {
    const config = await readConfig();
    const providers = normalizeProviders(config);
    return res.json({ data: providers.map(toPublicProvider) });
  } catch (error) {
    console.error('List AI providers error:', error);
    return res.status(500).json({ error: 'Gagal memuat daftar AI provider.' });
  }
};

export const saveAiProviders = async (req: AuthRequest, res: Response) => {
  try {
    const incoming = Array.isArray(req.body.providers) ? req.body.providers : null;
    if (!incoming) {
      return res.status(400).json({ error: 'Daftar provider wajib dikirim.' });
    }

    const config = await readConfig();
    const existing = normalizeProviders(config);
    const existingById = new Map(existing.map((item: any) => [item.id, item]));

    const providers = incoming.map((item: any) => {
      const id = String(item?.id || '').trim();
      const previous: any = existingById.get(id);
      const builtin = Boolean(item?.builtin || id === 'gemini');
      let apiKey = String(item?.apiKey || '').trim();
      if (isMasked(apiKey) || !apiKey) {
        apiKey = previous?.apiKey || '';
      }
      return {
        id,
        name: String(item?.name || previous?.name || id).trim(),
        baseUrl: builtin ? '' : String(item?.baseUrl || '').trim(),
        apiKey: builtin ? '' : apiKey,
        models: Array.isArray(item?.models)
          ? item.models.map((model: unknown) => String(model).trim()).filter(Boolean)
          : previous?.models || [],
        builtin
      };
    }).filter((item: any) => item.id && item.name);

    if (!providers.some((item: any) => item.builtin || item.id === 'gemini')) {
      const fallback = existing.find((item: any) => item.builtin || item.id === 'gemini');
      providers.unshift(fallback || {
        id: 'gemini',
        name: 'Google Gemini (Default)',
        baseUrl: '',
        apiKey: '',
        models: DEFAULT_MODELS,
        builtin: true
      });
    }

    const nextConfig = { ...config, aiProviders: providers };
    await prisma.masterRecord.upsert({
      where: { scope_key: { scope: 'ai-config', key: 'default' } },
      update: { value: JSON.stringify(nextConfig) },
      create: { scope: 'ai-config', key: 'default', value: JSON.stringify(nextConfig) }
    });
    invalidateAiConfigCache();

    return res.json({ data: providers.map(toPublicProvider) });
  } catch (error) {
    console.error('Save AI providers error:', error);
    return res.status(500).json({ error: 'Gagal menyimpan AI provider.' });
  }
};

const buildModelsEndpoint = (baseUrl: string): string => {
  const clean = baseUrl.replace(/\/+$/, '');
  if (/\/models$/i.test(clean)) return clean;
  if (/\/chat\/completions$/i.test(clean)) return clean.replace(/\/chat\/completions$/i, '/models');
  return `${clean}/models`;
};

const extractModels = (payload: unknown): string[] => {
  const json = payload as Record<string, unknown> | null;
  const list = Array.isArray(json?.data)
    ? (json?.data as unknown[])
    : Array.isArray(json?.models)
      ? (json?.models as unknown[])
      : [];
  return Array.from(
    new Set(
      list
        .map((item) =>
          typeof item === 'string'
            ? item
            : String((item as Record<string, unknown>)?.id ?? (item as Record<string, unknown>)?.name ?? '')
        )
        .map((item) => item.trim())
        .filter(Boolean)
    )
  );
};

export const testAiProvider = async (req: AuthRequest, res: Response) => {
  try {
    const providerId = String(req.body.providerId || '').trim();
    const config = await readConfig();
    const providers = normalizeProviders(config);
    const provider = providers.find((item: any) => item.id === providerId);

    if (provider?.builtin) {
      const hasKey = Boolean(process.env.GEMINI_API_KEY);
      return res.json({
        reachable: hasKey,
        models: provider.models,
        message: hasKey
          ? 'Provider Gemini aktif menggunakan API key environment (hardcoded).'
          : 'GEMINI_API_KEY belum tersedia di environment.'
      });
    }

    const baseUrl = String(req.body.baseUrl || provider?.baseUrl || '').trim();
    let apiKey = String(req.body.apiKey || '').trim();
    if (isMasked(apiKey) || !apiKey) apiKey = provider?.apiKey || '';
    if (!baseUrl) {
      return res.status(400).json({ error: 'Base URL provider wajib diisi.' });
    }
    if (!apiKey) {
      return res.status(400).json({ error: 'API key provider wajib diisi.' });
    }

    const endpoint = buildModelsEndpoint(baseUrl);
    const response = await fetch(endpoint, {
      headers: { Authorization: `Bearer ${apiKey}` },
      signal: AbortSignal.timeout(10000)
    });

    if (!response.ok) {
      const detail = await response.text().catch(() => '');
      return res.json({
        reachable: false,
        models: [],
        message: `Provider menolak koneksi (HTTP ${response.status}). ${detail.slice(0, 160)}`.trim()
      });
    }

    const payload = await response.json().catch(() => null);
    const models = extractModels(payload);
    return res.json({
      reachable: true,
      models,
      message: models.length > 0
        ? `Koneksi berhasil, ${models.length} model ditemukan.`
        : 'Koneksi berhasil, tetapi daftar model tidak terbaca dari endpoint /models.'
    });
  } catch (error) {
    return res.json({
      reachable: false,
      message: error instanceof Error ? error.message : 'Provider tidak dapat dihubungi.'
    });
  }
};
