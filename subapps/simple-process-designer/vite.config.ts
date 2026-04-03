import { defineConfig, loadEnv } from 'vite';
import path from 'node:path';
import vue from '@vitejs/plugin-vue';
import AutoImport from 'unplugin-auto-import/vite';

function buildManualChunks(id: string) {
  if (!id.includes('node_modules')) {
    return undefined;
  }

  const normalizedId = id.replace(/\\/g, '/');

  if (/\/node_modules\/(vue|@vue)\//.test(normalizedId)) {
    return 'vue-vendor';
  }

  if (/\/node_modules\/(element-plus|@element-plus)\//.test(normalizedId)) {
    return 'element-plus-vendor';
  }

  if (/\/node_modules\/lodash-es\//.test(normalizedId)) {
    return 'lodash-vendor';
  }

  return 'vendor';
}

export default defineConfig(({ mode }) => {
  const envRoot = path.resolve(__dirname, '../..');
  const rootEnv = loadEnv(mode, envRoot, '');
  const localEnv = loadEnv(mode, __dirname, '');
  const env = { ...rootEnv, ...localEnv };
  const apiBaseUrl = env.VITE_API_BASE_URL || 'http://127.0.0.1:8080';
  const aiProxyTarget = env.VITE_AI_PROXY_TARGET || 'http://127.0.0.1:3001';
  const publicBase = env.VITE_SIMPLE_PROCESS_DESIGNER_PUBLIC_BASE || '/simple-process-designer/';

  return {
    base: mode === 'production' ? publicBase : '/',
    envDir: envRoot,
    plugins: [
      vue(),
      AutoImport({
        dts: path.resolve(__dirname, 'src/auto-imports.d.ts'),
        imports: ['vue'],
        dirs: [
          path.resolve(__dirname, 'src/composables'),
        ],
        vueTemplate: true,
      }),
    ],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, 'src'),
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
      host: '0.0.0.0',
      port: 5174,
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
    },
    preview: {
      host: '0.0.0.0',
      port: 4174,
    },
  };
});
