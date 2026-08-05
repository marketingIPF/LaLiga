import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import {
  Sparkles, ChevronRight, Clock, CheckCircle2, XCircle, Flame, Trophy,
  Medal, Info, ArrowUp, ArrowDown,
} from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { useUsers } from '../hooks/useUsers'
import { useGroups } from '../hooks/useGroups'
import { useActionRequests } from '../hooks/useActionRequests'
import { useRank } from '../hooks/useRank'
import { ACTION_TYPES, LEAGUES, selfServiceActions } from '../lib/constants'
import { getUserLeague } from '../data/seedUsers'
import { formatPoints, relativeDate, cn } from '../lib/utils'
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

  // ---- Mensaje que se adapta a la situación ----
  const nudge = useMemo(() => {
    const daysSince = profile?.lastActionAt
      ? Math.floor((Date.now() - tsMs(profile.lastActionAt)) / 86400000)
      : null
    if (isEmbajador) return { text: rank.description, tone: 'gold' }
    if (next && pointsToNext <= 50) {
      return {
        text: `¡Estás a punto! Solo ${formatPoints(pointsToNext)} pts para ${next.label}.`,
        tone: 'orange',
      }
    }
    if (position === 1) return { text: 'Lideras tu liga. Toca defender el puesto.', tone: 'gold' }
    if (daysSince !== null && daysSince >= 7) {
      return { text: `Llevas ${daysSince} días sin sumar. Cualquier acción cuenta.`, tone: 'soft' }
    }
    if (daysSince === null) {
      return { text: 'Registra tu primera acción y arranca el marcador.', tone: 'soft' }
    }
    return null
  }, [isEmbajador, rank, next, pointsToNext, position, profile?.lastActionAt])

  return (
    <div className="space-y-5 animate-fade-in">
      <Header title={`${greeting()}, ${firstName}`} subtitle="La Liga RK" showLogout />

      {/* Tarjeta principal: rango + progreso + posición */}
      <GlassCard className="relative overflow-hidden">
        <div className="absolute -top-10 -right-10 w-40 h-40 rounded-full bg-rk-orange/20 blur-3xl pointer-events-none" />
        <div className="relative flex flex-col items-center text-center">
          <RankBadge rankId={rank.id} size="md" />

          <div className="mt-5">
            <CircularProgress
              progress={isEmbajador ? 1 : progress}
              rankKey={rank.id}
              auraColor={rank.auraColor}
              size={200}
              strokeWidth={14}
            >
              <div className="text-5xl font-black tracking-tight">
                {formatPoints(profile?.points)}
              </div>
              <div className="text-xs font-semibold uppercase tracking-wider text-rk-ink/50 dark:text-rk-cream/50 mt-1">
                puntos
              </div>
            </CircularProgress>
          </div>

          {/* Posición en la liga */}
          {position && (
            <Link
              to="/ranking"
              className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-full bg-rk-orange/10 active:scale-[0.97] transition-transform"
            >
              <Trophy size={14} className="text-rk-orange" />
              <span className="text-sm font-extrabold text-rk-orange">
                {position}º de {leagueSize}
              </span>
              <span className="text-xs font-semibold text-rk-ink/50 dark:text-rk-cream/50">
                · {leagueLabel}
              </span>
            </Link>
          )}

          {/* Progreso al siguiente rango */}
          <div className="mt-3.5 text-sm text-rk-ink/70 dark:text-rk-cream/70">
            {isEmbajador ? (
              <span className="font-semibold text-rk-orange">{rank.description}</span>
            ) : next ? (
              <>
                Te faltan{' '}
                <span className="font-bold text-rk-orange">
                  {formatPoints(pointsToNext)} pts
                </span>{' '}
                para <span className="font-bold">{next.label}</span>
              </>
            ) : (
              <span className="font-semibold">{current.description}</span>
            )}
          </div>
        </div>
      </GlassCard>

      {/* Zona de premio */}
      {prize && (
        <PrizeCard
          prize={prize}
          league={league}
          captaciones={captaciones}
        />
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

      {/* Mensaje adaptativo */}
      {nudge && (
        <div
          className={cn(
            'rounded-2xl px-4 py-3 text-sm font-bold text-center',
            nudge.tone === 'gold'
              ? 'bg-amber-400/15 text-amber-700 dark:text-amber-300'
              : nudge.tone === 'orange'
              ? 'bg-rk-orange/12 text-rk-orange'
              : 'bg-black/[0.04] dark:bg-white/[0.05] text-rk-ink/70 dark:text-rk-cream/70'
          )}
        >
          {nudge.text}
        </div>
      )}

      {/* Racha + histórico */}
      <div className="grid grid-cols-2 gap-3">
        <MetricCard
          label="Racha"
          value={streak > 0 ? `${streak} sem.` : '—'}
          icon={
            <Flame
              size={18}
              className={streak > 0 ? 'text-orange-500' : 'text-rk-ink/25 dark:text-rk-cream/25'}
            />
          }
          hint={streak > 1 ? 'seguidas sumando' : streak === 1 ? 'esta semana' : 'suma esta semana'}
        />
        <MetricCard
          label="Total histórico"
          value={formatPoints(profile?.lifetimePoints ?? 0)}
          icon={<Sparkles size={18} className="text-rk-orange" />}
          hint="desde el inicio"
        />
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

      {/* Acciones rápidas */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-bold">Registra una acción</h2>
          <Link
            to="/registrar"
            className="text-sm font-semibold text-rk-orange flex items-center gap-1"
          >
            Ver todas <ChevronRight size={16} />
          </Link>
        </div>
        <div className="grid grid-cols-2 gap-3">
          {quickActions.map((action) => (
            <QuickActionButton key={action.id} action={action} />
          ))}
        </div>
      </section>

      {/* Actividad reciente */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-bold">Tu actividad</h2>
          {pendingCount > 0 && (
            <span className="text-xs font-bold text-amber-600 dark:text-amber-400 flex items-center gap-1">
              <Clock size={13} />
              {pendingCount} pendiente{pendingCount === 1 ? '' : 's'}
            </span>
          )}
        </div>
        {recentRequests.length === 0 ? (
          <GlassCard className="text-center text-sm text-rk-ink/60 dark:text-rk-cream/60 py-8">
            Aún no has registrado ninguna acción. ¡Empieza ahora!
          </GlassCard>
        ) : (
          <div className="space-y-2">
            {recentRequests.map((req) => (
              <RequestRow key={req.id} req={req} />
            ))}
          </div>
        )}
      </section>
    </div>
  )
}

function MetricCard({ label, value, icon, hint }) {
  return (
    <GlassCard className="!p-4">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-wider text-rk-ink/50 dark:text-rk-cream/50">
          {label}
        </span>
        {icon}
      </div>
      <div className="text-2xl font-black mt-1">{value}</div>
      {hint && (
        <div className="text-[10px] font-semibold text-rk-ink/40 dark:text-rk-cream/40 mt-0.5">
          {hint}
        </div>
      )}
    </GlassCard>
  )
}

function QuickActionButton({ action }) {
  return (
    <Link
      to={`/registrar?tipo=${action.id}`}
      className="glass rounded-2xl p-4 flex flex-col items-start gap-2 active:scale-[0.97] transition-transform"
    >
      <div className="text-2xl">{action.icon}</div>
      <div>
        <div className="text-sm font-bold leading-tight">{action.shortLabel}</div>
        <div className="text-xs font-semibold text-rk-orange mt-0.5">+{action.points} pts</div>
      </div>
    </Link>
  )
}

function RequestRow({ req }) {
  const action = ACTION_TYPES[req.actionType]
  const statusMap = {
    pending: { label: 'Pendiente', Icon: Clock, color: 'text-amber-500' },
    approved: { label: 'Aprobada', Icon: CheckCircle2, color: 'text-emerald-500' },
    rejected: { label: 'Rechazada', Icon: XCircle, color: 'text-red-500' },
  }
  const st = statusMap[req.status] ?? statusMap.pending

  return (
    <div className="glass rounded-2xl p-3 flex items-center gap-3">
      <div className="text-2xl">{action?.icon ?? '✨'}</div>
      <div className="flex-1 min-w-0">
        <div className="text-sm font-semibold truncate">{req.actionLabel}</div>
        <div className="text-xs text-rk-ink/50 dark:text-rk-cream/50">
          {relativeDate(req.createdAt)}
        </div>
      </div>
      <div className={cn('flex items-center gap-1 text-xs font-bold', st.color)}>
        <st.Icon size={14} />
        <span className="hidden xs:inline">{st.label}</span>
      </div>
      <div className="text-sm font-bold text-rk-orange whitespace-nowrap">+{req.points}</div>
    </div>
  )
}

// ====================================================================
// Zona de premio
// --------------------------------------------------------------------
// Agentes: los 5 primeros puestos tienen premio, pero el 1º y el 2º
// exigen mínimo 5 captaciones (sin contar gerencia y oficina). Eso no
// se puede comprobar desde La Liga —las captaciones de agente viven en
// el CRM—, así que se muestra como recordatorio, nunca como "cumplido".
//
// Obra Nueva y Staff: cualquier premio exige 1 captación, y esa SÍ está
// en la app (Captación M1/M2/M3), así que se comprueba de verdad.
// ====================================================================
function PrizeCard({ prize, league, captaciones }) {
  const { inZone, pos, spots, gap } = prize
  const isAgente = league === 'agentes'
  const needsTopCaptaciones = isAgente && pos <= 2
  const requiresOneCaptacion = !isAgente
  const captacionOk = captaciones >= 1

  return (
    <GlassCard
      className={cn(
        '!p-4 relative overflow-hidden',
        inZone && 'ring-1 ring-amber-400/40'
      )}
    >
      {inZone && (
        <div className="absolute -top-8 -right-8 w-28 h-28 rounded-full bg-amber-400/20 blur-2xl pointer-events-none" />
      )}
      <div className="relative flex items-center gap-3">
        <div
          className={cn(
            'w-11 h-11 rounded-xl flex items-center justify-center shrink-0 text-xl',
            inZone ? 'bg-amber-400/20' : 'bg-black/[0.05] dark:bg-white/[0.06]'
          )}
        >
          {inZone ? '🏅' : '🎯'}
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-xs font-semibold uppercase tracking-wider text-rk-ink/50 dark:text-rk-cream/50">
            Zona de premio
          </div>
          {inZone ? (
            <div className="text-sm font-black mt-0.5 text-amber-700 dark:text-amber-300">
              ¡Estás dentro! Puesto {pos} de {spots} premiados
            </div>
          ) : (
            <div className="text-sm font-bold mt-0.5">
              A <span className="text-rk-orange font-black">{formatPoints(gap)} pts</span>{' '}
              de entrar en los {spots} premiados
            </div>
          )}
        </div>
      </div>

      {/* Requisito de captaciones */}
      {inZone && needsTopCaptaciones && (
        <div className="relative mt-3 pt-3 border-t border-black/[0.06] dark:border-white/[0.08] flex gap-2">
          <Info size={14} className="text-rk-orange shrink-0 mt-0.5" />
          <p className="text-[11.5px] font-semibold text-rk-ink/70 dark:text-rk-cream/70 leading-relaxed">
            Recuerda: para optar al 1º y 2º premio necesitas mínimo{' '}
            <span className="font-black">5 captaciones</span>, sin contar las de
            gerencia y oficina.
          </p>
        </div>
      )}

      {inZone && requiresOneCaptacion && (
        <div className="relative mt-3 pt-3 border-t border-black/[0.06] dark:border-white/[0.08] flex items-center gap-2">
          {captacionOk ? (
            <>
              <CheckCircle2 size={15} className="text-emerald-500 shrink-0" />
              <p className="text-[11.5px] font-bold text-emerald-600 dark:text-emerald-400">
                Requisito cumplido: {captaciones}{' '}
                {captaciones === 1 ? 'captación' : 'captaciones'}
              </p>
            </>
          ) : (
            <>
              <Medal size={15} className="text-amber-500 shrink-0" />
              <p className="text-[11.5px] font-bold text-rk-ink/70 dark:text-rk-cream/70">
                Te falta 1 captación para optar al premio
              </p>
            </>
          )}
        </div>
      )}
    </GlassCard>
  )
}
