import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Check, ArrowLeft, Paperclip, Minus, Plus } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { ACTION_TYPES, selfServiceActions } from '../lib/constants'
import { getUserLeague } from '../data/seedUsers'
import { submitActionRequest, maxQuantityFor } from '../hooks/useActionRequests'
import { cn } from '../lib/utils'
import GlassCard from '../components/ui/GlassCard'

// Acciones que exigen enviar una prueba (captura/documento) a un admin
const REQUIRES_PROOF = ['formacion', 'publicar_rrss']

export default function RegistrarAccion() {
  const { profile } = useAuth()
  const navigate = useNavigate()
  const [params] = useSearchParams()

  const league = getUserLeague(profile) ?? 'agentes'
  const AVAILABLE = selfServiceActions(league)

  const [selectedIds, setSelectedIds] = useState(() => {
    const tipo = params.get('tipo')
    return tipo && ACTION_TYPES[tipo] ? new Set([tipo]) : new Set()
  })
  // Cuántas unidades de cada acción (3 publicaciones, 4 reseñas…)
  const [quantities, setQuantities] = useState({})
  const [notes, setNotes] = useState('')
  const [proofConfirmed, setProofConfirmed] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [success, setSuccess] = useState(false)
  const [sentSummary, setSentSummary] = useState({ requests: 0, units: 0 })
  const [error, setError] = useState(null)

  // Si llegan con ?tipo=X, lo añadimos a la selección
  useEffect(() => {
    const t = params.get('tipo')
    if (t && ACTION_TYPES[t]) {
      setSelectedIds((prev) => {
        if (prev.has(t)) return prev
        const next = new Set(prev)
        next.add(t)
        return next
      })
    }
  }, [params])

  function toggle(id) {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
        // Al marcar una acción, arranca en 1
        setQuantities((q) => ({ ...q, [id]: q[id] ?? 1 }))
      }
      return next
    })
  }

  function setQty(action, value) {
    const max = maxQuantityFor(action)
    const n = Math.max(1, Math.min(max, Math.floor(Number(value) || 1)))
    setQuantities((q) => ({ ...q, [action.id]: n }))
  }

  const qtyOf = (id) => quantities[id] ?? 1

  const selectedActions = AVAILABLE.filter((a) => selectedIds.has(a.id))
  const totalPoints = selectedActions.reduce(
    (acc, a) => acc + a.points * qtyOf(a.id),
    0
  )
  const totalUnits = selectedActions.reduce((acc, a) => acc + qtyOf(a.id), 0)
  const count = selectedActions.length

  // ¿Alguna acción seleccionada exige prueba? ¿Y son varias unidades?
  const proofActions = selectedActions.filter((a) => REQUIRES_PROOF.includes(a.id))
  const needsProof = proofActions.length > 0
  const proofPlural =
    proofActions.length > 1 || proofActions.some((a) => qtyOf(a.id) > 1)

  // Si dejan de estar seleccionadas las que piden prueba, reseteamos la casilla
  useEffect(() => {
    if (!needsProof && proofConfirmed) setProofConfirmed(false)
  }, [needsProof, proofConfirmed])

  const handleSubmit = async () => {
    if (count === 0) {
      setError('Selecciona al menos una acción.')
      return
    }
    const needsEvidence = selectedActions.some((a) => a.requiresEvidence)
    if (needsEvidence && notes.trim().length < 10) {
      setError('Para Formación/Entrenamiento, describe en las notas el resultado de tu entrenamiento (mínimo unas palabras).')
      return
    }
    if (needsProof && !proofConfirmed) {
      setError(
        proofPlural
          ? 'Confirma que has enviado las pruebas a Rober o Almudena.'
          : 'Confirma que has enviado la captura o el documento a Rober o Almudena.'
      )
      return
    }
    setSubmitting(true)
    setError(null)
    try {
      // Una solicitud por acción, con su cantidad. Así el admin aprueba
      // "Publicar en RRSS ×3" de una vez en lugar de tres entradas iguales.
      await Promise.all(
        selectedActions.map((a) =>
          submitActionRequest({
            user: profile,
            actionType: a.id,
            notes,
            quantity: qtyOf(a.id),
          })
        )
      )
      setSentSummary({ requests: count, units: totalUnits })
      setSuccess(true)
      setTimeout(() => navigate('/'), 1800)
    } catch (e) {
      console.error(e)
      setError('No se pudieron enviar todas las solicitudes. Revisa el panel.')
    } finally {
      setSubmitting(false)
    }
  }

  if (success) {
    const { requests, units } = sentSummary
    return (
      <div className="flex flex-col items-center justify-center min-h-[70vh] text-center animate-fade-in">
        <div className="w-24 h-24 rounded-full bg-emerald-500 flex items-center justify-center mb-6 shadow-lg shadow-emerald-500/30">
          <Check size={48} strokeWidth={3} className="text-white" />
        </div>
        <h2 className="text-2xl font-black">
          {requests === 1 ? '¡Solicitud enviada!' : `¡${requests} solicitudes enviadas!`}
        </h2>
        <p className="text-sm text-rk-ink/60 dark:text-rk-cream/60 mt-2 px-6">
          {units > requests
            ? `${units} acciones en total. Tus puntos se sumarán cuando un admin las apruebe.`
            : 'Tus puntos se sumarán cuando un admin apruebe las acciones.'}
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-5 animate-fade-in pb-32">
      <header className="flex items-center gap-3 pt-4 pb-2">
        <button
          onClick={() => navigate(-1)}
          className="w-10 h-10 rounded-full glass flex items-center justify-center"
          aria-label="Volver"
        >
          <ArrowLeft size={18} />
        </button>
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-rk-ink/50 dark:text-rk-cream/50">
            Nueva acción
          </p>
          <h1 className="text-2xl font-black">Registrar</h1>
        </div>
      </header>

      <p className="text-sm text-rk-ink/70 dark:text-rk-cream/70">
        Marca las acciones que apliquen y ajusta la cantidad si has hecho
        varias. Un admin las validará y sumará los puntos.
      </p>

      <div className="space-y-2.5">
        {AVAILABLE.map((action) => {
          const isSelected = selectedIds.has(action.id)
          const qty = qtyOf(action.id)
          const max = maxQuantityFor(action)
          return (
            <div
              key={action.id}
              onClick={() => toggle(action.id)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => e.key === 'Enter' && toggle(action.id)}
              className={cn(
                'w-full rounded-2xl p-4 text-left transition-all cursor-pointer',
                isSelected
                  ? 'bg-rk-orange/10 dark:bg-rk-orange/15 ring-2 ring-rk-orange'
                  : 'glass active:scale-[0.98]'
              )}
            >
              <div className="flex items-center gap-3">
                <div className="text-2xl">{action.icon}</div>
                <div className="flex-1 min-w-0">
                  <div className="font-bold leading-tight">{action.label}</div>
                  <div className="text-xs mt-0.5 text-rk-ink/60 dark:text-rk-cream/60">
                    {action.description}
                  </div>
                </div>
                <div className="flex items-center gap-2.5 shrink-0">
                  <div className="font-black text-sm whitespace-nowrap text-rk-orange">
                    +{action.points}
                  </div>
                  {isSelected ? (
                    <div className="w-6 h-6 rounded-full bg-rk-orange flex items-center justify-center">
                      <Check size={14} strokeWidth={3} className="text-white" />
                    </div>
                  ) : (
                    <div className="w-6 h-6 rounded-full border-2 border-rk-ink/20 dark:border-rk-cream/20" />
                  )}
                </div>
              </div>

              {/* Selector de cantidad */}
              {isSelected && max > 1 && (
                <div
                  onClick={(e) => e.stopPropagation()}
                  className="mt-3.5 pt-3.5 border-t border-rk-orange/20 flex items-center gap-3"
                >
                  <span className="text-xs font-bold uppercase tracking-wider text-rk-ink/55 dark:text-rk-cream/55">
                    ¿Cuántas?
                  </span>
                  <div className="flex items-center gap-2 ml-auto">
                    <button
                      onClick={() => setQty(action, qty - 1)}
                      disabled={qty <= 1}
                      className="w-9 h-9 rounded-xl bg-white dark:bg-rk-ink-card ring-1 ring-rk-orange/25 flex items-center justify-center disabled:opacity-35 active:scale-95 transition"
                      aria-label="Quitar una"
                    >
                      <Minus size={16} />
                    </button>
                    <span className="w-9 text-center text-lg font-black tabular-nums">
                      {qty}
                    </span>
                    <button
                      onClick={() => setQty(action, qty + 1)}
                      disabled={qty >= max}
                      className="w-9 h-9 rounded-xl bg-rk-orange text-white flex items-center justify-center disabled:opacity-35 active:scale-95 transition"
                      aria-label="Añadir una"
                    >
                      <Plus size={16} />
                    </button>
                  </div>
                  <div className="w-20 text-right">
                    <div className="text-sm font-black text-rk-orange">
                      +{action.points * qty}
                    </div>
                    {qty >= max && (
                      <div className="text-[9.5px] font-semibold text-rk-ink/40 dark:text-rk-cream/40">
                        máx. {max}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Aviso de prueba obligatoria */}
      {needsProof && (
        <div className="rounded-2xl bg-rk-orange/10 ring-1 ring-rk-orange/30 p-4 space-y-3">
          <div className="flex gap-3">
            <div className="w-9 h-9 rounded-xl bg-rk-orange/20 text-rk-orange flex items-center justify-center shrink-0">
              <Paperclip size={17} />
            </div>
            <div className="text-sm text-rk-ink/80 dark:text-rk-cream/80 leading-relaxed">
              <span className="font-bold">Tienes que demostrarlo.</span>{' '}
              {proofPlural ? (
                <>
                  Envía <span className="font-bold">todas las capturas</span> a{' '}
                </>
              ) : (
                <>Envía la captura o el documento a </>
              )}
              <span className="font-bold">Rober</span> o{' '}
              <span className="font-bold">Almudena</span> por Slack o WhatsApp.
              Sin la prueba no se validan los puntos.
            </div>
          </div>
          <button
            onClick={() => setProofConfirmed((v) => !v)}
            className={cn(
              'w-full flex items-center gap-2.5 p-3 rounded-xl text-left text-sm font-bold transition-all active:scale-[0.98]',
              proofConfirmed
                ? 'bg-rk-orange text-white'
                : 'bg-white dark:bg-rk-ink-card ring-1 ring-rk-orange/30'
            )}
          >
            <div
              className={cn(
                'w-5 h-5 rounded-md flex items-center justify-center shrink-0',
                proofConfirmed ? 'bg-white' : 'border-2 border-rk-orange/40'
              )}
            >
              {proofConfirmed && (
                <Check size={13} strokeWidth={3} className="text-rk-orange" />
              )}
            </div>
            {proofPlural
              ? 'Ya he enviado las pruebas a Rober o Almudena'
              : 'Ya he enviado la prueba a Rober o Almudena'}
          </button>
        </div>
      )}

      <GlassCard>
        <label className="block text-xs font-semibold uppercase tracking-wider text-rk-ink/50 dark:text-rk-cream/50 mb-2">
          {selectedActions.some((a) => a.requiresEvidence)
            ? 'Notas · resultado del entrenamiento (obligatorio)'
            : 'Notas (opcional)'}
        </label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Añade un detalle: dirección, cliente, enlace…"
          rows={3}
          maxLength={280}
          className="w-full bg-transparent outline-none text-sm placeholder:text-rk-ink/40 dark:placeholder:text-rk-cream/40 resize-none"
        />
        <div className="text-right text-[10px] text-rk-ink/40 dark:text-rk-cream/40">
          {notes.length}/280
        </div>
      </GlassCard>

      {error && (
        <div className="rounded-2xl bg-red-500/10 text-red-600 dark:text-red-400 text-sm font-semibold px-4 py-3">
          {error}
        </div>
      )}

      <button
        onClick={handleSubmit}
        disabled={count === 0 || submitting || (needsProof && !proofConfirmed)}
        className="btn-primary w-full py-4 text-base"
      >
        {submitting
          ? 'Enviando…'
          : count === 0
          ? 'Selecciona una acción'
          : `Enviar ${count === 1 ? 'solicitud' : `${count} solicitudes`} · +${totalPoints} pts`}
      </button>
    </div>
  )
}
