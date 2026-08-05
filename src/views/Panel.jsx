import { useState, useMemo } from 'react'
import { Link, Navigate } from 'react-router-dom'
import {
  Check, X, LogOut, Smartphone, Sun, Moon, Users, UserCog, ClipboardList,
  Activity, BarChart3, UserX, ChevronRight,
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
import { isAdminRole, getUserLeague } from '../data/seedUsers'
import { formatPoints, relativeDate, cn } from '../lib/utils'
import Avatar from '../components/ui/Avatar'
import NotificationBell from '../components/ui/NotificationBell'

// ====================================================================
// Utilidades
// ====================================================================

function tsMs(value) {
  if (!value) return 0
  if (typeof value.toMillis === 'function') return value.toMillis()
  return new Date(value).getTime()
}

// ====================================================================
// Panel principal
// ====================================================================
export default function Panel() {
  const [openBoard, setOpenBoard] = useState(null) // clasificación completa
  const { firebaseUser, profile, isAdmin, signOut } = useAuth()
  const { theme, toggle } = useTheme()

  // Hooks llamados sin condición; el Navigate va después.
  const { users } = useUsers()
  const { groups } = useGroups()
  const { requests: pendingActions } = useActionRequests({ status: 'pending' })
  // Límite: el panel solo necesita lo reciente (semana, feed, gráfico).
  // Sin tope descargaba todo el histórico, que crece sin parar.
  const { requests: approvedActions } = useActionRequests({
    status: 'approved',
    max: 300,
  })

  const agents = useMemo(
    () => users.filter((u) => getUserLeague(u) === 'agentes'),
    [users]
  )

  const staffLeague = useMemo(
    () => users.filter((u) => getUserLeague(u) === 'staff'),
    [users]
  )

  const obraNuevaLeague = useMemo(
    () => users.filter((u) => getUserLeague(u) === 'obranueva'),
    [users]
  )

  const totals = useMemo(() => {
    const points = agents.reduce((acc, u) => acc + (u.points || 0), 0)
    const staffPoints = staffLeague.reduce((acc, u) => acc + (u.points || 0), 0)
    const obraNuevaPoints = obraNuevaLeague.reduce((acc, u) => acc + (u.points || 0), 0)
    return { points, staffPoints, obraNuevaPoints }
  }, [agents, staffLeague, obraNuevaLeague])

  const weekDeltas = useMemo(() => {
    const cutoff = Date.now() - 7 * 24 * 3600 * 1000
    const points = approvedActions
      .filter((r) => tsMs(r.reviewedAt) >= cutoff)
      .reduce((acc, r) => acc + (r.points || 0), 0)
    return { points }
  }, [approvedActions])

  const pending = useMemo(
    () =>
      [...pendingActions].sort((a, b) => tsMs(b.createdAt) - tsMs(a.createdAt)),
    [pendingActions]
  )

  const top5 = useMemo(
    () =>
      [...agents]
        .sort((a, b) => (b.points || 0) - (a.points || 0))
        .slice(0, 5),
    [agents]
  )

  const top3Staff = useMemo(
    () =>
      [...staffLeague]
        .sort((a, b) => (b.points || 0) - (a.points || 0))
        .slice(0, 3),
    [staffLeague]
  )

  // Clasificaciones completas (ya tenemos los usuarios cargados: coste cero)
  const boards = useMemo(() => {
    const sortByPoints = (list) =>
      [...list].sort((a, b) => (b.points || 0) - (a.points || 0))
    return {
      agentes: { label: 'Agentes', people: sortByPoints(agents) },
      obranueva: { label: 'Obra Nueva', people: sortByPoints(obraNuevaLeague) },
      staff: { label: 'Staff', people: sortByPoints(staffLeague) },
    }
  }, [agents, obraNuevaLeague, staffLeague])

  const top3ObraNueva = useMemo(
    () =>
      [...obraNuevaLeague]
        .sort((a, b) => (b.points || 0) - (a.points || 0))
        .slice(0, 3),
    [obraNuevaLeague]
  )

  const teams = useMemo(
    () =>
      [...groups].sort(
        (a, b) => (b.totalPoints || 0) - (a.totalPoints || 0)
      ),
    [groups]
  )

  // Últimos movimientos aprobados (el pulso de la agencia)
  const recentActivity = useMemo(
    () =>
      [...approvedActions]
        .sort((a, b) => tsMs(b.reviewedAt) - tsMs(a.reviewedAt))
        .slice(0, 9),
    [approvedActions]
  )

  // Puntos aprobados por día, últimos 14 días
  const dailySeries = useMemo(() => {
    const DAYS = 14
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const buckets = []
    for (let i = DAYS - 1; i >= 0; i--) {
      const d = new Date(today)
      d.setDate(d.getDate() - i)
      buckets.push({ date: d, points: 0 })
    }
    const firstMs = buckets[0].date.getTime()

    for (const r of approvedActions) {
      const ms = tsMs(r.reviewedAt)
      if (!ms || ms < firstMs) continue
      const d = new Date(ms)
      d.setHours(0, 0, 0, 0)
      const idx = Math.round((d.getTime() - firstMs) / 86400000)
      if (idx >= 0 && idx < buckets.length) {
        buckets[idx].points += r.points || 0
      }
    }
    return buckets
  }, [approvedActions])

  // Quién no ha sumado en los últimos 7 días
  const inactivos = useMemo(() => {
    const cutoff = Date.now() - 7 * 24 * 3600 * 1000
    return users
      .filter((u) => getUserLeague(u) !== null)
      .filter((u) => tsMs(u.lastActionAt) < cutoff)
      .sort((a, b) => tsMs(a.lastActionAt) - tsMs(b.lastActionAt))
  }, [users])

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
          <Link
            to="/panel/puntos"
            className="flex items-center gap-1.5 text-xs font-bold px-3 py-2 rounded-lg bg-rk-orange/10 text-rk-orange hover:bg-rk-orange/15 transition"
          >
            <ClipboardList size={13} /> Cargar puntos
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
      <div className="grid grid-cols-5 gap-3">
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
          label="PUNTOS STAFF"
          value={formatPoints(totals.staffPoints)}
          sub={`${staffLeague.length} participantes`}
        />
        <KpiCard
          label="PUNTOS OBRA NUEVA"
          value={formatPoints(totals.obraNuevaPoints)}
          sub={`${obraNuevaLeague.length} participantes`}
        />
        <KpiCard
          label="PENDIENTES DE APROBAR"
          value={pending.length}
          sub={pending.length === 0 ? 'Todo al día' : 'solicitudes esperando'}
          accent
        />
      </div>

      {/* MAIN GRID — items-start para que las tarjetas no se estiren */}
      <div className="grid grid-cols-[1.5fr_1fr] gap-4 items-start">
        <div className="flex flex-col gap-4">
          <PendingPanel pending={pending} adminUid={firebaseUser?.uid} />
          <DailyChart series={dailySeries} />
          <ActivityFeed items={recentActivity} />
        </div>

        <div className="flex flex-col gap-4">
          <RankingMini
            competitors={top5}
            tag="EL BOLETÍN"
            title="Top 5 · Agentes"
            total={boards.agentes.people.length}
            onOpen={() => setOpenBoard('agentes')}
          />
          <RankingMini
            competitors={top3ObraNueva}
            tag="EL BOLETÍN"
            title="Top 3 · Obra Nueva"
            total={boards.obranueva.people.length}
            onOpen={() => setOpenBoard('obranueva')}
          />
          <RankingMini
            competitors={top3Staff}
            tag="EL BOLETÍN"
            title="Top 3 · Staff"
            total={boards.staff.people.length}
            onOpen={() => setOpenBoard('staff')}
          />
          <TeamsChart teams={teams} maxPts={maxTeamPts} />
        </div>
      </div>

      {/* Sin actividad — ancho completo */}
      <InactiveStrip people={inactivos} total={agents.length + staffLeague.length + obraNuevaLeague.length} />

      {openBoard && (
        <LeagueBoardDrawer
          league={boards[openBoard]}
          onClose={() => setOpenBoard(null)}
        />
      )}
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

  async function handleApprove() {
    setError(null)
    setBusy(true)
    try {
      await approveRequest({ requestId: item.id, adminUid })
    } catch (e) {
      setError(e.message ?? 'Error')
      setBusy(false)
    }
  }

  async function handleReject() {
    setError(null)
    setBusy(true)
    try {
      await rejectRequest({ requestId: item.id, adminUid })
    } catch (e) {
      setError(e.message ?? 'Error')
      setBusy(false)
    }
  }

  const meta = `${item.actionLabel} · ${relativeDate(item.createdAt)}`
  const amount = `+${item.points}`

  return (
    <div className="flex items-center gap-3 p-3 bg-black/[0.02] dark:bg-white/[0.03] rounded-xl border border-black/[0.04] dark:border-white/[0.04]">
      <Avatar name={item.userName} size="sm" />
      <div className="flex-1 min-w-0">
        <div className="font-extrabold text-sm truncate">{item.userName}</div>
        <div className="text-xs text-rk-ink/60 dark:text-rk-cream/60 mt-0.5 truncate">
          {meta}
        </div>
      </div>
      <div className="font-black text-rk-orange whitespace-nowrap text-base">
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
function RankingMini({ competitors, tag, title, total, onOpen }) {
  const hidden = total ? total - competitors.length : 0
  return (
    <PanelSection
      tag={tag}
      title={title}
      badge={total ? `${total} en liga` : undefined}
    >
      {competitors.length === 0 ? (
        <div className="text-sm text-rk-ink/50 dark:text-rk-cream/50 py-4">
          Sin datos todavía.
        </div>
      ) : (
        <>
          <div className="flex flex-col gap-1.5">
            {competitors.map((u, i) => (
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
                    i >= 3 && 'font-extrabold text-rk-ink/70 dark:text-rk-cream/70'
                  )}
                >
                  {formatPoints(u.points || 0)}
                </span>
              </div>
            ))}
          </div>

          {onOpen && (
            <button
              onClick={onOpen}
              className="mt-2.5 w-full flex items-center justify-center gap-1 py-2 rounded-lg text-[11px] font-extrabold text-rk-orange hover:bg-rk-orange/10 transition"
            >
              Ver clasificación completa
              {hidden > 0 && ` (+${hidden})`}
              <ChevronRight size={13} />
            </button>
          )}
        </>
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

// ====================================================================
// Evolución de puntos por día (últimos 14 días)
// ====================================================================
function DailyChart({ series }) {
  const max = Math.max(1, ...series.map((d) => d.points))
  const total = series.reduce((acc, d) => acc + d.points, 0)
  const activos = series.filter((d) => d.points > 0).length

  const DAY_LETTER = ['D', 'L', 'M', 'X', 'J', 'V', 'S']

  return (
    <PanelSection
      tag="RITMO"
      title="Puntos por día"
      badge={`${formatPoints(total)} pts · 14 días`}
    >
      {total === 0 ? (
        <div className="flex items-center gap-2 text-sm text-rk-ink/50 dark:text-rk-cream/50 py-6 justify-center font-semibold">
          <BarChart3 size={16} />
          Todavía no hay puntos aprobados en las últimas dos semanas.
        </div>
      ) : (
        <>
          <div className="flex items-stretch gap-1.5 h-32">
            {series.map((d, i) => {
              const isToday = i === series.length - 1
              const pct = (d.points / max) * 100
              return (
                <div key={i} className="flex-1 flex flex-col items-center gap-1.5 group">
                  <div className="w-full flex-1 flex items-end relative">
                    {d.points > 0 && (
                      <span className="absolute -top-4 left-0 right-0 text-center text-[9px] font-black text-rk-ink/50 dark:text-rk-cream/50 opacity-0 group-hover:opacity-100 transition">
                        {d.points}
                      </span>
                    )}
                    <div
                      className={cn(
                        'w-full rounded-t-md transition-all duration-500',
                        isToday
                          ? 'bg-rk-orange'
                          : d.points > 0
                          ? 'bg-rk-ink/75 dark:bg-rk-cream/70'
                          : 'bg-black/[0.06] dark:bg-white/[0.07]'
                      )}
                      style={{ height: `${Math.max(d.points > 0 ? 6 : 3, pct)}%` }}
                    />
                  </div>
                  <span
                    className={cn(
                      'text-[9px] font-bold',
                      isToday
                        ? 'text-rk-orange'
                        : 'text-rk-ink/40 dark:text-rk-cream/40'
                    )}
                  >
                    {DAY_LETTER[d.date.getDay()]}
                  </span>
                </div>
              )
            })}
          </div>
          <div className="mt-3 pt-3 border-t border-black/[0.04] dark:border-white/[0.05] text-[11px] font-semibold text-rk-ink/50 dark:text-rk-cream/50">
            {activos} {activos === 1 ? 'día' : 'días'} con actividad ·{' '}
            {formatPoints(Math.round(total / 14))} pts/día de media
          </div>
        </>
      )}
    </PanelSection>
  )
}

// ====================================================================
// Actividad reciente — últimos movimientos aprobados
// ====================================================================
function ActivityFeed({ items }) {
  return (
    <PanelSection tag="EL PULSO" title="Actividad reciente">
      {items.length === 0 ? (
        <div className="flex items-center gap-2 text-sm text-rk-ink/50 dark:text-rk-cream/50 py-6 justify-center font-semibold">
          <Activity size={16} />
          Aún no hay movimientos aprobados.
        </div>
      ) : (
        <div className="flex flex-col gap-1.5">
          {items.map((r) => {
            const negative = (r.points || 0) < 0
            return (
              <div
                key={r.id}
                className="flex items-center gap-3 px-3 py-2 rounded-xl bg-black/[0.02] dark:bg-white/[0.03]"
              >
                <Avatar name={r.userName} size="sm" />
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-bold truncate">{r.userName}</div>
                  <div className="text-[11px] text-rk-ink/55 dark:text-rk-cream/55 truncate">
                    {r.actionLabel}
                  </div>
                </div>
                <div className="text-[10px] font-semibold text-rk-ink/40 dark:text-rk-cream/40 whitespace-nowrap">
                  {relativeDate(r.reviewedAt)}
                </div>
                <div
                  className={cn(
                    'text-sm font-black tabular-nums w-14 text-right',
                    negative ? 'text-red-500' : 'text-rk-orange'
                  )}
                >
                  {negative ? '' : '+'}
                  {r.points}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </PanelSection>
  )
}

// ====================================================================
// Sin actividad esta semana — para dar un toque a quien toca
// ====================================================================
function InactiveStrip({ people, total }) {
  const activos = total - people.length

  return (
    <PanelSection
      tag="A QUIÉN DAR UN TOQUE"
      title="Sin sumar esta semana"
      badge={`${activos}/${total} activos`}
    >
      {people.length === 0 ? (
        <div className="flex items-center gap-2 text-sm text-emerald-600 dark:text-emerald-400 py-4 justify-center font-bold">
          <Check size={16} />
          ¡Todo el mundo ha sumado esta semana!
        </div>
      ) : (
        <div className="flex flex-wrap gap-2">
          {people.map((u) => {
            const ms = tsMs(u.lastActionAt)
            return (
              <div
                key={u.id}
                className="flex items-center gap-2 pl-1 pr-3 py-1 rounded-full bg-black/[0.04] dark:bg-white/[0.05]"
                title={
                  ms
                    ? `Última acción: ${relativeDate(u.lastActionAt)}`
                    : 'Nunca ha registrado nada'
                }
              >
                <Avatar name={u.name} size="sm" />
                <div className="leading-tight">
                  <div className="text-[11.5px] font-extrabold">{u.name}</div>
                  <div className="text-[9.5px] font-semibold text-rk-ink/45 dark:text-rk-cream/45">
                    {ms ? relativeDate(u.lastActionAt) : 'sin actividad'}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </PanelSection>
  )
}

// ====================================================================
// Clasificación completa de una liga (panel lateral)
// --------------------------------------------------------------------
// No hace ninguna lectura extra: los usuarios ya están cargados por el
// hook compartido, aquí solo se ordenan y se muestran.
// ====================================================================
function LeagueBoardDrawer({ league, onClose }) {
  const people = league?.people ?? []
  const totalPoints = people.reduce((acc, u) => acc + (u.points || 0), 0)
  const conPuntos = people.filter((u) => (u.points || 0) > 0).length

  return (
    <div
      className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex justify-end animate-fade-in"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-[520px] h-full bg-rk-cream dark:bg-rk-ink overflow-y-auto shadow-2xl"
      >
        {/* Cabecera */}
        <div className="sticky top-0 z-10 bg-rk-cream/95 dark:bg-rk-ink/95 backdrop-blur border-b border-black/[0.06] dark:border-white/[0.06] px-6 py-5">
          <div className="flex items-start gap-3">
            <div className="flex-1 min-w-0">
              <p className="text-[10px] font-extrabold tracking-[2px] text-rk-orange">
                CLASIFICACIÓN COMPLETA
              </p>
              <h2 className="text-xl font-black mt-0.5">{league.label}</h2>
              <p className="text-xs text-rk-ink/60 dark:text-rk-cream/60 mt-0.5">
                {people.length} participantes · {conPuntos} con puntos ·{' '}
                {formatPoints(totalPoints)} pts en total
              </p>
            </div>
            <button
              onClick={onClose}
              className="w-9 h-9 rounded-full bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10 flex items-center justify-center transition shrink-0"
              aria-label="Cerrar"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Listado */}
        <div className="px-6 py-5">
          {people.length === 0 ? (
            <div className="text-center text-sm text-rk-ink/50 dark:text-rk-cream/50 py-12">
              No hay participantes en esta liga.
            </div>
          ) : (
            <div className="flex flex-col gap-1.5">
              {people.map((u, i) => {
                const medal = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : null
                const sinPuntos = (u.points || 0) === 0
                return (
                  <div
                    key={u.id}
                    className={cn(
                      'flex items-center gap-3 px-3.5 py-2.5 rounded-xl border',
                      i === 0
                        ? 'bg-rk-orange/[0.07] border-rk-orange/25'
                        : 'bg-white dark:bg-rk-ink-card border-black/[0.04] dark:border-white/[0.05]',
                      sinPuntos && 'opacity-60'
                    )}
                  >
                    <div
                      className={cn(
                        'w-7 h-7 rounded-full flex items-center justify-center font-black text-xs shrink-0',
                        i === 0
                          ? 'bg-rk-orange text-white'
                          : 'bg-black/[0.06] text-rk-ink/70 dark:bg-white/[0.08] dark:text-rk-cream/70'
                      )}
                    >
                      {i + 1}
                    </div>
                    <Avatar name={u.name} size="sm" />
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-extrabold truncate flex items-center gap-1.5">
                        {u.name}
                        {medal && <span className="text-sm">{medal}</span>}
                      </div>
                      <div className="text-[10.5px] font-semibold text-rk-ink/45 dark:text-rk-cream/45">
                        {u.role === 'Codirector' ? 'Staff (Admin)' : u.role}
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="text-sm font-black text-rk-orange tabular-nums">
                        {formatPoints(u.points || 0)}
                      </div>
                      <div className="text-[10px] font-semibold text-rk-ink/40 dark:text-rk-cream/40 tabular-nums">
                        {formatPoints(u.lifetimePoints || 0)} hist.
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
