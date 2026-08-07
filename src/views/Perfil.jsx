import {
  Mail, Users, LogOut, Sun, Moon, KeyRound, History, ChevronRight,
} from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useTheme } from '../context/ThemeContext'
import { useUsers } from '../hooks/useUsers'
import { useGroups } from '../hooks/useGroups'
import { useRank } from '../hooks/useRank'
import { formatPoints } from '../lib/utils'
import Header from '../components/layout/Header'
import GlassCard from '../components/ui/GlassCard'
import Avatar from '../components/ui/Avatar'
import RankBadge from '../components/ui/RankBadge'

export default function Perfil() {
  const { profile, isAdmin, signOut } = useAuth()
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
    <div className="space-y-5 animate-fade-in">
      <Header title="Mi perfil" subtitle="La Liga" />

      <GlassCard className="flex flex-col items-center text-center">
        <Avatar name={profile.name} size="xl" />
        <h2 className="text-xl font-black mt-3">{profile.name}</h2>
        <p className="text-sm text-rk-ink/60 dark:text-rk-cream/60">{profile.role}</p>
        <div className="mt-3">
          <RankBadge rankId={rank.id} size="lg" />
        </div>
      </GlassCard>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3">
        <StatCard label="Puntos actuales" value={formatPoints(profile.points)} />
        <StatCard label="Histórico" value={formatPoints(profile.lifetimePoints)} />
      </div>

      {/* Tu actividad */}
      <button
        onClick={() => navigate('/actividad')}
        className="w-full active:scale-[0.99] transition-transform"
      >
        <GlassCard className="!p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-rk-orange/10 text-rk-orange flex items-center justify-center shrink-0">
            <History size={19} />
          </div>
          <div className="flex-1 min-w-0 text-left">
            <div className="text-sm font-bold">Tu actividad</div>
            <div className="text-xs text-rk-ink/55 dark:text-rk-cream/55">
              Todas tus acciones y su estado
            </div>
          </div>
          <ChevronRight size={18} className="text-rk-ink/25 dark:text-rk-cream/25 shrink-0" />
        </GlassCard>
      </button>

      {/* Info contacto */}
      <GlassCard className="!p-0 overflow-hidden">
        <InfoRow Icon={Mail} label={profile.email} />
        {group && (
          <>
            <Divider />
            <InfoRow Icon={Users} label={`Equipo: ${group.name}`} />
          </>
        )}
      </GlassCard>

      {/* Settings */}
      <GlassCard className="!p-0 overflow-hidden">
        <button onClick={toggle} className="w-full flex items-center gap-3 px-4 py-3.5">
          {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
          <span className="text-sm font-semibold flex-1 text-left">
            Tema {theme === 'dark' ? 'claro' : 'oscuro'}
          </span>
        </button>
        <Divider />
        <button
          onClick={() => navigate('/cambiar-password')}
          className="w-full flex items-center gap-3 px-4 py-3.5"
        >
          <KeyRound size={18} />
          <span className="text-sm font-semibold flex-1 text-left">Cambiar contraseña</span>
        </button>
        <Divider />
        <button
          onClick={signOut}
          className="w-full flex items-center gap-3 px-4 py-3.5 text-red-500"
        >
          <LogOut size={18} />
          <span className="text-sm font-semibold flex-1 text-left">Cerrar sesión</span>
        </button>
      </GlassCard>

      <p className="text-center text-[10px] font-semibold uppercase tracking-wider text-rk-ink/30 dark:text-rk-cream/30 pt-4">
        RK Palanca Fontestad · La Liga v0.2
      </p>
    </div>
  )
}

function StatCard({ label, value }) {
  return (
    <GlassCard className="!p-4 text-center">
      <div className="text-xs font-semibold uppercase tracking-wider text-rk-ink/50 dark:text-rk-cream/50">
        {label}
      </div>
      <div className="text-2xl font-black mt-1 text-rk-orange">{value}</div>
    </GlassCard>
  )
}

function InfoRow({ Icon, label }) {
  return (
    <div className="flex items-center gap-3 px-4 py-3.5">
      <Icon size={18} className="text-rk-ink/60 dark:text-rk-cream/60" />
      <span className="text-sm font-semibold truncate">{label}</span>
    </div>
  )
}

function Divider() {
  return <div className="border-t border-black/5 dark:border-white/5" />
}
