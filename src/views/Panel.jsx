import { useState, useMemo } from 'react'
import { Link, Navigate } from 'react-router-dom'
import {
  Check, X, LogOut, Smartphone, Sun, Moon, Users, UserCog,
} from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { useTheme } from '../context/ThemeContext'
import { useUsers } from '../hooks/useUsers'
import { useGroups } from '../hooks/useGroups'
import {
  useActionRequests,
  approveRequest,
  rejectRequest,
} from '../hooks/useActionRequests'
import {
  useBillingRequests,
  approveBillingRequest,
  rejectBillingRequest,
} from '../hooks/useBillingRequests'
import { isAdminRole } from '../data/seedUsers'
import { formatPoints, relativeDate, cn } from '../lib/utils'
import Avatar from '../components/ui/Avatar'
import NotificationBell from '../components/ui/NotificationBell'

// ====================================================================
// Utilidades
// ====================================================================
const formatEur = (n) =>
  new Intl.NumberFormat('es-ES', {
    style: 'currency',
    currency: 'EUR',
    maximumFractionDigits: 0,
  }).format(n ?? 0)

function tsMs(value) {
  if (!value) return 0
  if (typeof value.toMillis === 'function') return value.toMillis()
  return new Date(value).getTime()
}

// ====================================================================
// Panel principal
// ====================================================================
export default function Panel() {
  const { firebaseUser, profile, isAdmin, signOut } = useAuth()
  const { theme, toggle } = useTheme()

  // Hooks llamados sin condición; el Navigate va después.
  const { users } = useUsers()
  const { groups } = useGroups()
  const { requests: pendingActions } = useActionRequests({ status: 'pending' })
  const { requests: pendingBilling } = useBillingRequests({ status: 'pending' })
  const { requests: approvedActions } = useActionRequests({ status: 'approved' })
  const { requests: approvedBilling } = useBillingRequests({ status: 'approved' })

  const agents = useMemo(
    () => users.filter((u) => !isAdminRole(u.role)),
    [users]
  )

  const totals = useMemo(() => {
    const points = agents.reduce((acc, u) => acc + (u.points || 0), 0)
    const billing = agents.reduce((acc, u) => acc + (u.periodBilling || 0), 0)
    return { points, billing }
  }, [agents])

  const weekDeltas = useMemo(() => {
    const cutoff = Date.now() - 7 * 24 * 3600 * 1000
    const points = approvedActions
      .filter((r) => tsMs(r.reviewedAt) >= cutoff)
      .reduce((acc, r) => acc + (r.points || 0), 0)
    const billing = approvedBilling
      .filter((r) => tsMs(r.reviewedAt) >= cutoff)
      .reduce((acc, r) => acc + (r.finalAmount || r.amount || 0), 0)
    return { points, billing }
  }, [approvedActions, approvedBilling])

  const pending = useMemo(() => {
    const actions = pendingActions.map((r) => ({ ...r, kind: 'action' }))
    const billings = pendingBilling.map((r) => ({ ...r, kind: 'billing' }))
    return [...actions, ...billings].sort(
      (a, b) => tsMs(b.createdAt) - tsMs(a.createdAt)
    )
  }, [pendingActions, pendingBilling])

  const top5 = useMemo(
    () =>
      [...agents]
        .sort((a, b) => (b.points || 0) - (a.points || 0))
        .slice(0, 5),
    [agents]
  )

  const teams = useMemo(
    () =>
      [...groups].sort(
        (a, b) => (b.totalPoints || 0) - (a.totalPoints || 0)
      ),
    [groups]
  )

  if (!isAdmin) return <Navigate to="/" replace />

  const firstName = profile?.name?.split(' ')[0] ?? ''
  const maxTeamPts = teams[0]?.totalPoints || 1

  return (
    <div className="space-y-5 animate-fade-in min-w-[1024px]">
      {/* HEADER */}
      <header className="flex items-center pb-5 border-b border-black/[0.06] dark:border-white/[0.06]">
        <div>
          <p className="text-[10px] font-bold tracking-[2px] text-rk-orange">
            RK PALANCA · LA LIGA
          </p>
          <h1 className="text-2xl font-black tracking-tight mt-1">
            Panel Admin
          </h1>
        </div>

        <nav className="ml-8 flex items-center gap-2">
          <Link
            to="/panel/agentes"
            className="flex items-center gap-1.5 text-xs font-bold px-3 py-2 rounded-lg bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10 transition"
          >
            <UserCog size={13} /> Agentes
          </Link>
          <Link
            to="/panel/equipos"
            className="flex items-center gap-1.5 text-xs font-bold px-3 py-2 rounded-lg bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10 transition"
          >
            <Users size={13} /> Equipos
          </Link>
        </nav>

        <div className="ml-auto flex items-center gap-2">
          <Link
            to="/"
            className="flex items-center gap-1.5 text-xs font-bold px-3 py-2 rounded-lg bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10 transition"
          >
            <Smartphone size={13} /> Vista móvil
          </Link>

          <NotificationBell />

          <button
            onClick={toggle}
            className="w-9 h-9 rounded-full bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10 transition flex items-center justify-center"
            aria-label="Cambiar tema"
          >
            {theme === 'dark' ? <Sun size={15} /> : <Moon size={15} />}
          </button>

          <div className="flex items-center gap-2.5 pl-2">
            <Avatar name={profile?.name} size="sm" />
            <span className="font-bold text-sm">{firstName}</span>
          </div>

          <button
            onClick={signOut}
            className="w-9 h-9 rounded-full bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10 transition flex items-center justify-center"
            aria-label="Cerrar sesión"
          >
            <LogOut size={15} />
          </button>
        </div>
      </header>

      {/* KPIs */}
      <div className="grid grid-cols-4 gap-3">
        <KpiCard
          label="AGENTES ACTIVOS"
          value={agents.length}
          sub={`en ${groups.length} ${groups.length === 1 ? 'equipo' : 'equipos'}`}
        />
        <KpiCard
          label="PUNTOS DEL PERIODO"
          value={formatPoints(totals.points)}
          sub={
            weekDeltas.points > 0
              ? `+${formatPoints(weekDeltas.points)} esta semana`
              : 'Sin movimiento'
          }
          subUp={weekDeltas.points > 0}
        />
        <KpiCard
          label="FACTURACIÓN"
          value={formatEur(totals.billing)}
          sub={
            weekDeltas.billing > 0
              ? `+${formatEur(weekDeltas.billing)} esta semana`
              : 'Sin movimiento'
          }
          subUp={weekDeltas.billing > 0}
        />
        <KpiCard
          label="PENDIENTES DE APROBAR"
          value={pending.length}
          sub={`${pendingActions.length} ${pendingActions.length === 1 ? 'acción' : 'acciones'} · ${pendingBilling.length} ${pendingBilling.length === 1 ? 'facturación' : 'facturaciones'}`}
          accent
        />
      </div>

      {/* MAIN GRID */}
      <div className="grid grid-cols-[1.5fr_1fr] gap-4">
        <PendingPanel pending={pending} adminUid={firebaseUser?.uid} />

        <div className="flex flex-col gap-4">
          <RankingMini top5={top5} />
          <TeamsChart teams={teams} maxPts={maxTeamPts} />
        </div>
      </div>
    </div>
  )
}

