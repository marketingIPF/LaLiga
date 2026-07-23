import { Routes, Route, Navigate } from 'react-router-dom'
import { ShieldCheck } from 'lucide-react'
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
import Panel from './views/Panel'
import PanelAgentes from './views/PanelAgentes'
import PanelEquipos from './views/PanelEquipos'
import PanelPuntos from './views/PanelPuntos'

// Pastilla flotante que solo ven los admins en modo usuario, para volver
function VolverAdminPill() {
  const { isRealAdmin, viewAsUser, setViewAsUser } = useAuth()
  if (!isRealAdmin || !viewAsUser) return null
  return (
    <button
      onClick={() => setViewAsUser(false)}
      className="fixed bottom-24 right-4 z-40 flex items-center gap-2 px-4 py-2.5 rounded-full bg-rk-ink text-rk-cream text-xs font-extrabold shadow-2xl border border-white/10 active:scale-95 transition-transform"
    >
      <ShieldCheck size={14} className="text-rk-orange" />
      Volver a admin
    </button>
  )
}

export default function App() {
  const { firebaseUser, profile, isAdmin, loading } = useAuth()

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

  return (
    <>
    <VolverAdminPill />
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
