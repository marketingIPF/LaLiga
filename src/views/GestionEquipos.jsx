import { useState, useMemo } from 'react'
import {
  Plus,
  ChevronLeft,
  X,
  Trash2,
  UserPlus,
  Users as UsersIcon,
  Check,
} from 'lucide-react'
import {
  collection,
  addDoc,
  doc,
  updateDoc,
  deleteDoc,
  serverTimestamp,
  writeBatch,
  increment,
} from 'firebase/firestore'
import { db, COL } from '../lib/firebase'
import { useAuth } from '../context/AuthContext'
import { useUsers } from '../hooks/useUsers'
import { useGroups } from '../hooks/useGroups'
import { GROUP_COLOR_PALETTE, isCompetitor } from '../data/seedUsers'
import { formatPoints, cn } from '../lib/utils'
import { notifyTeamAssignment } from '../lib/notifications'
import Header from '../components/layout/Header'
import Avatar from '../components/ui/Avatar'

export default function GestionEquipos() {
  const { isAdmin } = useAuth()
  const { users } = useUsers()
  const { groups } = useGroups()
  const [selectedGroupId, setSelectedGroupId] = useState(null)
  const [showCreate, setShowCreate] = useState(false)

  if (!isAdmin) return null

  const agents = users.filter(isCompetitor)
  const unassigned = agents.filter((a) => !a.groupId)

  if (selectedGroupId) {
    const group = groups.find((g) => g.id === selectedGroupId)
    if (!group) {
      setSelectedGroupId(null)
      return null
    }
    return (
      <DetalleEquipo
        group={group}
        agents={agents}
        onBack={() => setSelectedGroupId(null)}
      />
    )
  }

  return (
    <div className="animate-fade-in pb-6">
      <Header title="Equipos" subtitle="Gestión Admin" />

      <div className="flex items-center justify-between mt-1">
        <p className="text-[12.5px] font-semibold text-rk-ink/40 dark:text-rk-cream/40">
          {groups.length} {groups.length === 1 ? 'equipo' : 'equipos'}
        </p>
        <button
          onClick={() => setShowCreate(true)}
          className="w-9 h-9 rounded-xl bg-rk-orange text-white flex items-center justify-center active:scale-95 transition-transform"
          aria-label="Crear equipo"
        >
          <Plus size={17} />
        </button>
      </div>

      {/* Lista de equipos */}
      {groups.length === 0 ? (
        <div className="text-center py-14">
          <UsersIcon size={28} className="mx-auto text-rk-ink/25 dark:text-rk-cream/25 mb-2.5" />
          <p className="text-[13px] font-bold">Todavía no hay equipos</p>
          <p className="text-[11.5px] font-semibold text-rk-ink/40 dark:text-rk-cream/40 mt-1">
            Crea el primero y asigna agentes
          </p>
        </div>
      ) : (
        <div className="mt-3">
          <div className="h-px bg-black/[0.075] dark:bg-white/[0.09]" />
          {groups.map((g, i) => {
            const memberCount = agents.filter((a) => a.groupId === g.id).length
            return (
              <button
                key={g.id}
                onClick={() => setSelectedGroupId(g.id)}
                className={cn(
                  'w-full flex items-center gap-3 py-3 text-left active:opacity-70 transition-opacity',
                  i < groups.length - 1 &&
                    'border-b border-black/[0.075] dark:border-white/[0.09]'
                )}
              >
                <div
                  className="w-9 h-9 rounded-xl shrink-0"
                  style={{ backgroundColor: g.color }}
                />
                <div className="flex-1 min-w-0">
                  <div className="font-extrabold text-[13.5px] truncate">{g.name}</div>
                  <div className="text-[11px] font-semibold text-rk-ink/45 dark:text-rk-cream/45">
                    {memberCount} {memberCount === 1 ? 'miembro' : 'miembros'} · {formatPoints(g.totalPoints ?? 0)} pts
                  </div>
                </div>
                <ChevronLeft size={16} className="rotate-180 text-rk-ink/25 dark:text-rk-cream/25 shrink-0" />
              </button>
            )
          })}
        </div>
      )}

      {/* Sin equipo */}
      {unassigned.length > 0 && (
        <section className="mt-6">
          <h3 className="text-[10px] font-extrabold uppercase tracking-[1.3px] text-rk-ink/40 dark:text-rk-cream/40 mb-2.5">
            Agentes sin equipo ({unassigned.length})
          </h3>
          <div className="flex flex-wrap gap-1.5">
            {unassigned.map((a) => (
              <div
                key={a.id}
                className="px-2.5 py-1 rounded-full bg-black/[0.045] dark:bg-white/[0.06] text-[11.5px] font-bold"
              >
                {a.name}
              </div>
            ))}
          </div>
        </section>
      )}

      {showCreate && <CrearEquipoModal onClose={() => setShowCreate(false)} />}
    </div>
  )
}

