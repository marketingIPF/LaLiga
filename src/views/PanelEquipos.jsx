import { useState, useMemo } from 'react'
import { Link, Navigate } from 'react-router-dom'
import {
  ArrowLeft, Plus, X, Trash2, AlertTriangle, UserPlus,
  Pencil, Check, Users as UsersIcon, Award,
} from 'lucide-react'
import {
  collection, addDoc, doc, updateDoc, deleteDoc,
  serverTimestamp, writeBatch, increment,
} from 'firebase/firestore'
import { db, COL } from '../lib/firebase'
import { useAuth } from '../context/AuthContext'
import { useUsers } from '../hooks/useUsers'
import { useGroups } from '../hooks/useGroups'
import { GROUP_COLOR_PALETTE, isCompetitor } from '../data/seedUsers'
import { formatPoints, cn } from '../lib/utils'
import { notifyTeamAssignment } from '../lib/notifications'
import Avatar from '../components/ui/Avatar'

// ====================================================================
// PANEL · EQUIPOS (desktop)
// ====================================================================
export default function PanelEquipos() {
  const { isAdmin } = useAuth()
  const { users } = useUsers()
  const { groups } = useGroups()
  const [selectedId, setSelectedId] = useState(null)
  const [showCreate, setShowCreate] = useState(false)

  const agents = useMemo(
    () => users.filter(isCompetitor),
    [users]
  )

  const unassigned = useMemo(
    () => agents.filter((a) => !a.groupId),
    [agents]
  )

  const sortedGroups = useMemo(
    () => [...groups].sort(
      (a, b) => (b.totalPoints || 0) - (a.totalPoints || 0)
    ),
    [groups]
  )

  // Si el equipo seleccionado ya no existe (lo acaban de borrar), limpiar.
  const selectedGroup = selectedId
    ? sortedGroups.find((g) => g.id === selectedId) ?? null
    : null

  if (!isAdmin) return <Navigate to="/" replace />

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
          <h1 className="text-2xl font-black tracking-tight mt-1">Equipos</h1>
        </div>

        <button
          onClick={() => setShowCreate(true)}
          className="ml-auto flex items-center gap-2 px-5 py-2.5 bg-rk-orange text-white font-extrabold text-sm rounded-xl shadow-orange-glow-sm hover:bg-rk-orange-dark transition"
        >
          <Plus size={16} /> Crear equipo
        </button>
      </header>

      {/* MAIN GRID */}
      <div className="grid grid-cols-[1fr_1.6fr] gap-4">
        {/* COLUMNA IZQUIERDA — lista de equipos */}
        <div className="space-y-4">
          <SectionCard tag="LIGA" title={`Equipos (${sortedGroups.length})`}>
            {sortedGroups.length === 0 ? (
              <div className="text-center py-8">
                <UsersIcon
                  size={28}
                  className="mx-auto text-rk-ink/30 dark:text-rk-cream/30 mb-2"
                />
                <p className="text-sm font-semibold text-rk-ink/60 dark:text-rk-cream/60">
                  Todavía no hay equipos
                </p>
                <p className="text-xs text-rk-ink/40 dark:text-rk-cream/40 mt-1">
                  Crea el primero con el botón de arriba
                </p>
              </div>
            ) : (
              <div className="space-y-1.5">
                {sortedGroups.map((g) => {
                  const memberCount = agents.filter(
                    (a) => a.groupId === g.id
                  ).length
                  const isSelected = selectedId === g.id
                  return (
                    <button
                      key={g.id}
                      onClick={() => setSelectedId(g.id)}
                      className={cn(
                        'w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition',
                        isSelected
                          ? 'bg-rk-orange/10 ring-1 ring-rk-orange/30'
                          : 'bg-black/[0.02] dark:bg-white/[0.03] hover:bg-black/[0.04] dark:hover:bg-white/[0.05]'
                      )}
                    >
                      <div
                        className="w-8 h-8 rounded-lg shrink-0"
                        style={{ backgroundColor: g.color }}
                      />
                      <div className="flex-1 min-w-0">
                        <div className="font-extrabold text-sm truncate">
                          {g.name}
                        </div>
                        <div className="text-[11px] text-rk-ink/60 dark:text-rk-cream/60">
                          {memberCount}{' '}
                          {memberCount === 1 ? 'miembro' : 'miembros'}
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <div className="font-black text-sm tabular-nums">
                          {formatPoints(g.totalPoints || 0)}
                        </div>
                        <div className="text-[10px] text-rk-ink/50 dark:text-rk-cream/50">
                          pts
                        </div>
                      </div>
                    </button>
                  )
                })}
              </div>
            )}
          </SectionCard>

          {/* Sin equipo */}
          {unassigned.length > 0 && (
            <SectionCard
              tag="SIN ASIGNAR"
              title={`Agentes sin equipo (${unassigned.length})`}
            >
              <div className="flex flex-wrap gap-1.5">
                {unassigned.map((a) => (
                  <div
                    key={a.id}
                    className="px-2.5 py-1 rounded-md bg-black/[0.04] dark:bg-white/[0.05] text-[11px] font-bold"
                  >
                    {a.name}
                  </div>
                ))}
              </div>
            </SectionCard>
          )}
        </div>

        {/* COLUMNA DERECHA — detalle del equipo seleccionado */}
        <div>
          {selectedGroup ? (
            <TeamDetail
              key={selectedGroup.id}
              group={selectedGroup}
              agents={agents}
              onDeleted={() => setSelectedId(null)}
            />
          ) : (
            <EmptyDetail />
          )}
        </div>
      </div>

      {showCreate && (
        <CrearEquipoModal onClose={() => setShowCreate(false)} />
      )}
    </div>
  )
}

