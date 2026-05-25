import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    // The hybrid solver runs 12 SA passes per generateSeatingProposals call
    // (Slice 6 keeps the full restart pool for dedup). Two back-to-back
    // calls on the SMALL fixture flirt with the default 5s budget — bump
    // the per-test timeout to 15s.
    testTimeout: 15000,
    environmentOptions: {
      jsdom: {
        // localStorage throws on `null` opaque origins (about:blank).
        // Use a real URL so jsdom 29 exposes localStorage.
        url: 'http://localhost:5173/'
      }
    },
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      include: ['src/utils/**', 'src/components/**'],
      exclude: [
        'src/utils/mockData.ts',
        '**/*.test.ts',
        '**/*.test.tsx'
      ]
    }
  }
});