// ====================================================================
// KPI Card
// ====================================================================
function KpiCard({ label, value, sub, subUp = false, accent = false }) {
  return (
    <div
      className={cn(
        'p-4 rounded-2xl border',
        accent
          ? 'bg-rk-orange text-white border-transparent shadow-orange-glow-sm'
          : 'bg-white dark:bg-rk-ink-card border-black/[0.04] dark:border-white/[0.05] shadow-soft'
      )}
    >
      <div
        className={cn(
          'text-[9px] font-extrabold tracking-[2px]',
          accent
            ? 'text-white/85'
            : 'text-rk-ink/60 dark:text-rk-cream/60'
        )}
      >
        {label}
      </div>
      <div className="text-3xl font-black mt-1.5 -tracking-wide">{value}</div>
      <div
        className={cn(
          'text-[10.5px] mt-0.5',
          accent
            ? 'text-white/85'
            : subUp
            ? 'text-emerald-600 dark:text-emerald-400 font-bold'
            : 'text-rk-ink/60 dark:text-rk-cream/60'
        )}
      >
        {sub}
      </div>
    </div>
  )
}

// ====================================================================
// Sección con cabecera (tag + título + badge opcional)
// ====================================================================
function PanelSection({ tag, title, badge, children }) {
  return (
    <div className="bg-white dark:bg-rk-ink-card rounded-2xl p-5 border border-black/[0.04] dark:border-white/[0.05] shadow-soft">
      <div className="flex items-center mb-3.5">
        <div>
          <div className="text-[9px] font-extrabold tracking-[2px] text-rk-orange">
            {tag}
          </div>
          <div className="text-base font-black mt-0.5">{title}</div>
        </div>
        {badge && (
          <div className="ml-auto px-3 py-1 bg-rk-orange/10 text-rk-orange rounded-full text-[11px] font-extrabold">
            {badge}
          </div>
        )}
      </div>
      {children}
    </div>
  )
}

