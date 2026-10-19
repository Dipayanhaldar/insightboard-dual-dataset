import dotenv from 'dotenv';
import express from 'express';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

dotenv.config({ path: path.resolve(path.dirname(fileURLToPath(import.meta.url)), '.env') });

const app = express();
const PORT = Number(process.env.PORT) || 3001;
const JWT_SECRET = process.env.JWT_SECRET || '';
const TOKEN_LIFETIME = process.env.JWT_EXPIRES_IN || '8h';
const MAX_REPORTS = Math.min(100, Math.max(1, Number(process.env.MAX_REPORTS_PER_USER) || 20));
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const distDirectory = path.resolve(__dirname, '../dist');

app.disable('x-powered-by');
app.set('trust proxy', 1);
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      baseUri: ["'self'"],
      connectSrc: ["'self'", "https://generativelanguage.googleapis.com", "https://raw.githubusercontent.com"],
      fontSrc: ["'self'", "https:", "data:"],
      formAction: ["'self'"],
      frameAncestors: ["'self'"],
      imgSrc: ["'self'", "data:", "blob:", "https:"],
      mediaSrc: ["'self'", "data:"],
      objectSrc: ["'none'"],
      scriptSrc: ["'self'"],
      scriptSrcAttr: ["'none'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https:"]
    }
  }
}));
app.use(express.json({ limit: '64kb' }));
app.use('/api', rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 180,
  standardHeaders: 'draft-7',
  legacyHeaders: false
}));
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { error: 'Too many sign-in attempts. Wait 15 minutes and try again.' }
});

const userSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true, lowercase: true, trim: true, maxlength: 254 },
  passwordHash: { type: String, required: true, select: false }
}, { timestamps: true });
const reportSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, required: true, index: true },
  title: { type: String, required: true, maxlength: 140 },
  datasetName: { type: String, required: true, maxlength: 120 },
  recordCount: { type: Number, required: true, min: 0 },
  filters: { type: mongoose.Schema.Types.Mixed, default: {} },
  snapshot: { type: mongoose.Schema.Types.Mixed, required: true },
  summary: { type: String, default: '', maxlength: 6000 }
}, { timestamps: true, minimize: false });
reportSchema.index({ userId: 1, createdAt: -1 });
const User = mongoose.models.User || mongoose.model('User', userSchema);
const Report = mongoose.models.Report || mongoose.model('Report', reportSchema);

const asyncRoute = handler => (req, res, next) =>
  Promise.resolve(handler(req, res, next)).catch(next);

