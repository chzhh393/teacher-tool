import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor': ['react', 'react-dom', 'react-router-dom', 'zustand'],
          'cloudbase': ['@cloudbase/js-sdk'],
          'framer': ['framer-motion'],
        },
      },
    },
  },
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['vite.svg', 'beasts/**/*.png'],
      manifest: {
        name: '学生积分幻兽乐园',
        short_name: '幻兽乐园',
        description: '学生积分管理与幻兽养成系统',
        theme_color: '#6366f1',
        background_color: '#ffffff',
        display: 'standalone',
        start_url: '/',
        icons: [
          {
            src: 'pwa-egg-192x192.png',
            sizes: '192x192',
            type: 'image/png',
          },
          {
            src: 'pwa-egg-512x512.png',
            sizes: '512x512',
            type: 'image/png',
          },
          {
            src: 'pwa-egg-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/.*\.tcb\.qcloud\.la\/.*/i,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'cloudbase-api-cache',
              expiration: {
                maxEntries: 50,
                maxAgeSeconds: 60 * 60 * 24, // 1 day
              },
              networkTimeoutSeconds: 5,
            },
          },
          {
            urlPattern: /\/beasts\/.+\.png$/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'beast-images-cache',
              expiration: {
                maxEntries: 200,
                maxAgeSeconds: 60 * 60 * 24 * 30, // 30 days
              },
            },
          },
        ],
      },
    }),
  ],
})
