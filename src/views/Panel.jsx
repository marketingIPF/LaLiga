import { useState, useMemo } from 'react'
import { Navigate } from 'react-router-dom'
import { Check, Activity, BarChart3, X } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { useUsers } from '../hooks/useUsers'
import { useGroups } from '../hooks/useGroups'
import {
  useActionRequests,
  approveRequest,
  rejectRequest,
} from '../hooks/useActionRequests'
import { getUserLeague } from '../data/seedUsers'
import { PRIZE_SPOTS, premioDe } from '../lib/premios'
import { formatPoints, relativeDate, cn } from '../lib/utils'
import Avatar from '../components/ui/Avatar'

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
  const [ligaTab, setLigaTab] = useState('agentes')
  const { firebaseUser, isAdmin } = useAuth()

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

  const maxTeamPts = teams[0]?.totalPoints || 1

  const fecha = new Date().toLocaleDateString('es-ES', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  })
  const totalPersonas =
    agents.length + staffLeague.length + obraNuevaLeague.length
  const ligaActiva = boards[ligaTab]

  return (
    <div className="min-w-[900px] max-w-[1360px] animate-fade-in">
      {/* Título */}
      <h1 className="text-[27px] font-black tracking-tight">Resumen</h1>
      <p className="text-[12.5px] font-semibold text-rk-ink/40 dark:text-rk-cream/40 mt-1 first-letter:uppercase">
        {fecha} · {totalPersonas} personas compitiendo
      </p>

      {/* KPIs — sin cajas, separados por líneas */}
      <div className="flex border-y border-black/[0.08] dark:border-white/[0.09] mt-6">
        <Kpi
          label="Pendientes"
          value={pending.length}
          sub={pending.length === 0 ? 'todo al día' : 'esperando revisión'}
          accent={pending.length > 0}
        />
        <Kpi
          label="Puntos del periodo"
          value={formatPoints(totals.points)}
          sub={
            weekDeltas.points > 0
              ? `+${formatPoints(weekDeltas.points)} esta semana`
              : 'sin movimiento'
          }
          up={weekDeltas.points > 0}
        />
        <Kpi
          label="Agentes activos"
          value={agents.length}
          sub={`en ${teams.length} ${teams.length === 1 ? 'equipo' : 'equipos'}`}
        />
        <Kpi
          label="Staff"
          value={formatPoints(totals.staffPoints)}
          sub={`${staffLeague.length} participantes`}
        />
        <Kpi
          label="Obra Nueva"
          value={formatPoints(totals.obraNuevaPoints)}
          sub={`${obraNuevaLeague.length} participantes`}
        />
      </div>

      <div className="grid grid-cols-[1.35fr_1fr] gap-6 items-start mt-2">
        {/* ---------------- Columna izquierda ---------------- */}
        <div>
          <Seccion
            titulo="Pendientes"
            nota={pending.length > 0 ? `${pending.length} esperando` : null}
          >
            {pending.length === 0 ? (
              <Vacio icono={<Check size={15} />} texto="Todo al día. No hay nada por revisar." />
            ) : (
              pending.map((p, i) => (
                <PendingItem
                  key={p.id}
                  item={p}
                  adminUid={firebaseUser?.uid}
                  ultimo={i === pending.length - 1}
                />
              ))
            )}
          </Seccion>

          {/* Gráfico sin contenedor */}
          <div className="mt-7">
            <div className="flex items-baseline mb-2.5">
              <h2 className="text-[15.5px] font-black tracking-tight">Ritmo</h2>
              <span className="text-[11.5px] font-semibold text-rk-ink/38 dark:text-rk-cream/38 ml-2.5">
                últimos 14 días · {formatPoints(dailySeries.reduce((a, d) => a + d.points, 0))} pts
              </span>
            </div>
            <DailyChart series={dailySeries} />
          </div>

          <Seccion titulo="Actividad reciente" className="mt-7">
            {recentActivity.length === 0 ? (
              <Vacio icono={<Activity size={15} />} texto="Aún no hay movimientos aprobados." />
            ) : (
              recentActivity.map((r, i) => (
                <ActivityRow key={r.id} item={r} ultimo={i === recentActivity.length - 1} />
              ))
            )}
          </Seccion>
        </div>

        {/* ---------------- Columna derecha ---------------- */}
        <div>
          {/* Clasificación unificada */}
          <div>
            <div className="flex items-center mb-2.5">
              <h2 className="text-[15.5px] font-black tracking-tight">
                Clasificación
              </h2>
              <div className="ml-auto inline-flex bg-black/[0.055] dark:bg-white/[0.07] rounded-lg p-[2px] gap-[2px]">
                {[
                  { id: 'agentes', label: 'Agentes' },
                  { id: 'obranueva', label: 'Obra N.' },
                  { id: 'staff', label: 'Staff' },
                ].map((t) => (
                  <button
                    key={t.id}
                    onClick={() => setLigaTab(t.id)}
                    className={cn(
                      'px-3 py-[5px] rounded-md text-[11px] font-bold transition',
                      ligaTab === t.id
                        ? 'bg-white dark:bg-rk-ink-card shadow-sm font-extrabold'
                        : 'text-rk-ink/45 dark:text-rk-cream/45'
                    )}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="bg-white dark:bg-rk-ink-card border border-black/[0.07] dark:border-white/[0.08] rounded-xl overflow-hidden">
              {ligaActiva.people.length === 0 ? (
                <Vacio texto="Sin datos todavía." />
              ) : (
                <>
                  {ligaActiva.people.slice(0, 7).map((u, i) => {
                    const premio = premioDe(ligaTab, i + 1)
                    const premiado = i + 1 <= (PRIZE_SPOTS[ligaTab] ?? 3)
                    return (
                      <div
                        key={u.id}
                        className={cn(
                          'flex items-center gap-3 px-4 py-[9px] border-b border-black/[0.055] dark:border-white/[0.06]',
                          !premiado && 'bg-black/[0.015] dark:bg-white/[0.02]'
                        )}
                      >
                        <span
                          className={cn(
                            'w-5 text-center text-[11.5px] font-black',
                            i === 0
                              ? 'text-rk-orange'
                              : 'text-rk-ink/30 dark:text-rk-cream/30'
                          )}
                        >
                          {i + 1}
                        </span>
                        <span
                          className={cn(
                            'flex-1 text-[12.5px] truncate',
                            premiado
                              ? 'font-bold'
                              : 'font-semibold text-rk-ink/55 dark:text-rk-cream/55'
                          )}
                        >
                          {u.name}
                        </span>
                        {premio && (
                          <span className="text-[9.5px] font-bold text-rk-ink/35 dark:text-rk-cream/35 truncate max-w-[110px]">
                            🏅 {premio.nombre}
                          </span>
                        )}
                        <span
                          className={cn(
                            'text-[13px] font-black tabular-nums w-11 text-right',
                            !premiado && 'text-rk-ink/55 dark:text-rk-cream/55'
                          )}
                        >
                          {formatPoints(u.points || 0)}
                        </span>
                      </div>
                    )
                  })}
                  <button
                    onClick={() => setOpenBoard(ligaTab)}
                    className="w-full py-2.5 text-[11.5px] font-extrabold text-rk-orange hover:bg-rk-orange/[0.06] transition"
                  >
                    Ver los {ligaActiva.people.length} ›
                  </button>
                </>
              )}
            </div>
          </div>

          <Seccion titulo="Equipos" className="mt-7">
            {teams.length === 0 ? (
              <Vacio texto="No hay equipos creados todavía." />
            ) : (
              teams.map((t, i) => (
                <div
                  key={t.id}
                  className={cn(
                    'px-4 py-[11px]',
                    i < teams.length - 1 &&
                      'border-b border-black/[0.055] dark:border-white/[0.06]'
                  )}
                >
                  <div className="flex justify-between items-baseline">
                    <span className="text-[12.5px] font-extrabold truncate pr-2">
                      {t.name}
                    </span>
                    <span
                      className={cn(
                        'text-[12.5px] font-black tabular-nums',
                        i === 0 && 'text-rk-orange'
                      )}
                    >
                      {formatPoints(t.totalPoints || 0)}
                    </span>
                  </div>
                  <div className="h-1 rounded-full bg-black/[0.06] dark:bg-white/[0.08] mt-[7px] overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-700"
                      style={{
                        width: `${Math.max(2, ((t.totalPoints || 0) / maxTeamPts) * 100)}%`,
                        backgroundColor: t.color ?? '#cf731b',
                      }}
                    />
                  </div>
                </div>
              ))
            )}
          </Seccion>

          <Seccion
            titulo="Sin sumar"
            nota={`${totalPersonas - inactivos.length} de ${totalPersonas} activos`}
            className="mt-7"
          >
            {inactivos.length === 0 ? (
              <Vacio icono={<Check size={15} />} texto="Todo el mundo ha sumado esta semana." />
            ) : (
              <div className="flex flex-wrap gap-2 px-4 py-3.5">
                {inactivos.map((u) => (
                  <div
                    key={u.id}
                    className="flex items-center gap-2 pl-1 pr-3 py-1 rounded-full bg-black/[0.04] dark:bg-white/[0.05]"
                    title={
                      tsMs(u.lastActionAt)
                        ? `Última acción: ${relativeDate(u.lastActionAt)}`
                        : 'Nunca ha registrado nada'
                    }
                  >
                    <Avatar name={u.name} size="sm" />
                    <div className="leading-tight">
                      <div className="text-[11px] font-extrabold">
                        {u.name.split(' ')[0]}{' '}
                        {u.name.split(' ')[1]?.charAt(0)
                          ? `${u.name.split(' ')[1].charAt(0)}.`
                          : ''}
                      </div>
                      <div className="text-[9px] font-semibold text-rk-ink/38 dark:text-rk-cream/38">
                        {tsMs(u.lastActionAt) ? relativeDate(u.lastActionAt) : 'sin actividad'}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Seccion>
        </div>
      </div>

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
// Piezas del panel
// ====================================================================
function Kpi({ label, value, sub, accent = false, up = false }) {
  return (
    <div className="flex-1 py-4 px-1 relative first:pl-0">
      <div className="absolute left-0 top-[20%] h-[60%] w-px bg-black/[0.08] dark:bg-white/[0.09] first:hidden" />
      <div className="text-[9.5px] font-bold text-rk-ink/40 dark:text-rk-cream/40">
        {label}
      </div>
      <div
        className={cn(
          'text-[30px] font-black tracking-tight leading-none mt-1',
          accent && 'text-rk-orange'
        )}
      >
        {value}
      </div>
      <div
        className={cn(
          'text-[10.5px] font-semibold mt-1.5',
          up
            ? 'text-emerald-600 dark:text-emerald-400 font-bold'
            : 'text-rk-ink/35 dark:text-rk-cream/35'
        )}
      >
        {sub}
      </div>
    </div>
  )
}

// Sección con el título FUERA del contenedor
function Seccion({ titulo, nota, enlace, onEnlace, className, children }) {
  return (
    <div className={className}>
      <div className="flex items-baseline mb-2.5">
        <h2 className="text-[15.5px] font-black tracking-tight">{titulo}</h2>
        {nota && (
          <span className="text-[11.5px] font-semibold text-rk-ink/38 dark:text-rk-cream/38 ml-2.5">
            {nota}
          </span>
        )}
        {enlace && (
          <button
            onClick={onEnlace}
            className="ml-auto text-[11.5px] font-bold text-rk-orange"
          >
            {enlace}
          </button>
        )}
      </div>
      <div className="bg-white dark:bg-rk-ink-card border border-black/[0.07] dark:border-white/[0.08] rounded-xl overflow-hidden">
        {children}
      </div>
    </div>
  )
}

function Vacio({ icono, texto }) {
  return (
    <div className="flex items-center justify-center gap-2 py-9 text-[12.5px] font-semibold text-rk-ink/40 dark:text-rk-cream/40">
      {icono}
      {texto}
    </div>
  )
}

function ActivityRow({ item, ultimo }) {
  const negative = (item.points || 0) < 0
  return (
    <div
      className={cn(
        'flex items-center gap-3 px-4 py-[11px]',
        !ultimo && 'border-b border-black/[0.055] dark:border-white/[0.06]'
      )}
    >
      <Avatar name={item.userName} size="sm" />
      <div className="flex-1 min-w-0">
        <div className="text-[12.5px] font-extrabold truncate">{item.userName}</div>
        <div className="text-[11px] font-semibold text-rk-ink/42 dark:text-rk-cream/42 truncate">
          {item.actionLabel}
        </div>
      </div>
      <div className="text-[10.5px] font-semibold text-rk-ink/35 dark:text-rk-cream/35 whitespace-nowrap">
        {relativeDate(item.reviewedAt)}
      </div>
      <div
        className={cn(
          'text-[14px] font-black tabular-nums w-14 text-right',
          negative ? 'text-red-500' : 'text-rk-orange'
        )}
      >
        {negative ? '' : '+'}
        {item.points}
      </div>
    </div>
  )
}

function PendingItem({ item, adminUid, ultimo = false }) {
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
    <div
      className={cn(
        'flex items-center gap-3 px-4 py-3',
        !ultimo && 'border-b border-black/[0.055] dark:border-white/[0.06]'
      )}
    >
      <Avatar name={item.userName} size="sm" />
      <div className="flex-1 min-w-0">
        <div className="font-extrabold text-[13px] truncate">{item.userName}</div>
        <div className="text-[11px] font-semibold text-rk-ink/45 dark:text-rk-cream/45 mt-0.5 truncate">
          {meta}
        </div>
      </div>
      <div className="font-black text-rk-orange whitespace-nowrap text-[15px]">
        {amount}
      </div>
      <button
        onClick={handleReject}
        disabled={busy}
        className="px-2.5 py-1.5 text-red-500 rounded-lg text-[11.5px] font-bold hover:bg-red-500/[0.08] transition disabled:opacity-40"
      >
        Rechazar
      </button>
      <button
        onClick={handleApprove}
        disabled={busy}
        className="px-3.5 py-1.5 bg-rk-ink dark:bg-rk-cream text-rk-cream dark:text-rk-ink rounded-lg text-[11.5px] font-extrabold hover:opacity-85 transition disabled:opacity-40"
      >
        Aprobar
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
// Evolución de puntos por día (últimos 14 días)
// ====================================================================
function DailyChart({ series }) {
  const max = Math.max(1, ...series.map((d) => d.points))
  const total = series.reduce((acc, d) => acc + d.points, 0)
  const activos = series.filter((d) => d.points > 0).length
  const DAY_LETTER = ['D', 'L', 'M', 'X', 'J', 'V', 'S']

  if (total === 0) {
    return (
      <div className="flex items-center justify-center gap-2 py-8 text-[12.5px] font-semibold text-rk-ink/40 dark:text-rk-cream/40">
        <BarChart3 size={15} />
        Sin puntos aprobados en las últimas dos semanas.
      </div>
    )
  }

  return (
    <>
      <div className="flex items-stretch gap-1.5 h-24">
        {series.map((d, i) => {
          const isToday = i === series.length - 1
          const pct = (d.points / max) * 100
          return (
            <div key={i} className="flex-1 flex flex-col items-center gap-1.5 group">
              <div className="w-full flex-1 flex items-end relative">
                {d.points > 0 && (
                  <span className="absolute -top-4 left-0 right-0 text-center text-[9px] font-black text-rk-ink/45 dark:text-rk-cream/45 opacity-0 group-hover:opacity-100 transition">
                    {d.points}
                  </span>
                )}
                <div
                  className={cn(
                    'w-full rounded-t-[3px] transition-all duration-500',
                    isToday
                      ? 'bg-rk-orange'
                      : d.points > 0
                      ? 'bg-rk-ink/[0.17] dark:bg-rk-cream/20'
                      : 'bg-black/[0.05] dark:bg-white/[0.06]'
                  )}
                  style={{ height: `${Math.max(d.points > 0 ? 5 : 2, pct)}%` }}
                />
              </div>
              <span
                className={cn(
                  'text-[8.5px] font-bold',
                  isToday
                    ? 'text-rk-orange'
                    : 'text-rk-ink/28 dark:text-rk-cream/28'
                )}
              >
                {DAY_LETTER[d.date.getDay()]}
              </span>
            </div>
          )
        })}
      </div>
      <div className="border-t border-black/[0.08] dark:border-white/[0.09] mt-2.5 pt-2.5 text-[11px] font-semibold text-rk-ink/38 dark:text-rk-cream/38">
        {activos} {activos === 1 ? 'día' : 'días'} con actividad ·{' '}
        {formatPoints(Math.round(total / 14))} pts/día de media
      </div>
    </>
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
        className="w-full max-w-[520px] h-full bg-rk-cream dark:bg-rk-ink overflow-y-auto border-l border-black/[0.06] dark:border-white/[0.08]"
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
            <div className="divide-y divide-black/[0.05] dark:divide-white/[0.06]">
              {people.map((u, i) => {
                const medal = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : null
                const sinPuntos = (u.points || 0) === 0
                return (
                  <div
                    key={u.id}
                    className={cn(
                      'flex items-center gap-3 px-3 py-2.5 rounded-xl',
                      i === 0 && 'bg-rk-orange/[0.07]',
                      sinPuntos && 'opacity-55'
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