function databaseReady() {
  return mongoose.connection.readyState === 1;
}
function requireDatabase(req, res, next) {
  if (!databaseReady()) {
    return res.status(503).json({ error: 'The database is not connected yet. Please retry shortly.' });
  }
  next();
}
function safeText(value, maximum = 120) {
  return typeof value === 'string' ? value.trim().slice(0, maximum) : '';
}
function finiteNumber(value, fallback = 0) {
  const number = Number(value);
  return Number.isFinite(number) && number >= 0 ? number : fallback;
}
function safeObject(input, maxEntries = 15) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) return {};
  return Object.fromEntries(Object.entries(input).slice(0, maxEntries).map(([key, value]) => [
    safeText(key, 80),
    safeText(String(value ?? ''), 160)
  ]).filter(([key]) => key));
}
function safeArray(input, maxItems, mapper) {
  return Array.isArray(input) ? input.slice(0, maxItems).map(mapper) : [];
}
// Whitelist aggregate fields only. Imported record arrays are never accepted or stored.
function sanitizeSnapshot(input) {
  const data = input && typeof input === 'object' && !Array.isArray(input) ? input : {};
  return {
    datasetName: safeText(data.datasetName || 'Current dataset', 120),
    recordCount: finiteNumber(data.recordCount),
    sourceRecordCount: finiteNumber(data.sourceRecordCount),
    filters: safeObject(data.filters, 15),
    fields: safeArray(data.fields, 30, item => safeText(item, 80)).filter(Boolean),
    numericMetrics: safeArray(data.numericMetrics, 8, item => ({
      field: safeText(item?.field, 80),
      average: Number.isFinite(Number(item?.average)) ? Number(item.average) : 0,
      sum: Number.isFinite(Number(item?.sum)) ? Number(item.sum) : 0
    })).filter(item => item.field),
    topCategories: safeArray(data.topCategories, 8, item => ({
      category: safeText(item?.category, 80),
      average: Number.isFinite(Number(item?.average)) ? Number(item.average) : 0,
      count: finiteNumber(item?.count),
      total: Number.isFinite(Number(item?.total)) ? Number(item.total) : 0
    })).filter(item => item.category),
    timeTrend: safeArray(data.timeTrend, 12, item => ({
      period: safeText(item?.period, 40),
      value: Number.isFinite(Number(item?.value)) ? Number(item.value) : 0
    })).filter(item => item.period),
    completeness: safeArray(data.completeness, 12, item => ({
      field: safeText(item?.field, 80),
      filledPercent: Math.min(100, finiteNumber(item?.filledPercent))
    })).filter(item => item.field)
  };
}
function makeToken(user) {
  if (!JWT_SECRET || JWT_SECRET.length < 32) {
    throw new Error('JWT_SECRET is missing or too short. Configure a strong secret before using accounts.');
  }
  return jwt.sign({ sub: user._id.toString(), email: user.email }, JWT_SECRET, { expiresIn: TOKEN_LIFETIME });
}
function requireAuth(req, res, next) {
  const header = req.get('authorization') || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : '';
  if (!token) return res.status(401).json({ error: 'Sign in to access saved reports.' });
  if (!JWT_SECRET || JWT_SECRET.length < 32) {
    return res.status(503).json({ error: 'Account authentication is not configured on this server.' });
  }
  try {
    req.auth = jwt.verify(token, JWT_SECRET);
    next();
  } catch {
    return res.status(401).json({ error: 'Your session expired. Sign in again.' });
  }
}
function publicReport(report) {
  return {
    id: report._id.toString(),
    title: report.title,
    createdAt: report.createdAt,
    datasetName: report.datasetName,
    recordCount: report.recordCount,
    filters: report.filters || {},
    snapshot: report.snapshot || {},
    summary: report.summary || ''
  };
}

app.get('/api/health', (_req, res) => {
  const ready = databaseReady();
  res.status(200).json({
    status: ready ? 'ok' : 'degraded',
    database: ready,
    service: 'InsightBoard V2 API'
  });
});

app.post('/api/auth/register', authLimiter, requireDatabase, asyncRoute(async (req, res) => {
  const email = safeText(req.body?.email, 254).toLowerCase();
  const password = typeof req.body?.password === 'string' ? req.body.password : '';
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res.status(400).json({ error: 'Enter a valid email address.' });
  }
  if (password.length < 10 || password.length > 128) {
    return res.status(400).json({ error: 'Password must be 10–128 characters long.' });
  }
  const passwordHash = await bcrypt.hash(password, 12);
  let user;
  try {
    user = await User.create({ email, passwordHash });
  } catch (error) {
    if (error?.code === 11000) return res.status(409).json({ error: 'An account with this email already exists. Sign in instead.' });
    throw error;
  }
  return res.status(201).json({
    token: makeToken(user),
    user: { id: user._id.toString(), email: user.email }
  });
}));

app.post('/api/auth/login', authLimiter, requireDatabase, asyncRoute(async (req, res) => {
  const email = safeText(req.body?.email, 254).toLowerCase();
  const password = typeof req.body?.password === 'string' ? req.body.password : '';
  const user = await User.findOne({ email }).select('+passwordHash');
  if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
    return res.status(401).json({ error: 'Email or password is incorrect.' });
  }
  return res.json({
    token: makeToken(user),
    user: { id: user._id.toString(), email: user.email }
  });
}));

