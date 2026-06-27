import { useState } from 'react'
import { Link } from 'react-router-dom'
import { ChevronRight, TrendingUp, Users, Clock, Euro, RotateCcw, AlertTriangle } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { useUsers } from '../hooks/useUsers'
import { useActionRequests } from '../hooks/useActionRequests'
import { useBillingRequests } from '../hooks/useBillingRequests'
import { useGroups } from '../hooks/useGroups'
import { isAdminRole } from '../data/seedUsers'
import { formatPoints, relativeDate } from '../lib/utils'
import { ACTION_TYPES } from '../lib/constants'
import { resetPeriod } from '../lib/admin'
import Header from '../components/layout/Header'
import GlassCard from '../components/ui/GlassCard'
import Avatar from '../components/ui/Avatar'

const formatEur = (n) =>
  new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(n ?? 0)

export default function AdminHome() {
  const { profile } = useAuth()
  const { users } = useUsers()
  const { groups } = useGroups()
  const { requests: pending } = useActionRequests({ status: 'pending' })
  const { requests: pendingBilling } = useBillingRequests({ status: 'pending' })

  const [showReset, setShowReset] = useState(false)

  const agents = users.filter((u) => !isAdminRole(u.role))
  const totalPoints = agents.reduce((acc, u) => acc + (u.points ?? 0), 0)
  const totalBilling = agents.reduce((acc, u) => acc + (u.periodBilling ?? 0), 0)
  const totalLifetime = agents.reduce((acc, u) => acc + (u.lifetimePoints ?? 0), 0)

  const firstName = profile?.name?.split(' ')[0] ?? ''

  return (
    <div className="space-y-6 animate-fade-in">
      <Header title={`Hola, ${firstName} 👋`} subtitle="Panel Codirector" showLogout />

      {/* CTA aprobaciones */}
      <Link to="/aprobaciones" className="block">
        <div className="rounded-3xl p-5 bg-gradient-to-br from-rk-orange to-rk-orange-dark text-white shadow-lg shadow-rk-orange/30 active:scale-[0.98] transition-transform">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider opacity-80">
                Solicitudes pendientes
              </p>
              <div className="text-4xl font-black mt-1">{pending.length}</div>
              <p className="text-sm opacity-90 mt-1">
                {pending.length === 0
                  ? 'Todo al día'
                  : pending.length === 1
                  ? 'Acción esperando revisión'
                  : 'Acciones esperando revisión'}
              </p>
            </div>
            <ChevronRight size={28} />
          </div>
        </div>
      </Link>

      {/* CTA facturación */}
      <Link to="/facturacion-aprobar" className="block">
        <div className="glass rounded-2xl p-4 flex items-center gap-3 active:scale-[0.98] transition-transform">
          <div className="w-10 h-10 rounded-xl bg-rk-orange/10 text-rk-orange flex items-center justify-center shrink-0">
            <Euro size={20} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="font-bold text-sm">Aprobar facturación</div>
            <div className="text-xs text-rk-ink/60 dark:text-rk-cream/60">
              {pendingBilling.length === 0
                ? 'No hay facturaciones esperando'
                : `${pendingBilling.length} ${pendingBilling.length === 1 ? 'facturación pendiente' : 'facturaciones pendientes'}`}
            </div>
          </div>
          {pendingBilling.length > 0 && (
            <span className="bg-rk-orange text-white text-xs font-black rounded-full w-6 h-6 flex items-center justify-center">
              {pendingBilling.length}
            </span>
          )}
          <ChevronRight size={20} className="text-rk-ink/40 dark:text-rk-cream/40" />
        </div>
      </Link>

      {/* CTA equipos */}
      <Link to="/equipos" className="block">
        <div className="glass rounded-2xl p-4 flex items-center gap-3 active:scale-[0.98] transition-transform">
          <div className="w-10 h-10 rounded-xl bg-rk-orange/10 text-rk-orange flex items-center justify-center shrink-0">
            <Users size={20} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="font-bold text-sm">Gestionar equipos</div>
            <div className="text-xs text-rk-ink/60 dark:text-rk-cream/60">
              {groups.length === 0
                ? 'Crea tu primer equipo y asigna agentes'
                : `${groups.length} ${groups.length === 1 ? 'equipo creado' : 'equipos creados'}`}
            </div>
          </div>
          <ChevronRight size={20} className="text-rk-ink/40 dark:text-rk-cream/40" />
        </div>
      </Link>

      {/* Métricas agencia */}
      <div className="grid grid-cols-2 gap-3">
        <MetricCard
          icon={<TrendingUp size={18} className="text-rk-orange" />}
          label="Puntos del periodo"
          value={formatPoints(totalPoints)}
        />
        <MetricCard
          icon={<Euro size={18} className="text-rk-orange" />}
          label="Facturado periodo"
          value={formatEur(totalBilling)}
        />
        <MetricCard
          icon={<Users size={18} className="text-rk-orange" />}
          label="Agentes activos"
          value={agents.filter((a) => (a.points ?? 0) > 0).length}
        />
        <MetricCard
          icon={<Clock size={18} className="text-rk-orange" />}
          label="Histórico total"
          value={formatPoints(totalLifetime)}
        />
      </div>

      {/* Actividad reciente */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-bold">Últimas solicitudes</h2>
          <Link to="/aprobaciones" className="text-sm font-semibold text-rk-orange flex items-center gap-1">
            Ver todas <ChevronRight size={16} />
          </Link>
        </div>
        {pending.length === 0 ? (
          <GlassCard className="text-center text-sm text-rk-ink/60 dark:text-rk-cream/60 py-6">
            No hay solicitudes pendientes ✨
          </GlassCard>
        ) : (
          <div className="space-y-2">
            {pending.slice(0, 5).map((r) => (
              <div key={r.id} className="glass rounded-2xl p-3 flex items-center gap-3">
                <Avatar name={r.userName} size="sm" />
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-bold truncate">{r.userName}</div>
                  <div className="text-xs text-rk-ink/60 dark:text-rk-cream/60 truncate">
                    {ACTION_TYPES[r.actionType]?.icon} {r.actionLabel}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-black text-rk-orange">+{r.points}</div>
                  <div className="text-[10px] text-rk-ink/50 dark:text-rk-cream/50">
                    {relativeDate(r.createdAt)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Reset periodo - botón al final, peligroso */}
      <section className="pt-2">
        <button
          onClick={() => setShowReset(true)}
          className="w-full rounded-2xl bg-black/5 dark:bg-white/5 text-rk-ink/70 dark:text-rk-cream/70 font-bold py-3 text-sm flex items-center justify-center gap-2 active:scale-[0.98] transition-transform"
        >
          <RotateCcw size={16} /> Iniciar nuevo periodo
        </button>
      </section>

      {showReset && <ResetModal onClose={() => setShowReset(false)} stats={{ agents: agents.length, points: totalPoints, billing: totalBilling }} />}
    </div>
  )
}

function MetricCard({ icon, label, value }) {
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

function ResetModal({ onClose, stats }) {
  const [confirmText, setConfirmText] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [done, setDone] = useState(null)

  const canConfirm = confirmText.trim().toUpperCase() === 'RESET'

  async function handleReset() {
    if (!canConfirm) return
    setError(null)
    setLoading(true)
    try {
      const result = await resetPeriod()
      setDone(result)
      setTimeout(() => onClose(), 1800)
    } catch (e) {
      console.error(e)
      setError('No se pudo resetear el periodo. Inténtalo de nuevo.')
      setLoading(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-4 animate-fade-in"
      onClick={loading ? undefined : onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md bg-white dark:bg-rk-ink-card rounded-3xl p-6 shadow-2xl animate-slide-up"
      >
        {done ? (
          <div className="text-center py-2">
            <div className="w-16 h-16 rounded-full bg-green-500/10 text-green-500 flex items-center justify-center mx-auto mb-3">
              <RotateCcw size={28} />
            </div>
            <h2 className="text-xl font-black mb-1">Periodo reiniciado</h2>
            <p className="text-sm text-rk-ink/60 dark:text-rk-cream/60">
              {done.users} usuarios y {done.groups} equipos a cero
            </p>
          </div>
        ) : (
          <>
            <div className="w-14 h-14 rounded-2xl bg-red-500/10 text-red-500 flex items-center justify-center mx-auto mb-3">
              <AlertTriangle size={26} />
            </div>
            <h2 className="text-xl font-black text-center mb-1">¿Iniciar nuevo periodo?</h2>
            <p className="text-sm text-rk-ink/60 dark:text-rk-cream/60 text-center mb-4">
              Esto pondrá a CERO los puntos y la facturación del periodo de los {stats.agents} agentes y todos los equipos.
            </p>

            <div className="bg-black/5 dark:bg-white/5 rounded-2xl p-3 mb-4 space-y-1.5 text-sm">
              <Row label="Puntos del periodo" value={`${formatPoints(stats.points)} → 0`} />
              <Row label="Facturación del periodo" value={`${formatEur(stats.billing)} → 0 €`} />
              <Row label="Histórico (lifetime)" value="se conserva" muted />
              <Row label="Facturación histórica" value="se conserva" muted />
              <Row label="Solicitudes / facturas" value="se conservan" muted />
            </div>

            <label className="text-xs font-semibold uppercase tracking-wider text-rk-ink/50 dark:text-rk-cream/50 block mb-1.5">
              Escribe "RESET" para confirmar
            </label>
            <input
              type="text"
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              placeholder="RESET"
              className="w-full bg-black/5 dark:bg-white/5 rounded-2xl px-4 py-3 font-bold uppercase tracking-wider focus:outline-none focus:ring-2 focus:ring-red-500 mb-4"
              autoFocus
            />

            {error && (
              <div className="bg-red-500/10 text-red-500 text-sm font-semibold text-center p-2.5 rounded-2xl mb-3">
                {error}
              </div>
            )}

            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={onClose}
                disabled={loading}
                className="btn-secondary disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                onClick={handleReset}
                disabled={!canConfirm || loading}
                className="rounded-2xl bg-red-500 text-white font-bold py-3 active:scale-[0.98] transition-transform disabled:opacity-30 disabled:cursor-not-allowed"
              >
                {loading ? 'Reiniciando…' : 'Reiniciar'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

function Row({ label, value, muted }) {
  return (
    <div className="flex items-center justify-between text-xs">
      <span className={muted ? 'text-rk-ink/40 dark:text-rk-cream/40' : 'text-rk-ink/60 dark:text-rk-cream/60'}>
        {label}
      </span>
      <span className={`font-bold ${muted ? 'text-rk-ink/50 dark:text-rk-cream/50' : ''}`}>
        {value}
      </span>
    </div>
  )
}
