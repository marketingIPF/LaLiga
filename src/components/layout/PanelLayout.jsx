import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard, CheckCircle2, ClipboardList, UserCog, Users,
  User, Building2, Briefcase, Smartphone, Sun, Moon, LogOut,
} from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { useTheme } from '../../context/ThemeContext'
import { useActionRequests } from '../../hooks/useActionRequests'
import { cn } from '../../lib/utils'
import Avatar from '../ui/Avatar'
import NotificationBell from '../ui/NotificationBell'

// ====================================================================
// Layout del panel de escritorio
// --------------------------------------------------------------------
// Barra lateral fija (estilo Ajustes del Sistema de macOS) + área de
// contenido con scroll propio. La navegación vive aquí, así que todas
// las pantallas del panel la comparten.
// ====================================================================

const GRUPOS = [
  {
    titulo: 'La Liga',
    items: [
      { to: '/panel', label: 'Resumen', Icon: LayoutDashboard, end: true },
      { to: '/aprobaciones', label: 'Aprobaciones', Icon: CheckCircle2, badge: 'pending' },
      { to: '/panel/puntos', label: 'Cargar puntos', Icon: ClipboardList },
    ],
  },
  {
    titulo: 'Gestión',
    items: [
      { to: '/panel/agentes', label: 'Agentes', Icon: UserCog },
      { to: '/panel/equipos', label: 'Equipos', Icon: Users },
    ],
  },
]

export default function PanelLayout() {
  const { profile, signOut } = useAuth()
  const { theme, toggle } = useTheme()
  const navigate = useNavigate()
  const { requests: pending } = useActionRequests({ status: 'pending' })

  return (
    <div className="flex h-screen bg-rk-cream dark:bg-rk-ink text-rk-ink dark:text-rk-cream overflow-hidden">
      {/* ---------------- Barra lateral ---------------- */}
      <aside className="w-[214px] shrink-0 flex flex-col bg-black/[0.035] dark:bg-white/[0.03] border-r border-black/[0.07] dark:border-white/[0.07] px-3 py-4">
        <div className="px-2 pb-4">
          <div className="text-[9px] font-extrabold tracking-[1.8px] uppercase text-rk-orange">
            RK Palanca
          </div>
          <div className="text-[15px] font-black tracking-tight mt-0.5">
            La Liga
          </div>
        </div>

        <nav className="flex-1 overflow-y-auto">
          {GRUPOS.map((grupo) => (
            <div key={grupo.titulo} className="mb-5">
              <div className="text-[9px] font-extrabold tracking-[1.3px] uppercase text-rk-ink/30 dark:text-rk-cream/30 px-2 pb-1.5">
                {grupo.titulo}
              </div>
              {grupo.items.map(({ to, label, Icon, end, badge }) => (
                <NavLink
                  key={to}
                  to={to}
                  end={end}
                  className={({ isActive }) =>
                    cn(
                      'flex items-center gap-2.5 px-2.5 py-[7px] rounded-lg text-[12.5px] font-bold mb-0.5 transition-colors',
                      isActive
                        ? 'bg-rk-orange text-white font-extrabold'
                        : 'text-rk-ink/60 dark:text-rk-cream/60 hover:bg-black/[0.04] dark:hover:bg-white/[0.05]'
                    )
                  }
                >
                  {({ isActive }) => (
                    <>
                      <Icon size={14} className="shrink-0" />
                      <span className="flex-1 truncate">{label}</span>
                      {badge === 'pending' && pending.length > 0 && (
                        <span
                          className={cn(
                            'text-[9.5px] font-black px-1.5 py-[1px] rounded-full',
                            isActive
                              ? 'bg-white/25 text-white'
                              : 'bg-rk-orange text-white'
                          )}
                        >
                          {pending.length}
                        </span>
                      )}
                    </>
                  )}
                </NavLink>
              ))}
            </div>
          ))}
        </nav>

        {/* Pie de la barra */}
        <div className="border-t border-black/[0.07] dark:border-white/[0.07] pt-3">
          <div className="flex items-center gap-2 px-1 pb-2.5">
            <Avatar name={profile?.name} size="sm" />
            <div className="flex-1 min-w-0">
              <div className="text-[12px] font-extrabold truncate">
                {profile?.name?.split(' ')[0]}
              </div>
              <div className="text-[9.5px] font-semibold text-rk-ink/40 dark:text-rk-cream/40">
                Administrador
              </div>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={() => navigate('/')}
              title="Vista móvil"
              className="flex-1 h-8 rounded-lg text-rk-ink/50 dark:text-rk-cream/50 hover:bg-black/[0.05] dark:hover:bg-white/[0.06] transition flex items-center justify-center"
            >
              <Smartphone size={14} />
            </button>
            <button
              onClick={toggle}
              title="Cambiar tema"
              className="flex-1 h-8 rounded-lg text-rk-ink/50 dark:text-rk-cream/50 hover:bg-black/[0.05] dark:hover:bg-white/[0.06] transition flex items-center justify-center"
            >
              {theme === 'dark' ? <Sun size={14} /> : <Moon size={14} />}
            </button>
            <button
              onClick={signOut}
              title="Cerrar sesión"
              className="flex-1 h-8 rounded-lg text-rk-ink/50 dark:text-rk-cream/50 hover:bg-black/[0.05] dark:hover:bg-white/[0.06] transition flex items-center justify-center"
            >
              <LogOut size={14} />
            </button>
          </div>
        </div>
      </aside>

      {/* ---------------- Contenido ---------------- */}
      <div className="flex-1 min-w-0 flex flex-col">
        <div className="flex items-center justify-end gap-1 px-7 py-2.5 border-b border-black/[0.07] dark:border-white/[0.07]">
          <NotificationBell />
        </div>
        <main className="flex-1 overflow-y-auto px-7 py-6">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
