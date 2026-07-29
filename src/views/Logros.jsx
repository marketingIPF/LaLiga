import { useMemo } from 'react'
import { useUsers } from '../hooks/useUsers'
import { useActionRequests } from '../hooks/useActionRequests'
import { isCompetitor } from '../data/seedUsers'
import { formatPoints } from '../lib/utils'
import Header from '../components/layout/Header'
import GlassCard from '../components/ui/GlassCard'
import Avatar from '../components/ui/Avatar'

// Cuántas acciones aprobadas leemos para calcular los logros. Antes se
// descargaba el histórico COMPLETO, que crece sin parar (sobre todo con las
// cargas masivas del CRM) y hacía lenta esta pantalla. Con el índice de
// Firestore ya creado, pedimos solo las más recientes.
const MAX_REQUESTS = 500

// ====================================================================
// Definición de logros
// --------------------------------------------------------------------
// Dos mecánicas:
//   · CAMPEONES  → un único ganador (quien más X del periodo). Pican.
//   · INSIGNIAS  → las desbloquea cualquiera que cumpla. Dan progreso.
// El muro los muestra todos juntos, sin separar por ligas.
// ====================================================================

const CHAMPIONS = [
  { id: 'embajador_historico', label: 'Embajador', icon: '🏆', metric: 'lifetime',
    unit: (n) => `${formatPoints(n)} pts históricos` },
  { id: 'rey_prospeccion', label: 'Rey de la prospección', icon: '📞', metric: 'prospeccion',
    unit: (n) => `${n} ${n === 1 ? 'llamada' : 'llamadas'} de prospección` },
  { id: 'maestro_entrevistas', label: 'Maestro de entrevistas', icon: '🎯', metric: 'entrevistas',
    unit: (n) => `${n} ${n === 1 ? 'entrevista' : 'entrevistas'}` },
  { id: 'constructor', label: 'Constructor', icon: '🏗️', metric: 'captaciones',
    unit: (n) => `${n} ${n === 1 ? 'captación' : 'captaciones'}` },
  { id: 'creador_eventos', label: 'Creador de eventos', icon: '🎪', metric: 'eventos',
    unit: (n) => `${n} ${n === 1 ? 'evento' : 'eventos'}` },
  { id: 'tejedor_alianzas', label: 'Tejedor de alianzas', icon: '🤝', metric: 'alianzas',
    unit: (n) => `${n} ${n === 1 ? 'alianza' : 'alianzas'} (Win Win + comercios)` },
  { id: 'cazador_resenas', label: 'Cazador de reseñas', icon: '⭐', metric: 'resenas',
    unit: (n) => `${n} ${n === 1 ? 'reseña' : 'reseñas'} en Google` },
  { id: 'cara_agencia', label: 'La cara de la agencia', icon: '🎬', metric: 'reels',
    unit: (n) => `${n} ${n === 1 ? 'grabación' : 'grabaciones'} para reels` },
  { id: 'community_manager', label: 'Community manager', icon: '📱', metric: 'rrss',
    unit: (n) => `${n} ${n === 1 ? 'publicación' : 'publicaciones'} en redes` },
  { id: 'eterno_aprendiz', label: 'Eterno aprendiz', icon: '🎓', metric: 'formacion',
    unit: (n) => `${n} ${n === 1 ? 'formación' : 'formaciones'}` },
  { id: 'negociador', label: 'El negociador', icon: '📉', metric: 'bajadas',
    unit: (n) => `${n} ${n === 1 ? 'bajada' : 'bajadas'} de precio` },
  { id: 'cercania', label: 'Cercanía', icon: '📍', metric: 'cortesia',
    unit: (n) => `${n} ${n === 1 ? 'llamada' : 'llamadas'} de cortesía` },
  { id: 'constancia', label: 'Constancia', icon: '🔥', metric: 'total', min: 4,
    unit: (n) => `${n} acciones aprobadas` },
]

