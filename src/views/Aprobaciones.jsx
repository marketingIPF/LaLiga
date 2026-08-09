import { useState } from 'react'
import { Clock, ChevronDown } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { useActionRequests, approveRequest, rejectRequest } from '../hooks/useActionRequests'
import { ACTION_TYPES } from '../lib/constants'
import { formatPoints, relativeDate, cn } from '../lib/utils'
import Header from '../components/layout/Header'
import Avatar from '../components/ui/Avatar'

const FILTROS = [
  { id: 'pending', label: 'Pendientes' },
  { id: 'approved', label: 'Aprobadas' },
  { id: 'rejected', label: 'Rechazadas' },
]

export default function Aprobaciones() {
  const { firebaseUser, isAdmin } = useAuth()
  const [filter, setFilter] = useState('pending')

  // Pendientes: sin recortar (interesa verlas todas).
  // Histórico: solo las 50 más recientes — el listado completo es enorme.
  const max = filter === 'pending' ? null : 50
  const { requests, loading } = useActionRequests({ status: filter, max })

  if (!isAdmin) {
    return (
      <div className="pt-20 text-center">
        <p className="text-sm font-semibold text-rk-ink/55 dark:text-rk-cream/55">
          Esta sección solo está disponible para administradores.
        </p>
      </div>
    )
  }

  const pending = requests.filter((r) => r.status === 'pending')
  const totalPoints = pending.reduce((acc, r) => acc + r.points, 0)

  return (
    <div className="animate-fade-in pb-6">
      <Header title="Aprobaciones" subtitle="Panel Admin" />

      {/* Resumen en línea */}
      {filter === 'pending' && (
        <div className="flex border-y border-black/[0.075] dark:border-white/[0.09] mt-1">
          <div className="flex-1 py-3.5 text-center">
            <div className="text-[22px] font-black tracking-tight leading-none">
              {pending.length}
            </div>
            <div className="text-[8.5px] font-extrabold uppercase tracking-wider text-rk-ink/40 dark:text-rk-cream/40 mt-1">
              Pendientes
            </div>
          </div>
          <div className="w-px my-2 bg-black/[0.075] dark:bg-white/[0.09]" />
          <div className="flex-1 py-3.5 text-center">
            <div className="text-[22px] font-black tracking-tight leading-none text-rk-orange">
              {formatPoints(totalPoints)}
            </div>
            <div className="text-[8.5px] font-extrabold uppercase tracking-wider text-rk-ink/40 dark:text-rk-cream/40 mt-1">
              Puntos en cola
            </div>
          </div>
        </div>
      )}

      {/* Filtro */}
      <div className="flex gap-0.5 bg-black/[0.05] dark:bg-white/[0.07] rounded-xl p-[3px] mt-4">
        {FILTROS.map((f) => (
          <button
            key={f.id}
            onClick={() => setFilter(f.id)}
            className={cn(
              'flex-1 py-2 rounded-[9px] text-[11px] font-extrabold transition-all',
              filter === f.id
                ? 'bg-white dark:bg-rk-ink-card shadow-sm text-rk-ink dark:text-rk-cream'
                : 'text-rk-ink/45 dark:text-rk-cream/45'
            )}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Lista */}
      {loading ? (
        <p className="text-center text-[12.5px] font-semibold text-rk-ink/45 dark:text-rk-cream/45 py-14">
          Cargando…
        </p>
      ) : requests.length === 0 ? (
        <div className="text-center py-16">
          <div className="text-3xl mb-2.5">🎉</div>
          <p className="text-[12.5px] font-semibold text-rk-ink/45 dark:text-rk-cream/45">
            No hay solicitudes{' '}
            {filter === 'pending'
              ? 'pendientes'
              : filter === 'approved'
              ? 'aprobadas'
              : 'rechazadas'}
            .
          </p>
        </div>
      ) : (
        <div className="mt-4">
          <div className="h-px bg-black/[0.075] dark:bg-white/[0.09]" />
          {requests.map((req, i) => (
            <FilaAprobacion
              key={req.id}
              req={req}
              adminUid={firebaseUser?.uid}
              actionable={filter === 'pending'}
              ultimo={i === requests.length - 1}
            />
          ))}
          {max && requests.length >= max && (
            <p className="text-center text-[11px] font-semibold text-rk-ink/35 dark:text-rk-cream/35 py-4">
              Mostrando las {max} más recientes
            </p>
          )}
        </div>
      )}
    </div>
  )
}

function FilaAprobacion({ req, adminUid, actionable, ultimo }) {
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

  const negativo = (req.points || 0) < 0

  return (
    <div
      className={cn(
        'py-3.5',
        !ultimo && 'border-b border-black/[0.075] dark:border-white/[0.09]',
        busy && 'opacity-50'
      )}
    >
      <div className="flex items-center gap-3">
        <span className="text-[22px] w-8 text-center shrink-0">
          {action?.icon ?? '✨'}
        </span>
        <Avatar name={req.userName} size="sm" />
        <div className="flex-1 min-w-0">
          <div className="text-[13px] font-extrabold truncate">
            {req.userName}
          </div>
          <div className="text-[11px] font-semibold text-rk-ink/45 dark:text-rk-cream/45 truncate">
            {req.actionLabel}
          </div>
        </div>
        <div className="text-right shrink-0">
          <div
            className={cn(
              'text-[15px] font-black',
              negativo ? 'text-red-500' : 'text-rk-orange'
            )}
          >
            {negativo ? '' : '+'}
            {req.points}
          </div>
          <div className="text-[9.5px] font-bold text-rk-ink/35 dark:text-rk-cream/35 flex items-center justify-end gap-0.5">
            <Clock size={9} />
            {relativeDate(req.createdAt)}
          </div>
        </div>
      </div>

      {/* Notas */}
      {req.notes && (
        <>
          <button
            onClick={() => setExpanded((e) => !e)}
            className="flex items-center gap-1 text-[10.5px] font-bold text-rk-ink/45 dark:text-rk-cream/45 mt-2 ml-[44px]"
          >
            <ChevronDown
              size={12}
              className={cn('transition-transform', expanded && 'rotate-180')}
            />
            {expanded ? 'Ocultar notas' : 'Ver notas'}
          </button>
          {expanded && (
            <p className="text-[12px] font-medium text-rk-ink/70 dark:text-rk-cream/70 leading-relaxed mt-1.5 ml-[44px] pl-3 border-l-2 border-black/10 dark:border-white/15">
              {req.notes}
            </p>
          )}
        </>
      )}

      {error && (
        <div className="text-[11px] font-bold text-red-500 mt-2 ml-[44px]">
          {error}
        </div>
      )}

      {/* Acciones */}
      {actionable && (
        <div className="flex gap-2 mt-3 ml-[44px]">
          <button
            disabled={busy}
            onClick={() => handle(() => approveRequest({ requestId: req.id, adminUid }))}
            className="px-5 py-2 rounded-xl bg-rk-ink dark:bg-rk-cream text-rk-cream dark:text-rk-ink text-[12px] font-extrabold active:scale-[0.97] transition disabled:opacity-40"
          >
            Aprobar
          </button>
          <button
            disabled={busy}
            onClick={() => handle(() => rejectRequest({ requestId: req.id, adminUid }))}
            className="px-4 py-2 rounded-xl text-red-500 text-[12px] font-bold hover:bg-red-500/[0.08] active:scale-[0.97] transition disabled:opacity-40"
          >
            Rechazar
          </button>
        </div>
      )}
    </div>
  )
}
