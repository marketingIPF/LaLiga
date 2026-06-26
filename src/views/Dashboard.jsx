import { Link } from 'react-router-dom'
import { Sparkles, ChevronRight, Clock, CheckCircle2, XCircle } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { useUsers } from '../hooks/useUsers'
import { useActionRequests } from '../hooks/useActionRequests'
import { useRank } from '../hooks/useRank'
import { ACTION_TYPES, ACTION_LIST } from '../lib/constants'
import { formatPoints, relativeDate, cn } from '../lib/utils'
import Header from '../components/layout/Header'
import GlassCard from '../components/ui/GlassCard'
import RankBadge from '../components/ui/RankBadge'
import CircularProgress from '../components/ui/CircularProgress'

export default function Dashboard() {
  const { profile } = useAuth()
  const { topLifetime } = useUsers()
  const { requests } = useActionRequests({ userId: profile?.id })

  const { rank, next, current, progress, pointsToNext, isEmbajador } = useRank({
    points: profile?.points ?? 0,
    lifetimePoints: profile?.lifetimePoints ?? 0,
    topLifetimeInAgency: topLifetime,
  })

  const recentRequests = requests.slice(0, 4)
  const quickActions = ACTION_LIST.slice(0, 4)

  const firstName = profile?.name?.split(' ')[0] ?? ''

  return (
    <div className="space-y-6 animate-fade-in">
      <Header title={`Hola, ${firstName} 👋`} subtitle="La Liga RK" showLogout />

      {/* Tarjeta principal: rango + progreso */}
      <GlassCard className="relative overflow-hidden">
        <div className="absolute -top-10 -right-10 w-40 h-40 rounded-full bg-rk-orange/20 blur-3xl pointer-events-none" />
        <div className="relative flex flex-col items-center text-center">
          <RankBadge rankId={rank.id} size="md" />
          <div className="mt-6">
            <CircularProgress progress={isEmbajador ? 1 : progress} size={200} strokeWidth={14}>
              <div className="text-5xl font-black tracking-tight">{formatPoints(profile?.points)}</div>
              <div className="text-xs font-semibold uppercase tracking-wider text-rk-ink/50 dark:text-rk-cream/50 mt-1">
                puntos
              </div>
            </CircularProgress>
          </div>

          <div className="mt-5 text-sm text-rk-ink/70 dark:text-rk-cream/70">
            {isEmbajador ? (
              <span className="font-semibold text-rk-orange">{rank.description}</span>
            ) : next ? (
              <>
                Te faltan <span className="font-bold text-rk-orange">{formatPoints(pointsToNext)} pts</span> para{' '}
                <span className="font-bold">{next.label}</span>
              </>
            ) : (
              <span className="font-semibold">{current.description}</span>
            )}
          </div>
        </div>
      </GlassCard>

      {/* Métricas rápidas */}
      <div className="grid grid-cols-2 gap-3">
        <MetricCard
          label="Total histórico"
          value={formatPoints(profile?.lifetimePoints ?? 0)}
          icon={<Sparkles size={18} className="text-rk-orange" />}
        />
        <MetricCard
          label="Pendientes"
          value={requests.filter((r) => r.status === 'pending').length}
          icon={<Clock size={18} className="text-amber-500" />}
        />
      </div>

      {/* Acciones rápidas */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-bold">Registra una acción</h2>
          <Link to="/registrar" className="text-sm font-semibold text-rk-orange flex items-center gap-1">
            Ver todas <ChevronRight size={16} />
          </Link>
        </div>
        <div className="grid grid-cols-2 gap-3">
          {quickActions.map((action) => (
            <QuickActionButton key={action.id} action={action} />
          ))}
        </div>
      </section>

      {/* Historial reciente */}
      <section>
        <h2 className="text-lg font-bold mb-3">Tu actividad reciente</h2>
        {recentRequests.length === 0 ? (
          <GlassCard className="text-center text-sm text-rk-ink/60 dark:text-rk-cream/60 py-8">
            Aún no has registrado ninguna acción. ¡Empieza ahora!
          </GlassCard>
        ) : (
          <div className="space-y-2">
            {recentRequests.map((req) => (
              <RequestRow key={req.id} req={req} />
            ))}
          </div>
        )}
      </section>
    </div>
  )
}

function MetricCard({ label, value, icon }) {
  return (
    <GlassCard className="!p-4">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-wider text-rk-ink/50 dark:text-rk-cream/50">
          {label}
        </span>
        {icon}
      </div>
      <div className="text-2xl font-black mt-1">{value}</div>
    </GlassCard>
  )
}

function QuickActionButton({ action }) {
  return (
    <Link
      to={`/registrar?tipo=${action.id}`}
      className="glass rounded-2xl p-4 flex flex-col items-start gap-2 active:scale-[0.97] transition-transform"
    >
      <div className="text-2xl">{action.icon}</div>
      <div>
        <div className="text-sm font-bold leading-tight">{action.shortLabel}</div>
        <div className="text-xs font-semibold text-rk-orange mt-0.5">+{action.points} pts</div>
      </div>
    </Link>
  )
}

function RequestRow({ req }) {
  const action = ACTION_TYPES[req.actionType]
  const statusMap = {
    pending: { label: 'Pendiente', Icon: Clock, color: 'text-amber-500' },
    approved: { label: 'Aprobada', Icon: CheckCircle2, color: 'text-emerald-500' },
    rejected: { label: 'Rechazada', Icon: XCircle, color: 'text-red-500' },
  }
  const st = statusMap[req.status] ?? statusMap.pending

  return (
    <div className="glass rounded-2xl p-3 flex items-center gap-3">
      <div className="text-2xl">{action?.icon ?? '✨'}</div>
      <div className="flex-1 min-w-0">
        <div className="text-sm font-semibold truncate">{req.actionLabel}</div>
        <div className="text-xs text-rk-ink/50 dark:text-rk-cream/50">{relativeDate(req.createdAt)}</div>
      </div>
      <div className={cn('flex items-center gap-1 text-xs font-bold', st.color)}>
        <st.Icon size={14} />
        <span className="hidden xs:inline">{st.label}</span>
      </div>
      <div className="text-sm font-bold text-rk-orange whitespace-nowrap">+{req.points}</div>
    </div>
  )
}