const BADGES = [
  {
    id: 'todoterreno',
    label: 'Todoterreno',
    icon: '🧰',
    description: 'Ha puntuado en 5 tipos de acción distintos',
    qualifies: (s) => s.types.size >= 5,
  },
  {
    id: 'imparable',
    label: 'Imparable',
    icon: '⚡',
    description: 'Ha sumado en 3 semanas diferentes',
    qualifies: (s) => s.weeks.size >= 3,
  },
  {
    id: 'debut',
    label: 'Debut',
    icon: '🌱',
    description: 'Ha estrenado su casillero',
    qualifies: (s) => s.total >= 1 && s.total <= 2,
  },
]

// Mapa acción → métrica
const METRIC_OF = {
  llamada_prospeccion: 'prospeccion',
  llamada_cortesia: 'cortesia',
  entrevista_m1: 'entrevistas',
  entrevista_m2: 'entrevistas',
  entrevista_m3: 'entrevistas',
  captacion_m1: 'captaciones',
  captacion_m2: 'captaciones',
  captacion_m3: 'captaciones',
  crear_evento: 'eventos',
  win_win: 'alianzas',
  comercio_aliado: 'alianzas',
  resena_google: 'resenas',
  grabar_reel: 'reels',
  publicar_rrss: 'rrss',
  formacion: 'formacion',
  bajada_precio: 'bajadas',
}

function emptyStats() {
  return {
    total: 0, prospeccion: 0, cortesia: 0, entrevistas: 0, captaciones: 0,
    eventos: 0, alianzas: 0, resenas: 0, reels: 0, rrss: 0, formacion: 0,
    bajadas: 0, types: new Set(), weeks: new Set(),
  }
}

function toDate(value) {
  if (!value) return null
  if (typeof value.toDate === 'function') return value.toDate()
  const d = new Date(value)
  return isNaN(d.getTime()) ? null : d
}

// Clave año+semana para medir constancia por semanas
function weekKey(date) {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()))
  const day = d.getUTCDay() || 7
  d.setUTCDate(d.getUTCDate() + 4 - day)
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1))
  const week = Math.ceil(((d - yearStart) / 86400000 + 1) / 7)
  return `${d.getUTCFullYear()}-W${week}`
}

export default function Logros() {
  const { users, topLifetime } = useUsers()
  const { requests } = useActionRequests({ status: 'approved', max: MAX_REQUESTS })

  const competitors = useMemo(() => users.filter(isCompetitor), [users])

  const { champions, badges } = useMemo(() => {
    if (competitors.length === 0) return { champions: [], badges: [] }

    // Estadísticas por persona
    const stats = {}
    for (const r of requests) {
      if (!r.userId) continue
      if (!stats[r.userId]) stats[r.userId] = emptyStats()
      const s = stats[r.userId]
      s.total++

      const metric = METRIC_OF[r.actionType]
      if (metric) {
        s[metric]++
        // La suma total de toques es un agregado que carga administración,
        // no cuenta para la variedad de acciones del Todoterreno.
        s.types.add(metric)
      }

      const d = toDate(r.createdAt)
      if (d) s.weeks.add(weekKey(d))
    }

    const byId = Object.fromEntries(competitors.map((u) => [u.id, u]))

    // ---- CAMPEONES ----
    const champs = []
    for (const def of CHAMPIONS) {
      if (def.metric === 'lifetime') {
        const top = [...competitors].sort(
          (a, b) => (b.lifetimePoints ?? 0) - (a.lifetimePoints ?? 0)
        )[0]
        if (top && topLifetime > 0 && (top.lifetimePoints ?? 0) > 0) {
          champs.push({ ...def, agent: top, stat: def.unit(top.lifetimePoints ?? 0) })
        }
        continue
      }
      const ranked = Object.entries(stats)
        .map(([uid, s]) => ({ user: byId[uid], count: s[def.metric] ?? 0 }))
        .filter((x) => x.user && x.count >= (def.min ?? 1))
        .sort((a, b) => b.count - a.count)
      const winner = ranked[0]
      if (winner) {
        champs.push({ ...def, agent: winner.user, stat: def.unit(winner.count) })
      }
    }

    // ---- INSIGNIAS ----
    const badgeList = []
    for (const def of BADGES) {
      const holders = Object.entries(stats)
        .filter(([uid, s]) => byId[uid] && def.qualifies(s))
        .map(([uid]) => byId[uid])
        .sort((a, b) => (b.points ?? 0) - (a.points ?? 0))
      if (holders.length) badgeList.push({ ...def, holders })
    }

    return { champions: champs, badges: badgeList }
  }, [competitors, requests, topLifetime])

  const isEmpty = champions.length === 0 && badges.length === 0

  return (
    <div className="space-y-5 animate-fade-in">
      <Header title="Muro de Logros" subtitle="Wall of Fame" />

      {isEmpty ? (
        <GlassCard className="text-center py-12">
          <div className="text-5xl mb-3">🏆</div>
          <p className="text-sm text-rk-ink/60 dark:text-rk-cream/60">
            Los logros se irán desbloqueando a medida que el equipo registre acciones.
          </p>
        </GlassCard>
      ) : (
        <>
          {champions.length > 0 && (
            <section className="space-y-3">
              <h2 className="text-xs font-bold uppercase tracking-[2px] text-rk-orange px-1">
                Campeones del periodo
              </h2>
              {champions.map((a) => (
                <ChampionCard key={a.id} achievement={a} />
              ))}
            </section>
          )}

          {badges.length > 0 && (
            <section className="space-y-3 pt-2">
              <h2 className="text-xs font-bold uppercase tracking-[2px] text-rk-orange px-1">
                Insignias desbloqueadas
              </h2>
              {badges.map((b) => (
                <BadgeCard key={b.id} badge={b} />
              ))}
            </section>
          )}
        </>
      )}
    </div>
  )
}

