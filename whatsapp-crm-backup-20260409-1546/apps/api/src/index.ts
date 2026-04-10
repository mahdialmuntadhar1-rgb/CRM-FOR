// =====================================================
// WhatsApp CRM API Server
// Express backend for bulk WhatsApp messaging
// =====================================================

import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';

import { logSupabaseConfig } from './lib/supabase-admin.js';
import contactsRouter from './routes/contacts.js';
import campaignsRouter from './routes/campaigns.js';
import templatesRouter from './routes/templates.js';
import messagesRouter from './routes/messages.js';
import inboxRouter from './routes/inbox.js';
import webhookRouter from './routes/webhook.js';
import analyticsRouter from './routes/analytics.js';

const app = express();
const PORT = process.env.API_PORT || 3001;

// =====================================================
// Security Middleware
// =====================================================
app.use(helmet());
app.use(cors({
  origin: process.env.NODE_ENV === 'production' 
    ? ['https://your-vercel-app.vercel.app'] 
    : ['http://localhost:5173'],
  credentials: true
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: { error: 'Too many requests, please try again later.' }
});
app.use(limiter);

// Stricter rate limit for sending
const sendLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 10,
  message: { error: 'Sending rate limit exceeded. Please slow down.' }
});

// =====================================================
// Body Parsing
// =====================================================
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// =====================================================
// Request Logging (safe - no secrets)
// =====================================================
app.use((req, res, next) => {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] ${req.method} ${req.path}`);
  next();
});

// =====================================================
// Health Check
// =====================================================
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  });
});

// =====================================================
// Routes
// =====================================================
app.use('/api/contacts', contactsRouter);
app.use('/api/campaigns', campaignsRouter);
app.use('/api/templates', templatesRouter);
app.use('/api/messages', sendLimiter, messagesRouter);
app.use('/api/inbox', inboxRouter);
app.use('/api/analytics', analyticsRouter);
app.use('/webhook', webhookRouter); // Webhooks often need specific paths

// =====================================================
// Error Handling
// =====================================================
app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('API Error:', err.message);
  
  // Never leak stack traces in production
  const isDev = process.env.NODE_ENV === 'development';
  
  res.status(500).json({
    error: 'Internal server error',
    message: isDev ? err.message : undefined
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Not found' });
});

// =====================================================
// Server Start
// =====================================================
app.listen(PORT, () => {
  console.log(`
╔════════════════════════════════════════════════════════╗
║        WhatsApp CRM API Server                        ║
╠════════════════════════════════════════════════════════╣
║  Port:        ${PORT}                                   ║
║  Environment: ${process.env.NODE_ENV || 'development'}  ║
╚════════════════════════════════════════════════════════╝
  `);
  
  // Log Supabase config (masked)
  logSupabaseConfig();
});

export default app;
