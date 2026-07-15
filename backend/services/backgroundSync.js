function parseBooleanEnv(value, defaultValue) {
  if (value === undefined) return defaultValue;
  return String(value).toLowerCase() === 'true';
}

function parseIntervalMs(value, fallbackMs) {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallbackMs;
}

function startBackgroundSync({ aggregateAllNews, getNewsCount, cleanupOldArticles, logger = console }) {
  const cleanupDelayMs = parseIntervalMs(process.env.CLEANUP_DELAY_MS, 30_000);
  const cleanupIntervalMs = parseIntervalMs(process.env.CLEANUP_INTERVAL_MS, 24 * 60 * 60 * 1000);
  const periodicSyncEnabled = parseBooleanEnv(process.env.AUTO_SYNC_ENABLED, true);
  const initialSyncEnabled = parseBooleanEnv(process.env.INITIAL_SYNC_ENABLED, false);
  const syncIntervalMs = parseIntervalMs(process.env.AUTO_SYNC_INTERVAL_MS, 6 * 60 * 60 * 1000);
  const minNewsForInitialSync = parseIntervalMs(process.env.INITIAL_SYNC_MIN_NEWS_COUNT, 10);

  const cleanupTimer = setTimeout(() => cleanupOldArticles(), cleanupDelayMs);
  cleanupTimer.unref?.();

  const recurringCleanupTimer = setInterval(() => cleanupOldArticles(), cleanupIntervalMs);
  recurringCleanupTimer.unref?.();

  if (initialSyncEnabled) {
    const initialTimer = setTimeout(async () => {
      try {
        const count = await getNewsCount();
        logger.log(`[Startup] Current news count: ${count}`);
        if (count < minNewsForInitialSync) {
          logger.log('[Startup] Triggering configured initial sync...');
          await aggregateAllNews();
        }
      } catch (error) {
        logger.error('[Startup] Initial sync failed:', error.message);
      }
    }, 10_000);
    initialTimer.unref?.();
  }

  if (periodicSyncEnabled) {
    const syncTimer = setInterval(async () => {
      logger.log('[Scheduled] Running periodic sync...');
      try {
        await aggregateAllNews();
      } catch (error) {
        logger.error('[Scheduled] Sync failed:', error.message);
      }
    }, syncIntervalMs);
    syncTimer.unref?.();
  }
}

module.exports = { startBackgroundSync };
