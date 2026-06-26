// Plantilla de usuarios iniciales de RK Palanca Fontestad.
// Codirectores = Administradores. Resto = Agentes Comerciales.

export const SEED_USERS = [
  { id: 'admin-rober', name: 'Rober', role: 'Codirector', email: 'marketing@inmobiliariapalanca.com', phone: 'CambiarPassword2026' },
  { id: 'admin-almudena', name: 'Almudena Gálvez', role: 'Codirector', email: 'agalvez@inmobiliariapalanca.com', phone: 'CambiarPassword2026' },
  { id: '686387378', name: 'Jose Miguel Palanca', role: 'Codirector', email: 'jose@inmobiliariapalanca.com', phone: '696460043' },
  { id: '686536261', name: 'Javier Palanca', role: 'Codirector', email: 'javi@inmobiliariapalanca.com', phone: '649258584' },
  { id: '689033887', name: 'Alejandro Garcia', role: 'Agente Comercial', email: 'agarcia@inmobiliariapalanca.com', phone: '674054152' },
  { id: '686536270', name: 'Amparo Orts Soriano', role: 'Agente Comercial', email: 'aorts@inmobiliariapalanca.com', phone: '663323259' },
  { id: '686536262', name: 'Asunción Marco Aparisi', role: 'Agente Comercial', email: 'asun@inmobiliariapalanca.com', phone: '618644856' },
  { id: '686536303', name: 'Clara Ordoñez Rubiols', role: 'Agente Comercial', email: 'clara@inmobiliariapalanca.com', phone: '697633537' },
  { id: '689563574', name: 'Claudia Stelling', role: 'Agente Comercial', email: 'claudia@inmobiliariapalanca.com', phone: '677909467' },
  { id: '687574956', name: 'Desiree López Martinez', role: 'Agente Comercial', email: 'desiree@inmobiliariapalanca.com', phone: '611575351' },
  { id: '688849218', name: 'Eva Vallés', role: 'Agente Comercial', email: 'eva@inmobiliariapalanca.com', phone: '637568603' },
  { id: '686536265', name: 'Fede Carbonell', role: 'Agente Comercial', email: 'fede@inmobiliariapalanca.com', phone: '655299844' },
  { id: '689593800', name: 'Fran Estelles', role: 'Agente Comercial', email: 'fran@inmobiliariapalanca.com', phone: '670996263' },
  { id: '687702039', name: 'Jose Gimenez', role: 'Agente Comercial', email: 'josegimenez@inmobiliariapalanca.com', phone: '663716921' },
  { id: '689181578', name: 'Lorena Lull', role: 'Agente Comercial', email: 'lorena@inmobiliariapalanca.com', phone: '644505020' },
  { id: '686536266', name: 'Mª Luisa Bellver', role: 'Agente Comercial', email: 'mluisa@inmobiliariapalanca.com', phone: '607067815' },
  { id: '691027263', name: 'Maria Jose Ordoñez', role: 'Agente Comercial', email: 'mariajose@inmobiliariapalanca.com', phone: '653840768' },
  { id: '692352245', name: 'Mariano Del Prado', role: 'Agente Comercial', email: 'mariano@inmobiliariapalanca.com', phone: '675992234' },
  { id: '686536275', name: 'Mavi Castillo Esteban', role: 'Agente Comercial', email: 'mavi@inmobiliariapalanca.com', phone: '622780656' },
  { id: '690617934', name: 'Natalia Sanfelix', role: 'Agente Comercial', email: 'natalia@inmobiliariapalanca.com', phone: '673647013' },
  { id: '692352252', name: 'Nuria Nuñez', role: 'Agente Comercial', email: 'nuria@inmobiliariapalanca.com', phone: '675992224' },
  { id: '686536274', name: 'Rosa Domenech', role: 'Agente Comercial', email: 'rdomenech@inmobiliariapalanca.com', phone: '621206772' },
  { id: '686756864', name: 'Sefa Gallent Bestuer', role: 'Agente Comercial', email: 'sefa@inmobiliariapalanca.com', phone: '697188343' },
  { id: '686536268', name: 'Virginia Corral', role: 'Agente Comercial', email: 'vcorral@inmobiliariapalanca.com', phone: '675984757' },
  { id: '692352236', name: 'Yvonne Vidal', role: 'Agente Comercial', email: 'yvidal@inmobiliariapalanca.com', phone: '675992778' },
]

// Asignación inicial de grupos (4 equipos de captación)
export const SEED_GROUPS = [
  { id: 'team-norte', name: 'Equipo Norte', color: '#cf731b' },
  { id: 'team-sur', name: 'Equipo Sur', color: '#3b82f6' },
  { id: 'team-centro', name: 'Equipo Centro', color: '#10b981' },
  { id: 'team-metro', name: 'Equipo Metropolitano', color: '#a855f7' },
]

/**
 * Reparte agentes en grupos de forma equilibrada (round-robin) para el seed.
 */
export function assignGroup(userIndex) {
  return SEED_GROUPS[userIndex % SEED_GROUPS.length].id
}

/**
 * Detecta si un usuario es administrador.
 */
export function isAdminRole(role) {
  return role === 'Codirector'
}
