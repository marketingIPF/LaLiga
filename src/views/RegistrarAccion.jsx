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

  const [selected, setSelected] = useState(params.get('tipo') || null)
  const [notes, setNotes] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    const t = params.get('tipo')
    if (t && ACTION_TYPES[t]) setSelected(t)
  }, [params])

  const handleSubmit = async () => {
    if (!selected) {
      setError('Selecciona el tipo de acción.')
      return
    }
    setSubmitting(true)
    setError(null)
    try {
      await submitActionRequest({ user: profile, actionType: selected, notes })
      setSuccess(true)
      setTimeout(() => navigate('/'), 1600)
    } catch (e) {
      console.error(e)
      setError('No se pudo enviar tu solicitud. Inténtalo de nuevo.')
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
        <h2 className="text-2xl font-black">¡Solicitud enviada!</h2>
        <p className="text-sm text-rk-ink/60 dark:text-rk-cream/60 mt-2 px-6">
          Tus puntos se sumarán cuando un codirector apruebe la acción.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-5 animate-fade-in">
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
        Selecciona qué has hecho. Un codirector validará la acción y sumará los puntos a tu liga.
      </p>

      <div className="space-y-2.5">
        {ACTION_LIST.map((action) => (
          <button
            key={action.id}
            onClick={() => setSelected(action.id)}
            className={cn(
              'w-full flex items-center gap-3 p-4 rounded-2xl text-left transition-all active:scale-[0.98]',
              selected === action.id
                ? 'bg-rk-orange text-white shadow-lg shadow-rk-orange/30'
                : 'glass'
            )}
          >
            <div className="text-2xl">{action.icon}</div>
            <div className="flex-1 min-w-0">
              <div className="font-bold leading-tight">{action.label}</div>
              <div
                className={cn(
                  'text-xs mt-0.5',
                  selected === action.id ? 'text-white/80' : 'text-rk-ink/60 dark:text-rk-cream/60'
                )}
              >
                {action.description}
              </div>
            </div>
            <div
              className={cn(
                'font-black text-sm whitespace-nowrap',
                selected === action.id ? 'text-white' : 'text-rk-orange'
              )}
            >
              +{action.points}
            </div>
          </button>
        ))}
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
        disabled={!selected || submitting}
        className="btn-primary w-full py-4 text-base"
      >
        {submitting ? 'Enviando…' : 'Enviar solicitud'}
      </button>
    </div>
  )
}
