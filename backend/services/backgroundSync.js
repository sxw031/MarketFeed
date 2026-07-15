function parseBooleanEnv(value, defaultValue) {
  if (value === undefined) return defaultValue;
  return String(value).toLowerCase() === 'true';
}

function parseIntervalMs(value, fallbackMs) {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallbackMs;
}

function startBackgroundSync({ aggregateAllNews, getNewsCount, cleanupOldArticles, sendDigestEmails, getNews, logger = console }) {
  const cleanupDelayMs = parseIntervalMs(process.env.CLEANUP_DELAY_MS, 30_000);
  const cleanupIntervalMs = parseIntervalMs(process.env.CLEANUP_INTERVAL_MS, 24 * 60 * 60 * 1000);
  const periodicSyncEnabled = parseBooleanEnv(process.env.AUTO_SYNC_ENABLED, true);
  const initialSyncEnabled = parseBooleanEnv(process.env.INITIAL_SYNC_ENABLED, false);
  const syncIntervalMs = parseIntervalMs(process.env.AUTO_SYNC_INTERVAL_MS, 6 * 60 * 60 * 1000);
  const minNewsForInitialSync = parseIntervalMs(process.env.INITIAL_SYNC_MIN_NEWS_COUNT, 10);
  const digestEnabled = parseBooleanEnv(process.env.AUTO_DIGEST_ENABLED, true);
  const digestCheckIntervalMs = parseIntervalMs(process.env.DIGEST_CHECK_INTERVAL_MS, 60 * 60 * 1000);

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

  if (digestEnabled && sendDigestEmails) {
    const digestTimer = setInterval(async () => {
      for (const frequency of ['daily', 'weekly', 'monthly']) {
        try {
          const result = await sendDigestEmails(frequency, { getNews });
          if (result.sent > 0 || result.failed > 0) {
            logger.log(`[Digest] ${frequency}: sent=${result.sent} failed=${result.failed} skipped=${result.skipped}`);
          }
        } catch (error) {
          logger.error(`[Digest] ${frequency} run failed:`, error.message);
        }
      }
    }, digestCheckIntervalMs);
    digestTimer.unref?.();
  }
}

module.exports = { startBackgroundSync };
