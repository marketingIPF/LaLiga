import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import {
  ChevronRight, Flame, Check, ArrowUp, ArrowDown,
} from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { useUsers } from '../hooks/useUsers'
import { useGroups } from '../hooks/useGroups'
import { useActionRequests } from '../hooks/useActionRequests'
import { useRank } from '../hooks/useRank'
import { LEAGUES, selfServiceActions } from '../lib/constants'
import { PRIZE_SPOTS, premioDe } from '../lib/premios'
import { getUserLeague } from '../data/seedUsers'
import { formatPoints, cn } from '../lib/utils'
import Header from '../components/layout/Header'
import GlassCard from '../components/ui/GlassCard'
import DualProgress from '../components/ui/DualProgress'

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

// Orden de las acciones rápidas: primero las que más se usan
const ORDEN_RAPIDAS = [
  'publicar_rrss',
  'resena_google',
  'grabar_reel',
  'win_win',
  'comercio_aliado',
  'formacion',
  'crear_evento',
]

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
  const quickActions = useMemo(() => {
    const orden = (a) => {
      const i = ORDEN_RAPIDAS.indexOf(a.id)
      return i === -1 ? 99 : i
    }
    return [...selfServiceActions(league)].sort((a, b) => orden(a) - orden(b)).slice(0, 4)
  }, [league])
  const recentRequests = requests.slice(0, 3)
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
        prizeInfo = { inZone: true, pos, spots, ringProgress: 1 }
      } else {
        const lastInZone = board[spots - 1]
        const objetivo = (lastInZone?.points ?? 0) + 1
        const gap = lastInZone
          ? Math.max(1, objetivo - (profile?.points ?? 0))
          : null
        // El anillo interior muestra lo cerca que estás del corte
        const ringProgress = objetivo > 0
          ? Math.max(0, Math.min(0.97, (profile?.points ?? 0) / objetivo))
          : 0
        prizeInfo = { inZone: false, pos, spots, gap, ringProgress }
      }
    }

    return {
      position: idx >= 0 ? idx + 1 : null,
      leagueSize: board.length,
      neighbours: rows,
      prize: prizeInfo,
    }
  }, [users, league, profile?.id, profile?.points])

  // Captaciones aprobadas. En Agentes, las entrevistas M1/M2/M3 SON las
  // captaciones; en Obra Nueva y Staff son las captaciones M1/M2/M3.
  const captaciones = useMemo(
    () =>
      requests.filter((r) => {
        if (r.status !== 'approved') return false
        const tipo = String(r.actionType)
        return tipo.startsWith('captacion_') || tipo.startsWith('entrevista_')
      }).length,
    [requests]
  )

  // Mínimo exigido según liga (Agentes: 5, solo para 1º y 2º)
  const minCaptaciones = league === 'agentes' ? 5 : 1

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

  // Premio que te corresponde ahora (o el del último puesto premiado,
  // como zanahoria si estás fuera)
  const premio = useMemo(() => {
    if (!prize) return null
    return prize.inZone
      ? premioDe(league, prize.pos)
      : premioDe(league, prize.spots)
  }, [prize, league])

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
    <div className="animate-fade-in">
      <Header title={`${greeting()}, ${firstName}`} subtitle="La Liga RK" />

      {/* ---------- MARCADOR · doble anillo ---------- */}
      <div className="flex flex-col items-center pt-5 pb-1">
        <DualProgress
          outer={isEmbajador ? 1 : progress}
          inner={prize?.ringProgress ?? 0}
          rankKey={rank.id}
          auraColor={rank.auraColor}
          size={158}
        >
          <div className="text-[36px] font-black tracking-tight leading-none">
            {formatPoints(profile?.points)}
          </div>
          <div className="text-[8.5px] font-extrabold uppercase tracking-[1.9px] text-rk-ink/40 dark:text-rk-cream/40 mt-1">
            puntos
          </div>
        </DualProgress>

        {/* Metadatos en una línea */}
        <div className="flex items-center gap-1.5 mt-3.5 text-[12.5px] font-extrabold">
          {position && (
            <>
              <span>{position}º</span>
              <span className="text-rk-ink/45 dark:text-rk-cream/45 font-bold">
                de {leagueSize}
              </span>
              <span className="text-rk-ink/20 dark:text-rk-cream/20">·</span>
            </>
          )}
          <span className="text-rk-ink/45 dark:text-rk-cream/45 font-bold">
            {leagueLabel}
          </span>
          <span className="text-rk-ink/20 dark:text-rk-cream/20">·</span>
          <span style={{ color: rank.auraColor }}>{rank.label}</span>
        </div>

        {/* Leyenda de los anillos */}
        <div className="flex items-center gap-4 mt-2.5">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-rk-orange" />
            <span className="text-[10.5px] font-bold text-rk-ink/50 dark:text-rk-cream/50">
              {isEmbajador ? (
                'Rango máximo'
              ) : next ? (
                <>
                  <b className="text-rk-ink dark:text-rk-cream">
                    {formatPoints(pointsToNext)} pts
                  </b>{' '}
                  a {next.label}
                </>
              ) : (
                current.label
              )}
            </span>
          </div>
          {prize && (
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-amber-500" />
              <span className="text-[10.5px] font-bold text-rk-ink/50 dark:text-rk-cream/50">
                {prize.inZone ? (
                  <>En <b className="text-amber-700 dark:text-amber-400">zona de premio</b></>
                ) : (
                  <>
                    <b className="text-rk-ink dark:text-rk-cream">
                      {formatPoints(prize.gap)} pts
                    </b>{' '}
                    para entrar
                  </>
                )}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Primeros pasos (solo usuarios nuevos) */}
      {firstSteps && (
        <div className="mt-4">
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
        </div>
      )}

      {/* Aviso, solo si lleva tiempo sin sumar */}
      {nudge && (
        <div className="mt-4 rounded-2xl px-4 py-3 text-[12.5px] font-bold text-center bg-black/[0.04] dark:bg-white/[0.05] text-rk-ink/70 dark:text-rk-cream/70">
          {nudge}
        </div>
      )}

      {/* ---------- Resumen de la semana ---------- */}
      <div className="mt-5 border-t border-black/[0.07] dark:border-white/[0.08]">
        <div className="flex py-3.5">
          <div className="flex-1 text-center">
            <div className="text-lg font-black flex items-center justify-center gap-1">
              {streak > 0 && <Flame size={14} className="text-orange-500" />}
              {streak > 0 ? streak : '—'}
            </div>
            <div className="text-[8.5px] font-extrabold uppercase tracking-wider text-rk-ink/40 dark:text-rk-cream/40 mt-0.5">
              Racha
            </div>
          </div>
          <div className="w-px my-1.5 bg-black/[0.07] dark:bg-white/[0.08]" />
          <div className="flex-1 text-center">
            <div className="text-lg font-black text-rk-orange">
              +{formatPoints(weekStats.points)}
            </div>
            <div className="text-[8.5px] font-extrabold uppercase tracking-wider text-rk-ink/40 dark:text-rk-cream/40 mt-0.5">
              Esta sem.
            </div>
          </div>
          <div className="w-px my-1.5 bg-black/[0.07] dark:bg-white/[0.08]" />
          <div className="flex-1 text-center">
            <div className="text-lg font-black">{weekStats.actions}</div>
            <div className="text-[8.5px] font-extrabold uppercase tracking-wider text-rk-ink/40 dark:text-rk-cream/40 mt-0.5">
              Acciones
            </div>
          </div>
        </div>
      </div>

      {/* ---------- Premio en juego ---------- */}
      {premio && (
        <div className="border-t border-black/[0.07] dark:border-white/[0.08]">
          <div className="flex items-start gap-3 py-3.5">
            <span className="text-base leading-none mt-0.5">🏅</span>
            <div className="flex-1 min-w-0">
              <div className="text-[10px] font-extrabold uppercase tracking-[1.3px] text-rk-ink/40 dark:text-rk-cream/40">
                {prize.inZone
                  ? `Tu premio ahora · ${prize.pos}º puesto`
                  : `Último premio · ${prize.spots}º puesto`}
              </div>
              <div className="text-[13px] font-black mt-1 leading-snug">
                {premio.nombre}
              </div>
              {premio.detalle && (
                <div className="text-[11px] font-bold text-amber-700 dark:text-amber-400 mt-0.5">
                  {premio.detalle}
                </div>
              )}
              {premio.requisito && (
                <div className="text-[10.5px] font-semibold text-rk-ink/45 dark:text-rk-cream/45 mt-1 leading-snug">
                  {premio.requisito}
                </div>
              )}
              {league !== 'agentes' && prize.inZone && (
                <div
                  className={cn(
                    'text-[10.5px] font-bold mt-1',
                    captaciones >= 1
                      ? 'text-emerald-600 dark:text-emerald-400'
                      : 'text-amber-600 dark:text-amber-400'
                  )}
                >
                  {captaciones >= 1
                    ? `✓ Llevas ${captaciones} ${captaciones === 1 ? 'captación' : 'captaciones'}`
                    : 'Aún no tienes ninguna captación'}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ---------- Registra rápido ---------- */}
      <div className="border-t border-black/[0.07] dark:border-white/[0.08] pt-4 mt-1">
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
      </div>

      {/* ---------- Tu zona de la tabla ---------- */}
      {neighbours.length > 1 && (
        <div className="mt-5">
          <div className="flex items-center justify-between mb-2.5">
            <h2 className="text-base font-black">Tu zona de la tabla</h2>
            <Link
              to="/ranking"
              className="text-xs font-bold text-rk-orange flex items-center gap-0.5"
            >
              Ver liga <ChevronRight size={14} />
            </Link>
          </div>
          <div className="space-y-1.5">
            {neighbours.map((row) => {
              const diff = row.self
                ? null
                : (row.user.points ?? 0) - (profile?.points ?? 0)
              return (
                <Link
                  key={row.user.id}
                  to="/ranking"
                  className={cn(
                    'flex items-center gap-2.5 px-2.5 py-2 rounded-xl active:scale-[0.99] transition-transform',
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
                      row.self
                        ? 'font-black'
                        : 'font-bold text-rk-ink/75 dark:text-rk-cream/75'
                    )}
                  >
                    {row.self ? 'Tú' : row.user.name}
                  </span>
                  {diff !== null && (
                    <span
                      className={cn(
                        'text-[11px] font-bold flex items-center gap-0.5',
                        diff > 0
                          ? 'text-rk-ink/45 dark:text-rk-cream/45'
                          : 'text-emerald-600 dark:text-emerald-400'
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
                </Link>
              )
            })}
          </div>
        </div>
      )}

      {/* ---------- Mi equipo ---------- */}
      {myTeam && (
        <Link
          to="/ranking"
          className="block mt-5 active:scale-[0.99] transition-transform"
        >
          <div className="flex items-center gap-3 border-t border-black/[0.07] dark:border-white/[0.08] pt-3.5">
            <div
              className="w-9 h-9 rounded-xl shrink-0"
              style={{ backgroundColor: myTeam.color ?? '#cf731b' }}
            />
            <div className="flex-1 min-w-0">
              <div className="text-[10px] font-extrabold uppercase tracking-[1.3px] text-rk-ink/40 dark:text-rk-cream/40">
                Tu equipo
              </div>
              <div className="text-[13px] font-black truncate mt-0.5">
                {myTeam.name}
              </div>
            </div>
            <div className="text-right shrink-0">
              <div className="text-[13px] font-black text-rk-orange">
                {myTeam.position}º de {myTeam.total}
              </div>
              <div className="text-[10px] font-bold text-rk-ink/40 dark:text-rk-cream/40">
                {formatPoints(myTeam.totalPoints ?? 0)} pts
              </div>
            </div>
            <ChevronRight size={16} className="text-rk-ink/20 dark:text-rk-cream/20 shrink-0" />
          </div>
        </Link>
      )}
    </div>
  )
}




