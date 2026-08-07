import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import {
  ChevronRight, Clock, Flame, Check, ArrowUp, ArrowDown,
} from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { useUsers } from '../hooks/useUsers'
import { useGroups } from '../hooks/useGroups'
import { useActionRequests } from '../hooks/useActionRequests'
import { useRank } from '../hooks/useRank'
import { LEAGUES, selfServiceActions } from '../lib/constants'
import { getUserLeague } from '../data/seedUsers'
import { formatPoints, cn } from '../lib/utils'
import Header from '../components/layout/Header'
import GlassCard from '../components/ui/GlassCard'
import RankBadge from '../components/ui/RankBadge'
import CircularProgress from '../components/ui/CircularProgress'

// --------------------------------------------------------------------
// Utilidades
// --------------------------------------------------------------------
function tsMs(value) {
  if (!value) return 0
  if (typeof value.toMillis === 'function') return value.toMillis()
  return new Date(value).getTime()
}

// Clave año+semana, para calcular la racha
function weekKey(ms) {
  const date = new Date(ms)
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()))
  const day = d.getUTCDay() || 7
  d.setUTCDate(d.getUTCDate() + 4 - day)
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1))
  const week = Math.ceil(((d - yearStart) / 86400000 + 1) / 7)
  return `${d.getUTCFullYear()}-W${String(week).padStart(2, '0')}`
}

function weekKeyOffset(weeksAgo) {
  return weekKey(Date.now() - weeksAgo * 7 * 86400000)
}

// --------------------------------------------------------------------
// Zona de premio: cuántos puestos reparten premio en cada liga
// --------------------------------------------------------------------
const PRIZE_SPOTS = { agentes: 5, obranueva: 2, staff: 3 }

function greeting() {
  const h = new Date().getHours()
  if (h < 6) return 'Buenas noches'
  if (h < 14) return 'Buenos días'
  if (h < 21) return 'Buenas tardes'
  return 'Buenas noches'
}

