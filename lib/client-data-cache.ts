type CacheEntry<T> = {
  data?: T;
  expiresAt: number;
  request?: Promise<T>;
};

const cache = new Map<string, CacheEntry<unknown>>();

export function readClientData<T>(key: string) {
  const entry = cache.get(key) as CacheEntry<T> | undefined;
  if (!entry?.data) return null;

  return {
    data: entry.data,
    fresh: entry.expiresAt > Date.now(),
  };
}

export async function loadClientData<T>(
  key: string,
  load: () => Promise<T>,
  staleTime: number,
  force = false,
): Promise<T> {
  const entry = (cache.get(key) as CacheEntry<T> | undefined) ?? {
    expiresAt: 0,
  };

  if (!force && entry.data && entry.expiresAt > Date.now()) {
    return entry.data;
  }
  if (entry.request) return entry.request;

  const request = load()
    .then((data) => {
      cache.set(key, { data, expiresAt: Date.now() + staleTime });
      return data;
    })
    .finally(() => {
      const current = cache.get(key) as CacheEntry<T> | undefined;
      if (current?.request === request) {
        cache.set(key, {
          data: current.data,
          expiresAt: current.expiresAt,
        });
      }
    });

  cache.set(key, { ...entry, request });
  return request;
}

export function setClientData<T>(key: string, data: T, staleTime: number) {
  cache.set(key, { data, expiresAt: Date.now() + staleTime });
}

export function clearClientData() {
  cache.clear();
}