// ====================================================================
// Section card
// ====================================================================
function SectionCard({ tag, title, badge, children }) {
  return (
    <div className="bg-white dark:bg-rk-ink-card rounded-2xl p-5 border border-black/[0.04] dark:border-white/[0.05] shadow-soft">
      <div className="flex items-center mb-3.5">
        <div>
          <div className="text-[9px] font-extrabold tracking-[2px] text-rk-orange">
            {tag}
          </div>
          <div className="text-base font-black mt-0.5">{title}</div>
        </div>
        {badge && (
          <div className="ml-auto px-3 py-1 bg-rk-orange/10 text-rk-orange rounded-full text-[11px] font-extrabold">
            {badge}
          </div>
        )}
      </div>
      {children}
    </div>
  )
}

// ====================================================================
// Empty detail (no team selected)
// ====================================================================
function EmptyDetail() {
  return (
    <div className="bg-white dark:bg-rk-ink-card rounded-2xl p-12 border border-black/[0.04] dark:border-white/[0.05] shadow-soft text-center">
      <div className="w-16 h-16 rounded-2xl bg-rk-orange/10 text-rk-orange flex items-center justify-center mx-auto mb-4">
        <UsersIcon size={28} />
      </div>
      <h3 className="text-lg font-black mb-1">
        Selecciona un equipo
      </h3>
      <p className="text-sm text-rk-ink/60 dark:text-rk-cream/60">
        Toca uno en la lista de la izquierda para ver y gestionar sus miembros.
      </p>
    </div>
  )
}

