import '@testing-library/jest-dom';

// Vitest 4 copies a curated allowlist of window properties onto globalThis,
// and `localStorage` / `sessionStorage` are NOT on that list. Production code
// uses bare `localStorage`, so we expose it manually. jsdom's getter throws
// for `null` origins, so vitest.config.ts sets a real URL via
// environmentOptions.jsdom.url.
// vitest 4 + jsdom 29 quietly returns `undefined` for `window.localStorage`
// in some configurations (jsdom's getter swallows the SecurityError). To keep
// production code that uses bare `localStorage` testable, install a minimal
// in-memory Storage polyfill on both `window` and `globalThis` for tests.
function createMemoryStorage(): Storage {
  let store = new Map<string, string>();
  return {
    get length(): number {
      return store.size;
    },
    clear(): void {
      store = new Map();
    },
    getItem(key: string): string | null {
      return store.has(key) ? (store.get(key) as string) : null;
    },
    key(index: number): string | null {
      return Array.from(store.keys())[index] ?? null;
    },
    removeItem(key: string): void {
      store.delete(key);
    },
    setItem(key: string, value: string): void {
      store.set(key, String(value));
    }
  };
}

if (typeof window !== 'undefined') {
  if (typeof window.localStorage === 'undefined') {
    Object.defineProperty(window, 'localStorage', {
      value: createMemoryStorage(),
      writable: true,
      configurable: true
    });
  }
}

if (typeof (globalThis as { localStorage?: Storage }).localStorage === 'undefined') {
  Object.defineProperty(globalThis, 'localStorage', {
    value: window.localStorage ?? createMemoryStorage(),
    writable: true,
    configurable: true
  });
}
