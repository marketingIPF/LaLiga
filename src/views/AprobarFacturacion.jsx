import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ChevronLeft,
  Clock,
  CheckCircle2,
  XCircle,
  Euro,
  Check,
  X,
} from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import {
  useBillingRequests,
  approveBillingRequest,
  rejectBillingRequest,
} from '../hooks/useBillingRequests'
import { relativeDate } from '../lib/utils'
import GlassCard from '../components/ui/GlassCard'
import Avatar from '../components/ui/Avatar'

const FILTERS = [
  { id: 'pending', label: 'Pendientes', Icon: Clock },
  { id: 'approved', label: 'Aprobadas', Icon: CheckCircle2 },
  { id: 'rejected', label: 'Rechazadas', Icon: XCircle },
]

const formatEur = (n) =>
  new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(n ?? 0)

export default function AprobarFacturacion() {
  const { firebaseUser, isAdmin } = useAuth()
  const navigate = useNavigate()
  const [filter, setFilter] = useState('pending')
  const { requests, loading } = useBillingRequests({ status: filter })

  if (!isAdmin) return null

  const pendingTotal = requests
    .filter((r) => r.status === 'pending')
    .reduce((acc, r) => acc + (r.amount ?? 0), 0)

  return (
    <div className="space-y-5 animate-fade-in">
      <button
        onClick={() => navigate(-1)}
        className="flex items-center gap-1.5 text-sm font-semibold text-rk-ink/60 dark:text-rk-cream/60 -ml-1"
      >
        <ChevronLeft size={18} /> Volver
      </button>

      <div>
        <h1 className="text-2xl font-black">Aprobar facturación</h1>
        <p className="text-sm text-rk-ink/60 dark:text-rk-cream/60 mt-1">
          Aprueba o rechaza el importe que ha reportado cada agente.
        </p>
      </div>

      {filter === 'pending' && requests.length > 0 && (
        <GlassCard className="!p-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-rk-ink/50 dark:text-rk-cream/50">
            En espera
          </p>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-2xl font-black">{requests.length}</span>
            <span className="text-sm text-rk-ink/60 dark:text-rk-cream/60">
              · {formatEur(pendingTotal)}
            </span>
          </div>
        </GlassCard>
      )}

      {/* Filter pills */}
      <div className="flex gap-2">
        {FILTERS.map((f) => (
          <button
            key={f.id}
            onClick={() => setFilter(f.id)}
            className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-full text-xs font-bold transition ${
              filter === f.id
                ? 'bg-rk-orange text-white'
                : 'bg-black/5 dark:bg-white/5 text-rk-ink/70 dark:text-rk-cream/70'
            }`}
          >
            <f.Icon size={13} /> {f.label}
          </button>
        ))}
      </div>

      {/* Lista */}
      {loading ? (
        <GlassCard className="text-center py-6 text-sm text-rk-ink/60 dark:text-rk-cream/60">
          Cargando…
        </GlassCard>
      ) : requests.length === 0 ? (
        <GlassCard className="text-center py-8">
          <Euro size={32} className="mx-auto text-rk-ink/30 dark:text-rk-cream/30 mb-2" />
          <p className="text-sm font-semibold text-rk-ink/60 dark:text-rk-cream/60">
            No hay facturaciones {FILTERS.find((f) => f.id === filter)?.label.toLowerCase()}
          </p>
        </GlassCard>
      ) : (
        <div className="space-y-2">
          {requests.map((req) => (
            <BillingCard key={req.id} req={req} adminUid={firebaseUser?.uid} />
          ))}
        </div>
      )}
    </div>
  )
}

function BillingCard({ req, adminUid }) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)

  const status = req.status
  const isPending = status === 'pending'
  const isApproved = status === 'approved'

  async function handleApprove() {
    setError(null)
    setBusy(true)
    try {
      await approveBillingRequest({ requestId: req.id, adminUid })
    } catch (e) {
      setError(e.message ?? 'No se pudo aprobar')
      setBusy(false)
    }
  }

  async function handleReject() {
    setError(null)
    setBusy(true)
    try {
      await rejectBillingRequest({ requestId: req.id, adminUid })
    } catch (e) {
      setError(e.message ?? 'No se pudo rechazar')
      setBusy(false)
    }
  }

  return (
    <GlassCard className="!p-4 space-y-3">
      <div className="flex items-center gap-3">
        <Avatar name={req.userName} size="sm" />
        <div className="flex-1 min-w-0">
          <div className="font-bold text-sm truncate">{req.userName}</div>
          <div className="text-xs text-rk-ink/50 dark:text-rk-cream/50">
            {relativeDate(req.createdAt)}
          </div>
        </div>
        <div className="text-right">
          <div className="text-lg font-black">{formatEur(req.amount)}</div>
        </div>
      </div>

      {req.notes && (
        <p className="text-sm text-rk-ink/70 dark:text-rk-cream/70 bg-black/5 dark:bg-white/5 rounded-xl px-3 py-2">
          {req.notes}
        </p>
      )}

      {/* Resultado final (aprobada) */}
      {isApproved && (
        <div className="flex items-center justify-between bg-green-500/10 rounded-xl px-3 py-2">
          <div className="text-xs font-semibold text-green-700 dark:text-green-400">
            Aprobada
          </div>
          <div className="text-base font-black text-green-700 dark:text-green-400">
            {formatEur(req.finalAmount ?? req.amount)}
          </div>
        </div>
      )}

      {status === 'rejected' && (
        <div className="bg-red-500/10 text-red-500 text-xs font-semibold text-center py-2 rounded-xl">
          Rechazada
        </div>
      )}

      {error && (
        <div className="bg-red-500/10 text-red-500 text-xs font-semibold text-center py-2 rounded-xl">
          {error}
        </div>
      )}

      {isPending && (
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={handleReject}
            disabled={busy}
            className="rounded-2xl bg-red-500/10 text-red-500 font-bold py-3 text-sm flex items-center justify-center gap-1.5 active:scale-[0.98] transition-transform disabled:opacity-50"
          >
            <X size={16} /> Rechazar
          </button>
          <button
            onClick={handleApprove}
            disabled={busy}
            className="rounded-2xl bg-emerald-500 text-white font-bold py-3 text-sm flex items-center justify-center gap-1.5 active:scale-[0.98] transition-transform disabled:opacity-50 shadow-md shadow-emerald-500/20"
          >
            <Check size={16} /> Aprobar
          </button>
        </div>
      )}
    </GlassCard>
  )
}
