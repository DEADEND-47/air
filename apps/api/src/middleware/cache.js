const store = new Map();

export function clearCache() {
  store.clear();
}

export function cacheGet(ttlMs = 60_000) {
  return (req, res, next) => {
    const key = req.originalUrl;
    const hit = store.get(key);
    if (hit && hit.expiresAt > Date.now()) {
      res.set('X-Cache', 'HIT');
      return res.json(hit.body);
    }
    const json = res.json.bind(res);
    res.json = (body) => {
      if (res.statusCode >= 200 && res.statusCode < 300) {
        store.set(key, { body, expiresAt: Date.now() + ttlMs });
      }
      res.set('X-Cache', 'MISS');
      return json(body);
    };
    return next();
  };
}
