import vue from '@vitejs/plugin-vue'
import { defineConfig } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [vue(), VitePWA({
    registerType: 'autoUpdate',
    includeAssets: ['icon.svg'],
    manifest: {
      name: "Henry's Wild Typing", short_name: 'Wild Typing',
      description: 'An offline typing expedition for Henry',
      theme_color: '#152c25', background_color: '#f5f2e9', display: 'standalone',
      icons: [{ src: '/icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any maskable' }],
    },
    workbox: { globPatterns: ['**/*.{js,css,html,svg,wasm,jpg,webp,woff2}'], maximumFileSizeToCacheInBytes: 8 * 1024 * 1024 },
  })],
  server: { host: true }, preview: { host: true, port: 4173 },
  optimizeDeps: { include: ['sql.js'] },
})
