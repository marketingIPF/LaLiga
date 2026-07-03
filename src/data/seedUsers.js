// Plantilla de usuarios iniciales de RK Palanca Fontestad.
// Codirectores = Administradores. Resto = Agentes Comerciales.
// Los equipos los crean los administradores desde la app.

export const SEED_USERS = [
  { id: 'admin-rober', name: 'Roberto Arroyo', role: 'Codirector', league: 'staff', email: 'marketing@inmobiliariapalanca.com', phone: 'CambiarPassword2026' },
  { id: 'admin-almudena', name: 'Almudena Gálvez', role: 'Codirector', league: 'staff', email: 'agalvez@inmobiliariapalanca.com', phone: 'CambiarPassword2026' },
  { id: '686387378', name: 'Jose Miguel Palanca', role: 'Codirector', email: 'jose@inmobiliariapalanca.com', phone: '696460043' },
  { id: '686536261', name: 'Javier Palanca', role: 'Codirector', email: 'javi@inmobiliariapalanca.com', phone: '649258584' },
  { id: '689033887', name: 'Alejandro Garcia', role: 'Agente Comercial', league: 'agentes', email: 'agarcia@inmobiliariapalanca.com', phone: '674054152' },
  { id: '686536270', name: 'Amparo Orts Soriano', role: 'Agente Comercial', league: 'agentes', email: 'aorts@inmobiliariapalanca.com', phone: '663323259' },
  { id: '686536262', name: 'Asunción Marco Aparisi', role: 'Agente Comercial', league: 'agentes', email: 'asun@inmobiliariapalanca.com', phone: '618644856' },
  { id: '686536303', name: 'Clara Ordoñez Rubiols', role: 'Agente Comercial', league: 'agentes', email: 'clara@inmobiliariapalanca.com', phone: '697633537' },
  { id: '689563574', name: 'Claudia Stelling', role: 'Agente Comercial', league: 'agentes', email: 'claudia@inmobiliariapalanca.com', phone: '677909467' },
  { id: '687574956', name: 'Desiree López Martinez', role: 'Agente Comercial', league: 'agentes', email: 'desiree@inmobiliariapalanca.com', phone: '611575351' },
  { id: '688849218', name: 'Eva Vallés', role: 'Agente Comercial', league: 'agentes', email: 'eva@inmobiliariapalanca.com', phone: '637568603' },
  { id: '686536265', name: 'Fede Carbonell', role: 'Agente Comercial', league: 'agentes', email: 'fede@inmobiliariapalanca.com', phone: '655299844' },
  { id: '689593800', name: 'Fran Estelles', role: 'Agente Comercial', league: 'agentes', email: 'fran@inmobiliariapalanca.com', phone: '670996263' },
  { id: '687702039', name: 'Jose Gimenez', role: 'Agente Comercial', league: 'agentes', email: 'josegimenez@inmobiliariapalanca.com', phone: '663716921' },
  { id: '689181578', name: 'Lorena Lull', role: 'Agente Comercial', league: 'agentes', email: 'lorena@inmobiliariapalanca.com', phone: '644505020' },
  { id: '686536266', name: 'Mª Luisa Bellver', role: 'Agente Comercial', league: 'agentes', email: 'mluisa@inmobiliariapalanca.com', phone: '607067815' },
  { id: '691027263', name: 'Maria Jose Ordoñez', role: 'Agente Comercial', league: 'agentes', email: 'mariajose@inmobiliariapalanca.com', phone: '653840768' },
  { id: '692352245', name: 'Mariano Del Prado', role: 'Agente Comercial', league: 'agentes', email: 'mariano@inmobiliariapalanca.com', phone: '675992234' },
  { id: '686536275', name: 'Mavi Castillo Esteban', role: 'Agente Comercial', league: 'agentes', email: 'mavi@inmobiliariapalanca.com', phone: '622780656' },
  { id: '690617934', name: 'Natalia Sanfelix', role: 'Agente Comercial', league: 'agentes', email: 'natalia@inmobiliariapalanca.com', phone: '673647013' },
  { id: '692352252', name: 'Nuria Nuñez', role: 'Agente Comercial', league: 'agentes', email: 'nuria@inmobiliariapalanca.com', phone: '675992224' },
  { id: '686536274', name: 'Rosa Domenech', role: 'Agente Comercial', league: 'agentes', email: 'rdomenech@inmobiliariapalanca.com', phone: '621206772' },
  { id: '686756864', name: 'Sefa Gallent Bestuer', role: 'Agente Comercial', league: 'agentes', email: 'sefa@inmobiliariapalanca.com', phone: '697188343' },
  { id: '686536268', name: 'Virginia Corral', role: 'Agente Comercial', league: 'agentes', email: 'vcorral@inmobiliariapalanca.com', phone: '675984757' },
  { id: '692352236', name: 'Yvonne Vidal', role: 'Agente Comercial', league: 'agentes', email: 'yvidal@inmobiliariapalanca.com', phone: '675992778' },
]