// ====================================================================
// Pendientes — acciones + facturaciones mezcladas
// ====================================================================
function PendingPanel({ pending, adminUid }) {
  return (
    <PanelSection
      tag="POR REVISAR"
      title="Pendientes"
      badge={
        pending.length === 0 ? null : `${pending.length} esperando`
      }
    >
      {pending.length === 0 ? (
        <div className="text-sm text-rk-ink/50 dark:text-rk-cream/50 py-10 text-center font-semibold">
          ✨ Todo al día. No hay nada por revisar.
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {pending.map((p) => (
            <PendingItem key={p.id} item={p} adminUid={adminUid} />
          ))}
        </div>
      )}
    </PanelSection>
  )
}

function PendingItem({ item, adminUid }) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)

  const isBilling = item.kind === 'billing'

  async function handleApprove() {
    setError(null)
    setBusy(true)
    try {
      if (isBilling) {
        await approveBillingRequest({ requestId: item.id, adminUid })
      } else {
        await approveRequest({ requestId: item.id, adminUid })
      }
    } catch (e) {
      setError(e.message ?? 'Error')
      setBusy(false)
    }
  }

  async function handleReject() {
    setError(null)
    setBusy(true)
    try {
      if (isBilling) {
        await rejectBillingRequest({ requestId: item.id, adminUid })
      } else {
        await rejectRequest({ requestId: item.id, adminUid })
      }
    } catch (e) {
      setError(e.message ?? 'Error')
      setBusy(false)
    }
  }

  const meta = isBilling
    ? `Facturación · ${formatEur(item.amount)} · ${relativeDate(item.createdAt)}`
    : `${item.actionLabel} · ${relativeDate(item.createdAt)}`

  const amount = isBilling
    ? formatEur(item.amount)
    : `+${item.points}`

  return (
    <div className="flex items-center gap-3 p-3 bg-black/[0.02] dark:bg-white/[0.03] rounded-xl border border-black/[0.04] dark:border-white/[0.04]">
      <Avatar name={item.userName} size="sm" />
      <div className="flex-1 min-w-0">
        <div className="font-extrabold text-sm truncate">{item.userName}</div>
        <div className="text-xs text-rk-ink/60 dark:text-rk-cream/60 mt-0.5 truncate">
          {meta}
        </div>
      </div>
      <div
        className={cn(
          'font-black text-rk-orange whitespace-nowrap',
          isBilling ? 'text-[13.5px]' : 'text-base'
        )}
      >
        {amount}
      </div>
      <button
        onClick={handleReject}
        disabled={busy}
        className="px-3 py-2 bg-red-500/10 text-red-500 rounded-lg text-xs font-extrabold hover:bg-red-500/15 transition disabled:opacity-50 flex items-center gap-1"
      >
        <X size={13} /> Rechazar
      </button>
      <button
        onClick={handleApprove}
        disabled={busy}
        className="px-4 py-2 bg-emerald-500 text-white rounded-lg text-xs font-extrabold shadow-md shadow-emerald-500/25 hover:bg-emerald-600 transition disabled:opacity-50 flex items-center gap-1"
      >
        <Check size={13} /> Aprobar
      </button>
      {error && (
        <div className="text-red-500 text-xs ml-2 whitespace-nowrap">
          {error}
        </div>
      )}
    </div>
  )
}

