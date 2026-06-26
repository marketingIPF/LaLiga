import { NavLink, useNavigate } from 'react-router-dom'
import { Home, Trophy, Plus, Award, User, CheckCircle2 } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { cn } from '../../lib/utils'

const NAV_AGENT = [
  { to: '/', label: 'Inicio', Icon: Home, end: true },
  { to: '/ranking', label: 'Ranking', Icon: Trophy },
  { to: '/registrar', label: 'Registrar', Icon: Plus, fab: true },
  { to: '/logros', label: 'Logros', Icon: Award },
  { to: '/perfil', label: 'Perfil', Icon: User },
]

const NAV_ADMIN = [
  { to: '/', label: 'Inicio', Icon: Home, end: true },
  { to: '/ranking', label: 'Ranking', Icon: Trophy },
  { to: '/aprobaciones', label: 'Aprobar', Icon: CheckCircle2, fab: true },
  { to: '/logros', label: 'Logros', Icon: Award },
  { to: '/perfil', label: 'Perfil', Icon: User },
]

export default function BottomNav() {
  const { isAdmin } = useAuth()
  const items = isAdmin ? NAV_ADMIN : NAV_AGENT

  return (
    <nav
      className="fixed bottom-0 inset-x-0 z-40 pb-[var(--safe-bottom)]"
      style={{ paddingBottom: 'max(0.5rem, var(--safe-bottom))' }}
    >
      <div className="mx-3 mb-2">
        <div className="glass-strong rounded-3xl px-2 py-2 shadow-glass dark:shadow-glass-dark">
          <div className="flex items-center justify-around">
            {items.map(({ to, label, Icon, fab, end }) => (
              <NavLink
                key={to}
                to={to}
                end={end}
                className={({ isActive }) =>
                  cn(
                    'flex flex-col items-center justify-center gap-0.5 flex-1 py-1.5',
                    fab && 'relative -mt-6'
                  )
                }
              >
                {({ isActive }) =>
                  fab ? (
                    <FabButton Icon={Icon} label={label} active={isActive} />
                  ) : (
                    <NavItem Icon={Icon} label={label} active={isActive} />
                  )
                }
              </NavLink>
            ))}
          </div>
        </div>
      </div>
    </nav>
  )
}

function NavItem({ Icon, label, active }) {
  return (
    <>
      <Icon
        size={22}
        strokeWidth={active ? 2.5 : 2}
        className={cn(
          'transition-colors',
          active ? 'text-rk-orange' : 'text-rk-ink/60 dark:text-rk-cream/60'
        )}
      />
      <span
        className={cn(
          'text-[10px] font-semibold transition-colors',
          active ? 'text-rk-orange' : 'text-rk-ink/60 dark:text-rk-cream/60'
        )}
      >
        {label}
      </span>
    </>
  )
}

function FabButton({ Icon, label, active }) {
  return (
    <>
      <div
        className={cn(
          'w-14 h-14 rounded-full flex items-center justify-center',
          'bg-gradient-to-br from-rk-orange to-rk-orange-dark text-white shadow-lg shadow-rk-orange/30',
          'ring-4 ring-rk-cream dark:ring-rk-ink',
          active && 'animate-pulse-orange'
        )}
      >
        <Icon size={28} strokeWidth={2.5} />
      </div>
      <span className="text-[10px] font-semibold text-rk-ink/60 dark:text-rk-cream/60 mt-1">
        {label}
      </span>
    </>
  )
}
