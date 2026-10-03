import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      manifest: {
        name: 'Yoka Store ECP',
        short_name: 'Yoka Store',
        description: 'E‑commerce client for Yoka Store',
        start_url: '/',
        display: 'standalone',
        background_color: '#ffffff',
        theme_color: '#C8A45C',
        icons: [
          {
            src: '/icons/icon-192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any'
          },
          {
            src: '/icons/icon-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable'
          }
        ]
      },
      workbox: {
        navigateFallback: '/index.html',
        navigateFallbackDenylist: [/^\/swm-admin/, /^\/api/],
        runtimeCaching: [
          {
            urlPattern: ({ request, url }) => request.destination === 'document' && !url.pathname.startsWith('/swm-admin') && !url.pathname.startsWith('/api'),
            handler: 'NetworkFirst',
            options: { cacheName: 'html-cache', expiration: { maxEntries: 10 } }
          },
          {
            urlPattern: /^https:\/\/fonts\.googleapis\.com/,
            handler: 'StaleWhileRevalidate',
            options: { cacheName: 'google-fonts-stylesheets' }
          },
          {
            urlPattern: /^https:\/\/fonts\.gstatic\.com/,
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts-webfonts',
              cacheableResponse: {
                statuses: [0, 200]
              },
              expiration: {
                maxAgeSeconds: 60 * 60 * 24 * 365,
                maxEntries: 30
              }
            }
          },
          {
            urlPattern: ({ url, request }) => (request.destination === 'script' || request.destination === 'style') && url.origin === self.location.origin && !url.pathname.startsWith('/swm-admin'),
            handler: 'StaleWhileRevalidate',
            options: { cacheName: 'asset-cache' }
          },
          {
            urlPattern: ({ url }) => url.origin === self.location.origin && url.pathname.startsWith('/api/'),
            handler: 'NetworkFirst',
            method: 'GET',
            options: { cacheName: 'api-cache', networkTimeoutSeconds: 10, expiration: { maxEntries: 50, maxAgeSeconds: 86400 } }
          }
        ]
      }
    })
  ],
  server: {
    port: 3000,
    host: true
  },
  build: {
    chunkSizeWarningLimit: 950,
    cssCodeSplit: true,
    rollupOptions: {
      output: {
        manualChunks: {
          'react-vendor': ['react', 'react-dom', 'react-router-dom'],
          'antd-vendor': ['antd', '@ant-design/icons']
        }
      }
    }
  }
});
