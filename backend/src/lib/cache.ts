import Redis from 'ioredis';

// Connects to Redis if available; all operations silently no-op when unavailable.
// Swap for a managed Redis URL via REDIS_URL env var in production.

let client: Redis | null = null;

async function connect() {
  try {
    const url = process.env.REDIS_URL ?? 'redis://localhost:6379';
    const r = new Redis(url, { lazyConnect: true, enableOfflineQueue: false, connectTimeout: 2000 });
    await r.connect();
    r.on('error', () => { /* suppress after connect */ });
    client = r;
    console.log('✅ Redis connected');
  } catch {
    console.warn('⚠️  Redis unavailable — caching disabled (app works normally without it)');
    client = null;
  }
}

await connect();

export async function cacheGet(key: string): Promise<string | null> {
  if (!client) return null;
  try { return await client.get(key); } catch { return null; }
}

export async function cacheSet(key: string, value: string, ttlSeconds: number): Promise<void> {
  if (!client) return;
  try { await client.set(key, value, 'EX', ttlSeconds); } catch { /* no-op */ }
}

export async function cacheDel(...keys: string[]): Promise<void> {
  if (!client) return;
  try { await client.del(...keys); } catch { /* no-op */ }
}

// Pattern-delete: removes all keys matching a glob pattern (e.g. "conv:*")
export async function cacheDelPattern(pattern: string): Promise<void> {
  if (!client) return;
  try {
    const keys = await client.keys(pattern);
    if (keys.length > 0) await client.del(...keys);
  } catch { /* no-op */ }
}
