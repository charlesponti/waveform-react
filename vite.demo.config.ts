import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// The demo app: the same explainer page, served by Vite and deployable to any static host.
export default defineConfig({ plugins: [react()], root: 'demo', base: './', build: { outDir: '../demo-dist', emptyOutDir: true } });
