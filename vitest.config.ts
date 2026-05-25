import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
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
