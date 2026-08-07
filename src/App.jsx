import { useEffect } from 'react'
import { Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { useAuth } from './context/AuthContext'

import AppLayout from './components/layout/AppLayout'
import PanelLayout from './components/layout/PanelLayout'
import Login from './views/Login'
import Dashboard from './views/Dashboard'
import AdminHome from './views/AdminHome'
import Ranking from './views/Ranking'
import Logros from './views/Logros'
import RegistrarAccion from './views/RegistrarAccion'
import Aprobaciones from './views/Aprobaciones'
import Perfil from './views/Perfil'
import CambiarPassword from './views/CambiarPassword'
import GestionEquipos from './views/GestionEquipos'
import GestionAgentes from './views/GestionAgentes'
import Notificaciones from './views/Notificaciones'
import Actividad from './views/Actividad'
import Onboarding from './views/Onboarding'
import Panel from './views/Panel'
import PanelAgentes from './views/PanelAgentes'
import PanelEquipos from './views/PanelEquipos'
import PanelPuntos from './views/PanelPuntos'

// Al cambiar de pantalla, volver arriba. React Router no reinicia el
// scroll por sí solo: como no se recarga la página, el navegador mantiene
// la posición y entrabas en la pantalla nueva a media altura.
function ScrollToTop() {
  const { pathname } = useLocation()

  useEffect(() => {
    // Ventana (caso habitual)
    window.scrollTo({ top: 0, left: 0, behavior: 'auto' })
    // Y por si el scroll lo lleva un contenedor interno del layout
    const scrollables = document.querySelectorAll('main, [data-scroll-root]')
    scrollables.forEach((el) => {
      if (el.scrollTop > 0) el.scrollTop = 0
    })
  }, [pathname])

  return null
}

export default function App() {
  const { firebaseUser, profile, isAdmin, loading, needsOnboarding } = useAuth()

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 rounded-full border-4 border-rk-orange/20 border-t-rk-orange animate-spin mx-auto" />
          <p className="text-sm text-rk-ink/60 dark:text-rk-cream/60 mt-3 font-semibold">
            Cargando La Liga…
          </p>
        </div>
      </div>
    )
  }

  if (!firebaseUser || !profile) {
    return (
      <Routes>
        <Route path="*" element={<Login />} />
      </Routes>
    )
  }

  // Gate: si tiene que cambiar contraseña, no le dejamos pasar a ningún otro sitio
  if (profile.mustChangePassword === true) {
    return (
      <Routes>
        <Route path="*" element={<CambiarPassword />} />
      </Routes>
    )
  }

  // Gate: los usuarios nuevos pasan por la introducción antes de entrar.
  // Va después del cambio de contraseña para que el primer paso siga siendo
  // asegurar la cuenta.
  if (needsOnboarding) {
    return (
      <Routes>
        <Route path="*" element={<Onboarding />} />
      </Routes>
    )
  }

  return (
    <>
    <ScrollToTop />
    <Routes>
      {/* Panel desktop — solo admins, layout sin BottomNav */}
      {isAdmin && (
        <Route element={<PanelLayout />}>
          <Route path="/panel" element={<Panel />} />
          <Route path="/panel/agentes" element={<PanelAgentes />} />
          <Route path="/panel/equipos" element={<PanelEquipos />} />
          <Route path="/panel/puntos" element={<PanelPuntos />} />
        </Route>
      )}

      {/* Resto de la app — mobile-first, con BottomNav */}
      <Route element={<AppLayout />}>
        <Route path="/" element={isAdmin ? <AdminHome /> : <Dashboard />} />
        <Route path="/ranking" element={<Ranking />} />
        <Route path="/logros" element={<Logros />} />
        <Route path="/perfil" element={<Perfil />} />
        <Route path="/cambiar-password" element={<CambiarPassword />} />
        <Route path="/notificaciones" element={<Notificaciones />} />
        <Route path="/actividad" element={<Actividad />} />
        {isAdmin && <Route path="/aprobaciones" element={<Aprobaciones />} />}
        {isAdmin && <Route path="/equipos" element={<GestionEquipos />} />}
        {isAdmin && <Route path="/agentes" element={<GestionAgentes />} />}
        {!isAdmin && <Route path="/registrar" element={<RegistrarAccion />} />}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
    </>
  )
}
