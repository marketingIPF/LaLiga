import { useState, useMemo } from 'react'
import { Link, Navigate } from 'react-router-dom'
import { ArrowLeft, ClipboardList, Check, Minus, Plus } from 'lucide-react'
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
  }

  function selectAction(id) {
    if (id === actionId) return
    setActionId(id)
    setCounts({})       // limpiar contadores: cada acción empieza de cero
    setDone(null)
    setError(null)
    setMode('add')
  }

  function setCount(userId, value) {
    const cap = isDirect ? 9999 : 99
    const n = Math.max(0, Math.min(cap, Number(value) || 0))
    setCounts((prev) => ({ ...prev, [userId]: n }))
  }

  function bump(userId, delta) {
    setCount(userId, (counts[userId] || 0) + delta)
  }

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
    <div className="space-y-5 animate-fade-in min-w-[1024px]">
      {/* HEADER */}
      <header className="flex items-center pb-5 border-b border-black/[0.06] dark:border-white/[0.06]">
        <Link
          to="/panel"
          className="flex items-center gap-1.5 text-xs font-bold px-3 py-2 rounded-lg bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10 transition mr-4"
        >
          <ArrowLeft size={13} /> Panel
        </Link>
        <div>
          <p className="text-[10px] font-bold tracking-[2px] text-rk-orange">
            CARGA MASIVA · CRM
          </p>
          <h1 className="text-2xl font-black tracking-tight mt-1">
            Cargar puntos
          </h1>
        </div>
      </header>

      {/* Paso 1: liga */}
      <div className="flex items-center gap-3">
        <span className="text-[10px] font-extrabold tracking-[2px] text-rk-ink/50 dark:text-rk-cream/50 w-16">
          LIGA
        </span>
        <div className="flex gap-2">
          {Object.values(LEAGUES).map((l) => (
            <button
              key={l.id}
              onClick={() => changeLeague(l.id)}
              className={cn(
                'px-4 py-2 rounded-xl text-sm font-extrabold transition',
                league === l.id
                  ? 'bg-rk-orange text-white shadow-orange-glow-sm'
                  : 'bg-white dark:bg-rk-ink-card border border-black/[0.04] dark:border-white/[0.05]'
              )}
            >
              {l.label}
            </button>
          ))}
        </div>
      </div>

      {/* Paso 2: acción */}
      <div className="flex items-start gap-3">
        <span className="text-[10px] font-extrabold tracking-[2px] text-rk-ink/50 dark:text-rk-cream/50 w-16 pt-2.5">
          ACCIÓN
        </span>
        <div className="flex flex-wrap gap-2 flex-1">
          {actions.map((a) => (
            <button
              key={a.id}
              onClick={() => selectAction(a.id)}
              className={cn(
                'flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-extrabold transition',
                actionId === a.id
                  ? 'bg-rk-orange text-white shadow-orange-glow-sm'
                  : 'bg-white dark:bg-rk-ink-card border border-black/[0.04] dark:border-white/[0.05] hover:border-rk-orange/40'
              )}
            >
              <span>{a.icon}</span>
              {a.label}
              <span
                className={cn(
                  'font-black',
                  actionId === a.id ? 'text-white/90' : 'text-rk-orange'
                )}
              >
                +{a.points}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Modo sumar / restar */}
      {action && (
        <div className="flex items-center gap-3">
          <span className="text-[10px] font-extrabold tracking-[2px] text-rk-ink/50 dark:text-rk-cream/50 w-16">
            MODO
          </span>
          <div className="flex gap-2">
            <button
              onClick={() => setMode('add')}
              className={cn(
                'flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-extrabold transition',
                mode === 'add'
                  ? 'bg-emerald-500 text-white shadow-md shadow-emerald-500/25'
                  : 'bg-white dark:bg-rk-ink-card border border-black/[0.04] dark:border-white/[0.05]'
              )}
            >
              <Plus size={14} /> Sumar
            </button>
            <button
              onClick={() => setMode('subtract')}
              className={cn(
                'flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-extrabold transition',
                mode === 'subtract'
                  ? 'bg-red-500 text-white shadow-md shadow-red-500/25'
                  : 'bg-white dark:bg-rk-ink-card border border-black/[0.04] dark:border-white/[0.05]'
              )}
            >
              <Minus size={14} /> Restar
            </button>
          </div>
          {mode === 'subtract' && (
            <span className="text-xs font-bold text-red-500">
              Los puntos que introduzcas se RESTARÁN a cada persona.
            </span>
          )}
        </div>
      )}

      {/* Confirmación de carga completada */}
      {done && (
        <div className={cn(
          'flex items-center gap-3 rounded-2xl px-4 py-3 font-bold text-sm',
          done.mode === 'subtract'
            ? 'bg-red-500/10 text-red-600 dark:text-red-400'
            : 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400'
        )}>
          <Check size={18} />
          {done.mode === 'subtract' ? 'Restado' : 'Cargado'}: {done.actionLabel} para {done.people}{' '}
          {done.people === 1 ? 'persona' : 'personas'} · {done.points >= 0 ? '+' : ''}
          {formatPoints(done.points)} pts en total
        </div>
      )}

      {error && (
        <div className="bg-red-500/10 text-red-500 rounded-2xl px-4 py-3 font-bold text-sm">
          {error}
        </div>
      )}

      {/* Paso 3: grid de personas */}
      {action ? (
        <>
          <div className="bg-white dark:bg-rk-ink-card rounded-2xl border border-black/[0.04] dark:border-white/[0.05] shadow-soft overflow-hidden">
            <div className="grid grid-cols-[44px_1.6fr_1fr_180px] gap-3 px-5 py-3 bg-black/[0.02] dark:bg-white/[0.02] border-b border-black/[0.04] dark:border-white/[0.05] text-[10px] font-extrabold tracking-[2px] text-rk-ink/50 dark:text-rk-cream/50">
              <div />
              <div>NOMBRE</div>
              <div>ROL</div>
              <div className="text-center">{isDirect ? 'PUNTOS' : 'Nº DE VECES'}</div>
            </div>
            <div className="divide-y divide-black/[0.04] dark:divide-white/[0.05]">
              {competitors.map((u) => {
                const n = counts[u.id] || 0
                return (
                  <div
                    key={u.id}
                    className={cn(
                      'grid grid-cols-[44px_1.6fr_1fr_180px] gap-3 px-5 py-2.5 items-center',
                      n > 0 && (mode === 'subtract' ? 'bg-red-500/[0.04]' : 'bg-rk-orange/[0.04]')
                    )}
                  >
                    <Avatar name={u.name} size="sm" />
                    <div className="font-bold text-sm truncate">{u.name}</div>
                    <div className="text-[11px] font-bold text-rk-ink/60 dark:text-rk-cream/60">
                      {u.role === 'Codirector' ? 'Staff (Admin)' : u.role}
                    </div>
                    <div className="flex items-center justify-center gap-2">
                      <button
                        onClick={() => bump(u.id, -1)}
                        disabled={n === 0}
                        className="w-8 h-8 rounded-lg bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10 flex items-center justify-center disabled:opacity-30 transition"
                      >
                        <Minus size={14} />
                      </button>
                      <input
                        type="number"
                        min="0"
                        max={isDirect ? 9999 : 99}
                        value={n === 0 ? '' : n}
                        placeholder="0"
                        onChange={(e) => setCount(u.id, e.target.value)}
                        className={cn(
                          'text-center py-1.5 rounded-lg font-black text-sm bg-black/5 dark:bg-white/5 focus:outline-none focus:ring-2',
                          isDirect ? 'w-20' : 'w-14',
                          mode === 'subtract' ? 'focus:ring-red-500' : 'focus:ring-rk-orange',
                          n > 0 && (mode === 'subtract'
                            ? 'bg-red-500/10 text-red-600 dark:text-red-400'
                            : 'bg-rk-orange/10 text-rk-orange')
                        )}
                      />
                      <button
                        onClick={() => bump(u.id, +1)}
                        className="w-8 h-8 rounded-lg bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10 flex items-center justify-center transition"
                      >
                        <Plus size={14} />
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Barra de resumen fija abajo */}
          <div className="sticky bottom-4 flex items-center gap-4 bg-rk-ink dark:bg-rk-ink-card text-rk-cream rounded-2xl px-5 py-4 shadow-2xl">
            <ClipboardList size={18} className="text-rk-orange" />
            <div className="flex-1 text-sm">
              {entries.length === 0 ? (
                <span className="opacity-70">
                  {isDirect
                    ? `Pon los puntos de "${action.label}" para cada persona`
                    : `Pon el nº de veces que cada persona ha hecho "${action.label}"`}
                </span>
              ) : (
                <span>
                  <strong>{entries.length}</strong>{' '}
                  {entries.length === 1 ? 'persona' : 'personas'}
                  {!isDirect && (
                    <>
                      {' '}· <strong>{totalActions}</strong>{' '}
                      {totalActions === 1 ? 'acción' : 'acciones'}
                    </>
                  )}
                  {' '}·{' '}
                  <strong className={mode === 'subtract' ? 'text-red-400' : 'text-rk-orange'}>
                    {totalPoints >= 0 ? '+' : ''}{formatPoints(totalPoints)} pts
                  </strong>
                </span>
              )}
            </div>
            <button
              onClick={handleSubmit}
              disabled={entries.length === 0 || submitting}
              className={cn(
                'px-6 py-2.5 text-white font-extrabold text-sm rounded-xl transition disabled:opacity-40',
                mode === 'subtract'
                  ? 'bg-red-500 hover:bg-red-600 shadow-md shadow-red-500/25'
                  : 'bg-rk-orange hover:bg-rk-orange-dark shadow-orange-glow-sm'
              )}
            >
              {submitting ? 'Procesando…' : (mode === 'subtract' ? 'Restar puntos' : 'Registrar puntos')}
            </button>
          </div>
        </>
      ) : (
        <div className="bg-white dark:bg-rk-ink-card rounded-2xl p-12 border border-black/[0.04] dark:border-white/[0.05] shadow-soft text-center">
          <div className="w-16 h-16 rounded-2xl bg-rk-orange/10 text-rk-orange flex items-center justify-center mx-auto mb-4">
            <ClipboardList size={28} />
          </div>
          <h3 className="text-lg font-black mb-1">Elige una acción</h3>
          <p className="text-sm text-rk-ink/60 dark:text-rk-cream/60 max-w-md mx-auto">
            Selecciona arriba la acción que quieres cargar. En las sumas
            totales (toques, entrevistas) se teclea el total de puntos; en
            el resto, el nº de veces. Puedes sumar o restar.
          </p>
        </div>
      )}
    </div>
  )
}
