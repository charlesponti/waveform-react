import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Library build: ESM only, React stays the app's own copy.
export default defineConfig({
  plugins: [react()],
  build: {
    lib: { entry: 'src/index.ts', formats: ['es'], fileName: () => 'index.js', cssFileName: 'react-voice-orb' },
    rollupOptions: { external: ['react', 'react-dom', 'react/jsx-runtime'] },
    sourcemap: true,
  },
});
