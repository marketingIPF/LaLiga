import { useMemo } from 'react'
import { useUsers } from '../hooks/useUsers'
import { useActionRequests } from '../hooks/useActionRequests'
import { isCompetitor } from '../data/seedUsers'
import { formatPoints, cn } from '../lib/utils'
import Header from '../components/layout/Header'
import Avatar from '../components/ui/Avatar'
import { Trophy } from 'lucide-react'

// Cuántas acciones aprobadas leemos para calcular los logros. Sin límite se
// descargaba el histórico COMPLETO, que crece sin parar con las cargas del
// CRM. Con el índice de Firestore ya creado, pedimos solo las recientes.
const MAX_REQUESTS = 500
const AVATARES_VISIBLES = 5

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

    const stats = {}
    for (const r of requests) {
      if (!r.userId) continue
      if (!stats[r.userId]) stats[r.userId] = emptyStats()
      const s = stats[r.userId]
      s.total++
      const metric = METRIC_OF[r.actionType]
      if (metric) {
        s[metric]++
        s.types.add(metric)
      }
      const d = toDate(r.createdAt)
      if (d) s.weeks.add(weekKey(d))
    }

    const byId = Object.fromEntries(competitors.map((u) => [u.id, u]))

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
    <div className="animate-fade-in pb-4">
      <Header title="Muro de Logros" subtitle="Wall of Fame" />

      {isEmpty ? (
        <div className="text-center py-14">
          <Trophy size={30} className="mx-auto text-rk-ink/25 dark:text-rk-cream/25 mb-3" />
          <p className="text-sm font-semibold text-rk-ink/55 dark:text-rk-cream/55 px-6">
            Los logros se irán desbloqueando a medida que el equipo registre
            acciones.
          </p>
        </div>
      ) : (
        <>
          {champions.length > 0 && (
            <section>
              <div className="flex gap-4 py-3 text-[10.5px] font-bold text-rk-ink/45 dark:text-rk-cream/45">
                <span>
                  <b className="text-rk-ink dark:text-rk-cream">{champions.length}</b>{' '}
                  campeones activos
                </span>
              </div>
              <div className="h-px bg-black/[0.075] dark:bg-white/[0.09]" />
              {champions.map((a, i) => (
                <div key={a.id}>
                  <FilaCampeon achievement={a} />
                  {i < champions.length - 1 && (
                    <div className="h-px bg-black/[0.075] dark:bg-white/[0.09]" />
                  )}
                </div>
              ))}
            </section>
          )}

          {badges.length > 0 && (
            <section className="mt-6">
              <div className="text-[9.5px] font-black tracking-[1.7px] uppercase text-rk-orange px-0.5 pb-3">
                Insignias desbloqueadas
              </div>
              <div className="h-px bg-black/[0.075] dark:bg-white/[0.09]" />
              {badges.map((b, i) => (
                <div key={b.id}>
                  <FilaInsignia badge={b} />
                  {i < badges.length - 1 && (
                    <div className="h-px bg-black/[0.075] dark:bg-white/[0.09]" />
                  )}
                </div>
              ))}
            </section>
          )}
        </>
      )}
    </div>
  )
}

function FilaCampeon({ achievement }) {
  return (
    <div className="flex items-center gap-3.5 py-3">
      <span className="text-2xl w-8 text-center shrink-0">{achievement.icon}</span>
      <Avatar name={achievement.agent.name} size="sm" />
      <div className="flex-1 min-w-0">
        <div className="text-[10px] font-extrabold uppercase tracking-[1.1px] text-amber-700 dark:text-amber-400">
          {achievement.label}
        </div>
        <div className="text-[13px] font-black truncate mt-0.5">
          {achievement.agent.name}
        </div>
        <div className="text-[10.5px] font-semibold text-rk-ink/50 dark:text-rk-cream/50">
          {achievement.stat}
        </div>
      </div>
    </div>
  )
}

function FilaInsignia({ badge }) {
  const visibles = badge.holders.slice(0, AVATARES_VISIBLES)
  const ocultos = badge.holders.length - visibles.length

  return (
    <div className="py-3">
      <div className="flex items-start gap-3.5">
        <span className="text-2xl w-8 text-center shrink-0">{badge.icon}</span>
        <div className="flex-1 min-w-0">
          <div className="text-[13px] font-black">{badge.label}</div>
          <div className="text-[10.5px] font-semibold text-rk-ink/50 dark:text-rk-cream/50 mt-0.5">
            {badge.description}
          </div>
          <div className="flex items-center mt-2.5">
            {visibles.map((u, idx) => (
              <div
                key={u.id}
                className="rounded-full ring-2 ring-rk-cream dark:ring-rk-ink"
                style={{ marginLeft: idx === 0 ? 0 : -7 }}
                title={u.name}
              >
                <Avatar name={u.name} size="sm" />
              </div>
            ))}
            {ocultos > 0 && (
              <div
                className="w-[26px] h-[26px] rounded-full bg-black/[0.09] dark:bg-white/[0.12] text-rk-ink/55 dark:text-rk-cream/55 text-[9px] font-black flex items-center justify-center ring-2 ring-rk-cream dark:ring-rk-ink"
                style={{ marginLeft: -7 }}
              >
                +{ocultos}
              </div>
            )}
            <span className="ml-2.5 text-[10px] font-bold text-rk-ink/40 dark:text-rk-cream/40">
              {badge.holders.length}{' '}
              {badge.holders.length === 1 ? 'persona' : 'personas'}
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}
