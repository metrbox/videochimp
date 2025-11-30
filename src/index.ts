import app from './app';
import config from './config';
import logger from './utils/logger';
import { videoQueue } from './services/queue';

const server = app.listen(config.port, () => {
  logger.info(`Server started on port ${config.port}`, {
    environment: config.nodeEnv,
    ttsProvider: config.tts.defaultProvider,
  });
});

// Graceful shutdown
const shutdown = async () => {
  logger.info('Shutting down gracefully...');

  server.close(() => {
    logger.info('HTTP server closed');
  });

  try {
    await videoQueue.close();
    logger.info('Queue closed');
  } catch (error) {
    logger.error('Error closing queue', { error });
  }

  process.exit(0);
};

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);

// Handle uncaught errors
process.on('uncaughtException', (error) => {
  logger.error('Uncaught exception', { error: error.message, stack: error.stack });
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled rejection', { reason, promise });
  process.exit(1);
});
