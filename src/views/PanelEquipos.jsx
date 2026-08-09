import { useState, useMemo } from 'react'
import { Navigate } from 'react-router-dom'
import {
  Plus, X, Trash2, AlertTriangle, UserPlus,
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

  const agents = useMemo(() => users.filter(isCompetitor), [users])
  const unassigned = useMemo(() => agents.filter((a) => !a.groupId), [agents])

  const sortedGroups = useMemo(
    () => [...groups].sort((a, b) => (b.totalPoints || 0) - (a.totalPoints || 0)),
    [groups]
  )

  const selectedGroup = selectedId
    ? sortedGroups.find((g) => g.id === selectedId) ?? null
    : null

  if (!isAdmin) return <Navigate to="/" replace />

  return (
    <div className="min-w-[980px] max-w-[1280px] animate-fade-in">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-[27px] font-black tracking-tight">Equipos</h1>
          <p className="text-[12.5px] font-semibold text-rk-ink/40 dark:text-rk-cream/40 mt-1">
            {sortedGroups.length} {sortedGroups.length === 1 ? 'equipo' : 'equipos'}
            {unassigned.length > 0 && ` · ${unassigned.length} sin asignar`}
          </p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 px-4 py-2.5 bg-rk-orange text-white font-extrabold text-[12.5px] rounded-lg hover:bg-rk-orange-dark transition"
        >
          <Plus size={15} /> Crear equipo
        </button>
      </div>

      <div className="grid grid-cols-[1fr_1.6fr] gap-6 items-start mt-6">
        {/* COLUMNA IZQUIERDA — lista de equipos */}
        <div>
          <Seccion titulo="Equipos" nota={`${sortedGroups.length}`}>
            {sortedGroups.length === 0 ? (
              <Vacio
                icono={<UsersIcon size={22} />}
                titulo="Todavía no hay equipos"
                texto="Crea el primero con el botón de arriba"
              />
            ) : (
              sortedGroups.map((g, i) => {
                const memberCount = agents.filter((a) => a.groupId === g.id).length
                const isSelected = selectedId === g.id
                return (
                  <button
                    key={g.id}
                    onClick={() => setSelectedId(g.id)}
                    className={cn(
                      'w-full flex items-center gap-3 px-4 py-3 text-left transition-colors',
                      i < sortedGroups.length - 1 &&
                        'border-b border-black/[0.055] dark:border-white/[0.06]',
                      isSelected && 'bg-rk-orange/[0.06]'
                    )}
                  >
                    <div
                      className="w-8 h-8 rounded-lg shrink-0"
                      style={{ backgroundColor: g.color }}
                    />
                    <div className="flex-1 min-w-0">
                      <div
                        className={cn(
                          'text-[12.5px] truncate',
                          isSelected ? 'font-extrabold text-rk-orange' : 'font-bold'
                        )}
                      >
                        {g.name}
                      </div>
                      <div className="text-[10.5px] font-semibold text-rk-ink/40 dark:text-rk-cream/40">
                        {memberCount} {memberCount === 1 ? 'miembro' : 'miembros'}
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="font-black text-[13px] tabular-nums">
                        {formatPoints(g.totalPoints || 0)}
                      </div>
                      <div className="text-[9px] font-bold text-rk-ink/35 dark:text-rk-cream/35">
                        pts
                      </div>
                    </div>
                  </button>
                )
              })
            )}
          </Seccion>

          {/* Sin equipo */}
          {unassigned.length > 0 && (
            <Seccion titulo="Sin asignar" nota={`${unassigned.length}`} className="mt-6">
              <div className="flex flex-wrap gap-1.5 px-4 py-3.5">
                {unassigned.map((a) => (
                  <div
                    key={a.id}
                    className="px-2.5 py-1 rounded-full bg-black/[0.045] dark:bg-white/[0.06] text-[11px] font-bold"
                  >
                    {a.name}
                  </div>
                ))}
              </div>
            </Seccion>
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
// Sección con título fuera del contenedor (mismo patrón que Panel.jsx)
// ====================================================================
function Seccion({ titulo, nota, className, children }) {
  return (
    <div className={className}>
      <div className="flex items-baseline mb-2.5">
        <h2 className="text-[15.5px] font-black tracking-tight">{titulo}</h2>
        {nota && (
          <span className="text-[11.5px] font-semibold text-rk-ink/38 dark:text-rk-cream/38 ml-2.5">
            {nota}
          </span>
        )}
      </div>
      <div className="bg-white dark:bg-rk-ink-card border border-black/[0.07] dark:border-white/[0.08] rounded-xl overflow-hidden">
        {children}
      </div>
    </div>
  )
}

function Vacio({ icono, titulo, texto }) {
  return (
    <div className="text-center py-10">
      {icono && (
        <div className="mx-auto mb-2.5 text-rk-ink/25 dark:text-rk-cream/25">{icono}</div>
      )}
      <p className="text-[13px] font-bold">{titulo}</p>
      {texto && (
        <p className="text-[11.5px] font-semibold text-rk-ink/40 dark:text-rk-cream/40 mt-1">
          {texto}
        </p>
      )}
    </div>
  )
}

function EmptyDetail() {
  return (
    <div className="border border-dashed border-black/[0.12] dark:border-white/[0.14] rounded-xl py-16 text-center">
      <UsersIcon size={24} className="mx-auto text-rk-ink/25 dark:text-rk-cream/25 mb-2.5" />
      <h3 className="text-[13px] font-bold">Selecciona un equipo</h3>
      <p className="text-[11.5px] font-semibold text-rk-ink/40 dark:text-rk-cream/40 mt-1">
        Elige uno en la lista de la izquierda para ver y gestionar sus miembros.
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
    <div>
      {/* Cabecera del equipo, sin caja */}
      <div className="flex items-start gap-4">
        <div
          className="w-12 h-12 rounded-xl shrink-0"
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
                className="flex-1 bg-black/[0.045] dark:bg-white/[0.06] rounded-lg px-3 py-1.5 font-black text-[17px] outline-none focus:ring-2 focus:ring-rk-orange/40"
                autoFocus
                onKeyDown={(e) => e.key === 'Enter' && handleRenameSave()}
              />
              <button
                onClick={handleRenameSave}
                className="p-2 rounded-lg bg-rk-orange text-white"
              >
                <Check size={16} />
              </button>
            </div>
          ) : (
            <button
              onClick={() => {
                setTempName(group.name)
                setEditName(true)
              }}
              className="flex items-center gap-2 text-[19px] font-black tracking-tight hover:text-rk-orange transition"
            >
              {group.name}
              <Pencil size={13} className="text-rk-ink/30 dark:text-rk-cream/30" />
            </button>
          )}
          <div className="flex items-center gap-3.5 mt-1.5 text-[11px] font-semibold text-rk-ink/45 dark:text-rk-cream/45">
            <span className="flex items-center gap-1">
              <UsersIcon size={11} />
              {members.length} {members.length === 1 ? 'miembro' : 'miembros'}
            </span>
            <span className="flex items-center gap-1">
              <Award size={11} />
              {formatPoints(memberPoints)} pts actuales
            </span>
            <span>Histórico: {formatPoints(group.totalPoints || 0)} pts</span>
          </div>
        </div>
        <button
          onClick={() => setConfirmDelete(true)}
          className="px-3 py-1.5 rounded-lg text-red-500 hover:bg-red-500/[0.08] text-[11.5px] font-extrabold flex items-center gap-1.5 transition shrink-0"
        >
          <Trash2 size={13} /> Borrar equipo
        </button>
      </div>

      {/* Selector de color */}
      <div className="mt-4 pt-4 border-t border-black/[0.075] dark:border-white/[0.09]">
        <div className="text-[10px] font-extrabold uppercase tracking-[1.3px] text-rk-ink/40 dark:text-rk-cream/40 mb-2">
          Color del equipo
        </div>
        <div className="flex flex-wrap gap-2">
          {GROUP_COLOR_PALETTE.map((c) => (
            <button
              key={c}
              onClick={() => handleChangeColor(c)}
              className={cn(
                'w-7 h-7 rounded-lg transition',
                group.color === c
                  ? 'ring-2 ring-offset-2 ring-rk-orange dark:ring-offset-rk-ink scale-110'
                  : 'hover:scale-110'
              )}
              style={{ backgroundColor: c }}
            />
          ))}
        </div>
      </div>

      {error && (
        <div className="bg-red-500/10 text-red-500 text-[12.5px] font-semibold text-center p-2.5 rounded-xl mt-4">
          {error}
        </div>
      )}

      {/* Miembros */}
      <Seccion titulo="Miembros" nota={`${members.length} en el equipo`} className="mt-6">
        {members.length === 0 ? (
          <div className="text-[12.5px] font-semibold text-rk-ink/40 dark:text-rk-cream/40 py-6 text-center">
            Aún no hay miembros. Añade alguno desde la lista de abajo.
          </div>
        ) : (
          members.map((m, i) => (
            <div
              key={m.id}
              className={cn(
                'flex items-center gap-3 px-4 py-2.5',
                i < members.length - 1 &&
                  'border-b border-black/[0.055] dark:border-white/[0.06]'
              )}
            >
              <Avatar name={m.name} size="sm" />
              <div className="flex-1 min-w-0">
                <div className="font-extrabold text-[12.5px] truncate">
                  {m.name}
                </div>
                <div className="text-[10.5px] font-semibold text-rk-ink/40 dark:text-rk-cream/40">
                  {formatPoints(m.points || 0)} pts
                </div>
              </div>
              <button
                onClick={() => handleRemoveMember(m)}
                className="px-2.5 py-1.5 rounded-lg text-rk-ink/45 dark:text-rk-cream/45 hover:bg-red-500/[0.08] hover:text-red-500 text-[11px] font-extrabold transition flex items-center gap-1"
              >
                <X size={11} /> Quitar
              </button>
            </div>
          ))
        )}
      </Seccion>

      {/* Añadir miembros */}
      <Seccion titulo="Añadir" nota={`${available.length} disponibles`} className="mt-6">
        {available.length === 0 ? (
          <div className="text-[12.5px] font-semibold text-rk-ink/40 dark:text-rk-cream/40 py-6 text-center">
            Todos los agentes ya están asignados a equipos.
          </div>
        ) : (
          <div className="grid grid-cols-2 divide-x divide-black/[0.055] dark:divide-white/[0.06]">
            {[0, 1].map((col) => (
              <div key={col} className="divide-y divide-black/[0.055] dark:divide-white/[0.06]">
                {available
                  .filter((_, i) => i % 2 === col)
                  .map((a) => (
                    <button
                      key={a.id}
                      onClick={() => handleAddMember(a)}
                      disabled={adding}
                      className="w-full flex items-center gap-2.5 px-4 py-2.5 text-left transition disabled:opacity-50 group hover:bg-rk-orange/[0.06]"
                    >
                      <Avatar name={a.name} size="sm" />
                      <div className="flex-1 min-w-0">
                        <div className="font-extrabold text-[11.5px] truncate">
                          {a.name}
                        </div>
                        <div className="text-[10px] font-semibold text-rk-ink/40 dark:text-rk-cream/40 truncate">
                          {a.groupId ? 'Reasignar' : 'Sin equipo'}
                        </div>
                      </div>
                      <UserPlus
                        size={13}
                        className="text-rk-ink/30 dark:text-rk-cream/30 group-hover:text-rk-orange transition shrink-0"
                      />
                    </button>
                  ))}
              </div>
            ))}
          </div>
        )}
      </Seccion>

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
            className="w-full px-5 py-3 bg-rk-orange text-white font-extrabold text-[13.5px] rounded-xl hover:bg-rk-orange-dark transition disabled:opacity-50"
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
