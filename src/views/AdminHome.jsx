import { useState } from 'react'
import { Link } from 'react-router-dom'
import { ChevronRight, Users, RotateCcw, AlertTriangle, UserCog, Monitor, Eye } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { useUsers } from '../hooks/useUsers'
import { useActionRequests } from '../hooks/useActionRequests'
import { useGroups } from '../hooks/useGroups'
import { isAdminRole } from '../data/seedUsers'
import { formatPoints, relativeDate, cn } from '../lib/utils'
import { ACTION_TYPES } from '../lib/constants'
import { resetPeriod, resetAll } from '../lib/admin'
import Header from '../components/layout/Header'
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
    <div className="animate-fade-in pb-4">
      <Header title={`Hola, ${firstName}`} subtitle="Panel Admin" />

      {/* Panel desktop — solo en pantallas grandes */}
      <Link
        to="/panel"
        className="hidden lg:flex items-center gap-3 rounded-2xl bg-rk-ink text-rk-cream px-4 py-3 mb-4 active:scale-[0.98] transition-transform"
      >
        <Monitor size={17} className="text-rk-orange shrink-0" />
        <div className="flex-1 min-w-0">
          <div className="text-[13px] font-black">Panel desktop</div>
          <div className="text-[10.5px] font-semibold opacity-60">
            Versión optimizada para tu ordenador
          </div>
        </div>
        <ChevronRight size={17} className="opacity-50" />
      </Link>

      {/* Pendientes — el dato que importa */}
      <Link to="/aprobaciones" className="block active:scale-[0.99] transition-transform">
        <div
          className={cn(
            'rounded-3xl px-5 py-6 text-center',
            pending.length > 0
              ? 'bg-rk-orange text-white shadow-orange-glow'
              : 'bg-black/[0.04] dark:bg-white/[0.06]'
          )}
        >
          <p
            className={cn(
              'text-[9.5px] font-extrabold uppercase tracking-[1.7px]',
              pending.length > 0
                ? 'text-white/70'
                : 'text-rk-ink/40 dark:text-rk-cream/40'
            )}
          >
            Solicitudes pendientes
          </p>
          <div className="text-[46px] font-black tracking-tight leading-none mt-1.5">
            {pending.length}
          </div>
          <p
            className={cn(
              'text-[12px] font-bold mt-1.5',
              pending.length > 0
                ? 'text-white/80'
                : 'text-rk-ink/45 dark:text-rk-cream/45'
            )}
          >
            {pending.length === 0
              ? '✨ Todo al día'
              : pending.length === 1
              ? 'Esperando revisión'
              : 'Esperando revisión'}
          </p>
        </div>
      </Link>

      {/* Métricas de la agencia */}
      <div className="mt-5 border-t border-black/[0.07] dark:border-white/[0.08]">
        <div className="flex py-3.5">
          <div className="flex-1 text-center">
            <div className="text-lg font-black text-rk-orange">
              {formatPoints(totalPoints)}
            </div>
            <div className="text-[8.5px] font-extrabold uppercase tracking-wider text-rk-ink/40 dark:text-rk-cream/40 mt-0.5">
              Periodo
            </div>
          </div>
          <div className="w-px my-1.5 bg-black/[0.07] dark:bg-white/[0.08]" />
          <div className="flex-1 text-center">
            <div className="text-lg font-black">
              {agents.filter((a) => (a.points ?? 0) > 0).length}
            </div>
            <div className="text-[8.5px] font-extrabold uppercase tracking-wider text-rk-ink/40 dark:text-rk-cream/40 mt-0.5">
              Activos
            </div>
          </div>
          <div className="w-px my-1.5 bg-black/[0.07] dark:bg-white/[0.08]" />
          <div className="flex-1 text-center">
            <div className="text-lg font-black">{formatPoints(totalLifetime)}</div>
            <div className="text-[8.5px] font-extrabold uppercase tracking-wider text-rk-ink/40 dark:text-rk-cream/40 mt-0.5">
              Histórico
            </div>
          </div>
        </div>
      </div>

      {/* Accesos de gestión */}
      <FilaAdmin
        Icon={Users}
        label="Gestionar equipos"
        sub={
          groups.length === 0
            ? 'Crea tu primer equipo y asigna agentes'
            : `${groups.length} ${groups.length === 1 ? 'equipo creado' : 'equipos creados'}`
        }
        to="/equipos"
        primero
      />
      <FilaAdmin
        Icon={UserCog}
        label="Gestionar agentes"
        sub={`${users.length} ${users.length === 1 ? 'persona' : 'personas'} · añadir o eliminar`}
        to="/agentes"
      />
      <FilaAdmin
        Icon={Eye}
        label="Ver como usuario"
        sub="La app tal y como la ve el equipo"
        onClick={() => setViewAsUser(true)}
      />

      {/* Últimas solicitudes */}
      <section className="mt-6">
        <div className="flex items-center justify-between mb-2.5">
          <h2 className="text-base font-black">Últimas solicitudes</h2>
          <Link
            to="/aprobaciones"
            className="text-xs font-bold text-rk-orange flex items-center gap-0.5"
          >
            Ver todas <ChevronRight size={14} />
          </Link>
        </div>
        {pending.length === 0 ? (
          <p className="text-[12.5px] font-semibold text-rk-ink/45 dark:text-rk-cream/45 py-5 text-center">
            No hay solicitudes pendientes ✨
          </p>
        ) : (
          <>
            <div className="h-px bg-black/[0.075] dark:bg-white/[0.09]" />
            {pending.slice(0, 5).map((r, i) => (
              <div key={r.id}>
                <div className="flex items-center gap-3 py-3">
                  <Avatar name={r.userName} size="sm" />
                  <div className="flex-1 min-w-0">
                    <div className="text-[12.5px] font-extrabold truncate">
                      {r.userName}
                    </div>
                    <div className="text-[10.5px] font-semibold text-rk-ink/45 dark:text-rk-cream/45 truncate">
                      {ACTION_TYPES[r.actionType]?.icon} {r.actionLabel}
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="text-[13px] font-black text-rk-orange">
                      +{r.points}
                    </div>
                    <div className="text-[9.5px] font-bold text-rk-ink/35 dark:text-rk-cream/35">
                      {relativeDate(r.createdAt)}
                    </div>
                  </div>
                </div>
                {i < Math.min(pending.length, 5) - 1 && (
                  <div className="h-px bg-black/[0.075] dark:bg-white/[0.09]" />
                )}
              </div>
            ))}
          </>
        )}
      </section>

      {/* Nuevo periodo */}
      <div className="mt-8 pt-5 border-t border-black/[0.07] dark:border-white/[0.08]">
        <button
          onClick={() => setShowReset(true)}
          className="w-full flex items-center justify-center gap-2 py-3 text-[12.5px] font-bold text-rk-ink/45 dark:text-rk-cream/45 active:opacity-60 transition-opacity"
        >
          <RotateCcw size={15} /> Iniciar nuevo periodo
        </button>
      </div>

      {showReset && (
        <ResetModal
          onClose={() => setShowReset(false)}
          stats={{
            agents: agents.length,
            points: totalPoints,
            lifetimePoints: totalLifetime,
            actionRequests: pending.length,
          }}
        />
      )}
    </div>
  )
}

function FilaAdmin({ Icon, label, sub, to, onClick, primero = false }) {
  const contenido = (
    <>
      <Icon size={18} className="text-rk-ink/55 dark:text-rk-cream/55 shrink-0" />
      <div className="flex-1 min-w-0 text-left">
        <div className="text-[13px] font-bold truncate">{label}</div>
        <div className="text-[10.5px] font-semibold text-rk-ink/45 dark:text-rk-cream/45 truncate">
          {sub}
        </div>
      </div>
      <ChevronRight size={16} className="text-rk-ink/20 dark:text-rk-cream/20 shrink-0" />
    </>
  )
  return (
    <>
      {primero && <div className="border-t border-black/[0.07] dark:border-white/[0.08]" />}
      {to ? (
        <Link to={to} className="w-full flex items-center gap-3 py-3.5 active:opacity-60 transition-opacity">
          {contenido}
        </Link>
      ) : (
        <button onClick={onClick} className="w-full flex items-center gap-3 py-3.5 active:opacity-60 transition-opacity">
          {contenido}
        </button>
      )}
      <div className="border-t border-black/[0.07] dark:border-white/[0.08]" />
    </>
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
