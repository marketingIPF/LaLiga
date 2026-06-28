import { useState, useMemo } from 'react'
import { Link, Navigate } from 'react-router-dom'
import {
  ArrowLeft, UserPlus, Search, Trash2, X, AlertTriangle, Shield,
} from 'lucide-react'
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
            GESTIÓN
          </p>
          <h1 className="text-2xl font-black tracking-tight mt-1">Agentes</h1>
        </div>

        <button
          onClick={() => setShowAdd(true)}
          className="ml-auto flex items-center gap-2 px-5 py-2.5 bg-rk-orange text-white font-extrabold text-sm rounded-xl shadow-orange-glow-sm hover:bg-rk-orange-dark transition"
        >
          <UserPlus size={16} /> Nuevo agente
        </button>
      </header>

      {/* KPIs */}
      <div className="grid grid-cols-3 gap-3">
        <MiniKpi label="AGENTES" value={totalAgents} />
        <MiniKpi label="ADMINS" value={totalAdmins} />
        <MiniKpi label="EN UN EQUIPO" value={`${inTeams} / ${totalAgents}`} />
      </div>

      {/* Search */}
      <div className="relative">
        <Search
          size={16}
          className="absolute left-4 top-1/2 -translate-y-1/2 text-rk-ink/40 dark:text-rk-cream/40"
        />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar por nombre o email…"
          className="w-full pl-11 pr-4 py-3 bg-white dark:bg-rk-ink-card border border-black/[0.04] dark:border-white/[0.05] rounded-2xl font-semibold focus:outline-none focus:ring-2 focus:ring-rk-orange"
        />
      </div>

      {/* Tabla */}
      <div className="bg-white dark:bg-rk-ink-card rounded-2xl border border-black/[0.04] dark:border-white/[0.05] shadow-soft overflow-hidden">
        {/* Header row */}
        <div className="grid grid-cols-[44px_1.4fr_2fr_0.9fr_1.2fr_0.7fr_56px] gap-3 px-5 py-3 bg-black/[0.02] dark:bg-white/[0.02] border-b border-black/[0.04] dark:border-white/[0.05] text-[10px] font-extrabold tracking-[2px] text-rk-ink/50 dark:text-rk-cream/50">
          <div />
          <div>NOMBRE</div>
          <div>EMAIL</div>
          <div>ROL</div>
          <div>EQUIPO</div>
          <div className="text-right">PUNTOS</div>
          <div />
        </div>

        {filtered.length === 0 ? (
          <div className="py-12 text-center text-sm text-rk-ink/50 dark:text-rk-cream/50">
            {search
              ? 'Nadie coincide con esa búsqueda.'
              : 'No hay usuarios.'}
          </div>
        ) : (
          <div className="divide-y divide-black/[0.04] dark:divide-white/[0.05]">
            {filtered.map((u) => {
              const group = u.groupId ? groupById[u.groupId] : null
              const isAdmin_ = isAdminRole(u.role)
              const isSelf = u.id === firebaseUser?.uid
              return (
                <div
                  key={u.id}
                  className="grid grid-cols-[44px_1.4fr_2fr_0.9fr_1.2fr_0.7fr_56px] gap-3 px-5 py-3 items-center hover:bg-black/[0.015] dark:hover:bg-white/[0.015]"
                >
                  <Avatar name={u.name} size="sm" />
                  <div className="font-bold text-sm truncate">{u.name}</div>
                  <div className="text-xs text-rk-ink/70 dark:text-rk-cream/70 truncate">
                    {u.email}
                  </div>
                  <div>
                    {isAdmin_ ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-rk-orange/10 text-rk-orange text-[10px] font-extrabold">
                        <Shield size={10} /> Admin
                      </span>
                    ) : (
                      <span className="text-[11px] font-bold text-rk-ink/60 dark:text-rk-cream/60">
                        Agente
                      </span>
                    )}
                  </div>
                  <div className="text-xs flex items-center gap-2 min-w-0">
                    {group ? (
                      <>
                        <div
                          className="w-2.5 h-2.5 rounded-sm shrink-0"
                          style={{ backgroundColor: group.color }}
                        />
                        <span className="font-bold truncate">
                          {group.name}
                        </span>
                      </>
                    ) : (
                      <span className="text-rk-ink/40 dark:text-rk-cream/40">
                        Sin equipo
                      </span>
                    )}
                  </div>
                  <div className="text-right text-sm font-extrabold tabular-nums">
                    {isAdmin_ ? '—' : formatPoints(u.points || 0)}
                  </div>
                  <button
                    onClick={() => setRemoving(u)}
                    disabled={isSelf}
                    className="w-9 h-9 rounded-lg bg-red-500/10 text-red-500 hover:bg-red-500/15 transition flex items-center justify-center disabled:opacity-30 disabled:cursor-not-allowed"
                    title={
                      isSelf
                        ? 'No puedes borrarte a ti mismo'
                        : 'Eliminar usuario'
                    }
                  >
                    <Trash2 size={15} />
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
    </div>
  )
}

// ====================================================================
// Mini KPI card
// ====================================================================
function MiniKpi({ label, value }) {
  return (
    <div className="p-4 rounded-2xl bg-white dark:bg-rk-ink-card border border-black/[0.04] dark:border-white/[0.05] shadow-soft">
      <div className="text-[9px] font-extrabold tracking-[2px] text-rk-ink/60 dark:text-rk-cream/60">
        {label}
      </div>
      <div className="text-2xl font-black mt-1 -tracking-wide">{value}</div>
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
              className="w-full mt-4 px-5 py-3 bg-rk-orange text-white font-extrabold rounded-xl shadow-orange-glow-sm hover:bg-rk-orange-dark transition disabled:opacity-50"
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
      <label className="text-xs font-semibold uppercase tracking-wider text-rk-ink/50 dark:text-rk-cream/50 block mb-1.5">
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
        className="w-full bg-black/5 dark:bg-white/5 rounded-2xl px-4 py-3 font-semibold focus:outline-none focus:ring-2 focus:ring-rk-orange"
      />
      {hint && (
        <p className="text-xs text-rk-ink/40 dark:text-rk-cream/40 mt-1">{hint}</p>
      )}
    </div>
  )
}

function RoleButton({ active, onClick, label }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'rounded-2xl py-3 font-extrabold text-sm transition',
        active
          ? 'bg-rk-orange text-white shadow-orange-glow-sm'
          : 'bg-black/5 dark:bg-white/5 text-rk-ink dark:text-rk-cream'
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
