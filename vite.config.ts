import { readFileSync } from 'node:fs'
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

const pkg = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8')) as { version: string }
const paper = '#fbf6ec'

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      // registered by hand in main.tsx, and only on the web (the native apps ship their files)
      injectRegister: false,
      registerType: 'autoUpdate',
      manifest: {
        name: 'WearWell',
        short_name: 'WearWell',
        description: 'Wear what you love, see your cost per wear, and resell what you no longer use. By Polska Picks.',
        lang: 'en',
        start_url: '/',
        scope: '/',
        display: 'standalone',
        orientation: 'portrait',
        theme_color: paper,
        background_color: paper,
        categories: ['lifestyle', 'shopping'],
        icons: [
          { src: 'pwa-64x64.png', sizes: '64x64', type: 'image/png' },
          { src: 'pwa-192x192.png', sizes: '192x192', type: 'image/png' },
          { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png' },
          { src: 'maskable-icon-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
        shortcuts: [
          { name: 'Log today', short_name: 'Today', url: '/', icons: [{ src: 'pwa-192x192.png', sizes: '192x192' }] },
          { name: 'Before you buy', url: '/before-you-buy', icons: [{ src: 'pwa-192x192.png', sizes: '192x192' }] },
        ],
      },
      workbox: {
        // everything the app needs to start offline; fonts only in the Latin subsets (Polish included)
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
        // the background remover is left out: it is fetched on first use and cached below
        globIgnores: ['**/*cyrillic*', '**/*greek*', '**/*vietnamese*', '**/*math*', '**/*symbols*', '**/cutout.worker-*.js'],
        runtimeCaching: [
          {
            urlPattern: ({ url, sameOrigin }) => sameOrigin && /\/assets\/(cutout\.worker|ort-wasm)/.test(url.pathname),
            handler: 'CacheFirst',
            options: { cacheName: 'background-remover', expiration: { maxEntries: 4 } },
          },
        ],
        navigateFallback: 'index.html',
        navigateFallbackDenylist: [/^\/privacy/],
        cleanupOutdatedCaches: true,
      },
    }),
  ],
  define: {
    __APP_VERSION__: JSON.stringify(pkg.version),
    // Vercel preview deployments (not the live site) may show reminders on demand: src/platform/preview.ts
    __PREVIEW_BUILD__: JSON.stringify(process.env.VERCEL_ENV === 'preview'),
  },
  // the background remover's worker (src/platform/cutout.worker.ts) is a module worker
  worker: {
    format: 'es',
  },
  // pre-bundling breaks how onnxruntime-web loads its WebAssembly
  optimizeDeps: {
    exclude: ['onnxruntime-web'],
  },
  test: {
    environment: 'node',
    setupFiles: ['./src/test/setup.ts'],
  },
})