// ====================================================================
// Detalle de un equipo
// ====================================================================
function TeamDetail({ group, agents, onDeleted }) {
  const [editName, setEditName] = useState(false)
  const [tempName, setTempName] = useState(group.name)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [adding, setAdding] = useState(false)
  const [error, setError] = useState(null)

  const members = useMemo(
    () =>
      agents
        .filter((a) => a.groupId === group.id)
        .sort((a, b) => (b.points || 0) - (a.points || 0)),
    [agents, group.id]
  )

  const available = useMemo(
    () =>
      agents
        .filter((a) => a.groupId !== group.id)
        .sort((a, b) => a.name.localeCompare(b.name)),
    [agents, group.id]
  )

  const memberPoints = members.reduce(
    (acc, m) => acc + (m.points || 0),
    0
  )

  async function handleRenameSave() {
    const trimmed = tempName.trim()
    if (trimmed.length < 2 || trimmed === group.name) {
      setEditName(false)
      setTempName(group.name)
      return
    }
    try {
      await updateDoc(doc(db, COL.groups, group.id), { name: trimmed })
      setEditName(false)
    } catch (e) {
      setError('No se pudo renombrar')
    }
  }

  async function handleChangeColor(newColor) {
    if (newColor === group.color) return
    try {
      await updateDoc(doc(db, COL.groups, group.id), { color: newColor })
    } catch (e) {
      setError('No se pudo cambiar el color')
    }
  }

  async function handleAddMember(agent) {
    setAdding(true)
    setError(null)
    try {
      const batch = writeBatch(db)
      const oldGroupId = agent.groupId
      batch.update(doc(db, COL.users, agent.id), { groupId: group.id })
      batch.update(doc(db, COL.groups, group.id), {
        memberCount: increment(1),
      })
      if (oldGroupId) {
        batch.update(doc(db, COL.groups, oldGroupId), {
          memberCount: increment(-1),
        })
      }
      await batch.commit()

      notifyTeamAssignment({
        userId: agent.id,
        teamName: group.name,
      }).catch(() => {})
    } catch (e) {
      setError('No se pudo añadir el miembro')
    } finally {
      setAdding(false)
    }
  }

  async function handleRemoveMember(agent) {
    setError(null)
    try {
      const batch = writeBatch(db)
      batch.update(doc(db, COL.users, agent.id), { groupId: null })
      batch.update(doc(db, COL.groups, group.id), {
        memberCount: increment(-1),
      })
      await batch.commit()
    } catch (e) {
      setError('No se pudo quitar el miembro')
    }
  }

  async function handleDelete() {
    try {
      const batch = writeBatch(db)
      for (const m of members) {
        batch.update(doc(db, COL.users, m.id), { groupId: null })
      }
      batch.delete(doc(db, COL.groups, group.id))
      await batch.commit()
      onDeleted()
    } catch (e) {
      setError('No se pudo borrar el equipo')
    }
  }

  return (
    <div className="space-y-4">
      {/* Cabecera del equipo */}
      <div className="bg-white dark:bg-rk-ink-card rounded-2xl p-5 border border-black/[0.04] dark:border-white/[0.05] shadow-soft">
        <div className="flex items-start gap-4">
          <div
            className="w-14 h-14 rounded-2xl shrink-0"
            style={{ backgroundColor: group.color }}
          />
          <div className="flex-1 min-w-0">
            {editName ? (
              <div className="flex items-center gap-2 max-w-sm">
                <input
                  type="text"
                  value={tempName}
                  onChange={(e) => setTempName(e.target.value)}
                  maxLength={32}
                  className="flex-1 bg-black/5 dark:bg-white/5 rounded-xl px-3 py-2 font-extrabold text-lg focus:outline-none focus:ring-2 focus:ring-rk-orange"
                  autoFocus
                  onKeyDown={(e) => e.key === 'Enter' && handleRenameSave()}
                />
                <button
                  onClick={handleRenameSave}
                  className="p-2 rounded-xl bg-rk-orange text-white"
                >
                  <Check size={18} />
                </button>
              </div>
            ) : (
              <button
                onClick={() => {
                  setTempName(group.name)
                  setEditName(true)
                }}
                className="flex items-center gap-2 text-2xl font-black tracking-tight hover:text-rk-orange transition"
              >
                {group.name}
                <Pencil
                  size={14}
                  className="text-rk-ink/30 dark:text-rk-cream/30"
                />
              </button>
            )}
            <div className="flex items-center gap-4 mt-2 text-xs">
              <span className="font-bold text-rk-ink/70 dark:text-rk-cream/70">
                <UsersIcon size={11} className="inline -mt-0.5 mr-1" />
                {members.length}{' '}
                {members.length === 1 ? 'miembro' : 'miembros'}
              </span>
              <span className="font-bold text-rk-ink/70 dark:text-rk-cream/70">
                <Award size={11} className="inline -mt-0.5 mr-1" />
                {formatPoints(memberPoints)} pts actuales
              </span>
              <span className="text-rk-ink/50 dark:text-rk-cream/50">
                Histórico: {formatPoints(group.totalPoints || 0)} pts
              </span>
            </div>
          </div>
          <button
            onClick={() => setConfirmDelete(true)}
            className="px-3 py-2 rounded-lg bg-red-500/10 text-red-500 hover:bg-red-500/15 text-xs font-extrabold flex items-center gap-1.5 transition"
          >
            <Trash2 size={13} /> Borrar equipo
          </button>
        </div>

        {/* Selector de color */}
        <div className="mt-4 pt-4 border-t border-black/[0.04] dark:border-white/[0.05]">
          <div className="text-[10px] font-extrabold tracking-[2px] text-rk-ink/50 dark:text-rk-cream/50 mb-2">
            COLOR DEL EQUIPO
          </div>
          <div className="flex flex-wrap gap-2">
            {GROUP_COLOR_PALETTE.map((c) => (
              <button
                key={c}
                onClick={() => handleChangeColor(c)}
                className={cn(
                  'w-8 h-8 rounded-lg transition',
                  group.color === c
                    ? 'ring-2 ring-offset-2 ring-rk-orange dark:ring-offset-rk-ink-card scale-110'
                    : 'hover:scale-110'
                )}
                style={{ backgroundColor: c }}
              />
            ))}
          </div>
        </div>
      </div>

      {error && (
        <div className="bg-red-500/10 text-red-500 text-sm font-semibold text-center p-2.5 rounded-2xl">
          {error}
        </div>
      )}

      {/* Miembros */}
      <SectionCard tag="MIEMBROS" title={`En el equipo (${members.length})`}>
        {members.length === 0 ? (
          <div className="text-sm text-rk-ink/50 dark:text-rk-cream/50 py-4 text-center">
            Aún no hay miembros. Añade alguno desde la lista de abajo.
          </div>
        ) : (
          <div className="space-y-1.5">
            {members.map((m) => (
              <div
                key={m.id}
                className="flex items-center gap-3 px-3 py-2 bg-black/[0.02] dark:bg-white/[0.03] rounded-xl"
              >
                <Avatar name={m.name} size="sm" />
                <div className="flex-1 min-w-0">
                  <div className="font-extrabold text-sm truncate">
                    {m.name}
                  </div>
                  <div className="text-[11px] text-rk-ink/60 dark:text-rk-cream/60">
                    {formatPoints(m.points || 0)} pts
                  </div>
                </div>
                <button
                  onClick={() => handleRemoveMember(m)}
                  className="px-2.5 py-1.5 rounded-lg bg-black/[0.04] dark:bg-white/[0.05] hover:bg-red-500/10 hover:text-red-500 text-xs font-extrabold transition flex items-center gap-1"
                >
                  <X size={12} /> Quitar
                </button>
              </div>
            ))}
          </div>
        )}
      </SectionCard>

      {/* Añadir miembros */}
      <SectionCard
        tag="AÑADIR"
        title={`Agentes disponibles (${available.length})`}
      >
        {available.length === 0 ? (
          <div className="text-sm text-rk-ink/50 dark:text-rk-cream/50 py-4 text-center">
            Todos los agentes ya están asignados a equipos.
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-1.5">
            {available.map((a) => (
              <button
                key={a.id}
                onClick={() => handleAddMember(a)}
                disabled={adding}
                className="flex items-center gap-2.5 px-3 py-2 bg-black/[0.02] dark:bg-white/[0.03] hover:bg-rk-orange/10 hover:ring-1 hover:ring-rk-orange/30 rounded-xl text-left transition disabled:opacity-50 group"
              >
                <Avatar name={a.name} size="sm" />
                <div className="flex-1 min-w-0">
                  <div className="font-extrabold text-xs truncate">
                    {a.name}
                  </div>
                  <div className="text-[10px] text-rk-ink/60 dark:text-rk-cream/60 truncate">
                    {a.groupId ? 'Reasignar' : 'Sin equipo'}
                  </div>
                </div>
                <UserPlus
                  size={14}
                  className="text-rk-ink/40 dark:text-rk-cream/40 group-hover:text-rk-orange transition"
                />
              </button>
            ))}
          </div>
        )}
      </SectionCard>

      {confirmDelete && (
        <ConfirmDeleteModal
          teamName={group.name}
          memberCount={members.length}
          onConfirm={handleDelete}
          onClose={() => setConfirmDelete(false)}
        />
      )}
    </div>
  )
}

