import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import { config } from './config/env.js';
import { apiLimiter } from './middleware/rateLimiter.js';
import { errorHandler } from './middleware/errorHandler.js';

import healthRoutes from './routes/health.routes.js';
import dashboardRoutes from './routes/dashboard.routes.js';
import deviceRoutes from './routes/device.routes.js';
import storyRoutes from './routes/story.routes.js';
import campaignRoutes from './routes/campaign.routes.js';
import queueRoutes from './routes/queue.routes.js';
import logsRoutes from './routes/logs.routes.js';
import webhookRoutes from './routes/webhook.routes.js';

export function createApp() {
  const app = express();

  // Security headers & CORS
  app.use(helmet());
  app.use(cors({
    origin: config.corsOrigin === '*' ? true : [config.corsOrigin, 'http://localhost:5173', 'http://127.0.0.1:5173'],
    credentials: true,
    methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
  }));

  // Body parsing with safe size limit (2mb)
  app.use(express.json({ limit: '2mb' }));
  app.use(express.urlencoded({ extended: true, limit: '2mb' }));

  // Apply rate limiter to API routes
  app.use('/api', apiLimiter);

  // Mount routes
  app.use('/', healthRoutes);
  app.use('/api/dashboard', dashboardRoutes);
  app.use('/api/devices', deviceRoutes);
  app.use('/api/stories', storyRoutes);
  app.use('/api/campaigns', campaignRoutes);
  app.use('/api/queue', queueRoutes);
  app.use('/api/logs', logsRoutes);
  app.use('/api/webhook', webhookRoutes);

  // 404 handler
  app.use((req, res) => {
    res.status(404).json({
      success: false,
      error: {
        code: 'NOT_FOUND',
        message: `Route ${req.method} ${req.originalUrl} not found`
      }
    });
  });

  // Centralized error handler
  app.use(errorHandler);

  return app;
}
