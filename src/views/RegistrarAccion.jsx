import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Check, ArrowLeft, Paperclip, Minus, Plus } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { ACTION_TYPES, selfServiceActions } from '../lib/constants'
import { getUserLeague } from '../data/seedUsers'
import { submitActionRequest, maxQuantityFor } from '../hooks/useActionRequests'
import { cn } from '../lib/utils'

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
  const [quantities, setQuantities] = useState({})
  const [notes, setNotes] = useState('')
  const [proofConfirmed, setProofConfirmed] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [success, setSuccess] = useState(false)
  const [sentSummary, setSentSummary] = useState({ requests: 0, units: 0 })
  const [error, setError] = useState(null)

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

  const proofActions = selectedActions.filter((a) => REQUIRES_PROOF.includes(a.id))
  const needsProof = proofActions.length > 0
  const proofPlural =
    proofActions.length > 1 || proofActions.some((a) => qtyOf(a.id) > 1)
  const needsEvidence = selectedActions.some((a) => a.requiresEvidence)

  useEffect(() => {
    if (!needsProof && proofConfirmed) setProofConfirmed(false)
  }, [needsProof, proofConfirmed])

  const handleSubmit = async () => {
    if (count === 0) {
      setError('Selecciona al menos una acción.')
      return
    }
    if (needsEvidence && notes.trim().length < 10) {
      setError('Para Formación/Entrenamiento, describe en las notas el resultado de tu entrenamiento.')
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
        <div className="w-20 h-20 rounded-full bg-emerald-500 flex items-center justify-center mb-6 shadow-lg shadow-emerald-500/30">
          <Check size={40} strokeWidth={3} className="text-white" />
        </div>
        <h2 className="text-2xl font-black tracking-tight">
          {requests === 1 ? '¡Solicitud enviada!' : `¡${requests} solicitudes enviadas!`}
        </h2>
        <p className="text-[13px] font-semibold text-rk-ink/50 dark:text-rk-cream/50 mt-2.5 px-8 leading-relaxed">
          {units > requests
            ? `${units} acciones en total. Tus puntos se sumarán cuando un admin las apruebe.`
            : 'Tus puntos se sumarán cuando un admin apruebe las acciones.'}
        </p>
      </div>
    )
  }

  return (
    <div className="animate-fade-in pb-32">
      {/* Cabecera */}
      <header className="flex items-center gap-3 pt-4 pb-3">
        <button
          onClick={() => navigate(-1)}
          className="w-9 h-9 rounded-full bg-black/[0.05] dark:bg-white/[0.07] flex items-center justify-center shrink-0 active:scale-95 transition-transform"
          aria-label="Volver"
        >
          <ArrowLeft size={17} />
        </button>
        <div>
          <p className="text-[9.5px] font-extrabold uppercase tracking-[1.7px] text-rk-ink/38 dark:text-rk-cream/38">
            Nueva acción
          </p>
          <h1 className="text-[21px] font-black tracking-tight mt-0.5">Registrar</h1>
        </div>
      </header>

      <p className="text-[12.5px] font-semibold text-rk-ink/55 dark:text-rk-cream/55 leading-relaxed pb-3">
        Marca lo que hayas hecho y ajusta la cantidad si has hecho varias.
      </p>

      <div className="h-px bg-black/[0.075] dark:bg-white/[0.09]" />

      {/* Acciones */}
      {AVAILABLE.map((action, i) => {
        const isSelected = selectedIds.has(action.id)
        const qty = qtyOf(action.id)
        const max = maxQuantityFor(action)
        return (
          <div key={action.id}>
            <div
              onClick={() => toggle(action.id)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => e.key === 'Enter' && toggle(action.id)}
              className={cn(
                'py-3.5 cursor-pointer transition-colors',
                isSelected && 'bg-rk-orange/[0.055] -mx-4 px-4 rounded-xl'
              )}
            >
              <div className="flex items-center gap-3">
                <span className="text-[22px] w-8 text-center shrink-0">
                  {action.icon}
                </span>
                <div className="flex-1 min-w-0">
                  <div className="text-[13px] font-black leading-tight">
                    {action.label}
                  </div>
                  <div className="text-[10.5px] font-semibold text-rk-ink/45 dark:text-rk-cream/45 mt-0.5 leading-snug">
                    {action.description}
                  </div>
                </div>
                <span className="text-[13px] font-black text-rk-orange shrink-0">
                  +{action.points}
                </span>
                <div
                  className={cn(
                    'w-[22px] h-[22px] rounded-full flex items-center justify-center shrink-0 transition-all',
                    isSelected
                      ? 'bg-rk-orange text-white'
                      : 'border-2 border-black/[0.13] dark:border-white/20'
                  )}
                >
                  {isSelected && <Check size={12} strokeWidth={3.5} />}
                </div>
              </div>

              {/* Cantidad */}
              {isSelected && max > 1 && (
                <div
                  onClick={(e) => e.stopPropagation()}
                  className="flex items-center gap-3 mt-3 pt-3 border-t border-rk-orange/20"
                >
                  <span className="text-[10px] font-extrabold uppercase tracking-wider text-rk-ink/45 dark:text-rk-cream/45">
                    ¿Cuántas?
                  </span>
                  <div className="flex items-center gap-2 ml-auto">
                    <button
                      onClick={() => setQty(action, qty - 1)}
                      disabled={qty <= 1}
                      className="w-8 h-8 rounded-[10px] bg-white dark:bg-rk-ink-card ring-1 ring-rk-orange/25 flex items-center justify-center disabled:opacity-30 active:scale-95 transition"
                      aria-label="Quitar una"
                    >
                      <Minus size={15} />
                    </button>
                    <span className="w-7 text-center text-[16px] font-black tabular-nums">
                      {qty}
                    </span>
                    <button
                      onClick={() => setQty(action, qty + 1)}
                      disabled={qty >= max}
                      className="w-8 h-8 rounded-[10px] bg-rk-orange text-white flex items-center justify-center disabled:opacity-30 active:scale-95 transition"
                      aria-label="Añadir una"
                    >
                      <Plus size={15} />
                    </button>
                  </div>
                  <div className="w-16 text-right">
                    <div className="text-[13px] font-black text-rk-orange">
                      +{action.points * qty}
                    </div>
                    {qty >= max && (
                      <div className="text-[9px] font-bold text-rk-ink/35 dark:text-rk-cream/35">
                        máx. {max}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
            {i < AVAILABLE.length - 1 && (
              <div className="h-px bg-black/[0.075] dark:bg-white/[0.09]" />
            )}
          </div>
        )
      })}

      <div className="h-px bg-black/[0.075] dark:bg-white/[0.09]" />

      {/* Prueba obligatoria */}
      {needsProof && (
        <div className="mt-4 rounded-2xl bg-rk-orange/[0.08] ring-1 ring-rk-orange/25 p-3.5">
          <div className="flex gap-3">
            <Paperclip size={16} className="text-rk-orange shrink-0 mt-0.5" />
            <p className="text-[12px] font-semibold text-rk-ink/75 dark:text-rk-cream/75 leading-relaxed">
              <span className="font-black">Tienes que demostrarlo.</span>{' '}
              {proofPlural ? (
                <>Envía <span className="font-black">todas las capturas</span> a </>
              ) : (
                <>Envía la captura o el documento a </>
              )}
              <span className="font-black">Rober</span> o{' '}
              <span className="font-black">Almudena</span> por Slack o WhatsApp.
            </p>
          </div>
          <button
            onClick={() => setProofConfirmed((v) => !v)}
            className={cn(
              'w-full flex items-center gap-2.5 mt-3 p-2.5 rounded-xl text-left text-[12px] font-extrabold transition-all active:scale-[0.98]',
              proofConfirmed
                ? 'bg-rk-orange text-white'
                : 'bg-white dark:bg-rk-ink-card ring-1 ring-rk-orange/25'
            )}
          >
            <div
              className={cn(
                'w-[18px] h-[18px] rounded-[6px] flex items-center justify-center shrink-0',
                proofConfirmed ? 'bg-white' : 'border-2 border-rk-orange/35'
              )}
            >
              {proofConfirmed && (
                <Check size={12} strokeWidth={3.5} className="text-rk-orange" />
              )}
            </div>
            {proofPlural
              ? 'Ya he enviado las pruebas'
              : 'Ya he enviado la prueba'}
          </button>
        </div>
      )}

      {/* Notas */}
      <div className="mt-5">
        <label className="block text-[9.5px] font-extrabold uppercase tracking-[1.3px] text-rk-ink/40 dark:text-rk-cream/40 mb-2">
          {needsEvidence
            ? 'Notas · resultado del entrenamiento (obligatorio)'
            : 'Notas (opcional)'}
        </label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Añade un detalle: dirección, cliente, enlace…"
          rows={3}
          maxLength={280}
          className={cn(
            'w-full bg-black/[0.035] dark:bg-white/[0.05] rounded-2xl px-4 py-3 text-[13px] font-semibold outline-none resize-none transition-shadow',
            'placeholder:text-rk-ink/30 dark:placeholder:text-rk-cream/30',
            'focus:ring-2 focus:ring-rk-orange/40',
            needsEvidence && notes.trim().length < 10 && 'ring-1 ring-amber-400/50'
          )}
        />
        <div className="text-right text-[9.5px] font-bold text-rk-ink/30 dark:text-rk-cream/30 mt-1">
          {notes.length}/280
        </div>
      </div>

      {error && (
        <div className="mt-3 rounded-2xl bg-red-500/10 text-red-600 dark:text-red-400 text-[12.5px] font-bold px-4 py-3">
          {error}
        </div>
      )}

      {/* Barra de envío fija */}
      <div
        className="fixed left-3 right-3 z-30"
        style={{ bottom: 'calc(6.75rem + var(--safe-bottom, 0px))' }}
      >
        <button
          onClick={handleSubmit}
          disabled={count === 0 || submitting || (needsProof && !proofConfirmed)}
          className={cn(
            'w-full rounded-2xl py-4 text-[14.5px] font-black transition-all active:scale-[0.98]',
            count === 0 || (needsProof && !proofConfirmed)
              ? 'bg-black/[0.09] dark:bg-white/[0.12] text-rk-ink/35 dark:text-rk-cream/35'
              : 'bg-rk-orange text-white shadow-orange-glow'
          )}
        >
          {submitting
            ? 'Enviando…'
            : count === 0
            ? 'Selecciona una acción'
            : `Enviar ${count === 1 ? 'solicitud' : `${count} solicitudes`} · +${totalPoints} pts`}
        </button>
      </div>
    </div>
  )
}
