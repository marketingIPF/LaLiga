import { useState, useMemo } from 'react'
import {
  UserPlus,
  Search,
  Trash2,
  X,
  AlertTriangle,
  Shield,
} from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { useUsers } from '../hooks/useUsers'
import { useGroups } from '../hooks/useGroups'
import { isAdminRole } from '../data/seedUsers'
import { cn } from '../lib/utils'
import { createAgent, removeAgent } from '../lib/userAdmin'
import Header from '../components/layout/Header'
import Avatar from '../components/ui/Avatar'

export default function GestionAgentes() {
  const { isAdmin, firebaseUser } = useAuth()
  const { users } = useUsers()
  const { groups } = useGroups()
  const [search, setSearch] = useState('')
  const [showAdd, setShowAdd] = useState(false)
  const [removing, setRemoving] = useState(null)

  if (!isAdmin) return null

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

  const totalAgents = users.filter((u) => !isAdminRole(u.role)).length
  const totalAdmins = users.filter((u) => isAdminRole(u.role)).length

  return (
    <div className="animate-fade-in pb-6">
      <Header title="Agentes" subtitle="Gestión Admin" />

      {/* Totales en línea */}
      <div className="flex border-y border-black/[0.075] dark:border-white/[0.09] mt-1">
        <div className="flex-1 py-3.5 text-center">
          <div className="text-[22px] font-black tracking-tight leading-none">
            {totalAgents}
          </div>
          <div className="text-[8.5px] font-extrabold uppercase tracking-wider text-rk-ink/40 dark:text-rk-cream/40 mt-1">
            Agentes
          </div>
        </div>
        <div className="w-px my-2 bg-black/[0.075] dark:bg-white/[0.09]" />
        <div className="flex-1 py-3.5 text-center">
          <div className="text-[22px] font-black tracking-tight leading-none">
            {totalAdmins}
          </div>
          <div className="text-[8.5px] font-extrabold uppercase tracking-wider text-rk-ink/40 dark:text-rk-cream/40 mt-1">
            Admins
          </div>
        </div>
      </div>

      {/* Buscador + añadir */}
      <div className="flex items-center gap-2 mt-4">
        <div className="relative flex-1">
          <Search
            size={14}
            className="absolute left-3.5 top-1/2 -translate-y-1/2 text-rk-ink/35 dark:text-rk-cream/35"
          />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por nombre o email…"
            className="w-full bg-black/[0.045] dark:bg-white/[0.06] rounded-xl pl-9 pr-3 py-2.5 text-[13px] font-semibold outline-none focus:ring-2 focus:ring-rk-orange/35 placeholder:text-rk-ink/35 dark:placeholder:text-rk-cream/35"
          />
        </div>
        <button
          onClick={() => setShowAdd(true)}
          className="w-10 h-10 rounded-xl bg-rk-orange text-white flex items-center justify-center shrink-0 active:scale-95 transition-transform"
          aria-label="Añadir agente"
        >
          <UserPlus size={17} />
        </button>
      </div>

      {/* Lista */}
      {filtered.length === 0 ? (
        <div className="text-center py-14 text-[12.5px] font-semibold text-rk-ink/45 dark:text-rk-cream/45">
          No hay resultados
        </div>
      ) : (
        <div className="mt-2">
          <div className="h-px bg-black/[0.075] dark:bg-white/[0.09]" />
          {filtered.map((u, i) => {
            const isSelf = u.id === firebaseUser?.uid
            const group = u.groupId ? groupById[u.groupId] : null
            return (
              <div
                key={u.id}
                className={cn(
                  'flex items-center gap-3 py-3',
                  i < filtered.length - 1 &&
                    'border-b border-black/[0.075] dark:border-white/[0.09]'
                )}
              >
                <Avatar name={u.name} size="sm" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="font-extrabold text-[13px] truncate">
                      {u.name}
                    </span>
                    {isAdminRole(u.role) && (
                      <span className="shrink-0 text-[8.5px] font-black uppercase text-rk-orange flex items-center gap-0.5">
                        <Shield size={9} /> Admin
                      </span>
                    )}
                  </div>
                  <div className="text-[11px] font-semibold text-rk-ink/45 dark:text-rk-cream/45 truncate">
                    {u.email}
                  </div>
                  {group && (
                    <div className="text-[10.5px] font-semibold text-rk-ink/35 dark:text-rk-cream/35 flex items-center gap-1.5 mt-0.5">
                      <span
                        className="w-[7px] h-[7px] rounded-full"
                        style={{ backgroundColor: group.color }}
                      />
                      {group.name}
                    </div>
                  )}
                </div>
                {!isSelf && (
                  <button
                    onClick={() => setRemoving(u)}
                    className="w-8 h-8 rounded-lg flex items-center justify-center text-red-500/70 hover:bg-red-500/[0.08] hover:text-red-500 transition shrink-0"
                    aria-label="Eliminar"
                  >
                    <Trash2 size={15} />
                  </button>
                )}
              </div>
            )
          })}
        </div>
      )}

      {showAdd && (
        <AddAgentModal groups={groups} onClose={() => setShowAdd(false)} />
      )}
      {removing && (
        <RemoveAgentModal user={removing} onClose={() => setRemoving(null)} />
      )}
    </div>
  )
}

// ============================================================
// Modal: Añadir agente
// ============================================================
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
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-4 animate-fade-in"
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
              className="btn-primary w-full mt-4 disabled:opacity-50"
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
      className={`rounded-2xl py-3 font-bold text-sm transition ${
        active
          ? 'bg-rk-orange text-white'
          : 'bg-black/5 dark:bg-white/5 text-rk-ink/70 dark:text-rk-cream/70'
      }`}
    >
      {label}
    </button>
  )
}

// ============================================================
// Modal: Eliminar agente
// ============================================================
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
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-4 animate-fade-in"
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
              Perderá acceso a La Liga inmediatamente. Sus puntos, facturación y solicitudes históricas se conservan en la base de datos.
            </p>

            <div className="bg-amber-500/10 text-amber-700 dark:text-amber-400 text-xs p-3 rounded-2xl mb-4 leading-relaxed">
              <strong>Limpieza manual:</strong> después borra también su cuenta de Firebase Auth en Firebase Console → Authentication → Users.
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
                className="btn-secondary disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                onClick={handleRemove}
                disabled={!canConfirm || loading}
                className="rounded-2xl bg-red-500 text-white font-bold py-3 active:scale-[0.98] transition-transform disabled:opacity-30 disabled:cursor-not-allowed"
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
