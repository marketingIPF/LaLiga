// ====================================================================
// La Liga · Sistema de puntos y rangos (RK Palanca Fontestad)
// --------------------------------------------------------------------
// v2 · Rediseño de gerencia:
//  - Dos ligas: 'agentes' (Agentes Comerciales) y 'staff' (Staff + Obra Nueva)
//  - Cada acción declara en qué ligas puntúa (leagues) y en cuáles
//    puede solicitarla el propio usuario (selfService). El resto de
//    puntos los carga un admin desde el panel (datos del CRM).
//  - La facturación desaparece de la app.
// ====================================================================

export const LEAGUES = {
  agentes: { id: 'agentes', label: 'Agentes' },
  staff: { id: 'staff', label: 'Staff & Obra Nueva' },
}

export const ACTION_TYPES = {
  // ------------------ LIGA AGENTES (carga admin/CRM) ------------------
  llamada_cortesia: {
    id: 'llamada_cortesia',
    label: 'Llamada de cortesía',
    shortLabel: 'Cortesía',
    points: 2,
    icon: '📍',
    description: 'Llamada de cortesía realizada.',
    leagues: ['agentes'],
    selfService: [],
  },
  llamada_prospeccion: {
    id: 'llamada_prospeccion',
    label: 'Llamada de prospección',
    shortLabel: 'Prospección',
    points: 2,
    icon: '📞',
    description: 'Llamada de prospección realizada.',
    leagues: ['agentes'],
    selfService: [],
  },
  win_win: {
    id: 'win_win',
    label: 'Win Win (con contrato firmado)',
    shortLabel: 'Win Win',
    points: 10,
    icon: '🤝',
    description: 'Colaboración Win Win con contrato firmado.',
    leagues: ['agentes', 'staff'],
    selfService: ['staff'],
  },
  comercio_aliado: {
    id: 'comercio_aliado',
    label: 'Comercio aliado',
    shortLabel: 'Comercio',
    points: 10,
    icon: '🏪',
    description: 'Nuevo comercio aliado incorporado.',
    leagues: ['agentes', 'staff'],
    selfService: ['staff'],
  },
  entrevista_m1: {
    id: 'entrevista_m1',
    label: 'Entrevista M1',
    shortLabel: 'M1',
    points: 50,
    icon: '🎯',
    description: 'Entrevista M1 completada.',
    leagues: ['agentes'],
    selfService: [],
  },
  entrevista_m2: {
    id: 'entrevista_m2',
    label: 'Entrevista M2',
    shortLabel: 'M2',
    points: 75,
    icon: '🎯',
    description: 'Entrevista M2 completada.',
    leagues: ['agentes'],
    selfService: [],
  },
  entrevista_m3: {
    id: 'entrevista_m3',
    label: 'Entrevista M3',
    shortLabel: 'M3',
    points: 125,
    icon: '🎯',
    description: 'Entrevista M3 completada.',
    leagues: ['agentes'],
    selfService: [],
  },
  bajada_precio: {
    id: 'bajada_precio',
    label: 'Bajada de precio',
    shortLabel: 'Bajada precio',
    points: 5,
    icon: '📉',
    description: 'Has conseguido una bajada de precio del propietario.',
    leagues: ['agentes'],
    selfService: [],
  },
  resena_google: {
    id: 'resena_google',
    label: 'Reseña en Google',
    shortLabel: 'Google',
    points: 5,
    icon: '🗺️',
    description: 'Reseña conseguida en Google.',
    leagues: ['agentes', 'staff'],
    selfService: ['staff'],
  },

  // ------------------ AUTOSERVICIO AGENTES ------------------
  publicar_rrss: {
    id: 'publicar_rrss',
    label: 'Publicar en RRSS',
    shortLabel: 'RRSS',
    points: 5,
    icon: '📱',
    description: 'Publicación en tu Instagram / WhatsApp.',
    leagues: ['agentes'],
    selfService: ['agentes'],
  },
  grabar_reel: {
    id: 'grabar_reel',
    label: 'Grabar para un Reel',
    shortLabel: 'Reel',
    points: 10,
    icon: '🎬',
    description: 'Has grabado contenido para un Reel de la agencia.',
    leagues: ['agentes', 'staff'],
    selfService: ['agentes', 'staff'],
  },
  formacion: {
    id: 'formacion',
    label: 'Formación / Entrenamiento',
    shortLabel: 'Formación',
    points: 10,
    icon: '🎓',
    description: 'Adjunta en las notas el resultado de tu entrenamiento.',
    leagues: ['agentes'],
    selfService: ['agentes'],
    requiresEvidence: true,
  },
  crear_evento: {
    id: 'crear_evento',
    label: 'Crear un evento',
    shortLabel: 'Evento',
    points: 200,
    icon: '🎪',
    description: 'Has organizado un evento de la agencia.',
    leagues: ['agentes'],
    selfService: ['agentes'],
  },

  // ------------------ SOLO LIGA STAFF ------------------
  liebres: {
    id: 'liebres',
    label: 'Liebres',
    shortLabel: 'Liebres',
    points: 50,
    icon: '🐇',
    description: 'Liebre aportada al equipo comercial.',
    leagues: ['staff'],
    selfService: ['staff'],
  },

  // ------------------ SUMAS DIRECTAS (liga agentes) ------------------
  // Al final a propósito: son las más usadas por administración.
  // directPoints: el admin teclea el TOTAL de puntos, no un nº de veces.
  // Sin `points`: el botón no muestra ningún valor unitario.
  suma_toques: {
    id: 'suma_toques',
    label: 'Suma total de toques',
    shortLabel: 'Toques',
    directPoints: true,
    icon: '👊',
    description: 'Suma de llamadas de cortesía, prospección, Win Win y comercio aliado. Se introduce el total de puntos.',
    leagues: ['agentes'],
    selfService: [],
  },
  suma_entrevistas: {
    id: 'suma_entrevistas',
    label: 'Suma total de entrevistas',
    shortLabel: 'Entrevistas',
    directPoints: true,
    icon: '🎯',
    description: 'Suma de entrevistas M1, M2 y M3. Se introduce el total de puntos.',
    leagues: ['agentes'],
    selfService: [],
  },
}

