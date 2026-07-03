import { useMemo } from 'react'
import { useUsers } from '../hooks/useUsers'
import { useActionRequests } from '../hooks/useActionRequests'
import { isCompetitor } from '../data/seedUsers'
import { ACHIEVEMENT_TYPES } from '../lib/constants'
import { formatPoints } from '../lib/utils'
import Header from '../components/layout/Header'
import GlassCard from '../components/ui/GlassCard'
import Avatar from '../components/ui/Avatar'

export default function Logros() {
  const { users, topLifetime } = useUsers()
  // Solo aprobadas para calcular logros reales
  const { requests } = useActionRequests({ status: 'approved' })

  const agents = useMemo(
    () => users.filter(isCompetitor),
    [users]
  )

  const achievements = useMemo(() => {
    if (agents.length === 0) return []

    // Embajador histórico
    const embajador = [...agents].sort(
      (a, b) => (b.lifetimePoints ?? 0) - (a.lifetimePoints ?? 0)
    )[0]

    // Conteo de acciones aprobadas por persona
    const byAgent = {}
    requests.forEach((r) => {
      if (!byAgent[r.userId]) byAgent[r.userId] = { prospeccion: 0, entrevistas: 0, eventos: 0, total: 0 }
      byAgent[r.userId].total++
      if (r.actionType === 'llamada_prospeccion') byAgent[r.userId].prospeccion++
      if (['entrevista_m1', 'entrevista_m2', 'entrevista_m3'].includes(r.actionType)) byAgent[r.userId].entrevistas++
      if (r.actionType === 'crear_evento') byAgent[r.userId].eventos++
    })

    const pickTop = (key) => {
      const list = agents
        .map((a) => ({ ...a, count: byAgent[a.id]?.[key] ?? 0 }))
        .filter((a) => a.count > 0)
        .sort((a, b) => b.count - a.count)
      return list[0]
    }

    const reyProspeccion = pickTop('prospeccion')
    const maestroEntrevistas = pickTop('entrevistas')
    const creadorEventos = pickTop('eventos')

    // Constancia: más acciones totales aprobadas
    const constante = agents
      .map((a) => ({ ...a, count: byAgent[a.id]?.total ?? 0 }))
      .filter((a) => a.count >= 4)
      .sort((a, b) => b.count - a.count)[0]

    return [
      embajador && topLifetime > 0 && {
        ...ACHIEVEMENT_TYPES.embajador_historico,
        agent: embajador,
        stat: `${formatPoints(embajador.lifetimePoints)} pts históricos`,
      },
      reyProspeccion && {
        ...ACHIEVEMENT_TYPES.rey_prospeccion,
        agent: reyProspeccion,
        stat: `${reyProspeccion.count} llamadas de prospección`,
      },
      maestroEntrevistas && {
        ...ACHIEVEMENT_TYPES.maestro_entrevistas,
        agent: maestroEntrevistas,
        stat: `${maestroEntrevistas.count} entrevistas`,
      },
      creadorEventos && {
        ...ACHIEVEMENT_TYPES.creador_eventos,
        agent: creadorEventos,
        stat: `${creadorEventos.count} ${creadorEventos.count === 1 ? 'evento' : 'eventos'}`,
      },
      constante && {
        ...ACHIEVEMENT_TYPES.constancia,
        agent: constante,
        stat: `${constante.count} acciones totales`,
      },
    ].filter(Boolean)
  }, [agents, requests, topLifetime])

  return (
    <div className="space-y-5 animate-fade-in">
      <Header title="Muro de Logros" subtitle="Wall of Fame" />

      {achievements.length === 0 ? (
        <GlassCard className="text-center py-12">
          <div className="text-5xl mb-3">🏆</div>
          <p className="text-sm text-rk-ink/60 dark:text-rk-cream/60">
            Los logros se irán desbloqueando a medida que el equipo registre acciones.
          </p>
        </GlassCard>
      ) : (
        <div className="space-y-3">
          {achievements.map((a) => (
            <AchievementCard key={a.id} achievement={a} />
          ))}
        </div>
      )}
    </div>
  )
}

function AchievementCard({ achievement }) {
  return (
    <GlassCard className="relative overflow-hidden">
      <div className="absolute -top-6 -right-6 w-24 h-24 rounded-full bg-rk-orange/15 blur-2xl pointer-events-none" />
      <div className="relative flex items-center gap-4">
        <div className="text-4xl">{achievement.icon}</div>
        <div className="flex-1 min-w-0">
          <div className="text-xs font-semibold uppercase tracking-wider text-rk-orange">
            {achievement.label}
          </div>
          <div className="font-bold mt-0.5 truncate">{achievement.agent.name}</div>
          <div className="text-xs text-rk-ink/60 dark:text-rk-cream/60">{achievement.stat}</div>
        </div>
        <Avatar name={achievement.agent.name} size="md" />
      </div>
    </GlassCard>
  )
}
