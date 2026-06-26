import { Link } from 'react-router-dom'
import { ChevronRight, TrendingUp, Users, Clock } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { useUsers } from '../hooks/useUsers'
import { useActionRequests } from '../hooks/useActionRequests'
import { useGroups } from '../hooks/useGroups'
import { isAdminRole } from '../data/seedUsers'
import { formatPoints, relativeDate } from '../lib/utils'
import { ACTION_TYPES } from '../lib/constants'
import Header from '../components/layout/Header'
import GlassCard from '../components/ui/GlassCard'
import Avatar from '../components/ui/Avatar'

export default function AdminHome() {
  const { profile } = useAuth()
  const { users } = useUsers()
  const { groups } = useGroups()
  const { requests: pending } = useActionRequests({ status: 'pending' })

  const agents = users.filter((u) => !isAdminRole(u.role))
  const totalPoints = agents.reduce((acc, u) => acc + (u.points ?? 0), 0)
  const totalLifetime = agents.reduce((acc, u) => acc + (u.lifetimePoints ?? 0), 0)

  const firstName = profile?.name?.split(' ')[0] ?? ''

  return (
    <div className="space-y-6 animate-fade-in">
      <Header title={`Hola, ${firstName} 👋`} subtitle="Panel Codirector" showLogout />

      {/* CTA aprobaciones */}
      <Link to="/aprobaciones" className="block">
        <div className="rounded-3xl p-5 bg-gradient-to-br from-rk-orange to-rk-orange-dark text-white shadow-lg shadow-rk-orange/30 active:scale-[0.98] transition-transform">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider opacity-80">
                Solicitudes pendientes
              </p>
              <div className="text-4xl font-black mt-1">{pending.length}</div>
              <p className="text-sm opacity-90 mt-1">
                {pending.length === 0
                  ? 'Todo al día'
                  : pending.length === 1
                  ? 'Acción esperando revisión'
                  : 'Acciones esperando revisión'}
              </p>
            </div>
            <ChevronRight size={28} />
          </div>
        </div>
      </Link>

      {/* Métricas agencia */}
      <div className="grid grid-cols-2 gap-3">
        <MetricCard
          icon={<TrendingUp size={18} className="text-rk-orange" />}
          label="Puntos del periodo"
          value={formatPoints(totalPoints)}
        />
        <MetricCard
          icon={<Users size={18} className="text-rk-orange" />}
          label="Agentes activos"
          value={agents.filter((a) => (a.points ?? 0) > 0).length}
        />
        <MetricCard
          icon={<Clock size={18} className="text-rk-orange" />}
          label="Histórico total"
          value={formatPoints(totalLifetime)}
        />
        <Link to="/equipos" className="block active:scale-[0.98] transition-transform">
          <MetricCard
            icon={<Users size={18} className="text-rk-orange" />}
            label="Equipos"
            value={groups.length}
            chevron
          />
        </Link>
      </div>

      {/* Actividad reciente */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-bold">Últimas solicitudes</h2>
          <Link to="/aprobaciones" className="text-sm font-semibold text-rk-orange flex items-center gap-1">
            Ver todas <ChevronRight size={16} />
          </Link>
        </div>
        {pending.length === 0 ? (
          <GlassCard className="text-center text-sm text-rk-ink/60 dark:text-rk-cream/60 py-6">
            No hay solicitudes pendientes ✨
          </GlassCard>
        ) : (
          <div className="space-y-2">
            {pending.slice(0, 5).map((r) => (
              <div key={r.id} className="glass rounded-2xl p-3 flex items-center gap-3">
                <Avatar name={r.userName} size="sm" />
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-bold truncate">{r.userName}</div>
                  <div className="text-xs text-rk-ink/60 dark:text-rk-cream/60 truncate">
                    {ACTION_TYPES[r.actionType]?.icon} {r.actionLabel}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-black text-rk-orange">+{r.points}</div>
                  <div className="text-[10px] text-rk-ink/50 dark:text-rk-cream/50">
                    {relativeDate(r.createdAt)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}

function MetricCard({ icon, label, value, chevron }) {
  return (
    <GlassCard className="!p-4">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-wider text-rk-ink/50 dark:text-rk-cream/50">
          {label}
        </span>
        {icon}
      </div>
      <div className="flex items-end justify-between">
        <div className="text-2xl font-black mt-1">{value}</div>
        {chevron && <ChevronRight size={16} className="text-rk-ink/30 dark:text-rk-cream/30 mb-1" />}
      </div>
    </GlassCard>
  )
}