// Staff + Obra Nueva — compiten en la liga 'staff'.
// Contraseña inicial = teléfono (forzado cambio en primer login).
export const SEED_STAFF = [
  { id: '687795185', name: 'Mar Moscardó', role: 'Staff', league: 'staff', email: 'mar@inmobiliariapalanca.com', phone: '687795185' },
  { id: '620873587', name: 'Julia Ordóñez', role: 'Staff', league: 'staff', email: 'julia@inmobiliariapalanca.com', phone: '620873587' },
  { id: '662658360', name: 'Mireia Sáez', role: 'Staff', league: 'staff', email: 'msaez@inmobiliariapalanca.com', phone: '662658360' },
  { id: '620873588', name: 'Verónica Fortea', role: 'Staff', league: 'staff', email: 'vfortea@inmobiliariapalanca.com', phone: '620873588' },
  { id: '662658311', name: 'Marivi Gil', role: 'Staff', league: 'staff', email: 'postventa@inmobiliariapalanca.com', phone: '662658311' },
  { id: '661654156', name: 'Ros Aguilar', role: 'Obra Nueva', league: 'staff', email: 'obranueva@inmobiliariapalanca.com', phone: '661654156' },
  { id: '644717355', name: 'Inma Frasquet', role: 'Obra Nueva', league: 'staff', email: 'inma@inmobiliariapalanca.com', phone: '644717355' },
  { id: '656615987', name: 'Carles Navarro', role: 'Obra Nueva', league: 'staff', email: 'carles@inmobiliariapalanca.com', phone: '656615987' },
  { id: '687426435', name: 'Alicia Barberá', role: 'Obra Nueva', league: 'staff', email: 'abarbera@inmobiliariapalanca.com', phone: '687426435' },
  { id: '613842777', name: 'Jose Manuel Lafuente', role: 'Obra Nueva', league: 'staff', email: 'jmlafuente@inmobiliariapalanca.com', phone: '613842777' },
  { id: '685977889', name: 'Jose González', role: 'Obra Nueva', league: 'staff', email: 'gonzalez@inmobiliariapalanca.com', phone: '685977889' },
]

/**
 * Paleta de colores disponible para los equipos creados desde la app.
 */
export const GROUP_COLOR_PALETTE = [
  '#cf731b', // RK orange
  '#3b82f6', // blue
  '#10b981', // green
  '#a855f7', // purple
  '#ef4444', // red
  '#f59e0b', // amber
  '#14b8a6', // teal
  '#ec4899', // pink
]

/**
 * Detecta si un usuario es administrador.
 */
export function isAdminRole(role) {
  return role === 'Codirector'
}

/**
 * Liga de un usuario. Los agentes antiguos sin campo league se
 * consideran 'agentes'. Los admins sin liga no compiten (null).
 */
export function getUserLeague(user) {
  if (!user) return null
  if (user.league) return user.league
  if (user.role === 'Agente Comercial') return 'agentes'
  if (user.role === 'Staff' || user.role === 'Obra Nueva') return 'staff'
  return null
}

/**
 * Usuarios que compiten en alguna liga (asignables a equipos, rankings).
 */
export function isCompetitor(user) {
  return getUserLeague(user) !== null
}
