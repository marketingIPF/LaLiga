import { useState } from 'react'
import { Link } from 'react-router-dom'
import { ChevronRight, TrendingUp, Users, Clock, RotateCcw, AlertTriangle, UserCog, Monitor, Eye } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { useUsers } from '../hooks/useUsers'
import { useActionRequests } from '../hooks/useActionRequests'
import { useGroups } from '../hooks/useGroups'
import { isAdminRole } from '../data/seedUsers'
import { formatPoints, relativeDate } from '../lib/utils'
import { ACTION_TYPES } from '../lib/constants'
import { resetPeriod, resetAll } from '../lib/admin'
import Header from '../components/layout/Header'
import GlassCard from '../components/ui/GlassCard'
import Avatar from '../components/ui/Avatar'


export default function AdminHome() {
  const { profile, setViewAsUser } = useAuth()
  const { users } = useUsers()
  const { groups } = useGroups()
  const { requests: pending } = useActionRequests({ status: 'pending' })

  const [showReset, setShowReset] = useState(false)

  const agents = users.filter((u) => !isAdminRole(u.role))
  const totalPoints = agents.reduce((acc, u) => acc + (u.points ?? 0), 0)
  const totalLifetime = agents.reduce((acc, u) => acc + (u.lifetimePoints ?? 0), 0)

  const firstName = profile?.name?.split(' ')[0] ?? ''

  return (
    <div className="space-y-6 animate-fade-in">
      <Header title={`Hola, ${firstName} 👋`} subtitle="Panel Admin" showLogout />

      {/* Hint del panel desktop — solo visible en pantallas grandes */}
      <Link to="/panel" className="hidden lg:flex items-center gap-3 rounded-2xl bg-rk-ink dark:bg-rk-cream/10 text-rk-cream dark:text-rk-cream px-4 py-3 active:scale-[0.98] transition-transform border border-rk-ink dark:border-rk-cream/10">
        <div className="w-9 h-9 rounded-lg bg-rk-orange/20 text-rk-orange flex items-center justify-center shrink-0">
          <Monitor size={17} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="font-bold text-sm">Panel desktop</div>
          <div className="text-xs opacity-70">Versión optimizada para tu ordenador</div>
        </div>
        <ChevronRight size={18} className="opacity-70" />
      </Link>

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

      {/* CTA agentes */}
      <Link to="/agentes" className="block">
        <div className="glass rounded-2xl p-4 flex items-center gap-3 active:scale-[0.98] transition-transform">
          <div className="w-10 h-10 rounded-xl bg-rk-orange/10 text-rk-orange flex items-center justify-center shrink-0">
            <UserCog size={20} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="font-bold text-sm">Gestionar agentes</div>
            <div className="text-xs text-rk-ink/60 dark:text-rk-cream/60">
              {users.length} {users.length === 1 ? 'persona' : 'personas'} · añadir o eliminar
            </div>
          </div>
          <ChevronRight size={20} className="text-rk-ink/40 dark:text-rk-cream/40" />
        </div>
      </Link>

      {/* Ver la app como usuario */}
      <button onClick={() => setViewAsUser(true)} className="block w-full text-left">
        <div className="glass rounded-2xl p-4 flex items-center gap-3 active:scale-[0.98] transition-transform">
          <div className="w-10 h-10 rounded-xl bg-rk-orange/10 text-rk-orange flex items-center justify-center shrink-0">
            <Eye size={20} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="font-bold text-sm">Ver como usuario</div>
            <div className="text-xs text-rk-ink/60 dark:text-rk-cream/60">
              La app tal y como la ve el equipo. Podrás registrar tus propias acciones.
            </div>
          </div>
          <ChevronRight size={20} className="text-rk-ink/40 dark:text-rk-cream/40" />
        </div>
      </button>

      {/* Métricas agencia */}
      <div className="grid grid-cols-2 gap-3">
        <MetricCard
          icon={<TrendingUp size={18} className="text-rk-orange" />}
          label="Puntos del periodo"
          value={formatPoints(totalPoints)}
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

      {showReset && <ResetModal onClose={() => setShowReset(false)} stats={{
        agents: agents.length,
        points: totalPoints,
        lifetimePoints: totalLifetime,
        actionRequests: pending.length, // solo pendientes visible, pero el reset borra todas
      }} />}
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
  const [mode, setMode] = useState('periodo') // 'periodo' | 'todo'
  const [confirmText, setConfirmText] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [done, setDone] = useState(null)

  const isFull = mode === 'todo'
  const requiredWord = isFull ? 'BORRAR TODO' : 'RESET'
  const canConfirm = confirmText.trim().toUpperCase() === requiredWord

  // Al cambiar de modo, vaciamos el input para forzar re-escritura
  function changeMode(newMode) {
    setMode(newMode)
    setConfirmText('')
    setError(null)
  }

  async function handleReset() {
    if (!canConfirm) return
    setError(null)
    setLoading(true)
    try {
      const result = isFull ? await resetAll() : await resetPeriod()
      setDone({ mode, ...result })
      setTimeout(() => onClose(), 2000)
    } catch (e) {
      console.error(e)
      setError('No se pudo completar el reset. Inténtalo de nuevo.')
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
        className="w-full max-w-md bg-white dark:bg-rk-ink-card rounded-[28px] p-6 shadow-2xl animate-slide-up max-h-[90vh] overflow-y-auto"
      >
        {done ? (
          <div className="text-center py-2">
            <div className="w-16 h-16 rounded-full bg-green-500/10 text-green-500 flex items-center justify-center mx-auto mb-3">
              <RotateCcw size={28} />
            </div>
            <h2 className="text-xl font-black mb-1">
              {done.mode === 'todo' ? 'Sistema a cero' : 'Periodo reiniciado'}
            </h2>
            <p className="text-sm text-rk-ink/60 dark:text-rk-cream/60">
              {done.mode === 'todo'
                ? `${done.users} usuarios · ${done.groups} equipos · ${done.actionRequests} solicitudes borradas`
                : `${done.users} usuarios y ${done.groups} equipos a cero`}
            </p>
          </div>
        ) : (
          <>
            <div className={`w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-3 ${
              isFull ? 'bg-red-500/15 text-red-500' : 'bg-amber-500/10 text-amber-500'
            }`}>
              <AlertTriangle size={26} />
            </div>
            <h2 className="text-xl font-black text-center mb-1">
              {isFull ? 'Borrar todo el sistema' : '¿Iniciar nuevo periodo?'}
            </h2>
            <p className="text-sm text-rk-ink/60 dark:text-rk-cream/60 text-center mb-4">
              {isFull
                ? 'Modo testing: deja la base de datos como recién instalada.'
                : `Pondrá a cero puntos y facturación del periodo de los ${stats.agents} agentes y todos los equipos.`}
            </p>

            {/* Toggle de modo */}
            <div className="flex gap-1 bg-black/5 dark:bg-white/5 p-1 rounded-2xl mb-4">
              <ModeTab
                active={mode === 'periodo'}
                onClick={() => changeMode('periodo')}
                label="Solo periodo"
              />
              <ModeTab
                active={mode === 'todo'}
                onClick={() => changeMode('todo')}
                label="Todo (testing)"
                danger
              />
            </div>

            {/* Resumen de qué se hace */}
            <div className={`rounded-2xl p-3 mb-4 space-y-1.5 text-sm ${
              isFull ? 'bg-red-500/5 border border-red-500/20' : 'bg-black/5 dark:bg-white/5'
            }`}>
              <Row label="Puntos del periodo" value={`${formatPoints(stats.points)} → 0`} />
              {isFull ? (
                <>
                  <Row
                    label="Puntos históricos (lifetime)"
                    value={`${formatPoints(stats.lifetimePoints)} → 0`}
                    danger
                  />
                  <Row label="Facturación histórica" value="→ 0 €" danger />
                  <Row label="Todas las acciones" value="se borran" danger />
                </>
              ) : (
                <>
                  <Row label="Histórico (lifetime)" value="se conserva" muted />
                  <Row label="Facturación histórica" value="se conserva" muted />
                  <Row label="Solicitudes / facturas" value="se conservan" muted />
                </>
              )}
              <Row label="Usuarios y equipos" value="se conservan" muted />
            </div>

            <label className="text-xs font-semibold uppercase tracking-wider text-rk-ink/50 dark:text-rk-cream/50 block mb-1.5">
              Escribe "{requiredWord}" para confirmar
            </label>
            <input
              type="text"
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              placeholder={requiredWord}
              className={`w-full bg-black/5 dark:bg-white/5 rounded-2xl px-4 py-3 font-bold uppercase tracking-wider focus:outline-none focus:ring-2 mb-4 ${
                isFull ? 'focus:ring-red-500' : 'focus:ring-amber-500'
              }`}
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
                className={`rounded-2xl text-white font-bold py-3 active:scale-[0.98] transition-transform disabled:opacity-30 disabled:cursor-not-allowed ${
                  isFull ? 'bg-red-500' : 'bg-amber-500'
                }`}
              >
                {loading ? 'Procesando…' : isFull ? 'Borrar todo' : 'Reiniciar'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

function ModeTab({ active, onClick, label, danger }) {
  return (
    <button
      onClick={onClick}
      className={`flex-1 py-2 rounded-xl text-xs font-bold transition ${
        active
          ? danger
            ? 'bg-red-500 text-white'
            : 'bg-rk-ink text-rk-cream dark:bg-rk-cream dark:text-rk-ink'
          : 'text-rk-ink/60 dark:text-rk-cream/60'
      }`}
    >
      {label}
    </button>
  )
}

function Row({ label, value, muted, danger }) {
  return (
    <div className="flex items-center justify-between text-xs">
      <span className={
        danger
          ? 'text-red-500'
          : muted
            ? 'text-rk-ink/40 dark:text-rk-cream/40'
            : 'text-rk-ink/60 dark:text-rk-cream/60'
      }>
        {label}
      </span>
      <span className={`font-bold ${
        danger
          ? 'text-red-500'
          : muted
            ? 'text-rk-ink/50 dark:text-rk-cream/50'
            : ''
      }`}>
        {value}
      </span>
    </div>
  )
}