function ChampionCard({ achievement }) {
  return (
    <GlassCard className="relative overflow-hidden">
      <div className="absolute -top-6 -right-6 w-24 h-24 rounded-full bg-rk-orange/15 blur-2xl pointer-events-none" />
      <div className="relative flex items-center gap-4">
        <div className="text-4xl">{achievement.icon}</div>
        <div className="flex-1 min-w-0">
          <div className="text-xs font-semibold uppercase tracking-wider text-rk-orange">
            {achievement.label}
          </div>
          <div className="font-bold mt-0.5 truncate">{achievement.agent.name}</div>
          <div className="text-xs text-rk-ink/60 dark:text-rk-cream/60">{achievement.stat}</div>
        </div>
        <Avatar name={achievement.agent.name} size="md" />
      </div>
    </GlassCard>
  )
}

function BadgeCard({ badge }) {
  const shown = badge.holders.slice(0, 6)
  const rest = badge.holders.length - shown.length

  return (
    <GlassCard className="relative overflow-hidden">
      <div className="flex items-start gap-3.5">
        <div className="text-3xl shrink-0">{badge.icon}</div>
        <div className="flex-1 min-w-0">
          <div className="text-xs font-semibold uppercase tracking-wider text-rk-orange">
            {badge.label}
          </div>
          <div className="text-xs text-rk-ink/60 dark:text-rk-cream/60 mt-0.5">
            {badge.description}
          </div>
          <div className="flex flex-wrap items-center gap-1.5 mt-2.5">
            {shown.map((u) => (
              <div
                key={u.id}
                className="flex items-center gap-1.5 pl-0.5 pr-2 py-0.5 rounded-full bg-black/5 dark:bg-white/5"
              >
                <Avatar name={u.name} size="sm" />
                <span className="text-[11px] font-bold truncate max-w-[110px]">
                  {u.name.split(' ')[0]}
                </span>
              </div>
            ))}
            {rest > 0 && (
              <span className="text-[11px] font-bold text-rk-ink/50 dark:text-rk-cream/50 px-1">
                +{rest} más
              </span>
            )}
          </div>
        </div>
      </div>
    </GlassCard>
  )
}
