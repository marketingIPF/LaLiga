import { useState, useMemo } from 'react'
import { Trophy, Users, User, Euro } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { useUsers } from '../hooks/useUsers'
import { useGroups } from '../hooks/useGroups'
import { isAdminRole } from '../data/seedUsers'
import { formatPoints, cn } from '../lib/utils'
import Header from '../components/layout/Header'
import GlassCard from '../components/ui/GlassCard'
import Avatar from '../components/ui/Avatar'
import RankBadge from '../components/ui/RankBadge'
import { computeRank } from '../lib/constants'

const formatEur = (n) =>
  new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(n ?? 0)

const TABS = [
  { id: 'individual', label: 'Individual', Icon: User },
  { id: 'facturacion', label: 'Facturación', Icon: Euro },
  { id: 'equipos', label: 'Equipos', Icon: Users },
]

export default function Ranking() {
  const [tab, setTab] = useState('individual')
  const { profile } = useAuth()
  const { users, topLifetime } = useUsers()
  const { groups } = useGroups()

  // Agentes ordenados por puntos
  const agentsByPoints = useMemo(
    () =>
      users
        .filter((u) => !isAdminRole(u.role))
        .sort((a, b) => (b.points ?? 0) - (a.points ?? 0)),
    [users]
  )

  // Agentes ordenados por facturación
  const agentsByBilling = useMemo(
    () =>
      users
        .filter((u) => !isAdminRole(u.role))
        .sort((a, b) => (b.periodBilling ?? 0) - (a.periodBilling ?? 0)),
    [users]
  )

  // Equipos ordenados por puntos
  const groupsByPoints = useMemo(
    () => [...groups].sort((a, b) => (b.totalPoints ?? 0) - (a.totalPoints ?? 0)),
    [groups]
  )

  return (
    <div className="space-y-5 animate-fade-in">
      <Header title="El Boletín" subtitle="Ranking" />

      {/* Tabs */}
      <div className="glass rounded-2xl p-1 flex gap-1">
        {TABS.map((t) => (
          <ToggleTab
            key={t.id}
            active={tab === t.id}
            onClick={() => setTab(t.id)}
            Icon={t.Icon}
            label={t.label}
          />
        ))}
      </div>

      {tab === 'individual' && (
        <IndividualLeaderboard
          agents={agentsByPoints}
          topLifetime={topLifetime}
          myId={profile?.id}
          metric="points"
        />
      )}
      {tab === 'facturacion' && (
        <IndividualLeaderboard
          agents={agentsByBilling}
          topLifetime={topLifetime}
          myId={profile?.id}
          metric="billing"
        />
      )}
      {tab === 'equipos' && <GroupsLeaderboard groups={groupsByPoints} />}
    </div>
  )
}

function ToggleTab({ active, onClick, Icon, label }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl font-semibold text-xs transition-all',
        active
          ? 'bg-rk-orange text-white shadow-md shadow-rk-orange/20'
          : 'text-rk-ink/60 dark:text-rk-cream/60'
      )}
    >
      <Icon size={14} />
      {label}
    </button>
  )
}

// metric: 'points' → ordena/destaca puntos, muestra facturación al lado.
// metric: 'billing' → ordena/destaca facturación, muestra puntos al lado.
function IndividualLeaderboard({ agents, topLifetime, myId, metric }) {
  if (agents.length === 0) return <EmptyState text="Aún no hay datos para mostrar" />

  const [first, second, third, ...rest] = agents

  return (
    <>
      {/* Podio */}
      <div className="grid grid-cols-3 gap-2 items-end pt-4">
        <PodiumSlot position={2} user={second} myId={myId} metric={metric} height="h-28" />
        <PodiumSlot position={1} user={first} myId={myId} metric={metric} height="h-36" featured />
        <PodiumSlot position={3} user={third} myId={myId} metric={metric} height="h-24" />
      </div>

      {/* Resto del ranking */}
      <div className="space-y-2">
        {rest.map((u, idx) => (
          <RankRow
            key={u.id}
            position={idx + 4}
            user={u}
            topLifetime={topLifetime}
            isMe={u.id === myId}
            metric={metric}
          />
        ))}
      </div>
    </>
  )
}

function getPrimary(user, metric) {
  const value = metric === 'points' ? user.points ?? 0 : user.periodBilling ?? 0
  return metric === 'points' ? formatPoints(value) : formatEur(value)
}

