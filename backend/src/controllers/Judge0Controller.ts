import { Response } from 'express';
import { type AuthRequest } from '../middleware/auth';

const LANGUAGE_IDS: Record<string, number> = {
  javascript: 63,
  typescript: 74,
  python: 71,
  java: 62,
  cpp: 54,
  c: 50,
  go: 60,
  csharp: 51,
  php: 68,
  ruby: 72,
  kotlin: 78,
  swift: 83
};

const judge0BaseUrl = (): string | null => {
  const raw = process.env.JUDGE0_URL || process.env.JUDGE0_BASE_URL;
  return raw ? raw.replace(/\/$/, '') : null;
};

export const judge0Status = (_req: AuthRequest, res: Response) => {
  return res.json({
    configured: Boolean(judge0BaseUrl()),
    languages: Object.keys(LANGUAGE_IDS)
  });
};

export const executeJudge0 = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.portalUser) return res.status(401).json({ error: 'Sesi tidak valid.' });
    const baseUrl = judge0BaseUrl();
    if (!baseUrl) {
      return res.status(503).json({
        configured: false,
        error: 'Judge0 belum dikonfigurasi. Set JUDGE0_URL (dan JUDGE0_KEY bila memakai RapidAPI).'
      });
    }

    const language = String(req.body.language || 'javascript').toLowerCase();
    const languageId = LANGUAGE_IDS[language];
    if (!languageId) {
      return res.status(400).json({ error: `Bahasa "${language}" belum didukung.` });
    }

    const sourceCode = String(req.body.sourceCode || req.body.source_code || '');
    if (!sourceCode.trim()) return res.status(400).json({ error: 'Kode sumber kosong.' });
    if (sourceCode.length > 100_000) return res.status(413).json({ error: 'Kode sumber terlalu panjang.' });

    const testCases: Array<{ stdin?: string; expectedOutput?: string }> = Array.isArray(req.body.testCases)
      ? req.body.testCases.slice(0, 15)
      : [];

    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (process.env.JUDGE0_KEY) headers['X-RapidAPI-Key'] = process.env.JUDGE0_KEY;
    if (process.env.JUDGE0_HOST) headers['X-RapidAPI-Host'] = process.env.JUDGE0_HOST;

    const submit = async (stdin: string, expectedOutput?: string) => {
      const response = await fetch(`${baseUrl}/submissions?base64_encoded=false&wait=true`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          language_id: languageId,
          source_code: sourceCode,
          stdin: stdin || '',
          expected_output: expectedOutput || undefined,
          cpu_time_limit: Number(process.env.JUDGE0_CPU_LIMIT || 5),
          wall_time_limit: Number(process.env.JUDGE0_WALL_LIMIT || 10),
          memory_limit: Number(process.env.JUDGE0_MEMORY_LIMIT || 128000)
        })
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(payload?.message || payload?.error || `Judge0 HTTP ${response.status}`);
      }
      return payload as {
        stdout?: string;
        stderr?: string;
        compile_output?: string;
        message?: string;
        time?: string;
        memory?: number;
        status?: { id: number; description: string };
        token?: string;
      };
    };

    if (testCases.length === 0) {
      const result = await submit(String(req.body.stdin || ''), req.body.expectedOutput);
      return res.json({
        configured: true,
        results: [
          {
            passed: result.status?.id === 3,
            status: result.status?.description || 'Unknown',
            stdout: result.stdout || '',
            stderr: result.stderr || '',
            compileOutput: result.compile_output || '',
            time: result.time || null,
            memory: result.memory || null
          }
        ]
      });
    }

    const results = [];
    for (const testCase of testCases) {
      try {
        const result = await submit(String(testCase.stdin || ''), testCase.expectedOutput);
        const stdout = (result.stdout || '').trim();
        const expected = (testCase.expectedOutput || '').trim();
        results.push({
          passed: expected ? stdout === expected && result.status?.id === 3 : result.status?.id === 3,
          status: result.status?.description || 'Unknown',
          stdout: result.stdout || '',
          stderr: result.stderr || '',
          compileOutput: result.compile_output || '',
          time: result.time || null,
          memory: result.memory || null
        });
      } catch (error: any) {
        results.push({
          passed: false,
          status: 'Execution Error',
          stdout: '',
          stderr: error?.message || 'Gagal mengeksekusi test case',
          compileOutput: '',
          time: null,
          memory: null
        });
      }
    }

    const passedCount = results.filter((item) => item.passed).length;
    return res.json({
      configured: true,
      passedCount,
      totalCount: results.length,
      results
    });
  } catch (error: any) {
    console.error('Judge0 execute error:', error);
    return res.status(502).json({ error: error?.message || 'Gagal mengeksekusi kode di Judge0.' });
  }
};