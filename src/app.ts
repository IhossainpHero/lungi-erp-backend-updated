// src/app.ts
import express, { Application } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';

import authRoutes from '@routes/auth.routes';
import partyRoutes from '@routes/party.routes';
import collectionRoutes from '@routes/collection.routes';
import paymentRoutes from '@routes/payment.routes';
import damageRoutes from '@routes/damage.routes';
import serviceRoutes from '@routes/service.routes';
import { errorHandler, notFound } from '@middleware/error.middleware';

const app: Application = express();

// ── Security & Logging ───────────────────────────────────────────
app.use(helmet());
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true,
}));
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));

// ── Body Parsing ─────────────────────────────────────────────────
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ── Health Check ─────────────────────────────────────────────────
app.get('/api/health', (_req, res) => {
  res.json({ success: true, message: 'Lungi ERP API is running 🟢' });
});

// ── Routes ───────────────────────────────────────────────────────
app.use('/api/auth', authRoutes);
app.use('/api/parties', partyRoutes);
app.use('/api/collections', collectionRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/damage', damageRoutes);
app.use('/api/services', serviceRoutes);

// ── Error Handlers ───────────────────────────────────────────────
app.use(notFound);
app.use(errorHandler);

export default app;