function getSecondary(user, metric) {
  // El opuesto, pequeño, debajo
  if (metric === 'points') {
    return `${formatEur(user.periodBilling ?? 0)} fact.`
  }
  return `${formatPoints(user.points ?? 0)} pts`
}

function PodiumSlot({ position, user, myId, metric, height, featured }) {
  if (!user) return <div />
  const medals = { 1: '🥇', 2: '🥈', 3: '🥉' }
  const isMe = user.id === myId
  const primary = getPrimary(user, metric)

  return (
    <div className="flex flex-col items-center">
      <Avatar name={user.name} size={featured ? 'lg' : 'md'} />
      <div className="text-center mt-2 px-1 min-w-0 w-full">
        <div
          className={cn(
            'text-xs font-bold truncate',
            featured && 'text-sm',
            isMe && 'text-rk-orange'
          )}
        >
          {user.name.split(' ')[0]}
        </div>
        <div className="text-xs font-black mt-0.5">{primary}</div>
      </div>
      <div
        className={cn(
          'mt-2 w-full rounded-t-2xl flex items-start justify-center pt-2 text-3xl',
          height,
          featured
            ? 'bg-gradient-to-b from-rk-orange to-rk-orange-dark text-white'
            : 'bg-gradient-to-b from-rk-orange/30 to-rk-orange/10 dark:from-white/10 dark:to-white/5'
        )}
      >
        {medals[position]}
      </div>
    </div>
  )
}

function RankRow({ position, user, topLifetime, isMe, metric }) {
  const rank = computeRank({
    points: user.points ?? 0,
    lifetimePoints: user.lifetimePoints ?? 0,
    topLifetimeInAgency: topLifetime,
  })

  return (
    <div
      className={cn(
        'glass rounded-2xl p-3 flex items-center gap-3',
        isMe && 'ring-2 ring-rk-orange'
      )}
    >
      <div className="w-7 text-center font-black text-sm text-rk-ink/50 dark:text-rk-cream/50">
        {position}
      </div>
      <Avatar name={user.name} size="sm" />
      <div className="flex-1 min-w-0">
        <div className="text-sm font-bold truncate">
          {user.name}
          {isMe && <span className="text-rk-orange ml-1">(tú)</span>}
        </div>
        <RankBadge rankId={rank.id} size="sm" className="mt-1" />
      </div>
      <div className="text-right whitespace-nowrap">
        <div className="text-sm font-black text-rk-orange">
          {getPrimary(user, metric)}
        </div>
        <div className="text-[10px] font-semibold text-rk-ink/40 dark:text-rk-cream/40 mt-0.5">
          {getSecondary(user, metric)}
        </div>
      </div>
    </div>
  )
}

function GroupsLeaderboard({ groups }) {
  if (groups.length === 0) return <EmptyState text="Aún no hay equipos configurados" />

  return (
    <div className="space-y-3">
      {groups.map((g, idx) => (
        <GlassCard key={g.id} className="!p-4 flex items-center gap-4">
          <div
            className="w-12 h-12 rounded-2xl flex items-center justify-center text-xl text-white font-black"
            style={{ backgroundColor: g.color ?? '#cf731b' }}
          >
            {idx + 1}
          </div>
          <div className="flex-1 min-w-0">
            <div className="font-bold truncate">{g.name}</div>
            <div className="text-xs text-rk-ink/60 dark:text-rk-cream/60">
              {g.memberCount ?? 0} {g.memberCount === 1 ? 'agente' : 'agentes'}
            </div>
          </div>
          <div className="text-right whitespace-nowrap">
            <div className="text-lg font-black text-rk-orange">{formatPoints(g.totalPoints)}</div>
            <div className="text-[10px] font-semibold text-rk-ink/40 dark:text-rk-cream/40 mt-0.5">
              {formatEur(g.totalBilling ?? 0)} fact.
            </div>
          </div>
        </GlassCard>
      ))}
    </div>
  )
}

function EmptyState({ text }) {
  return (
    <GlassCard className="text-center py-10">
      <Trophy size={32} className="mx-auto text-rk-ink/30 dark:text-rk-cream/30 mb-3" />
      <p className="text-sm text-rk-ink/60 dark:text-rk-cream/60">{text}</p>
    </GlassCard>
  )
}