export default function Dashboard() {
  const { profile } = useAuth()
  const { users, topLifetime } = useUsers()
  const { groups } = useGroups()
  const { requests } = useActionRequests({ userId: profile?.id })

  const { rank, next, current, progress, pointsToNext, isEmbajador } = useRank({
    points: profile?.points ?? 0,
    lifetimePoints: profile?.lifetimePoints ?? 0,
    topLifetimeInAgency: topLifetime,
  })

  const league = getUserLeague(profile) ?? 'agentes'
  const leagueLabel = LEAGUES[league]?.label ?? 'Agentes'
  const quickActions = selfServiceActions(league).slice(0, 4)
  const recentRequests = requests.slice(0, 3)
  const pendingCount = requests.filter((r) => r.status === 'pending').length
  const firstName = profile?.name?.split(' ')[0] ?? ''

  // ---- Posición, entorno en la tabla y zona de premio ----
  const { position, leagueSize, neighbours, prize } = useMemo(() => {
    const board = users
      .filter((u) => getUserLeague(u) === league)
      .sort((a, b) => (b.points ?? 0) - (a.points ?? 0))
    const idx = board.findIndex((u) => u.id === profile?.id)
    const spots = PRIZE_SPOTS[league] ?? 3

    // Vecinos: uno por encima, tú, uno por debajo
    const rows = []
    if (idx > 0) rows.push({ user: board[idx - 1], pos: idx, self: false })
    if (idx >= 0) rows.push({ user: board[idx], pos: idx + 1, self: true })
    if (idx >= 0 && idx < board.length - 1)
      rows.push({ user: board[idx + 1], pos: idx + 2, self: false })

    // ¿Estoy en zona de premio? Si no, cuánto me falta para entrar
    let prizeInfo = null
    if (idx >= 0) {
      const pos = idx + 1
      if (pos <= spots) {
        prizeInfo = { inZone: true, pos, spots }
      } else {
        const lastInZone = board[spots - 1]
        const gap = lastInZone
          ? Math.max(1, (lastInZone.points ?? 0) - (profile?.points ?? 0) + 1)
          : null
        prizeInfo = { inZone: false, pos, spots, gap }
      }
    }

    return {
      position: idx >= 0 ? idx + 1 : null,
      leagueSize: board.length,
      neighbours: rows,
      prize: prizeInfo,
    }
  }, [users, league, profile?.id, profile?.points])

  // Captaciones aprobadas (solo existen como acción en Obra Nueva y Staff;
  // en Agentes las captaciones se llevan en el CRM, no en La Liga).
  const captaciones = useMemo(
    () =>
      requests.filter(
        (r) => r.status === 'approved' && String(r.actionType).startsWith('captacion_')
      ).length,
    [requests]
  )

  // ---- Racha: semanas consecutivas con alguna acción aprobada ----
  const streak = useMemo(() => {
    const weeks = new Set(
      requests
        .filter((r) => r.status === 'approved')
        .map((r) => tsMs(r.reviewedAt) || tsMs(r.createdAt))
        .filter(Boolean)
        .map(weekKey)
    )
    if (weeks.size === 0) return 0
    // Arrancamos en la semana actual; si aún no hay nada, probamos la anterior
    // para no "romper" la racha a mitad de semana.
    let start = weeks.has(weekKeyOffset(0)) ? 0 : weeks.has(weekKeyOffset(1)) ? 1 : null
    if (start === null) return 0
    let count = 0
    for (let i = start; i < start + 52; i++) {
      if (weeks.has(weekKeyOffset(i))) count++
      else break
    }
    return count
  }, [requests])

  // ---- Mi equipo y su posición ----
  const myTeam = useMemo(() => {
    if (!profile?.groupId) return null
    const sorted = [...groups].sort(
      (a, b) => (b.totalPoints ?? 0) - (a.totalPoints ?? 0)
    )
    const idx = sorted.findIndex((g) => g.id === profile.groupId)
    if (idx < 0) return null
    return { ...sorted[idx], position: idx + 1, total: sorted.length }
  }, [groups, profile?.groupId])

  // ---- Aviso, solo cuando hay algo que hacer ----
  // El resto de estados (vas líder, te falta poco para subir de rango) ya
  // se leen en el marcador, así que no se repiten aquí.
  const nudge = useMemo(() => {
    const daysSince = profile?.lastActionAt
      ? Math.floor((Date.now() - tsMs(profile.lastActionAt)) / 86400000)
      : null
    if (daysSince === null) return null // los nuevos ya tienen "primeros pasos"
    if (daysSince >= 7)
      return `Llevas ${daysSince} días sin sumar. Cualquier acción cuenta.`
    return null
  }, [profile?.lastActionAt])

  // ---- Puntos ganados en los últimos 7 días ----
  const weekStats = useMemo(() => {
    const cutoff = Date.now() - 7 * 86400000
    const recent = requests.filter(
      (r) => r.status === 'approved' && tsMs(r.reviewedAt) >= cutoff
    )
    return {
      points: recent.reduce((acc, r) => acc + (r.points || 0), 0),
      actions: recent.length,
    }
  }, [requests])

  // ---- Primeros pasos: solo usuarios nuevos ----
  // Los que ya jugaban tienen primerosPasos: 'hecho' (script de backfill).
  const firstSteps = useMemo(() => {
    if (profile?.primerosPasos === 'hecho') return null
    const tasks = [
      { id: 'pass', label: 'Cambia tu contraseña', done: true, hint: null },
      {
        id: 'accion',
        label: 'Registra tu primera acción',
        done: requests.length > 0,
        hint: '+5 pts',
        to: '/registrar',
      },
      {
        id: 'punto',
        label: 'Consigue tu primer punto',
        done: (profile?.lifetimePoints ?? 0) > 0,
        hint: null,
      },
    ]
    const done = tasks.filter((t) => t.done).length
    if (done === tasks.length) return null // completado: desaparece
    return { tasks, done, total: tasks.length }
  }, [profile?.primerosPasos, profile?.lifetimePoints, requests.length])

  return (
    <div className="space-y-5 animate-fade-in">
      <Header title={`${greeting()}, ${firstName}`} subtitle="La Liga RK" showLogout />

      {/* MARCADOR — todo el estado de un vistazo */}
      <div className="relative overflow-hidden rounded-3xl bg-rk-ink text-white p-5 shadow-xl">
        <div className="absolute -top-14 -right-12 w-44 h-44 rounded-full pointer-events-none"
          style={{ background: 'radial-gradient(circle, rgba(207,115,27,.42), transparent 68%)' }}
        />
        <div className="relative flex items-center gap-4">
          <CircularProgress
            progress={isEmbajador ? 1 : progress}
            rankKey={rank.id}
            auraColor={rank.auraColor}
            size={112}
            strokeWidth={9}
            trackColor="rgba(255,255,255,0.14)"
            trackColorDark="rgba(255,255,255,0.14)"
          >
            <div className="text-[28px] font-black tracking-tight leading-none">
              {formatPoints(profile?.points)}
            </div>
            <div className="text-[8.5px] font-bold uppercase tracking-[1.4px] text-white/50 mt-1">
              puntos
            </div>
          </CircularProgress>

          <div className="flex-1 min-w-0">
            <RankBadge rankId={rank.id} size="sm" />
            {position && (
              <div className="text-[21px] font-black tracking-tight mt-2 leading-none">
                {position}º{' '}
                <span className="text-[11.5px] font-bold text-white/55">
                  de {leagueSize} · {leagueLabel}
                </span>
              </div>
            )}
            <div className="text-[11px] font-semibold text-white/60 mt-1.5">
              {isEmbajador ? (
                rank.description
              ) : next ? (
                <>
                  {next.label} a{' '}
                  <span className="font-black text-rk-orange-light">
                    {formatPoints(pointsToNext)} pts
                  </span>
                </>
              ) : (
                current.description
              )}
            </div>
          </div>
        </div>

        {/* Pista de progreso con la marca de zona de premio */}
        {prize && (
          <div className="relative mt-4">
            <div className="h-[7px] rounded-full bg-white/[0.13] relative overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-700"
                style={{
                  width: `${Math.max(4, Math.min(100, ((leagueSize - position + 1) / leagueSize) * 100))}%`,
                  background: 'linear-gradient(90deg,#cf731b,#f0a94f)',
                }}
              />
            </div>
            {/* marca de la zona de premio */}
            <div
              className="absolute -top-1 w-[2px] h-[15px] rounded bg-amber-300/85"
              style={{
                left: `${Math.min(97, ((leagueSize - prize.spots) / leagueSize) * 100)}%`,
              }}
            />
            <div className="flex justify-between mt-2 text-[8.5px] font-bold tracking-wide text-white/45">
              <span>Último</span>
              <span className="text-amber-300">◆ zona premio</span>
              <span>1º</span>
            </div>
          </div>
        )}

        {/* Zona de premio, integrada en el marcador */}
        {prize && (
          <div className="relative mt-3.5 pt-3.5 border-t border-white/10">
            {prize.inZone ? (
              <div className="flex items-center gap-2">
                <span className="text-sm">🏅</span>
                <span className="text-[12px] font-black text-amber-300">
                  En zona de premio · puesto {prize.pos} de {prize.spots}
                </span>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <span className="text-sm">🎯</span>
                <span className="text-[12px] font-bold text-white/70">
                  A{' '}
                  <span className="font-black text-rk-orange-light">
                    {formatPoints(prize.gap)} pts
                  </span>{' '}
                  de los {prize.spots} premiados
                </span>
              </div>
            )}

            {/* Requisito de captaciones, solo si aplica */}
            {prize.inZone && league === 'agentes' && prize.pos <= 2 && (
              <p className="text-[10.5px] font-semibold text-white/50 mt-1.5 leading-snug">
                El 1º y 2º exigen mínimo 5 captaciones (sin contar gerencia y
                oficina).
              </p>
            )}
            {prize.inZone && league !== 'agentes' && (
              <p
                className={cn(
                  'text-[10.5px] font-bold mt-1.5',
                  captaciones >= 1 ? 'text-emerald-400' : 'text-amber-300/80'
                )}
              >
                {captaciones >= 1
                  ? `✓ Requisito cumplido: ${captaciones} ${captaciones === 1 ? 'captación' : 'captaciones'}`
                  : 'Te falta 1 captación para optar al premio'}
              </p>
            )}
          </div>
        )}
      </div>

      {/* Primeros pasos (solo usuarios nuevos) */}
      {firstSteps && (
        <GlassCard className="!p-4">
          <div className="flex items-center justify-between">
            <span className="text-sm font-black">Primeros pasos</span>
            <span className="text-[10.5px] font-extrabold text-rk-orange">
              {firstSteps.done} de {firstSteps.total}
            </span>
          </div>
          <div className="h-[5px] rounded-full bg-black/[0.07] dark:bg-white/[0.09] my-3 overflow-hidden">
            <div
              className="h-full rounded-full bg-rk-orange transition-all duration-500"
              style={{ width: `${(firstSteps.done / firstSteps.total) * 100}%` }}
            />
          </div>
          <div className="divide-y divide-black/[0.05] dark:divide-white/[0.06]">
            {firstSteps.tasks.map((t) => {
              const Row = (
                <div className="flex items-center gap-2.5 py-2.5">
                  <div
                    className={cn(
                      'w-5 h-5 rounded-md shrink-0 flex items-center justify-center',
                      t.done
                        ? 'bg-emerald-500 text-white'
                        : 'border-2 border-black/15 dark:border-white/20'
                    )}
                  >
                    {t.done && <Check size={12} strokeWidth={3.5} />}
                  </div>
                  <span
                    className={cn(
                      'flex-1 text-[12.5px] font-bold',
                      t.done && 'line-through text-rk-ink/35 dark:text-rk-cream/35'
                    )}
                  >
                    {t.label}
                  </span>
                  {!t.done && t.hint && (
                    <span className="text-[10.5px] font-extrabold text-rk-orange">
                      {t.hint}
                    </span>
                  )}
                </div>
              )
              return t.to && !t.done ? (
                <Link key={t.id} to={t.to} className="block active:opacity-70">
                  {Row}
                </Link>
              ) : (
                <div key={t.id}>{Row}</div>
              )
            })}
          </div>
        </GlassCard>
      )}

      {/* Tu entorno en la tabla */}
      {neighbours.length > 1 && (
        <Link to="/ranking" className="block active:scale-[0.99] transition-transform">
          <GlassCard className="!p-4">
            <div className="flex items-center justify-between mb-2.5">
              <span className="text-xs font-semibold uppercase tracking-wider text-rk-ink/50 dark:text-rk-cream/50">
                Tu zona de la tabla
              </span>
              <ChevronRight size={16} className="text-rk-ink/30 dark:text-rk-cream/30" />
            </div>
            <div className="space-y-1.5">
              {neighbours.map((row) => {
                const diff = row.self
                  ? null
                  : (row.user.points ?? 0) - (profile?.points ?? 0)
                return (
                  <div
                    key={row.user.id}
                    className={cn(
                      'flex items-center gap-2.5 px-2.5 py-2 rounded-xl',
                      row.self
                        ? 'bg-rk-orange/12 ring-1 ring-rk-orange/30'
                        : 'bg-black/[0.03] dark:bg-white/[0.04]'
                    )}
                  >
                    <span
                      className={cn(
                        'w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-black shrink-0',
                        row.self
                          ? 'bg-rk-orange text-white'
                          : 'bg-black/[0.07] dark:bg-white/[0.08] text-rk-ink/60 dark:text-rk-cream/60'
                      )}
                    >
                      {row.pos}
                    </span>
                    <span
                      className={cn(
                        'flex-1 text-sm truncate',
                        row.self ? 'font-black' : 'font-bold text-rk-ink/75 dark:text-rk-cream/75'
                      )}
                    >
                      {row.self ? 'Tú' : row.user.name}
                    </span>
                    {diff !== null && (
                      <span
                        className={cn(
                          'text-[11px] font-bold flex items-center gap-0.5',
                          diff > 0 ? 'text-rk-ink/45 dark:text-rk-cream/45' : 'text-emerald-600 dark:text-emerald-400'
                        )}
                      >
                        {diff > 0 ? <ArrowUp size={11} /> : <ArrowDown size={11} />}
                        {formatPoints(Math.abs(diff))}
                      </span>
                    )}
                    <span
                      className={cn(
                        'text-sm font-black tabular-nums w-12 text-right',
                        row.self ? 'text-rk-orange' : 'text-rk-ink/70 dark:text-rk-cream/70'
                      )}
                    >
                      {formatPoints(row.user.points ?? 0)}
                    </span>
                  </div>
                )
              })}
            </div>
          </GlassCard>
        </Link>
      )}

      {/* Aviso, solo si lleva tiempo sin sumar */}
      {nudge && (
        <div className="rounded-2xl px-4 py-3 text-[12.5px] font-bold text-center bg-black/[0.04] dark:bg-white/[0.05] text-rk-ink/70 dark:text-rk-cream/70">
          {nudge}
        </div>
      )}

      {/* Esta semana — tres cifras en una sola tira */}
      <div className="grid grid-cols-3 rounded-2xl overflow-hidden glass">
        <div className="py-3.5 text-center border-r border-black/[0.06] dark:border-white/[0.07]">
          <div className="text-xl font-black flex items-center justify-center gap-1">
            {streak > 0 && <Flame size={15} className="text-orange-500" />}
            {streak > 0 ? streak : '—'}
          </div>
          <div className="text-[8.5px] font-bold uppercase tracking-wider text-rk-ink/45 dark:text-rk-cream/45 mt-0.5">
            {streak === 1 ? 'Semana' : 'Racha'}
          </div>
        </div>
        <div className="py-3.5 text-center border-r border-black/[0.06] dark:border-white/[0.07]">
          <div className="text-xl font-black text-rk-orange">
            +{formatPoints(weekStats.points)}
          </div>
          <div className="text-[8.5px] font-bold uppercase tracking-wider text-rk-ink/45 dark:text-rk-cream/45 mt-0.5">
            Esta sem.
          </div>
        </div>
        <div className="py-3.5 text-center">
          <div className="text-xl font-black">{weekStats.actions}</div>
          <div className="text-[8.5px] font-bold uppercase tracking-wider text-rk-ink/45 dark:text-rk-cream/45 mt-0.5">
            Acciones
          </div>
        </div>
      </div>

      {/* Mi equipo */}
      {myTeam && (
        <Link to="/ranking" className="block active:scale-[0.99] transition-transform">
          <GlassCard className="!p-4 flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-xl shrink-0"
              style={{ backgroundColor: myTeam.color ?? '#cf731b' }}
            />
            <div className="flex-1 min-w-0">
              <div className="text-xs font-semibold uppercase tracking-wider text-rk-ink/50 dark:text-rk-cream/50">
                Tu equipo
              </div>
              <div className="text-sm font-bold truncate mt-0.5">{myTeam.name}</div>
            </div>
            <div className="text-right shrink-0">
              <div className="text-sm font-black text-rk-orange">
                {myTeam.position}º de {myTeam.total}
              </div>
              <div className="text-[10px] font-semibold text-rk-ink/45 dark:text-rk-cream/45">
                {formatPoints(myTeam.totalPoints ?? 0)} pts
              </div>
            </div>
          </GlassCard>
        </Link>
      )}

      {/* Registra rápido — tira horizontal */}
      <section>
        <div className="flex items-center justify-between mb-2.5">
          <h2 className="text-base font-black">Registra rápido</h2>
          <Link
            to="/registrar"
            className="text-xs font-bold text-rk-orange flex items-center gap-0.5"
          >
            Todas <ChevronRight size={14} />
          </Link>
        </div>
        <div className="flex gap-2.5 overflow-x-auto -mx-4 px-4 pb-1 scrollbar-none">
          {quickActions.map((action) => (
            <Link
              key={action.id}
              to={`/registrar?tipo=${action.id}`}
              className="glass rounded-2xl p-3.5 min-w-[96px] shrink-0 active:scale-[0.97] transition-transform"
            >
              <div className="text-xl">{action.icon}</div>
              <div className="text-[11.5px] font-extrabold leading-tight mt-2">
                {action.shortLabel}
              </div>
              <div className="text-[10.5px] font-bold text-rk-orange mt-0.5">
                +{action.points} pts
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* Tu actividad — una fila, el detalle en su pantalla */}
      <Link to="/notificaciones" className="block active:scale-[0.99] transition-transform">
        <GlassCard className="!p-4 flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-black/[0.05] dark:bg-white/[0.07] flex items-center justify-center shrink-0">
            <Clock size={17} className="text-rk-ink/55 dark:text-rk-cream/55" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-[13px] font-extrabold">Tu actividad</div>
            <div className="text-[11px] font-semibold text-rk-ink/55 dark:text-rk-cream/55">
              {requests.length === 0
                ? 'Aún no has registrado nada'
                : pendingCount > 0
                ? `${pendingCount} pendiente${pendingCount === 1 ? '' : 's'} de aprobar`
                : `${requests.length} ${requests.length === 1 ? 'acción' : 'acciones'} registradas`}
            </div>
          </div>
          {pendingCount > 0 && (
            <span className="w-6 h-6 rounded-full bg-amber-400/20 text-amber-700 dark:text-amber-300 text-[11px] font-black flex items-center justify-center">
              {pendingCount}
            </span>
          )}
          <ChevronRight size={17} className="text-rk-ink/25 dark:text-rk-cream/25" />
        </GlassCard>
      </Link>
    </div>
  )
}




