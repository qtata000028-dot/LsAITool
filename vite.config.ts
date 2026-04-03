import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig, loadEnv } from 'vite';

function buildManualChunks(id: string) {
  if (!id.includes('node_modules')) {
    return undefined;
  }

  const normalizedId = id.replace(/\\/g, '/');

  if (
    /\/node_modules\/(react|react-dom|scheduler)\//.test(normalizedId)
  ) {
    return 'react-vendor';
  }

  if (/\/node_modules\/@dnd-kit\//.test(normalizedId)) {
    return 'dnd-vendor';
  }

  if (
    /\/node_modules\/(framer-motion|motion)\//.test(normalizedId) ||
    /\/node_modules\/@emotion\//.test(normalizedId)
  ) {
    return 'motion-vendor';
  }

  if (/\/node_modules\/lucide-react\//.test(normalizedId)) {
    return 'icon-vendor';
  }

  if (/\/node_modules\/(antd|@ant-design|rc-[^/]+)\//.test(normalizedId)) {
    return 'antd-vendor';
  }

  if (
    /\/node_modules\/(jszip|docx-preview|@xmldom|@onlyoffice)\//.test(normalizedId)
  ) {
    return 'doc-vendor';
  }

  return 'vendor';
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', '');
  const apiBaseUrl = env.VITE_API_BASE_URL || 'http://114.116.135.188:9093/';

  return {
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    build: {
      rollupOptions: {
        output: {
          manualChunks: buildManualChunks,
        },
      },
    },
    server: {
      proxy: {
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
