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
      className="fixed bottom-0 inset-x-0 z-40"
      style={{ paddingBottom: 'max(0.5rem, var(--safe-bottom))' }}
    >
      <div className="mx-3 mb-2">
        <div className="glass-strong rounded-[32px] px-2 py-2 shadow-glass-lifted dark:shadow-glass-lifted-dark">
          <div className="flex items-center justify-around">
            {items.map(({ to, label, Icon, fab, end }) => (
              <NavLink
                key={to}
                to={to}
                end={end}
                className={({ isActive }) =>
                  cn(
                    'flex flex-col items-center justify-center gap-0.5 flex-1 py-1.5',
                    fab && 'relative -mt-7'
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
          'w-16 h-16 rounded-full flex items-center justify-center relative',
          'bg-gradient-to-br from-rk-orange-light via-rk-orange to-rk-orange-dark text-white',
          'shadow-orange-glow ring-4 ring-rk-cream/80 dark:ring-rk-ink/80',
          'transition-transform duration-200 ease-ios-spring',
          active && 'animate-pulse-orange scale-105'
        )}
        style={{ isolation: 'isolate' }}
      >
        {/* Highlight especular superior */}
        <div
          className="absolute inset-0 rounded-full pointer-events-none"
          style={{
            background:
              'linear-gradient(180deg, rgba(255,255,255,0.32) 0%, rgba(255,255,255,0) 50%)',
          }}
        />
        <Icon size={28} strokeWidth={2.5} className="relative" />
      </div>
      <span className="text-[10px] font-bold text-rk-ink/70 dark:text-rk-cream/70 mt-1.5">
        {label}
      </span>
    </>
  )
}
