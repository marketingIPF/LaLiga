import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      // autoUpdate: el service worker nuevo toma el control en cuanto está
      // listo, sin esperar a que se cierren todas las pestañas. Así, al
      // reabrir la app, ya se sirve la versión nueva.
      registerType: 'autoUpdate',
      // Registramos el service worker a mano en main.jsx (para poder
      // comprobar actualizaciones y avisar al usuario), así que
      // desactivamos la inyección automática y evitamos registrarlo dos veces.
      injectRegister: null,
      includeAssets: ['apple-touch-icon.png', 'favicon-32.png', 'favicon-16.png'],
      workbox: {
        // Borra cachés de versiones anteriores en cada despliegue
        cleanupOutdatedCaches: true,
        clientsClaim: true,
        skipWaiting: true,
      },
      manifest: {
        name: 'La Liga · RK Palanca',
        short_name: 'La Liga',
        description: 'Gamificación para el equipo comercial de RK Palanca Fontestad',
        theme_color: '#cf731b',
        background_color: '#faf5ee',
        display: 'standalone',
        orientation: 'portrait',
        start_url: '/',
        icons: [
          { src: '/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: '/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any maskable' }
        ]
      }
    })
  ]
})
