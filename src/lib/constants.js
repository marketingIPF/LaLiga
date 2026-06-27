// ====================================================================
// La Liga · Sistema de puntos y rangos (RK Palanca Fontestad)
// ====================================================================

export const ACTION_TYPES = {
  captacion_propiedad: {
    id: 'captacion_propiedad',
    label: 'Captación de propiedad',
    shortLabel: 'Captación',
    points: 100,
    icon: '🏠',
    description: 'Has captado una nueva propiedad para la cartera.',
  },
  venta_cerrada: {
    id: 'venta_cerrada',
    label: 'Venta cerrada',
    shortLabel: 'Venta',
    points: 150,
    icon: '🤝',
    description: 'Operación firmada y cerrada con éxito.',
  },
  captacion_exclusiva: {
    id: 'captacion_exclusiva',
    label: 'Captación en exclusiva',
    shortLabel: 'Exclusiva (+50)',
    points: 50,
    icon: '⭐',
    description: 'Bonus de +50 pts adicional a la captación estándar.',
  },
  resena_positiva: {
    id: 'resena_positiva',
    label: 'Reseña positiva de cliente',
    shortLabel: 'Reseña',
    points: 30,
    icon: '⭐️',
    description: 'Un cliente ha dejado una reseña positiva.',
  },
  referido: {
    id: 'referido',
    label: 'Referido que capta o vende',
    shortLabel: 'Referido',
    points: 40,
    icon: '🔗',
    description: 'Un referido tuyo ha materializado captación o venta.',
  },
  formacion_interna: {
    id: 'formacion_interna',
    label: 'Formación interna completada',
    shortLabel: 'Formación',
    points: 20,
    icon: '🎓',
    description: 'Has completado una formación interna.',
  },
  asistencia_reunion: {
    id: 'asistencia_reunion',
    label: 'Asistencia a reunión',
    shortLabel: 'Reunión',
    points: 10,
    icon: '📅',
    description: 'Asistencia confirmada a reunión de equipo.',
  },
  publicar_rrss: {
    id: 'publicar_rrss',
    label: 'Publicar en RRSS',
    shortLabel: 'RRSS',
    points: 15,
    icon: '📱',
    description: 'Publicación en mi Instagram / WhatsApp.',
  },
}

export const ACTION_LIST = Object.values(ACTION_TYPES)

// --------------------------------------------------------------------
// Rangos
// --------------------------------------------------------------------
// Prospectador → entry level (0-149)
// Consolidado  → 150-399
// Sénior       → 400-799
// Élite        → 800+
// Embajador    → reservado al líder histórico de la agencia (lifetime top, ≥1000)

export const RANKS = {
  prospectador: {
    id: 'prospectador',
    label: 'Prospectador',
    min: 0,
    max: 149,
    color: 'rank-prospectador',
    gradient: 'from-slate-400 to-slate-500',
    description: 'Construyendo los primeros cimientos.',
  },
  consolidado: {
    id: 'consolidado',
    label: 'Consolidado',
    min: 150,
    max: 399,
    color: 'rank-consolidado',
    gradient: 'from-blue-400 to-blue-600',
    description: 'Ritmo sólido y constante.',
  },
  senior: {
    id: 'senior',
    label: 'Sénior',
    min: 400,
    max: 799,
    color: 'rank-senior',
    gradient: 'from-violet-400 to-purple-600',
    description: 'Referente del equipo.',
  },
  elite: {
    id: 'elite',
    label: 'Élite',
    min: 800,
    max: Infinity,
    color: 'rank-elite',
    gradient: 'from-rk-orange to-amber-500',
    description: 'Top performer de la agencia.',
  },
  embajador: {
    id: 'embajador',
    label: 'Embajador',
    min: 0,
    max: Infinity,
    color: 'rank-embajador',
    gradient: 'from-yellow-400 via-amber-500 to-rk-orange',
    description: 'Líder histórico de RK Palanca.',
  },
}

export const RANK_ORDER = ['prospectador', 'consolidado', 'senior', 'elite']

/**
 * Calcula el rango actual a partir de puntos del periodo + total histórico.
 * Embajador se otorga al líder histórico de la agencia (mayor lifetimePoints).
 */
export function computeRank({ points = 0, lifetimePoints = 0, topLifetimeInAgency = 0 }) {
  // Embajador: el agente con más puntos históricos (si supera el umbral mínimo)
  if (
    lifetimePoints > 0 &&
    lifetimePoints >= topLifetimeInAgency &&
    topLifetimeInAgency >= 1000
  ) {
    return RANKS.embajador
  }
  if (points >= 800) return RANKS.elite
  if (points >= 400) return RANKS.senior
  if (points >= 150) return RANKS.consolidado
  return RANKS.prospectador
}

/**
 * Devuelve el siguiente rango y el progreso (0-1) hacia él.
 */
export function getNextRankProgress(points = 0) {
  if (points >= 800) {
    return { next: null, progress: 1, pointsToNext: 0, current: RANKS.elite }
  }
  if (points >= 400) {
    return {
      next: RANKS.elite,
      current: RANKS.senior,
      progress: (points - 400) / (800 - 400),
      pointsToNext: 800 - points,
    }
  }
  if (points >= 150) {
    return {
      next: RANKS.senior,
      current: RANKS.consolidado,
      progress: (points - 150) / (400 - 150),
      pointsToNext: 400 - points,
    }
  }
  return {
    next: RANKS.consolidado,
    current: RANKS.prospectador,
    progress: points / 150,
    pointsToNext: 150 - points,
  }
}

// --------------------------------------------------------------------
// Logros del muro
// --------------------------------------------------------------------
export const ACHIEVEMENT_TYPES = {
  primera_captacion: {
    id: 'primera_captacion',
    label: 'Primera captación',
    icon: '🚀',
    description: 'Registró su primera captación del periodo.',
  },
  rey_captaciones: {
    id: 'rey_captaciones',
    label: 'Rey de las captaciones',
    icon: '👑',
    description: 'Más captaciones del periodo.',
  },
  cerrador: {
    id: 'cerrador',
    label: 'Cerrador del mes',
    icon: '💼',
    description: 'Más ventas cerradas del periodo.',
  },
  constancia: {
    id: 'constancia',
    label: 'Constancia',
    icon: '🔥',
    description: '4+ semanas consecutivas con actividad.',
  },
  embajador_historico: {
    id: 'embajador_historico',
    label: 'Embajador',
    icon: '🏆',
    description: 'Líder histórico de la agencia.',
  },
}
