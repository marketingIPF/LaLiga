import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Clock, CheckCircle2, XCircle, Inbox } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { useActionRequests } from '../hooks/useActionRequests'
import { ACTION_TYPES } from '../lib/constants'
import { formatPoints, relativeDate, cn } from '../lib/utils'
import GlassCard from '../components/ui/GlassCard'

const FILTROS = [
  { id: 'todas', label: 'Todas' },
  { id: 'pending', label: 'Pendientes' },
  { id: 'approved', label: 'Aprobadas' },
  { id: 'rejected', label: 'Rechazadas' },
]

// ====================================================================
// Tu actividad · historial propio de solicitudes
// --------------------------------------------------------------------
// Todo lo que has registrado, con su estado y sus puntos. Aquí puedes
// comprobar si algo sigue pendiente o si te lo aprobaron.
// ====================================================================
export default function Actividad() {
  const { profile } = useAuth()
  const navigate = useNavigate()
  const { requests, loading } = useActionRequests({ userId: profile?.id })
  const [filtro, setFiltro] = useState('todas')

  const resumen = useMemo(() => {
    const aprobadas = requests.filter((r) => r.status === 'approved')
    return {
      puntos: aprobadas.reduce((acc, r) => acc + (r.points || 0), 0),
      aprobadas: aprobadas.length,
      pendientes: requests.filter((r) => r.status === 'pending').length,
      rechazadas: requests.filter((r) => r.status === 'rejected').length,
    }
  }, [requests])

  const visibles = useMemo(
    () => (filtro === 'todas' ? requests : requests.filter((r) => r.status === filtro)),
    [requests, filtro]
  )

  return (
    <div className="space-y-4 animate-fade-in pb-8">
      <header className="flex items-center gap-3 pt-4 pb-1">
        <button
          onClick={() => navigate(-1)}
          className="w-10 h-10 rounded-full glass flex items-center justify-center shrink-0"
          aria-label="Volver"
        >
          <ArrowLeft size={18} />
        </button>
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-rk-ink/50 dark:text-rk-cream/50">
            Historial
          </p>
          <h1 className="text-2xl font-black">Tu actividad</h1>
        </div>
      </header>

      {/* Resumen */}
      <div className="grid grid-cols-3 rounded-2xl overflow-hidden glass">
        <div className="py-3.5 text-center border-r border-black/[0.06] dark:border-white/[0.07]">
          <div className="text-xl font-black text-rk-orange">
            {formatPoints(resumen.puntos)}
          </div>
          <div className="text-[8.5px] font-bold uppercase tracking-wider text-rk-ink/45 dark:text-rk-cream/45 mt-0.5">
            Puntos
          </div>
        </div>
        <div className="py-3.5 text-center border-r border-black/[0.06] dark:border-white/[0.07]">
          <div className="text-xl font-black">{resumen.aprobadas}</div>
          <div className="text-[8.5px] font-bold uppercase tracking-wider text-rk-ink/45 dark:text-rk-cream/45 mt-0.5">
            Aprobadas
          </div>
        </div>
        <div className="py-3.5 text-center">
          <div
            className={cn(
              'text-xl font-black',
              resumen.pendientes > 0 && 'text-amber-500'
            )}
          >
            {resumen.pendientes}
          </div>
          <div className="text-[8.5px] font-bold uppercase tracking-wider text-rk-ink/45 dark:text-rk-cream/45 mt-0.5">
            Pendientes
          </div>
        </div>
      </div>

      {/* Filtros */}
      <div className="glass rounded-2xl p-1 flex gap-1">
        {FILTROS.map((f) => (
          <button
            key={f.id}
            onClick={() => setFiltro(f.id)}
            className={cn(
              'flex-1 py-2 rounded-xl font-bold text-[11px] transition-all',
              filtro === f.id
                ? 'bg-rk-orange text-white shadow-md shadow-rk-orange/20'
                : 'text-rk-ink/55 dark:text-rk-cream/55'
            )}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Listado */}
      {loading ? (
        <p className="text-center text-sm text-rk-ink/60 dark:text-rk-cream/60 py-12">
          Cargando…
        </p>
      ) : visibles.length === 0 ? (
        <GlassCard className="text-center py-14">
          <div className="w-14 h-14 rounded-full bg-rk-orange/10 flex items-center justify-center mx-auto mb-3">
            <Inbox size={24} className="text-rk-orange" />
          </div>
          <p className="font-bold text-sm">
            {filtro === 'todas'
              ? 'Aún no has registrado nada'
              : `No tienes solicitudes ${
                  filtro === 'pending'
                    ? 'pendientes'
                    : filtro === 'approved'
                    ? 'aprobadas'
                    : 'rechazadas'
                }`}
          </p>
          {filtro === 'todas' && (
            <p className="text-xs text-rk-ink/55 dark:text-rk-cream/55 mt-1.5 px-8">
              Cuando registres una acción, aparecerá aquí con su estado.
            </p>
          )}
        </GlassCard>
      ) : (
        <div className="space-y-2">
          {visibles.map((r) => (
            <FilaActividad key={r.id} req={r} />
          ))}
        </div>
      )}
    </div>
  )
}

function FilaActividad({ req }) {
  const action = ACTION_TYPES[req.actionType]
  const estados = {
    pending: { label: 'Pendiente', Icon: Clock, color: 'text-amber-500' },
    approved: { label: 'Aprobada', Icon: CheckCircle2, color: 'text-emerald-500' },
    rejected: { label: 'Rechazada', Icon: XCircle, color: 'text-red-500' },
  }
  const st = estados[req.status] ?? estados.pending
  const negativo = (req.points || 0) < 0

  return (
    <div
      className={cn(
        'glass rounded-2xl p-3.5',
        req.status === 'rejected' && 'opacity-65'
      )}
    >
      <div className="flex items-center gap-3">
        <div className="text-2xl shrink-0">{action?.icon ?? '✨'}</div>
        <div className="flex-1 min-w-0">
          <div className="text-[13px] font-bold truncate">{req.actionLabel}</div>
          <div className="text-[11px] text-rk-ink/50 dark:text-rk-cream/50 mt-0.5">
            {relativeDate(req.createdAt)}
          </div>
        </div>
        <div className={cn('flex items-center gap-1 text-[11px] font-bold shrink-0', st.color)}>
          <st.Icon size={13} />
          {st.label}
        </div>
        <div
          className={cn(
            'text-sm font-black whitespace-nowrap shrink-0 w-11 text-right',
            req.status === 'rejected'
              ? 'text-rk-ink/35 dark:text-rk-cream/35 line-through'
              : negativo
              ? 'text-red-500'
              : 'text-rk-orange'
          )}
        >
          {negativo ? '' : '+'}
          {req.points}
        </div>
      </div>

      {req.notes && (
        <p className="text-[11.5px] text-rk-ink/60 dark:text-rk-cream/60 mt-2.5 pt-2.5 border-t border-black/[0.05] dark:border-white/[0.06] leading-relaxed">
          {req.notes}
        </p>
      )}
    </div>
  )
}