// ====================================================================
// Ranking Top 5
// ====================================================================
function RankingMini({ top5 }) {
  return (
    <PanelSection tag="EL BOLETÍN" title="Top 5 · Puntos">
      {top5.length === 0 ? (
        <div className="text-sm text-rk-ink/50 dark:text-rk-cream/50 py-4">
          Sin datos todavía.
        </div>
      ) : (
        <div className="flex flex-col gap-1.5">
          {top5.map((u, i) => (
            <div
              key={u.id}
              className={cn(
                'flex items-center gap-2.5 px-3 py-2 bg-black/[0.02] dark:bg-white/[0.03] rounded-lg',
                i === 0 && 'border-l-4 border-rk-orange'
              )}
            >
              <div
                className={cn(
                  'w-6 h-6 rounded-full flex items-center justify-center font-black text-xs shrink-0',
                  i === 0
                    ? 'bg-rk-orange text-white'
                    : i < 3
                    ? 'bg-black/[0.08] text-rk-ink dark:bg-white/10 dark:text-rk-cream'
                    : 'bg-black/[0.05] text-rk-ink/60 dark:bg-white/[0.06] dark:text-rk-cream/60'
                )}
              >
                {i + 1}
              </div>
              <span
                className={cn(
                  'flex-1 text-xs font-extrabold truncate',
                  i >= 3 && 'text-rk-ink/70 dark:text-rk-cream/70 font-bold'
                )}
              >
                {u.name}
              </span>
              <span
                className={cn(
                  'font-black text-sm whitespace-nowrap',
                  i >= 3 &&
                    'font-extrabold text-rk-ink/70 dark:text-rk-cream/70'
                )}
              >
                {formatPoints(u.points || 0)}
              </span>
            </div>
          ))}
        </div>
      )}
    </PanelSection>
  )
}

// ====================================================================
// Equipos — barras de progreso
// ====================================================================
function TeamsChart({ teams, maxPts }) {
  return (
    <PanelSection tag="RENDIMIENTO" title="Por equipos">
      {teams.length === 0 ? (
        <div className="text-sm text-rk-ink/50 dark:text-rk-cream/50 py-4">
          No hay equipos creados todavía.
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {teams.map((t, i) => (
            <div key={t.id}>
              <div className="flex justify-between mb-1">
                <span className="font-extrabold text-xs truncate pr-2">
                  {t.name}
                </span>
                <span
                  className={cn(
                    'font-black text-xs whitespace-nowrap',
                    i === 0 && 'text-rk-orange'
                  )}
                >
                  {formatPoints(t.totalPoints || 0)} pts
                </span>
              </div>
              <div className="h-2 bg-black/[0.05] dark:bg-white/[0.06] rounded-full overflow-hidden">
                <div
                  className={cn(
                    'h-full rounded-full transition-all duration-700',
                    i === 0 ? 'bg-rk-orange' : 'bg-rk-ink dark:bg-rk-cream/80'
                  )}
                  style={{
                    width: `${Math.max(
                      2,
                      ((t.totalPoints || 0) / maxPts) * 100
                    )}%`,
                  }}
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </PanelSection>
  )
}
