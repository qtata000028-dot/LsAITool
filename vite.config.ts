import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig, loadEnv } from 'vite';

function buildManualChunks(id: string) {
  if (!id.includes('node_modules')) {
    return undefined;
  }

  const normalizedId = id.replace(/\\/g, '/');
  const isReactRuntimeModule =
    /\/node_modules\/react\//.test(normalizedId) ||
    /\/node_modules\/react-dom\//.test(normalizedId) ||
    /\/node_modules\/scheduler\//.test(normalizedId);

  if (isReactRuntimeModule) {
    return 'react-vendor';
  }

  if (id.includes('@dnd-kit')) {
    return 'dnd-vendor';
  }

  if (id.includes('framer-motion') || id.includes('motion')) {
    return 'motion-vendor';
  }

  if (id.includes('lucide-react')) {
    return 'icon-vendor';
  }

  return 'vendor';
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', '');
  const devApiProxyTarget = env.VITE_DEV_API_PROXY_TARGET || 'http://127.0.0.1:3001';

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
          target: devApiProxyTarget,
        },
      },
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modify: file watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
    },
  };
});
