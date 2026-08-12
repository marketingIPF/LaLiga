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

// ====================================================================
// Liquid Glass (estilo iOS 26)
// --------------------------------------------------------------------
// Antes: glass-strong casi opaco, poco blur.
// Ahora: mucho más transparente + blur y saturación fuertes, para que
// el color de fondo se intensifique al atravesar el "cristal" en vez de
// quedar solo difuminado. Un hilo de luz en el borde superior remata el
// efecto. Claro y oscuro llevan cada uno su propia mezcla — el oscuro
// necesita menos transparencia para no perder contraste con los iconos.
// ====================================================================
const LIQUID_GLASS = cn(
  'bg-white/[0.28] backdrop-blur-[26px] backdrop-saturate-[2]',
  'border border-white/[0.55]',
  'shadow-[inset_0_1px_1px_rgba(255,255,255,0.6),0_10px_28px_rgba(0,0,0,0.14)]',
  'dark:bg-rk-ink/[0.45] dark:backdrop-saturate-[1.6]',
  'dark:border-white/[0.14]',
  'dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.15),0_10px_30px_rgba(0,0,0,0.4)]'
)

export default function BottomNav() {
  const { isAdmin } = useAuth()
  const items = isAdmin ? NAV_ADMIN : NAV_AGENT

  return (
    <nav
      className="fixed bottom-0 inset-x-0 z-40"
      style={{ paddingBottom: 'max(0.5rem, var(--safe-bottom))' }}
    >
      <div className="mx-3 mb-2">
        <div className={cn('relative rounded-[32px] px-2 py-2 overflow-hidden', LIQUID_GLASS)}>
          {/* Hilo de luz superior, solo en modo claro (en oscuro se ve como un halo apagado) */}
          <div
            className="absolute top-0 left-[10%] right-[10%] h-px pointer-events-none dark:opacity-40"
            style={{
              background:
                'linear-gradient(90deg, transparent, rgba(255,255,255,0.9), transparent)',
            }}
          />
          <div className="flex items-center justify-around relative">
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
          active
            ? 'text-rk-orange-dark dark:text-rk-orange-light'
            : 'text-rk-ink/50 dark:text-rk-cream/55'
        )}
      />
      <span
        className={cn(
          'text-[10px] font-semibold transition-colors',
          active
            ? 'text-rk-orange-dark dark:text-rk-orange-light'
            : 'text-rk-ink/50 dark:text-rk-cream/55'
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
          'shadow-orange-glow ring-[3px] ring-white/55 dark:ring-white/20',
          'transition-transform duration-200 ease-ios-spring',
          active && 'animate-pulse-orange scale-105'
        )}
        style={{ isolation: 'isolate' }}
      >
        {/* Highlight especular superior, más marcado para que combine con el cristal */}
        <div
          className="absolute inset-0 rounded-full pointer-events-none"
          style={{
            background:
              'linear-gradient(180deg, rgba(255,255,255,0.4) 0%, rgba(255,255,255,0) 55%)',
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