export const ACTION_LIST = Object.values(ACTION_TYPES)

/**
 * Acciones que puntúan en una liga.
 */
export function actionsForLeague(league) {
  return ACTION_LIST.filter((a) => a.leagues.includes(league))
}

/**
 * Acciones que un usuario puede solicitar él mismo según su liga.
 */
export function selfServiceActions(league) {
  return ACTION_LIST.filter((a) => a.selfService.includes(league))
}

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
    auraColor: '#64748b',
    description: 'Construyendo los primeros cimientos.',
  },
  consolidado: {
    id: 'consolidado',
    label: 'Consolidado',
    min: 150,
    max: 399,
    color: 'rank-consolidado',
    gradient: 'from-blue-400 to-blue-600',
    auraColor: '#3b82f6',
    description: 'Ritmo sólido y constante.',
  },
  senior: {
    id: 'senior',
    label: 'Sénior',
    min: 400,
    max: 799,
    color: 'rank-senior',
    gradient: 'from-violet-400 to-purple-600',
    auraColor: '#a855f7',
    description: 'Referente del equipo.',
  },
  elite: {
    id: 'elite',
    label: 'Élite',
    min: 800,
    max: Infinity,
    color: 'rank-elite',
    gradient: 'from-rk-orange to-amber-500',
    auraColor: '#cf731b',
    description: 'Top performer de la agencia.',
  },
  embajador: {
    id: 'embajador',
    label: 'Embajador',
    min: 0,
    max: Infinity,
    color: 'rank-embajador',
    gradient: 'from-yellow-400 via-amber-500 to-rk-orange',
    auraColor: '#f59e0b',
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
  rey_prospeccion: {
    id: 'rey_prospeccion',
    label: 'Rey de la prospección',
    icon: '📞',
    description: 'Más llamadas de prospección del periodo.',
  },
  maestro_entrevistas: {
    id: 'maestro_entrevistas',
    label: 'Maestro de entrevistas',
    icon: '🎯',
    description: 'Más entrevistas (M1-M3) del periodo.',
  },
  creador_eventos: {
    id: 'creador_eventos',
    label: 'Creador de eventos',
    icon: '🎪',
    description: 'Ha organizado un evento este periodo.',
  },
  constancia: {
    id: 'constancia',
    label: 'Constancia',
    icon: '🔥',
    description: '4+ acciones aprobadas en el periodo.',
  },
  embajador_historico: {
    id: 'embajador_historico',
    label: 'Embajador',
    icon: '🏆',
    description: 'Líder histórico de la agencia.',
  },
}
