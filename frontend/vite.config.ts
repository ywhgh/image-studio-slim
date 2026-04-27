import { defineConfig, loadEnv } from 'vite'
import vue from '@vitejs/plugin-vue'
import checker from 'vite-plugin-checker'
import { resolve } from 'path'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const backendUrl = env.VITE_DEV_PROXY_TARGET || 'http://localhost:8090'
  const devPort = Number(env.VITE_DEV_PORT || 3000)

  return {
    plugins: [
      vue(),
      checker({
        typescript: true,
        vueTsc: true,
      }),
    ],
    resolve: {
      alias: {
        '@': resolve(__dirname, 'src'),
        'vue-i18n': 'vue-i18n/dist/vue-i18n.runtime.esm-bundler.js',
      },
    },
    define: {
      __INTLIFY_JIT_COMPILATION__: true,
    },
    build: {
      outDir: 'dist',
      emptyOutDir: true,
      rollupOptions: {
        output: {
          manualChunks(id: string) {
            if (id.includes('node_modules')) {
              if (
                id.includes('/vue/') ||
                id.includes('/vue-router/') ||
                id.includes('/pinia/') ||
                id.includes('/@vue/')
              ) {
                return 'vendor-vue'
              }
              if (id.includes('/@vueuse/')) return 'vendor-ui'
              if (id.includes('/vue-i18n/') || id.includes('/@intlify/')) return 'vendor-i18n'
              return 'vendor-misc'
            }
          },
        },
      },
    },
    server: {
      host: '0.0.0.0',
      port: devPort,
      proxy: {
        '/api': {
          target: backendUrl,
          changeOrigin: true,
        },
      },
    },
  }
})