app.get('/api/auth/me', requireDatabase, requireAuth, asyncRoute(async (req, res) => {
  const user = await User.findById(req.auth.sub).select('_id email');
  if (!user) return res.status(401).json({ error: 'Account was not found. Sign in again.' });
  return res.json({ user: { id: user._id.toString(), email: user.email } });
}));

app.get('/api/reports', requireDatabase, requireAuth, asyncRoute(async (req, res) => {
  const reports = await Report.find({ userId: req.auth.sub })
    .sort({ createdAt: -1 })
    .limit(MAX_REPORTS)
    .lean();
  return res.json({ reports: reports.map(publicReport) });
}));

app.post('/api/reports', requireDatabase, requireAuth, asyncRoute(async (req, res) => {
  const snapshot = sanitizeSnapshot(req.body?.snapshot);
  const report = await Report.create({
    userId: req.auth.sub,
    title: safeText(req.body?.title, 140) || `${snapshot.datasetName} · ${new Date().toLocaleString()}`,
    datasetName: snapshot.datasetName,
    recordCount: snapshot.recordCount,
    filters: snapshot.filters,
    snapshot,
    summary: safeText(req.body?.summary, 6000)
  });
  const overflow = await Report.find({ userId: req.auth.sub })
    .sort({ createdAt: -1 }).select('_id').skip(MAX_REPORTS).lean();
  if (overflow.length) await Report.deleteMany({ _id: { $in: overflow.map(item => item._id) }, userId: req.auth.sub });
  return res.status(201).json({ report: publicReport(report) });
}));

app.delete('/api/reports/:id', requireDatabase, requireAuth, asyncRoute(async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) return res.status(400).json({ error: 'Invalid report identifier.' });
  const deleted = await Report.findOneAndDelete({ _id: req.params.id, userId: req.auth.sub });
  if (!deleted) return res.status(404).json({ error: 'Saved report was not found.' });
  return res.json({ deleted: true });
}));

app.delete('/api/reports', requireDatabase, requireAuth, asyncRoute(async (req, res) => {
  const result = await Report.deleteMany({ userId: req.auth.sub });
  return res.json({ deletedCount: result.deletedCount || 0 });
}));

app.use('/api', (_req, res) => res.status(404).json({ error: 'API route not found.' }));
app.use(express.static(distDirectory, { index: false, maxAge: process.env.NODE_ENV === 'production' ? '1h' : 0 }));
app.get('*', (req, res, next) => {
  if (req.method !== 'GET' || req.path.startsWith('/api/')) return next();
  res.sendFile(path.join(distDirectory, 'index.html'), error => {
    if (error) next(error);
  });
});
app.use((error, _req, res, _next) => {
  if (error instanceof SyntaxError && Object.prototype.hasOwnProperty.call(error, 'body')) {
    return res.status(400).json({ error: 'Request body must be valid JSON.' });
  }
  console.error('Request failed:', error?.message || error);
  return res.status(500).json({ error: 'Unexpected server error. Check the service logs.' });
});

if (process.env.MONGODB_URI) {
  mongoose.connect(process.env.MONGODB_URI, {
    dbName: process.env.MONGODB_DATABASE || 'insightboard_v2',
    serverSelectionTimeoutMS: 15000
  }).then(() => console.log('MongoDB connected.'))
    .catch(error => console.error('MongoDB connection failed:', error.message));
} else {
  console.warn('MONGODB_URI is not set; API account/report routes will remain unavailable.');
}
if (!JWT_SECRET || JWT_SECRET.length < 32) {
  console.warn('JWT_SECRET is missing or shorter than 32 characters; account endpoints will be unavailable.');
}
app.listen(PORT, '0.0.0.0', () => console.log(`InsightBoard V2 server listening on port ${PORT}`));
