import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ChevronLeft, CheckCircle2, Euro } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { submitBillingRequest } from '../hooks/useBillingRequests'
import GlassCard from '../components/ui/GlassCard'

export default function RegistrarFacturacion() {
  const { profile } = useAuth()
  const navigate = useNavigate()

  const [amount, setAmount] = useState('')
  const [notes, setNotes] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState(null)

  async function handleSubmit() {
    setError(null)
    const numeric = Number(amount.replace(',', '.'))
    if (!Number.isFinite(numeric) || numeric <= 0) {
      setError('Introduce un importe válido.')
      return
    }
    if (numeric > 1_000_000) {
      setError('Importe demasiado alto. Comprueba la cantidad.')
      return
    }

    setSubmitting(true)
    try {
      await submitBillingRequest({ user: profile, amount: numeric, notes })
      setDone(true)
      setTimeout(() => navigate('/'), 1600)
    } catch (e) {
      console.error(e)
      setError('No se pudo enviar. Inténtalo de nuevo.')
      setSubmitting(false)
    }
  }

  if (done) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="text-center animate-fade-in">
          <div className="w-20 h-20 rounded-full bg-green-500/10 text-green-500 flex items-center justify-center mx-auto mb-4">
            <CheckCircle2 size={42} />
          </div>
          <h2 className="text-2xl font-black mb-2">Enviado</h2>
          <p className="text-sm text-rk-ink/60 dark:text-rk-cream/60">
            Esperando revisión y aprobación
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-5 animate-fade-in">
      <button
        onClick={() => navigate(-1)}
        className="flex items-center gap-1.5 text-sm font-semibold text-rk-ink/60 dark:text-rk-cream/60 -ml-1"
      >
        <ChevronLeft size={18} /> Volver
      </button>

      <div>
        <h1 className="text-2xl font-black">Registrar facturación</h1>
        <p className="text-sm text-rk-ink/60 dark:text-rk-cream/60 mt-1">
          Reporta el importe que has facturado. Un admin lo revisará y validará.
        </p>
      </div>

      <GlassCard className="space-y-4">
        <div>
          <label className="text-xs font-semibold uppercase tracking-wider text-rk-ink/50 dark:text-rk-cream/50 block mb-1.5">
            Importe (€)
          </label>
          <div className="relative">
            <Euro size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-rk-ink/40 dark:text-rk-cream/40" />
            <input
              type="text"
              inputMode="decimal"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0,00"
              className="w-full bg-black/5 dark:bg-white/5 rounded-2xl pl-11 pr-4 py-3 font-bold text-lg focus:outline-none focus:ring-2 focus:ring-rk-orange"
              autoFocus
            />
          </div>
        </div>

        <div>
          <label className="text-xs font-semibold uppercase tracking-wider text-rk-ink/50 dark:text-rk-cream/50 block mb-1.5">
            Detalle (opcional)
          </label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value.slice(0, 280))}
            placeholder="Ej. venta piso C/ Mayor 12, cliente Pérez"
            rows={3}
            className="w-full bg-black/5 dark:bg-white/5 rounded-2xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-rk-orange resize-none"
          />
          <div className="text-xs text-rk-ink/40 dark:text-rk-cream/40 text-right mt-1">
            {notes.length}/280
          </div>
        </div>
      </GlassCard>

      {error && (
        <div className="bg-red-500/10 text-red-500 text-sm font-semibold text-center p-3 rounded-2xl">
          {error}
        </div>
      )}

      <button
        onClick={handleSubmit}
        disabled={submitting}
        className="btn-primary w-full disabled:opacity-50"
      >
        {submitting ? 'Enviando…' : 'Enviar facturación'}
      </button>
    </div>
  )
}
