import { useState, useMemo } from 'react'
import { Navigate } from 'react-router-dom'
import { Check, Minus, Plus, Search, ChevronDown, X } from 'lucide-react'
import {
  collection, doc, writeBatch, serverTimestamp, increment,
} from 'firebase/firestore'
import { db, COL } from '../lib/firebase'
import { useAuth } from '../context/AuthContext'
import { useUsers } from '../hooks/useUsers'
import { actionsForLeague, LEAGUES } from '../lib/constants'
import { getUserLeague } from '../data/seedUsers'
import { formatPoints, cn } from '../lib/utils'
import Avatar from '../components/ui/Avatar'

// ====================================================================
// PANEL · CARGAR PUNTOS (desktop)
// --------------------------------------------------------------------
// Para volcar puntos del CRM en bloque sin ir usuario por usuario:
// 1. Eliges liga y acción
// 2. Pones el Nº de veces que cada persona ha hecho esa acción
// 3. Un solo click registra todo (aprobado directamente, sin cola)
// ====================================================================
export default function PanelPuntos() {
  const { isAdmin, firebaseUser } = useAuth()
  const { users } = useUsers()

  const [league, setLeague] = useState('agentes')
  const [actionId, setActionId] = useState(null)
  const [counts, setCounts] = useState({}) // userId -> nº de veces
  const [submitting, setSubmitting] = useState(false)
  const [done, setDone] = useState(null)
  const [error, setError] = useState(null)
  const [mode, setMode] = useState('add') // 'add' | 'subtract'
  const [busqueda, setBusqueda] = useState('')
  const [soloConPuntos, setSoloConPuntos] = useState(false)
  const [menuAbierto, setMenuAbierto] = useState(false)

  const actions = useMemo(() => actionsForLeague(league), [league])
  const action = actions.find((a) => a.id === actionId) ?? null
  const isDirect = action?.directPoints === true

  const competitors = useMemo(
    () =>
      users
        .filter((u) => getUserLeague(u) === league)
        .sort((a, b) => a.name.localeCompare(b.name)),
    [users, league]
  )

  if (!isAdmin) return <Navigate to="/" replace />


  function changeLeague(l) {
    setLeague(l)
    setActionId(null)
    setCounts({})
    setDone(null)
    setMode('add')
    setBusqueda('')
    setSoloConPuntos(false)
  }

  function selectAction(id) {
    setMenuAbierto(false)
    if (id === actionId) return
    setActionId(id)
    setCounts({})       // limpiar contadores: cada acción empieza de cero
    setDone(null)
    setError(null)
    setMode('add')
    setSoloConPuntos(false)
  }

  function setCount(userId, value) {
    const cap = isDirect ? 9999 : 99
    const n = Math.max(0, Math.min(cap, Number(value) || 0))
    setCounts((prev) => ({ ...prev, [userId]: n }))
  }

  function bump(userId, delta) {
    setCount(userId, (counts[userId] || 0) + delta)
  }

  // Lista visible: búsqueda por nombre + filtro de "solo con puntos"
  const visibles = useMemo(() => {
    const q = busqueda.trim().toLowerCase()
    return competitors.filter((u) => {
      if (soloConPuntos && !(counts[u.id] > 0)) return false
      if (!q) return true
      return u.name.toLowerCase().includes(q)
    })
  }, [competitors, busqueda, soloConPuntos, counts])

  const entries = Object.entries(counts).filter(([, n]) => n > 0)
  const totalActions = entries.reduce((acc, [, n]) => acc + n, 0)
  const sign = mode === 'subtract' ? -1 : 1
  const totalPoints = action
    ? sign * (isDirect ? totalActions : totalActions * action.points)
    : 0

  async function handleSubmit() {
    if (!action || entries.length === 0) return
    setSubmitting(true)
    setError(null)
    try {
      const batch = writeBatch(db)
      const userById = Object.fromEntries(competitors.map((u) => [u.id, u]))

      for (const [userId, n] of entries) {
        const user = userById[userId]
        if (!user) continue
        // En acciones directas, n YA son los puntos. En normales, n × valor.
        const magnitude = isDirect ? n : action.points * n
        const pts = sign * magnitude

        // Etiqueta legible para el histórico
        let label
        if (isDirect) {
          label = action.label
        } else {
          label = n > 1 ? `${action.label} ×${n}` : action.label
        }
        if (mode === 'subtract') label = `Corrección: ${label}`

        // 1 solicitud aprobada (queda en el histórico auditable)
        const reqRef = doc(collection(db, COL.actionRequests))
        batch.set(reqRef, {
          userId,
          userName: user.name,
          userEmail: user.email ?? '',
          groupId: user.groupId ?? null,
          actionType: action.id,
          actionLabel: label,
          points: pts,
          notes: mode === 'subtract'
            ? 'Corrección de puntos (panel admin)'
            : 'Carga desde CRM (panel admin)',
          status: 'approved',
          createdAt: serverTimestamp(),
          reviewedAt: serverTimestamp(),
          reviewedBy: firebaseUser?.uid ?? null,
          reviewNote: '',
        })

        // Aplicar puntos al usuario (pts ya lleva signo)
        batch.update(doc(db, COL.users, userId), {
          points: increment(pts),
          lifetimePoints: increment(pts),
          lastActionAt: serverTimestamp(),
        })

        // Aplicar al equipo si tiene
        if (user.groupId) {
          batch.update(doc(db, COL.groups, user.groupId), {
            totalPoints: increment(pts),
          })
        }

        // Notificación al usuario
        const signedLabel = pts >= 0 ? `+${pts}` : `${pts}`
        const notifRef = doc(collection(db, COL.notifications))
        batch.set(notifRef, {
          userId,
          type: 'action_approved',
          title: mode === 'subtract' ? '➖ Corrección de puntos' : '✅ Puntos registrados',
          message: `${action.label} · ${signedLabel} pts`,
          link: '/',
          read: false,
          createdAt: serverTimestamp(),
          metadata: {},
        })
      }

      await batch.commit()
      setDone({ people: entries.length, points: totalPoints, actionLabel: action.label, mode })
      setCounts({})
    } catch (e) {
      console.error(e)
      const detail = e?.code === 'permission-denied'
        ? 'permiso denegado — revisa las reglas de Firestore'
        : (e?.code || e?.message || 'error desconocido')
      setError(`No se pudo completar la carga (${detail}).`)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="min-w-[820px] max-w-[1020px] animate-fade-in pb-2">
      <h1 className="text-[27px] font-black tracking-tight">Cargar puntos</h1>
      <p className="text-[12.5px] font-semibold text-rk-ink/40 dark:text-rk-cream/40 mt-1">
        Vuelca la actividad del CRM en bloque. Se registra ya aprobado.
      </p>

      {/* ---------- Barra de controles ---------- */}
      <div className="flex items-center gap-2.5 mt-6 flex-wrap">
        {/* Liga */}
        <div className="inline-flex bg-black/[0.055] dark:bg-white/[0.07] rounded-lg p-[2px] gap-[2px]">
          {Object.values(LEAGUES).map((l) => (
            <button
              key={l.id}
              onClick={() => changeLeague(l.id)}
              className={cn(
                'px-3.5 py-[6px] rounded-md text-[12px] font-bold transition',
                league === l.id
                  ? 'bg-white dark:bg-rk-ink-card shadow-sm font-extrabold'
                  : 'text-rk-ink/45 dark:text-rk-cream/45'
              )}
            >
              {l.label}
            </button>
          ))}
        </div>

        {/* Acción — desplegable en lugar de una pared de chips */}
        <div className="relative">
          <button
            onClick={() => setMenuAbierto((v) => !v)}
            className={cn(
              'flex items-center gap-2 pl-3 pr-2.5 py-[7px] rounded-lg text-[12px] font-bold border transition min-w-[210px]',
              action
                ? 'bg-white dark:bg-rk-ink-card border-black/[0.09] dark:border-white/[0.1]'
                : 'bg-white dark:bg-rk-ink-card border-dashed border-rk-orange/45 text-rk-orange'
            )}
          >
            {action ? (
              <>
                <span className="text-[15px]">{action.icon}</span>
                <span className="flex-1 text-left truncate">{action.label}</span>
                {!isDirect && (
                  <span className="font-black text-rk-orange">+{action.points}</span>
                )}
              </>
            ) : (
              <span className="flex-1 text-left">Elige una acción…</span>
            )}
            <ChevronDown
              size={14}
              className={cn('shrink-0 opacity-40 transition-transform', menuAbierto && 'rotate-180')}
            />
          </button>

          {menuAbierto && (
            <>
              <div
                className="fixed inset-0 z-30"
                onClick={() => setMenuAbierto(false)}
              />
              <div className="absolute z-40 mt-1.5 w-[300px] bg-white dark:bg-rk-ink-card border border-black/[0.09] dark:border-white/[0.1] rounded-xl shadow-xl overflow-hidden py-1">
                {actions.map((a) => (
                  <button
                    key={a.id}
                    onClick={() => selectAction(a.id)}
                    className={cn(
                      'w-full flex items-center gap-2.5 px-3 py-2 text-[12.5px] font-bold text-left transition',
                      a.id === actionId
                        ? 'bg-rk-orange/10 text-rk-orange'
                        : 'hover:bg-black/[0.04] dark:hover:bg-white/[0.05]'
                    )}
                  >
                    <span className="text-[15px] w-5 text-center">{a.icon}</span>
                    <span className="flex-1 truncate">{a.label}</span>
                    <span
                      className={cn(
                        'text-[11px] font-black',
                        a.directPoints
                          ? 'text-rk-ink/30 dark:text-rk-cream/30'
                          : 'text-rk-orange'
                      )}
                    >
                      {a.directPoints ? 'directo' : `+${a.points}`}
                    </span>
                  </button>
                ))}
              </div>
            </>
          )}
        </div>

        {/* Modo */}
        {action && (
          <div className="inline-flex bg-black/[0.055] dark:bg-white/[0.07] rounded-lg p-[2px] gap-[2px]">
            <button
              onClick={() => setMode('add')}
              className={cn(
                'px-3 py-[6px] rounded-md text-[12px] font-bold transition',
                mode === 'add'
                  ? 'bg-white dark:bg-rk-ink-card shadow-sm font-extrabold'
                  : 'text-rk-ink/45 dark:text-rk-cream/45'
              )}
            >
              Sumar
            </button>
            <button
              onClick={() => setMode('subtract')}
              className={cn(
                'px-3 py-[6px] rounded-md text-[12px] font-bold transition',
                mode === 'subtract'
                  ? 'bg-red-500 text-white font-extrabold'
                  : 'text-rk-ink/45 dark:text-rk-cream/45'
              )}
            >
              Restar
            </button>
          </div>
        )}

        {/* Buscador */}
        {action && (
          <div className="relative ml-auto">
            <Search
              size={13}
              className="absolute left-2.5 top-1/2 -translate-y-1/2 text-rk-ink/30 dark:text-rk-cream/30"
            />
            <input
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              placeholder="Buscar…"
              className="w-[150px] pl-7 pr-7 py-[7px] rounded-lg bg-black/[0.04] dark:bg-white/[0.06] text-[12px] font-semibold outline-none focus:ring-2 focus:ring-rk-orange/35 placeholder:text-rk-ink/30 dark:placeholder:text-rk-cream/30"
            />
            {busqueda && (
              <button
                onClick={() => setBusqueda('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-rk-ink/35 dark:text-rk-cream/35"
              >
                <X size={12} />
              </button>
            )}
          </div>
        )}
      </div>

      {/* Confirmación */}
      {done && (
        <div
          className={cn(
            'flex items-center gap-2.5 rounded-xl px-4 py-2.5 mt-4 text-[12.5px] font-bold',
            done.mode === 'subtract'
              ? 'bg-red-500/10 text-red-600 dark:text-red-400'
              : 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400'
          )}
        >
          <Check size={15} />
          {done.mode === 'subtract' ? 'Restado' : 'Cargado'}: {done.actionLabel} ·{' '}
          {done.people} {done.people === 1 ? 'persona' : 'personas'} ·{' '}
          {done.points >= 0 ? '+' : ''}
          {formatPoints(done.points)} pts
        </div>
      )}

      {error && (
        <div className="bg-red-500/10 text-red-600 dark:text-red-400 rounded-xl px-4 py-2.5 mt-4 text-[12.5px] font-bold">
          {error}
        </div>
      )}

      {/* ---------- Listado ---------- */}
      {action ? (
        <>
          <div className="flex items-center gap-3 mt-5 mb-2">
            <span className="text-[11px] font-bold text-rk-ink/40 dark:text-rk-cream/40">
              {isDirect
                ? 'Escribe los puntos de cada persona'
                : 'Escribe cuántas veces lo ha hecho cada persona'}
            </span>
            {entries.length > 0 && (
              <button
                onClick={() => setSoloConPuntos((v) => !v)}
                className={cn(
                  'ml-auto text-[11px] font-bold px-2.5 py-1 rounded-md transition',
                  soloConPuntos
                    ? 'bg-rk-orange/12 text-rk-orange'
                    : 'text-rk-ink/40 dark:text-rk-cream/40 hover:bg-black/[0.04] dark:hover:bg-white/[0.05]'
                )}
              >
                {soloConPuntos ? 'Ver todos' : `Ver solo los ${entries.length} rellenados`}
              </button>
            )}
          </div>

          <div className="bg-white dark:bg-rk-ink-card rounded-xl border border-black/[0.07] dark:border-white/[0.08] overflow-hidden">
            {visibles.length === 0 ? (
              <div className="py-12 text-center text-[12.5px] font-semibold text-rk-ink/40 dark:text-rk-cream/40">
                Nadie coincide con la búsqueda.
              </div>
            ) : (
              visibles.map((u, i) => {
                const n = counts[u.id] || 0
                return (
                  <div
                    key={u.id}
                    className={cn(
                      'flex items-center gap-3 px-4 py-[9px] group transition-colors',
                      i < visibles.length - 1 &&
                        'border-b border-black/[0.055] dark:border-white/[0.06]',
                      n > 0 && 'bg-rk-orange/[0.045]'
                    )}
                  >
                    <Avatar name={u.name} size="sm" />
                    <span className="flex-1 text-[12.5px] font-bold truncate">
                      {u.name}
                    </span>
                    <span className="text-[11px] font-semibold text-rk-ink/35 dark:text-rk-cream/35 w-32 truncate">
                      {u.role === 'Codirector' ? 'Staff (Admin)' : u.role}
                    </span>

                    {/* Campo + steppers que aparecen al pasar por encima */}
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => bump(u.id, -1)}
                        disabled={n === 0}
                        tabIndex={-1}
                        className="w-7 h-7 rounded-md flex items-center justify-center text-rk-ink/45 dark:text-rk-cream/45 opacity-0 group-hover:opacity-100 focus:opacity-100 hover:bg-black/[0.06] dark:hover:bg-white/[0.08] disabled:opacity-0 transition"
                      >
                        <Minus size={13} />
                      </button>
                      <input
                        type="number"
                        min="0"
                        max={isDirect ? 9999 : 99}
                        value={n === 0 ? '' : n}
                        placeholder="0"
                        onChange={(e) => setCount(u.id, e.target.value)}
                        onFocus={(e) => e.target.select()}
                        className={cn(
                          'text-center py-1.5 rounded-lg font-black text-[13px] outline-none transition',
                          isDirect ? 'w-[62px]' : 'w-[50px]',
                          n > 0
                            ? mode === 'subtract'
                              ? 'bg-red-500/10 text-red-600 dark:text-red-400'
                              : 'bg-rk-orange/12 text-rk-orange'
                            : 'bg-black/[0.04] dark:bg-white/[0.06] text-rk-ink/30 dark:text-rk-cream/30',
                          mode === 'subtract'
                            ? 'focus:ring-2 focus:ring-red-500/40'
                            : 'focus:ring-2 focus:ring-rk-orange/40'
                        )}
                      />
                      <button
                        onClick={() => bump(u.id, +1)}
                        tabIndex={-1}
                        className="w-7 h-7 rounded-md flex items-center justify-center text-rk-ink/45 dark:text-rk-cream/45 opacity-0 group-hover:opacity-100 focus:opacity-100 hover:bg-black/[0.06] dark:hover:bg-white/[0.08] transition"
                      >
                        <Plus size={13} />
                      </button>
                    </div>
                  </div>
                )
              })
            )}
          </div>

          {/* Barra de resumen */}
          <div className="sticky bottom-3 mt-3 flex items-center gap-4 bg-rk-ink dark:bg-rk-ink-card text-rk-cream rounded-xl px-4 py-3 border border-white/10 shadow-xl">
            <div className="flex-1 text-[12.5px] font-semibold">
              {entries.length === 0 ? (
                <span className="opacity-55">
                  Sin nada que registrar todavía
                </span>
              ) : (
                <>
                  <b className="font-black">{entries.length}</b> de{' '}
                  {competitors.length} personas
                  {!isDirect && (
                    <>
                      {' · '}
                      <b className="font-black">{totalActions}</b>{' '}
                      {totalActions === 1 ? 'acción' : 'acciones'}
                    </>
                  )}
                  {' · '}
                  <b
                    className={cn(
                      'font-black',
                      mode === 'subtract' ? 'text-red-400' : 'text-rk-orange-light'
                    )}
                  >
                    {totalPoints >= 0 ? '+' : ''}
                    {formatPoints(totalPoints)} pts
                  </b>
                </>
              )}
            </div>
            {entries.length > 0 && (
              <button
                onClick={() => setCounts({})}
                className="text-[11.5px] font-bold opacity-50 hover:opacity-80 transition"
              >
                Limpiar
              </button>
            )}
            <button
              onClick={handleSubmit}
              disabled={entries.length === 0 || submitting}
              className={cn(
                'px-5 py-2 text-white font-extrabold text-[12.5px] rounded-lg transition disabled:opacity-30',
                mode === 'subtract'
                  ? 'bg-red-500 hover:bg-red-600'
                  : 'bg-rk-orange hover:bg-rk-orange-dark'
              )}
            >
              {submitting
                ? 'Procesando…'
                : mode === 'subtract'
                ? 'Restar puntos'
                : 'Registrar puntos'}
            </button>
          </div>
        </>
      ) : (
        <div className="mt-6 rounded-xl border border-dashed border-black/[0.12] dark:border-white/[0.14] py-16 text-center">
          <p className="text-[13px] font-bold">Elige una acción para empezar</p>
          <p className="text-[11.5px] font-semibold text-rk-ink/40 dark:text-rk-cream/40 mt-1.5 max-w-sm mx-auto leading-relaxed">
            En las sumas totales se escriben los puntos directamente; en el
            resto, cuántas veces se ha hecho.
          </p>
        </div>
      )}
    </div>
  )
}
