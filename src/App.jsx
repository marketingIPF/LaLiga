import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './context/AuthContext'

import AppLayout from './components/layout/AppLayout'
import Login from './views/Login'
import Dashboard from './views/Dashboard'
import AdminHome from './views/AdminHome'
import Ranking from './views/Ranking'
import Logros from './views/Logros'
import RegistrarAccion from './views/RegistrarAccion'
import Aprobaciones from './views/Aprobaciones'
import Perfil from './views/Perfil'

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

  return (
    <Routes>
      <Route element={<AppLayout />}>
        <Route path="/" element={isAdmin ? <AdminHome /> : <Dashboard />} />
        <Route path="/ranking" element={<Ranking />} />
        <Route path="/logros" element={<Logros />} />
        <Route path="/perfil" element={<Perfil />} />
        {isAdmin ? (
          <Route path="/aprobaciones" element={<Aprobaciones />} />
        ) : (
          <Route path="/registrar" element={<RegistrarAccion />} />
        )}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  )
}
