// ====================================================================
// La Liga · Premios de la temporada
// --------------------------------------------------------------------
// Fuente: presentación de premios de gerencia. Si cambian los premios o
// sus requisitos, se edita solo este archivo.
// ====================================================================

// Cuántos puestos reparten premio en cada liga
export const PRIZE_SPOTS = {
  agentes: 5,
  obranueva: 2,
  staff: 3,
  equipos: 2,
}

const REQ_AGENTES = 'Mínimo 5 captaciones (sin contar Gerencia ni Oficina)'
const REQ_UNA = 'Mínimo 1 captación'

export const PREMIOS = {
  agentes: [
    { pos: 1, nombre: 'Noche de hotel de lujo', requisito: REQ_AGENTES },
    { pos: 2, nombre: 'Concierto en el Roig Arena', detalle: 'Asientos Johnnie Walker', requisito: REQ_AGENTES },
    { pos: 3, nombre: 'Cena de lujo para 2' },
    { pos: 4, nombre: 'Partido de basket · Roig Arena', detalle: 'Asientos Johnnie Walker' },
    { pos: 5, nombre: 'Gafas Rayban o similar' },
  ],
  obranueva: [
    { pos: 1, nombre: 'Concierto en el Roig Arena', detalle: 'Asientos Johnnie Walker', requisito: REQ_UNA },
    { pos: 2, nombre: 'Partido de Euroliga en el Roig Arena', detalle: 'Asientos Johnnie Walker', requisito: REQ_UNA },
  ],
  staff: [
    { pos: 1, nombre: 'Concierto en el Roig Arena', detalle: 'Asientos Johnnie Walker', requisito: REQ_UNA },
    { pos: 2, nombre: 'Partido de Euroliga en el Roig Arena', detalle: 'Asientos Johnnie Walker', requisito: REQ_UNA },
    { pos: 3, nombre: 'Gafas o Cena para 2', requisito: REQ_UNA },
  ],
  equipos: [
    { pos: 1, nombre: 'Comida un viernes + tarde libre' },
    { pos: 2, nombre: 'Comida en restaurante local' },
  ],
}

/**
 * Premio que corresponde a una posición concreta de una liga.
 * Devuelve null si esa posición no está premiada.
 */
export function premioDe(league, position) {
  const lista = PREMIOS[league]
  if (!lista || !position) return null
  return lista.find((p) => p.pos === position) ?? null
}
