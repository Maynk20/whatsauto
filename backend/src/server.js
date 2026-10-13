import { createApp } from './app.js';
import { config } from './config/env.js';
import { logger } from './utils/logger.js';
import { startWorkers } from './workers/index.js';

const app = createApp();

const server = app.listen(config.port, () => {
  logger.info(`🚀 WhatsAuto Backend API listening on http://localhost:${config.port}`);
  logger.info(`Environment: ${config.nodeEnv} | Provider: ${config.whatsapp.provider}`);
});

// Start workers concurrently in server process
const workerManager = startWorkers();

// Graceful shutdown handling
function gracefulShutdown(signal) {
  logger.info(`Received ${signal}. Shutting down HTTP server and workers gracefully...`);
  workerManager.shutdown();
  server.close(() => {
    logger.info('HTTP server closed cleanly.');
    process.exit(0);
  });

  // Force exit after 10s if not cleanly exited
  setTimeout(() => {
    logger.error('Forced shutdown after timeout.');
    process.exit(1);
  }, 10000);
}

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));
