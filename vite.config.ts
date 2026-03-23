import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig, loadEnv } from 'vite';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', '');
  const apiBaseUrl = env.VITE_API_BASE_URL || 'http://127.0.0.1:8080';
  const aiProxyTarget = env.VITE_AI_PROXY_TARGET || 'http://127.0.0.1:3001';

  return {
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      proxy: {
        '/api/ai': {
          changeOrigin: true,
          secure: false,
          target: aiProxyTarget,
        },
        '/api': {
          changeOrigin: true,
          secure: false,
          target: apiBaseUrl,
        },
      },
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modify: file watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
    },
  };
});
