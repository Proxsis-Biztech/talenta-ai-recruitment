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

// CORS — support multiple origins or fallback to localhost 3000, 3001, and 5173
const corsOrigins = process.env.CORS_ORIGIN
  ? process.env.CORS_ORIGIN.split(',').map((o) => o.trim())
  : ['http://localhost:3000', 'http://localhost:3001', 'http://localhost:5173'];

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || corsOrigins.includes(origin) || corsOrigins.includes('*')) {
      callback(null, true);
    } else {
      callback(new Error(`Origin ${origin} not allowed by CORS`));
    }
  },
  credentials: true,
}));

// Body parsing with size limits to prevent DoS
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ limit: '1mb', extended: true }));
app.use(compression());

// Trust proxy so X-Forwarded-For is used correctly by rate limiter
app.set('trust proxy', 1);

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Terlalu banyak permintaan, silakan coba lagi nanti.' }
});

app.use(limiter);

// Ensure uploads directory exists
const uploadDir = path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Serve static frontend files
// NOTE: /uploads is NOT served statically — CV files are only accessible
// via the authenticated download endpoint (/admin/applicants/cv/:fileName)
const rootDir = process.cwd();
app.use(express.static(path.join(rootDir, '../frontend/dist')));

// Routes
app.use('/api', apiRoutes);

// SPA fallback - serve index.html for non-API routes
app.use((req: express.Request, res: express.Response, next: express.NextFunction) => {
  if (!req.path.startsWith('/api')) {
    res.sendFile(path.join(rootDir, '../frontend/dist/index.html'));
  } else {
    next();
  }
});

// Error handler
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Terjadi kesalahan pada server' });
});

server.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});
