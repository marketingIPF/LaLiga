import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Check, ArrowLeft } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { ACTION_LIST, ACTION_TYPES } from '../lib/constants'
import { submitActionRequest } from '../hooks/useActionRequests'
import { cn } from '../lib/utils'
import GlassCard from '../components/ui/GlassCard'

export default function RegistrarAccion() {
  const { profile } = useAuth()
  const navigate = useNavigate()
  const [params] = useSearchParams()

  const [selectedIds, setSelectedIds] = useState(() => {
    const tipo = params.get('tipo')
    return tipo && ACTION_TYPES[tipo] ? new Set([tipo]) : new Set()
  })
  const [notes, setNotes] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [success, setSuccess] = useState(false)
  const [sentCount, setSentCount] = useState(0)
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
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const selectedActions = ACTION_LIST.filter((a) => selectedIds.has(a.id))
  const totalPoints = selectedActions.reduce((acc, a) => acc + a.points, 0)
  const count = selectedActions.length

  const handleSubmit = async () => {
    if (count === 0) {
      setError('Selecciona al menos una acción.')
      return
    }
    setSubmitting(true)
    setError(null)
    try {
      // Cada acción seleccionada es una solicitud independiente para que
      // el admin pueda aprobarlas/rechazarlas por separado si quiere.
      await Promise.all(
        selectedActions.map((a) =>
          submitActionRequest({ user: profile, actionType: a.id, notes })
        )
      )
      setSentCount(count)
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
    return (
      <div className="flex flex-col items-center justify-center min-h-[70vh] text-center animate-fade-in">
        <div className="w-24 h-24 rounded-full bg-emerald-500 flex items-center justify-center mb-6 shadow-lg shadow-emerald-500/30">
          <Check size={48} strokeWidth={3} className="text-white" />
        </div>
        <h2 className="text-2xl font-black">
          {sentCount === 1 ? '¡Solicitud enviada!' : `¡${sentCount} solicitudes enviadas!`}
        </h2>
        <p className="text-sm text-rk-ink/60 dark:text-rk-cream/60 mt-2 px-6">
          Tus puntos se sumarán cuando un admin apruebe las acciones.
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
        Marca todas las acciones que apliquen (por ejemplo, captación + exclusiva). Un admin las validará y sumará los puntos.
      </p>

      <div className="space-y-2.5">
        {ACTION_LIST.map((action) => {
          const isSelected = selectedIds.has(action.id)
          return (
            <button
              key={action.id}
              onClick={() => toggle(action.id)}
              className={cn(
                'w-full flex items-center gap-3 p-4 rounded-2xl text-left transition-all active:scale-[0.98]',
                isSelected
                  ? 'bg-rk-orange/10 dark:bg-rk-orange/15 ring-2 ring-rk-orange'
                  : 'glass'
              )}
            >
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
            </button>
          )
        })}
      </div>

      <GlassCard>
        <label className="block text-xs font-semibold uppercase tracking-wider text-rk-ink/50 dark:text-rk-cream/50 mb-2">
          Notas (opcional)
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
        disabled={count === 0 || submitting}
        className="btn-primary w-full py-4 text-base"
      >
        {submitting
          ? 'Enviando…'
          : count === 0
          ? 'Selecciona una acción'
          : count === 1
          ? `Enviar solicitud · +${totalPoints} pts`
          : `Enviar ${count} solicitudes · +${totalPoints} pts`}
      </button>
    </div>
  )
}
