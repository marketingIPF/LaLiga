import {
  Mail, Users, LogOut, Sun, Moon, KeyRound, History, ChevronRight,
} from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useTheme } from '../context/ThemeContext'
import { useUsers } from '../hooks/useUsers'
import { useGroups } from '../hooks/useGroups'
import { useRank } from '../hooks/useRank'
import { formatPoints, cn } from '../lib/utils'
import Header from '../components/layout/Header'
import Avatar from '../components/ui/Avatar'

export default function Perfil() {
  const { profile, signOut } = useAuth()
  const { theme, toggle } = useTheme()
  const { topLifetime } = useUsers()
  const { groups } = useGroups()
  const navigate = useNavigate()

  const { rank } = useRank({
    points: profile?.points ?? 0,
    lifetimePoints: profile?.lifetimePoints ?? 0,
    topLifetimeInAgency: topLifetime,
  })

  const group = groups.find((g) => g.id === profile?.groupId)

  if (!profile) return null

  return (
    <div className="animate-fade-in pb-4">
      <Header title="Perfil" subtitle="La Liga RK" />

      {/* Cabecera · avatar suelto sobre el fondo, sin caja */}
      <div className="flex flex-col items-center text-center pt-3 pb-1">
        <Avatar name={profile.name} size="xl" />
        <h2 className="text-xl font-black mt-3.5 tracking-tight">
          {profile.name}
        </h2>
        <p className="text-[12px] font-bold text-rk-ink/45 dark:text-rk-cream/45 mt-0.5">
          {profile.role}
        </p>
        <div className="flex items-center gap-1.5 mt-2">
          <span className="w-2 h-2 rounded-full" style={{ backgroundColor: rank.auraColor }} />
          <span className="text-[12px] font-extrabold" style={{ color: rank.auraColor }}>
            {rank.label}
          </span>
        </div>
      </div>

      {/* Stats en línea */}
      <div className="mt-5 border-t border-black/[0.07] dark:border-white/[0.08]">
        <div className="flex py-3.5">
          <div className="flex-1 text-center">
            <div className="text-lg font-black text-rk-orange">
              {formatPoints(profile.points)}
            </div>
            <div className="text-[8.5px] font-extrabold uppercase tracking-wider text-rk-ink/40 dark:text-rk-cream/40 mt-0.5">
              Puntos
            </div>
          </div>
          <div className="w-px my-1.5 bg-black/[0.07] dark:bg-white/[0.08]" />
          <div className="flex-1 text-center">
            <div className="text-lg font-black">
              {formatPoints(profile.lifetimePoints)}
            </div>
            <div className="text-[8.5px] font-extrabold uppercase tracking-wider text-rk-ink/40 dark:text-rk-cream/40 mt-0.5">
              Histórico
            </div>
          </div>
        </div>
      </div>

      {/* Tu actividad */}
      <Fila
        Icon={History}
        label="Tu actividad"
        sub="Todas tus acciones y su estado"
        onClick={() => navigate('/actividad')}
        primero
      />

      {/* Info de contacto */}
      <Fila Icon={Mail} label={profile.email} />
      {group && (
        <Fila Icon={Users} label={group.name} sub="Tu equipo" />
      )}

      {/* Ajustes */}
      <Fila
        Icon={theme === 'dark' ? Sun : Moon}
        label={`Tema ${theme === 'dark' ? 'claro' : 'oscuro'}`}
        onClick={toggle}
      />
      <Fila
        Icon={KeyRound}
        label="Cambiar contraseña"
        onClick={() => navigate('/cambiar-password')}
      />
      <Fila
        Icon={LogOut}
        label="Cerrar sesión"
        onClick={signOut}
        danger
        ultimo
      />

      <p className="text-center text-[9.5px] font-bold uppercase tracking-wider text-rk-ink/25 dark:text-rk-cream/25 pt-6">
        RK Palanca Fontestad · La Liga
      </p>
    </div>
  )
}

function Fila({ Icon, label, sub, onClick, primero = false, ultimo = false, danger = false }) {
  const Comp = onClick ? 'button' : 'div'
  return (
    <>
      {primero && (
        <div className="border-t border-black/[0.07] dark:border-white/[0.08]" />
      )}
      <Comp
        onClick={onClick}
        className={cn(
          'w-full flex items-center gap-3 py-3.5 text-left',
          onClick && 'active:opacity-60 transition-opacity'
        )}
      >
        <Icon
          size={18}
          className={danger ? 'text-red-500' : 'text-rk-ink/55 dark:text-rk-cream/55'}
        />
        <div className="flex-1 min-w-0">
          <div
            className={cn(
              'text-[13px] font-bold truncate',
              danger && 'text-red-500'
            )}
          >
            {label}
          </div>
          {sub && (
            <div className="text-[10.5px] font-semibold text-rk-ink/45 dark:text-rk-cream/45 mt-0.5">
              {sub}
            </div>
          )}
        </div>
        {onClick && !danger && (
          <ChevronRight size={16} className="text-rk-ink/20 dark:text-rk-cream/20 shrink-0" />
        )}
      </Comp>
      {!ultimo && (
        <div className="border-t border-black/[0.07] dark:border-white/[0.08]" />
      )}
    </>
  )
}
