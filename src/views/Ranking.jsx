import { useState, useMemo } from 'react'
import { Trophy, ChevronDown } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { useUsers } from '../hooks/useUsers'
import { useActionRequests } from '../hooks/useActionRequests'
import { useGroups } from '../hooks/useGroups'
import { getUserLeague, isCompetitor } from '../data/seedUsers'
import { PRIZE_SPOTS, premioDe } from '../lib/premios'
import { formatPoints, cn } from '../lib/utils'
import Header from '../components/layout/Header'
import Avatar from '../components/ui/Avatar'

const TABS = [
  { id: 'agentes', label: 'Agentes' },
  { id: 'obranueva', label: 'Obra N.' },
  { id: 'staff', label: 'Staff' },
  { id: 'equipos', label: 'Equipos' },
]

const LEAGUE_TABS = ['agentes', 'obranueva', 'staff']
const AVATARES_VISIBLES = 5

export default function Ranking() {
  const { profile } = useAuth()
  const { users } = useUsers()
  const { groups } = useGroups()
  // Para saber quién cumple el requisito de captaciones. Acotado con el
  // índice de Firestore que ya existe (status + createdAt).
  const { requests: aprobadas } = useActionRequests({
    status: 'approved',
    max: 300,
  })

  const myLeague = getUserLeague(profile)
  const [tab, setTab] = useState(
    LEAGUE_TABS.includes(myLeague) ? myLeague : 'agentes'
  )

  const spots = PRIZE_SPOTS[tab] ?? 3

  // Clasificación individual de la liga activa
  const board = useMemo(() => {
    if (!LEAGUE_TABS.includes(tab)) return []
    return users
      .filter((u) => getUserLeague(u) === tab)
      .sort((a, b) => (b.points ?? 0) - (a.points ?? 0))
  }, [users, tab])

  const teams = useMemo(
    () => [...groups].sort((a, b) => (b.totalPoints ?? 0) - (a.totalPoints ?? 0)),
    [groups]
  )

  // Captaciones aprobadas por persona.
  //   · Agentes            → las entrevistas M1/M2/M3 SON sus captaciones
  //   · Obra Nueva y Staff → captación M1/M2/M3
  const captacionesPorUsuario = useMemo(() => {
    const map = {}
    for (const r of aprobadas) {
      if (!r.userId) continue
      const tipo = String(r.actionType)
      if (tipo.startsWith('captacion_') || tipo.startsWith('entrevista_')) {
        map[r.userId] = (map[r.userId] ?? 0) + 1
      }
    }
    return map
  }, [aprobadas])

  // Contexto de la liga
  const contexto = useMemo(() => {
    if (tab === 'equipos') {
      return [
        { valor: teams.length, texto: teams.length === 1 ? 'equipo' : 'equipos' },
        { valor: PRIZE_SPOTS.equipos, texto: 'premiados' },
      ]
    }
    return [
      { valor: board.length, texto: 'compiten' },
      { valor: spots, texto: 'premiados' },
      {
        valor: formatPoints(board.reduce((acc, u) => acc + (u.points ?? 0), 0)),
        texto: 'pts',
      },
    ]
  }, [tab, board, teams, spots])

  // Mi posición, para la barra fija (solo en mi propia liga)
  const miFila = useMemo(() => {
    if (tab !== myLeague) return null
    const idx = board.findIndex((u) => u.id === profile?.id)
    if (idx < 0) return null
    return { pos: idx + 1, points: board[idx].points ?? 0 }
  }, [tab, myLeague, board, profile?.id])

  return (
    <div className="animate-fade-in pb-24">
      <Header title="Liga" subtitle="Ranking" />

      {/* Pestañas */}
      <div className="flex gap-0.5 bg-black/[0.05] dark:bg-white/[0.07] rounded-xl p-[3px]">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={cn(
              'flex-1 py-2 rounded-[9px] text-[10.5px] font-extrabold transition-all',
              tab === t.id
                ? 'bg-white dark:bg-rk-ink-card shadow-sm text-rk-ink dark:text-rk-cream'
                : 'text-rk-ink/45 dark:text-rk-cream/45'
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Contexto */}
      <div className="flex gap-4 py-3 text-[10.5px] font-bold text-rk-ink/45 dark:text-rk-cream/45">
        {contexto.map((c, i) => (
          <span key={i}>
            <b className="text-rk-ink dark:text-rk-cream">{c.valor}</b> {c.texto}
          </span>
        ))}
      </div>
      <div className="h-px bg-black/[0.075] dark:bg-white/[0.09]" />

      {tab === 'equipos' ? (
        <TablaEquipos teams={teams} users={users} myGroupId={profile?.groupId} />
      ) : (
        <TablaIndividual
          board={board}
          spots={spots}
          league={tab}
          myId={profile?.id}
          captaciones={captacionesPorUsuario}
        />
      )}

      {/* Tu posición, siempre visible */}
      {miFila && (
        <div
          className="fixed left-3 right-3 z-30 flex items-center gap-2.5 rounded-2xl bg-rk-ink dark:bg-rk-ink-card text-rk-cream px-3.5 py-2.5 shadow-2xl border border-white/5"
          style={{ bottom: 'calc(6.75rem + var(--safe-bottom, 0px))' }}
        >
          <span className="w-6 h-6 rounded-full bg-rk-orange text-white text-[10.5px] font-black flex items-center justify-center shrink-0">
            {miFila.pos}
          </span>
          <span className="flex-1 text-[12px] font-extrabold truncate">
            Tú · {profile?.name?.split(' ')[0]}
          </span>
          <span className="text-[13px] font-black text-rk-orange-light">
            {formatPoints(miFila.points)} pts
          </span>
        </div>
      )}
    </div>
  )
}

// ====================================================================
// Clasificación individual
// ====================================================================
function TablaIndividual({ board, spots, league, myId, captaciones = {} }) {
  if (board.length === 0) return <VacioEstado texto="Aún no hay datos para mostrar" />

  const [primero, segundo, tercero, ...resto] = board
  const ultimoPremiado = board[spots - 1]

  // Si el corte cae dentro del podio (ligas con 1 o 2 premios), el aviso de
  // "te falta X" tiene que salir ahí: si no, nadie vería la frontera.
  const faltanPara = (user, pos) => {
    if (!user || pos <= spots || !ultimoPremiado) return null
    return Math.max(1, (ultimoPremiado.points ?? 0) - (user.points ?? 0) + 1)
  }

  return (
    <>
      {/* Podio */}
      <div className="flex items-end justify-center gap-3.5 pt-4 pb-1">
        <PodioHueco
          user={segundo} pos={2} league={league} spots={spots}
          faltan={faltanPara(segundo, 2)}
          captaciones={segundo ? captaciones[segundo.id] ?? 0 : 0}
        />
        <PodioHueco
          user={primero} pos={1} league={league} spots={spots}
          faltan={faltanPara(primero, 1)}
          captaciones={primero ? captaciones[primero.id] ?? 0 : 0}
          destacado
        />
        <PodioHueco
          user={tercero} pos={3} league={league} spots={spots}
          faltan={faltanPara(tercero, 3)}
          captaciones={tercero ? captaciones[tercero.id] ?? 0 : 0}
        />
      </div>

      <div className="h-px bg-black/[0.075] dark:bg-white/[0.09] mt-2" />

      {/* Resto */}
      {resto.map((u, i) => {
        const pos = i + 4
        const corte = pos === spots + 1
        const premio = pos <= spots ? premioDe(league, pos) : null
        const faltan =
          !premio && ultimoPremiado
            ? Math.max(1, (ultimoPremiado.points ?? 0) - (u.points ?? 0) + 1)
            : null
        return (
          <div key={u.id}>
            {corte && <LineaCorte />}
            <Fila
              pos={pos}
              user={u}
              premio={premio}
              faltan={pos === spots + 1 ? faltan : null}
              isMe={u.id === myId}
              sinPuntos={(u.points ?? 0) === 0}
              league={league}
              spots={spots}
              captaciones={captaciones[u.id] ?? 0}
            />
            {i < resto.length - 1 && (
              <div className="h-px bg-black/[0.075] dark:bg-white/[0.09]" />
            )}
          </div>
        )
      })}
    </>
  )
}


// Aviso del requisito de captaciones para los puestos premiados.
// En Agentes, las entrevistas M1/M2/M3 SON las captaciones (mínimo 5 para
// el 1º y 2º). En Obra Nueva y Staff son las captaciones M1/M2/M3 (mínimo 1).
function AvisoCaptaciones({ league, pos, spots, n = 0, compacto = false }) {
  if (pos > spots) return null

  // Agentes: solo el 1º y 2º tienen requisito, y son 5 captaciones.
  // El resto de ligas: 1 captación para cualquier premio.
  const minimo = league === 'agentes' ? 5 : 1
  if (league === 'agentes' && pos > 2) return null

  const cumple = n >= minimo
  return (
    <div
      className={cn(
        'font-bold leading-tight',
        compacto ? 'text-[8px] mt-0.5' : 'text-[9.5px] mt-0.5',
        cumple
          ? 'text-emerald-600 dark:text-emerald-400'
          : 'text-amber-600 dark:text-amber-400'
      )}
    >
      {cumple
        ? `✓ ${n} ${n === 1 ? 'captación' : 'captaciones'}`
        : `⚠ ${n} de ${minimo} ${minimo === 1 ? 'captación' : 'captaciones'}`}
    </div>
  )
}

function PodioHueco({ user, pos, league, spots = 3, faltan = null, captaciones = 0, destacado = false }) {
  if (!user) return <div className="flex-1 max-w-[92px]" />
  const medalla = pos === 1 ? '🥇' : pos === 2 ? '🥈' : '🥉'
  const anillo =
    pos === 1
      ? '0 0 0 3px #e0a021, 0 5px 14px rgba(207,115,27,.3)'
      : pos === 2
      ? '0 0 0 2.5px #b9b9b9'
      : '0 0 0 2.5px #c88a4b'
  const premio = premioDe(league, pos)

  return (
    <div className="flex flex-col items-center flex-1 max-w-[100px]">
      <div className="relative">
        <div style={{ boxShadow: anillo }} className="rounded-full">
          <Avatar name={user.name} size={destacado ? 'lg' : 'md'} />
        </div>
        <span
          className={cn(
            'absolute -bottom-1 -right-1',
            destacado ? 'text-lg' : 'text-[15px]'
          )}
        >
          {medalla}
        </span>
      </div>
      <div
        className={cn(
          'font-extrabold mt-2.5 text-center leading-tight',
          destacado ? 'text-[12px]' : 'text-[11px]'
        )}
      >
        {user.name.split(' ')[0]}{' '}
        {user.name.split(' ')[1]?.charAt(0)
          ? `${user.name.split(' ')[1].charAt(0)}.`
          : ''}
      </div>
      <div
        className={cn(
          'font-black text-rk-orange mt-0.5',
          destacado ? 'text-[15px]' : 'text-[13px]'
        )}
      >
        {formatPoints(user.points ?? 0)}
      </div>
      {premio ? (
        <div
          className={cn(
            'text-[8.5px] font-bold text-center mt-1 leading-tight px-0.5',
            destacado
              ? 'text-amber-700 dark:text-amber-400 font-extrabold'
              : 'text-rk-ink/45 dark:text-rk-cream/45'
          )}
        >
          {premio.nombre}
          <AvisoCaptaciones
            league={league}
            pos={pos}
            spots={spots}
            n={captaciones}
            compacto
          />
        </div>
      ) : faltan ? (
        <div className="text-[8.5px] font-bold text-center mt-1 leading-tight px-0.5 text-rk-ink/35 dark:text-rk-cream/35">
          a {formatPoints(faltan)} pts del premio
        </div>
      ) : null}
    </div>
  )
}

function Fila({ pos, user, premio, faltan, isMe, sinPuntos, league, spots, captaciones = 0 }) {
  return (
    <div
      className={cn(
        'flex items-center gap-2.5 py-2.5',
        isMe && 'bg-rk-orange/[0.09] rounded-xl px-2 ring-1 ring-rk-orange/25',
        sinPuntos && !isMe && 'opacity-55'
      )}
    >
      <span
        className={cn(
          'w-[22px] text-center text-[12px] font-black shrink-0',
          isMe ? 'text-rk-orange' : 'text-rk-ink/40 dark:text-rk-cream/40'
        )}
      >
        {pos}
      </span>
      <Avatar name={user.name} size="sm" />
      <div className="flex-1 min-w-0">
        <div className="text-[12.5px] font-extrabold truncate">
          {user.name}
          {isMe && <span className="text-rk-orange ml-1">(tú)</span>}
        </div>
        {premio ? (
          <>
            <span className="inline-flex items-center gap-1 bg-amber-400/[0.18] text-amber-800 dark:text-amber-300 rounded-md px-1.5 py-[1px] text-[8.5px] font-extrabold mt-1">
              🏅 {premio.nombre}
            </span>
            <AvisoCaptaciones
              league={league}
              pos={pos}
              spots={spots}
              n={captaciones}
            />
          </>
        ) : faltan ? (
          <div className="text-[9.5px] font-bold text-rk-ink/40 dark:text-rk-cream/40 mt-0.5">
            a {formatPoints(faltan)} pts del puesto premiado
          </div>
        ) : null}
      </div>
      <span className="text-[13px] font-black tabular-nums shrink-0">
        {formatPoints(user.points ?? 0)}
      </span>
    </div>
  )
}

function LineaCorte() {
  return (
    <div className="flex items-center gap-2 py-2.5">
      <div className="flex-1 h-px bg-black/10 dark:bg-white/10" />
      <span className="text-[8.5px] font-black tracking-[1.3px] text-rk-ink/30 dark:text-rk-cream/30">
        CORTE DE PREMIO
      </span>
      <div className="flex-1 h-px bg-black/10 dark:bg-white/10" />
    </div>
  )
}

// ====================================================================
// Clasificación de equipos
// ====================================================================
function TablaEquipos({ teams, users, myGroupId }) {
  const [abierto, setAbierto] = useState(null)

  if (teams.length === 0)
    return <VacioEstado texto="Aún no hay equipos configurados" />

  const spots = PRIZE_SPOTS.equipos
  const maxPts = Math.max(1, ...teams.map((t) => t.totalPoints ?? 0))
  const ultimoPremiado = teams[spots - 1]

  return (
    <>
      {teams.map((g, i) => {
        const pos = i + 1
        const corte = pos === spots + 1
        const premio = pos <= spots ? premioDe('equipos', pos) : null
        const faltan =
          !premio && ultimoPremiado
            ? Math.max(1, (ultimoPremiado.totalPoints ?? 0) - (g.totalPoints ?? 0) + 1)
            : null
        const miembros = users
          .filter((u) => isCompetitor(u) && u.groupId === g.id)
          .sort((a, b) => (b.points ?? 0) - (a.points ?? 0))
        const visibles = miembros.slice(0, AVATARES_VISIBLES)
        const ocultos = miembros.length - visibles.length
        const medalla = pos === 1 ? '🥇' : pos === 2 ? '🥈' : pos === 3 ? '🥉' : null
        const abiertoEste = abierto === g.id
        const esMio = g.id === myGroupId

        return (
          <div key={g.id}>
            {corte && <LineaCorte />}
            <button
              onClick={() => setAbierto(abiertoEste ? null : g.id)}
              className={cn(
                'w-full flex items-start gap-3 py-3 text-left',
                esMio && 'bg-rk-orange/[0.06] rounded-xl px-2'
              )}
            >
              <div
                className="w-[38px] h-[38px] rounded-xl shrink-0"
                style={{ backgroundColor: g.color ?? '#cf731b' }}
              />
              <div className="flex-1 min-w-0">
                <div className="text-[13px] font-black truncate">
                  {g.name} {medalla}
                  {esMio && <span className="text-rk-orange ml-1 text-[11px]">(tu equipo)</span>}
                </div>

                {premio ? (
                  <span className="inline-flex items-center gap-1 bg-amber-400/[0.18] text-amber-800 dark:text-amber-300 rounded-md px-1.5 py-[1px] text-[8.5px] font-extrabold mt-1">
                    🏅 {premio.nombre}
                  </span>
                ) : faltan ? (
                  <div className="text-[9.5px] font-bold text-rk-ink/40 dark:text-rk-cream/40 mt-0.5">
                    a {formatPoints(faltan)} pts del puesto premiado
                  </div>
                ) : null}

                {/* Barra relativa al líder */}
                <div className="h-[5px] rounded-full bg-black/[0.07] dark:bg-white/[0.09] mt-2 overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{
                      width: `${Math.max(3, ((g.totalPoints ?? 0) / maxPts) * 100)}%`,
                      backgroundColor: g.color ?? '#cf731b',
                    }}
                  />
                </div>

                {/* Avatares apilados */}
                <div className="flex items-center mt-2">
                  {visibles.map((m, idx) => (
                    <div
                      key={m.id}
                      className="rounded-full ring-2 ring-rk-cream dark:ring-rk-ink"
                      style={{ marginLeft: idx === 0 ? 0 : -7 }}
                    >
                      <Avatar name={m.name} size="sm" />
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
                  <ChevronDown
                    size={14}
                    className={cn(
                      'ml-auto text-rk-ink/30 dark:text-rk-cream/30 transition-transform',
                      abiertoEste && 'rotate-180'
                    )}
                  />
                </div>
              </div>
              <div className="text-right shrink-0">
                <div className="text-[15px] font-black text-rk-orange tabular-nums">
                  {formatPoints(g.totalPoints ?? 0)}
                </div>
                <div className="text-[9px] font-bold text-rk-ink/40 dark:text-rk-cream/40">
                  pts
                </div>
              </div>
            </button>

            {/* Miembros */}
            {abiertoEste && (
              <div className="pb-3 pl-[50px] space-y-1 animate-fade-in">
                {miembros.length === 0 ? (
                  <p className="text-[11px] font-semibold text-rk-ink/45 dark:text-rk-cream/45 py-1">
                    Este equipo aún no tiene miembros.
                  </p>
                ) : (
                  miembros.map((m) => (
                    <div key={m.id} className="flex items-center gap-2 py-1">
                      <span className="flex-1 text-[11.5px] font-bold truncate">
                        {m.name}
                      </span>
                      <span className="text-[10px] font-semibold text-rk-ink/40 dark:text-rk-cream/40">
                        {m.role === 'Codirector' ? 'Staff' : m.role}
                      </span>
                      <span className="text-[11.5px] font-black text-rk-orange tabular-nums w-11 text-right">
                        {formatPoints(m.points ?? 0)}
                      </span>
                    </div>
                  ))
                )}
              </div>
            )}

            {!abiertoEste && (
              <div className="h-px bg-black/[0.075] dark:bg-white/[0.09]" />
            )}
          </div>
        )
      })}
    </>
  )
}

function VacioEstado({ texto }) {
  return (
    <div className="text-center py-14">
      <Trophy
        size={30}
        className="mx-auto text-rk-ink/25 dark:text-rk-cream/25 mb-3"
      />
      <p className="text-sm font-semibold text-rk-ink/55 dark:text-rk-cream/55">
        {texto}
      </p>
    </div>
  )
}
