import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react(), VitePWA({
    registerType: 'autoUpdate',
    manifest: {
      name: 'Yoka Store ECP',
      short_name: 'Yoka Store',
      description: 'E‑commerce client for Yoka Store',
      start_url: '/',
      display: 'standalone',
      background_color: '#ffffff',
      theme_color: '#1890ff',
      icons: [
        { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
        { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' }
      ]
    },
    workbox: {
      runtimeCaching: [
        {
          urlPattern: ({request}) => request.destination === 'document',
          handler: 'NetworkFirst',
          options: { cacheName: 'html-cache', expiration: { maxEntries: 10 } }
        },
        {
          urlPattern: ({request}) => request.destination === 'script' || request.destination === 'style',
          handler: 'StaleWhileRevalidate',
          options: { cacheName: 'asset-cache' }
        },
        {
          urlPattern: ({url}) => url.origin === self.location.origin && url.pathname.startsWith('/api/'),
          handler: 'NetworkFirst',
          method: 'GET',
          options: { cacheName: 'api-cache', networkTimeoutSeconds: 10, expiration: { maxEntries: 50, maxAgeSeconds: 86400 } }
        }
      ]
    }
  })],
  server: {
    port: 3000,
    host: true
  },
  build: {
    chunkSizeWarningLimit: 900
  }
});
