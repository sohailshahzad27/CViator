// backend/utils/cache.js
// Minimal in-process TTL cache for read-heavy, rarely-changing query
// results (faculties/departments have no write endpoint — they're seeded
// once). Not shared across instances, which is fine at this app's scale;
// swap for Redis if the backend is ever horizontally scaled.

const store = new Map();

function get(key) {
  const hit = store.get(key);
  if (!hit) return undefined;
  if (Date.now() > hit.expiresAt) {
    store.delete(key);
    return undefined;
  }
  return hit.value;
}

function set(key, value, ttlMs) {
  store.set(key, { value, expiresAt: Date.now() + ttlMs });
}

async function wrap(key, ttlMs, fn) {
  const cached = get(key);
  if (cached !== undefined) return cached;
  const value = await fn();
  set(key, value, ttlMs);
  return value;
}

module.exports = { get, set, wrap };
