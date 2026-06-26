import { useMemo } from 'react'
import { computeRank, getNextRankProgress } from '../lib/constants'

/**
 * Devuelve el rango actual del agente y el progreso hacia el siguiente.
 *
 * @param {Object} params
 * @param {number} params.points - Puntos del periodo actual
 * @param {number} params.lifetimePoints - Puntos históricos
 * @param {number} params.topLifetimeInAgency - Top histórico de la agencia (para Embajador)
 */
export function useRank({ points = 0, lifetimePoints = 0, topLifetimeInAgency = 0 }) {
  return useMemo(() => {
    const rank = computeRank({ points, lifetimePoints, topLifetimeInAgency })
    const progress = getNextRankProgress(points)
    return {
      rank,
      ...progress,
      isEmbajador: rank.id === 'embajador',
    }
  }, [points, lifetimePoints, topLifetimeInAgency])
}