// ====================================================================
// Crear equipo modal
// ====================================================================
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
      setError('No se pudo crear el equipo. Inténtalo de nuevo.')
      setLoading(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md bg-white dark:bg-rk-ink-card rounded-3xl p-6 shadow-2xl animate-slide-up"
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-black">Nuevo equipo</h2>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full bg-black/5 dark:bg-white/5"
          >
            <X size={18} />
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="text-xs font-semibold uppercase tracking-wider text-rk-ink/50 dark:text-rk-cream/50 block mb-1.5">
              Nombre
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ej. Equipo Alfa"
              maxLength={32}
              className="w-full bg-black/5 dark:bg-white/5 rounded-2xl px-4 py-3 font-semibold focus:outline-none focus:ring-2 focus:ring-rk-orange"
              autoFocus
            />
          </div>

          <div>
            <label className="text-xs font-semibold uppercase tracking-wider text-rk-ink/50 dark:text-rk-cream/50 block mb-2">
              Color
            </label>
            <div className="flex flex-wrap gap-2">
              {GROUP_COLOR_PALETTE.map((c) => (
                <button
                  key={c}
                  onClick={() => setColor(c)}
                  className={cn(
                    'w-10 h-10 rounded-xl transition',
                    color === c
                      ? 'ring-2 ring-offset-2 ring-rk-orange dark:ring-offset-rk-ink-card scale-110'
                      : 'hover:scale-105'
                  )}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
          </div>

          {error && (
            <div className="bg-red-500/10 text-red-500 text-sm font-semibold text-center p-2.5 rounded-2xl">
              {error}
            </div>
          )}

          <button
            onClick={handleCreate}
            disabled={loading}
            className="w-full px-5 py-3 bg-rk-orange text-white font-extrabold rounded-xl shadow-orange-glow-sm hover:bg-rk-orange-dark transition disabled:opacity-50"
          >
            {loading ? 'Creando…' : 'Crear equipo'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ====================================================================
// Confirmar borrado de equipo
// ====================================================================
function ConfirmDeleteModal({ teamName, memberCount, onConfirm, onClose }) {
  const [loading, setLoading] = useState(false)

  async function handle() {
    setLoading(true)
    try {
      await onConfirm()
    } finally {
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
        <div className="w-14 h-14 rounded-2xl bg-red-500/10 text-red-500 flex items-center justify-center mx-auto mb-3">
          <AlertTriangle size={26} />
        </div>
        <h2 className="text-xl font-black text-center mb-1">
          ¿Borrar "{teamName}"?
        </h2>
        <p className="text-sm text-rk-ink/60 dark:text-rk-cream/60 text-center mb-5">
          {memberCount > 0
            ? `Los ${memberCount} ${memberCount === 1 ? 'miembro' : 'miembros'} quedarán sin equipo. Sus puntos individuales se conservan.`
            : 'El equipo se eliminará. No hay miembros asignados.'}
        </p>

        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={onClose}
            disabled={loading}
            className="rounded-2xl bg-black/5 dark:bg-white/5 font-bold py-3 hover:bg-black/10 dark:hover:bg-white/10 transition disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            onClick={handle}
            disabled={loading}
            className="rounded-2xl bg-red-500 text-white font-bold py-3 hover:bg-red-600 transition disabled:opacity-50"
          >
            {loading ? 'Borrando…' : 'Borrar'}
          </button>
        </div>
      </div>
    </div>
  )
}
