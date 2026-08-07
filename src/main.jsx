import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { registerSW } from 'virtual:pwa-register'
import App from './App.jsx'
import { ThemeProvider } from './context/ThemeContext.jsx'
import { AuthProvider } from './context/AuthContext.jsx'
import './index.css'

// ====================================================================
// Actualizaciones de la app (PWA)
// --------------------------------------------------------------------
// La Liga se instala como app y guarda sus archivos en caché, así que una
// versión nueva no aparece hasta que el service worker se renueva. Aquí:
//   1. Comprobamos si hay versión nueva cada minuto, al volver a la app y
//      al recuperar el foco. Sin esto, la comprobación solo pasa al abrir.
//   2. Cuando la versión nueva toma el control, mostramos un aviso abajo
//      con un botón para recargar. No recargamos solos a propósito: si
//      alguien está escribiendo unas notas, perdería lo escrito.
// ====================================================================

const CHECK_INTERVAL_MS = 60_000

function mostrarAvisoActualizacion() {
  if (document.getElementById('rk-update-banner')) return

  const banner = document.createElement('div')
  banner.id = 'rk-update-banner'
  banner.style.cssText = [
    'position:fixed',
    'left:12px',
    'right:12px',
    'bottom:calc(96px + env(safe-area-inset-bottom, 0px))',
    'z-index:60',
    'display:flex',
    'align-items:center',
    'gap:12px',
    'padding:12px 14px',
    'border-radius:18px',
    'background:#0a0a0a',
    'color:#faf5ee',
    'box-shadow:0 10px 30px rgba(0,0,0,.35)',
    "font-family:Montserrat,system-ui,sans-serif",
    'animation:rk-slide-up .28s ease-out',
  ].join(';')

  const style = document.createElement('style')
  style.textContent =
    '@keyframes rk-slide-up{from{transform:translateY(16px);opacity:0}to{transform:translateY(0);opacity:1}}'
  document.head.appendChild(style)

  const texto = document.createElement('div')
  texto.style.cssText = 'flex:1;min-width:0;font-size:13px;font-weight:700;line-height:1.3'
  texto.innerHTML =
    'Hay una versión nueva de La Liga<br><span style="font-size:11px;font-weight:600;opacity:.6">Recarga para verla</span>'

  const boton = document.createElement('button')
  boton.textContent = 'Actualizar'
  boton.style.cssText = [
    'flex-shrink:0',
    'border:0',
    'cursor:pointer',
    'padding:9px 16px',
    'border-radius:12px',
    'background:#cf731b',
    'color:#fff',
    'font-family:inherit',
    'font-size:12.5px',
    'font-weight:800',
  ].join(';')
  boton.onclick = () => window.location.reload()

  const cerrar = document.createElement('button')
  cerrar.textContent = '✕'
  cerrar.setAttribute('aria-label', 'Cerrar aviso')
  cerrar.style.cssText = [
    'flex-shrink:0',
    'border:0',
    'cursor:pointer',
    'background:transparent',
    'color:rgba(250,245,238,.45)',
    'font-size:14px',
    'padding:4px',
  ].join(';')
  cerrar.onclick = () => banner.remove()

  banner.append(texto, boton, cerrar)
  document.body.appendChild(banner)
}

// ¿Ya había un service worker controlando la página? Si no, es la primera
// instalación y no hay nada que avisar.
let teniaControlador = Boolean(navigator.serviceWorker?.controller)

registerSW({
  immediate: true,
  onRegisteredSW(swUrl, registration) {
    if (!registration) return
    const comprobar = () => registration.update().catch(() => {})
    setInterval(comprobar, CHECK_INTERVAL_MS)
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') comprobar()
    })
    window.addEventListener('focus', comprobar)
  },
  onRegisterError(err) {
    console.error('Service worker no registrado', err)
  },
})

if ('serviceWorker' in navigator) {
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (!teniaControlador) {
      teniaControlador = true
      return // primera instalación: nada que avisar
    }
    mostrarAvisoActualizacion()
  })
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <ThemeProvider>
        <AuthProvider>
          <App />
        </AuthProvider>
      </ThemeProvider>
    </BrowserRouter>
  </React.StrictMode>
)
