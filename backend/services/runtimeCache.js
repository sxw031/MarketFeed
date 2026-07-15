class RuntimeCache {
  constructor({ maxEntries = 100, defaultTtlMs = 5 * 60 * 1000 } = {}) {
    this.maxEntries = maxEntries;
    this.defaultTtlMs = defaultTtlMs;
    this.store = new Map();
  }

  get(key) {
    const entry = this.store.get(key);
    if (!entry) return null;
    if (entry.expiresAt <= Date.now()) {
      this.store.delete(key);
      return null;
    }
    entry.lastAccessedAt = Date.now();
    return entry.value;
  }

  set(key, value, ttlMs = this.defaultTtlMs) {
    this.store.set(key, {
      value,
      expiresAt: Date.now() + ttlMs,
      lastAccessedAt: Date.now()
    });
    this.evictOverflow();
    return value;
  }

  delete(key) {
    this.store.delete(key);
  }

  clear() {
    this.store.clear();
  }

  pruneExpired() {
    const now = Date.now();
    for (const [key, entry] of this.store.entries()) {
      if (entry.expiresAt <= now) this.store.delete(key);
    }
  }

  evictOverflow() {
    this.pruneExpired();
    while (this.store.size > this.maxEntries) {
      let oldestKey = null;
      let oldestAccess = Infinity;
      for (const [key, entry] of this.store.entries()) {
        if (entry.lastAccessedAt < oldestAccess) {
          oldestAccess = entry.lastAccessedAt;
          oldestKey = key;
        }
      }
      if (!oldestKey) break;
      this.store.delete(oldestKey);
    }
  }
}

module.exports = { RuntimeCache };
