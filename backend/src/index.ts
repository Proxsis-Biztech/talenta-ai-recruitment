import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import { createServer } from 'http';
import apiRoutes from './routes';
import { startGdriveSyncJob } from './jobs/gdriveSync';
import { registerGeminiLiveGateway } from './geminiLiveGateway';
import { bootstrapDatabaseSeed } from './services/bootstrapSeedService';

dotenv.config();

// Auto-bootstrap master superadmin & default assessment programs
bootstrapDatabaseSeed();

// Start background jobs
startGdriveSyncJob();

const app = express();
const port = process.env.PORT || 5000;
const server = createServer(app);

registerGeminiLiveGateway(server);

// Security headers via Helmet
app.use(helmet({
  crossOriginResourcePolicy: false,
  crossOriginEmbedderPolicy: false,
  contentSecurityPolicy: true,
  // HSTS enabled by default — forces HTTPS in production
}));
// Override COOP header manually to allow non-https origins
app.use((_req, res, next) => {
  res.setHeader('Cross-Origin-Opener-Policy', 'unsafe-none');
  res.setHeader('Origin-Agent-Cluster', '?0');
  next();
});

// Trust proxy so req.protocol/host and X-Forwarded-For are correct behind Coolify/Traefik/Caddy.
app.set('trust proxy', 1);

// Serve static frontend files BEFORE CORS. Vite emits module scripts with `crossorigin`,
// so same-origin asset requests carry an Origin header; they must never hit the API CORS gate.
// NOTE: /uploads is NOT served statically — CV files are only accessible
// via the authenticated download endpoint (/admin/applicants/cv/:fileName)
const rootDir = process.cwd();
const frontendDist = path.join(rootDir, '../frontend/dist');

// 1. Hashed immutable Vite assets (/assets/*) -> Cache for 1 year
app.use(
  '/assets',
  express.static(path.join(frontendDist, 'assets'), {
    maxAge: '1y',
    immutable: true,
    fallthrough: false, // If an asset is missing, do NOT fall through to SPA HTML fallback!
  })
);

// Fallback for missing /assets/* chunks (returns clean 404 so browsers know it's missing rather than parsing HTML as JS)
app.use('/assets', (_req: express.Request, res: express.Response) => {
  res.status(404).setHeader('Cache-Control', 'no-cache, no-store, must-revalidate').send('Asset chunk not found');
});

// 2. Root static files (favicon, logos, manifest, etc.)
app.use(
  express.static(frontendDist, {
    maxAge: '1h',
    setHeaders: (res, filePath) => {
      // index.html must NEVER be cached by browser or reverse proxy
      if (filePath.endsWith('index.html')) {
        res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
        res.setHeader('Pragma', 'no-cache');
        res.setHeader('Expires', '0');
      }
    },
  })
);

// CORS — allow configured origins, wildcard, and same-origin API calls.
const corsOrigins = process.env.CORS_ORIGIN
  ? process.env.CORS_ORIGIN.split(',').map((o) => o.trim())
  : ['http://localhost:3000', 'http://localhost:3001', 'http://localhost:5173'];

const corsMiddleware = cors({
  origin: (origin, callback) => {
    if (!origin || corsOrigins.includes(origin) || corsOrigins.includes('*')) {
      callback(null, true);
    } else {
      callback(new Error(`Origin ${origin} not allowed by CORS`));
    }
  },
  credentials: true,
});

app.use((req, res, next) => {
  const origin = req.headers.origin;
  const selfOrigin = `${req.protocol}://${req.get('host')}`;
  if (!origin || origin === selfOrigin) return next();
  return corsMiddleware(req, res, next);
});

// Body parsing with size limits to prevent DoS
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ limit: '1mb', extended: true }));
app.use(compression());

// Ensure uploads directory exists
const uploadDir = path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Generous rate limiter specifically for API endpoints (prevents DoS without throttling active users/interviews)
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5000, // 5000 requests per 15 min per IP (accommodates high-frequency interview telemetry and office NATs)
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Terlalu banyak permintaan ke API, silakan coba lagi beberapa saat.' },
  skip: (req) => {
    // Never rate limit health checks or non-API calls
    return req.path === '/health' || !req.path.startsWith('/api');
  }
});

// API Routes with rate limiter applied ONLY to /api
app.use('/api', apiLimiter, apiRoutes);

// SPA fallback - serve index.html for non-API routes (WITHOUT rate limiting)
app.use((req: express.Request, res: express.Response, next: express.NextFunction) => {
  if (req.path.startsWith('/api')) {
    return next();
  }

  // Guard: if request is for a missing static file/asset (e.g. *.js, *.css, *.map, *.png), return 404, NEVER index.html!
  if (/\.(js|css|map|png|jpg|jpeg|gif|svg|ico|woff|woff2|ttf|eot)$/i.test(req.path)) {
    return res
      .status(404)
      .setHeader('Cache-Control', 'no-cache, no-store, must-revalidate')
      .send('File not found');
  }

  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  res.sendFile(path.join(frontendDist, 'index.html'));
});

// Error handler
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Terjadi kesalahan pada server' });
});

server.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});