// ============================================================
// Modal: Crear equipo
// ============================================================
function CrearEquipoModal({ onClose }) {
  const [name, setName] = useState('')
  const [color, setColor] = useState(GROUP_COLOR_PALETTE[0])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  async function handleCreate() {
    setError(null)
    if (name.trim().length < 2) {
      setError('El nombre del equipo es demasiado corto.')
      return
    }
    setLoading(true)
    try {
      await addDoc(collection(db, COL.groups), {
        name: name.trim(),
        color,
        totalPoints: 0,
        memberCount: 0,
        createdAt: serverTimestamp(),
      })
      onClose()
    } catch (e) {
      console.error(e)
      setError('No se pudo crear el equipo. Inténtalo de nuevo.')
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-4 animate-fade-in" onClick={onClose}>
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md bg-white dark:bg-rk-ink-card rounded-3xl p-6 shadow-2xl animate-slide-up"
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-black">Nuevo equipo</h2>
          <button onClick={onClose} className="p-1.5 rounded-full bg-black/5 dark:bg-white/5">
            <X size={18} />
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="text-[10px] font-extrabold uppercase tracking-[1.2px] text-rk-ink/40 dark:text-rk-cream/40 block mb-1.5">
              Nombre
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ej. Equipo Alfa"
              maxLength={32}
              className="w-full bg-black/[0.045] dark:bg-white/[0.06] rounded-xl px-3.5 py-2.5 text-[13.5px] font-semibold outline-none focus:ring-2 focus:ring-rk-orange/40 placeholder:text-rk-ink/30 dark:placeholder:text-rk-cream/30"
              autoFocus
            />
          </div>

          <div>
            <label className="text-[10px] font-extrabold uppercase tracking-[1.2px] text-rk-ink/40 dark:text-rk-cream/40 block mb-2">
              Color
            </label>
            <div className="flex flex-wrap gap-2">
              {GROUP_COLOR_PALETTE.map((c) => (
                <button
                  key={c}
                  onClick={() => setColor(c)}
                  className={`w-10 h-10 rounded-xl transition-transform ${color === c ? 'ring-2 ring-offset-2 ring-rk-orange dark:ring-offset-rk-ink-card scale-110' : ''}`}
                  style={{ backgroundColor: c }}
                  aria-label={`Color ${c}`}
                />
              ))}
            </div>
          </div>

          {error && (
            <div className="bg-red-500/10 text-red-500 text-sm font-semibold text-center p-2.5 rounded-2xl">
              {error}
            </div>
          )}

          <button onClick={handleCreate} disabled={loading} className="btn-primary w-full disabled:opacity-50">
            {loading ? 'Creando…' : 'Crear equipo'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ============================================================
// Vista: Detalle de un equipo
// ============================================================
function DetalleEquipo({ group, agents, onBack }) {
  const [showPicker, setShowPicker] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [editName, setEditName] = useState(false)
  const [tempName, setTempName] = useState(group.name)

  const members = useMemo(
    () => agents.filter((a) => a.groupId === group.id),
    [agents, group.id]
  )
  const memberCount = members.length
  const memberPoints = members.reduce((acc, m) => acc + (m.points ?? 0), 0)

  async function handleRenameSave() {
    const trimmed = tempName.trim()
    if (trimmed.length < 2 || trimmed === group.name) {
      setEditName(false)
      setTempName(group.name)
      return
    }
    await updateDoc(doc(db, COL.groups, group.id), { name: trimmed })
    setEditName(false)
  }

  async function handleChangeColor(newColor) {
    if (newColor === group.color) return
    await updateDoc(doc(db, COL.groups, group.id), { color: newColor })
  }

  async function handleRemoveMember(agent) {
    const batch = writeBatch(db)
    batch.update(doc(db, COL.users, agent.id), { groupId: null })
    batch.update(doc(db, COL.groups, group.id), {
      memberCount: increment(-1),
    })
    await batch.commit()
  }

  async function handleDelete() {
    const batch = writeBatch(db)
    for (const m of members) {
      batch.update(doc(db, COL.users, m.id), { groupId: null })
    }
    batch.delete(doc(db, COL.groups, group.id))
    await batch.commit()
    onBack()
  }

  return (
    <div className="animate-fade-in pb-6">
      {/* Volver */}
      <button
        onClick={onBack}
        className="flex items-center gap-1 -ml-1.5 py-3 text-[11px] font-extrabold uppercase tracking-[1.2px] text-rk-ink/45 dark:text-rk-cream/45"
      >
        <ChevronLeft size={15} /> Equipos
      </button>

      {/* Cabecera de grupo */}
      <div className="flex flex-col items-center text-center pt-2 pb-1">
        <div
          className="w-16 h-16 rounded-2xl mb-3"
          style={{ backgroundColor: group.color }}
        />
        {editName ? (
          <div className="flex items-center gap-2 max-w-xs">
            <input
              type="text"
              value={tempName}
              onChange={(e) => setTempName(e.target.value)}
              maxLength={32}
              className="flex-1 bg-black/[0.045] dark:bg-white/[0.06] rounded-xl px-3 py-2 font-black text-center text-[15px] outline-none focus:ring-2 focus:ring-rk-orange/40"
              autoFocus
              onKeyDown={(e) => e.key === 'Enter' && handleRenameSave()}
            />
            <button onClick={handleRenameSave} className="p-2 rounded-xl bg-rk-orange text-white">
              <Check size={16} />
            </button>
          </div>
        ) : (
          <button
            onClick={() => { setTempName(group.name); setEditName(true) }}
            className="text-[19px] font-black tracking-tight"
          >
            {group.name}
          </button>
        )}
        <p className="text-[11.5px] font-semibold text-rk-ink/45 dark:text-rk-cream/45 mt-2">
          {memberCount} {memberCount === 1 ? 'miembro' : 'miembros'} · {formatPoints(memberPoints)} pts actuales · {formatPoints(group.totalPoints ?? 0)} pts históricos
        </p>
      </div>

      {/* Cambiar color */}
      <section className="mt-6">
        <h3 className="text-[10px] font-extrabold uppercase tracking-[1.3px] text-rk-ink/40 dark:text-rk-cream/40 mb-2.5">
          Color
        </h3>
        <div className="flex flex-wrap gap-2 justify-center py-1">
          {GROUP_COLOR_PALETTE.map((c) => (
            <button
              key={c}
              onClick={() => handleChangeColor(c)}
              className={cn(
                'w-9 h-9 rounded-xl transition-transform',
                group.color === c && 'ring-2 ring-offset-2 ring-rk-orange dark:ring-offset-rk-ink scale-110'
              )}
              style={{ backgroundColor: c }}
            />
          ))}
        </div>
      </section>

      {/* Miembros */}
      <section className="mt-6">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-[10px] font-extrabold uppercase tracking-[1.3px] text-rk-ink/40 dark:text-rk-cream/40">
            Miembros ({memberCount})
          </h3>
          <button
            onClick={() => setShowPicker(true)}
            className="text-[11px] font-extrabold text-rk-orange flex items-center gap-1"
          >
            <UserPlus size={12} /> Añadir
          </button>
        </div>

        {members.length === 0 ? (
          <div className="text-center py-8 text-[12.5px] font-semibold text-rk-ink/40 dark:text-rk-cream/40">
            Aún no hay miembros en este equipo
          </div>
        ) : (
          <div>
            <div className="h-px bg-black/[0.075] dark:bg-white/[0.09]" />
            {members.map((m, i) => (
              <div
                key={m.id}
                className={cn(
                  'flex items-center gap-3 py-2.5',
                  i < members.length - 1 &&
                    'border-b border-black/[0.075] dark:border-white/[0.09]'
                )}
              >
                <Avatar name={m.name} size="sm" />
                <div className="flex-1 min-w-0">
                  <div className="font-bold text-[12.5px] truncate">{m.name}</div>
                  <div className="text-[10.5px] font-semibold text-rk-ink/40 dark:text-rk-cream/40">
                    {formatPoints(m.points ?? 0)} pts
                  </div>
                </div>
                <button
                  onClick={() => handleRemoveMember(m)}
                  className="w-7 h-7 rounded-lg flex items-center justify-center text-red-500/70 hover:bg-red-500/[0.08] hover:text-red-500 transition"
                  aria-label="Quitar del equipo"
                >
                  <X size={13} />
                </button>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Eliminar equipo */}
      <div className="mt-8 pt-5 border-t border-black/[0.075] dark:border-white/[0.09]">
        {confirmDelete ? (
          <div className="space-y-3">
            <p className="text-[13px] font-bold text-center">
              ¿Eliminar "{group.name}"?
            </p>
            <p className="text-[11.5px] font-semibold text-rk-ink/45 dark:text-rk-cream/45 text-center leading-relaxed">
              Los {memberCount} {memberCount === 1 ? 'miembro' : 'miembros'} quedará{memberCount === 1 ? '' : 'n'} sin equipo. Los puntos individuales no se pierden.
            </p>
            <div className="grid grid-cols-2 gap-2">
              <button onClick={() => setConfirmDelete(false)} className="btn-secondary">Cancelar</button>
              <button
                onClick={handleDelete}
                className="rounded-2xl bg-red-500 text-white font-bold py-3 active:scale-[0.98] transition-transform"
              >
                Eliminar
              </button>
            </div>
          </div>
        ) : (
          <button
            onClick={() => setConfirmDelete(true)}
            className="w-full flex items-center justify-center gap-2 py-2.5 text-[12.5px] font-bold text-red-500/80 active:opacity-60 transition-opacity"
          >
            <Trash2 size={14} /> Eliminar equipo
          </button>
        )}
      </div>

      {showPicker && (
        <AsignarAgenteModal
          group={group}
          agents={agents}
          onClose={() => setShowPicker(false)}
        />
      )}
    </div>
  )
}

function AsignarAgenteModal({ group, agents, onClose }) {
  const [search, setSearch] = useState('')
  const [busy, setBusy] = useState(null)

  // Candidatos = todos los agentes que no están en este grupo
  const candidates = agents
    .filter((a) => a.groupId !== group.id)
    .filter((a) => a.name.toLowerCase().includes(search.toLowerCase()))

  async function handleAssign(agent) {
    setBusy(agent.id)
    try {
      const batch = writeBatch(db)
      const oldGroupId = agent.groupId
      batch.update(doc(db, COL.users, agent.id), { groupId: group.id })
      batch.update(doc(db, COL.groups, group.id), { memberCount: increment(1) })
      if (oldGroupId) {
        batch.update(doc(db, COL.groups, oldGroupId), { memberCount: increment(-1) })
      }
      await batch.commit()

      // Notificación al agente (best-effort)
      notifyTeamAssignment({
        userId: agent.id,
        teamName: group.name,
      }).catch((e) => console.error('notifyTeamAssignment failed', e))
    } finally {
      setBusy(null)
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-4 animate-fade-in" onClick={onClose}>
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md bg-white dark:bg-rk-ink-card rounded-3xl p-6 shadow-2xl animate-slide-up max-h-[80vh] flex flex-col"
      >
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-xl font-black">Añadir a {group.name}</h2>
          <button onClick={onClose} className="p-1.5 rounded-full bg-black/5 dark:bg-white/5">
            <X size={18} />
          </button>
        </div>

        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar agente..."
          className="w-full bg-black/5 dark:bg-white/5 rounded-2xl px-4 py-3 font-semibold focus:outline-none focus:ring-2 focus:ring-rk-orange mb-3"
        />

        <div className="flex-1 overflow-y-auto space-y-1.5 -mx-2 px-2">
          {candidates.length === 0 ? (
            <div className="text-center py-6 text-sm text-rk-ink/60 dark:text-rk-cream/60">
              No hay agentes disponibles
            </div>
          ) : (
            candidates.map((a) => (
              <button
                key={a.id}
                onClick={() => handleAssign(a)}
                disabled={busy === a.id}
                className="w-full flex items-center gap-3 p-2.5 rounded-xl hover:bg-rk-orange/[0.07] active:scale-[0.98] transition-all disabled:opacity-50"
              >
                <Avatar name={a.name} size="sm" />
                <div className="flex-1 text-left min-w-0">
                  <div className="font-bold text-[12.5px] truncate">{a.name}</div>
                  {a.groupId && (
                    <div className="text-[10.5px] font-semibold text-rk-ink/40 dark:text-rk-cream/40">
                      Actualmente en otro equipo
                    </div>
                  )}
                </div>
                <UserPlus size={15} className="text-rk-orange shrink-0" />
              </button>
            ))
          )}
        </div>
      </div>
    </div>
  )
}
