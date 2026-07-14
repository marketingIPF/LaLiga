import { useState, useMemo } from 'react'
import { Link, Navigate } from 'react-router-dom'
import { ArrowLeft, ClipboardList, Check, Minus, Plus, Camera, Loader2, AlertTriangle } from 'lucide-react'
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

  // Modo captura
  const [parsing, setParsing] = useState(false)
  const [parseInfo, setParseInfo] = useState(null) // { matched, unmatched: [{name, count}] }

  const actions = useMemo(() => actionsForLeague(league), [league])
  const action = actions.find((a) => a.id === actionId) ?? null

  const competitors = useMemo(
    () =>
      users
        .filter((u) => getUserLeague(u) === league)
        .sort((a, b) => a.name.localeCompare(b.name)),
    [users, league]
  )

  if (!isAdmin) return <Navigate to="/" replace />

  // ------- Captura del CRM → contadores -------
  const normalize = (s) =>
    s
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9 ]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()

  function matchUser(name) {
    const target = normalize(name)
    if (!target) return null
    const targetTokens = target.split(' ')

    let best = null
    let bestScore = 0
    for (const u of competitors) {
      const uNorm = normalize(u.name)
      if (uNorm === target) return u
      const uTokens = uNorm.split(' ')
      // puntuación: tokens compartidos (nombre y apellidos)
      const shared = targetTokens.filter((t) => uTokens.includes(t)).length
      const score = shared / Math.max(targetTokens.length, 1)
      if (score > bestScore) {
        bestScore = score
        best = u
      }
    }
    // exigimos al menos que coincida el nombre o buena parte
    return bestScore >= 0.5 ? best : null
  }

  async function handleCapture(e) {
    const file = e.target.files?.[0]
    e.target.value = '' // permite re-subir el mismo archivo
    if (!file) return
    setParsing(true)
    setError(null)
    setParseInfo(null)
    try {
      const base64 = await new Promise((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = () => resolve(String(reader.result).split(',')[1])
        reader.onerror = () => reject(new Error('No se pudo leer el archivo'))
        reader.readAsDataURL(file)
      })

      const resp = await fetch('/api/parse-crm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image: base64, mimeType: file.type || 'image/png' }),
      })
      const data = await resp.json()
      if (!resp.ok) throw new Error(data.error || 'Error al procesar')

      const rows = data.rows ?? []
      const nextCounts = { ...counts }
      const unmatched = []
      let matched = 0
      for (const row of rows) {
        const user = matchUser(row.name)
        if (user && row.count > 0) {
          nextCounts[user.id] = Math.min(99, (nextCounts[user.id] || 0) + row.count)
          matched++
        } else if (row.count > 0) {
          unmatched.push(row)
        }
      }
      setCounts(nextCounts)
      setParseInfo({ matched, unmatched, total: rows.length })
    } catch (err) {
      console.error(err)
      setError(err.message || 'No se pudo procesar la captura.')
    } finally {
      setParsing(false)
    }
  }

  function changeLeague(l) {
    setLeague(l)
    setActionId(null)
    setCounts({})
    setDone(null)
    setParseInfo(null)
  }

  function selectAction(id) {
    if (id === actionId) return
    setActionId(id)
    setCounts({})       // limpiar contadores: cada acción empieza de cero
    setDone(null)
    setParseInfo(null)
    setError(null)
  }

  function setCount(userId, value) {
    const n = Math.max(0, Math.min(99, Number(value) || 0))
    setCounts((prev) => ({ ...prev, [userId]: n }))
  }

  function bump(userId, delta) {
    setCount(userId, (counts[userId] || 0) + delta)
  }

  const entries = Object.entries(counts).filter(([, n]) => n > 0)
  const totalActions = entries.reduce((acc, [, n]) => acc + n, 0)
  const totalPoints = action ? totalActions * action.points : 0

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
        const pts = action.points * n

        // 1 solicitud aprobada (queda en el histórico auditable)
        const reqRef = doc(collection(db, COL.actionRequests))
        batch.set(reqRef, {
          userId,
          userName: user.name,
          userEmail: user.email ?? '',
          groupId: user.groupId ?? null,
          actionType: action.id,
          actionLabel: n > 1 ? `${action.label} ×${n}` : action.label,
          points: pts,
          notes: 'Carga desde CRM (panel admin)',
          status: 'approved',
          createdAt: serverTimestamp(),
          reviewedAt: serverTimestamp(),
          reviewedBy: firebaseUser?.uid ?? null,
          reviewNote: '',
        })

        // Sumar puntos al usuario
        batch.update(doc(db, COL.users, userId), {
          points: increment(pts),
          lifetimePoints: increment(pts),
          lastActionAt: serverTimestamp(),
        })

        // Sumar al equipo si tiene
        if (user.groupId) {
          batch.update(doc(db, COL.groups, user.groupId), {
            totalPoints: increment(pts),
          })
        }

        // Notificación al usuario
        const notifRef = doc(collection(db, COL.notifications))
        batch.set(notifRef, {
          userId,
          type: 'action_approved',
          title: '✅ Puntos registrados',
          message: `${action.label}${n > 1 ? ` ×${n}` : ''} · +${pts} pts`,
          link: '/',
          read: false,
          createdAt: serverTimestamp(),
          metadata: {},
        })
      }

      await batch.commit()
      setDone({ people: entries.length, points: totalPoints, actionLabel: action.label })
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

      {/* Subir captura del CRM */}
      {action && (
        <div className="flex items-center gap-3 bg-white dark:bg-rk-ink-card rounded-2xl px-4 py-3 border border-black/[0.04] dark:border-white/[0.05] shadow-soft">
          <div className="w-10 h-10 rounded-xl bg-rk-orange/10 text-rk-orange flex items-center justify-center shrink-0">
            {parsing ? <Loader2 size={18} className="animate-spin" /> : <Camera size={18} />}
          </div>
          <div className="flex-1 min-w-0">
            <div className="font-extrabold text-sm">
              {parsing ? 'Leyendo la captura…' : 'Rellenar desde una captura del CRM'}
            </div>
            <div className="text-xs text-rk-ink/60 dark:text-rk-cream/60">
              Sube la captura con los nombres y cantidades de "{action.label}". Los contadores se rellenan solos y tú revisas antes de registrar.
            </div>
          </div>
          <label className={cn(
            'px-4 py-2 rounded-xl text-xs font-extrabold cursor-pointer transition shrink-0',
            parsing
              ? 'bg-black/5 dark:bg-white/5 opacity-50 pointer-events-none'
              : 'bg-rk-orange text-white shadow-orange-glow-sm hover:bg-rk-orange-dark'
          )}>
            Subir captura
            <input type="file" accept="image/*" className="hidden" onChange={handleCapture} disabled={parsing} />
          </label>
        </div>
      )}

      {/* Resultado del análisis de la captura */}
      {parseInfo && (
        <div className="space-y-2">
          <div className="flex items-center gap-2.5 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 rounded-2xl px-4 py-2.5 font-bold text-sm">
            <Check size={16} />
            {parseInfo.matched} de {parseInfo.total} filas reconocidas y volcadas a los contadores. Revisa abajo antes de registrar.
          </div>
          {parseInfo.unmatched.length > 0 && (
            <div className="bg-amber-500/10 text-amber-700 dark:text-amber-400 rounded-2xl px-4 py-2.5 text-sm">
              <div className="flex items-center gap-2 font-bold mb-1">
                <AlertTriangle size={15} />
                {parseInfo.unmatched.length} {parseInfo.unmatched.length === 1 ? 'fila sin reconocer' : 'filas sin reconocer'} — ponlas a mano:
              </div>
              <div className="text-xs leading-relaxed">
                {parseInfo.unmatched.map((r, i) => (
                  <span key={i} className="inline-block mr-3">
                    {r.name} ({r.count})
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Confirmación de carga completada */}
      {done && (
        <div className="flex items-center gap-3 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 rounded-2xl px-4 py-3 font-bold text-sm">
          <Check size={18} />
          Cargado: {done.actionLabel} para {done.people}{' '}
          {done.people === 1 ? 'persona' : 'personas'} · +
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
              <div className="text-center">Nº DE VECES</div>
            </div>
            <div className="divide-y divide-black/[0.04] dark:divide-white/[0.05]">
              {competitors.map((u) => {
                const n = counts[u.id] || 0
                return (
                  <div
                    key={u.id}
                    className={cn(
                      'grid grid-cols-[44px_1.6fr_1fr_180px] gap-3 px-5 py-2.5 items-center',
                      n > 0 && 'bg-rk-orange/[0.04]'
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
                        max="99"
                        value={n === 0 ? '' : n}
                        placeholder="0"
                        onChange={(e) => setCount(u.id, e.target.value)}
                        className={cn(
                          'w-14 text-center py-1.5 rounded-lg font-black text-sm bg-black/5 dark:bg-white/5 focus:outline-none focus:ring-2 focus:ring-rk-orange',
                          n > 0 && 'bg-rk-orange/10 text-rk-orange'
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
                  Pon el nº de veces que cada persona ha hecho "{action.label}"
                </span>
              ) : (
                <span>
                  <strong>{entries.length}</strong>{' '}
                  {entries.length === 1 ? 'persona' : 'personas'} ·{' '}
                  <strong>{totalActions}</strong>{' '}
                  {totalActions === 1 ? 'acción' : 'acciones'} ·{' '}
                  <strong className="text-rk-orange">
                    +{formatPoints(totalPoints)} pts
                  </strong>
                </span>
              )}
            </div>
            <button
              onClick={handleSubmit}
              disabled={entries.length === 0 || submitting}
              className="px-6 py-2.5 bg-rk-orange text-white font-extrabold text-sm rounded-xl shadow-orange-glow-sm hover:bg-rk-orange-dark transition disabled:opacity-40"
            >
              {submitting ? 'Cargando…' : 'Registrar puntos'}
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
            Selecciona arriba la acción del CRM que quieres volcar, y pon
            cuántas veces la ha hecho cada persona. Todo se registra de una
            sola vez.
          </p>
        </div>
      )}
    </div>
  )
}
