import { useState, useMemo, useEffect } from 'react'
import { Navigate } from 'react-router-dom'
import {
  UserPlus, Search, Trash2, X, AlertTriangle, Shield,
  History, TrendingUp, TrendingDown,
} from 'lucide-react'
import { collection, getDocs, query, where } from 'firebase/firestore'
import { db, COL } from '../lib/firebase'
import { ACTION_TYPES } from '../lib/constants'
import { relativeDate } from '../lib/utils'
import { useAuth } from '../context/AuthContext'
import { useUsers } from '../hooks/useUsers'
import { useGroups } from '../hooks/useGroups'
import { isAdminRole } from '../data/seedUsers'
import { createAgent, removeAgent } from '../lib/userAdmin'
import { formatPoints, cn } from '../lib/utils'
import Avatar from '../components/ui/Avatar'

// ====================================================================
// PANEL · AGENTES (desktop)
// ====================================================================
export default function PanelAgentes() {
  const { isAdmin, firebaseUser } = useAuth()
  const { users } = useUsers()
  const { groups } = useGroups()
  const [search, setSearch] = useState('')
  const [showAdd, setShowAdd] = useState(false)
  const [removing, setRemoving] = useState(null)
  const [historyUser, setHistoryUser] = useState(null)

  const groupById = useMemo(
    () => Object.fromEntries(groups.map((g) => [g.id, g])),
    [groups]
  )

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    const list = q
      ? users.filter(
          (u) =>
            u.name.toLowerCase().includes(q) ||
            u.email.toLowerCase().includes(q)
        )
      : users
    return [...list].sort((a, b) => {
      const aAdmin = isAdminRole(a.role) ? 0 : 1
      const bAdmin = isAdminRole(b.role) ? 0 : 1
      if (aAdmin !== bAdmin) return aAdmin - bAdmin
      return a.name.localeCompare(b.name)
    })
  }, [users, search])

  if (!isAdmin) return <Navigate to="/" replace />

  const totalAgents = users.filter((u) => !isAdminRole(u.role)).length
  const totalAdmins = users.filter((u) => isAdminRole(u.role)).length
  const inTeams = users.filter((u) => !isAdminRole(u.role) && u.groupId).length

  return (
    <div className="min-w-[900px] max-w-[1180px] animate-fade-in">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-[27px] font-black tracking-tight">Agentes</h1>
          <p className="text-[12.5px] font-semibold text-rk-ink/40 dark:text-rk-cream/40 mt-1">
            {totalAgents} agentes · {totalAdmins} administradores
          </p>
        </div>
        <button
          onClick={() => setShowAdd(true)}
          className="flex items-center gap-2 px-4 py-2.5 bg-rk-orange text-white font-extrabold text-[12.5px] rounded-lg hover:bg-rk-orange-dark transition"
        >
          <UserPlus size={15} /> Nuevo agente
        </button>
      </div>

      {/* KPIs sin cajas */}
      <div className="flex border-y border-black/[0.08] dark:border-white/[0.09] mt-6">
        <Kpi label="Agentes" value={totalAgents} />
        <Kpi label="Administradores" value={totalAdmins} />
        <Kpi label="En un equipo" value={`${inTeams} / ${totalAgents}`} />
      </div>

      {/* Buscador */}
      <div className="relative mt-5">
        <Search
          size={14}
          className="absolute left-3.5 top-1/2 -translate-y-1/2 text-rk-ink/35 dark:text-rk-cream/35"
        />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar por nombre o email…"
          className="w-full max-w-sm pl-9 pr-3 py-2.5 bg-black/[0.04] dark:bg-white/[0.06] rounded-lg text-[13px] font-semibold outline-none focus:ring-2 focus:ring-rk-orange/35 placeholder:text-rk-ink/30 dark:placeholder:text-rk-cream/30"
        />
      </div>

      {/* Tabla */}
      <div className="bg-white dark:bg-rk-ink-card rounded-xl border border-black/[0.07] dark:border-white/[0.08] overflow-hidden mt-4">
        <div className="grid grid-cols-[44px_1.4fr_2fr_0.9fr_1.2fr_0.7fr_44px] gap-3 px-5 py-2.5 border-b border-black/[0.055] dark:border-white/[0.06] text-[9.5px] font-bold text-rk-ink/40 dark:text-rk-cream/40">
          <div />
          <div>NOMBRE</div>
          <div>EMAIL</div>
          <div>ROL</div>
          <div>EQUIPO</div>
          <div className="text-right">PUNTOS</div>
          <div />
        </div>

        {filtered.length === 0 ? (
          <div className="py-12 text-center text-[12.5px] font-semibold text-rk-ink/40 dark:text-rk-cream/40">
            {search
              ? 'Nadie coincide con esa búsqueda.'
              : 'No hay usuarios.'}
          </div>
        ) : (
          <div className="divide-y divide-black/[0.055] dark:divide-white/[0.06]">
            {filtered.map((u) => {
              const group = u.groupId ? groupById[u.groupId] : null
              const isAdmin_ = isAdminRole(u.role)
              const isSelf = u.id === firebaseUser?.uid
              return (
                <div
                  key={u.id}
                  className="grid grid-cols-[44px_1.4fr_2fr_0.9fr_1.2fr_0.7fr_44px] gap-3 px-5 py-2.5 items-center hover:bg-black/[0.015] dark:hover:bg-white/[0.02] transition-colors group"
                >
                  <Avatar name={u.name} size="sm" />
                  <button
                    onClick={() => setHistoryUser(u)}
                    className="font-extrabold text-[12.5px] truncate text-left hover:text-rk-orange transition flex items-center gap-1.5"
                    title="Ver historial de puntos"
                  >
                    <span className="truncate">{u.name}</span>
                    <History
                      size={11}
                      className="shrink-0 opacity-0 group-hover:opacity-100 transition text-rk-orange"
                    />
                  </button>
                  <div className="text-[11.5px] font-semibold text-rk-ink/50 dark:text-rk-cream/50 truncate">
                    {u.email}
                  </div>
                  <div>
                    {isAdmin_ ? (
                      <span className="inline-flex items-center gap-1 text-[9.5px] font-black uppercase text-rk-orange">
                        <Shield size={9} /> Admin
                      </span>
                    ) : (
                      <span className="text-[11px] font-bold text-rk-ink/50 dark:text-rk-cream/50">
                        {u.role === 'Agente Comercial' ? 'Agente' : u.role}
                      </span>
                    )}
                  </div>
                  <div className="text-[11.5px] flex items-center gap-2 min-w-0">
                    {group ? (
                      <>
                        <div
                          className="w-[7px] h-[7px] rounded-sm shrink-0"
                          style={{ backgroundColor: group.color }}
                        />
                        <span className="font-bold truncate">
                          {group.name}
                        </span>
                      </>
                    ) : (
                      <span className="text-rk-ink/30 dark:text-rk-cream/30 font-semibold">
                        Sin equipo
                      </span>
                    )}
                  </div>
                  <div className="text-right text-[13px] font-black tabular-nums">
                    {isAdmin_ ? '—' : formatPoints(u.points || 0)}
                  </div>
                  <button
                    onClick={() => setRemoving(u)}
                    disabled={isSelf}
                    className="w-8 h-8 rounded-lg flex items-center justify-center text-red-500/70 hover:bg-red-500/[0.08] hover:text-red-500 transition disabled:opacity-25 disabled:cursor-not-allowed justify-self-end"
                    title={
                      isSelf
                        ? 'No puedes borrarte a ti mismo'
                        : 'Eliminar usuario'
                    }
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {showAdd && (
        <AddAgentModal groups={groups} onClose={() => setShowAdd(false)} />
      )}
      {removing && (
        <RemoveAgentModal user={removing} onClose={() => setRemoving(null)} />
      )}
      {historyUser && (
        <HistoryDrawer user={historyUser} onClose={() => setHistoryUser(null)} />
      )}
    </div>
  )
}

function Kpi({ label, value }) {
  return (
    <div className="flex-1 py-3.5 px-1 relative first:pl-0">
      <div className="absolute left-0 top-[20%] h-[60%] w-px bg-black/[0.08] dark:bg-white/[0.09] first:hidden" />
      <div className="text-[9.5px] font-bold text-rk-ink/40 dark:text-rk-cream/40">
        {label}
      </div>
      <div className="text-[24px] font-black tracking-tight leading-none mt-1">
        {value}
      </div>
    </div>
  )
}


// ====================================================================
// Add agent modal — misma lógica que la versión móvil
// ====================================================================
function AddAgentModal({ groups, onClose }) {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [role, setRole] = useState('Agente Comercial')
  const [groupId, setGroupId] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [done, setDone] = useState(false)

  async function handleSubmit() {
    setError(null)
    setLoading(true)
    try {
      await createAgent({
        name,
        email,
        phone,
        role,
        groupId: groupId || null,
      })
      setDone(true)
      setTimeout(onClose, 1500)
    } catch (e) {
      setError(e.message ?? 'No se pudo crear el agente.')
      setLoading(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in"
      onClick={loading ? undefined : onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md bg-white dark:bg-rk-ink-card rounded-3xl p-6 shadow-2xl animate-slide-up max-h-[90vh] overflow-y-auto"
      >
        {done ? (
          <div className="text-center py-4">
            <div className="w-16 h-16 rounded-full bg-green-500/10 text-green-500 flex items-center justify-center mx-auto mb-3">
              <UserPlus size={28} />
            </div>
            <h2 className="text-xl font-black mb-1">Agente creado</h2>
            <p className="text-sm text-rk-ink/60 dark:text-rk-cream/60">
              La contraseña inicial es su teléfono.
            </p>
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-black">Nuevo agente</h2>
              <button
                onClick={onClose}
                className="p-1.5 rounded-full bg-black/5 dark:bg-white/5"
              >
                <X size={18} />
              </button>
            </div>

            <div className="space-y-3">
              <Field
                label="Nombre completo"
                value={name}
                onChange={setName}
                placeholder="Ej. María García"
                autoFocus
              />
              <Field
                label="Email corporativo"
                type="email"
                value={email}
                onChange={setEmail}
                placeholder="maria@inmobiliariapalanca.com"
              />
              <Field
                label="Teléfono (será su contraseña inicial)"
                value={phone}
                onChange={setPhone}
                placeholder="600123456"
                hint="Mínimo 6 caracteres. El agente la cambiará en su primer login."
              />

              <div>
                <label className="text-xs font-semibold uppercase tracking-wider text-rk-ink/50 dark:text-rk-cream/50 block mb-1.5">
                  Rol
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <RoleButton
                    active={role === 'Agente Comercial'}
                    onClick={() => setRole('Agente Comercial')}
                    label="Agente"
                  />
                  <RoleButton
                    active={role === 'Codirector'}
                    onClick={() => setRole('Codirector')}
                    label="Admin"
                  />
                </div>
              </div>

              {groups.length > 0 && role === 'Agente Comercial' && (
                <div>
                  <label className="text-xs font-semibold uppercase tracking-wider text-rk-ink/50 dark:text-rk-cream/50 block mb-1.5">
                    Equipo (opcional)
                  </label>
                  <select
                    value={groupId}
                    onChange={(e) => setGroupId(e.target.value)}
                    className="w-full bg-black/5 dark:bg-white/5 rounded-2xl px-4 py-3 font-semibold focus:outline-none focus:ring-2 focus:ring-rk-orange appearance-none"
                  >
                    <option value="">Sin equipo</option>
                    {groups.map((g) => (
                      <option key={g.id} value={g.id}>
                        {g.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            {error && (
              <div className="bg-red-500/10 text-red-500 text-sm font-semibold text-center p-2.5 rounded-2xl mt-4">
                {error}
              </div>
            )}

            <button
              onClick={handleSubmit}
              disabled={loading}
              className="w-full mt-4 px-5 py-3 bg-rk-orange text-white font-extrabold text-[13.5px] rounded-xl hover:bg-rk-orange-dark transition disabled:opacity-50"
            >
              {loading ? 'Creando…' : 'Crear agente'}
            </button>
          </>
        )}
      </div>
    </div>
  )
}

function Field({ label, value, onChange, placeholder, type = 'text', hint, autoFocus }) {
  return (
    <div>
      <label className="text-[10px] font-extrabold uppercase tracking-[1.2px] text-rk-ink/40 dark:text-rk-cream/40 block mb-1.5">
        {label}
      </label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        autoFocus={autoFocus}
        autoCapitalize={type === 'email' ? 'none' : 'words'}
        autoComplete="off"
        className="w-full bg-black/[0.045] dark:bg-white/[0.06] rounded-xl px-3.5 py-2.5 text-[13.5px] font-semibold outline-none focus:ring-2 focus:ring-rk-orange/40 placeholder:text-rk-ink/30 dark:placeholder:text-rk-cream/30"
      />
      {hint && (
        <p className="text-[10.5px] font-semibold text-rk-ink/40 dark:text-rk-cream/40 mt-1 leading-snug">{hint}</p>
      )}
    </div>
  )
}

function RoleButton({ active, onClick, label }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'rounded-xl py-2.5 font-extrabold text-[13px] transition',
        active
          ? 'bg-rk-ink dark:bg-rk-cream text-rk-cream dark:text-rk-ink'
          : 'bg-black/[0.045] dark:bg-white/[0.06] text-rk-ink/55 dark:text-rk-cream/55'
      )}
    >
      {label}
    </button>
  )
}

// ====================================================================
// Remove agent confirmation modal
// ====================================================================
function RemoveAgentModal({ user, onClose }) {
  const [confirmText, setConfirmText] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [done, setDone] = useState(false)

  const canConfirm = confirmText.trim().toUpperCase() === 'ELIMINAR'

  async function handleRemove() {
    if (!canConfirm) return
    setError(null)
    setLoading(true)
    try {
      await removeAgent({ userId: user.id, groupId: user.groupId })
      setDone(true)
      setTimeout(onClose, 1500)
    } catch (e) {
      setError('No se pudo eliminar. Inténtalo de nuevo.')
      setLoading(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in"
      onClick={loading ? undefined : onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md bg-white dark:bg-rk-ink-card rounded-3xl p-6 shadow-2xl animate-slide-up"
      >
        {done ? (
          <div className="text-center py-2">
            <div className="w-16 h-16 rounded-full bg-green-500/10 text-green-500 flex items-center justify-center mx-auto mb-3">
              <Trash2 size={28} />
            </div>
            <h2 className="text-xl font-black mb-1">Agente eliminado</h2>
            <p className="text-sm text-rk-ink/60 dark:text-rk-cream/60">
              Acuérdate de borrar también la cuenta de Auth en Firebase Console.
            </p>
          </div>
        ) : (
          <>
            <div className="w-14 h-14 rounded-2xl bg-red-500/10 text-red-500 flex items-center justify-center mx-auto mb-3">
              <AlertTriangle size={26} />
            </div>
            <h2 className="text-xl font-black text-center mb-1">
              ¿Eliminar a {user.name}?
            </h2>
            <p className="text-sm text-rk-ink/60 dark:text-rk-cream/60 text-center mb-4">
              Perderá acceso a La Liga inmediatamente. Sus puntos, facturación
              y solicitudes históricas se conservan en la base de datos.
            </p>

            <div className="bg-amber-500/10 text-amber-700 dark:text-amber-400 text-xs p-3 rounded-2xl mb-4 leading-relaxed">
              <strong>Limpieza manual:</strong> después borra también su cuenta
              de Firebase Auth en Firebase Console → Authentication → Users.
            </div>

            <label className="text-xs font-semibold uppercase tracking-wider text-rk-ink/50 dark:text-rk-cream/50 block mb-1.5">
              Escribe "ELIMINAR" para confirmar
            </label>
            <input
              type="text"
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              placeholder="ELIMINAR"
              className="w-full bg-black/5 dark:bg-white/5 rounded-2xl px-4 py-3 font-bold uppercase tracking-wider focus:outline-none focus:ring-2 focus:ring-red-500 mb-4"
              autoFocus
            />

            {error && (
              <div className="bg-red-500/10 text-red-500 text-sm font-semibold text-center p-2.5 rounded-2xl mb-3">
                {error}
              </div>
            )}

            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={onClose}
                disabled={loading}
                className="rounded-2xl bg-black/5 dark:bg-white/5 font-bold py-3 hover:bg-black/10 dark:hover:bg-white/10 transition disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                onClick={handleRemove}
                disabled={!canConfirm || loading}
                className="rounded-2xl bg-red-500 text-white font-bold py-3 hover:bg-red-600 transition disabled:opacity-30 disabled:cursor-not-allowed"
              >
                {loading ? 'Eliminando…' : 'Eliminar'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}


// ====================================================================
// Historial de puntos de un agente (carga bajo demanda)
// --------------------------------------------------------------------
// Se pide solo al abrir, y solo las solicitudes de ESA persona: un
// único filtro (userId), así que no necesita índices en Firestore.
// Usamos getDocs (una sola lectura) en vez de suscripción en tiempo
// real, que aquí no aporta y costaría más.
// ====================================================================
function HistoryDrawer({ user, onClose }) {
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [onlyApproved, setOnlyApproved] = useState(true)

  useEffect(() => {
    let cancelled = false
    async function load() {
      setLoading(true)
      setError(null)
      try {
        const snap = await getDocs(
          query(collection(db, COL.actionRequests), where('userId', '==', user.id))
        )
        if (cancelled) return
        const docs = snap.docs.map((d) => ({ id: d.id, ...d.data() }))
        docs.sort((a, b) => tsMillis(b.createdAt) - tsMillis(a.createdAt))
        setRows(docs)
      } catch (e) {
        console.error('historial error', e)
        if (!cancelled) setError('No se pudo cargar el historial.')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => {
      cancelled = true
    }
  }, [user.id])

  const approved = useMemo(() => rows.filter((r) => r.status === 'approved'), [rows])
  const visible = onlyApproved ? approved : rows

  const breakdown = useMemo(() => {
    const map = {}
    for (const r of approved) {
      const key = r.actionType || 'otros'
      if (!map[key]) map[key] = { count: 0, points: 0 }
      map[key].count++
      map[key].points += r.points || 0
    }
    return Object.entries(map)
      .map(([type, v]) => ({
        type,
        label: ACTION_TYPES[type]?.label ?? type,
        icon: ACTION_TYPES[type]?.icon ?? '✨',
        ...v,
      }))
      .sort((a, b) => b.points - a.points)
  }, [approved])

  const totalPoints = approved.reduce((acc, r) => acc + (r.points || 0), 0)

  return (
    <div
      className="fixed inset-0 z-50 bg-black/45 flex justify-end animate-fade-in"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-[480px] h-full bg-rk-cream dark:bg-rk-ink overflow-y-auto border-l border-black/[0.08] dark:border-white/[0.09]"
      >
        {/* Cabecera */}
        <div className="sticky top-0 z-10 bg-rk-cream/95 dark:bg-rk-ink/95 backdrop-blur border-b border-black/[0.08] dark:border-white/[0.09] px-6 py-5">
          <div className="flex items-start gap-3">
            <Avatar name={user.name} size="md" />
            <div className="flex-1 min-w-0">
              <p className="text-[9.5px] font-extrabold uppercase tracking-[1.6px] text-rk-orange">
                Historial de puntos
              </p>
              <h2 className="text-[19px] font-black truncate mt-0.5 tracking-tight">{user.name}</h2>
              <p className="text-[11.5px] font-semibold text-rk-ink/45 dark:text-rk-cream/45 truncate">
                {user.email}
              </p>
            </div>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full flex items-center justify-center text-rk-ink/50 dark:text-rk-cream/50 hover:bg-black/[0.05] dark:hover:bg-white/[0.06] transition shrink-0"
              aria-label="Cerrar"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        <div className="px-6 py-5">
          {loading ? (
            <p className="text-center text-[12.5px] font-semibold text-rk-ink/45 dark:text-rk-cream/45 py-12">
              Cargando historial…
            </p>
          ) : error ? (
            <div className="bg-red-500/10 text-red-500 rounded-xl px-4 py-3 text-[12.5px] font-bold">
              {error}
            </div>
          ) : (
            <>
              {/* Totales sin cajas */}
              <div className="flex border-y border-black/[0.08] dark:border-white/[0.09]">
                <div className="flex-1 py-3.5 text-center">
                  <div className="text-[22px] font-black text-rk-orange tracking-tight leading-none">
                    {formatPoints(totalPoints)}
                  </div>
                  <div className="text-[8.5px] font-extrabold uppercase tracking-wider text-rk-ink/40 dark:text-rk-cream/40 mt-1">
                    Puntos sumados
                  </div>
                </div>
                <div className="w-px my-2 bg-black/[0.08] dark:bg-white/[0.09]" />
                <div className="flex-1 py-3.5 text-center">
                  <div className="text-[22px] font-black tracking-tight leading-none">
                    {approved.length}
                  </div>
                  <div className="text-[8.5px] font-extrabold uppercase tracking-wider text-rk-ink/40 dark:text-rk-cream/40 mt-1">
                    Acciones aprobadas
                  </div>
                </div>
              </div>

              {/* Desglose por tipo */}
              {breakdown.length > 0 && (
                <div className="mt-6">
                  <h3 className="text-[10px] font-extrabold uppercase tracking-[1.3px] text-rk-ink/40 dark:text-rk-cream/40 mb-2">
                    De dónde vienen sus puntos
                  </h3>
                  <div className="bg-white dark:bg-rk-ink-card rounded-xl border border-black/[0.07] dark:border-white/[0.08] divide-y divide-black/[0.055] dark:divide-white/[0.06] overflow-hidden">
                    {breakdown.map((b) => (
                      <div key={b.type} className="flex items-center gap-3 px-4 py-2.5">
                        <span className="text-[15px]">{b.icon}</span>
                        <span className="flex-1 text-[12.5px] font-bold truncate">{b.label}</span>
                        <span className="text-[11px] font-semibold text-rk-ink/40 dark:text-rk-cream/40 tabular-nums">
                          ×{b.count}
                        </span>
                        <span
                          className={cn(
                            'text-[13px] font-black tabular-nums w-14 text-right',
                            b.points >= 0 ? 'text-rk-orange' : 'text-red-500'
                          )}
                        >
                          {b.points >= 0 ? '+' : ''}
                          {formatPoints(b.points)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Listado detallado */}
              <div className="mt-6">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-[10px] font-extrabold uppercase tracking-[1.3px] text-rk-ink/40 dark:text-rk-cream/40">
                    Movimientos ({visible.length})
                  </h3>
                  <button
                    onClick={() => setOnlyApproved((v) => !v)}
                    className="text-[11px] font-extrabold text-rk-orange"
                  >
                    {onlyApproved ? 'Ver también rechazadas' : 'Solo aprobadas'}
                  </button>
                </div>

                {visible.length === 0 ? (
                  <div className="bg-white dark:bg-rk-ink-card rounded-xl border border-black/[0.07] dark:border-white/[0.08] py-10 text-center text-[12.5px] font-semibold text-rk-ink/40 dark:text-rk-cream/40">
                    Todavía no hay movimientos.
                  </div>
                ) : (
                  <div className="bg-white dark:bg-rk-ink-card rounded-xl border border-black/[0.07] dark:border-white/[0.08] divide-y divide-black/[0.055] dark:divide-white/[0.06] overflow-hidden">
                    {visible.map((r) => (
                      <MovementRow key={r.id} row={r} />
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

function MovementRow({ row }) {
  const isApproved = row.status === 'approved'
  const isRejected = row.status === 'rejected'
  const negative = (row.points || 0) < 0
  const icon = ACTION_TYPES[row.actionType]?.icon ?? '✨'

  return (
    <div
      className={cn(
        'flex items-center gap-3 px-4 py-2.5',
        isRejected && 'opacity-55'
      )}
    >
      <span className="text-[15px] shrink-0">{icon}</span>
      <div className="flex-1 min-w-0">
        <div className="text-[12.5px] font-bold truncate">{row.actionLabel}</div>
        <div className="text-[10.5px] font-semibold text-rk-ink/40 dark:text-rk-cream/40">
          {relativeDate(row.createdAt)}
          {isRejected && ' · rechazada'}
          {!isApproved && !isRejected && ' · pendiente'}
        </div>
        {row.notes && (
          <div className="text-[10.5px] font-medium text-rk-ink/55 dark:text-rk-cream/55 mt-0.5 line-clamp-2">
            {row.notes}
          </div>
        )}
      </div>
      <div
        className={cn(
          'text-[13px] font-black tabular-nums shrink-0 flex items-center gap-1',
          isRejected
            ? 'text-rk-ink/35 dark:text-rk-cream/35 line-through'
            : negative
            ? 'text-red-500'
            : 'text-rk-orange'
        )}
      >
        {isApproved && (negative ? <TrendingDown size={12} /> : <TrendingUp size={12} />)}
        {negative ? '' : '+'}
        {row.points}
      </div>
    </div>
  )
}

// Timestamp de Firestore (o fecha) a milisegundos
function tsMillis(value) {
  if (!value) return 0
  if (typeof value.toMillis === 'function') return value.toMillis()
  return new Date(value).getTime()
}
