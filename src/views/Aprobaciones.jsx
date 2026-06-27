import { useState } from 'react'
import { Check, X, Clock, ChevronDown } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { useActionRequests, approveRequest, rejectRequest } from '../hooks/useActionRequests'
import { ACTION_TYPES } from '../lib/constants'
import { formatPoints, relativeDate, cn } from '../lib/utils'
import Header from '../components/layout/Header'
import GlassCard from '../components/ui/GlassCard'
import Avatar from '../components/ui/Avatar'

export default function Aprobaciones() {
  const { firebaseUser, isAdmin } = useAuth()
  const [filter, setFilter] = useState('pending')

  const { requests, loading } = useActionRequests({ status: filter })

  if (!isAdmin) {
    return (
      <div className="pt-20 text-center">
        <p className="text-sm text-rk-ink/60 dark:text-rk-cream/60">
          Esta sección solo está disponible para administradores.
        </p>
      </div>
    )
  }

  const pending = requests.filter((r) => r.status === 'pending')
  const totalPoints = pending.reduce((acc, r) => acc + r.points, 0)

  return (
    <div className="space-y-5 animate-fade-in">
      <Header title="Aprobaciones" subtitle="Panel Admin" showLogout />

      {/* Resumen */}
      <div className="grid grid-cols-2 gap-3">
        <GlassCard className="!p-4">
          <div className="text-xs font-semibold uppercase tracking-wider text-rk-ink/50 dark:text-rk-cream/50">
            Pendientes
          </div>
          <div className="text-3xl font-black mt-1">{pending.length}</div>
        </GlassCard>
        <GlassCard className="!p-4">
          <div className="text-xs font-semibold uppercase tracking-wider text-rk-ink/50 dark:text-rk-cream/50">
            Puntos en cola
          </div>
          <div className="text-3xl font-black mt-1 text-rk-orange">{formatPoints(totalPoints)}</div>
        </GlassCard>
      </div>

      {/* Filtro */}
      <div className="glass rounded-2xl p-1 flex gap-1">
        {[
          { id: 'pending', label: 'Pendientes' },
          { id: 'approved', label: 'Aprobadas' },
          { id: 'rejected', label: 'Rechazadas' },
        ].map((f) => (
          <button
            key={f.id}
            onClick={() => setFilter(f.id)}
            className={cn(
              'flex-1 py-2 rounded-xl font-semibold text-xs transition-all',
              filter === f.id
                ? 'bg-rk-orange text-white shadow-md shadow-rk-orange/20'
                : 'text-rk-ink/60 dark:text-rk-cream/60'
            )}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Lista */}
      {loading ? (
        <p className="text-center text-sm text-rk-ink/60 dark:text-rk-cream/60 py-12">
          Cargando…
        </p>
      ) : requests.length === 0 ? (
        <GlassCard className="text-center py-12">
          <div className="text-4xl mb-2">🎉</div>
          <p className="text-sm text-rk-ink/60 dark:text-rk-cream/60">
            No hay solicitudes {filter === 'pending' ? 'pendientes' : filter === 'approved' ? 'aprobadas' : 'rechazadas'}.
          </p>
        </GlassCard>
      ) : (
        <div className="space-y-3">
          {requests.map((req) => (
            <ApprovalCard
              key={req.id}
              req={req}
              adminUid={firebaseUser?.uid}
              actionable={filter === 'pending'}
            />
          ))}
        </div>
      )}
    </div>
  )
}

function ApprovalCard({ req, adminUid, actionable }) {
  const action = ACTION_TYPES[req.actionType]
  const [busy, setBusy] = useState(false)
  const [expanded, setExpanded] = useState(false)
  const [error, setError] = useState(null)

  const handle = async (fn) => {
    setBusy(true)
    setError(null)
    try {
      await fn()
    } catch (e) {
      console.error(e)
      setError(e.message || 'No se pudo procesar la solicitud.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <GlassCard className="!p-4">
      <div className="flex items-start gap-3">
        <Avatar name={req.userName} size="md" />
        <div className="flex-1 min-w-0">
          <div className="font-bold leading-tight truncate">{req.userName}</div>
          <div className="text-xs text-rk-ink/60 dark:text-rk-cream/60 flex items-center gap-1 mt-0.5">
            <Clock size={12} />
            {relativeDate(req.createdAt)}
          </div>
        </div>
        <div className="text-right">
          <div className="text-xl font-black text-rk-orange whitespace-nowrap">+{req.points}</div>
        </div>
      </div>

      <div className="mt-3 pt-3 border-t border-black/5 dark:border-white/5 flex items-center gap-2">
        <span className="text-xl">{action?.icon ?? '✨'}</span>
        <span className="text-sm font-semibold">{req.actionLabel}</span>
      </div>

      {req.notes && (
        <button
          onClick={() => setExpanded((e) => !e)}
          className="mt-2 flex items-center gap-1 text-xs text-rk-ink/60 dark:text-rk-cream/60 font-semibold"
        >
          <ChevronDown
            size={14}
            className={cn('transition-transform', expanded && 'rotate-180')}
          />
          {expanded ? 'Ocultar notas' : 'Ver notas'}
        </button>
      )}
      {expanded && req.notes && (
        <p className="mt-2 text-sm text-rk-ink/80 dark:text-rk-cream/80 bg-black/5 dark:bg-white/5 rounded-xl p-3">
          {req.notes}
        </p>
      )}

      {error && (
        <div className="mt-3 text-xs text-red-600 dark:text-red-400 font-semibold">{error}</div>
      )}

      {actionable && (
        <div className="mt-4 grid grid-cols-2 gap-2">
          <button
            disabled={busy}
            onClick={() => handle(() => rejectRequest({ requestId: req.id, adminUid }))}
            className="flex items-center justify-center gap-2 py-3 rounded-2xl bg-red-500/10 text-red-600 dark:text-red-400 font-bold active:scale-[0.97] transition-transform disabled:opacity-50"
          >
            <X size={18} strokeWidth={2.5} />
            Rechazar
          </button>
          <button
            disabled={busy}
            onClick={() => handle(() => approveRequest({ requestId: req.id, adminUid }))}
            className="flex items-center justify-center gap-2 py-3 rounded-2xl bg-emerald-500 text-white font-bold active:scale-[0.97] transition-transform shadow-md shadow-emerald-500/20 disabled:opacity-50"
          >
            <Check size={18} strokeWidth={2.5} />
            Aprobar
          </button>
        </div>
      )}
    </GlassCard>
  )
}
